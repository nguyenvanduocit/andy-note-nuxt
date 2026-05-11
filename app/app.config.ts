// Site-wide config consumed by components via `useAppConfig()`.
// Override every field in your child project by creating your own `app/app.config.ts`
// — Nuxt deep-merges child over parent layer.

export default defineAppConfig({
  site: {
    title: 'Andy Notes',
    description: 'Stacked-column knowledge base — extend, override, publish.',
    tagline: 'A second-brain theme for Nuxt Content',
    author: 'andy-note-nuxt',
    themeColor: '#d4ff00',
    logo: '/logo.png',
  },
  // Top-level navigation. Empty by default — child projects populate with
  // their own categories. Each entry maps to a `content/<slug>/` folder
  // (or any static route under `pages/`).
  menu: [
    { name: 'License', url: '/license', weight: 99 },
  ],
})
