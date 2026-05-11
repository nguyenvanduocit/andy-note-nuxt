export {}

// AppConfig augmentation. Child layers can re-declare this interface to add
// their own fields — TypeScript merges declarations across `nuxt/schema`.
declare module 'nuxt/schema' {
  interface AppConfig {
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
    menu: Array<{ name: string; url: string; weight: number }>
  }
}
