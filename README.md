# andy-note-nuxt

Brutalist-terminal **Nuxt 4 + Nuxt Content v3 theme** packaged as a [Nuxt Layer](https://nuxt.com/docs/getting-started/layers). Stacked-column navigation (click a note → new column pushes from the right), warm-dark palette with lime accent + flat 4px stamp shadows. Designed for personal notes, guides, and second-brain knowledge bases.

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

Edit `app/app.config.ts` for branding/menu, `nuxt.config.ts` for `<title>`, and start writing in `content/`.

## What's included

| Path | Purpose |
|---|---|
| `app/components/StackedColumns.vue` | Stacked-column shell — drives the whole UX |
| `app/components/ContentView.vue` | Per-column renderer (handles index pages, listings, single docs) |
| `app/components/LocalStorageChecklist.vue` | Persistent checklist embeddable in any markdown |
| `app/composables/useStack.ts` | Stack state machine (push/pop columns, URL sync) |
| `app/assets/css/main.css` | Brutalist terminal theme — Tailwind v3 base + custom prose layers |
| `tailwind.config.js` | Color palette + stamp shadow tokens |
| `content/index.md` | Default landing page |
| `content/license.md` | Default license page (override in your child project) |

**Not included** — the layer intentionally does NOT ship a `content.config.ts`. Schemas are project-specific, and Nuxt Content v3.13+ requires the consumer to install `zod` + `zod-to-json-schema` themselves. Your child project owns the schema. A minimal starter looks like:

```ts
// content.config.ts in YOUR project
import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: '**/*.md',
      schema: z.object({
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        created: z.string().optional(),
        updated: z.string().optional(),
        // ...add fields as your notes evolve
      }),
    }),
  },
})
```

## Override anything

Nuxt Layers deep-merge child over parent. Override semantics:

- **Components / pages / layouts / composables** → create a file with the same path in your project (e.g. `app/components/ContentView.vue`) and it replaces the layer's.
- **`nuxt.config.ts`** → deep-merged. Your `app.head` keys override the layer's.
- **`app/app.config.ts`** → deep-merged. Override `site.*` and `menu[]`.
- **`tailwind.config.js`** → NOT auto-merged by Nuxt. If you need a different palette, copy the file into your project; Tailwind picks up your project's config.
- **Content** → child `content/<path>.md` overrides parent's same-path file (e.g. `content/license.md` in your project replaces the layer's default license page).

## Schema

`content.config.ts` ships a permissive schema — every field is optional. Common fields available out of the box:

- Universal: `title`, `description`, `tags[]`, `status`, `created`, `updated`, `author`, `weight`
- Game / domain tagging: `game`, `league`, `patch` (renders as badges in headers)
- Build / recipe: `class`, `ascendancy`, `budget_tier`, `build_tags{}`, `ratings{}`, `pob_link`
- Economy: `strategy_tier`, `profit_per_hour`, `investment_tier`
- Skill / technique: `gem_color`, `skill_type`, `level_requirement`, `skill_tags[]`
- Instance / character: `level`, `progress_stage`
- Item / class / league: `rarity`, `item_class`, `class_type`, `complexity`, `league_type`

Unused fields cost nothing (null in cache). To replace the schema entirely, override `content.config.ts` in your child project.

## Conventions baked in

- **Stacked-column navigation** — clicking an internal link pushes a new column. Use `[Link](/path)` syntax in markdown; the renderer intercepts and stacks instead of routing away.
- **`updated` / `created` recency sort** — section listings rank by most recently updated descendant first.
- **Section auto-grouping** — any subfolder of `content/` becomes a section automatically; no manual registration.
- **`document_type: convention`** — pages with this frontmatter are excluded from listings (use for template/scaffolding docs).

## Tech stack

Nuxt 4 · Nuxt Content v3 (SQLite cache via better-sqlite3) · TailwindCSS v3 · Vue 3.5 · Self-hosted fonts (Space Grotesk + Literata via `@fontsource`)

## License

[MIT](./LICENSE). See [`/license` page](./content/license.md) for usage notes around theme code vs. user content licensing.
