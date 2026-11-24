/** @type {import('tailwindcss').Config} */
// Semua warna/font merujuk ke token CSS di src/styles/theme.css, jadi mengubah tema cukup di satu file.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--c-paper)',
        surface: 'var(--c-surface)',
        ink: 'var(--c-ink)',
        primary: 'var(--c-primary)',
        secondary: 'var(--c-secondary)',
        income: 'var(--c-income)',
        expense: 'var(--c-expense)',
        accent: 'var(--c-accent)',
        muted: 'var(--c-muted)',
        soft: 'var(--c-soft)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        comic: 'var(--shadow-offset) var(--shadow-offset) 0 0 var(--c-ink)',
        'comic-lg': 'var(--shadow-offset-lg) var(--shadow-offset-lg) 0 0 var(--c-ink)',
      },
    },
  },
  plugins: [],
};
