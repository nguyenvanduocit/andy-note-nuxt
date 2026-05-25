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
con.

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
view** (folder có con) và **article view** (leaf page).

| Prop | Type | Default | Note |
|---|---|---|---|
| `path` | `string` | required | Content path để query |
| `noThrow` | `boolean` | `false` | Khi true, trả về `<div>Not Found</div>` thay vì throw `createError(404)`. Dùng khi component được render bên trong stacked column, không phải standalone route. |

## LocalStorageChecklist

File: `app/components/LocalStorageChecklist.vue`

MDC component để dùng trong markdown — render checklist mà state persist
qua localStorage. Gọi từ markdown:

```mdc
::local-storage-checklist{:id="my-checklist"}
- [ ] First task
- [ ] Second task
- [ ] Third task
::
```

| Prop | Type | Default | Note |
|---|---|---|---|
| `id` | `string` | required | Key trong localStorage (phải unique trong site) |

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
debounce intersection observer, và transition timing.
