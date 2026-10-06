import { expect, test } from '@playwright/test'
import { bootExperience, gotoCapture, waitForOpaque } from './harness'

/**
 * Local Experience preview (P6/T26 + T12 measurements).
 *
 * Shared stubs live in ./harness.ts; this file only asserts the OFF vs ON
 * presentation contract of the capture surface.
 */

test.describe('Capture experience — flag OFF vs ON (local preview)', () => {
  test('OFF keeps the legacy capture workspace', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: false })
    await gotoCapture(page)

    await expect(page.getByTestId('capture-input')).toBeVisible()
    await expect(page.getByTestId('capture-mode-Teks')).toBeVisible()
    await expect(page.getByTestId('capture-composer')).toHaveCount(0)
  })

  test('ON swaps in the single-CTA composer', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: true })
    await gotoCapture(page)

    await waitForOpaque(page, 'capture-composer')
    await expect(page.getByTestId('capture-composer')).toBeVisible()
    await expect(page.getByTestId('capture-composer-submit')).toHaveCount(1)
    // Legacy idle workspace and mode chips are gone.
    await expect(page.getByTestId('capture-input')).toHaveCount(0)
    await expect(page.getByTestId('capture-mode-Teks')).toHaveCount(0)
    await expect(page.getByTestId('capture-composer-manual')).toBeVisible()
    await expect(page.getByTestId('capture-composer-receipt')).toBeVisible()
  })

  test('ON keeps every interactive target at or above 44px', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: true })
    await gotoCapture(page)
    await waitForOpaque(page, 'capture-composer')

    const ids = [
      'capture-composer-submit',
      'capture-composer-manual',
      'capture-composer-receipt',
    ]
    for (const id of ids) {
      const box = await page.getByTestId(id).boundingBox()
      expect(box, `${id} must have a box`).not.toBeNull()
      expect(box!.height, `${id} height`).toBeGreaterThanOrEqual(44)
    }
  })

  // RESOLVED 2026-10-03: this interaction previously failed in the built bundle
  // because `dist/` was STALE (exported before the T18 wiring landed). After
  // re-exporting from current source it passes: pressing "Struk" surfaces the
  // receipt intake. Kept as a real (non-fixme) test so a stale bundle or a real
  // premium-mode regression can never slip through again.
  test('ON reaches the receipt intake from the composer', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: true })
    await gotoCapture(page)
    await waitForOpaque(page, 'capture-composer')

    await page.getByTestId('capture-composer-receipt').click()
    await expect(page.getByTestId('capture-receipt-pick')).toBeVisible()
    expect(new URL(page.url()).pathname).toContain('capture')
  })

  test('captures before/after screenshots for the current viewport', async ({
    page,
  }, testInfo) => {
    const width = page.viewportSize()?.width ?? 0

    await bootExperience(page, { simplePremiumExperience: false })
    await gotoCapture(page)
    await expect(page.getByTestId('capture-input')).toBeVisible()
    await page.screenshot({
      path: `test-results/experience/experience-off-${width}.png`,
      fullPage: false,
    })

    await bootExperience(page, { simplePremiumExperience: true })
    await gotoCapture(page)
    await waitForOpaque(page, 'capture-composer')
    await page.screenshot({
      path: `test-results/experience/experience-on-${width}.png`,
      fullPage: false,
    })

    expect(testInfo.project.name).toContain('preview')
  })
})
