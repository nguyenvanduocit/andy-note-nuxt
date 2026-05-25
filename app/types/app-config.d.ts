export {}

// PublicRuntimeConfig augmentation. Child layers re-declare this interface
// to add their own fields under `runtimeConfig.public.site.*` — TypeScript
// merges declarations across `nuxt/schema`.
//
// Note: this file used to augment `AppConfig` (back when the layer shipped
// `app/app.config.ts`). Nuxt 5 / Nitro 3 removes `app.config.ts`, so site
// config now lives on `runtimeConfig.public.site` and is read via
// `useRuntimeConfig().public.site`. The file name is kept for git history
// continuity; the augmented interface is what changed.
declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    site: {
      title: string
      description: string
      tagline: string
      author: string
      themeColor: string
      logo: string
      // Free-form extras child projects can attach without re-declaring the interface.
      [key: string]: unknown
    }
  }
}
