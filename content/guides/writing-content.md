---
title: "Writing Content"
description: "Frontmatter, markdown syntax, tags, và cách organize note để theme render đúng."
tags: ["authoring", "markdown"]
created: 2026-05-17
updated: 2026-05-24
---

# Writing Content

Mỗi file `.md` trong `content/` là một note. File phải có frontmatter
ở đầu (giữa hai dòng `---`) và markdown body bên dưới.

## Frontmatter tối thiểu

```yaml
---
title: "Tên bài"
description: "Một dòng tóm tắt."
---
```

`title` và `description` là hai field duy nhất bắt buộc trong thực tế.
`title` show ở header của column và ở listing item. `description`
show ở `<meta name="description">` và ở section index khi render trang
cha.

## Frontmatter mở rộng

```yaml
---
title: "Tên bài"
description: "Tóm tắt."
tags: ["concept", "rust", "performance"]
created: 2026-05-01
updated: 2026-05-20
---
```

- **`tags`** — array of string. Render thành tag pills dưới H1. Click
  tag dẫn đến `/tags/<tag>` — xem [/tags/reference](/tags/reference) để
  thấy một tag index hoàn chỉnh trông như thế nào.
- **`created` / `updated`** — ISO date string (`YYYY-MM-DD` đủ). Theme
  dùng để sort section "Articles" và để hiện badge recency.

Xem [Reference / Frontmatter](/reference/frontmatter) để biết toàn bộ
field schema và những field optional khác.

## Body markdown

Theme dùng [Nuxt Content v3](https://content.nuxt.com) — hỗ trợ
markdown chuẩn + MDC components. Theme ship sẵn một MDC component:
[LocalStorageChecklist](/reference/components) — checklist persist state
qua localStorage, nhúng thẳng vào markdown.

### Heading

```markdown
# H1 (chỉ một cái — nếu bạn không viết, theme dùng `title` frontmatter)
## H2 — render với underline dashed
### H3 — render với accent dot
```

Theme tự **strip H1 đầu tiên** nếu nó trùng `title` để tránh duplicate.

### Inline elements

```markdown
**bold** · *italic* · `inline code` · [link nội bộ](/other)
```

Link nội bộ (bắt đầu bằng `/`) sẽ **push column mới** thay vì navigate
trang. Link ngoài (bắt đầu bằng `http`) mở tab mới.

### Code block

```markdown
​```ts
const greeting: string = "hello"
​```
```

Syntax highlighting disable mặc định (`build.markdown.highlight: false`
trong `nuxt.config.ts`) để giảm bundle size. Bật lại bằng cách override
ở project con.

### List

```markdown
- Item A
- Item B
  - Nested item
- Item C

1. Step 1
2. Step 2
```

## Organize notes

**Rule of thumb**: folder = một topic / domain, file = một concept /
task trong topic đó.

```
content/
├── rust/
│   ├── index.md         → /rust (section overview)
│   ├── ownership.md     → /rust/ownership
│   ├── lifetimes.md     → /rust/lifetimes
│   └── async.md         → /rust/async
├── databases/
│   ├── index.md
│   ├── postgres.md
│   └── sqlite.md
└── reading-list.md      → /reading-list (flat note ở root)
```

Khi user mở `/rust`, theme tự render section listing — bạn không phải
viết file index manually nếu không muốn (nhưng có index.md sẽ giúp bạn
viết overview / TOC riêng).

## Kế tiếp

→ [Customization](/guides/customization) — đổi theme, font, override
component.
