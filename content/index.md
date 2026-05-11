---
title: "Andy Notes"
description: "Brutalist-terminal Nuxt Content theme — stacked-column navigation for personal notes and second-brain knowledge bases."
created: 2026-05-11
updated: 2026-05-11
---

# Andy Notes

Đây là **theme mặc định** sau khi bạn vừa clone (hoặc extend) repo `andy-note-nuxt`. Layout đang chạy là **stacked-column navigation** — mỗi lần click vào một note, một cột mới push sang phải thay vì điều hướng trang khác. Cách này giữ context của tất cả cấp cha ở bên trái, đọc nhiều note liên quan trong cùng một flow.

## Bắt đầu

1. Viết note đầu tiên bằng cách tạo file markdown bất kỳ trong `content/`. Ví dụ `content/notes/my-first-note.md`.
2. Frontmatter cơ bản chỉ cần `title` + `description`. Mọi field khác đều optional (xem `content.config.ts` để biết hết).
3. Tạo subfolder để tự động có section group ở landing page. Ví dụ `content/projects/` sẽ xuất hiện như một section.

## Tuỳ biến

- **Menu & branding**: sửa `app/app.config.ts` để đổi `site.title`, `site.description`, và mảng `menu`.
- **Title trang web**: sửa `app.head.title` trong `nuxt.config.ts`.
- **Màu sắc**: palette terminal nằm trong `tailwind.config.js`. Token chính: `terminal.accent` (#d4ff00 — lime), `terminal.bg` (#2a2a28 — warm dark).
- **Component**: mọi file trong `app/components/` đều override được bằng cách tạo file cùng tên ở child project.

Xem [License](/license) để biết điều khoản sử dụng.
