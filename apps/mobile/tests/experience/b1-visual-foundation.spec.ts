import { expect, test } from '@playwright/test'
import { bootExperience, trackPageErrors, waitForOpaque } from './harness'

/**
 * Paket B1 — visual foundation (G03 typography/tabular figures, G04 row rhythm,
 * G06 control states, G07 icon tiles) on the pilot screen (Transaksi).
 *
 * Flag OFF is the pre-B1 baseline: for these elements the legacy and premium
 * surfaces rendered identically before B1, so OFF is a faithful "before".
 * Every number below is measured in the real exported bundle, not asserted from
 * source.
 */

const TODAY = new Date().toISOString().slice(0, 10)

const FIXTURE_TRANSACTIONS = [
  {
    id: 'tx-b1-1',
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
    id: 'tx-b1-2',
    user_id: 'preview-user',
    wallet_id: 'w-preview',
    transaction_type: 'expense',
    type: 'expense',
    nominal: 1250000,
    amount: 1250000,
    kategori: 'Housing',
    category: 'Housing',
    catatan: 'Sewa bulanan',
    description: 'Sewa bulanan',
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
  {
    id: 'tx-b1-3',
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
    created_at: `${TODAY}T04:00:00Z`,
    updated_at: `${TODAY}T04:00:00Z`,
  },
]

type StyleSnapshot = Record<string, string>

async function styleOf(
  page: import('@playwright/test').Page,
  testId: string,
  properties: string[],
): Promise<StyleSnapshot | null> {
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

const AMOUNT_PROPS = ['font-variant-numeric', 'font-size', 'font-weight', 'color']
const ROW_PROPS = ['min-height']
const ICON_PROPS = ['width', 'height']
const CHIP_PROPS = ['min-height', 'border-top-width', 'border-top-color']

async function openTransactions(
  page: import('@playwright/test').Page,
  premium: boolean,
) {
  await bootExperience(page, { simplePremiumExperience: premium }, {
    transactions: FIXTURE_TRANSACTIONS,
  })
  await page.goto('/transactions')
  await page.waitForLoadState('networkidle')
  await waitForOpaque(page, 'transaction-row-tx-b1-1')
  await page.getByTestId('transaction-row-tx-b1-1').scrollIntoViewIfNeeded()
}

test.describe('B1 — transactions visual foundation (local preview)', () => {
  test('measures the pre-B1 baseline (flag OFF) with fixture rows', async ({ page }) => {
    const errors = trackPageErrors(page)
    const width = page.viewportSize()?.width ?? 0

    await openTransactions(page, false)

    const amount = await styleOf(page, 'transaction-amount-tx-b1-1', AMOUNT_PROPS)
    const row = await styleOf(page, 'transaction-row-tx-b1-1', ROW_PROPS)
    const icon = await styleOf(page, 'transaction-icon-tx-b1-1', ICON_PROPS)
    const chip = await styleOf(page, 'transactions-period-month', CHIP_PROPS)

    console.log(
      'MEASURE b1Before=' + JSON.stringify({ amount, row, icon, chip, width }),
    )

    expect(amount?.color).toBe('rgb(38, 50, 70)') // fe.financialExpense
    expect(row?.['min-height']).toBe('58px')
    expect(icon?.width).toBe('40px')

    await page.screenshot({
      path: `test-results/experience/b1-transactions-off-${width}.png`,
      fullPage: false,
    })
    expect(errors).toEqual([])
  })

  test('measures the B1 result (flag ON): tabular figures, token rhythm, calm chips', async ({
    page,
  }) => {
    const errors = trackPageErrors(page)
    const width = page.viewportSize()?.width ?? 0

    await openTransactions(page, true)

    const amount = await styleOf(page, 'transaction-amount-tx-b1-1', AMOUNT_PROPS)
    const incomeAmount = await styleOf(
      page,
      'transaction-amount-tx-b1-3',
      AMOUNT_PROPS,
    )
    const bigAmount = await styleOf(
      page,
      'transaction-amount-tx-b1-2',
      AMOUNT_PROPS,
    )
    const row = await styleOf(page, 'transaction-row-tx-b1-1', ROW_PROPS)
    const icon = await styleOf(page, 'transaction-icon-tx-b1-1', ICON_PROPS)
    const chip = await styleOf(page, 'transactions-period-month', CHIP_PROPS)

    console.log(
      'MEASURE b1After=' +
        JSON.stringify({ amount, bigAmount, row, icon, chip, width }),
    )

    // G03 — every figure uses tabular digits, in the semantic color.
    expect(amount?.['font-variant-numeric']).toContain('tabular-nums')
    expect(bigAmount?.['font-variant-numeric']).toContain('tabular-nums')
    expect(amount?.color).toBe('rgb(38, 50, 70)')
    expect(incomeAmount?.color).toBe('rgb(22, 143, 168)') // fe.financialIncome

    // G04 — row rhythm comes from the token, not a one-off literal.
    expect(row?.['min-height']).toBe('56px')

    // G07 — the icon tile matches the token instead of a 40px one-off.
    expect(icon?.width).toBe('44px')
    expect(icon?.height).toBe('44px')

    // G06 — chips keep a visible idle border and stay in the same rhythm.
    expect(chip?.['min-height']).toBe('44px')
    expect(chip?.['border-top-width']).toBe('1px')

    await page.screenshot({
      path: `test-results/experience/b1-transactions-on-${width}.png`,
      fullPage: false,
    })
    expect(errors).toEqual([])
  })

  test('keeps the premium figures aligned when amounts differ in length', async ({
    page,
  }) => {
    await openTransactions(page, true)

    const widths = await page.evaluate(() => {
      const ids = ['tx-b1-1', 'tx-b1-2', 'tx-b1-3']
      return ids.map((id) => {
        const node = document.querySelector(
          `[data-testid="transaction-amount-${id}"]`,
        )
        return node ? Math.round(node.getBoundingClientRect().right) : null
      })
    })

    console.log('MEASURE b1AmountRightEdges=' + JSON.stringify(widths))
    // Tabular digits + a right-aligned column: figures share one right edge.
    expect(new Set(widths).size).toBe(1)
  })
})
