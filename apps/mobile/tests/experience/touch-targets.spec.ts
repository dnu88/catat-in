import { expect, test } from '@playwright/test'
import { bootExperience, gotoCapture, waitForOpaque } from './harness'

/**
 * T27 follow-up — touch-target / a11y verification for the new premium controls.
 *
 * A reviewer flagged the T22 disclosure pill as a sub-44px target with no
 * accessible label. The first half was a false positive (its own `grep -A5`
 * stopped before `minHeight: 44`); the label half was real and was fixed. This
 * spec measures the RENDERED box of every new premium control, so the claim is
 * settled by the browser instead of by reading style objects.
 */

const MIN_TARGET = 44

type Measurement = { id: string; width: number; height: number; ariaLabel: string | null }

async function measure(page: import('@playwright/test').Page, id: string): Promise<Measurement> {
  const box = await page.getByTestId(id).boundingBox()
  const ariaLabel = await page.getByTestId(id).getAttribute('aria-label')
  return {
    id,
    width: Math.round(box?.width ?? 0),
    height: Math.round(box?.height ?? 0),
    ariaLabel,
  }
}

test.describe('T27 — premium control touch targets (local preview)', () => {
  test('all new premium controls are >= 44px and the filter pill is labelled', async ({ page }) => {
    await bootExperience(page, {
      simplePremiumExperience: true,
      importStatement: true,
    })

    // Home CTA
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1600)
    await waitForOpaque(page, 'home-capture-cta')

    const results: Measurement[] = [await measure(page, 'home-capture-cta')]

    // Capture composer manual entry (premium)
    await gotoCapture(page)
    await waitForOpaque(page, 'capture-composer-manual')
    results.push(await measure(page, 'capture-composer-manual'))

    // Transactions disclosure pill
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1600)
    await waitForOpaque(page, 'transactions-filter-toggle')
    results.push(await measure(page, 'transactions-filter-toggle'))
    results.push(await measure(page, 'transactions-review-chip'))

    // Reports period picker
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1600)
    await waitForOpaque(page, 'reports-period-toggle')
    results.push(await measure(page, 'reports-period-toggle'))

    console.log('MEASURE touchTargets=' + JSON.stringify(results))

    for (const item of results) {
      expect(item.height, `${item.id} height`).toBeGreaterThanOrEqual(MIN_TARGET)
      expect(item.width, `${item.id} width`).toBeGreaterThanOrEqual(MIN_TARGET)
    }

    const filterPill = results.find((r) => r.id === 'transactions-filter-toggle')
    expect(filterPill?.ariaLabel, 'filter pill has an accessible name').toBeTruthy()
    expect(filterPill?.ariaLabel).toContain('Filter')

    // T27 follow-up (reviewer finding #2): the period picker had no accessible
    // name, so screen readers read the decorative ⌄/⌃ glyph instead.
    const periodToggle = results.find((r) => r.id === 'reports-period-toggle')
    expect(periodToggle?.ariaLabel, 'period picker has an accessible name').toBeTruthy()
    expect(periodToggle?.ariaLabel).toContain('Periode')
  })
})
