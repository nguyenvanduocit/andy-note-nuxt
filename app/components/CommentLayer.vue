<script setup lang="ts">
// Thin gate for the reader-comments feature. Reads only the plain `enabled`
// flag (no Firebase / VueFire here), then mounts the real implementation
// CLIENT-ONLY and ONLY when enabled. That keeps the heavy component's setup —
// which calls VueFire composables that require the consumer's `nuxt-vuefire`
// plugin — from ever running during SSR/prerender or in a consumer that hasn't
// turned comments on (and therefore has no Firebase wired).
const props = defineProps<{ path: string }>()

const runtime = useRuntimeConfig()
const enabled = computed(
  () => (runtime.public.site as { comments?: { enabled?: boolean } }).comments?.enabled === true,
)
</script>

<template>
  <ClientOnly>
    <CommentLayerClient v-if="enabled" :path="props.path" />
  </ClientOnly>
</template>
