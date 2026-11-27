import { expect, test } from '@playwright/test'
import { bootExperience } from './harness'

/**
 * A 200 pricing response with a partial body used to crash /upgrade into the
 * global error boundary (`rp(undefined)`). It must land on the retry state, and
 * retrying with a valid body must recover the plans.
 */
test('malformed pricing shows the retry state and recovers on retry', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await bootExperience(page, { simplePremiumExperience: true })
  let valid = false
  // Registered after the harness stub, so it takes precedence for this route.
  await page.route('**/api.kaswise.com/api/v1/payments/pricing', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(valid ? { tier: 'promo', monthly: 29000, yearly: 249000 } : {}),
    }),
  )
  await page.goto('/upgrade')
  await expect(page.getByText('Gagal memuat harga', { exact: true })).toBeVisible()
  await expect(page.getByText('Aplikasi bermasalah', { exact: true })).toHaveCount(0)

  valid = true
  await page.getByText('Coba Lagi', { exact: true }).click()
  await expect(page.getByText('Rp29.000', { exact: true })).toBeVisible()
  await expect(page.getByText('Rp249.000', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
