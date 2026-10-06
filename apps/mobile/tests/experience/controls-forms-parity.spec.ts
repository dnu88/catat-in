import { test, expect } from '@playwright/test'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { bootExperience, stubSession, WALLET_ROW } from './harness'

// Both builds run under the SAME origin, fixtures, clock and renderer.
// The immutable pre-CF snapshot remains baseline even after deployment.
const production = '/home/Danu88/nginx-proxy-manager/placeholder'
const baseline = readFileSync('/tmp/kaswise-cf-rollback-path', 'utf8').trim()
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex')

for (const width of [360, 390, 430]) test(`CF OFF exact parity ${width}`, async ({ browser }) => {
  const results: { bytes: Buffer; structure: unknown }[] = []
  for (const [label, root] of [['baseline', baseline], ['deployed', production]]) {
    const html = readFileSync(join(root, 'index.html'), 'utf8')
    const name = html.match(/entry-[a-f0-9]+\.js/)![0]
    const bundle = readFileSync(join(root, '_expo/static/js/web', name), 'utf8')
    const host = bundle.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/)![1]
    const context = await browser.newContext({ viewport: { width, height: 932 }, reducedMotion: 'reduce' })
    try {
      const page = await context.newPage()
      await bootExperience(page, { simplePremiumExperience: false })
      await page.addInitScript(([key, session]) => {
        localStorage.setItem(key, session)
        localStorage.setItem('kaswise:language-preference', 'id')
        const NativeDate = Date
        const fixed = new NativeDate('2026-10-05T05:00:00Z').getTime()
        class FixedDate extends NativeDate {
          constructor(...args: any[]) { super(...(args.length ? args : [fixed]) as [any]) }
          static now() { return fixed }
        }
        ;(window as any).Date = FixedDate
      }, [`sb-${host}-auth-token`, JSON.stringify({ ...stubSession(), expires_at: 2000000000 })])
      await page.route('**/*.supabase.co/**', async r => {
        const u = r.request().url()
        const body = u.includes('/auth/v1/') ? stubSession() : u.includes('/wallets') ? [WALLET_ROW, { ...WALLET_ROW, id: 'w-target', name: 'Second Wallet' }] : u.includes('/categories') ? [{ id: 'c-food', name: 'Food & Beverage', type: 'expense', user_id: 'preview-user', household_id: null }] : []
        await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
      })
      await page.route('https://app.kaswise.com/**', async r => {
        const path = new URL(r.request().url()).pathname
        if (r.request().isNavigationRequest()) return r.fulfill({ status: 200, contentType: 'text/html', body: html })
        const own = join(root, path)
        const asset = existsSync(own) ? own : join(production, path)
        if (!existsSync(asset)) return r.abort('failed')
        return r.fulfill({ path: asset })
      })
      await page.goto('https://app.kaswise.com/transaction-new')
      await page.waitForLoadState('networkidle')
      await page.evaluate(() => document.fonts.ready)
      let previous = ''; let stable = 0; let bytes = Buffer.alloc(0)
      for (let attempt = 0; attempt < 15 && stable < 2; attempt++) {
        await expect(page.getByTestId('transaction-fields-amount')).toBeVisible()
        await page.waitForFunction(() => ['transaction-fields-amount', 'transaction-fields-category', 'transaction-fields-wallet', 'transaction-fields-date'].every(id => {
          let el: Element | null = document.querySelector(`[data-testid="${id}"]`)
          if (!el) return false
          while (el) { if (Number(getComputedStyle(el).opacity) < 0.999) return false; el = el.parentElement }
          return true
        }))
        bytes = await page.screenshot({ animations: 'disabled', caret: 'hide', fullPage: true })
        const current = hash(bytes); stable = current === previous ? stable + 1 : 0; previous = current
      }
      expect(stable, `${label}: screenshot must settle across three captures`).toBe(2)
      const structure = await page.evaluate(() => [...document.querySelectorAll('[data-testid]')].filter(el => el.getBoundingClientRect().height > 0).map(el => {
        const r = el.getBoundingClientRect()
        return { id: el.getAttribute('data-testid'), text: (el as HTMLElement).innerText, box: [r.x, r.y, r.width, r.height] }
      }))
      mkdirSync('test-results/experience', { recursive: true })
      writeFileSync(`test-results/experience/cf-reconfirmed-${label}-off-${width}.png`, bytes)
      results.push({ bytes, structure })
    } finally { await context.close() }
  }
  expect(results[1].structure).toEqual(results[0].structure)
  expect(hash(results[1].bytes)).toBe(hash(results[0].bytes))
})
