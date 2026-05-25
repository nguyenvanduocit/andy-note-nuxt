<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
/**
 * Add .js-ready class to <html> once hydrated to enable pointer interactions
 * on content links (they start disabled via CSS to prevent FOUC navigation).
 */
if (import.meta.client) {
  onMounted(() => {
    document.documentElement.classList.add('js-ready')
  })
}
</script>
