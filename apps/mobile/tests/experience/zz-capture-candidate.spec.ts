import { test, type Page } from '@playwright/test'
import { SUPABASE_HOST, bootExperience } from './harness'

/**
 * One-off: render kandidat unslop Capture (premium, mode Teks, kuota 0/25,
 * dompet GoPay) pada 390x844 dpr2. Dihapus setelah dipakai.
 */

test.use({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })

const OUT = process.env.AUDIT_OUT ?? 'test-results/audit'

const WALLETS = [
  { id: 'w-gopay', user_id: 'preview-user', household_id: null, name: 'GoPay', type: 'e-wallet', balance: 342000, currency: 'IDR', is_active: true, created_at: '2026-02-11T00:00:00Z' },
  { id: 'w-bca', user_id: 'preview-user', household_id: null, name: 'BCA Utama', type: 'bank', balance: 12480500, currency: 'IDR', is_active: true, created_at: '2026-01-04T00:00:00Z' },
]

async function seed(page: Page) {
  await page.route(`**/${SUPABASE_HOST}/rest/v1/wallets**`, (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          status: 200, contentType: 'application/json',
          headers: { 'content-range': `0-${WALLETS.length - 1}/${WALLETS.length}` },
          body: JSON.stringify(WALLETS),
        })
      : route.fallback(),
  )
  // Kuota premium 0/25 seperti fixture audit.
  await page.route('**/api.kaswise.com/**', (route) => {
    const url = route.request().url()
    const body = url.includes('/me/entitlements')
      ? { plan: 'premium', period_ym: '2026-11', chat_used: 0, chat_limit: 25, photo_used: 0, photo_limit: 50 }
      : url.includes('/payments/pricing')
        ? { tier: 'normal', monthly: 29000, yearly: 290000 }
        : {}
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
  })
}

test('capture candidate — 390x844 dpr2', async ({ page }) => {
  await bootExperience(page, { simplePremiumExperience: true })
  await seed(page)
  await page.goto('/capture')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2600)
  const body = (await page.locator('body').innerText()).replace(/\n+/g, ' | ')
  console.log('CAPTURE_TEXT >>> ' + body.slice(0, 700))
  await page.screenshot({ path: `${OUT}/capture-candidate.png`, animations: 'disabled' })
})
