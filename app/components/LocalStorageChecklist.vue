<script setup lang="ts">
// Generic checklist with localStorage persistence for use in MDC content pages.
// Reusable across challenges, build progression, gear upgrade lists, atlas
// allocation tracking — anywhere a stateful checklist makes sense.
//
// `storageKey` is used verbatim — caller is responsible for namespacing
// (e.g. `poe-challenges-phase-1`, `build-twshamap-checklist`). Two checklists
// sharing a key share state.
//
// All styles in scoped <style> with plain CSS (no Tailwind utilities) to
// stay independent of (a) Tailwind purge state when this file is new and
// (b) prose-style overrides from ContentRenderer's `.content` wrapper.

interface ChecklistItem {
  id: string
  label: string
  hint?: string
  group?: string
}

const props = defineProps<{
  storageKey: string
  title?: string
  description?: string
  items: ChecklistItem[]
}>()

const mounted = ref(false)
const checked = ref<Set<string>>(new Set())

function readStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(props.storageKey)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object'
      && parsed !== null
      && 'checked' in parsed
      && Array.isArray((parsed as { checked: unknown }).checked)
    ) {
      return new Set((parsed as { checked: string[] }).checked)
    }
  }
  catch {
    // localStorage unavailable (private mode etc.) — fall back to in-memory
  }
  return new Set()
}

function writeStorage(state: Set<string>): void {
  try {
    localStorage.setItem(props.storageKey, JSON.stringify({ checked: Array.from(state) }))
  }
  catch {
    // swallow — in-memory state still works
  }
}

onMounted(() => {
  checked.value = readStorage()
  mounted.value = true
})

const checkedCount = computed(() => checked.value.size)
const totalCount = computed(() => props.items.length)
const isComplete = computed(() => totalCount.value > 0 && checkedCount.value === totalCount.value)

const hasGroups = computed(() => props.items.some(item => item.group))

const groups = computed<Array<{ name: string | null; items: ChecklistItem[] }>>(() => {
  if (!hasGroups.value) return [{ name: null, items: props.items }]
  const map = new Map<string, ChecklistItem[]>()
  for (const item of props.items) {
    const key = item.group ?? ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).map(([name, items]) => ({ name: name || null, items }))
})

function toggle(itemId: string): void {
  const next = new Set(checked.value)
  if (next.has(itemId)) next.delete(itemId)
  else next.add(itemId)
  checked.value = next
  writeStorage(next)
}

function reset(): void {
  const n = checkedCount.value
  if (n === 0) return
  // eslint-disable-next-line no-restricted-globals
  if (!confirm(`Reset ${n} mục đã đánh dấu?`)) return
  checked.value = new Set()
  writeStorage(new Set())
}
</script>

<template>
  <!-- All structural elements use <div>/<span> rather than prose tags
       (ul/li/h3/p) so the surrounding ContentRenderer's `.content`
       prose CSS (lime square ::before on li, h3 size, p margins, etc.)
       does not target component internals. -->
  <div class="lsc-card" role="group" :aria-label="title || 'Checklist'">
    <div class="lsc-header">
      <div class="lsc-header-row">
        <div v-if="title" class="lsc-title">
          {{ title }}
        </div>
        <div
          v-if="mounted"
          class="lsc-progress"
          :class="{ 'lsc-progress--done': isComplete }"
        >
          {{ checkedCount }} / {{ totalCount }}
        </div>
        <button
          v-if="mounted && checkedCount > 0"
          type="button"
          class="lsc-reset"
          aria-label="Reset checklist"
          @click="reset"
        >
          ↻
        </button>
      </div>
      <div v-if="description" class="lsc-description">
        {{ description }}
      </div>
    </div>

    <div v-if="items.length === 0" class="lsc-empty">
      No items.
    </div>

    <div v-else class="lsc-list">
      <template v-for="group in groups" :key="group.name ?? '__flat__'">
        <div v-if="group.name" class="lsc-group-label">
          <span class="lsc-group-marker">▾</span>{{ group.name }}
        </div>

        <div v-for="item in group.items" :key="item.id" class="lsc-item">
          <label class="lsc-row">
            <input
              type="checkbox"
              class="lsc-checkbox"
              :checked="mounted ? checked.has(item.id) : false"
              @change="toggle(item.id)"
            >
            <span
              class="lsc-label"
              :class="{ 'lsc-label--checked': mounted && checked.has(item.id) }"
            >
              {{ item.label }}
            </span>
          </label>
          <div v-if="item.hint" class="lsc-hint">
            {{ item.hint }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Plain CSS — independent of Tailwind purge state and ContentRenderer's
   `.content` prose overrides. Colors hardcoded from theme tokens
   in tailwind.config.js so palette stays consistent. */

.lsc-card {
  border: 3px solid #474541;
  background: #2e2f2c;
  box-shadow: 4px 4px 0 0 #474541;
  margin: 1.5rem 0;
  font-family: 'Space Grotesk', -apple-system, sans-serif;
  color: #d5cfc5;
}

.lsc-header {
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid #474541;
}

.lsc-header-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.lsc-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  color: #d5cfc5;
  line-height: 1.25;
  margin: 0;
  flex: 1 1 60%;
  min-width: 0;
}

.lsc-progress {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.625rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #a8a298;
  border: 1px solid #474541;
  padding: 0.25rem 0.5rem;
  flex-shrink: 0;
  white-space: nowrap;
}
.lsc-progress--done {
  color: #d4ff00;
  border-color: #d4ff00;
}

.lsc-reset {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.625rem;
  text-transform: uppercase;
  color: #8a857c;
  background: transparent;
  border: 1px solid #474541;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s, border-color 0.15s;
}
.lsc-reset:hover {
  color: #d4ff00;
  border-color: #d4ff00;
}

.lsc-description {
  margin: 0.5rem 0 0;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.875rem;
  color: #a8a298;
  line-height: 1.5;
}

.lsc-empty {
  padding: 1.25rem 1rem;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  font-style: italic;
  color: #8a857c;
}

.lsc-list {
  list-style: none;
  margin: 0;
  padding: 0.5rem 1rem;
}

.lsc-group-label {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #c0b8a8;
  margin: 1rem 0 0.375rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.lsc-group-label:first-child {
  margin-top: 0;
}
.lsc-group-marker {
  color: #d4ff00;
}

.lsc-item {
  list-style: none;
  margin: 0;
  padding: 0.5rem 0;
}
.lsc-item + .lsc-item {
  border-top: 1px dashed #3b3c39;
}

.lsc-row {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  cursor: pointer;
  user-select: none;
  width: 100%;
}

.lsc-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  margin: 0.1875rem 0 0;
  border: 1.5px solid #5a5854;
  background: #2a2a28;
  border-radius: 0;
  cursor: pointer;
  position: relative;
  transition: background 0.1s, border-color 0.1s;
}
.lsc-checkbox:hover {
  border-color: #d4ff00;
}
.lsc-checkbox:checked {
  background: #d4ff00;
  border-color: #d4ff00;
}
.lsc-checkbox:checked::after {
  content: '';
  position: absolute;
  inset: 0;
  background: #2a2a28;
  clip-path: polygon(15% 50%, 40% 75%, 85% 25%, 75% 15%, 40% 55%, 25% 40%);
}
.lsc-checkbox:focus-visible {
  outline: 2px solid #d4ff00;
  outline-offset: 2px;
}

.lsc-label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #d5cfc5;
  line-height: 1.45;
  flex: 1 1 auto;
  min-width: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}
.lsc-label--checked {
  text-decoration: line-through;
  opacity: 0.55;
}

.lsc-hint {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  color: #a8a298;
  line-height: 1.5;
  margin: 0.375rem 0 0 1.625rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Narrow column safety — keep readability when host column < 360px. */
@media (max-width: 360px) {
  .lsc-card {
    box-shadow: 2px 2px 0 0 #474541;
  }
  .lsc-header,
  .lsc-list {
    padding-left: 0.625rem;
    padding-right: 0.625rem;
  }
  .lsc-hint {
    margin-left: 0;
  }
}
</style>
