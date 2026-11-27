import { expect, test } from '@playwright/test'
import { bootExperience, waitForOpaque } from './harness'

/**
 * T21 (simple premium) — Home leads with saldo -> income/expense -> recent and
 * exposes exactly ONE record CTA. The decorative wallet stack and every existing
 * section must stay untouched, and no new filler card is added.
 */

const idsOf = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid]')).map((node) =>
      node.getAttribute('data-testid'),
    ),
  )

async function gotoHome(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1800)
}

test.describe('T21 — home CTA and hierarchy (local preview)', () => {
  test('OFF keeps Home without the premium CTA', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: false })
    await gotoHome(page)

    const ids = await idsOf(page)
    console.log(
      'MEASURE t21Off=' +
        JSON.stringify({
          cta: ids.includes('home-capture-cta'),
          hero: ids.includes('home-hero-card'),
          total: ids.includes('home-total-balance'),
        }),
    )
    await expect(page.getByTestId('home-capture-cta')).toHaveCount(0)
    await expect(page.getByTestId('home-hero-card')).toBeVisible()
    await expect(page.getByTestId('home-total-balance')).toBeVisible()

    // finding #1: legacy empty state keeps pointing at the "+" tab button
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    console.log('MEASURE f1Off=' + JSON.stringify({ pointsAtPlus: body.includes('tombol +') }))
    expect(body).toContain('tombol +')
    expect(body).not.toContain('Ketuk "Catat transaksi"')
  })

  test('ON exposes exactly one record CTA that reaches capture', async ({ page }) => {
    await bootExperience(page, { simplePremiumExperience: true })
    await gotoHome(page)
    await waitForOpaque(page, 'home-capture-cta')

    const ids = await idsOf(page)
    console.log(
      'MEASURE t21On=' +
        JSON.stringify({
          ctaCount: ids.filter((id) => id === 'home-capture-cta').length,
          hero: ids.includes('home-hero-card'),
          total: ids.includes('home-total-balance'),
          expense: ids.includes('home-monthly-expense'),
          remaining: ids.includes('home-monthly-remaining'),
        }),
    )

    // Hierarchy keeps saldo -> income/expense, and the stack stays decorative.
    await expect(page.getByTestId('home-hero-card')).toBeVisible()
    await expect(page.getByTestId('home-total-balance')).toBeVisible()
    await expect(page.getByTestId('home-monthly-expense')).toBeVisible()
    await expect(page.getByTestId('home-capture-cta')).toHaveCount(1)

    const box = await page.getByTestId('home-capture-cta').boundingBox()
    expect(box, 'CTA must have a box').not.toBeNull()
    expect(box!.height, 'CTA height').toBeGreaterThanOrEqual(44)

    // finding #1: premium empty state now points at the CTA, not the "+" tab
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    console.log('MEASURE f1On=' + JSON.stringify({ pointsAtCta: body.includes('Ketuk "Catat transaksi"') }))
    expect(body).toContain('Ketuk "Catat transaksi"')
    expect(body).not.toContain('tombol +')

    await page.getByTestId('home-capture-cta').click()
    await page.waitForTimeout(1500)
    console.log('MEASURE t21CtaTarget=' + JSON.stringify({ path: new URL(page.url()).pathname }))
    expect(new URL(page.url()).pathname).toContain('capture')
  })

  test('captures home before/after screenshots', async ({ page }) => {
    const width = page.viewportSize()?.width ?? 0
    await bootExperience(page, { simplePremiumExperience: false })
    await gotoHome(page)
    await page.screenshot({ path: `test-results/experience/home-off-${width}.png` })

    await bootExperience(page, { simplePremiumExperience: true })
    await gotoHome(page)
    await waitForOpaque(page, 'home-capture-cta')
    await page.screenshot({ path: `test-results/experience/home-on-${width}.png` })
  })
})
