import { toMobileTheme } from './mobile-theme'

describe('toMobileTheme', () => {
  it('maps approved dark Kaswise tokens', () => {
    const theme = toMobileTheme('dark')

    expect(theme.colors.background).toBe('#141414')
    expect(theme.colors.surface).toBe('#1E1E1A')
    expect(theme.colors.surfaceElevated).toBe('#242427')
    expect(theme.colors.borderSoft).toBe('rgba(255, 255, 255, 0.06)')
    expect(theme.colors.textPrimary).toBe('#FFFFFF')
    expect(theme.colors.textSecondary).toBe('#E5E7EB')
    expect(theme.colors.textMuted).toBe('#9CA3AF')
    expect(theme.colors.brandPrimary).toBe('#A3FF12')
    expect(theme.colors.brandSecondary).toBe('#4A80F0')
    expect(theme.colors.success).toBe('#A3FF12')
    expect(theme.colors.danger).toBe('#FF7B7B')
    expect(theme.colors.info).toBe('#38BDF8')
    expect(theme.colors.tabBarBackground).toBe('#18181A')
    expect(theme.iconBubbles.primary.background).toBe('rgba(163, 255, 18, 0.14)')
  })

  it('maps approved light Kaswise tokens', () => {
    const theme = toMobileTheme('light')

    expect(theme.colors.background).toBe('#F5F5F0')
    expect(theme.colors.surface).toBe('#FFFFFF')
    expect(theme.colors.surfaceElevated).toBe('#FFFFFF')
    expect(theme.colors.borderSoft).toBe('rgba(10, 10, 10, 0.06)')
    expect(theme.colors.textPrimary).toBe('#0A0A0A')
    expect(theme.colors.textSecondary).toBe('#4B5563')
    expect(theme.colors.textMuted).toBe('#6B7280')
    expect(theme.colors.brandPrimary).toBe('#A3FF12')
    expect(theme.colors.brandSecondary).toBe('#4A80F0')
    expect(theme.colors.success).toBe('#65A30D')
    expect(theme.colors.danger).toBe('#DC2626')
    expect(theme.colors.info).toBe('#0284C7')
    expect(theme.colors.tabBarBackground).toBe('#FFFFFF')
    expect(theme.iconBubbles.primary.background).toBe('rgba(163, 255, 18, 0.18)')
  })
})
