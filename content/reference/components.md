---
title: "Components"
description: "Component exported bởi theme, prop và slot, cách override từ project con."
tags: ["components", "reference"]
created: 2026-05-18
updated: 2026-05-25
---

# Components

Theme ship 4 component chính, tất cả ở `app/components/`. Override bằng
cách tạo file cùng tên trong project con — Vue resolver ưu tiên project
con. Workflow override chi tiết nằm ở [Customization](/guides/customization).

## StackedColumns

File: `app/components/StackedColumns.vue`

Container quản lý toàn bộ stack. Owns `IntersectionObserver`, transition
group, và mobile redirect.

| Prop | Type | Default | Note |
|---|---|---|---|
| _(none)_ | — | — | Component reads stack từ `useStack()` composable |

Render mọi item của `fullStack` thành `<StackedColumn>`. Không cần truyền
prop — toàn bộ state lấy từ composable.

## StackedColumn

File: `app/components/StackedColumn.vue`

Một column đơn lẻ trong stack. Wrap `ContentView` + handle click logic
(push column khi click anchor, scroll-to khi click empty space).

| Prop | Type | Default | Note |
|---|---|---|---|
| `path` | `string` | required | Content path của column này (vd `/guides`) |
| `index` | `number` | required | Vị trí trong stack (driver cho z-index + sticky offset) |

## ContentView

File: `app/components/ContentView.vue`

Render nội dung markdown của một path. Switch tự động giữa **listing
view** (folder có con) và **article view** (leaf page) — cơ chế switch
giải thích ở [Getting Started](/guides/getting-started). Article view
render tag pills + frontmatter theo schema ở [Frontmatter](/reference/frontmatter).

| Prop | Type | Default | Note |
|---|---|---|---|
| `path` | `string` | required | Content path để query |
| `noThrow` | `boolean` | `false` | Khi true, trả về `<div>Not Found</div>` thay vì throw `createError(404)`. Dùng khi component được render bên trong stacked column, không phải standalone route. |

## LocalStorageChecklist

File: `app/components/LocalStorageChecklist.vue`

MDC component để dùng trong markdown — render checklist mà state persist
qua localStorage. Cách viết MDC block trong note nằm ở
[Writing Content](/guides/writing-content). Gọi từ markdown bằng MDC block
syntax + YAML frontmatter để truyền `items` array:

```mdc
::local-storage-checklist
---
storageKey: rust-learning
title: Rust learning track
description: Tick off khi hoàn thành
items:
  - id: ownership
    label: Read the ownership chapter
  - id: lifetimes
    label: Practice lifetimes
    hint: làm 5 bài exercise
  - id: runtime
    label: Build a small async runtime
    group: Advanced
::
```

| Prop | Type | Default | Note |
|---|---|---|---|
| `storageKey` | `string` | required | Key dùng nguyên văn trong `localStorage`. Caller tự namespacing (vd `notes-rust-learning`). Hai checklist trùng key sẽ share state. |
| `items` | `ChecklistItem[]` | required | Mỗi item: `{ id, label, hint?, group? }`. `id` phải unique trong checklist. `group` (optional) gộp items thành section. |
| `title` | `string` | optional | Heading ở đầu card |
| `description` | `string` | optional | Sub-heading dưới title |

State được persist dạng `{ checked: string[] }` trong localStorage —
graceful fallback sang in-memory nếu storage không khả dụng (private mode).

## Composable

### `useStack()`

File: `app/composables/useStack.ts`

Trả về reactive stack state + helpers:

```ts
const {
  stack,          // Ref<string[]> — paths đã push thủ công (không bao gồm route hiện tại)
  fullStack,      // ComputedRef<string[]> — [route, ...stack] (cái render)
  activeIndex,    // Ref<number>
  isMobile,       // ComputedRef<boolean>
  pushColumn,     // (path, sourceIndex?) => void
  popColumns,     // (count) => void
  handleStackClick, // (event, index) => void
  scrollToColumn, // (index, opts?) => void
} = useStack()
```

Đọc inline comment trong file để hiểu thuật toán đếm width column,
debounce intersection observer, và transition timing. Geometry của stack
(`--column-width`, `--stack-peek`) khai báo dạng CSS variable — xem
[CSS Tokens](/reference/css-tokens) để override.
