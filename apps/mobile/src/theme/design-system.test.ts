import { financeEditorial, resolveFinancialAmountColor } from './finance-editorial'
import { resolveOperationalThemeMode, toMobileTheme } from './mobile-theme'

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.03928
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    )
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrast(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

describe('Finance Editorial operational design system', () => {
  it.each([
    ['light', 'light'],
    ['light', 'dark'],
    ['dark', 'light'],
    ['dark', 'dark'],
    ['system', 'light'],
    ['system', 'dark'],
  ] as const)(
    'keeps operational surfaces light for %s preference on %s system',
    (preference, systemScheme) => {
      expect(resolveOperationalThemeMode(preference, systemScheme)).toBe('light')
    },
  )

  it('maps every compatible mode request to the canonical Finance Editorial palette', () => {
    const light = toMobileTheme('light')
    const dark = toMobileTheme('dark')

    expect(dark.colors).toEqual(light.colors)
    expect(dark.iconBubbles).toEqual(light.iconBubbles)
    expect(light.colors.background).toBe(financeEditorial.paper)
    expect(light.colors.textPrimary).toBe(financeEditorial.ink)
    expect(light.colors.textMuted).toBe(financeEditorial.textMuted)
  })

  it.each(['ink', 'textSecondary', 'textMuted'] as const)(
    'keeps the %s normal-text role at WCAG AA contrast on paper and white',
    (role) => {
      expect(contrast(financeEditorial[role], financeEditorial.paper)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(financeEditorial[role], financeEditorial.white)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it('exposes semantic amount colors including a transfer role for later integration', () => {
    expect(resolveFinancialAmountColor('income')).toBe(financeEditorial.financialIncome)
    expect(resolveFinancialAmountColor('expense')).toBe(financeEditorial.financialExpense)
    expect(resolveFinancialAmountColor('transfer')).toBe(financeEditorial.financialTransfer)
    expect(resolveFinancialAmountColor('adverse')).toBe(financeEditorial.financialExpenseAlert)
  })
})
