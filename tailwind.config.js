/**
 * Brutalist terminal palette — ported from onepercentplus.
 * Warm dark base + lime accent + 4px-offset stamp shadows are the visual signature.
 *
 * Note: kept as `.js` (not `.ts`) because @nuxtjs/tailwindcss's generated
 * postcss.mjs hardcodes `tailwind.config.js` as the import target. A `.ts`
 * file is silently skipped by Vite's resolver and the custom theme is lost.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/app.vue',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#d4ff00',
        terminal: {
          bg: '#2a2a28',
          'bg-light': '#323330',
          text: '#d5cfc5',
          'text-secondary': '#c0b8a8',
          'text-muted': '#a8a298',
          'text-faint': '#8a857c',
          accent: '#d4ff00',
          'accent-hover': '#e8ff4d',
          border: '#474541',
          'border-strong': '#5a5854',
          surface: {
            0: '#2e2f2c',
            1: '#3b3c39',
            2: '#444541',
            elevated: '#4d4e4b',
          },
        },
      },
      fontFamily: {
        display: ['Space Grotesk', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        prose: ['Literata', 'Georgia', 'serif'],
        mono: ['SF Mono', 'Monaco', 'Consolas', 'ui-monospace', 'monospace'],
      },
      // Stamp shadows — flat 0-blur offsets are the brutalist signature.
      // Use `shadow-stamp` on cards/buttons; `shadow-stamp-accent` for hover/active.
      boxShadow: {
        stamp: '4px 4px 0px 0px #474541',
        'stamp-sm': '2px 2px 0px 0px #474541',
        'stamp-lg': '6px 6px 0px 0px #474541',
        'stamp-accent': '4px 4px 0px 0px #d4ff00',
        'stamp-accent-sm': '2px 2px 0px 0px #d4ff00',
      },
      borderWidth: {
        3: '3px',
      },
      letterSpacing: {
        'widest-lg': '0.15em',
      },
    },
  },
  plugins: [],
}
