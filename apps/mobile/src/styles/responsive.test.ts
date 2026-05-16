import { createMobileStyles } from './mobileStyles'
import { toMobileTheme } from '../theme/mobile-theme'

describe('mobile responsive styles', () => {
  const theme = toMobileTheme('dark')

  it('keeps compact phone layout below tablet width', () => {
    const styles = createMobileStyles(theme, 390)

    expect(styles.appContent.paddingHorizontal).toBe(theme.spacing.md)
    expect(styles.screenWrap.maxWidth).toBeUndefined()
    expect(styles.quickActionRow.flexWrap).toBe('nowrap')
    expect(styles.quickActionCard.minWidth).toBeUndefined()
  })

  it('constrains tablet content and lets action cards wrap', () => {
    const styles = createMobileStyles(theme, 834)

    expect(styles.appContent.paddingHorizontal).toBe(theme.spacing['2xl'])
    expect(styles.screenWrap.maxWidth).toBe(760)
    expect(styles.screenWrap.alignSelf).toBe('center')
    expect(styles.quickActionRow.flexWrap).toBe('wrap')
    expect(styles.quickActionCard.minWidth).toBe(148)
  })

  it('uses a wider centered content rail on large screens', () => {
    const styles = createMobileStyles(theme, 1180)

    expect(styles.appContent.paddingHorizontal).toBe(theme.spacing['3xl'])
    expect(styles.screenWrap.maxWidth).toBe(920)
    expect(styles.mobileHeroStats.flexWrap).toBe('wrap')
    expect(styles.reportMetricRow.flexWrap).toBe('wrap')
  })
})
