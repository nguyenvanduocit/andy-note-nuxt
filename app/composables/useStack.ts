import { computed, ref, nextTick, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * Singleton matchMedia ref — created once per client session.
 * SSR-safe: guarded by import.meta.client so it never touches window on the server.
 */
let _isMobileRef: Ref<boolean> | null = null

function useIsMobile(): Ref<boolean> {
  if (_isMobileRef) return _isMobileRef
  _isMobileRef = ref(false)
  if (import.meta.client) {
    const mq = window.matchMedia('(max-width: 767px)')
    _isMobileRef.value = mq.matches
    mq.addEventListener('change', (e) => {
      if (_isMobileRef) _isMobileRef.value = e.matches
    })
  }
  return _isMobileRef
}

/**
 * Normalize a path string: strip query/hash, ensure leading slash, collapse
 * double slashes, strip trailing slash on non-root paths.
 *
 * Trailing-slash strip matters because static hosts (Cloudflare Pages, Netlify
 * with `pretty_urls`, GitHub Pages with directories) 308-redirect `/foo` to
 * `/foo/`. The browser URL ends in `/`; `useRoute().path` reflects that;
 * `queryCollection().where('path', '=', '/foo/')` returns null because
 * Nuxt Content stores `index.md` paths without the trailing slash.
 * Normalizing here keeps the path equal to the stored shape regardless of
 * how the host rewrote the request URL.
 */
function normalizePath(path: string): string {
  // Strip query and hash using regex so split()[0] is always defined
  const withoutQuery = path.replace(/[?#].*$/, '')
  // Ensure leading slash
  const withSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`
  // Collapse double slashes
  const collapsed = withSlash.replace(/\/\/+/g, '/')
  // Strip trailing slash unless this IS the root path
  return collapsed.length > 1 ? collapsed.replace(/\/$/, '') : collapsed
}

/**
 * Check if an href is external (http, https, mailto, tel, or protocol-relative //).
 */
function isExternalHref(href: string): boolean {
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('//')
  )
}

/**
 * Find nearest <a> ancestor (inclusive of target) from an event target.
 */
function findAnchorAncestor(target: EventTarget | null): HTMLAnchorElement | null {
  let el = target as Element | null
  while (el && el.tagName !== 'A') {
    el = el.parentElement
  }
  return el as HTMLAnchorElement | null
}

export function useStack() {
  const route = useRoute()
  const router = useRouter()
  const isMobile = useIsMobile()

  /** column 1+ paths from query.stack, normalized to string[] */
  const stack = computed<string[]>(() => {
    const raw = route.query.stack
    const arr = raw == null ? [] : Array.isArray(raw) ? raw : [raw]
    return arr.filter((p): p is string => typeof p === 'string' && p.length > 0)
  })

  /** [route.path, ...stack] — all column paths including column 0.
   *  route.path passes through normalizePath so a host-injected trailing
   *  slash (e.g. CF Pages 308 `/foo` → `/foo/`) doesn't break content lookup. */
  const fullStack = computed<string[]>(() => [normalizePath(route.path), ...stack.value])

  /** Currently focused column index — updated by callers (e.g. IntersectionObserver in US-005) */
  const activeIndex = ref<number>(0)

  /**
   * Scroll the container so column at the given index is fully revealed at its
   * peek-aligned position (sticky-stack natural state).
   *
   * Why a custom calculation instead of element.scrollIntoView():
   * scrollIntoView() uses the element's *current* bounding rect, which for a
   * sticky-active column is the peek-painted position (e.g. col 1 stuck at
   * viewport-x=48, not its natural flex position at 640). Browser solves the
   * "align rect.right with viewport-right" equation against that peek rect,
   * arrives at a scrollLeft where the column is still inside its sticky
   * threshold, sticky re-activates after the scroll, and the column stays
   * stuck at peek — visible only as the original 48px strip. The user
   * observed this as "scroll runs but only half/partial reveal at end".
   *
   * Geometry instead. With cols 0..K-1 sticky-stacked at left edges and col K
   * sitting just past the peek stack:
   *   col K viewport-x = K * stack-peek
   *   col K natural-pos − scrollLeft = K * stack-peek
   *   K * col-width − scrollLeft = K * stack-peek
   *   ⇒ scrollLeft = K * (col-width − stack-peek)
   *
   * For the last column, this target exceeds max scroll (N*col-width − vw),
   * so the browser naturally clamps it — leaving the last column right-aligned
   * at viewport-right, which is exactly the active-card layout the rest of the
   * stack already assumes.
   *
   * expectedFullLength is the post-mutation column count. Pass it when the
   * DOM still contains leaving columns whose width has not yet been reclaimed
   * (TransitionGroup leave-fade in progress) — without it the formula would
   * scroll into the about-to-disappear slots' natural positions, leaving
   * scrollLeft in a place the post-fade max can't support, which the browser
   * then snaps back from at transitionend. With it, we clamp to the post-fade
   * max up front so the eventual shrink is invisible.
   */
  function scrollToColumn(index: number, expectedFullLength?: number): void {
    if (!import.meta.client) return
    const container = document.querySelector<HTMLElement>('[data-stacked-columns]')
    if (!container) return

    activeIndex.value = index

    const rootStyles = getComputedStyle(document.documentElement)
    const colWidth = parseInt(rootStyles.getPropertyValue('--column-width'), 10) || 640
    const stackPeek = parseInt(rootStyles.getPropertyValue('--stack-peek'), 10) || 48
    let targetScrollLeft = index * (colWidth - stackPeek)

    if (expectedFullLength !== undefined) {
      const postFadeMax = expectedFullLength * colWidth - container.clientWidth
      if (postFadeMax < targetScrollLeft) targetScrollLeft = Math.max(0, postFadeMax)
    }

    container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' })
  }

  /**
   * Leave-transition timing — must stay in sync with the .col-fade-leave-active
   * rules in StackedColumns.vue. Stagger is per-column delay, applied rightmost
   * first; total leave time = LEAVE_DURATION_MS + (leavingCount-1) * LEAVE_STAGGER_MS.
   * Buffer is added on top so Phase B starts after Vue has fully removed the
   * leaving DOM nodes (transitionend → next tick).
   */
  const LEAVE_DURATION_MS = 200
  const LEAVE_STAGGER_MS = 60
  const LEAVE_BUFFER_MS = 30

  /**
   * Push a new column to the right of fromIndex, or scroll to it if already in the stack.
   *
   * Single atomic router.replace combining trim + push. With key=index on the
   * <TransitionGroup> in StackedColumns.vue, the slot at fromIndex+1 keeps its
   * slot identity across the mutation — its `path` prop swaps and ContentView
   * remounts via :key="path" on the inner element, but the slot itself runs no
   * leave/enter transition. Only slots BEYOND finalFullLength actually unmount,
   * and they get the staggered fade. Smooth scroll fires while leaving slots
   * still occupy width, so scrollWidth stays constant during the fade and the
   * post-fade shrink is invisible (scrollLeft has already settled at the new max).
   *
   * Why this differs from the previous trim → wait → push two-phase:
   * the old code did router.replace(trimmedStack) first, which removed slot
   * fromIndex+1 entirely (TransitionGroup leave-fade), then pushed it back as
   * a fresh slot (enter-fade). For the common case [A,B,C] + click in B → [A,B,X]
   * where finalFullLength == currentFullLength, that path swap should be silent
   * but the two-phase forced an unnecessary leave/enter pair. Worse, between
   * phases scrollWidth shrank by one column, the browser auto-clamped scrollLeft
   * to the smaller max (visible as "B shifts left to right-edge"), then phase B
   * grew scrollWidth back and smooth-scroll moved the layout right again
   * ("shifts back"). The user reported this exact double-shift.
   *
   * All stack mutations use router.replace (no history bloat).
   */
  async function pushColumn(targetPath: string, fromIndex: number): Promise<void> {
    const normalized = normalizePath(targetPath)
    const fullPaths = fullStack.value

    // No-op: clicked link to the current column
    if (normalized === fullPaths[fromIndex]) return

    // Already open: scroll to it instead of duplicating
    const existingIndex = fullPaths.indexOf(normalized)
    if (existingIndex >= 0) {
      scrollToColumn(existingIndex)
      return
    }

    const trimmedStack = stack.value.slice(0, Math.max(fromIndex, 0))
    const finalStack = [...trimmedStack, normalized]
    // Final fullStack length = column 0 (route.path) + trimmedStack + new column.
    const finalFullLength = fromIndex + 2
    // Slots that genuinely unmount. With key=index, slot at fromIndex+1 keeps
    // identity (path swap, no transition); only slots strictly beyond it leave.
    const leavingCount = Math.max(0, fullPaths.length - finalFullLength)
    const { stack: _omit, ...rest } = route.query

    // Pre-set --max-col-idx so the CSS stagger formula (max - idx) * 60ms
    // resolves correctly when Vue applies leave-active on the leaving slots.
    // Skip when nothing leaves — the var simply isn't read in that case.
    if (leavingCount > 0 && import.meta.client) {
      const container = document.querySelector<HTMLElement>('[data-stacked-columns]')
      container?.style.setProperty('--max-col-idx', String(fullPaths.length - 1))
    }

    // Single atomic mutation. Slot at fromIndex+1 path-swaps (silent), slots
    // beyond it run the staggered leave-fade. ScrollWidth stays constant
    // throughout the fade because leaving slots still occupy flex width.
    await router.replace({
      path: route.path,
      query: { ...rest, stack: finalStack },
    })
    await nextTick()

    // Scroll while leaving slots still occupy width. Pass finalFullLength so
    // the helper clamps to the post-fade max instead of overshooting into the
    // about-to-disappear slots' territory — without that clamp, the browser
    // would snap scrollLeft back at transitionend when scrollWidth shrinks.
    scrollToColumn(fromIndex + 1, finalFullLength)

    if (leavingCount > 0) {
      const totalLeaveMs =
        LEAVE_DURATION_MS + (leavingCount - 1) * LEAVE_STAGGER_MS + LEAVE_BUFFER_MS
      await new Promise(resolve => setTimeout(resolve, totalLeaveMs))
      if (import.meta.client) {
        const container = document.querySelector<HTMLElement>('[data-stacked-columns]')
        container?.style.removeProperty('--max-col-idx')
      }
    }
  }

  /**
   * Returns true if path is anywhere in the full stack (column 0 included).
   */
  function isInStack(path: string): boolean {
    return fullStack.value.includes(normalizePath(path))
  }

  /**
   * Click interceptor for column body content links.
   * Prevents default and calls pushColumn for valid internal links.
   */
  function handleStackClick(event: MouseEvent, fromIndex: number): void {
    if (!import.meta.client) return
    if (isMobile.value) return // mobile: let NuxtLink handle navigation natively

    const anchor = findAnchorAncestor(event.target)
    if (!anchor) return

    // Let browser handle modifier-key clicks (new tab, etc.)
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    // Let browser handle _blank target
    if (anchor.target === '_blank') return

    const href = anchor.getAttribute('href')
    if (!href) return

    // External links: fall through to browser
    if (isExternalHref(href)) return

    // Reset zone ancestor: defer to NuxtLink default (router.push clears query.stack)
    if (anchor.closest('[data-stack-reset-zone]')) return

    // Individual links marked as reset-intent: defer to NuxtLink default
    if (anchor.hasAttribute('data-stack-reset')) return

    // Hash-only hrefs ("#foo") are ALWAYS in-column anchors regardless of where
    // the column is mounted in the stack. We cannot resolve them against
    // window.location.href to get a column-path comparison: when this column
    // is at fullStack[1+], window.location.href is "/?stack=<col1path>" so the
    // resolved pathname becomes "/" and the comparison below would treat the
    // hash as a navigation to root. Handle hash-only as a dedicated branch
    // first so footnote refs (`<a href="#user-content-fn-1">`), back-refs, TOC
    // anchors, and heading refs all scroll inside this column, not navigate.
    if (href.startsWith('#')) {
      // preventDefault alone is not enough: Nuxt Content's ProseA renders
      // markdown `<a>` as `<NuxtLink>`, whose bubble-phase click handler
      // ignores defaultPrevented and calls router.push() — which resolves
      // a hash-only href against route.path ("/" when this column is in
      // stack mode) and drops query.stack as a side effect, hard-navigating
      // to the home page. stopPropagation() in this capture-phase handler
      // prevents NuxtLink's bubble-phase listener from running at all.
      event.preventDefault()
      event.stopPropagation()
      const targetId = decodeURIComponent(href.slice(1))
      // Scope the lookup to this column so duplicate ids across columns
      // (possible when two columns render the same article) don't scroll
      // the wrong one.
      const columnEl = anchor.closest('[data-column-index]') as HTMLElement | null
      const target = columnEl?.querySelector<HTMLElement>(`[id="${CSS.escape(targetId)}"]`)
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    // Resolve path-relative or absolute hrefs. Base is window.location.href —
    // safe here because we've already handled hash-only above.
    const resolved = new URL(href, window.location.href)
    const pathname = resolved.pathname

    // "/current-path#section"-style anchor that points back to this column's
    // own path: scroll within this column instead of navigating.
    if (pathname === fullStack.value[fromIndex] && resolved.hash) {
      event.preventDefault()
      const targetId = decodeURIComponent(resolved.hash.slice(1))
      const columnEl = anchor.closest('[data-column-index]') as HTMLElement | null
      const target = columnEl?.querySelector<HTMLElement>(`[id="${CSS.escape(targetId)}"]`)
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    event.preventDefault()
    pushColumn(pathname, fromIndex)
  }

  return {
    stack,
    fullStack,
    activeIndex,
    isMobile,
    pushColumn,
    isInStack,
    scrollToColumn,
    handleStackClick,
  }
}
