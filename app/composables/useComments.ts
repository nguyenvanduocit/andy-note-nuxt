import { computed, ref, type Ref, type ComputedRef } from 'vue'

// Reader comments — data layer (the "functional core").
//
// This composable owns the *data* concern only: reading the opt-in config,
// holding the author-resolve token, and talking to the configured endpoint.
// All DOM / selection / highlight work (the "imperative shell") lives in
// CommentLayer.vue. Keeping the two apart means the API surface is trivially
// reusable and the component stays purely about the browser.
//
// Storage backend is a static-site-safe Cloudflare Pages Function + Workers KV
// (see `server-functions/comments.ts`). The composable is backend-agnostic: it
// only knows a single endpoint that speaks GET (list open) / POST (create) /
// DELETE (resolve). A consumer could repoint `endpoint` at any compatible API.

/** A text-quote + position anchor for a selection-scoped comment.
 *  `null` anchor (on a Comment) means a whole-article comment. */
export interface CommentAnchor {
  /** The exact selected text — primary re-anchoring key. */
  quote: string
  /** Up to 32 chars of normalized text immediately before `quote`. */
  prefix: string
  /** Up to 32 chars of normalized text immediately after `quote`. */
  suffix: string
  /** Char offset of the selection start within the article's normalized text. */
  start: number
  /** Char offset of the selection end. */
  end: number
}

export interface Comment {
  id: string
  /** Content path this comment belongs to, e.g. `/builds/foo`. */
  path: string
  body: string
  /** `null` for a whole-article comment. */
  anchor: CommentAnchor | null
  /** Optional display name the reader typed; empty → "Anonymous". */
  author?: string
  /** Epoch ms. */
  createdAt: number
}

export interface CommentDraft {
  body: string
  anchor: CommentAnchor | null
  author?: string
}

interface CommentsConfig {
  enabled: boolean
  endpoint: string
}

// Author token lives in localStorage so the site author can resolve comments
// from their own browser without an auth provider. It is supplied once via
// `?ec_author=<secret>` (captured + stripped on load) and sent as a bearer
// token on DELETE. This is deliberately lightweight: the secret only authorizes
// the destructive `resolve`, never reads, and is the author's own machine.
const AUTHOR_TOKEN_KEY = 'andy-note:comment-author-token'
const AUTHOR_QUERY_PARAM = 'ec_author'

// Module-level singletons so every CommentLayer instance (one per column, and
// the same article can mount in two columns) shares author state and never
// re-reads localStorage redundantly.
let _isAuthor: Ref<boolean> | null = null
let _authorToken: string | null = null

function readAuthorToken(): string | null {
  if (_authorToken !== null) return _authorToken || null
  if (!import.meta.client) return null
  try {
    _authorToken = localStorage.getItem(AUTHOR_TOKEN_KEY) || ''
  }
  catch {
    _authorToken = ''
  }
  return _authorToken || null
}

export function useComments() {
  const runtime = useRuntimeConfig()
  const raw = (runtime.public.site as { comments?: Partial<CommentsConfig> }).comments
  const config: CommentsConfig = {
    enabled: raw?.enabled === true,
    endpoint: typeof raw?.endpoint === 'string' && raw.endpoint.length > 0 ? raw.endpoint : '/api/comments',
  }

  const enabled: ComputedRef<boolean> = computed(() => config.enabled)

  if (!_isAuthor) _isAuthor = ref(false)
  const isAuthor = _isAuthor

  /** Capture `?ec_author=<secret>` once on the client: persist it, flip author
   *  mode on, and strip the param from the URL so the secret isn't left in the
   *  address bar / shared links. Idempotent and SSR-safe. */
  function initAuthor(): void {
    if (!import.meta.client) return
    try {
      const url = new URL(window.location.href)
      const fromQuery = url.searchParams.get(AUTHOR_QUERY_PARAM)
      if (fromQuery) {
        localStorage.setItem(AUTHOR_TOKEN_KEY, fromQuery)
        _authorToken = fromQuery
        url.searchParams.delete(AUTHOR_QUERY_PARAM)
        window.history.replaceState(window.history.state, '', url.toString())
      }
    }
    catch {
      // URL/localStorage unavailable — author mode simply stays off.
    }
    isAuthor.value = !!readAuthorToken()
  }

  async function fetchComments(path: string): Promise<Comment[]> {
    if (!config.enabled || !import.meta.client) return []
    try {
      const res = await $fetch<{ comments: Comment[] }>(config.endpoint, {
        method: 'GET',
        query: { path },
      })
      return Array.isArray(res?.comments) ? res.comments : []
    }
    catch {
      // Backend unreachable / not wired yet — fail closed (no comments shown)
      // rather than breaking the article render.
      return []
    }
  }

  async function postComment(path: string, draft: CommentDraft): Promise<Comment | null> {
    if (!config.enabled || !import.meta.client) return null
    return await $fetch<Comment>(config.endpoint, {
      method: 'POST',
      body: {
        path,
        body: draft.body,
        anchor: draft.anchor,
        author: draft.author || undefined,
      },
    })
  }

  async function resolveComment(path: string, id: string): Promise<void> {
    const token = readAuthorToken()
    if (!config.enabled || !import.meta.client || !token) return
    await $fetch(config.endpoint, {
      method: 'DELETE',
      query: { path, id },
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  return {
    enabled,
    endpoint: config.endpoint,
    isAuthor,
    initAuthor,
    fetchComments,
    postComment,
    resolveComment,
  }
}
