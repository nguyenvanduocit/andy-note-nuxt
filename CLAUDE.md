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

## Brutalist-terminal aesthetic (brand surface)

Do not drift from these without explicit instruction:

- **Stamp shadow** — flat offset, no blur. `4px 4px 0px` (`shadow-stamp`), `2px 2px 0px` (`-sm`), `6px 6px 0px` (`-lg`). Accent uses coral `#ff7b6b` (`shadow-stamp-accent`).
- **Palette** — coral accent `#ff7b6b`; warm-dark surfaces (`#2a2a28`, `#2e2f2c`, `#3b3c39`); warm off-white text `#d5cfc5`. Full tokens in `tailwind.config.js`.
- **Typography** — Space Grotesk (display), Literata (prose). Self-hosted via `@fontsource/*` (static weights, imported in `app/assets/css/main.css`) — do not introduce Google Fonts imports.
- No rounded corners beyond what's already used, no soft shadows, no gradients.

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
