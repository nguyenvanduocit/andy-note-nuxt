---
title: "Frontmatter"
description: "Toàn bộ field schema trong content.config.ts, kiểu dữ liệu, default, và lúc nào được dùng."
tags: ["schema", "reference"]
created: 2026-05-16
updated: 2026-05-25
---

# Frontmatter

Mỗi file `.md` trong `content/` mở đầu bằng frontmatter YAML giữa hai
dòng `---`. Theme parse field theo schema trong `content.config.ts`.

## Core fields

| Field | Type | Bắt buộc? | Dùng ở đâu |
|---|---|---|---|
| `title` | string | Khuyên dùng | Header column, listing item, `<title>` HTML |
| `description` | string | Khuyên dùng | `<meta name="description">`, OG, section listing |
| `tags` | string[] | Optional | Render thành tag pills dưới H1 |
| `created` | YYYY-MM-DD | Optional | Sort "Latest" section, badge recency |
| `updated` | YYYY-MM-DD | Optional | Sort listing, badge recency (ưu tiên > `created`) |
| `document_type` | string | Optional | Phân loại (default: undefined). Special value `"convention"` ẩn khỏi listing. |

## Behavior fields

| Field | Type | Note |
|---|---|---|
| `rawbody` | string (auto) | Tự populate nếu enable trong schema — backup raw markdown để feature "Copy as Markdown" lấy nguyên gốc thay vì stringify minimark AST. |

## Convention pages

Set `document_type: "convention"` để **ẩn** một file khỏi tất cả section
listing. File vẫn truy cập được qua URL trực tiếp — dùng cho trang
template, sandbox, scratch note bạn không muốn show trong nav.

```yaml
---
title: "Scratch"
document_type: "convention"
---
```

## Example đầy đủ

```yaml
---
title: "Building a Rust async runtime"
description: "Pattern thực dụng để hiểu Tokio internals từ một executor mini."
tags: ["rust", "async", "tokio"]
created: 2026-05-01
updated: 2026-05-23
---
```

## Schema source

Schema sống trong `content.config.ts` của theme. Override bằng cách
ship `content.config.ts` ở project con — Nuxt Layers ưu tiên file của
consumer:

```ts
// content.config.ts (consumer)
import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: '**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        // ... thêm field domain-specific tuỳ bạn
        priority: z.enum(['low', 'medium', 'high']).optional(),
        owner: z.string().optional(),
      }),
    }),
  },
})
```
