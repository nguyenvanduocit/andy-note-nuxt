---
title: "Quick Start"
description: "Install, run the dev server, and publish your first page in under 5 minutes."
tags: ["setup", "getting-started"]
created: 2026-05-20
updated: 2026-05-25
---

# Quick Start

The shortest path from zero → a working stacked-column site. Every step has a copy-paste command — no need to detour through the reference docs.

## 1. Create a child project

`andy-note-nuxt` is a **Nuxt 4 theme layer**. You don't clone it directly — you create a fresh project and extend the layer:

```bash
bunx nuxi init my-notes
cd my-notes
bun add github:nguyenvanduocit/andy-note-nuxt
```

Open the child project's `nuxt.config.ts` and add:

```ts
export default defineNuxtConfig({
  extends: ['github:nguyenvanduocit/andy-note-nuxt'],
})
```

## 2. Write your first note

Create `content/hello.md`:

```markdown
---
title: "Hello"
description: "My first note."
---

# Hello

This is the first note. Click any internal link below and watch it push a
new column to the right:

- [Quick Start](/quick-start)
- [Getting Started](/guides/getting-started)
```

## 3. Run dev

```bash
bun dev
```

Open `http://localhost:3000` — you'll see a section listing of every markdown file you just created, rendered in the brutalist-terminal style.

## 4. Ship to hosting

The theme generates static HTML, so it deploys anywhere:

```bash
bun generate
# Output lives in .output/public/
```

Drop that folder onto Cloudflare Pages / Netlify / Vercel / GitHub Pages — done.
