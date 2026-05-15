import { toMobileTheme } from './mobile-theme'

describe('toMobileTheme', () => {
  it('maps approved dark Kaswise tokens', () => {
    const theme = toMobileTheme('dark')

    expect(theme.colors.background).toBe('#050C1B')
    expect(theme.colors.surface).toBe('#08132A')
    expect(theme.colors.surfaceElevated).toBe('#162033')
    expect(theme.colors.borderSoft).toBe('#1A2A4C')
    expect(theme.colors.textPrimary).toBe('#F8FAFF')
    expect(theme.colors.textSecondary).toBe('#B4C0DA')
    expect(theme.colors.textMuted).toBe('#7D8CA9')
    expect(theme.colors.brandPrimary).toBe('#4F46E5')
    expect(theme.colors.success).toBe('#10B981')
    expect(theme.colors.danger).toBe('#EF4444')
    expect(theme.colors.info).toBe('#38BDF8')
    expect(theme.colors.tabBarBackground).toBe('#0A1730')
    expect(theme.iconBubbles.primary.background).toBe('#EEF2FF')
  })

  it('maps approved light Kaswise tokens', () => {
    const theme = toMobileTheme('light')

    expect(theme.colors.background).toBe('#F3F5FA')
    expect(theme.colors.surface).toBe('#FFFFFF')
    expect(theme.colors.surfaceElevated).toBe('#FFFFFF')
    expect(theme.colors.borderSoft).toBe('#E2E7F2')
    expect(theme.colors.textPrimary).toBe('#0C1A3A')
    expect(theme.colors.textSecondary).toBe('#4C5A78')
    expect(theme.colors.textMuted).toBe('#8A95AD')
    expect(theme.colors.brandPrimary).toBe('#4F46E5')
    expect(theme.colors.success).toBe('#10B981')
    expect(theme.colors.danger).toBe('#EF4444')
    expect(theme.colors.info).toBe('#38BDF8')
    expect(theme.colors.tabBarBackground).toBe('#FFFFFF')
    expect(theme.iconBubbles.primary.background).toBe('#EEF2FF')
  })
})
