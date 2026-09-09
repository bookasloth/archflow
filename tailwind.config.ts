import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: { DEFAULT: 'var(--surface)', hover: 'var(--surface-hover)' },
        subtle: 'var(--border-subtle)',
        line: 'var(--border-line)',
        ink: { DEFAULT: 'var(--ink)', muted: 'var(--ink-muted)', faint: 'var(--ink-faint)' },
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          active: 'var(--primary-active)',
          fg: 'var(--primary-fg)',
          soft: 'var(--primary-soft)',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: 'var(--radius)', lg: 'var(--radius-lg)' },
      boxShadow: { sm: 'var(--shadow-sm)' },
      borderColor: { DEFAULT: 'var(--border-line)' },
    },
  },
  plugins: [],
} satisfies Config
