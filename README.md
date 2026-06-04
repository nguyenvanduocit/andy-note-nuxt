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

## Tech stack

Nuxt 4 · Nuxt Content v3 (SQLite cache via better-sqlite3) · TailwindCSS v3 · Vue 3.5 · Self-hosted fonts (Space Grotesk + Literata via `@fontsource`)

## License

[MIT](./LICENSE). See [`/license` page](./content/license.md) for usage notes around theme code vs. user content licensing.
