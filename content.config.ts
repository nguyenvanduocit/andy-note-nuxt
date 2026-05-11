import { defineCollection, defineContentConfig, z } from '@nuxt/content'

// Permissive schema — every field is optional. Consumers either:
//   (a) keep this base schema and only use the fields they need, or
//   (b) override `content.config.ts` in the child project with their own
//       collections / field set.
//
// Domain-specific fields (build_tags, ratings, etc.) are intentionally left
// in the base schema so notes carrying those fields validate without forcing
// every consumer to re-declare them. Unused fields cost nothing — they stay
// null in the SQLite cache.

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: '**/*.md',
      schema: z.object({
        // Universal metadata
        document_type: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        author: z.string().optional(),
        created: z.string().optional(),
        updated: z.string().optional(),
        tags: z.array(z.string()).optional(),
        weight: z.number().optional(),

        // Game / domain tagging (badge rendering in ContentView)
        game: z.string().optional(),
        league: z.string().optional(),
        patch: z.string().optional(),

        // Build-style metadata — kept generic enough for tutorials, recipes, etc.
        class: z.string().optional(),
        ascendancy: z.string().optional(),
        budget_tier: z.string().optional(),
        build_tags: z.object({
          primary_skill: z.string().optional(),
          damage_type: z.string().optional(),
          playstyle: z.string().optional(),
          content_focus: z.string().optional(),
        }).optional(),
        ratings: z.object({
          clear_speed: z.number().optional(),
          boss_damage: z.number().optional(),
          survivability: z.number().optional(),
          mobility: z.number().optional(),
          league_start: z.number().optional(),
          budget_scaling: z.number().optional(),
        }).optional(),
        pob_link: z.string().optional(),
        video_guide: z.string().optional(),
        forum_guide: z.string().optional(),

        // Strategy / economy notes
        strategy_tier: z.string().optional(),
        profit_per_hour: z.string().optional(),
        investment_tier: z.string().optional(),
        league_phase: z.string().optional(),
        market_context: z.object({
          input_costs: z.array(z.string()).optional(),
        }).optional(),

        // Skill / technique notes
        gem_color: z.string().optional(),
        skill_type: z.string().optional(),
        level_requirement: z.number().optional(),
        damage_type: z.string().optional(),
        skill_tags: z.array(z.string()).optional(),

        // Character / instance notes
        level: z.number().optional(),
        progress_stage: z.string().optional(),

        // Item notes
        rarity: z.string().optional(),
        item_class: z.string().optional(),

        // Class / archetype notes
        class_type: z.string().optional(),
        complexity: z.string().optional(),
        accessibility: z.string().optional(),

        // League / season notes
        league_type: z.string().optional(),
        league_start: z.string().optional(),
      }),
    }),
  },
})
