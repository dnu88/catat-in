import { toMobileTheme } from './mobile-theme'

describe('toMobileTheme', () => {
  it('resolves dark preference to the same Finance Editorial light tokens', () => {
    const theme = toMobileTheme('dark')

    expect(theme.mode).toBe('light')
    expect(theme.colors.background).toBe('#F7F7F4')
    expect(theme.colors.surface).toBe('#FFFFFF')
    expect(theme.colors.textPrimary).toBe('#090D18')
    expect(theme.colors.brandPrimary).toBe('#178BD0')
  })

  it('maps the canonical Finance Editorial operational tokens', () => {
    const theme = toMobileTheme('light')

    expect(theme.colors.background).toBe('#F7F7F4')
    expect(theme.colors.surface).toBe('#FFFFFF')
    expect(theme.colors.surfaceElevated).toBe('#FFFFFF')
    expect(theme.colors.borderSoft).toBe('rgba(6, 10, 28, 0.08)')
    expect(theme.colors.textPrimary).toBe('#090D18')
    expect(theme.colors.textSecondary).toBe('#4B5563')
    expect(theme.colors.textMuted).toBe('#5F6673')
    expect(theme.colors.brandPrimary).toBe('#178BD0')
    expect(theme.colors.brandPrimaryDeep).toBe('#0A3D78')
    expect(theme.colors.brandSecondary).toBe('#0C4E91')
    expect(theme.colors.success).toBe('#16733A')
    expect(theme.colors.danger).toBe('#B42318')
    expect(theme.colors.info).toBe('#075E91')
    expect(theme.colors.tabBarBackground).toBe('#FFFFFF')
    expect(theme.iconBubbles.primary.background).toBe('rgba(23, 139, 208, 0.12)')
  })
})
