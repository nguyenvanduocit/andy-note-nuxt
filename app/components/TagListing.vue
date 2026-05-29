<script setup lang="ts">
// Tag listing — the INNER content of a `/tags/<slug>` column. StackedColumn
// provides the `.stacked-column` wrapper (sizing, sticky stacking, mobile
// 100vw), so this owns only the inner chrome: an optional authored intro + a
// scrollable Articles list, mirroring ContentView's inner structure. Because
// StackedColumn renders every column, this works identically whether the tag
// path is column 0 (a direct `/tags/x` visit) or a deeper `?stack=/tags/x`
// column — clicks on listed articles bubble to StackedColumn's `@click.capture`
// and push the next column just like any in-column link.
//
// Tags come from ContentView's `tag-badge` links (`/tags/<kebab>`), produced
// from each page's frontmatter `tags`. A tag page lists every doc carrying the
// tag; clicking it opens that doc as the next column.
//
// Optional curated index: create `content/tags/<slug>.md` to give a tag a
// hand-written intro. Its body renders above the auto-collected list. Tags with
// no such file just show the list — the feature is purely additive.

interface TagDoc {
  path: string
  title?: string
  description?: string
  tags?: string[]
}

const props = defineProps<{
  tag: string
  // StackedColumn always passes no-throw; kept for API parity with ContentView.
  noThrow?: boolean
}>()

// Mirrors ContentView's toKebab byte-for-byte so the slug produced there from a
// frontmatter tag matches what we filter on here. `String(...)` coerce because
// an unquoted numeric YAML tag (`- 0.5`, `- 8`) parses as a number despite the
// schema, and a bare `.trim()` on it throws — fatal here since we scan EVERY
// doc's tags, so one numeric tag anywhere would crash every tag page.
function toKebab(str: unknown) {
  return String(str).trim().toLowerCase().replace(/\s+/g, '-')
}
function toTitleCase(str: string) {
  return str.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
function slugToTitle(slug: string) {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const tagSlug = computed(() => toKebab(props.tag))
// The curated index doc, if any, lives at this exact content path.
const tagPath = computed(() => `/tags/${tagSlug.value}`)

// One fetch per tag column. The index doc (full doc, including body for
// ContentRenderer) and the membership candidate set load in parallel.
// String key (NOT a function — `useAsyncData`'s first arg must be a string, or
// it's read as the handler and the real handler becomes options). StackedColumn
// passes `:key="path"`, so this remounts when the tag changes and the setup-time
// key/path are always current.
const { data } = await useAsyncData(
  `tag-${tagSlug.value}`,
  async () => {
    const [indexDoc, docs] = await Promise.all([
      queryCollection('content').where('path', '=', tagPath.value).first(),
      queryCollection('content').select('path', 'title', 'description', 'tags').all(),
    ])
    return { indexDoc, docs }
  },
)

// Content docs are loosely typed (the theme's own ContentView reads
// `page.value as any` for the same reason) — frontmatter shape varies per
// consumer, and only `body`/`title`/`description` are touched here.
const indexDoc = computed<any>(() => data.value?.indexDoc ?? null)

// The index doc never lists itself (exclude by path), even if the author tags it.
const matches = computed<TagDoc[]>(() => {
  const slug = tagSlug.value
  return ((data.value?.docs ?? []) as TagDoc[])
    .filter(doc => doc.path !== tagPath.value && (doc.tags ?? []).some(t => toKebab(t) === slug))
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
})

// Nuxt Content v3 always emits a body object even for frontmatter-only docs;
// the `value` array is empty when there's no real content, so check its length.
const hasIndexBody = computed<boolean>(() => {
  const body = indexDoc.value?.body
  return !!body && Array.isArray(body.value) && body.value.length > 0
})

const displayTag = computed(() => toTitleCase(tagSlug.value))
// A curated index can override the tag's display name via frontmatter `title`.
const headerTitle = computed(() => indexDoc.value?.title || displayTag.value)

// Render only when there is something to show — a curated intro OR matches.
const isEmpty = computed(() => !hasIndexBody.value && matches.value.length === 0)

useHead({
  title: `#${headerTitle.value}`,
  meta: [{
    name: 'description',
    content: indexDoc.value?.description || `Pages tagged #${displayTag.value}`,
  }],
})
</script>

<template>
  <!-- Empty (no curated intro AND no matches): inline panel at 200 — StackedColumn
       always passes no-throw, matching ContentView's not-found convention. -->
  <div v-if="isEmpty" class="p-12 text-center text-terminal-text-muted">
    <p class="font-display font-bold uppercase tracking-tight text-lg text-terminal-text mb-2">
      No Articles
    </p>
    <p class="text-sm font-mono">
      <code class="bg-terminal-surface-0 border border-terminal-border px-2 py-0.5">#{{ tagSlug }}</code>
    </p>
    <p class="text-sm mt-2">No pages carry this tag yet.</p>
  </div>

  <div v-else class="flex flex-col h-full">
    <div class="section-card-header flex-none">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-bold uppercase tracking-tight flex items-center gap-2 truncate">
          <span class="text-primary -translate-y-[1.5px]">#</span>
          <span class="truncate">{{ headerTitle }}</span>
          <span v-if="matches.length" class="tabular-nums font-mono text-terminal-text-faint text-xs shrink-0">
            {{ String(matches.length).padStart(2, '0') }}
          </span>
        </h2>
        <!-- data-stack-reset: defer to NuxtLink default so Home clears the
             stack (router.push to /) instead of pushing / as another column. -->
        <NuxtLink to="/" data-stack-reset class="tag-badge shrink-0">
          Home
        </NuxtLink>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto min-h-0">
      <!-- Curated intro: the body of content/tags/<slug>.md, when present. -->
      <div v-if="hasIndexBody" class="content px-5 pt-6">
        <ContentRenderer :value="indexDoc" />
      </div>

      <section v-if="matches.length" aria-label="Articles">
        <h3 class="section-heading mx-5">
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
        </h3>
        <ul class="flex flex-col py-2">
          <li
            v-for="(doc, index) in matches"
            :key="doc.path"
            class="terminal-item min-w-0"
          >
            <NuxtLink
              :to="doc.path"
              class="flex items-baseline min-w-0 w-full"
            >
              <span class="title-text font-bold uppercase whitespace-nowrap py-2 px-3 ml-2 transition-all overflow-hidden text-ellipsis flex-shrink min-w-0 text-sm">
                {{ doc.title || slugToTitle(doc.path.split('/').pop() || '') }}
              </span>
              <span class="dotted-leader flex-shrink" />
              <span class="tabular-nums font-bold font-mono text-[10px] flex-shrink-0 text-terminal-text-faint mr-4">
                {{ String(matches.length - index).padStart(2, '0') }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
