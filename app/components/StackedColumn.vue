<script setup lang="ts">
const props = defineProps<{
  path: string
  index: number
}>()

const { fullStack, handleStackClick, scrollToColumn } = useStack()

// `/tags/<slug>` paths render a tag listing instead of a path-resolved page.
// ContentView resolves content strictly by path and has no tag-membership
// logic, so without this branch a tag path — whether it's column 0 (a direct
// `/tags/x` visit) or a deeper `?stack=/tags/x` column — would dead-end in the
// "Not Found" panel. StackedColumn is the single seam that renders EVERY
// column, so branching here makes tag pages work identically standalone and
// stacked. Tags are produced by ContentView's `tag-badge` links.
const TAG_PREFIX = '/tags/'
const isTagPath = computed(() => props.path.startsWith(TAG_PREFIX))
const tagSlug = computed(() => props.path.slice(TAG_PREFIX.length))

/**
 * Click on a column performs two things in order:
 * 1. handleStackClick — push a new column if an internal anchor was clicked
 *    (preventDefault is set inside useStack when this path is taken).
 * 2. Fallthrough — if the click was NOT consumed by anchor handling
 *    (empty space, peek-strip click, external link, etc.), bring this column
 *    into focus by scrolling its right edge to the viewport's right edge.
 *    Idempotent for already-active columns (scrollIntoView is a no-op).
 */
function onClick(event: MouseEvent) {
  handleStackClick(event, props.index)
  if (event.defaultPrevented) return
  // Buttons (copy split-button, the Articles pager) and comment highlights
  // (CommentLayer's <mark>, which opens its own thread popover) are
  // self-contained controls, not focus-this-column gestures: refocusing would
  // scroll-jump the reader away mid-interaction — worst on mobile, where focus
  // scrolls the column's top back to the container top. This capture handler
  // runs before CommentLayer's, so the exclusion has to live here.
  if ((event.target as Element | null)?.closest('button, mark.ec-mark')) return
  scrollToColumn(props.index)
}
</script>

<template>
  <div
    class="stacked-column flex flex-col h-full overflow-hidden bg-terminal-bg"
    :data-column-index="index"
    :style="{ '--col-idx': index }"
  >
    <div class="flex-1 min-h-0" @click.capture="onClick">
      <!--
        :key="path" forces the inner view to remount when this slot's path
        prop changes. Without it, a slot whose StackedColumns key is the
        index (kept stable across stack mutations to preserve transition
        identity) keeps the same instance — but useAsyncData baked the
        initial path/tag into its cache key at setup time, so the rendered
        content stays frozen on the original path. Remounting on path change
        re-runs setup with the new path.
      -->
      <TagListing v-if="isTagPath" :key="path" :tag="tagSlug" :no-throw="true" />
      <ContentView v-else :key="path" :path="path" :no-throw="true" />
    </div>
  </div>
</template>

<style scoped>
/* Sticky-stack layout — earlier columns peek 48px at the viewport's left
   edge via position:sticky; z-index ascends with --col-idx so later columns
   paint over earlier ones (otherwise col 0 would cover all subsequent
   peeks). The last column's sticky never activates because max-scroll
   stays below its threshold (N*col-width − viewport vs. (N−1)*(col-width
   − peek)) for typical viewport sizes, so it stays at natural flex
   position — exactly where the active card belongs.

   No opacity/filter dim on stacked cols. Tried it — the translucency
   bled lower-z columns through their stacked neighbors, producing visual
   noise the user called "chồng chéo". Borders + z-index already give
   sufficient stacking cues without compromising readability. */
.stacked-column {
  flex: 0 0 var(--column-width);
  min-width: var(--column-min-width);
  position: sticky;
  left: calc(var(--col-idx, 0) * var(--stack-peek, 48px));
  z-index: var(--col-idx, 0);
  /* Column dividers, no border (a border parks a line BESIDE the scrollbar
     instead of over it). The LEFT outline box-shadow is also the adjacency
     divider: for two adjacent columns the later one (higher z-index) paints its
     left outline over the earlier column's right edge — including that column's
     scrollbar thumb, the same #474541 (see main.css) — so thumb and divider
     read as a single line. */
  box-shadow: -3px 0 0 #474541;
}

/* Right divider, drawn as an overlay ABOVE the column's own scrollbar (positive
   z-index inside this column's stacking context, so it paints after the
   descendant scroll pane's scrollbar) — the thumb merges into the line instead
   of parking beside it. Adjacent columns get their right divider for free from
   the neighbour's left box-shadow and just hide this ::after under that
   neighbour; it only becomes visible on the rightmost / standalone column,
   which has no neighbour to overpaint its scrollbar. */
.stacked-column::after {
  content: '';
  position: absolute;
  inset: 0 0 0 auto;
  width: 3px;
  background: #474541;
  z-index: 1;
  pointer-events: none;
}

/* Mobile (<md): ONE scroll, not two. The horizontal sticky-peek stack flattens
   into full-width sections that flow at their natural content height inside the
   single y-scroller (StackedColumns). There is no per-column inner scroll, so
   the page has exactly one scroll: read the active (lowest) column and, at its
   top, the same gesture flows straight into the column above. Each section's
   header stays pinned (sticky; top:0 — see main.css) so the current column's
   title is always visible. Accumulating peek strips are intentionally dropped:
   they need a viewport-height column with its own inner scroll, and that inner
   scroll nested in the page scroll is the "two competing scrolls" that reads as
   janky on touch. display:block so the inner flex wrapper can't collapse; the
   left/right column dividers restate as a single horizontal rule between
   sections. */
@media (max-width: 767px) {
  .stacked-column {
    display: block;
    flex: none;
    width: 100%;
    min-width: 0;
    height: auto;
    position: static;
    overflow: visible;
    box-shadow: none;
    border-right: 0;
    border-bottom: 3px solid #474541;
  }
  /* Mobile uses border-bottom dividers and position:static columns, where an
     absolute ::after would anchor to the wrong ancestor — drop it. */
  .stacked-column::after { display: none; }
}
</style>
