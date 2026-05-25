<script setup lang="ts">
// `minimark` ships with @nuxt/content as a transitive dep — its body field is
// minimark AST. `stringify` converts that AST back to markdown faithfully, so we
// can produce a copy-friendly markdown blob without forcing consumers to enable
// `rawbody` in their collection schema. See https://content.nuxt.com/docs/integrations/llms.
import { stringify as stringifyMinimark } from 'minimark/stringify'
import { toast } from 'vue-sonner'
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue'

interface ContentNode {
  path: string
  title?: string
  description?: string
  document_type?: string
  [key: string]: any
}

interface SectionGroup {
  key: string
  path: string
  title: string
  description?: string
  count: number
  documentType?: string
}

const props = defineProps<{
  path: string
  noThrow?: boolean
}>()

const path = computed(() => props.path)

// Stacked-column "trail" highlight: a list item is considered "drilled" when
// its path appears in the full column stack (i.e. it has been clicked open as
// a deeper column). The current column's own path is excluded so a section
// listing doesn't highlight itself. On mobile / standalone render `fullStack`
// only contains the current path, so nothing highlights — correct.
const { fullStack } = useStack()
function isDrilled(itemPath: string): boolean {
  return itemPath !== path.value && fullStack.value.includes(itemPath)
}

function normalizePath(rawPath: string) {
  const normalized = rawPath
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
  return normalized || '/'
}

function slugToTitle(slug: string) {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

// Normalize a frontmatter scalar (game / league / patch) for badge display.
// Frontmatter values come in mixed forms — quoted/unquoted, lower/upper case
// (`"poe1"` vs `poe1`, `mirage` vs `Mirage`). Strip wrapping quotes/whitespace
// and uppercase so the rendered badge is consistent regardless of authoring style.
function normalizeBadge(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/^["']|["']$/g, '').toUpperCase()
}

// Build the compact `GAME · VERSION` line shown next to titles. `patch` (e.g.
// `3.28.0`) strictly contains `league` (`3.28`) as a prefix, so showing both
// is redundant — prefer `patch` when it extends league, falling back to
// whichever is set. Both missing means we just render `GAME`.
function metaSegments(node: Record<string, any> | null | undefined): string[] {
  if (!node) return []
  const game = normalizeBadge(node.game)
  const league = normalizeBadge(node.league)
  const patch = normalizeBadge(node.patch)
  // Patch supersedes league when patch starts with `<league>.` (e.g. `3.28.0` covers `3.28`).
  // Otherwise show whichever single value is present; if they diverge keep both for visibility.
  const leagueCoveredByPatch = !!patch && !!league && (patch === league || patch.startsWith(`${league}.`))
  const segments = [game]
  if (leagueCoveredByPatch) segments.push(patch)
  else if (patch && league) segments.push(league, patch)
  else segments.push(patch || league)
  return segments.filter(Boolean)
}

// POE1 vs POE2 looked identical when rendered as plain bracketed text — same
// color, same font, only one character apart. Pick a chip variant per game so
// the differentiation rides on fill weight (filled vs outlined), not just hue.
// That stays scannable for color-vision-deficient readers and at small sizes.
function gameChipVariant(node: Record<string, any> | null | undefined): string {
  const g = normalizeBadge(node?.game)
  if (g === 'POE1') return 'game-chip--poe1'
  if (g === 'POE2') return 'game-chip--poe2'
  return 'game-chip--unknown'
}

// Nuxt Content v3 rejects queries containing `--` as SQL comments (`assertSafeQuery`).
// Some wiki content has malformed empty links pointing to encoded frontmatter strings,
// which produce route paths containing `---`. Reject those early as 404 instead of
// letting them blow up the prerender with an unhandled 500.
const malformedPath = computed(() => /--|\s/.test(path.value))

if (malformedPath.value && !props.noThrow) {
  throw createError({ statusCode: 404, message: 'Page not found' })
}

// Guard all queries: when path is malformed, skip them entirely (queryCollection
// would crash with assertSafeQuery before we could handle the error).
const { data: page } = await useAsyncData(`content-${path.value}`, () => {
  if (malformedPath.value) return Promise.resolve(null)
  return queryCollection('content')
    .where('path', '=', path.value)
    .first()
})

// Query descendants regardless of whether `_index.md` exists for the path — that lets
// section roots like `/builds`, `/`, `/wiki` render a listing of their children even
// without an explicit index file. Path = '/' must use prefix '/' (not '//') to match all.
const childrenPrefix = path.value === '/' ? '/' : `${path.value}/`
const { data: allChildren } = await useAsyncData(`children-${path.value}`, () => {
  if (malformedPath.value) return Promise.resolve([])
  return queryCollection('content')
    .where('path', 'LIKE', `${childrenPrefix}%`)
    .where('path', '<>', path.value)
    .where('path', 'NOT LIKE', '%/_index')
    // The convention filter used to live here as a SQL `where`, but SQL's
    // three-valued logic treats `NULL <> 'convention'` as NULL (not true),
    // so any row whose schema doesn't set document_type — i.e. most rows —
    // got silently filtered out and listings rendered as empty article
    // views. The client-side hierarchy filter (`!== 'convention'`) handles
    // this correctly in JS where `undefined !== 'convention'` is true.
    .select('path', 'title', 'description', 'document_type', 'status', 'budget_tier', 'game', 'league', 'patch', 'build_tags', 'ratings', 'strategy_tier', 'profit_per_hour', 'investment_tier', 'updated', 'created')
    .all()
})

// "Not found" only when path is malformed OR there's no page AND no children to list.
// Pure section paths (`/builds`, `/`) are valid even without `_index.md` if children exist.
const notFound = computed(() => {
  if (malformedPath.value) return true
  if (page.value) return false
  return (allChildren.value?.length ?? 0) === 0
})

if (notFound.value && !props.noThrow) {
  throw createError({ statusCode: 404, message: 'Page not found' })
}

// Recency timestamp for sort: prefer `updated`, fallback `created`, fallback 0 (oldest).
// Returns ms since epoch so a single numeric compare works for desc sort.
function nodeRecency(node: ContentNode | undefined): number {
  if (!node) return 0
  const updated = node.updated as string | undefined
  const created = node.created as string | undefined
  const raw = updated || created
  if (!raw) return 0
  const ts = Date.parse(raw)
  return Number.isFinite(ts) ? ts : 0
}

// Creation timestamp only — distinct from `nodeRecency` which folds in `updated`.
// The LATEST list ranks strictly by `created` (a recently *edited* old note is not
// "new"). Returns 0 when `created` is missing/unparseable so those nodes can be
// dropped — a node with no creation date has no claim to being among the newest.
function createdTime(node: ContentNode | undefined): number {
  const created = node?.created as string | undefined
  if (!created) return 0
  const ts = Date.parse(created)
  return Number.isFinite(ts) ? ts : 0
}

const hierarchy = computed(() => {
  const nodes = (allChildren.value ?? []) as ContentNode[]
  const prefix = path.value === '/' ? '/' : `${path.value}/`

  const descendants = nodes
    .filter(node => node.document_type !== 'convention' && node.path.startsWith(prefix))
    .map((node) => {
      const relative = node.path.slice(prefix.length)
      const segments = relative.split('/').filter(Boolean)
      return { node, relative, segments }
    })
    .filter(entry => entry.segments.length > 0)

  const direct = descendants.filter(entry => entry.segments.length === 1)
  const directByPath = new Map(direct.map(entry => [entry.node.path, entry.node]))

  const nestedCountsBySection = new Map<string, number>()
  // Track max recency per section (across the section's index page + all nested descendants)
  // so sections with the most recently updated content surface to the top.
  const sectionRecency = new Map<string, number>()
  const recordSectionRecency = (key: string, ts: number) => {
    const prev = sectionRecency.get(key) ?? 0
    if (ts > prev) sectionRecency.set(key, ts)
  }

  for (const entry of descendants) {
    const key = entry.segments[0]!
    const ts = nodeRecency(entry.node)
    if (entry.segments.length >= 2) {
      nestedCountsBySection.set(key, (nestedCountsBySection.get(key) || 0) + 1)
      recordSectionRecency(key, ts)
    }
    else if (nestedCountsBySection.has(key) || ts > 0) {
      // Direct index page of a section also contributes its own recency.
      recordSectionRecency(key, ts)
    }
  }

  const sectionKeys = Array.from(nestedCountsBySection.keys()).sort((a, b) => {
    const diff = (sectionRecency.get(b) ?? 0) - (sectionRecency.get(a) ?? 0)
    if (diff !== 0) return diff
    return a.localeCompare(b)
  })
  const sections: SectionGroup[] = sectionKeys.map((key) => {
    const sectionPath = normalizePath(`${path.value}/${key}`)
    const indexPage = directByPath.get(sectionPath)
    const nestedCount = nestedCountsBySection.get(key) || 0

    return {
      key,
      path: sectionPath,
      title: indexPage?.title || slugToTitle(key),
      description: indexPage?.description,
      count: nestedCount,
      documentType: indexPage?.document_type,
    }
  })

  const rootFiles = direct
    .filter(entry => !nestedCountsBySection.has(entry.segments[0]!))
    .map(entry => entry.node)
    .sort((a, b) => {
      const diff = nodeRecency(b) - nodeRecency(a)
      if (diff !== 0) return diff
      return (a.title || '').localeCompare(b.title || '')
    })

  return {
    sections,
    rootFiles,
    immediateCount: sections.length + rootFiles.length,
  }
})

// LATEST: the 5 most recently *created* leaf articles anywhere in the current
// column's subtree (including nested sub-folders), newest first. Excludes:
//  - folder/section index pages (only actual articles are "new content")
//  - articles already listed in this column's ARTICLES section (dedup — the
//    direct rootFiles are visible right below, so re-listing them adds noise;
//    this makes LATEST surface the newest *nested* articles instead)
//  - nodes with no parseable `created` (can't rank them by recency)
// Result: at a flat leaf folder every article is a rootFile → all deduped → list
// empty → section auto-hides. At /mechanics or / it surfaces what's new deep in
// the tree without the reader having to drill each sub-folder.
const latest = computed<ContentNode[]>(() => {
  const nodes = (allChildren.value ?? []) as ContentNode[]
  const prefix = path.value === '/' ? '/' : `${path.value}/`
  const inSubtree = nodes.filter(node => node.path.startsWith(prefix))

  // A path is a folder iff some descendant lives under it. Collect every
  // ancestor prefix within the subtree into a set; anything in that set is a
  // folder index, not a leaf article.
  const folderPaths = new Set<string>()
  for (const node of inSubtree) {
    const segments = node.path.slice(prefix.length).split('/').filter(Boolean)
    let acc = prefix.replace(/\/$/, '')
    for (let i = 0; i < segments.length - 1; i++) {
      acc = normalizePath(`${acc}/${segments[i]}`)
      folderPaths.add(acc)
    }
  }

  const rootFilePaths = new Set(hierarchy.value.rootFiles.map(file => file.path))

  return inSubtree
    .filter(node => !folderPaths.has(node.path))
    .filter(node => !rootFilePaths.has(node.path))
    .filter(node => createdTime(node) > 0)
    .sort((a, b) => createdTime(b) - createdTime(a))
    .slice(0, 5)
})

const isList = computed(() => {
  return hierarchy.value.sections.length > 0 || hierarchy.value.rootFiles.length > 0
})

// Article-listing meta dedup: when EVERY rootFile carries the same `game · league · patch`
// triple, render a single badge in the section heading instead of repeating it on every
// row. Returns null when the listing is mixed (different leagues / patches / games) or
// when at least one file is missing a meta value — those cases need per-row badges to
// distinguish files. Strict uniformity is correct here: if even one row differs, hiding
// the others would mask real distinctions.
const articlesUniformMeta = computed<string | null>(() => {
  const files = hierarchy.value.rootFiles
  if (files.length < 2) return null
  const keys = new Set<string>()
  for (const f of files) {
    const k = metaSegments(f).join(' · ')
    if (!k) return null
    keys.add(k)
    if (keys.size > 1) return null
  }
  return Array.from(keys)[0] ?? null
})

// Chip variant for the uniform-meta header — uniformly all rows share the same
// game, so reading the first file is sufficient.
const articlesUniformGameVariant = computed<string>(() => {
  if (!articlesUniformMeta.value) return 'game-chip--unknown'
  const first = hierarchy.value.rootFiles[0]
  return first ? gameChipVariant(first) : 'game-chip--unknown'
})

useHead({
  title: page.value?.title,
  meta: [
    { name: 'description', content: (page.value as any)?.description || '' },
    { property: 'og:title', content: page.value?.title || '' },
  ],
})

function toKebab(str: string) {
  return str.trim().toLowerCase().replace(/\s+/g, '-')
}

function toTitleCase(str: string) {
  return str.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Unified tag list. Game / league / patch were previously rendered as a separate
// badge row above the title; we now fold them into this list and mark them
// `important` so the template can highlight them in place. One row, one source of
// truth — clearer for readers and avoids duplicating the same context twice.
const allTags = computed(() => {
  const p = page.value as any
  const seen = new Set<string>()
  const result: Array<{ value: string; important: boolean }> = []

  const add = (val: string | undefined | null, important = false) => {
    if (!val) return
    const k = toKebab(val)
    if (k && !seen.has(k)) { seen.add(k); result.push({ value: k, important }) }
  }

  // Important meta first — these are the highest-context tags (game version,
  // league, patch). Highlighted to stand out among the long tail.
  add(p?.game, true)
  add(p?.league, true)
  add(p?.patch, true)

  for (const tag of (p?.tags || [])) add(tag)

  const bt = p?.build_tags
  if (bt) {
    add(bt.primary_skill)
    add(bt.damage_type)
    add(bt.playstyle)
    add(bt.content_focus)
  }

  add(p?.budget_tier)
  add(p?.ascendancy)

  return result
})

// Smart H1 dedup: Nuxt Content v3 stores body in minimark format (`[tag, props, ...children]`
// tuples in `body.value`). When authors write a leading `# Heading` AND set a frontmatter
// `title`, both render as H1 → duplicate. We detect the body's leading H1, prefer its text
// for the visible heading, and strip it from the body before passing to ContentRenderer.
// Frontmatter `title` still drives `<title>` / `og:title` for SEO consistency.
type MinimarkNode = string | [string, Record<string, any>, ...any[]]

function flattenMinimarkText(node: any): string {
  if (typeof node === 'string') return node
  if (!Array.isArray(node)) return ''
  // Tuple shape: [tag, props, ...children] — text starts at index 2.
  return node.slice(2).map(flattenMinimarkText).join('')
}

function isMinimarkBody(body: any): boolean {
  // Cover both legacy 'minimal' and current 'minimark' formats; both expose `body.value` array.
  return !!body && (body.type === 'minimark' || body.type === 'minimal') && Array.isArray(body.value)
}

const bodyLeadingH1 = computed<string | null>(() => {
  const body = (page.value as any)?.body
  if (!isMinimarkBody(body)) return null
  const first = body.value[0] as MinimarkNode | undefined
  if (!Array.isArray(first) || first[0] !== 'h1') return null
  const text = flattenMinimarkText(first).trim()
  return text || null
})

// Cloned page with leading H1 removed when present — passed to ContentRenderer to avoid
// rendering the same heading twice (once as our `<h1>`, once from the body).
const renderedPage = computed(() => {
  if (!page.value) return null
  if (!bodyLeadingH1.value) return page.value
  const body = (page.value as any).body
  return {
    ...(page.value as any),
    body: {
      ...body,
      value: body.value.slice(1),
    },
  }
})

// Truthy `page.body` is not enough — Nuxt Content v3 always emits a body object
// (`{ type: 'minimark', value: [] }`) even for frontmatter-only pages, and
// `renderedPage` may further strip the leading H1, leaving an empty value array.
// We must check the post-strip array length to decide whether to render the wrapper.
const hasRenderedBody = computed(() => {
  const body = (renderedPage.value as any)?.body
  if (!isMinimarkBody(body)) return false
  return body.value.length > 0
})

// Title priority: body H1 (closest to author intent in markdown) → frontmatter title (template
// metadata) → derived from path slug (for index-less section roots).
const displayTitle = computed(() => {
  if (bodyLeadingH1.value) return bodyLeadingH1.value
  if (page.value?.title) return page.value.title
  const last = path.value.split('/').filter(Boolean).pop()
  return last ? slugToTitle(last) : 'Home'
})

const sectionIndex = computed(() => {
  const segments = path.value.split('/').filter(Boolean)
  return segments.length === 0 ? 0 : segments.length
})

// Copy-as-markdown for the column's content.
//
// Strategy: produce the *fullest* markdown the column has access to.
//
//   1. If `page.rawbody` is present (consumer opted into it via collection
//      schema — see https://content.nuxt.com/docs/integrations/llms), prefer
//      it: it's a byte-faithful copy of the original `.md` source.
//   2. Otherwise compose: `# Title` + description + stringified body
//      (minimark AST → markdown) + listing blocks (Latest / Folders / Articles).
//      Stringify is lossy at the edges (custom MDC components may not round-trip
//      perfectly), but matches the rendered content closely enough for LLM
//      ingestion and clipboard sharing.

type CopyState = 'idle' | 'copied' | 'error'
const copyState = ref<CopyState>('idle')
let copyResetTimer: ReturnType<typeof setTimeout> | null = null

function buildMarkdown(): string {
  const raw = (page.value as any)?.rawbody as string | undefined
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const trimmed = raw.trimStart()
    // Author already wrote a leading `# Heading` → trust it. Otherwise prepend
    // displayTitle so the copy never lands on the clipboard headless.
    return trimmed.startsWith('# ') ? raw : `# ${displayTitle.value}\n\n${raw}`
  }

  const lines: string[] = [`# ${displayTitle.value}`, '']

  const desc = (page.value as any)?.description
  if (desc) {
    lines.push(String(desc).trim(), '')
  }

  const body = (page.value as any)?.body
  if (isMinimarkBody(body) && body.value.length > 0) {
    // If the body opens with the same H1 as displayTitle, drop it — we already
    // emitted one above; otherwise leading H2/etc. should be preserved.
    const skipFirst = !!bodyLeadingH1.value && bodyLeadingH1.value === displayTitle.value
    const value = skipFirst ? body.value.slice(1) : body.value
    if (value.length > 0) {
      try {
        const md = stringifyMinimark({ type: 'minimark', value }).trim()
        if (md) lines.push(md, '')
      }
      catch {
        // Stringify can throw on malformed minimark — degrade gracefully and
        // skip the body rather than poisoning the entire copy.
      }
    }
  }

  if (latest.value.length) {
    lines.push('## Latest', '')
    for (const file of latest.value) {
      const title = file.title || slugToTitle(file.path.split('/').pop() || '')
      lines.push(`- [${title}](${file.path})`)
    }
    lines.push('')
  }
  if (hierarchy.value.sections.length) {
    lines.push('## Folders', '')
    for (const section of hierarchy.value.sections) {
      lines.push(`- [${section.title}](${section.path}) — ${section.count}`)
    }
    lines.push('')
  }
  if (hierarchy.value.rootFiles.length) {
    lines.push('## Articles', '')
    for (const file of hierarchy.value.rootFiles) {
      const title = file.title || slugToTitle(file.path.split('/').pop() || '')
      lines.push(`- [${title}](${file.path})`)
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd() + '\n'
}

async function copyMarkdown() {
  if (!import.meta.client) return
  const markdown = buildMarkdown()

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(markdown)
    }
    else {
      // Legacy fallback for non-secure contexts (e.g. plain-http preview).
      const ta = document.createElement('textarea')
      ta.value = markdown
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copyState.value = 'copied'
    // Byte count makes the toast useful at a glance — confirms the copy isn't
    // empty (e.g. on a stub section) and gives the user a quick sanity-check.
    const bytes = new Blob([markdown]).size
    toast.success('Copied as Markdown', {
      description: `${displayTitle.value} · ${formatBytes(bytes)}`,
    })
  }
  catch (err) {
    copyState.value = 'error'
    toast.error('Copy failed', {
      description: err instanceof Error ? err.message : 'Clipboard unavailable',
    })
  }

  if (copyResetTimer) clearTimeout(copyResetTimer)
  copyResetTimer = setTimeout(() => {
    copyState.value = 'idle'
    copyResetTimer = null
  }, 1500)
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

const copyTitle = computed(() => {
  if (copyState.value === 'copied') return 'Copied to clipboard'
  if (copyState.value === 'error') return 'Copy failed'
  return 'Copy as Markdown'
})

// Visible button label. Plain text beat the icon iterations (sparkle was
// too abstract; clipboard+MD wordmark was illegible at the available
// pixel budget). Three short states — same character class so the row
// width stays stable across transitions when paired with a min-width on
// the button.
const copyLabel = computed(() => {
  if (copyState.value === 'copied') return 'Copied'
  if (copyState.value === 'error') return 'Failed'
  return 'Copy'
})

// "Open in AI" dropdown — deep-links the *page URL* (not the markdown
// body) into AI chat hosts via their `?q=` parameter. The hosts then
// fetch and reason about the page themselves, which sidesteps the URL-
// length cap that would truncate a markdown payload and keeps the AI's
// view authoritative (it sees the live page, not a frozen snapshot).
//
// `useRequestURL()` is SSR-safe and resolves to the canonical absolute
// URL on both server and client.
const menuOpen = ref(false)
const triggerEl = useTemplateRef<HTMLElement>('triggerEl')
const menuEl = useTemplateRef<HTMLElement>('menuEl')

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
function closeMenu() {
  menuOpen.value = false
}

const requestURL = useRequestURL()
const pageURL = computed(() => {
  const u = new URL(path.value, requestURL.origin)
  return u.toString()
})
const claudeUrl = computed(() =>
  `https://claude.ai/new?q=${encodeURIComponent(pageURL.value)}`,
)
const chatgptUrl = computed(() =>
  `https://chatgpt.com/?q=${encodeURIComponent(pageURL.value)}`,
)

// Floating-UI positioning. `bottom-end` anchors the menu to the right
// edge of the caret button; `flip` mirrors to `top-end` when the column
// has no room below; `shift` keeps the menu inside the viewport.
// `autoUpdate` re-runs on scroll/resize/layout changes — important
// because stacked columns scroll horizontally and the trigger can
// reposition mid-scroll.
const { floatingStyles } = useFloating(triggerEl, menuEl, {
  placement: 'bottom-end',
  middleware: [offset(6), flip(), shift({ padding: 8 })],
  whileElementsMounted: autoUpdate,
})

// Click-outside / Esc dismissal. Floating-UI/vue ships positioning only,
// so dismissal is hand-rolled. Cheap: handler bails immediately when the
// menu is closed.
function handleClickOutside(event: MouseEvent) {
  if (!menuOpen.value) return
  const target = event.target as Node
  if (triggerEl.value?.contains(target)) return
  if (menuEl.value?.contains(target)) return
  closeMenu()
}
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && menuOpen.value) closeMenu()
}

onMounted(() => {
  if (!import.meta.client) return
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  if (copyResetTimer) clearTimeout(copyResetTimer)
  if (import.meta.client) {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<template>
  <div v-if="notFound" class="p-12 text-center text-terminal-text-muted">
    <p class="font-display font-bold uppercase tracking-tight text-lg text-terminal-text mb-2">
      Not Found
    </p>
    <p class="text-sm font-mono">
      <code class="bg-terminal-surface-0 border border-terminal-border px-2 py-0.5">{{ path }}</code>
    </p>
    <p class="text-sm mt-2">This page doesn't exist or has been moved.</p>
  </div>

  <div v-else class="flex flex-col h-full">
    <!-- Column header — sits outside the scroll container so the scrollbar
         never overlaps it. flex-none keeps it at fixed height. -->
    <div class="section-card-header flex-none">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-bold uppercase tracking-tight flex items-center gap-2 truncate">
          <span class="text-primary">/</span>
          <span class="font-mono text-terminal-text-muted text-xs shrink-0">
            {{ String(sectionIndex).padStart(2, '0') }}.
          </span>
          <span class="truncate">{{ displayTitle }}</span>
        </h2>
        <!-- Split-button: primary half copies markdown; the chevron half is
             the Floating-UI anchor for the AI-deep-link menu. Visually fused
             (negative margin merges the shared border) so it reads as one
             control with two affordances. The menu's `ref="menuEl"` is bound
             to `<Teleport to="body">` so it escapes the column's overflow
             clip; positioning is computed by `useFloating()`. -->
        <div class="copy-actions">
          <button
            type="button"
            class="copy-btn"
            :aria-label="`Copy ${displayTitle} as markdown`"
            :title="copyTitle"
            :data-state="copyState"
            @click.stop="copyMarkdown"
          >
            <!-- Plain text label. Icon iterations (sparkle, clipboard+MD)
                 either misread or were illegible at the available pixel
                 budget; a literal word is unambiguous and fits the
                 brutalist-terminal surface where the rest of the header
                 is already typographic. State-flipping is purely textual
                 so there is nothing to layout-thrash on success. -->
            <span class="copy-btn__label">{{ copyLabel }}</span>
          </button>
          <button
            ref="triggerEl"
            type="button"
            class="copy-btn copy-btn--menu"
            :aria-expanded="menuOpen"
            aria-haspopup="menu"
            aria-label="Open in AI assistant"
            title="Open in AI"
            @click.stop="toggleMenu"
          >
            <svg
              class="copy-btn__caret"
              :class="{ 'copy-btn__caret--open': menuOpen }"
              viewBox="0 0 12 8"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="square"
              stroke-linejoin="miter"
              aria-hidden="true"
            >
              <path d="M2 2 L6 6 L10 2" />
            </svg>
          </button>
        </div>
        <Teleport to="body">
          <div
            v-if="menuOpen"
            ref="menuEl"
            class="copy-menu"
            role="menu"
            :style="floatingStyles"
            @click.stop
          >
            <a
              :href="claudeUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="copy-menu__item"
              role="menuitem"
              @click="closeMenu"
            >
              <span class="copy-menu__arrow">→</span>
              <span>Claude.ai</span>
            </a>
            <a
              :href="chatgptUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="copy-menu__item"
              role="menuitem"
              @click="closeMenu"
            >
              <span class="copy-menu__arrow">→</span>
              <span>ChatGPT</span>
            </a>
          </div>
        </Teleport>
      </div>
    </div>

    <!-- Scrollable content area — grows to fill remaining height. Scrollbar
         is scoped here, so it never intrudes into the header above. -->
    <div class="flex-1 overflow-y-auto min-h-0">
      <!-- LIST VIEW: any path that has children renders as a section listing. -->
      <template v-if="isList">
        <div v-if="hasRenderedBody" class="content px-5 pt-6">
          <ContentRenderer :value="renderedPage" />
        </div>

        <!-- Latest — newest-created articles across the subtree, deduped against
             the column's own Articles list. Sits above Folders as a "what's new"
             entry point. Auto-hides when empty (e.g. flat leaf folders). -->
        <section v-if="latest.length > 0" aria-label="Latest">
          <h3 class="section-heading mx-5">
            <!-- Clock — connotes recency, the section's defining axis. -->
            <svg
              class="section-heading__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="square"
              stroke-linejoin="miter"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7 L12 12 L16 14" />
            </svg>
            <span>Latest</span>
          </h3>
          <ul class="flex flex-col py-2">
            <li
              v-for="(file, index) in latest"
              :key="file.path"
              :class="['terminal-item min-w-0', isDrilled(file.path) && 'terminal-item--active']"
            >
              <NuxtLink
                :to="file.path"
                class="flex items-baseline min-w-0 w-full"
              >
                <span class="title-text font-bold uppercase whitespace-nowrap py-2 px-3 ml-2 transition-all overflow-hidden text-ellipsis flex-shrink min-w-0 text-sm">
                  {{ file.title || slugToTitle(file.path.split('/').pop() || '') }}
                </span>
                <span
                  v-if="metaSegments(file).length"
                  :class="['game-chip ml-2', gameChipVariant(file)]"
                >
                  {{ metaSegments(file).join(' · ') }}
                </span>
                <span class="dotted-leader flex-shrink" />
                <!-- Rank 01 = newest. Distinct from Articles' count-down numbering
                     because this list is explicitly time-ordered. -->
                <span class="tabular-nums font-bold font-mono text-[10px] flex-shrink-0 text-terminal-text-faint mr-4">
                  {{ String(index + 1).padStart(2, '0') }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <!-- Sections sub-grouping (folders) -->
        <section v-if="hierarchy.sections.length > 0" aria-label="Sections">
          <h3 class="section-heading mx-5">
            <!-- Folder glyph — sharp-cornered tab + body, matches the
                 brutalist surface (no rounded folder corners). -->
            <svg
              class="section-heading__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="square"
              stroke-linejoin="miter"
              aria-hidden="true"
            >
              <path d="M3 6 L10 6 L12 9 L21 9 L21 20 L3 20 Z" />
            </svg>
            <span>Folders</span>
          </h3>
          <ul class="flex flex-col py-2">
            <li
              v-for="(section, index) in hierarchy.sections"
              :key="section.path"
              :class="['terminal-item min-w-0', isDrilled(section.path) && 'terminal-item--active']"
            >
              <NuxtLink
                :to="section.path"
                class="flex items-baseline min-w-0 w-full"
              >
                <span class="title-text font-bold uppercase whitespace-nowrap py-2 px-3 ml-2 transition-all overflow-hidden text-ellipsis flex-shrink min-w-0 text-sm">
                  {{ section.title }}
                </span>
                <span class="dotted-leader flex-shrink" />
                <span class="tabular-nums font-bold font-mono text-[10px] flex-shrink-0 text-terminal-text-faint mr-4">
                  {{ String(section.count).padStart(2, '0') }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <!-- Root file listing (flat articles within current section) -->
        <section v-if="hierarchy.rootFiles.length > 0" aria-label="Articles">
          <h3 class="section-heading mx-5">
            <!-- Document with folded corner + body lines — universal
                 "article / file" affordance. -->
            <svg
              class="section-heading__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="square"
              stroke-linejoin="miter"
              aria-hidden="true"
            >
              <path d="M6 3 L15 3 L20 8 L20 21 L6 21 Z" />
              <path d="M15 3 L15 8 L20 8" />
              <path d="M9 13 L16 13" />
              <path d="M9 17 L16 17" />
            </svg>
            <span>Articles</span>
            <span
              v-if="articlesUniformMeta"
              :class="['ml-auto game-chip', articlesUniformGameVariant]"
            >
              {{ articlesUniformMeta }}
            </span>
          </h3>
          <ul class="flex flex-col py-2">
            <li
              v-for="(file, index) in hierarchy.rootFiles"
              :key="file.path"
              :class="['terminal-item min-w-0', isDrilled(file.path) && 'terminal-item--active']"
            >
              <NuxtLink
                :to="file.path"
                class="flex items-baseline min-w-0 w-full"
              >
                <span class="title-text font-bold uppercase whitespace-nowrap py-2 px-3 ml-2 transition-all overflow-hidden text-ellipsis flex-shrink min-w-0 text-sm">
                  {{ file.title || slugToTitle(file.path.split('/').pop() || '') }}
                </span>
                <span
                  v-if="!articlesUniformMeta && metaSegments(file).length"
                  :class="['game-chip ml-2', gameChipVariant(file)]"
                >
                  {{ metaSegments(file).join(' · ') }}
                </span>
                <span class="dotted-leader flex-shrink" />
                <span class="tabular-nums font-bold font-mono text-[10px] flex-shrink-0 text-terminal-text-faint mr-4">
                  {{ String(hierarchy.rootFiles.length - index).padStart(2, '0') }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </template>

      <!-- ARTICLE VIEW: only reached when a page exists with content body and no children. -->
      <article v-else-if="page" class="px-5 py-6 md:py-8 max-w-[75ch]">
        <header class="mb-8 pb-5 border-b-2 border-dashed border-terminal-border">
          <h1 class="text-2xl md:text-3xl font-display font-bold uppercase tracking-tight leading-tight text-terminal-text mb-3">
            {{ displayTitle }}
          </h1>

          <ul v-if="allTags.length" class="flex flex-wrap gap-2 mt-3">
            <li v-for="tag in allTags" :key="tag.value">
              <NuxtLink
                :to="`/tags/${tag.value}`"
                :class="['tag-badge', tag.important && 'tag-badge--active']"
              >
                {{ toTitleCase(tag.value) }}
              </NuxtLink>
            </li>
          </ul>
        </header>

        <div class="content">
          <ContentRenderer :value="renderedPage" />
        </div>
      </article>
    </div>
  </div>
</template>
