<script setup lang="ts">
// Override `<img>` rendered from markdown via @nuxt/content's Prose components.
// Default ProseImg emits a plain `<img>`; we swap to `<NuxtImg>` so consumers
// get @nuxt/image's lazy loading, responsive `srcset`, format negotiation, and
// (for SSG builds) pre-rendered optimized variants under .output/public.
//
// Surface kept identical to the default ProseImg so existing markdown — both
// in this layer's `content/` and in consumer projects' content — continues to
// work without changes. Authors write `![alt](/path.png)` and get an
// optimized, lazy-loaded image at the cost of nothing.
//
// External URLs (http*) pass through @nuxt/image's `remote` provider path;
// relative paths under `/public` get rewritten to the IPX-served route during
// dev and pre-rendered into static variants during `nuxt generate`.

defineProps<{
  src?: string
  alt?: string
  width?: string | number
  height?: string | number
  title?: string
}>()
</script>

<template>
  <NuxtImg
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    :title="title"
    loading="lazy"
    decoding="async"
    format="webp"
    densities="x1 x2"
  />
</template>
