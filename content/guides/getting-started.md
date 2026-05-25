---
title: "Getting Started"
description: "Hiểu mental model của stacked-column và cấu trúc thư mục content trước khi viết note đầu tiên."
tags: ["setup", "concepts"]
created: 2026-05-15
updated: 2026-05-22
---

# Getting Started

Trước khi viết content, đọc qua 5 phút để hiểu **mental model**. Không
hiểu model thì organizing file sẽ ngược với cách theme render — và bạn
sẽ phải sửa nhiều.

## Stacked-column navigation

Mỗi click vào link nội bộ **push một column mới sang bên phải** thay vì
điều hướng sang trang khác. Column cũ sticky bên trái như Miller column
(Finder của macOS). Trail navigation luôn visible — bạn không bao giờ
"mất context".

```
[ / ] → [ /guides ] → [ /guides/getting-started ]
  ↑         ↑              ↑
  cha    section        bài đang đọc
```

Mobile collapse stack thành single column và dùng router push như app
truyền thống.

## Cấu trúc thư mục

```
content/
├── index.md              → /
├── quick-start.md        → /quick-start
├── guides/
│   ├── index.md          → /guides
│   ├── getting-started.md → /guides/getting-started
│   └── ...
└── reference/
    ├── index.md          → /reference
    └── ...
```

**Rules:**
- Top-level file → top-level route. `content/foo.md` → `/foo`.
- Folder + `index.md` → section root. `content/guides/index.md` → `/guides`.
- Files trong folder → leaf article. `content/guides/x.md` → `/guides/x`.
- Nested folder OK. `content/a/b/c.md` → `/a/b/c`.

Theme tự detect cấu trúc và build navigation. Bạn không phải khai báo
menu thủ công cho từng note.

## Listing vs article view

ContentView tự switch giữa hai layout dựa trên nội dung:

- **Listing view** — khi path có con (folder hoặc index.md với
  children). Render section heading + danh sách bài.
- **Article view** — khi path là leaf (chỉ có body, không có con).
  Render heading + tag pills + body markdown.

Bạn không config — theme tự quyết dựa trên những gì có trong cây content.

## Kế tiếp

→ [Writing Content](/guides/writing-content) — frontmatter, markdown,
tagging.
