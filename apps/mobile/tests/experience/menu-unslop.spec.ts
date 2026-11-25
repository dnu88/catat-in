import { expect, test, type Page } from '@playwright/test'
import { SUPABASE_HOST, bootExperience, trackPageErrors } from './harness'

/**
 * Unslop pass across every authenticated PWA menu (follows the Beranda pilot).
 *
 * Measured in the real exported bundle, not from style objects:
 *  - each changed hero caption renders at the polished alpha when ON and keeps
 *    its own legacy alpha when OFF (so the gate is proven per route);
 *  - controls that were below 44px measure >= 44px ON and keep their size OFF;
 *  - no horizontal overflow and no page errors on any authenticated menu.
 */

const POLISHED_ALPHA = 0.9

/** One always-rendered caption per route, with its legacy (OFF) alpha. */
const CAPTIONS: { path: string; text: string; legacyAlpha: number }[] = [
  { path: '/transactions', text: 'Pantau arus kas harianmu dengan detail.', legacyAlpha: 0.64 },
  { path: '/reports', text: 'Ringkasan performa finansial bulanan.', legacyAlpha: 0.64 },
  { path: '/wallets', text: 'Kelola saldo pribadi dan keluarga.', legacyAlpha: 0.64 },
  { path: '/capture', text: 'Pilih cara tercepat. Kaswise rapikan sisanya.', legacyAlpha: 0.72 },
  { path: '/transaction-new', text: 'Input transaksi secara manual tanpa AI.', legacyAlpha: 0.68 },
  {
    path: '/imports',
    text: 'Unggah CSV, XLSX, atau PDF dari bank atau dompet digital. Periksa pratinjau sebelum menyimpan transaksi.',
    legacyAlpha: 0.72,
  },
  { path: '/settings', text: 'preview@example.invalid', legacyAlpha: 0.68 },
  { path: '/budgets', text: 'Kelola budget sederhana per kategori pengeluaran.', legacyAlpha: 0.68 },
  { path: '/bills', text: 'Kelola pengingat tagihan rutin.', legacyAlpha: 0.68 },
  { path: '/groups', text: 'Pantau keuangan keluarga dari satu ruang bersama.', legacyAlpha: 0.68 },
  { path: '/upgrade', text: 'Foto struk OCR, chat AI 200/bulan, AI Insight', legacyAlpha: 0.72 },
]

const SMOKE_ROUTES = ['/notifications']

const BILL_ROW = {
  id: 'bill-preview',
  user_id: 'preview-user',
  household_id: null,
  name: 'Listrik rumah',
  amount: 450000,
  due_day: 28,
  recurrence: 'monthly',
  next_due_date: '2099-12-28',
  notify_before_days: 3,
  is_paid: false,
  payment_history: [],
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
}

function envelopeRow() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return {
    id: 'env-preview',
    user_id: 'preview-user',
    household_id: null,
    name: 'Makan harian',
    parent_category_id: null,
    limit_amount: 1500000,
    start_date: `${month}-01`,
    end_date: `${month}-${pad(last)}`,
    icon: null,
    color: null,
    notes: null,
    status: 'active',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    category: null,
  }
}

test.use({ serviceWorkers: 'block' })

/** Registered after bootExperience, so these win over the generic empty answer. */
async function seedRows(page: Page) {
  const rows: Record<string, unknown[]> = {
    bill_reminders: [BILL_ROW],
    budget_envelopes: [envelopeRow()],
  }
  for (const [table, body] of Object.entries(rows)) {
    await page.route(`**/${SUPABASE_HOST}/rest/v1/${table}**`, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: { 'content-range': `0-${body.length - 1}/${body.length}` },
            body: JSON.stringify(body),
          })
        : route.fallback(),
    )
  }
}

async function boot(page: Page, premium: boolean) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await bootExperience(page, { simplePremiumExperience: premium, importStatement: true })
  await seedRows(page)
}

/** Alpha of the white text color of the element that owns `text`. */
async function whiteAlpha(page: Page, text: string) {
  const node = page.getByText(text, { exact: true }).first()
  await expect(node).toBeVisible()
  const color = await node.evaluate((el) => getComputedStyle(el).color)
  const match = /^rgba?\(255, 255, 255(?:, ([0-9.]+))?\)$/.exec(color)
  expect(match, `${text} renders white, got ${color}`).not.toBeNull()
  return Number(match![1] ?? 1)
}

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
}

async function shot(page: Page, premium: boolean, path: string) {
  const width = page.viewportSize()!.width
  await page.screenshot({
    path: `test-results/menu-unslop/${premium ? 'on' : 'off'}-${width}${path.replace(/\//g, '-')}.png`,
    animations: 'disabled',
  })
}

for (const premium of [false, true]) {
  test(`hero captions per menu — premium ${premium ? 'ON' : 'OFF'}`, async ({ page }) => {
    const errors = trackPageErrors(page)
    await boot(page, premium)
    const measured: Record<string, number> = {}

    for (const { path, text, legacyAlpha } of CAPTIONS) {
      await page.goto(path)
      const alpha = await whiteAlpha(page, text)
      measured[path] = alpha
      expect(alpha, `${path} caption alpha`).toBeCloseTo(premium ? POLISHED_ALPHA : legacyAlpha, 2)
      expect(await overflow(page), `${path} horizontal overflow`).toBeLessThanOrEqual(0)
      await shot(page, premium, path)
    }

    for (const path of SMOKE_ROUTES) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      expect(await overflow(page), `${path} horizontal overflow`).toBeLessThanOrEqual(0)
      await shot(page, premium, path)
    }

    console.log(
      'MENU_UNSLOP ' + JSON.stringify({ premium, width: page.viewportSize()!.width, captionAlpha: measured }),
    )
    expect(errors).toEqual([])
  })
}

test('small controls reach 44px only when polished', async ({ page }) => {
  const measure = async (premium: boolean) => {
    await boot(page, premium)
    const height = async (name: RegExp | string) => {
      const control = page.getByRole('button', { name }).first()
      await expect(control).toBeVisible()
      return Math.round((await control.boundingBox())!.height)
    }

    await page.goto('/budgets')
    const edit = await height(/^Edit Makan harian$/)
    const remove = await height(/^Hapus Makan harian$/)

    await page.goto('/groups')
    // The create form (and its submit) only exists after opening it.
    await page.getByRole('button', { name: 'Buat keluarga baru' }).first().click()
    const saveFamily = await height('Simpan keluarga')

    return { edit, remove, saveFamily }
  }

  const off = await measure(false)
  const on = await measure(true)
  console.log('MENU_UNSLOP_TARGETS ' + JSON.stringify({ off, on }))

  for (const [id, value] of Object.entries(on)) {
    expect(value, `${id} ON height`).toBeGreaterThanOrEqual(44)
  }
  for (const [id, value] of Object.entries(off)) {
    expect(value, `${id} OFF keeps its legacy size`).toBeLessThan(44)
  }
})
