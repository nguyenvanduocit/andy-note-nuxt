<script setup lang="ts">
// The site-search field — mounts in place of the home column's header row
// while search mode is open (the magnifier trigger next to the copy
// split-button flips it). Hits render separately in SearchResults.vue
// inside the column's scroll body; state is shared through useSiteSearch.
const { query, closeSearch, ensureIndex, runSearch } = useSiteSearch()

const inputEl = useTemplateRef<HTMLInputElement>('inputEl')

// Mount = the user just clicked the trigger: load the section dump and put
// the caret in the field in one motion.
onMounted(() => {
  ensureIndex()
  inputEl.value?.focus()
})

// Debounced search — 150ms sits under the perception threshold while
// skipping per-keystroke scans of the whole section dump.
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(query, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(runSearch, 150)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <div class="search-box__field" role="search">
    <!-- Magnifier — circle + square-capped handle, matching the listing
         icons' stroke geometry. -->
    <svg
      class="search-box__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="square"
      stroke-linejoin="miter"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="6" />
      <path d="M14.5 14.5 L21 21" />
    </svg>
    <input
      ref="inputEl"
      v-model="query"
      type="search"
      class="search-box__input"
      placeholder="Search…"
      aria-label="Search this site"
      autocomplete="off"
      spellcheck="false"
      @keydown.esc="closeSearch"
    >
    <!-- Close — restores the header row. Same one-segment group chrome as
         the trigger so open/close read as the same control. -->
    <div class="copy-actions">
      <button
        type="button"
        class="copy-btn copy-btn--menu"
        aria-label="Close search"
        title="Close search"
        @click.stop="closeSearch"
      >
        <svg
          class="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="square"
          stroke-linejoin="miter"
          aria-hidden="true"
        >
          <path d="M6 6 L18 18" />
          <path d="M18 6 L6 18" />
        </svg>
      </button>
    </div>
  </div>
</template>
