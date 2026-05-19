<script setup lang="ts">
const containerRef = useTemplateRef<HTMLDivElement>('container')
const { fullStack, activeIndex, stack, isMobile, scrollToColumn } = useStack()
const route = useRoute()
const router = useRouter()

let observer: IntersectionObserver | null = null
const ratios = new Map<number, number>()
let activeUpdateTimer: ReturnType<typeof setTimeout> | null = null

function recomputeActive() {
  let best = -1
  let bestRatio = 0
  for (const [idx, ratio] of ratios) {
    if (ratio > bestRatio) {
      bestRatio = ratio
      best = idx
    }
  }
  if (best >= 0 && best !== activeIndex.value) {
    activeIndex.value = best
  }
}

/**
 * IntersectionObserver fires many times per second during smooth scroll,
 * which without debouncing caused activeIndex (and the .border-primary
 * highlight on the active column) to flicker between adjacent columns
 * mid-scroll. Wait until intersection ratios stabilize for 200ms before
 * resolving the new active column. Programmatic scrolls from
 * scrollToColumn already set activeIndex synchronously so the highlight
 * is correct immediately on click — this debounce only governs the
 * post-settle reconciliation.
 */
function scheduleRecomputeActive() {
  if (activeUpdateTimer) clearTimeout(activeUpdateTimer)
  activeUpdateTimer = setTimeout(() => {
    recomputeActive()
    activeUpdateTimer = null
  }, 200)
}

function observeAllColumns() {
  if (!observer || !containerRef.value) return
  observer.disconnect()
  ratios.clear()
  const cols = containerRef.value.querySelectorAll<HTMLElement>('[data-column-index]')
  for (const el of cols) {
    observer.observe(el)
  }
}

function maybeRedirectMobile() {
  if (!isMobile.value) return
  if (stack.value.length === 0) return
  const last = stack.value[stack.value.length - 1]
  if (!last) return
  router.replace({ path: last })
}

onMounted(() => {
  if (!containerRef.value) return
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const idx = Number((entry.target as HTMLElement).dataset.columnIndex)
        ratios.set(idx, entry.intersectionRatio)
      }
      scheduleRecomputeActive()
    },
    {
      root: containerRef.value,
      threshold: [0, 0.25, 0.5, 0.75, 1],
    },
  )
  observeAllColumns()
  maybeRedirectMobile()

  if (!isMobile.value && fullStack.value.length > 1) {
    scrollToColumn(fullStack.value.length - 1)
  }
})

watch(isMobile, (now, prev) => {
  if (now && !prev) maybeRedirectMobile()
})

onBeforeUnmount(() => {
  if (activeUpdateTimer) clearTimeout(activeUpdateTimer)
  observer?.disconnect()
  observer = null
})

watch(
  fullStack,
  () => {
    nextTick(() => observeAllColumns())
  },
  { flush: 'post' },
)
</script>

<template>
  <div
    ref="container"
    class="flex overflow-x-auto overflow-y-hidden h-full w-full"
    data-stacked-columns
  >
    <!--
      v-for is owned by this component (not the page) so TransitionGroup
      can track keys directly without going through a slot. Key is the
      column INDEX (not the path) — this is the load-bearing decision for
      a clean transition story:

        Stack [route, A, B, C, D] + click link in col 2 → [route, A, B, X]

        With :key="path"  → C unmounts at slot 3, X mounts at slot 3, D
                            unmounts at slot 4. Three concurrent
                            transitions, including a crossfade collision
                            at slot 3. Reads as flickery and confused.

        With :key="index" → slot 3's path prop changes C→X (no transition,
                            instant content swap). Only slot 4 actually
                            disappears, fading once. Symmetric and
                            logical — matches the user's mental model
                            ("trailing column closes, this column shows
                            new content"). Same applies for pure pushes
                            (only the new last index fades in) and pure
                            trims (only the trailing indices fade out).
    -->
    <TransitionGroup name="col-fade">
      <StackedColumn
        v-for="(p, i) in fullStack"
        :key="i"
        :path="p"
        :index="i"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
/*
  Stack-mutation transition story.

  Click a link in a middle column (e.g. [A,B,C,D,E] + click in B → [A,B,X])
  is implemented in useStack.pushColumn as a SINGLE router.replace combining
  trim + push. That mutation lands as one atomic stack swap on TransitionGroup,
  which — with key=index (see v-for above) — sees:

    Slot 0 (A): unchanged → no transition.
    Slot 1 (B): unchanged → no transition.
    Slot 2 (was C): path prop changes → C → X. ContentView's :key="path"
                    inside the slot remounts so the new content renders;
                    the slot itself runs NO column-level transition.
    Slot 3 (was D): no replacement → leave-fade.
    Slot 4 (was E): no replacement → leave-fade.

  Three pathologies the design defends against:

    1. Z-INDEX OCCLUSION. Leaving cols natural z-index:var(--col-idx) would
       paint OVER the new active X during their fade. Defended by .col-fade-
       leave-active forcing z-index:0 + pointer-events:none below.

    2. SCROLLWIDTH SHRINK MID-SCROLL. Smooth scroll target depends on
       finalFullLength, but during the leave-fade the leaving slots still
       occupy width. useStack passes finalFullLength to scrollToColumn so
       it clamps to the POST-fade max up front; once Vue unmounts the
       leaving slots and scrollWidth shrinks, scrollLeft is already at the
       new max and there is no visible clamp jump.

    3. STAGGER TIMING. CSS leave-active gets a delay = (max-col-idx − col-idx)
       × LEAVE_STAGGER_MS, so the rightmost leaving column starts fading at
       t=0 and inner ones follow inward — tail collapses toward the clicked
       column rather than dissolving as a block. useStack writes
       --max-col-idx onto the container before router.replace so the calc
       resolves correctly the first time leave-active is applied.

  Constants must stay in sync with LEAVE_DURATION_MS and LEAVE_STAGGER_MS
  in useStack.ts — search for "LEAVE_DURATION_MS" if you change them.
*/
.col-fade-enter-active {
  transition: opacity 220ms ease;
}
.col-fade-enter-from {
  opacity: 0;
}

.col-fade-leave-active {
  transition: opacity 200ms ease;
  /* Stagger: rightmost leaving col (high col-idx) goes first, leftmost
     leaving col (low col-idx, closest to surviving stack) goes last.
     --max-col-idx is set by useStack.pushColumn on the container before
     trim. When unset (e.g. browser back/forward navigation that bypasses
     pushColumn), the calc resolves to invalid and transition-delay falls
     to 0 — every column fades at once, the correct behavior for an
     un-orchestrated removal. */
  transition-delay: calc((var(--max-col-idx) - var(--col-idx)) * 60ms);
  /* Take leaving cols out of the visible stack so they can't occlude
     surviving columns or steal clicks during the fade. */
  z-index: 0 !important;
  pointer-events: none;
}
.col-fade-leave-to {
  opacity: 0;
}

/*
  scroll-snap was removed. With sticky-stacking, mandatory snap-end
  caused multiple columns to share scrollLeft=0 as their snap target
  (clamped for any K where (K+1)*column-width ≤ viewport), so scrolling
  toward col 0 yanked the user back to a middle column. Smooth scroll
  via scrollIntoView({behavior:'smooth'}) handles programmatic alignment
  on click without CSS snap.
*/
</style>
