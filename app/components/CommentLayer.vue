<script setup lang="ts">
// Reader comments — the "imperative shell": everything DOM / selection /
// highlight / popover lives here; the data/API concern is in useComments.
//
// Mounted once per column (inside ContentView's article view) and scoped to
// THAT column's rendered `.content` element, so the same article shown in two
// stacked columns highlights independently in each. Renders nothing during SSR
// and nothing at all when the feature is disabled — comments are fetched at
// runtime on the client, never baked into prerendered HTML.
//
// Code-review-style flow:
//   • select text in the article → floating "Comment" button → composer popover
//   • a stored comment paints a coral <mark>; clicking it opens its thread
//   • the author (holds the resolve secret) clicks Resolve → it disappears for all
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue'
import { toast } from 'vue-sonner'
import type { Comment, CommentAnchor } from '~/composables/useComments'

const props = defineProps<{ path: string }>()

const { enabled, isAuthor, initAuthor, fetchComments, postComment, resolveComment } = useComments()

// ---------------------------------------------------------------------------
// Anchoring (module-grade helpers kept local — this component owns anchoring).
//
// Offsets are character positions within the content element's `textContent`,
// which equals the in-order concatenation of its text nodes. Capture and
// re-anchor both measure against that same string, so they stay consistent
// within a deploy; the quote + prefix/suffix make re-anchoring survive minor
// content edits across deploys.
// ---------------------------------------------------------------------------
const AFFIX = 32

function offsetOf(root: HTMLElement, container: Node, offset: number): number {
  const r = document.createRange()
  r.setStart(root, 0)
  r.setEnd(container, offset)
  return r.toString().length
}

interface TextSegment { node: Text; start: number; end: number }

function collectSegments(root: HTMLElement): TextSegment[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const segments: TextSegment[] = []
  let cursor = 0
  let n = walker.nextNode() as Text | null
  while (n) {
    const len = (n.nodeValue ?? '').length
    if (len > 0) {
      segments.push({ node: n, start: cursor, end: cursor + len })
      cursor += len
    }
    n = walker.nextNode() as Text | null
  }
  return segments
}

function rangeFromOffsets(root: HTMLElement, start: number, end: number): Range | null {
  if (end <= start) return null
  const segments = collectSegments(root)
  let startNode: Text | null = null
  let startOff = 0
  let endNode: Text | null = null
  let endOff = 0
  for (const s of segments) {
    if (!startNode && start >= s.start && start < s.end) {
      startNode = s.node
      startOff = start - s.start
    }
    if (end > s.start && end <= s.end) {
      endNode = s.node
      endOff = end - s.start
      break
    }
  }
  if (!startNode || !endNode) return null
  const r = document.createRange()
  try {
    r.setStart(startNode, startOff)
    r.setEnd(endNode, endOff)
  }
  catch {
    return null
  }
  return r
}

/** Locate a stored anchor in the current content. Primary key is the quote
 *  (disambiguated by prefix/suffix and proximity to the original offset);
 *  falls back to the raw offset if the text matches exactly there. */
function locate(root: HTMLElement, anchor: CommentAnchor): Range | null {
  const full = root.textContent ?? ''
  if (!anchor.quote) return null

  let best = -1
  let bestScore = -Infinity
  let idx = full.indexOf(anchor.quote)
  while (idx !== -1) {
    const pre = full.slice(Math.max(0, idx - anchor.prefix.length), idx)
    const suf = full.slice(idx + anchor.quote.length, idx + anchor.quote.length + anchor.suffix.length)
    let score = 0
    if (anchor.prefix && (pre.endsWith(anchor.prefix) || anchor.prefix.endsWith(pre))) score += 2
    if (anchor.suffix && (suf.startsWith(anchor.suffix) || anchor.suffix.startsWith(suf))) score += 2
    score -= Math.abs(idx - anchor.start) / 1000
    if (score > bestScore) {
      bestScore = score
      best = idx
    }
    idx = full.indexOf(anchor.quote, idx + 1)
  }

  if (best === -1) {
    if (full.slice(anchor.start, anchor.end) === anchor.quote) best = anchor.start
    else return null
  }
  return rangeFromOffsets(root, best, best + anchor.quote.length)
}

function clearMarks(root: HTMLElement): void {
  root.querySelectorAll('mark.ec-mark').forEach((m) => {
    const parent = m.parentNode
    if (!parent) return
    while (m.firstChild) parent.insertBefore(m.firstChild, m)
    parent.removeChild(m)
    parent.normalize()
  })
}

/** Wrap every text node intersecting `range` in its own <mark> so a multi-node
 *  selection highlights cleanly (surroundContents only works within one node). */
function paintRange(range: Range, id: string): void {
  const startC = range.startContainer
  const startO = range.startOffset
  const endC = range.endContainer
  const endO = range.endOffset

  // A TreeWalker never yields its own root node. When the whole selection sits
  // inside ONE text node (plain prose with no inline markup — the common case),
  // `commonAncestorContainer` IS that text node, so walking from it would yield
  // nothing and paint no highlight. Walk from its parent in that case so the
  // node is visited; `intersectsNode` then keeps only the in-range node(s).
  const cac = range.commonAncestorContainer
  const walkRoot = cac.nodeType === Node.TEXT_NODE ? (cac.parentNode ?? cac) : cac
  const nodes: Text[] = []
  const walker = document.createTreeWalker(walkRoot, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode() as Text | null
  while (node) {
    if (range.intersectsNode(node)) nodes.push(node)
    node = walker.nextNode() as Text | null
  }

  for (const textNode of nodes) {
    const from = textNode === startC ? startO : 0
    const to = textNode === endC ? endO : textNode.length
    if (from >= to) continue
    const r = document.createRange()
    try {
      r.setStart(textNode, from)
      r.setEnd(textNode, to)
      const mark = document.createElement('mark')
      mark.className = 'ec-mark'
      mark.setAttribute('data-ec-id', id)
      r.surroundContents(mark)
    }
    catch {
      // crosses an element boundary mid-node — skip this fragment
    }
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const mounted = ref(false)
const comments = ref<Comment[]>([])
const contentEl = ref<HTMLElement | null>(null)
const rootEl = useTemplateRef<HTMLElement>('rootEl')

const openCount = computed(() => comments.value.length)

// Pending selection captured at mouseup (the click that opens the composer
// would otherwise collapse the live selection before we can read it).
const pendingAnchor = ref<CommentAnchor | null>(null)

// Floating "Comment" bubble shown on a fresh selection.
const bubbleRef = ref<{ getBoundingClientRect: () => DOMRect } | null>(null)
const bubbleEl = useTemplateRef<HTMLElement>('bubbleEl')
const bubbleOpen = ref(false)
const { floatingStyles: bubbleStyles } = useFloating(bubbleRef, bubbleEl, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 8 })],
  whileElementsMounted: autoUpdate,
})

// One mode-switched popover for both composing and reading a thread.
type PopMode = 'compose' | 'thread' | null
const popMode = ref<PopMode>(null)
const popRef = ref<Element | { getBoundingClientRect: () => DOMRect } | null>(null)
const popEl = useTemplateRef<HTMLElement>('popEl')
const { floatingStyles: popStyles } = useFloating(popRef, popEl, {
  placement: 'bottom',
  middleware: [offset(8), flip(), shift({ padding: 8 })],
  whileElementsMounted: autoUpdate,
})

const composeAnchor = ref<CommentAnchor | null>(null)
const draftBody = ref('')
const draftAuthor = ref('')
const submitting = ref(false)
const activeId = ref<string | null>(null)
const activeComment = computed(() => comments.value.find(c => c.id === activeId.value) || null)

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

// ---------------------------------------------------------------------------
// Highlights
// ---------------------------------------------------------------------------
function repaint(): void {
  const root = contentEl.value
  if (!root) return
  clearMarks(root)
  for (const c of comments.value) {
    const range = locate(root, c.anchor)
    if (range) paintRange(range, c.id)
  }
}

function flashMark(id: string): void {
  const root = contentEl.value
  if (!root) return
  const marks = root.querySelectorAll<HTMLElement>(`mark.ec-mark[data-ec-id="${CSS.escape(id)}"]`)
  const first = marks[0]
  if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' })
  marks.forEach((m) => {
    m.classList.add('ec-mark--flash')
    setTimeout(() => m.classList.remove('ec-mark--flash'), 1200)
  })
}

// ---------------------------------------------------------------------------
// Selection → bubble
// ---------------------------------------------------------------------------
function captureSelection(): void {
  const root = contentEl.value
  if (!root) return
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
    bubbleOpen.value = false
    return
  }
  const range = sel.getRangeAt(0)
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    bubbleOpen.value = false
    return
  }
  const quote = range.toString().trim()
  if (quote.length < 2) {
    bubbleOpen.value = false
    return
  }

  const start = offsetOf(root, range.startContainer, range.startOffset)
  const end = offsetOf(root, range.endContainer, range.endOffset)
  const full = root.textContent ?? ''
  pendingAnchor.value = {
    quote: range.toString(),
    prefix: full.slice(Math.max(0, start - AFFIX), start),
    suffix: full.slice(end, end + AFFIX),
    start,
    end,
  }

  // Virtual reference re-reads the LIVE selection rect each call, so the bubble
  // (and the compose popover that reuses this ref) track the text under scroll
  // instead of pinning to a frozen snapshot. The captured range is the fallback
  // once the selection is gone.
  const fallbackRect = range.getBoundingClientRect()
  bubbleRef.value = {
    getBoundingClientRect: () => {
      const live = window.getSelection()
      return live && live.rangeCount > 0 ? live.getRangeAt(0).getBoundingClientRect() : fallbackRect
    },
  }
  bubbleOpen.value = true
}

function onContentMouseup(): void {
  // Defer a tick so the browser finalizes the selection first.
  setTimeout(captureSelection, 0)
}

function onContentClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  const mark = target?.closest('mark.ec-mark') as HTMLElement | null
  if (!mark) return
  const id = mark.getAttribute('data-ec-id')
  if (!id) return
  event.preventDefault()
  event.stopPropagation()
  openThread(id, mark)
}

// ---------------------------------------------------------------------------
// Popover open/close
// ---------------------------------------------------------------------------
function openComposerFromSelection(): void {
  if (!pendingAnchor.value) return
  composeAnchor.value = pendingAnchor.value
  draftBody.value = ''
  popRef.value = bubbleRef.value
  popMode.value = 'compose'
  bubbleOpen.value = false
}

function openThread(id: string, anchorEl: Element): void {
  activeId.value = id
  popRef.value = anchorEl
  popMode.value = 'thread'
}

function closePopover(): void {
  popMode.value = null
  activeId.value = null
  composeAnchor.value = null
  draftBody.value = ''
}

async function submitDraft(): Promise<void> {
  const body = draftBody.value.trim()
  const anchor = composeAnchor.value
  if (!body || !anchor || submitting.value) return
  submitting.value = true
  try {
    const created = await postComment(props.path, {
      body,
      anchor,
      author: draftAuthor.value.trim() || undefined,
    })
    if (created) {
      comments.value = [...comments.value, created]
      await nextTick()
      repaint()
      toast.success('Comment posted')
      closePopover()
      const sel = window.getSelection()
      sel?.removeAllRanges()
    }
    else {
      toast.error('Comments are not available')
    }
  }
  catch (err) {
    toast.error('Could not post comment', {
      description: err instanceof Error ? err.message : undefined,
    })
  }
  finally {
    submitting.value = false
  }
}

async function resolve(id: string): Promise<void> {
  try {
    await resolveComment(props.path, id)
    comments.value = comments.value.filter(c => c.id !== id)
    await nextTick()
    repaint()
    if (activeId.value === id) closePopover()
    toast.success('Comment resolved')
  }
  catch (err) {
    toast.error('Could not resolve', {
      description: err instanceof Error ? err.message : undefined,
    })
  }
}

// ---------------------------------------------------------------------------
// Dismissal — click-outside / Esc for popovers and the bubble.
// ---------------------------------------------------------------------------
function onDocClick(event: MouseEvent): void {
  const t = event.target as Node
  if (bubbleOpen.value && !bubbleEl.value?.contains(t)) {
    // Keep the bubble while the selection that spawned it is still live.
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) bubbleOpen.value = false
  }
  if (popMode.value && popEl.value && !popEl.value.contains(t)) {
    const isMark = (t as HTMLElement).closest?.('mark.ec-mark')
    if (!isMark) closePopover()
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  bubbleOpen.value = false
  if (popMode.value) closePopover()
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
async function load(): Promise<void> {
  comments.value = await fetchComments(props.path)
  await nextTick()
  repaint()
}

onMounted(async () => {
  if (!enabled.value) return
  // Flip `mounted` first so the `v-if` root renders, then wait a tick so
  // `rootEl` is actually in the DOM before we reach for it. Keeping `mounted`
  // false during SSR + initial hydration is what makes the panel client-only
  // (no hydration mismatch — both server and first client render emit nothing).
  mounted.value = true
  await nextTick()
  initAuthor()

  // Locate THIS column's rendered article body. ContentView's root is
  // `.column-pane`; the prose lives in its `.content` child.
  contentEl.value
    = rootEl.value?.closest('.column-pane')?.querySelector<HTMLElement>('.content') ?? null

  if (contentEl.value) {
    contentEl.value.addEventListener('mouseup', onContentMouseup)
    contentEl.value.addEventListener('touchend', onContentMouseup)
    contentEl.value.addEventListener('click', onContentClick, true)
  }
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)

  await load()
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  if (contentEl.value) {
    contentEl.value.removeEventListener('mouseup', onContentMouseup)
    contentEl.value.removeEventListener('touchend', onContentMouseup)
    contentEl.value.removeEventListener('click', onContentClick, true)
    clearMarks(contentEl.value)
  }
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div v-if="enabled && mounted" ref="rootEl" class="ec-layer">
    <!-- In-flow footer: the column's open-comment roll. Sits at the end of the
         article so it reads as the column's discussion. -->
    <section class="ec-panel" aria-label="Reader comments">
      <div class="ec-panel__head">
        <span class="ec-panel__title">Comments</span>
        <span class="ec-panel__count">{{ String(openCount).padStart(2, '0') }}</span>
      </div>

      <p v-if="openCount === 0" class="ec-panel__empty">
        No open comments. Select any text to comment on it, like a code review.
      </p>

      <ul v-else class="ec-roll">
        <li v-for="c in comments" :key="c.id" class="ec-roll__item">
          <button type="button" class="ec-roll__quote" @click="flashMark(c.id)">
            “{{ c.anchor.quote }}”
          </button>
          <div class="ec-roll__meta">
            <span class="ec-roll__author">{{ c.author || 'Anonymous' }}</span>
            <span class="ec-roll__time">· {{ timeAgo(c.createdAt) }}</span>
          </div>
          <p class="ec-roll__body">{{ c.body }}</p>
          <button v-if="isAuthor" type="button" class="ec-resolve" @click="resolve(c.id)">
            ✓ Resolve
          </button>
        </li>
      </ul>
    </section>

    <!-- Selection action bubble -->
    <Teleport to="body">
      <button
        v-if="bubbleOpen"
        ref="bubbleEl"
        type="button"
        class="ec-bubble"
        :style="bubbleStyles"
        @click.stop="openComposerFromSelection"
      >
        💬 Comment
      </button>
    </Teleport>

    <!-- Mode-switched popover: compose / thread -->
    <Teleport to="body">
      <div
        v-if="popMode"
        ref="popEl"
        class="ec-pop"
        :style="popStyles"
        @click.stop
      >
        <template v-if="popMode === 'compose'">
          <div class="ec-pop__head">Comment on selection</div>
          <blockquote v-if="composeAnchor" class="ec-pop__quote">
            “{{ composeAnchor.quote }}”
          </blockquote>
          <textarea
            v-model="draftBody"
            class="ec-input ec-input--area"
            rows="3"
            placeholder="Your comment…"
            aria-label="Comment body"
          />
          <input
            v-model="draftAuthor"
            class="ec-input"
            type="text"
            placeholder="Name (optional)"
            aria-label="Your name"
          >
          <div class="ec-pop__actions">
            <button type="button" class="ec-btn" @click="closePopover">Cancel</button>
            <button
              type="button"
              class="ec-btn ec-btn--primary"
              :disabled="!draftBody.trim() || submitting"
              @click="submitDraft"
            >
              {{ submitting ? 'Sending…' : 'Send' }}
            </button>
          </div>
        </template>

        <template v-else-if="popMode === 'thread' && activeComment">
          <blockquote class="ec-pop__quote">
            “{{ activeComment.anchor.quote }}”
          </blockquote>
          <div class="ec-pop__meta">
            <span class="ec-roll__author">{{ activeComment.author || 'Anonymous' }}</span>
            <span class="ec-roll__time">· {{ timeAgo(activeComment.createdAt) }}</span>
          </div>
          <p class="ec-pop__body">{{ activeComment.body }}</p>
          <div class="ec-pop__actions">
            <button type="button" class="ec-btn" @click="closePopover">Close</button>
            <button
              v-if="isAuthor"
              type="button"
              class="ec-btn ec-btn--primary"
              @click="resolve(activeComment.id)"
            >
              ✓ Resolve
            </button>
          </div>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<!-- Injected <mark> highlights live in raw DOM (Range API), so they carry no
     scoped-style attribute — they must be styled globally. -->
<style>
mark.ec-mark {
  background: rgba(255, 123, 107, 0.22);
  border-bottom: 2px solid #ff7b6b;
  color: inherit;
  cursor: pointer;
  padding: 0 1px;
  transition: background 0.15s;
}
mark.ec-mark:hover {
  background: rgba(255, 123, 107, 0.38);
}
mark.ec-mark--flash {
  background: #ff7b6b;
  color: #2a2a28;
}
</style>

<style scoped>
/* Plain CSS with hardcoded theme tokens — same convention as
   LocalStorageChecklist.vue: independent of Tailwind purge state and the
   ContentRenderer `.content` prose overrides. */
/* No box — the section flows in the article like any other h2 block. */
.ec-panel {
  margin: 2.5rem 0 0;
  font-family: 'Space Grotesk', 'Space Grotesk Fallback', -apple-system, sans-serif;
  color: #d5cfc5;
}

.ec-panel__head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

/* Reads as a prose h2: Space Grotesk, bold, text-2xl, tracking-tight, sentence case. */
.ec-panel__title {
  font-family: 'Space Grotesk', 'Space Grotesk Fallback', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.ec-panel__count {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #8a857c;
}

.ec-panel__empty {
  margin: 0.75rem 0 0;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  font-style: italic;
  color: #8a857c;
  line-height: 1.5;
}

.ec-roll {
  list-style: none;
  margin: 0;
  padding: 0;
}
.ec-roll__item {
  padding: 0.75rem 0;
}
.ec-roll__item + .ec-roll__item {
  border-top: 1px dashed #3b3c39;
}

.ec-roll__quote {
  display: block;
  width: 100%;
  text-align: left;
  font-family: 'Literata', Georgia, serif;
  font-size: 0.875rem;
  font-style: italic;
  color: #c0b8a8;
  background: transparent;
  border: 0;
  border-left: 2px solid #ff7b6b;
  padding: 0 0 0 0.625rem;
  margin: 0 0 0.375rem;
  cursor: pointer;
}
.ec-roll__quote:hover {
  color: #ff7b6b;
}

.ec-roll__meta {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.6875rem;
  color: #8a857c;
}
.ec-roll__author {
  color: #a8a298;
  font-weight: 700;
}

.ec-roll__body {
  margin: 0.25rem 0 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: #d5cfc5;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.ec-resolve {
  margin-top: 0.5rem;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8a857c;
  background: transparent;
  border: 1px solid #474541;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.ec-resolve:hover {
  color: #ff7b6b;
  border-color: #ff7b6b;
}
</style>

<!-- Teleported elements (bubble + popover) live at <body>, outside this
     component's scoped subtree, so their styles are global too. -->
<style>
.ec-bubble {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 60;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 700;
  color: #2a2a28;
  background: #ff7b6b;
  border: 2px solid #2a2a28;
  box-shadow: 2px 2px 0 0 #474541;
  padding: 0.3125rem 0.625rem;
  cursor: pointer;
}
.ec-bubble:hover {
  box-shadow: 2px 2px 0 0 #2a2a28;
}

.ec-pop {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 60;
  width: 18rem;
  max-width: calc(100vw - 1rem);
  background: #2e2f2c;
  border: 3px solid #474541;
  box-shadow: 4px 4px 0 0 #474541;
  padding: 0.875rem;
  font-family: 'Space Grotesk', 'Space Grotesk Fallback', -apple-system, sans-serif;
  color: #d5cfc5;
}

.ec-pop__head {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.5rem;
}

.ec-pop__quote {
  font-family: 'Literata', Georgia, serif;
  font-size: 0.8125rem;
  font-style: italic;
  color: #c0b8a8;
  border-left: 2px solid #ff7b6b;
  padding-left: 0.5rem;
  margin: 0 0 0.5rem;
  max-height: 4.5rem;
  overflow: auto;
}

.ec-pop__meta {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.6875rem;
  color: #8a857c;
  margin-bottom: 0.25rem;
}

.ec-pop__body {
  margin: 0 0 0.625rem;
  font-size: 0.9375rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.ec-input {
  display: block;
  width: 100%;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  color: #d5cfc5;
  background: #2a2a28;
  border: 1.5px solid #474541;
  padding: 0.4375rem 0.5rem;
  margin-bottom: 0.5rem;
}
.ec-input:focus {
  outline: none;
  border-color: #ff7b6b;
}
.ec-input--area {
  resize: vertical;
  min-height: 3.5rem;
  font-family: 'Space Grotesk', 'Space Grotesk Fallback', sans-serif;
  line-height: 1.45;
}

.ec-pop__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.ec-btn {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #a8a298;
  background: transparent;
  border: 1.5px solid #474541;
  padding: 0.3125rem 0.625rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.ec-btn:hover:not(:disabled) {
  color: #ff7b6b;
  border-color: #ff7b6b;
}
.ec-btn--primary {
  color: #2a2a28;
  background: #ff7b6b;
  border-color: #ff7b6b;
}
.ec-btn--primary:hover:not(:disabled) {
  color: #2a2a28;
  background: #ff9385;
}
.ec-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
