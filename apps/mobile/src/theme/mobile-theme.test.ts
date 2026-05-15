import { toMobileTheme } from './mobile-theme'

describe('toMobileTheme', () => {
  it('maps approved dark Kaswise tokens', () => {
    const theme = toMobileTheme('dark')

    expect(theme.colors.background).toBe('#0F172A')
    expect(theme.colors.surface).toBe('#1E293B')
    expect(theme.colors.surfaceElevated).toBe('#243247')
    expect(theme.colors.borderSoft).toBe('#334155')
    expect(theme.colors.textPrimary).toBe('#FFFFFF')
    expect(theme.colors.textSecondary).toBe('#94A3B8')
    expect(theme.colors.textMuted).toBe('#64748B')
    expect(theme.colors.brandPrimary).toBe('#6366F1')
    expect(theme.colors.success).toBe('#10B981')
    expect(theme.colors.danger).toBe('#F43F5E')
    expect(theme.colors.info).toBe('#38BDF8')
    expect(theme.colors.tabBarBackground).toBe('rgba(15, 23, 42, 0.94)')
    expect(theme.iconBubbles.primary.background).toBe('rgba(99, 102, 241, 0.16)')
  })

  it('maps approved light Kaswise tokens', () => {
    const theme = toMobileTheme('light')

    expect(theme.colors.background).toBe('#F8FAFC')
    expect(theme.colors.surface).toBe('#FFFFFF')
    expect(theme.colors.surfaceElevated).toBe('#FFFFFF')
    expect(theme.colors.borderSoft).toBe('#E2E8F0')
    expect(theme.colors.textPrimary).toBe('#0F172A')
    expect(theme.colors.textSecondary).toBe('#475569')
    expect(theme.colors.textMuted).toBe('#64748B')
    expect(theme.colors.brandPrimary).toBe('#6366F1')
    expect(theme.colors.success).toBe('#10B981')
    expect(theme.colors.danger).toBe('#F43F5E')
    expect(theme.colors.info).toBe('#38BDF8')
    expect(theme.colors.tabBarBackground).toBe('#FFFFFF')
    expect(theme.iconBubbles.primary.background).toBe('rgba(99, 102, 241, 0.10)')
  })
})
