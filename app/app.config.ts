// Site-wide config consumed by components via `useAppConfig()`.
// Override every field in your child project by creating your own `app/app.config.ts`
// — Nuxt deep-merges child over parent layer.
//
// Note: this layer's UX is a single stacked-column shell — there is no fixed
// nav header rendering a menu. If your child project wants top-level nav,
// override `StackedColumns.vue` (or add a layout wrapper) and read your own
// menu structure from this config.

export default defineAppConfig({
  site: {
    title: 'Andy Notes',
    description: 'Stacked-column knowledge base — extend, override, publish.',
    tagline: 'A second-brain theme for Nuxt Content',
    author: 'andy-note-nuxt',
    themeColor: '#ff7b6b',
    logo: '/logo.svg',
  },
})
