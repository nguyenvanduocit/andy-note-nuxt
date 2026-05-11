<script setup lang="ts">
const props = defineProps<{
  path: string
  index: number
}>()

const { fullStack, handleStackClick, scrollToColumn } = useStack()


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
  if (!event.defaultPrevented) {
    scrollToColumn(props.index)
  }
}
</script>

<template>
  <div
    class="stacked-column flex flex-col h-full overflow-hidden bg-terminal-bg border-r-[3px] border-terminal-border"
    :data-column-index="index"
    :style="{ '--col-idx': index }"
  >
    <div class="flex-1 min-h-0" @click.capture="onClick">
      <!--
        :key="path" forces ContentView to remount when this slot's path
        prop changes. Without it, a slot whose StackedColumns key is the
        index (kept stable across stack mutations to preserve transition
        identity) keeps the same ContentView instance — but ContentView's
        useAsyncData baked the initial path into its cache key at setup
        time, so the rendered content stays frozen on the original path.
        Remounting on path change re-runs setup with the new path.
      -->
      <ContentView :key="path" :path="path" :no-throw="true" />
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
  /* Left outline via box-shadow: takes no layout space, so when two columns
     are adjacent the left shadow of the later column (higher z-index) paints
     directly over the earlier column's right border — unified table-cell look.
     When a column stands alone, it renders as a clean left border. */
  box-shadow: -3px 0 0 #474541;
}

@media (max-width: 767px) {
  .stacked-column {
    flex: 0 0 100vw;
    min-width: 100vw;
    position: static;
  }
}
</style>
