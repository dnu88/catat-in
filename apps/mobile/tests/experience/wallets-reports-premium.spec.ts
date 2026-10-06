import { expect, test } from '@playwright/test'
import { bootExperience, waitForOpaque } from './harness'

/**
 * T23 (Wallets: exactly one add CTA) and T24 (Reports: date/filter in a picker).
 *
 * Both must be flag-gated: OFF keeps the legacy layout byte-for-byte.
 */

const idsOf = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid]')).map((node) =>
      node.getAttribute('data-testid'),
    ),
  )

async function goto(page: import('@playwright/test').Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
}

test.describe('T23 — wallets add CTA (local preview)', () => {
  test('OFF keeps the legacy duplication (body CTA + header toggle)', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: false })
    await goto(page, '/wallets')

    const ids = await idsOf(page)
    console.log(
      'MEASURE t23Off=' +
        JSON.stringify({
          bodyCta: ids.includes('wallets-add-cta'),
          headerToggle: ids.includes('wallets-create-toggle'),
        }),
    )
    await expect(page.getByTestId('wallets-add-cta')).toBeVisible()
    await expect(page.getByTestId('wallets-create-toggle')).toBeVisible()
  })

  test('ON exposes exactly one add CTA and it still opens the form', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: true })
    await goto(page, '/wallets')
    await waitForOpaque(page, 'wallets-add-cta')

    const ids = await idsOf(page)
    console.log(
      'MEASURE t23On=' +
        JSON.stringify({
          bodyCta: ids.includes('wallets-add-cta'),
          headerToggle: ids.includes('wallets-create-toggle'),
          addCtaCount:
            (ids.includes('wallets-add-cta') ? 1 : 0) +
            (ids.includes('wallets-create-toggle') ? 1 : 0),
        }),
    )
    await expect(page.getByTestId('wallets-add-cta')).toBeVisible()
    await expect(page.getByTestId('wallets-create-toggle')).toHaveCount(0)

    // The remaining CTA must still work (form opens).
    await page.getByTestId('wallets-add-cta').click()
    await expect(page.getByTestId('wallet-create-form')).toBeVisible()
  })

  test('captures wallets before/after screenshots', async ({ page }) => {
    const width = page.viewportSize()?.width ?? 0
    await bootExperience(page, { simplePremiumExperience: false })
    await goto(page, '/wallets')
    await page.screenshot({ path: `test-results/experience/wallets-off-${width}.png` })

    await bootExperience(page, { simplePremiumExperience: true })
    await goto(page, '/wallets')
    await waitForOpaque(page, 'wallets-add-cta')
    await page.screenshot({ path: `test-results/experience/wallets-on-${width}.png` })
  })
})

test.describe('T24 — reports period picker (local preview)', () => {
  test('OFF keeps the always-visible period chips', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: false })
    await goto(page, '/reports')

    await expect(page.getByTestId('reports-period-chips')).toBeVisible()
    await expect(page.getByTestId('reports-period-toggle')).toHaveCount(0)
    await expect(page.getByTestId('reports-active-period-card')).toBeVisible()
  })

  test('ON folds the chips into a picker and reveals them on demand', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: true })
    await goto(page, '/reports')
    await waitForOpaque(page, 'reports-period-toggle')

    const collapsed = await idsOf(page)
    console.log(
      'MEASURE t24Collapsed=' +
        JSON.stringify({
          toggle: collapsed.includes('reports-period-toggle'),
          chips: collapsed.includes('reports-period-chips'),
          activePeriodCard: collapsed.includes('reports-active-period-card'),
        }),
    )
    await expect(page.getByTestId('reports-period-chips')).toHaveCount(0)
    await expect(page.getByTestId('reports-active-period-card')).toBeVisible()

    await page.getByTestId('reports-period-toggle').click()
    await expect(page.getByTestId('reports-period-chips')).toBeVisible()
    const expanded = await idsOf(page)
    console.log(
      'MEASURE t24Expanded=' +
        JSON.stringify({ chips: expanded.includes('reports-period-chips') }),
    )
  })

  test('captures reports before/after screenshots', async ({ page }) => {
    const width = page.viewportSize()?.width ?? 0
    await bootExperience(page, { simplePremiumExperience: false })
    await goto(page, '/reports')
    await page.screenshot({ path: `test-results/experience/reports-off-${width}.png` })

    await bootExperience(page, { simplePremiumExperience: true })
    await goto(page, '/reports')
    await waitForOpaque(page, 'reports-period-toggle')
    await page.screenshot({ path: `test-results/experience/reports-on-${width}.png` })
  })
})
