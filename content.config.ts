// Default content schema shipped by the layer.
//
// Why this file exists in the LAYER even though CLAUDE.md says consumers own
// `content.config.ts`: the layer's `ContentView` component runs a children
// query that selects `document_type`, `updated`, and `created`. Without those
// columns in the SQLite schema, every page query would fail with
// `no such column`. So the layer ships a minimal generic schema covering only
// the fields its renderer actually reads. Consumers are still free — and
// encouraged — to override this file by shipping their own `content.config.ts`
// at their project root; Nuxt Layers gives the consumer's file priority and
// replaces this schema entirely.
//
// Keep the fields here generic. Anything domain-specific belongs in a
// consumer override, not in the layer.
import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: '**/*.md',
      schema: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        document_type: z.string().optional(),
        tags: z.array(z.string()).optional(),
        created: z.string().optional(),
        updated: z.string().optional(),
        // Opt into rawbody so the copy-as-markdown button gets byte-faithful
        // source instead of stringified minimark. See
        // https://content.nuxt.com/docs/integrations/llms.
        rawbody: z.string().optional(),
      }),
    }),
  },
})
