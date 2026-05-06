import { toMobileTheme } from './mobile-theme'

describe('mobile theme adapter', () => {
  it('maps shared dark token to RN-friendly theme object', () => {
    const dark = toMobileTheme('dark')

    expect(dark.colors.background).toBe('#050C1B')
    expect(dark.colors.textPrimary).toBe('#F8FAFF')
  })
})
