---
title: "CSS Tokens"
description: "Tailwind theme token: màu, shadow, font, spacing — giá trị mặc định và use case."
tags: ["css", "tailwind", "tokens"]
created: 2026-05-18
updated: 2026-05-25
---

# CSS Tokens

Theme expose token qua `tailwind.config.js`. Override ở project con
bằng cách ship file `tailwind.config.js` cùng key — `@nuxtjs/tailwindcss`
sẽ merge. Workflow override từng surface (màu, font, CSS) nằm ở
[Customization](/guides/customization).

## Colors

### Accent

| Token | Value | Dùng cho |
|---|---|---|
| `primary` | `#ff7b6b` (coral) | Heading dot, tag active, copy button hover, success state |

### Terminal palette

| Token | Value | Note |
|---|---|---|
| `terminal.bg` | `#2a2a28` | App background |
| `terminal.surface.0` | `#2e2f2c` | Card / inline code bg |
| `terminal.surface.1` | `#3b3c39` | Slightly lifted surface |
| `terminal.surface.2` | `#444541` | Hover surface |
| `terminal.surface.elevated` | `#4d4e4b` | Popover / modal |
| `terminal.text` | `#d5cfc5` | Body text (warm off-white) |
| `terminal.text-secondary` | `#c0b8a8` | Secondary text |
| `terminal.text-muted` | `#a8a298` | Muted captions, section heading |
| `terminal.text-faint` | `#8a857c` | Dim placeholders, leader dots |
| `terminal.accent` | `#ff7b6b` | Alias của `primary` |
| `terminal.accent-hover` | `#ff9b8a` | Hover state cho accent |
| `terminal.border` | `#474541` | Border + shadow color |
| `terminal.border-strong` | `#5a5854` | Stronger border (rare) |

## Shadows

| Token | Value | Note |
|---|---|---|
| `shadow-stamp` | `4px 4px 0px 0px #474541` | Default brutalist offset |
| `shadow-stamp-sm` | `2px 2px 0px 0px #474541` | Compact button |
| `shadow-stamp-lg` | `6px 6px 0px 0px #474541` | Card / hero |
| `shadow-stamp-accent` | `4px 4px 0px 0px #ff7b6b` | Active / focused state |

**Rule**: never `blur > 0`, never `rgba()` shadow color. Flat offset
là chữ ký của theme.

## Typography

| Token | Stack | Use case |
|---|---|---|
| `fontFamily.display` | Space Grotesk → system | Heading, button, badge |
| `fontFamily.prose` | Literata → Georgia → serif | Article body |
| `fontFamily.mono` | SF Mono → Monaco → Consolas | Code, badge meta, mono UI |

## Spacing extras

Theme thêm vài spacing token ngoài Tailwind default:

| Token | Value | Note |
|---|---|---|
| `tracking-widest-lg` | `0.15em` | Section heading uppercase tracking |

## CSS custom properties

Một số giá trị runtime sống ở `:root` (CSS variable, không phải Tailwind
token) vì cần animate / responsive:

| Variable | Default | Note |
|---|---|---|
| `--column-width` | `640px` | Width của một stacked column |
| `--column-min-width` | `420px` | Floor để column không co quá |
| `--stack-peek` | `48px` | Phần peek của cột cha khi stack scroll |

Ba variable này drive scroll geometry của [StackedColumn](/reference/components).

Đổi giá trị này bằng cách override `:root` trong CSS project con:

```css
/* main.css của project con */
@import 'andy-note-nuxt/app/assets/css/main.css';

:root {
  --column-width: 720px;
  --stack-peek: 56px;
}
```
