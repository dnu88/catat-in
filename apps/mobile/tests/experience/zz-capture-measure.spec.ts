import { test } from '@playwright/test'
import { SUPABASE_HOST, bootExperience } from './harness'

test.use({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })

const WALLETS = [
  { id: 'w-gopay', user_id: 'preview-user', household_id: null, name: 'GoPay', type: 'e-wallet', balance: 342000, currency: 'IDR', is_active: true, created_at: '2026-02-11T00:00:00Z' },
]

test('measure capture deltas', async ({ page }) => {
  await bootExperience(page, { simplePremiumExperience: true })
  await page.route(`**/${SUPABASE_HOST}/rest/v1/wallets**`, (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify(WALLETS) })
      : route.fallback(),
  )
  await page.goto('/capture')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2500)

  const out = await page.evaluate(() => {
    const pick = (text: string) => {
      const el = Array.from(document.querySelectorAll('div,span')).find((n) => (n as HTMLElement).innerText?.trim() === text)
      if (!el) return null
      const s = getComputedStyle(el)
      return { size: s.fontSize, weight: s.fontWeight, tracking: s.letterSpacing, transform: s.textTransform, radius: s.borderRadius, border: s.borderTopWidth }
    }
    const submit = Array.from(document.querySelectorAll('[role="button"],div')).find((n) => (n as HTMLElement).innerText?.trim() === 'Catat')
    const ss = submit ? getComputedStyle(submit) : null
    const ta = document.querySelector('textarea')
    const tsa = ta ? getComputedStyle(ta) : null
    return {
      caption: pick('Tujuan'),
      heroTitle: pick('Catat transaksi'),
      submitText: pick('Catat'),
      submitRadius: ss?.borderRadius,
      textareaBorder: tsa?.borderTopWidth,
      textareaRadius: tsa?.borderRadius,
    }
  })
  console.log('MEASURE_ON >>> ' + JSON.stringify(out))

  // OFF: nilai baseline
  await bootExperience(page, { simplePremiumExperience: false })
  await page.goto('/capture')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  const off = await page.evaluate(() => {
    const pick = (text: string) => {
      const el = Array.from(document.querySelectorAll('div,span')).find((n) => (n as HTMLElement).innerText?.trim() === text)
      if (!el) return null
      const s = getComputedStyle(el)
      return { size: s.fontSize, weight: s.fontWeight, tracking: s.letterSpacing, transform: s.textTransform }
    }
    return { caption: pick('TUJUAN'), heroTitle: pick('Catat transaksi') }
  })
  console.log('MEASURE_OFF >>> ' + JSON.stringify(off))
})
