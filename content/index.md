---
title: "Andy Notes"
description: "Brutalist-terminal Nuxt Content theme — stacked-column navigation for personal notes and second-brain knowledge bases."
created: 2026-05-11
updated: 2026-05-25
---

# Andy Notes

This is the **default landing page** you get right after cloning (or extending) the `andy-note-nuxt` layer. The layout is **stacked-column navigation** — every click on an internal link pushes a new column to the right instead of routing away, so you keep every ancestor in view and read related notes inside a single flow.

## Getting started

1. Write your first note by dropping any markdown file into `content/`. For example `content/notes/my-first-note.md`.
2. Frontmatter only needs `title` + `description`. Every other field is optional — see `content.config.ts` for the full list.
3. Any subfolder of `content/` becomes a section group on the landing page automatically. For example `content/projects/` shows up as a `projects` section.

## Customize

- **Branding**: edit `runtimeConfig.public.site` in `nuxt.config.ts` to change `site.title`, `site.description`, `site.tagline`, `site.themeColor`, and `site.logo`. Nuxt deep-merges your values over the layer's defaults.
- **`<title>` and meta**: edit `app.head` in the same `nuxt.config.ts`.
- **Palette**: terminal tokens live in `tailwind.config.js`. Key tokens: `terminal.accent` (#ff7b6b — coral), `terminal.bg` (#2a2a28 — warm dark).
- **Components**: every file under `app/components/` can be overridden by dropping a same-path file in your child project.

See [License](/license) for usage terms (theme code vs. user content).
