// https://nuxt.com/docs/api/configuration/nuxt-config
//
// Base Nuxt config for `andy-note-nuxt` theme. Consumers extend this layer
// via `extends: ['github:nguyenvanduocit/andy-note-nuxt']` (or local path /
// npm package) and override `app.head`, `appConfig.site`, `appConfig.menu`
// in their child project. All values here are sensible defaults.

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    'vite-plugin-ai-annotator/nuxt',
    '@nuxt/content',
    '@nuxtjs/tailwindcss',
  ],

  // Browser-feedback overlay — disable in child by setting `aiAnnotator: false`.
  aiAnnotator: {
    port: 7318,
    autoSetupMcp: true,
    verbose: false,
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    viewer: false,
  },

  css: ['~/assets/css/main.css'],

  content: {
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
        { name: 'theme-color', content: '#d4ff00' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/images/favicon.png' },
      ],
    },
  },
})
