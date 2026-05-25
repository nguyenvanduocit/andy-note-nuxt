// https://nuxt.com/docs/api/configuration/nuxt-config
//
// Base Nuxt config for `andy-note-nuxt` theme. Consumers extend this layer
// via `extends: ['github:nguyenvanduocit/andy-note-nuxt']` (or local path /
// npm package) and override `app.head` and `appConfig.site` in their child
// project. All values here are sensible defaults.

import { createResolver } from '@nuxt/kit'

// Resolve paths relative to THIS layer's directory, not the consumer's root.
// `~/` aliases resolve to the consumer's `srcDir` at runtime, which would
// (incorrectly) look for theme assets inside the child project. Absolute
// paths produced here always point back to the layer.
const { resolve } = createResolver(import.meta.url)

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    'vite-plugin-ai-annotator/nuxt',
    '@nuxt/content',
    '@nuxtjs/tailwindcss',
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

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'Andy Notes — Stacked-Column Knowledge Base',
      meta: [
        { name: 'description', content: 'A brutalist-terminal Nuxt Content theme for personal notes, guides, and second-brain knowledge bases.' },
        { name: 'theme-color', content: '#ff7b6b' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },
})
