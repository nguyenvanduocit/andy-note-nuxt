// https://nuxt.com/docs/api/configuration/nuxt-config
//
// Base Nuxt config for `andy-note-nuxt` theme. Consumers extend this layer
// via `extends: ['github:nguyenvanduocit/andy-note-nuxt']` (or local path /
// npm package) and override `app.head` and `runtimeConfig.public.site` in
// their child project. All values here are sensible defaults.
//
// Why runtimeConfig instead of app.config? Nuxt 5 / Nitro 3 removes the
// `app.config.ts` / `defineAppConfig` / `useAppConfig` surface. Layer site
// config now lives under `runtimeConfig.public.*`, which Nuxt deep-merges
// across layers identically. Components read via `useRuntimeConfig().public.site`.

import { createResolver } from '@nuxt/kit'

// Resolve paths relative to THIS layer's directory, not the consumer's root.
// `~/` aliases resolve to the consumer's `srcDir` at runtime, which would
// (incorrectly) look for theme assets inside the child project. Absolute
// paths produced here always point back to the layer.
const { resolve } = createResolver(import.meta.url)

// Single source for the layer's neutral brand defaults, reused by both config
// surfaces a consumer overrides: `runtimeConfig.public.site` (read by theme
// components) and the `@nuxtjs/seo` `site` block (read by sitemap / robots /
// og:site_name / the <title> template / JSON-LD). One const keeps the two
// from drifting apart.
const siteDefaults = {
  title: 'Andy Notes',
  description: 'Stacked-column knowledge base — extend, override, publish.',
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Opt-in to Nuxt 5 behavior available under Nuxt 4.2+. Flips: non-async
  // `callHook` return type, client-only HTML comment placeholders, and other
  // forward-compat defaults. The heavier Nitro v3 / Vite 8 changes ship with
  // Nuxt 5 itself — not previewable via this flag.
  future: {
    compatibilityVersion: 5,
  },

  modules: [
    'vite-plugin-ai-annotator/nuxt',
    '@nuxt/content',
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    // SEO baseline shared by every consumer. The umbrella pulls in sitemap,
    // robots, og-image, schema-org (JSON-LD), and seo-utils (canonical +
    // og/twitter inference + the <title> template). Shipping it here is the
    // whole point of this layer: a consumer inherits a complete SEO stack and
    // only supplies the one inherently per-site value, `site.url` (below).
    '@nuxtjs/seo',
    // Toast notifications. Auto-registers `<Toaster />` (client-only) and a
    // plugin exposing `$toast` / the imported `toast()` helper from `vue-sonner`.
    'vue-sonner/nuxt',
  ],

  // Browser-feedback overlay — disable in child by setting `aiAnnotator: false`.
  aiAnnotator: {
    port: 7318,
    verbose: false,
  },

  tailwindcss: {
    cssPath: resolve('./app/assets/css/main.css'),
    viewer: false,
  },

  css: [resolve('./app/assets/css/main.css')],

  content: {
    experimental: {
      sqliteConnector: 'native',
    },
    build: {
      markdown: {
        highlight: false,
      },
    },
  },

  // Tolerate prerender failures so a single broken markdown link in user content
  // does not abort the entire static build. Child projects can override this.
  nitro: {
    prerender: {
      failOnError: false,
    },
  },

  // Site-wide config (replaces former app/app.config.ts surface). Consumers
  // override any field via their own `runtimeConfig.public.site` in nuxt.config —
  // Nuxt deep-merges child layer values over parent. Free-form extra fields are
  // allowed via the index signature in `app/types/app-config.d.ts`.
  runtimeConfig: {
    public: {
      site: {
        title: siteDefaults.title,
        description: siteDefaults.description,
        tagline: 'A second-brain theme for Nuxt Content',
        author: 'andy-note-nuxt',
        themeColor: '#ff7b6b',
        logo: '/logo.svg',
      },
    },
  },

  // @nuxtjs/seo site config — the namespace its modules read (separate from
  // `runtimeConfig.public.site` above, which theme components read). Consumers
  // deep-merge their own values; `name`/`description` win field-by-field.
  site: {
    name: siteDefaults.title,
    description: siteDefaults.description,
    // `url` is intentionally unset. A production origin is consumer/domain
    // data, not layer wiring — the consumer supplies it via their own `site.url`
    // (or the NUXT_SITE_URL env). Until then sitemap/canonical URLs are relative
    // and the modules log a dev-only warning, harmless for the layer's own
    // standalone build.
  },

  // Public knowledge base → allow every crawler and advertise the sitemap.
  // Consumers can tighten this.
  robots: {
    sitemap: '/sitemap.xml',
  },

  // Generated per-route OG images are opt-in. nuxt-og-image needs a renderer
  // (satori/takumi) + fonts + a post-deploy check that PNGs actually render on
  // the target host, so it stays off to keep the layer build dependency-light
  // and deterministic. A static og:image (consumer `app.head` or page
  // frontmatter `image`/`ogImage`) still works with it disabled; consumers
  // enable + theme branded cards when they want them.
  ogImage: {
    enabled: false,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      // No static `title` / `description` here. Per-page values are emitted by
      // ContentView / TagListing via `useSeoMeta`, and seo-utils supplies the
      // `%s | %siteName` <title> template plus the `site.description` fallback.
      // A static title would itself flow through that template on listing routes
      // that set no page title and render a doubled "Site — X · Site".
      meta: [
        { name: 'theme-color', content: '#ff7b6b' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },
})
