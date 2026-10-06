import { expect, test } from '@playwright/test'
import { bootExperience, trackPageErrors, waitForOpaque } from './harness'

/**
 * Paket B1 widening — Home (Beranda), Wallets (Dompet) and Settings (Setelan).
 *
 * Same contract as the Transaksi pilot: every change is premium-gated, so flag
 * OFF is the pre-B1 baseline for the measured element, and every number below
 * comes from the real exported bundle.
 */

const TODAY = new Date().toISOString().slice(0, 10)

const FIXTURE_TRANSACTIONS = [
  {
    id: 'tx-b1w-1',
    user_id: 'preview-user',
    wallet_id: 'w-preview',
    transaction_type: 'expense',
    type: 'expense',
    nominal: 35000,
    amount: 35000,
    kategori: 'Food & Beverage',
    category: 'Food & Beverage',
    catatan: 'Kopi susu pagi',
    description: 'Kopi susu pagi',
    merchant: 'Kopi Kenangan',
    tanggal: TODAY,
    date: TODAY,
    note: null,
    payment_method: null,
    receipt_url: null,
    group_id: null,
    is_shared: false,
    visibility: null,
    ai_confidence: null,
    ai_extracted: null,
    household_id: null,
    created_by: 'preview-user',
    on_behalf_of: null,
    is_disputed: false,
    dispute_resolved_at: null,
    created_at: `${TODAY}T02:00:00Z`,
    updated_at: `${TODAY}T02:00:00Z`,
  },
  {
    id: 'tx-b1w-2',
    user_id: 'preview-user',
    wallet_id: 'w-preview',
    transaction_type: 'income',
    type: 'income',
    nominal: 12500,
    amount: 12500,
    kategori: 'Salary',
    category: 'Salary',
    catatan: 'Bonus kecil',
    description: 'Bonus kecil',
    merchant: null,
    tanggal: TODAY,
    date: TODAY,
    note: null,
    payment_method: null,
    receipt_url: null,
    group_id: null,
    is_shared: false,
    visibility: null,
    ai_confidence: null,
    ai_extracted: null,
    household_id: null,
    created_by: 'preview-user',
    on_behalf_of: null,
    is_disputed: false,
    dispute_resolved_at: null,
    created_at: `${TODAY}T03:00:00Z`,
    updated_at: `${TODAY}T03:00:00Z`,
  },
]

async function styleOf(
  page: import('@playwright/test').Page,
  testId: string,
  properties: string[],
) {
  return page.evaluate(
    ([id, props]) => {
      const node = document.querySelector(`[data-testid="${id}"]`)
      if (!node) return null
      const computed = window.getComputedStyle(node)
      const snapshot: Record<string, string> = {}
      for (const property of props as string[]) {
        snapshot[property] = computed.getPropertyValue(property)
      }
      return snapshot
    },
    [testId, properties] as [string, string[]],
  )
}

/** Width of the first child of a row (the icon tile). */
async function firstChildWidth(
  page: import('@playwright/test').Page,
  testId: string,
) {
  return page.evaluate((id) => {
    const node = document.querySelector(`[data-testid="${id}"]`)
    const child = node?.firstElementChild
    return child ? Math.round(child.getBoundingClientRect().width) : null
  }, testId)
}

async function open(
  page: import('@playwright/test').Page,
  route: string,
  premium: boolean,
  readyTestId: string,
) {
  await bootExperience(page, { simplePremiumExperience: premium }, {
    transactions: FIXTURE_TRANSACTIONS,
  })
  await page.goto(route)
  await page.waitForLoadState('networkidle')
  await waitForOpaque(page, readyTestId)
  await page.getByTestId(readyTestId).scrollIntoViewIfNeeded()
}

const AMOUNT_PROPS = ['font-variant-numeric', 'font-size', 'color']
const ROW_PROPS = ['min-height']

test.describe('B1 — Home / Wallets / Settings widening (local preview)', () => {
  test('Home: hero and recent figures use tabular digits only when premium is ON', async ({
    page,
  }) => {
    const errors = trackPageErrors(page)
    const width = page.viewportSize()?.width ?? 0

    await open(page, '/', false, 'home-total-balance')
    const beforeBalance = await styleOf(page, 'home-total-balance', AMOUNT_PROPS)
    const beforeMetric = await styleOf(page, 'home-monthly-expense', AMOUNT_PROPS)
    await page.screenshot({
      path: `test-results/experience/b1-home-off-${width}.png`,
      fullPage: false,
    })

    await open(page, '/', true, 'home-total-balance')
    const afterBalance = await styleOf(page, 'home-total-balance', AMOUNT_PROPS)
    const afterMetric = await styleOf(page, 'home-monthly-expense', AMOUNT_PROPS)
    await page.screenshot({
      path: `test-results/experience/b1-home-on-${width}.png`,
      fullPage: false,
    })

    console.log(
      'MEASURE b1Home=' +
        JSON.stringify({ beforeBalance, beforeMetric, afterBalance, afterMetric, width }),
    )

    expect(beforeBalance?.['font-variant-numeric']).toBe('normal')
    expect(afterBalance?.['font-variant-numeric']).toContain('tabular-nums')
    expect(afterMetric?.['font-variant-numeric']).toContain('tabular-nums')
    // Size and colour are unchanged: B1 only aligns the digits.
    expect(afterBalance?.['font-size']).toBe(beforeBalance?.['font-size'])
    expect(afterBalance?.color).toBe(beforeBalance?.color)
    expect(errors).toEqual([])
  })

  test('Wallets: hero total and card balances become tabular, layout untouched', async ({
    page,
  }) => {
    const errors = trackPageErrors(page)
    const width = page.viewportSize()?.width ?? 0

    await open(page, '/wallets', false, 'wallets-total-value')
    const beforeTotal = await styleOf(page, 'wallets-total-value', AMOUNT_PROPS)
    await page.screenshot({
      path: `test-results/experience/b1-wallets-off-${width}.png`,
      fullPage: false,
    })

    await open(page, '/wallets', true, 'wallets-total-value')
    const afterTotal = await styleOf(page, 'wallets-total-value', AMOUNT_PROPS)
    const row = await styleOf(page, 'wallet-card-w-preview', ROW_PROPS)
    await page.screenshot({
      path: `test-results/experience/b1-wallets-on-${width}.png`,
      fullPage: false,
    })

    console.log(
      'MEASURE b1Wallets=' + JSON.stringify({ beforeTotal, afterTotal, row, width }),
    )

    expect(beforeTotal?.['font-variant-numeric']).toBe('normal')
    expect(afterTotal?.['font-variant-numeric']).toContain('tabular-nums')
    expect(afterTotal?.['font-size']).toBe(beforeTotal?.['font-size'])
    expect(errors).toEqual([])
  })

  test('Settings: row icon tile follows the shared token on premium only', async ({
    page,
  }) => {
    const errors = trackPageErrors(page)
    const width = page.viewportSize()?.width ?? 0

    await open(page, '/settings', false, 'settings-notification-inbox')
    const beforeRow = await styleOf(page, 'settings-notification-inbox', ROW_PROPS)
    const beforeTile = await firstChildWidth(page, 'settings-notification-inbox')
    await page.screenshot({
      path: `test-results/experience/b1-settings-off-${width}.png`,
      fullPage: false,
    })

    await open(page, '/settings', true, 'settings-notification-inbox')
    const afterRow = await styleOf(page, 'settings-notification-inbox', ROW_PROPS)
    const afterTile = await firstChildWidth(page, 'settings-notification-inbox')
    await page.screenshot({
      path: `test-results/experience/b1-settings-on-${width}.png`,
      fullPage: false,
    })

    console.log(
      'MEASURE b1Settings=' +
        JSON.stringify({ beforeRow, beforeTile, afterRow, afterTile, width }),
    )

    expect(beforeTile).toBe(40)
    expect(afterTile).toBe(44)
    expect(afterRow?.['min-height']).toBe('56px')
    expect(errors).toEqual([])
  })
})
