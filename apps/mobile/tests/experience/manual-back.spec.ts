import { expect, test } from '@playwright/test'
import { bootExperience, gotoCapture, waitForOpaque } from './harness'

/**
 * T12-F1 (finding #2) — browser/Android Back must stay inside the app.
 *
 * Before the fix: entering manual entry from Capture used replaceState, so
 * `history.length` did not grow and Back landed on `about:blank`.
 * After the fix (flag ON): one sentinel entry is buffered, Back consumes it and
 * returns the user to Capture.
 */

test.describe('T12-F1 — manual entry back guard (local preview)', () => {
  test('OFF keeps the legacy behaviour (no buffered entry)', async ({ page }) => {
    // Flag OFF renders the LEGACY capture UI, so the manual entry point is
    // `capture-secondary-manual` (the premium composer only exists when ON).
    await bootExperience(page, { simplePremiumExperience: false })
    await gotoCapture(page)
    await waitForOpaque(page, 'capture-secondary-manual')

    const before = await page.evaluate(() => window.history.length)
    await page.getByTestId('capture-secondary-manual').click()
    await page.waitForTimeout(1200)
    const after = await page.evaluate(() => window.history.length)
    console.log(
      'MEASURE f2Off=' +
        JSON.stringify({ before, after, delta: after - before, path: new URL(page.url()).pathname }),
    )

    expect(after - before, 'legacy path is untouched: no buffered entry').toBe(0)
  })

  test('ON buffers one history entry and Back returns to Capture', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: true })
    await gotoCapture(page)
    await waitForOpaque(page, 'capture-composer-manual')

    const before = await page.evaluate(() => window.history.length)
    await page.getByTestId('capture-composer-manual').click()
    await page.waitForTimeout(1400)
    const after = await page.evaluate(() => window.history.length)
    const manualPath = new URL(page.url()).pathname
    console.log(
      'MEASURE f2On=' + JSON.stringify({ before, after, delta: after - before, manualPath }),
    )

    expect(after - before, 'one buffered history entry').toBe(1)
    expect(manualPath).toContain('transaction-new')

    await page.goBack()
    await page.waitForTimeout(1400)
    const backPath = new URL(page.url()).pathname
    const alive = await page.evaluate(() => document.body.innerHTML.length > 0)
    console.log('MEASURE f2Back=' + JSON.stringify({ path: backPath, appAlive: alive }))

    expect(backPath, 'Back lands back on Capture, not about:blank').toContain('capture')
    expect(alive, 'app is still mounted after Back').toBe(true)

    const errors = await page.evaluate(() => (window as never as { __errs?: string[] }).__errs ?? [])
    expect(errors.filter((e) => e.includes('SecurityError'))).toHaveLength(0)
  })
})
