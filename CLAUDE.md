# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A **Nuxt 4 theme layer** consumed by other projects via `extends: ['github:nguyenvanduocit/andy-note-nuxt']`. Not a standalone app — every file under `app/`, `content/`, `nuxt.config.ts`, `tailwind.config.js`, and `app/assets/css/main.css` ships to downstream consumers. Site-wide config defaults live on `runtimeConfig.public.site` (consumers override in their own `nuxt.config.ts`) — `app.config.ts` is intentionally absent because Nuxt 5 / Nitro 3 removes that API.

## Commands

- `bun dev` / `bun build` / `bun generate` / `bun preview`
- `bun lint` — oxlint over `app/` (95 rules, no config file by design). Note: oxlint's `.vue` support extracts script blocks only; templates are not analyzed.
- Package manager is bun (`bun.lock`, `.npmrc: shamefully-hoist=true`). Do not introduce npm/pnpm/yarn.
- No test framework, no formatter. Type check before claiming done: `bunx vue-tsc --noEmit`.

## Layer / consumer contract (CRITICAL)

The layer ships **wiring**, the consumer ships **domain**:

- **Layer owns**: modules wired in `nuxt.config.ts`, components, composables, default theme, neutral content (`content/index.md`, `content/license.md`).
- **Consumer owns**: `content.config.ts` (their own schema), their `runtimeConfig.public.site` overrides (in their `nuxt.config.ts`), their own markdown content, any domain-specific fields.

**Never** add domain-specific fields, sample data, schemas, or examples to the layer. `.optional()` does not sanitize a leaked domain — field names like `pob_link`, `gem_color`, `recipe_yield` advertise a domain even when optional. Same rule applies to CSS variable defaults, sample markdown, README examples, and config presets.

## SEO (layer-provided)

SEO is **layer wiring** — consumers inherit a complete stack and never re-implement it. `@nuxtjs/seo` (sitemap, robots, og-image, schema-org, seo-utils, site-config) is wired in `nuxt.config.ts`; `ContentView.vue` and `TagListing.vue` emit per-page `useSeoMeta` from content frontmatter.

- **Title** — `ContentView` always feeds seo-utils a raw `displayTitle` (body H1 → frontmatter `title` → slug), never the bare `page.title`. seo-utils applies its default `%s | %siteName` template, appending the site name exactly once. Do **not** reintroduce a static `app.head.title`: on a listing route with no page title it flows back through that template and renders a doubled `Site — X · Site`.
- **Canonical / hreflang** — owned by seo-utils, which defers to `@nuxtjs/i18n` when a consumer adds locales. The layer emits **no** canonical of its own, so there is never a duplicate. Verified: poe2 (an i18n consumer, built against this layer) renders exactly one canonical on both `/` and `/en`.
- **`site.url` is the consumer's to supply** — a production origin is domain data, not layer wiring, so it is intentionally unset here. Until a consumer sets it (or `NUXT_SITE_URL`), sitemap / robots / canonical URLs resolve to `localhost` and the modules log a dev-only warning — harmless for the layer's own standalone build.
- **og-image generation is off** (`ogImage.enabled: false`) — it needs a renderer + fonts + a per-deploy PNG check. A static og:image (consumer `app.head`, or a page frontmatter `image` / `ogImage` field read defensively by `ContentView`) works regardless; consumers opt in to generated cards.
- The layer ships **no brand image and no `site.url`** — same contract as everything else: layer = machinery, consumer = domain.

## Brutalist-terminal aesthetic (brand surface)

Do not drift from these without explicit instruction:

- **Stamp shadow** — flat offset, no blur. `4px 4px 0px` (`shadow-stamp`), `2px 2px 0px` (`-sm`), `6px 6px 0px` (`-lg`). Accent uses coral `#ff7b6b` (`shadow-stamp-accent`).
- **Palette** — coral accent `#ff7b6b`; warm-dark surfaces (`#2a2a28`, `#2e2f2c`, `#3b3c39`); warm off-white text `#d5cfc5`. Full tokens in `tailwind.config.js`.
- **Typography** — Space Grotesk (display), Literata (prose). Self-hosted via `@fontsource/*` (static weights, imported in `app/assets/css/main.css`) — do not introduce Google Fonts imports. See "Font import rule" + "Font-fallback metric overrides" below for two load-bearing constraints.
- No rounded corners beyond what's already used, no soft shadows, no gradients.

### Font import rule

Import the full per-weight files (`@fontsource/<family>/<weight>.css`) — **never** the narrow `latin-<weight>.css` variants. The narrow entry omits the `@font-face` declarations for `latin-ext` / `vietnamese` / `cyrillic` / `greek` subsets, so any non-latin glyph (Vietnamese diacritics, em-dash variants, ligature codepoints) silently falls back to the system font. v0.4.1 shipped the narrowed form and Vietnamese consumer sites rendered half their headlines in Arial — caught only after a CF Pages deploy, fixed in v0.4.2.

The full file still lets the browser fetch only the woff2 subsets actually needed on the page, because each `@font-face` carries its own `unicode-range`. The trade-off: ~5 KB of additional `@font-face` rules in critical CSS, paid once. Always pay it.

### Font-fallback metric overrides (CLS fix)

Two `@font-face` blocks in `main.css` re-publish system fonts as synthetic families with Capsize-computed metrics, so they render dimensionally identical to the real webfont during `font-display: swap`:

```
"Space Grotesk Fallback"  → local('Arial')             + ascent/descent/line-gap/size-adjust overrides
"Literata Fallback"       → local('Times New Roman')   + the same set
```

Tailwind `fontFamily.{display,prose}` slots the fallback between the real webfont and the system stack (`['Space Grotesk', 'Space Grotesk Fallback', '-apple-system', ...]`). Every raw `font-family:` declaration in `main.css` and `LocalStorageChecklist.vue` also includes the fallback explicitly — raw CSS bypasses Tailwind's stack.

Measured impact: root CLS 0.1215 → 0.0007 (font-swap shift eliminated). Per-page CLS lands at 0 on prose-heavy routes.

If you change webfonts (different family, different file), recompute the override values:

```sh
bun scripts/compute-font-fallback.mjs
```

Paste the printed `@font-face` blocks back into `main.css`. `@capsizecss/*` packages are devDep-only — no runtime cost.

## Code style

- Vue components use `<script setup lang="ts">` + Composition API.
- SSR-safe browser access: gate with `import.meta.client`, not `onMounted` (see `app/composables/useStack.ts`).
- `tailwind.config.js` is `.js` (not `.ts`) — `@nuxtjs/tailwindcss` hardcodes the `.js` lookup in its postcss build.
- Resolve layer-internal paths via `createResolver(import.meta.url)` in `nuxt.config.ts` so paths stay correct from a consumer's resolution scope. See existing `cssPath` wiring before adding new file references.

## Stack state machine

`app/composables/useStack.ts` is the UX core. Changing column width (`--column-width: 640px`), peek size (`--stack-peek: 48px`), or transition timing requires coordinated edits to the scroll geometry in the same file. Inline comments derive the math — read them before tweaking constants.

## Commit conventions

Conventional Commits drive `release-please` (see `.github/workflows/release.yml`). Format:

```
<type>(<optional-scope>): <subject>

<optional body>

<optional footer, e.g. BREAKING CHANGE: ...>
```

- **Version-bumping types** (in pre-1.0 with `bump-minor-pre-major: true`):
  - `feat:` → minor (0.2.0 → 0.3.0)
  - `fix:`, `perf:` → patch (0.2.0 → 0.2.1)
  - `feat!:` or `BREAKING CHANGE:` footer → minor while < 1.0, major once ≥ 1.0
- **Visible in CHANGELOG**: `feat`, `fix`, `perf`, `refactor`, `docs`, `revert`.
- **Hidden from CHANGELOG**: `chore`, `style`, `test`, `ci`, `build`.
- Subject in imperative mood, sentence-case after the colon, one concern per commit. Em-dash `—` is OK.
- Include `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` when Claude contributed.
- Check `git log --oneline -10` before writing — match existing scope names and tone.

## Releasing

Semi-automated — do not tag manually:

1. Push commits to `main` with conventional types (`feat:`, `fix:`, etc.).
2. `release.yml` runs the **release-please** job, which opens (or updates) a **Release PR** bumping `package.json` + `.release-please-manifest.json` and rewriting `CHANGELOG.md`.
3. Review the Release PR (sanity-check CHANGELOG + version bump). Click **Merge** when ready.
4. The merge commit re-triggers `release.yml`. release-please now sees a merged release PR → creates the `vX.Y.Z` tag + GitHub Release → `publish` job runs `npm publish --provenance` via npm OIDC Trusted Publisher (no token).

### Required repo configuration

- **Settings → Actions → General → Workflow permissions** → enable *"Read and write permissions"* + *"Allow GitHub Actions to create and approve pull requests"*.
- npm Trusted Publisher is bound to the workflow file path `.github/workflows/release.yml` for `nguyenvanduocit/andy-note-nuxt`. Renaming or moving that file breaks publishing — update the npm side first.
