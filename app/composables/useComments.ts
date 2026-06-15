import { computed, type ComputedRef, type Ref } from 'vue'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  query,
  serverTimestamp,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { useCollection, useCurrentUser, useFirebaseAuth, useFirestore } from 'vuefire'

// Reader comments — data layer (the "functional core").
//
// Storage + identity are both on Firebase: Google sign-in (Firebase Auth) gates
// posting, and comments live in a Firestore `comments` collection. The composable
// owns only the *data* concern — auth state, the live query, and create/delete.
// All DOM / selection / highlight work lives in CommentLayerClient.vue.
//
// VueFire (`nuxt-vuefire`, wired by the consumer) provides the Firebase app via a
// Nuxt plugin; this composable consumes it through `useFirestore` / `useFirebaseAuth`
// / `useCurrentUser`. It is therefore only ever called from a client-only,
// `enabled`-gated component, so a consumer without VueFire (or with comments off)
// never reaches these calls. Access control is enforced server-side by Firestore
// security rules (see the reference `firestore.rules`); the client mirrors the
// owner allowlist purely to decide whether to show the Resolve button.

/** A text-quote + position anchor for a selection-scoped comment. */
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
  /** Firestore document id (attached by VueFire). */
  id: string
  /** Content path this comment belongs to, e.g. `/builds/foo`. */
  path: string
  body: string
  /** The selection this comment is anchored to. */
  anchor: CommentAnchor
  /** Display name from the verified Google token. */
  author: string
  /** Firebase uid of the author — stamped + enforced by security rules. */
  authorUid: string
  /** Server commit time; `null` for the brief window before the write lands. */
  createdAt: Timestamp | null
}

interface CommentsConfig {
  enabled: boolean
  owners: string[]
}

function toMillis(c: Comment): number {
  // A freshly-created doc shows `createdAt: null` locally until the serverTimestamp
  // resolves — treat it as "just now" so it sorts to the end, not the start.
  return c.createdAt ? c.createdAt.toMillis() : Date.now()
}

export function useComments(path: string) {
  const runtime = useRuntimeConfig()
  const raw = (runtime.public.site as { comments?: Partial<CommentsConfig> }).comments
  const owners = Array.isArray(raw?.owners) ? raw.owners.filter(o => typeof o === 'string') : []

  const db = useFirestore()
  const auth = useFirebaseAuth()
  const user = useCurrentUser()

  const isOwner: ComputedRef<boolean> = computed(() => {
    const email = user.value?.email
    return !!email && owners.includes(email)
  })

  // Live query for this article's open comments. VueFire keeps `source` reactive
  // and re-subscribes if it changes; a single `where` needs no composite index,
  // so we sort by time on the client instead of adding an `orderBy`.
  const source = computed(() => query(collection(db, 'comments'), where('path', '==', path)))
  const rows = useCollection<Comment>(source)
  const comments: ComputedRef<Comment[]> = computed(() =>
    [...rows.value].sort((a, b) => toMillis(a) - toMillis(b)),
  )

  async function signIn(): Promise<void> {
    if (!auth) return
    await signInWithPopup(auth, new GoogleAuthProvider())
  }

  async function signOutUser(): Promise<void> {
    if (!auth) return
    await signOut(auth)
  }

  async function postComment(body: string, anchor: CommentAnchor): Promise<void> {
    const u = user.value
    if (!u) throw new Error('Sign in to comment')
    await addDoc(collection(db, 'comments'), {
      path,
      body,
      anchor,
      author: u.displayName || u.email || 'Anonymous',
      authorUid: u.uid,
      createdAt: serverTimestamp(),
    })
  }

  async function resolveComment(id: string): Promise<void> {
    await deleteDoc(doc(db, 'comments', id))
  }

  return {
    user: user as Ref<typeof user.value>,
    isOwner,
    comments,
    signIn,
    signOutUser,
    postComment,
    resolveComment,
  }
}
