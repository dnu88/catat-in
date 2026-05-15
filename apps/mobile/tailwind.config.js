module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        kaswise: {
          navy: '#0F172A',
          cardbg: '#1E293B',
          elevated: '#243247',
          slateBorder: '#334155',
          indigo: '#6366F1',
          emerald: '#10B981',
          rose: '#F43F5E',
          sky: '#38BDF8',
          lightBg: '#F8FAFC',
          lightSurface: '#FFFFFF',
          lightBorder: '#E2E8F0',
          lightText: '#0F172A',
        },
      },
      boxShadow: {
        soft: '0 10px 18px rgba(15, 23, 42, 0.08)',
      },
    },
  },
}
