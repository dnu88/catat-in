const tailwindConfig = require('./tailwind.config')

describe('mobile tailwind config', () => {
  it('exposes kaswise dashboard palette tokens', () => {
    expect(tailwindConfig.theme.extend.colors.kaswise).toEqual({
      bg: '#F3F5FA',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      muted: '#F8FAFD',
      text: '#0C1A3A',
      secondary: '#4C5A78',
      mutedText: '#8A95AD',
      border: '#E2E7F2',
      borderStrong: '#CBD5E3',
      primary: '#4F46E5',
      accent: '#10B981',
      success: '#10B981',
      danger: '#EF4444',
      warning: '#F59E0B',
    })
    expect(tailwindConfig.theme.extend.boxShadow.soft).toBe('0 10px 30px rgba(12, 26, 58, 0.08)')
  })
})
