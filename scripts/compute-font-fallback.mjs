#!/usr/bin/env node
/**
 * One-shot: derive @font-face metric-override blocks that adjust a system
 * font (Arial / Times New Roman) so it ALIGNS — pixel for pixel — with the
 * webfont it stands in for during `font-display: swap`.
 *
 * Why: @fontsource ships `swap`. While the WOFF2 is in flight the browser
 * paints with the system font; when the WOFF2 arrives it swaps. If the two
 * have different ascent / descent / x-height / avg char width the swap
 * shifts every glyph below the swap point — that's the 0.1215 CLS we
 * measured on `/`.
 *
 * Fix: emit a fresh @font-face whose family name matches the webfont, but
 * whose `src: local()` resolves to the system font with `ascent-override`,
 * `descent-override`, `line-gap-override`, and `size-adjust` computed by
 * Capsize so the rendered metrics equal the real font's.
 *
 * This is the same approach used by `next/font` (Next.js), `@nuxt/fonts`,
 * and `astro:assets` font handling. Capsize tooling stays as devDep only
 * for re-computation when fonts change; the produced CSS is hand-pasted
 * into `app/assets/css/main.css` so there's no runtime cost.
 *
 * Run with:  bun scripts/compute-font-fallback.mjs
 */
import { readFile } from 'node:fs/promises'
import { fromBuffer } from '@capsizecss/unpack'
import { createFontStack } from '@capsizecss/core'
import arialMetrics from '@capsizecss/metrics/arial'
import timesNewRomanMetrics from '@capsizecss/metrics/timesNewRoman'

const ROOT = new URL('..', import.meta.url).pathname

// The webfonts we ship and the system font they should match metrically.
const targets = [
  {
    label: 'Space Grotesk → Arial',
    woff2: 'node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff2',
    family: 'Space Grotesk',
    fallback: arialMetrics,
  },
  {
    label: 'Literata → Times New Roman',
    woff2: 'node_modules/@fontsource/literata/files/literata-latin-400-normal.woff2',
    family: 'Literata',
    fallback: timesNewRomanMetrics,
  },
]

for (const t of targets) {
  const buf = await readFile(ROOT + t.woff2)
  const webfontMetrics = await fromBuffer(buf)
  // `createFontStack` produces a fallback @font-face per item AFTER the first
  // (the first is the real font, used as the metric baseline). We hand it
  // [webfont, fallback] and read back the single fallback @font-face it
  // generates.
  const { fontFaces, fontFamily } = createFontStack(
    [webfontMetrics, t.fallback],
    { fontFaceFormat: 'styleString' },
  )
  console.log(`\n/* ${t.label} — paste into main.css */`)
  console.log(`/* font-family stack: ${fontFamily} */`)
  console.log(fontFaces.trim())
}
