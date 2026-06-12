<script setup lang="ts">
// Search hit list — rendered by ContentView inside the home column's scroll
// body while a query is active, in place of the body + Folders + Articles
// listing. The field lives separately in SearchBox.vue above the column
// header; state is shared through useSiteSearch.
const { query, status, results } = useSiteSearch()
</script>

<template>
  <section aria-label="Search results">
    <h3 class="section-heading mx-5">
      <svg
        class="section-heading__icon"
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
      <span>Results</span>
      <span class="ml-auto tabular-nums font-mono text-[10px] text-terminal-text-faint">
        {{ String(results.length).padStart(2, '0') }}
      </span>
    </h3>

    <p v-if="status === 'loading'" class="search-box__status mx-5">Loading index…</p>
    <p v-else-if="status === 'error'" class="search-box__status mx-5">Search index failed to load.</p>
    <ul v-else-if="results.length" class="flex flex-col py-2">
      <li
        v-for="hit in results"
        :key="hit.id"
        class="terminal-item min-w-0"
      >
        <NuxtLink :to="hit.id" class="block min-w-0 w-full py-2 px-3 ml-2">
          <span class="title-text font-bold text-base block truncate">{{ hit.title }}</span>
          <span
            v-if="hit.crumbs"
            class="block font-mono text-[10px] uppercase tracking-wider text-terminal-text-faint truncate mt-0.5"
          >
            {{ hit.crumbs }}
          </span>
          <!-- Snippet HTML is built in useSiteSearch from escaped content
               with <mark> added by markTerms — never raw document HTML. -->
          <span
            v-if="hit.snippet"
            class="search-hit__snippet block truncate mt-0.5"
            v-html="hit.snippet"
          />
        </NuxtLink>
      </li>
    </ul>
    <p v-else class="search-box__status mx-5">No results for “{{ query }}”.</p>
  </section>
</template>
