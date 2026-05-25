---
title: "Quick Start"
description: "Cài đặt, chạy dev server, và publish trang đầu tiên trong dưới 5 phút."
tags: ["setup", "getting-started"]
created: 2026-05-20
updated: 2026-05-25
---

# Quick Start

Trang này là path ngắn nhất từ zero → một site stacked-column chạy được. Mọi step đều có command copy-paste — không cần đọc reference.

## 1. Tạo project con

`andy-note-nuxt` là **Nuxt 4 theme layer**. Bạn không clone trực tiếp — bạn tạo một project mới rồi extend layer này:

```bash
bunx nuxi init my-notes
cd my-notes
bun add github:nguyenvanduocit/andy-note-nuxt
```

Mở `nuxt.config.ts` của project con, thêm:

```ts
export default defineNuxtConfig({
  extends: ['github:nguyenvanduocit/andy-note-nuxt'],
})
```

## 2. Viết note đầu tiên

Tạo `content/hello.md`:

```markdown
---
title: "Hello"
description: "Note đầu tiên của tôi."
---

# Hello

Đây là note đầu tiên. Click vào bất kỳ link nội bộ nào dưới đây để
thấy nó push một column mới sang bên phải:

- [Quick Start](/quick-start)
- [Getting Started](/guides/getting-started)
```

## 3. Chạy dev

```bash
bun dev
```

Mở `http://localhost:3000` — bạn sẽ thấy section listing của tất cả file
markdown bạn vừa tạo, render theo style brutalist-terminal.

## 4. Đẩy lên hosting

Theme generate ra static HTML, deploy ở đâu cũng được:

```bash
bun generate
# Output trong .output/public/
```

Drop folder đó lên Cloudflare Pages / Netlify / Vercel / GitHub Pages — xong.
