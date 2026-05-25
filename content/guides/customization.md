---
title: "Customization"
description: "Override màu, font, layout, và component của theme từ project con."
tags: ["theme", "css", "override"]
created: 2026-05-19
updated: 2026-05-25
---

# Customization

Theme này là **layer**, nên bạn không sửa code trong `node_modules/`.
Mọi customization làm ở **project con** — Nuxt tự merge.

## Branding

Đổi tên site, description, theme color trong `app/app.config.ts` của project con:

```ts
export default defineAppConfig({
  site: {
    title: 'My Knowledge Base',
    description: 'Personal second-brain.',
    tagline: 'Notes that stack',
    author: 'me',
    themeColor: '#ff7b6b',
    logo: '/logo.png',
  },
})
```

Layer **không** ship top-nav header — UX là single stacked-column shell. Nếu
muốn nav riêng (sidebar, header bar), override `StackedColumns.vue` hoặc
thêm layout wrapper rồi render menu structure của riêng bạn.

Đổi tag `<title>` mặc định ở `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: ['github:nguyenvanduocit/andy-note-nuxt'],
  app: {
    head: {
      title: 'My Knowledge Base',
    },
  },
})
```

## Màu

Palette nằm trong `tailwind.config.js` của theme. Để override, **tạo
`tailwind.config.js` ở project con** với cùng cấu trúc — Nuxt tailwind
module merge nó vào.

Token chính:

| Token | Default | Ý nghĩa |
|---|---|---|
| `colors.primary` | `#ff7b6b` (coral) | Accent màu — heading dot, tag active, copy button hover |
| `colors.terminal.bg` | `#2a2a28` | Background chính |
| `colors.terminal.text` | `#d5cfc5` | Text chính (warm off-white) |
| `colors.terminal.border` | `#474541` | Border + stamp shadow |

Xem [Reference / CSS Tokens](/reference/css-tokens) để biết toàn bộ token.

## Font

Theme dùng [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk)
(display) + [Literata](https://fonts.google.com/specimen/Literata) (prose)
self-host qua `@fontsource-variable/*`. Bạn không cần làm gì thêm —
font đã load.

Để dùng font khác, install fontsource package mới rồi import trong
`app/assets/css/main.css` của project con:

```css
@import '@fontsource-variable/inter';

:root {
  --font-display: 'Inter Variable', sans-serif;
}
```

Override `fontFamily.display` trong `tailwind.config.js` của project con
tương ứng.

## Override component

Mọi component trong `app/components/` của theme đều override được bằng
cách tạo file cùng tên ở project con. Ví dụ thay `ContentView.vue`:

```
my-notes/
  app/
    components/
      ContentView.vue   ← file này sẽ thắng file trong theme
```

Vue/Nuxt component resolution ưu tiên project con khi tên trùng.

## Override CSS

Bạn không nên sửa CSS của theme trực tiếp. Thay vào đó, import sau theme
trong `app/assets/css/main.css` của project con:

```css
/* main.css của project con */
@import 'andy-note-nuxt/app/assets/css/main.css';

/* override sau import — selector của bạn thắng nhờ source order */
.section-heading {
  letter-spacing: 0.1em;
}
```

## Disable AI annotator overlay

Theme bật `vite-plugin-ai-annotator` mặc định cho dev. Tắt ở project con:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['github:nguyenvanduocit/andy-note-nuxt'],
  aiAnnotator: false,
})
```
