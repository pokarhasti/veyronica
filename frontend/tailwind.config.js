/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      colors: {
        ledger: {
          ground: '#FDFBF7',
          surface: '#FFFFFF',
          subdued: '#F5F2EB',
          ink: '#1C1917',
          muted: '#57534E',
          faint: '#78716C',
          hairline: '#E7E5E4',
          'hairline-dark': '#D6D3D1',
          crimson: '#991B1B',
          'crimson-light': '#FEF2F2',
          emerald: '#065F46',
          'emerald-light': '#F0FDF4',
          amber: '#B45309',
          'amber-light': '#FFFBEB',
          rose: '#991B1B',
          bronze: '#78350F',
        },
      },
      borderRadius: {
        xs: '2px',
        sm: '3px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
      },
      boxShadow: {
        'ledger-xs': '0 1px 2px rgba(28, 25, 23, 0.04)',
        'ledger-sm': '0 2px 4px rgba(28, 25, 23, 0.04), 0 1px 2px rgba(28, 25, 23, 0.03)',
        'ledger-md': '0 4px 12px -2px rgba(28, 25, 23, 0.06), 0 2px 6px -1px rgba(28, 25, 23, 0.03)',
        'ledger-lift': '0 8px 24px -3px rgba(28, 25, 23, 0.09), 0 3px 6px -2px rgba(28, 25, 23, 0.04)',
        'crimson-lift': '0 6px 20px -2px rgba(153, 27, 27, 0.28), 0 2px 6px -1px rgba(153, 27, 27, 0.16)',
        'emerald-lift': '0 6px 20px -2px rgba(6, 95, 70, 0.25), 0 2px 6px -1px rgba(6, 95, 70, 0.14)',
        'ledger-stamp': 'inset 0 0 0 1px rgba(153, 27, 27, 0.25), 0 1px 3px rgba(153, 27, 27, 0.08)',
        'ledger-seal': '0 0 0 1px #E7E5E4, 0 2px 4px rgba(28, 25, 23, 0.05)',
      },
      animation: {
        'stamp-press': 'stampPress 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'fade-in-up': 'fadeInUp 0.3s ease-out forwards',
      },
      keyframes: {
        stampPress: {
          '0%': { transform: 'scale(1.08) rotate(-1deg)', opacity: '0.7' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        fadeInUp: {
          '0%': { transform: 'translateY(6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
