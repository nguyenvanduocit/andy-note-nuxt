---
title: "License"
description: "MIT License — andy-note-nuxt theme và toàn bộ source code."
created: 2026-05-11
updated: 2026-05-11
---

# License

Theme này phát hành theo **MIT License** — bạn được toàn quyền dùng cho dự án cá nhân, thương mại, modify, redistribute, sublicense. Chỉ cần giữ lại copyright notice trong các bản phân phối lại.

## Phạm vi

License áp dụng cho **source code của theme** (toàn bộ thư mục `app/`, `nuxt.config.ts`, `content.config.ts`, `tailwind.config.js`, configs, scripts).

License **không** áp dụng cho **content do bạn viết** trong child project — content thuộc về bạn, bạn quyết định license của riêng nó. Hai layer này độc lập:

- **Theme** (`andy-note-nuxt`) — MIT, code do tác giả maintain.
- **Notes của bạn** — license tuỳ bạn (All Rights Reserved, CC-BY, CC0, v.v.). Khai báo trong README của repo con hoặc trong `content/license.md` của riêng bạn — file đó sẽ override file license mặc định này.

## Override file này

Khi bạn extend theme thành child project và muốn dùng license khác, **tạo `content/license.md` ở child project**. Nuxt Layers sẽ ưu tiên file của child, mặc file mặc định ở theme.

Ví dụ child project muốn dùng CC-BY-4.0 cho content:

```markdown
---
title: "License"
---

# License

Code: tham chiếu license của theme upstream (MIT).
Content trong repo này: **CC-BY-4.0**.
```

## MIT License — bản đầy đủ

```
MIT License

Copyright (c) 2026 Nguyen Van Duoc

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
