import { computed, ref, type ComputedRef, type Ref } from 'vue'
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
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import { useCollection, useFirebaseApp, useFirestore } from 'vuefire'

// Reader comments — data layer (the "functional core").
//
// Storage + identity are both on Firebase: Google sign-in (Firebase Auth) gates
// posting, and comments live in a Firestore `comments` collection. The composable
// owns only the *data* concern — auth state, the live query, and create/delete.
// All DOM / selection / highlight work lives in CommentLayerClient.vue.
//
// VueFire (`nuxt-vuefire`, wired by the consumer) initializes the Firebase app
// and provides Firestore through `useFirestore` / `useCollection` (the reactive,
// real-time query). Auth, by contrast, is driven directly through the
// `firebase/auth` SDK on the client — deliberately NOT through VueFire's auth
// module, which on an SSR/SSG build pulls in `firebase-admin` for server-side
// session verification a static site has no server to run. Since the only caller
// is a client-only, `enabled`-gated component, `getAuth` / `onAuthStateChanged`
// run on the client where the app is initialized. Access control is enforced by
// Firestore security rules (see the reference `firestore.rules`); the client
// mirrors the owner allowlist only to decide whether to show Resolve.

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

// One auth-state subscription shared across every CommentLayer instance (the
// same article can mount in two stacked columns). `onAuthStateChanged` registers
// once; the ref it feeds is what all instances read.
let _user: Ref<User | null> | null = null
function sharedUser(auth: Auth): Ref<User | null> {
  if (!_user) {
    _user = ref<User | null>(null)
    onAuthStateChanged(auth, (u) => { _user!.value = u })
  }
  return _user
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
  const auth = getAuth(useFirebaseApp())
  const user = sharedUser(auth)

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
    await signInWithPopup(auth, new GoogleAuthProvider())
  }

  async function signOutUser(): Promise<void> {
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

  return { user, isOwner, comments, signIn, signOutUser, postComment, resolveComment }
}
