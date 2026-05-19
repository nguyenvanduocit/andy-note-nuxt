# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A **Nuxt 4 theme layer** consumed by other projects via `extends: ['github:nguyenvanduocit/andy-note-nuxt']`. Not a standalone app — every file under `app/`, `content/`, `nuxt.config.ts`, `tailwind.config.js`, `app/assets/css/main.css`, and `app/app.config.ts` ships to downstream consumers.

## Commands

- `bun dev` / `bun build` / `bun generate` / `bun preview`
- `bun lint` — oxlint over `app/` (95 rules, no config file by design). Note: oxlint's `.vue` support extracts script blocks only; templates are not analyzed.
- Package manager is bun (`bun.lock`, `.npmrc: shamefully-hoist=true`). Do not introduce npm/pnpm/yarn.
- No test framework, no formatter. Type check before claiming done: `bunx vue-tsc --noEmit`.

## Layer / consumer contract (CRITICAL)

The layer ships **wiring**, the consumer ships **domain**:

- **Layer owns**: modules wired in `nuxt.config.ts`, components, composables, default theme, neutral content (`content/index.md`, `content/license.md`).
- **Consumer owns**: `content.config.ts` (their own schema), their `app.config.ts` overrides, their own markdown content, any domain-specific fields.

**Never** add domain-specific fields, sample data, schemas, or examples to the layer. `.optional()` does not sanitize a leaked domain — field names like `pob_link`, `gem_color`, `recipe_yield` advertise a domain even when optional. Same rule applies to CSS variable defaults, sample markdown, README examples, and config presets.

## Brutalist-terminal aesthetic (brand surface)

Do not drift from these without explicit instruction:

- **Stamp shadow** — flat offset, no blur. `4px 4px 0px` (`shadow-stamp`), `2px 2px 0px` (`-sm`), `6px 6px 0px` (`-lg`). Accent uses lime `#d4ff00` (`shadow-stamp-accent`).
- **Palette** — lime accent `#d4ff00`; warm-dark surfaces (`#2a2a28`, `#2e2f2c`, `#3b3c39`); warm off-white text `#d5cfc5`. Full tokens in `tailwind.config.js`.
- **Typography** — Space Grotesk (display), Literata (prose). Self-hosted via `@fontsource-variable/*` — do not introduce Google Fonts imports.
- No rounded corners beyond what's already used, no soft shadows, no gradients.

## Code style

- Vue components use `<script setup lang="ts">` + Composition API.
- SSR-safe browser access: gate with `import.meta.client`, not `onMounted` (see `app/composables/useStack.ts`).
- `tailwind.config.js` is `.js` (not `.ts`) — `@nuxtjs/tailwindcss` hardcodes the `.js` lookup in its postcss build.
- Resolve layer-internal paths via `createResolver(import.meta.url)` in `nuxt.config.ts` so paths stay correct from a consumer's resolution scope. See existing `cssPath` / `app.config` wiring before adding new file references.

## Stack state machine

`app/composables/useStack.ts` is the UX core. Changing column width (`--column-width: 640px`), peek size (`--stack-peek: 48px`), or transition timing requires coordinated edits to the scroll geometry in the same file. Inline comments derive the math — read them before tweaking constants.

## Commit conventions

- Imperative mood, sentence-case subject; one concern per commit (atomic).
- No type prefixes (no `feat:` / `fix:`). Em-dash `—` is OK in subjects.
- Include `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` when Claude contributed.
- Check `git log --oneline -10` before writing the message — match the existing style.
