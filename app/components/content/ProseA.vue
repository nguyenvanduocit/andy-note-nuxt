<script setup lang="ts">
// Override `<a>` rendered from markdown via @nuxt/content's Prose components.
// The default ProseA never sets a target, so a link to another site opens in
// the current tab. We force web-external links (http, https, or
// protocol-relative `//`) to open in a new tab — the only behavioural change
// from the default; everything else is left identical.
//
// Surface mirrors the default ProseA (`href` + `target`). An author who sets an
// explicit target in MDC (`[text](url){target="_self"}`) wins — we only default
// the target when the markdown gave none. `rel` is deliberately untouched:
// @nuxt/content already tags external links `rel="nofollow"` (it falls through
// to NuxtLink), and modern browsers imply `noopener` for `target="_blank"`.
//
// mailto:/tel: are left alone — they invoke a mail/phone handler rather than a
// browser tab, so `_blank` would do nothing. The stack click handler in
// useStack.ts already declines to intercept `target="_blank"` and external
// hrefs, so a new-tab link sails straight through to the browser.

const props = defineProps<{
  href?: string
  target?: string
}>()

const isWebExternal = computed(
  () =>
    !!props.href &&
    (props.href.startsWith('http://') ||
      props.href.startsWith('https://') ||
      props.href.startsWith('//')),
)

const linkTarget = computed(() => props.target ?? (isWebExternal.value ? '_blank' : undefined))
</script>

<template>
  <NuxtLink :href="props.href" :target="linkTarget">
    <slot />
  </NuxtLink>
</template>
