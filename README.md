# andy-note-nuxt

Brutalist-terminal **Nuxt 4 + Nuxt Content v3 theme** packaged as a [Nuxt Layer](https://nuxt.com/docs/getting-started/layers). Stacked-column navigation (click a note → new column pushes from the right), warm-dark palette with coral accent + flat 4px stamp shadows. Designed for personal notes, guides, and second-brain knowledge bases.

## Quick start — use as a layer

Create a fresh Nuxt project (or use any existing one), then add `extends`:

```ts
// nuxt.config.ts in YOUR project
export default defineNuxtConfig({
  extends: ['github:nguyenvanduocit/andy-note-nuxt'],
  app: {
    head: { title: 'My Notes' }
  }
})
```

Install minimal deps (the rest come from the layer's `package.json`):

```sh
bun add nuxt @nuxt/content @nuxtjs/tailwindcss vue vue-router
bun add -D tailwindcss
```

Write your first note:

```sh
mkdir -p content/projects
cat > content/projects/hello.md <<'EOF'
---
title: "Hello"
description: "My first note."
---
# Hello world
EOF

bun dev
```

That's it. Visit `localhost:3000` — the layer ships a landing page, a license page, and the stacked-column navigation engine. Your `content/projects/` folder auto-appears as a section group.

## Quick start — clone & customize

```sh
gh repo clone nguyenvanduocit/andy-note-nuxt my-notes
cd my-notes
bun install
bun dev
```

Edit `runtimeConfig.public.site` in `nuxt.config.ts` for branding (title, description, tagline, themeColor, logo), set `site` (`name`, plus your production `url`) for the built-in SEO stack, and start writing in `content/`. Per-page `<title>`, meta description, Open Graph, canonical, `sitemap.xml`, and `robots.txt` are generated automatically from each note's frontmatter — no per-project SEO wiring needed.

## What's included

| Path | Purpose |
|---|---|
| `app/app.vue` | Root entry — `<NuxtLayout><NuxtPage /></NuxtLayout>` |
| `app/types/app-config.d.ts` | TypeScript augmentation declaring `runtimeConfig.public.site` shape |
| `app/layouts/default.vue` | Full-height shell + `<Toaster>` host |
| `app/pages/[...slug].vue` | Single catch-all route — delegates to `<StackedColumns>` |
| `app/components/StackedColumns.vue` | Stacked-column shell — drives the whole UX |
| `app/components/StackedColumn.vue` | Single column wrapper (click → push, scroll-to-focus) |
| `app/components/ContentView.vue` | Per-column renderer (auto-switches listing vs article view) |
| `app/components/LocalStorageChecklist.vue` | MDC component — persistent checklist embeddable in any markdown |
| `app/composables/useStack.ts` | Stack state machine (push/pop columns, URL sync, scroll geometry) |
| `app/components/CommentLayer.vue` · `CommentLayerClient.vue` | Reader comments UI — opt-in (see [Reader comments](#reader-comments-optional)) |
| `app/composables/useComments.ts` | Reader comments data layer (Firestore + client-side Google auth) |
| `firestore.rules` | Reference Firestore security rules for the comments feature |
| `app/assets/css/main.css` | Brutalist terminal theme — Tailwind v3 base + custom prose layers |
| `nuxt.config.ts` | Module wiring (`@nuxt/content`, `@nuxtjs/tailwindcss`, `vue-sonner/nuxt`, `vite-plugin-ai-annotator`) |
| `tailwind.config.js` | Color palette + stamp shadow tokens |
| `content.config.ts` | Minimal generic schema (7 fields — see "Schema" below) |
| `content/index.md` | Default landing page |
| `content/license.md` | Default license page |
| `content/quick-start.md`, `content/guides/`, `content/reference/` | Theme's own docs (ship only when extending via `github:` — npm publishes only `content/index.md` + `content/license.md`). Override or delete in your child. |

## Override anything

Nuxt Layers deep-merge child over parent. Override semantics:

- **Components / pages / layouts / composables** → create a file with the same path in your project (e.g. `app/components/ContentView.vue`) and it replaces the layer's.
- **`nuxt.config.ts`** → deep-merged. Override `app.head` (for `<title>` / meta) and `runtimeConfig.public.site` (for branding: `title`, `description`, `tagline`, `author`, `themeColor`, `logo`). Layer ships defaults; your values win field-by-field. Add your own fields under `site.*` by augmenting the `PublicRuntimeConfig` interface (see `app/types/app-config.d.ts`).
- **`tailwind.config.js`** → merged by `@nuxtjs/tailwindcss` across layers. Ship a `tailwind.config.js` in your project with the same shape (`theme.extend.colors`, `theme.extend.boxShadow`, etc.) and it overrides the layer's tokens. The module discovers all layer configs automatically.
- **`content.config.ts`** → fully replaced by the consumer's file (Nuxt Content reads only one). The layer ships a minimal schema so the SQLite cache has the columns its renderer queries (`document_type`, `updated`, `created`). Your override must include those columns or extend them.
- **Content** → child `content/<path>.md` overrides parent's same-path file (e.g. `content/license.md` in your project replaces the layer's default license page).

## Schema

The layer ships a minimal, generic `content.config.ts` covering only the fields its renderer actually reads:

| Field | Type | Used by |
|---|---|---|
| `title` | `string` | Column header, listing item, `<title>` |
| `description` | `string` | `<meta>`, OG tags, section listings |
| `document_type` | `string` | `"convention"` hides the file from listings |
| `tags` | `string[]` | Tag pills under H1 |
| `created` | `string` (ISO date) | Listing sort, recency badge |
| `updated` | `string` (ISO date) | Listing sort (preferred over `created`) |
| `rawbody` | `string` | Auto-populated — backs "Copy as Markdown" with byte-faithful source |

Every field is `.optional()` — you can write a `.md` with no frontmatter at all. To add domain-specific fields (`priority`, `owner`, `due_date`, anything project-specific), **override `content.config.ts` in your child project**:

```ts
// content.config.ts in YOUR project — replaces the layer's schema entirely
import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: '**/*.md',
      schema: z.object({
        // Keep these — the renderer queries them
        title: z.string().optional(),
        description: z.string().optional(),
        document_type: z.string().optional(),
        tags: z.array(z.string()).optional(),
        created: z.string().optional(),
        updated: z.string().optional(),
        rawbody: z.string().optional(),
        // Add your own
        priority: z.enum(['low', 'medium', 'high']).optional(),
        owner: z.string().optional(),
      }),
    }),
  },
})
```

Unused fields cost nothing (null in cache).

## Conventions baked in

- **Stacked-column navigation** — clicking an internal link pushes a new column. Use `[Link](/path)` syntax in markdown; the renderer intercepts and stacks instead of routing away.
- **`updated` / `created` recency sort** — section listings rank by most recently updated descendant first.
- **Section auto-grouping** — any subfolder of `content/` becomes a section automatically; no manual registration.
- **`document_type: convention`** — pages with this frontmatter are excluded from listings (use for template/scaffolding docs).

## Reader comments (optional)

Code-review-style commenting: a reader selects any prose and comments on that span; the site owner resolves it and it clears for everyone. **Off by default.** Reading is public; **posting requires Google sign-in** and the author name comes from the verified account — there are no anonymous or whole-page comments.

Everything runs on **Firebase** — Google sign-in (Firebase Auth) + Firestore for storage — integrated through [VueFire](https://vuefire.vuejs.org/). A static `nuxt generate` site talks to Firestore directly from the browser, so there's no backend of your own to host: **Firestore security rules** are the access boundary.

### 1. Add the deps to your project

```sh
bun add firebase vuefire nuxt-vuefire
```

### 2. Create + configure a Firebase project

In the [Firebase console](https://console.firebase.google.com):

1. **Create a project** (or reuse one).
2. **Register a Web app** (Project settings → *Your apps* → Web) and copy the `firebaseConfig` object it shows.
3. **Authentication → Sign-in method** → enable **Google** and set a support email.
4. **Authentication → Settings → Authorized domains** → add your production domain (e.g. `notes.example.com`). `localhost` is already listed for local dev.
5. **Firestore Database → Create database** → pick a region near your readers (permanent), "production mode" is fine — you deploy rules in the next step.
6. **Deploy the security rules**: copy [`firestore.rules`](./firestore.rules) from this layer into your repo, replace the email in `isOwner()` with yours, and publish it (Firestore → *Rules* tab, or `firebase deploy --only firestore:rules`).

### 3. Wire it in your `nuxt.config.ts`

```ts
export default defineNuxtConfig({
  extends: ['github:nguyenvanduocit/andy-note-nuxt'],
  modules: ['nuxt-vuefire'],
  vuefire: {
    // No `auth` block — see "Static-site note" below.
    config: {
      apiKey: 'AIza…',
      authDomain: 'your-project.firebaseapp.com',
      projectId: 'your-project',
      appId: '1:…:web:…',
      // storageBucket / messagingSenderId are optional
    },
  },
  runtimeConfig: {
    public: {
      site: {
        comments: {
          enabled: true,
          owners: ['you@example.com'], // who may Resolve — mirror in firestore.rules
        },
      },
    },
  },
})
```

That's it — select text in any article and a "Comment" bubble appears. The `firebaseConfig` values are **public by design** (they ship in the client bundle and only identify the project); access is enforced by the rules + Authorized domains, not by keeping them secret. Don't commit a service-account / admin private key — none is needed.

### How access control works

The deployed `firestore.rules` are the authority (not app code):

- **read** — public (comments are public discussion).
- **create** — signed-in only, and the doc must be a well-formed, selection-anchored comment whose `authorUid` matches the caller and whose `createdAt` is the server time (no spoofed identity, no backdating).
- **update** — denied (comments are immutable).
- **delete (resolve)** — only the owner email allowlist.

`owners` lives in **both** the rules (server, authoritative) and your `runtimeConfig` (client, to show/hide the Resolve button — so that email ends up in your public bundle). Sign in with an owner account and a **Resolve** button appears on each comment; resolving deletes it for everyone, live.

### Static-site note (important)

Do **not** set `vuefire.auth.enabled`. On a static `nuxt generate` build, nuxt-vuefire's auth module registers a *server-side* plugin that imports `firebase-admin` — which a static host has no server to run, so the SSR/prerender build fails (`"getAuth" is not exported by firebase-admin/auth`). This theme drives Google sign-in with the client `firebase/auth` SDK instead; VueFire only provides the Firebase app + Firestore (`useFirestore` / `useCollection`).

### Local testing

`localhost` is an Authorized domain by default, so `bun dev` + sign-in talks to your real Firestore from your machine. Comments you post there are real — resolve them (or clear the `comments` collection) when you're done.

## Tech stack

Nuxt 4 · Nuxt Content v3 (SQLite cache via better-sqlite3) · TailwindCSS v3 · Vue 3.5 · Self-hosted fonts (Space Grotesk + Literata via `@fontsource`) · *optional* Firebase (Auth + Firestore) via VueFire for [reader comments](#reader-comments-optional)

## License

[MIT](./LICENSE). See [`/license` page](./content/license.md) for usage notes around theme code vs. user content licensing.
