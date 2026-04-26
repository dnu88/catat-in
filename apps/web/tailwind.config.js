/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // ── Design Tokens Catat.in ──────────────────────────
      colors: {
        // Primary accent — Biru electric
        accent: {
          50:  '#EEF3FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          400: '#60A5FA',
          500: '#3B7BF8',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        // Income — Cyan ke Biru
        income: {
          light: '#E0F2FE',
          DEFAULT: '#0EA5E9',
          dark: '#0369A1',
        },
        // Expense — Indigo ke Ungu
        expense: {
          light: '#EDE9FE',
          DEFAULT: '#6366F1',
          dark: '#4338CA',
        },
        // Savings — Hijau
        savings: {
          light: '#DCFCE7',
          DEFAULT: '#10B981',
          dark: '#059669',
        },
        // Warning — Amber ke Merah
        warning: {
          light: '#FEF3C7',
          DEFAULT: '#F59E0B',
          dark: '#B45309',
        },
        // Danger
        danger: {
          light: '#FEE2E2',
          DEFAULT: '#EF4444',
          dark: '#DC2626',
        },
      },
      backgroundImage: {
        // Gradient utama — dipakai di hero card, button, sidebar
        'gradient-card':    'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)',
        'gradient-income':  'linear-gradient(135deg, #0EA5E9, #2563EB)',
        'gradient-expense': 'linear-gradient(135deg, #6366F1, #8B5CF6)',
        'gradient-savings': 'linear-gradient(135deg, #10B981, #059669)',
        'gradient-warning': 'linear-gradient(135deg, #F59E0B, #EF4444)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }], // 10px
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '28px',
      },
      boxShadow: {
        'card':   '0 1px 3px rgba(15,21,35,0.06), 0 4px 16px rgba(37,99,235,0.06)',
        'accent': '0 4px 20px rgba(37,99,235,0.28)',
        'modal':  '0 8px 40px rgba(15,21,35,0.18)',
      },
      // Dark mode surface colors
      backgroundColor: {
        'dark-base':  '#0B0F1E',
        'dark-card':  '#131929',
        'dark-card2': '#1A2035',
      },
    },
  },
  plugins: [],
}
