// Site-search state + engine, shared by SearchBox (the field above the home
// column's header) and SearchResults (the hit list inside the column's
// scroll body). The two render in different layout slots of ContentView, so
// state lives here rather than in either component. `useState` keys make it
// one app-wide instance — search exists only in the permanent home column,
// so a singleton is the correct cardinality.
//
// Backed by Nuxt Content's `queryCollectionSearchSections`: on a static
// build the query runs against the client-side WASM SQLite database, so
// search works with zero external services, keys, or index pipelines —
// every consumer inherits it as layer wiring. Matching is plain substring
// scoring: at this content scale (hundreds of pages → low thousands of
// sections) a search library would add a dependency without adding quality.

interface SearchSection {
  id: string
  title: string
  titles: string[]
  level: number
  content: string
}

export interface SearchHit {
  id: string
  title: string
  crumbs: string
  /** Escaped HTML with <mark> around matched terms — safe for v-html. */
  snippet: string
}

const MAX_RESULTS = 12
const SNIPPET_RADIUS = 60

// Loaded section dump — module scope, but client-only by construction
// (ensureIndex is gated on import.meta.client), so it never leaks across
// SSR requests and never serializes into a payload. It loads lazily on
// first search intent: the home column renders on EVERY page, so fetching
// eagerly — or during SSR — would pull the whole site's text into every
// page view.
let sections: SearchSection[] = []

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function markTerms(escaped: string, terms: string[]): string {
  const pattern = new RegExp(terms.map(escapeRegExp).join('|'), 'gi')
  return escaped.replace(pattern, '<mark>$&</mark>')
}

function makeSnippet(content: string, at: number, terms: string[]): string {
  if (at < 0) return ''
  const start = Math.max(0, at - SNIPPET_RADIUS)
  const end = Math.min(content.length, at + SNIPPET_RADIUS * 2)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < content.length ? '…' : ''
  return prefix + markTerms(escapeHtml(content.slice(start, end)), terms) + suffix
}

export function useSiteSearch() {
  const query = useState('site-search-query', () => '')
  const status = useState<'idle' | 'loading' | 'ready' | 'error'>('site-search-status', () => 'idle')
  const results = useState<SearchHit[]>('site-search-results', () => [])

  // Search-mode flag: while true the home column's header row is replaced
  // by the SearchBox field (the trigger button sits next to the copy
  // split-button). Closing restores the header and resets the query so the
  // listing comes back.
  const open = useState('site-search-open', () => false)

  // A query of 2+ chars is an active search — the home column swaps its
  // listing for SearchResults the moment this flips, while hits fill in
  // after the debounce.
  const searching = computed(() => query.value.trim().length >= 2)

  function openSearch() {
    open.value = true
  }

  function closeSearch() {
    open.value = false
    query.value = ''
    results.value = []
  }

  async function ensureIndex() {
    if (!import.meta.client || status.value !== 'idle') return
    status.value = 'loading'
    try {
      sections = await queryCollectionSearchSections('content')
      status.value = 'ready'
      runSearch() // serve a query typed while the dump was loading
    }
    catch {
      status.value = 'error'
    }
  }

  function runSearch() {
    const q = query.value.trim().toLowerCase()
    if (q.length < 2 || status.value !== 'ready') {
      results.value = []
      return
    }

    const terms = q.split(/\s+/).filter(Boolean)
    const scored: Array<{ score: number; hit: SearchHit }> = []

    for (const section of sections) {
      const title = section.title.toLowerCase()
      const crumbs = section.titles.join(' / ')
      const crumbsLower = crumbs.toLowerCase()
      const content = section.content.toLowerCase()

      // AND semantics: every term must appear somewhere in the section.
      // Title hits dominate the score (prefix > contains), breadcrumb hits
      // beat body hits, body hits record where the snippet should open.
      let score = 0
      let firstContentAt = -1
      for (const term of terms) {
        const inTitle = title.indexOf(term)
        const inCrumbs = crumbsLower.indexOf(term)
        const inContent = content.indexOf(term)
        if (inTitle === -1 && inCrumbs === -1 && inContent === -1) {
          score = 0
          break
        }
        if (inTitle === 0) score += 8
        else if (inTitle > 0) score += 4
        if (inCrumbs !== -1) score += 2
        if (inContent !== -1) {
          score += 1
          if (firstContentAt === -1) firstContentAt = inContent
        }
      }
      if (score === 0) continue

      scored.push({
        score,
        hit: {
          id: section.id,
          title: section.title,
          crumbs,
          snippet: makeSnippet(section.content, firstContentAt, terms),
        },
      })
    }

    scored.sort((a, b) => b.score - a.score)
    results.value = scored.slice(0, MAX_RESULTS).map(entry => entry.hit)
  }

  return { query, status, results, searching, open, openSearch, closeSearch, ensureIndex, runSearch }
}
