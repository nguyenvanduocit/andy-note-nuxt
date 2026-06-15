// Reference Cloudflare Pages Function backing the reader-comments feature.
//
// WHY this lives here and not in the Nuxt app: the consumer sites deploy as
// static `nuxt generate` output, which has no server runtime — a Nitro
// `server/api` route would never be deployed. Cloudflare Pages Functions are a
// separate mechanism: a `functions/` directory at the CONSUMER repo root that
// CF compiles into edge handlers serving alongside the static assets.
//
// This module ships in the published layer package. A consumer wires it up by
// adding one file to their own repo root and binding KV:
//
//   // <consumer>/functions/api/comments.ts
//   export { onRequestGet, onRequestPost, onRequestDelete } from 'andy-note-nuxt/server-functions/comments'
//
//   // CF Pages dashboard → Settings → Functions → KV namespace bindings:
//   //   COMMENTS                 → <your KV namespace>
//   // CF Pages → Settings → Environment variables (encrypt this):
//   //   COMMENTS_RESOLVE_SECRET  → a long random string (authorizes resolve)
//
// POST is intentionally open (readers need no account). Abuse is bounded here
// by a per-IP rate limit (fails closed) and a per-article comment cap. For
// stronger protection, gate `/api/*` at the Cloudflare dashboard with WAF rules
// or a Turnstile challenge — a deployment concern, so it needs no app code.
//
// Then set `runtimeConfig.public.site.comments.enabled = true` in their
// nuxt.config and visit any article with `?ec_author=<COMMENTS_RESOLVE_SECRET>`
// once to enter author mode in that browser.
//
// Storage model: one KV entry per comment, key `c:<path>:<id>`. "List open for
// an article" is a prefix scan; "resolve" is a delete. No read-modify-write of
// a shared blob, so concurrent posts never clobber each other.

interface KVListKey {
  name: string
}
interface KVListResult {
  keys: KVListKey[]
  list_complete: boolean
  cursor?: string
}
interface KVLike {
  get(key: string, type?: 'text'): Promise<string | null>
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
  list(opts?: { prefix?: string; cursor?: string }): Promise<KVListResult>
}

interface Env {
  COMMENTS: KVLike
  COMMENTS_RESOLVE_SECRET?: string
}

interface PagesContext {
  request: Request
  env: Env
  // Cloudflare augments the connecting IP onto the request headers.
}

type Handler = (context: PagesContext) => Promise<Response>

interface CommentAnchor {
  quote: string
  prefix: string
  suffix: string
  start: number
  end: number
}
interface Comment {
  id: string
  path: string
  body: string
  anchor: CommentAnchor
  author?: string
  createdAt: number
}

// --- limits ----------------------------------------------------------------
const MAX_BODY = 4000
const MAX_QUOTE = 2000
const MAX_AFFIX = 200
const MAX_AUTHOR = 80
const MAX_PATH = 512
const RATE_MAX = 10 // POSTs allowed per IP per window
const RATE_WINDOW_S = 60
const MAX_PER_PATH = 200 // open comments retained per article — bounds KV growth

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

// Reject anything that isn't a clean content path. KV keys are derived from
// this, so we keep it to the same shape Nuxt Content paths take.
function isValidPath(p: unknown): p is string {
  return typeof p === 'string' && p.length > 0 && p.length <= MAX_PATH && /^\/[\w\-./]*$/.test(p)
}

function clampStr(v: unknown, max: number): string {
  return typeof v === 'string' ? v.slice(0, max) : ''
}

function sanitizeAnchor(raw: unknown): CommentAnchor | null {
  if (raw == null) return null
  if (typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  const quote = clampStr(a.quote, MAX_QUOTE)
  if (!quote) return null
  const start = Number(a.start)
  const end = Number(a.end)
  return {
    quote,
    prefix: clampStr(a.prefix, MAX_AFFIX),
    suffix: clampStr(a.suffix, MAX_AFFIX),
    start: Number.isFinite(start) && start >= 0 ? Math.floor(start) : 0,
    end: Number.isFinite(end) && end >= 0 ? Math.floor(end) : 0,
  }
}

function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown'
}

// Soft per-IP rate limit. KV's min TTL is 60s, which matches our window. The
// read-then-write is racy under burst, but this is a spam speed-bump for a
// personal knowledge base, not a hard quota — pair it with account-level WAF
// for serious protection.
async function overRateLimit(env: Env, ip: string): Promise<boolean> {
  const key = `rl:${ip}`
  let count = 0
  try {
    const cur = await env.COMMENTS.get(key)
    count = cur ? parseInt(cur, 10) || 0 : 0
  }
  catch {
    // Fail CLOSED: a KV read failure must not wave the POST through ungated.
    return true
  }
  if (count >= RATE_MAX) return true
  await env.COMMENTS.put(key, String(count + 1), { expirationTtl: RATE_WINDOW_S })
  return false
}

// Count open comments for a path (prefix scan, keys only). Used to cap per-
// article growth. Fails closed (treats the path as saturated) on a list error.
async function countForPath(env: Env, path: string): Promise<number> {
  const prefix = `c:${path}:`
  let count = 0
  let cursor: string | undefined
  try {
    do {
      const page = await env.COMMENTS.list({ prefix, cursor })
      count += page.keys.length
      cursor = page.list_complete ? undefined : page.cursor
    } while (cursor)
  }
  catch {
    return MAX_PER_PATH
  }
  return count
}

export const onRequestGet: Handler = async ({ request, env }) => {
  const url = new URL(request.url)
  const path = url.searchParams.get('path')
  if (!isValidPath(path)) return json({ comments: [] })

  const prefix = `c:${path}:`
  const comments: Comment[] = []
  let cursor: string | undefined
  // Paginate the prefix scan so an article with many open comments is fully
  // returned (KV list caps at 1000 keys per page).
  do {
    const page = await env.COMMENTS.list({ prefix, cursor })
    // Fetch the page's values in parallel — avoid an N+1 of serial awaits.
    const raws = await Promise.all(page.keys.map(k => env.COMMENTS.get(k.name)))
    for (const raw of raws) {
      if (!raw) continue
      try {
        const c = JSON.parse(raw) as Comment
        // Every served comment anchors to a selection. Skip anything without a
        // valid anchor so the client can render `anchor.quote` unconditionally.
        if (c.anchor?.quote) comments.push(c)
      }
      catch {
        // skip a corrupt entry rather than failing the whole list
      }
    }
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)

  comments.sort((a, b) => a.createdAt - b.createdAt)
  return json({ comments })
}

export const onRequestPost: Handler = async ({ request, env }) => {
  let payload: Record<string, unknown>
  try {
    payload = (await request.json()) as Record<string, unknown>
  }
  catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const path = payload.path
  if (!isValidPath(path)) return json({ error: 'Invalid path' }, 400)

  const body = clampStr(payload.body, MAX_BODY).trim()
  if (!body) return json({ error: 'Empty comment' }, 400)

  // Every comment must anchor to a selected span of the article.
  const anchor = sanitizeAnchor(payload.anchor)
  if (!anchor) return json({ error: 'Comment must anchor to a selection' }, 400)

  const ip = clientIp(request)

  if (await overRateLimit(env, ip)) {
    return json({ error: 'Too many comments, slow down' }, 429)
  }

  // Bound per-article growth. Open comments are never auto-expired (the author
  // resolves them), so a hard per-path cap — not a TTL — is what keeps a single
  // hot article's KV from growing without limit.
  if (await countForPath(env, path) >= MAX_PER_PATH) {
    return json({ error: 'Comment limit reached for this page' }, 429)
  }

  const comment: Comment = {
    id: crypto.randomUUID(),
    path,
    body,
    anchor,
    author: clampStr(payload.author, MAX_AUTHOR).trim() || undefined,
    createdAt: Date.now(),
  }

  await env.COMMENTS.put(`c:${path}:${comment.id}`, JSON.stringify(comment))
  return json(comment, 201)
}

export const onRequestDelete: Handler = async ({ request, env }) => {
  // Resolve == delete. Author-only: requires the bearer secret.
  const secret = env.COMMENTS_RESOLVE_SECRET
  const auth = request.headers.get('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!secret || token !== secret) return json({ error: 'Unauthorized' }, 401)

  const url = new URL(request.url)
  const path = url.searchParams.get('path')
  const id = url.searchParams.get('id')
  if (!isValidPath(path) || !id) return json({ error: 'Invalid request' }, 400)

  await env.COMMENTS.delete(`c:${path}:${id}`)
  return new Response(null, { status: 204 })
}
