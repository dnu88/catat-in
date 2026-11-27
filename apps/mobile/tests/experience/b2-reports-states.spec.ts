import { expect, test } from '@playwright/test'
import { bootExperience, trackPageErrors, waitForOpaque } from './harness'

/**
 * Paket B2 — Reports states, period control and hierarchy (G09/G10/G11).
 *
 * Four situations that used to look identical must now read differently, and
 * the chart must not be drawn when the selected period has no figures.
 * Flag OFF keeps the pre-B2 behaviour exactly.
 */

const TODAY = new Date()
const IN_PERIOD = TODAY.toISOString().slice(0, 10)
const OUT_OF_PERIOD = new Date(TODAY.getTime() - 120 * 24 * 3600 * 1000)
  .toISOString()
  .slice(0, 10)

function tx(id: string, amount: number, date: string, type: 'income' | 'expense') {
  return {
    id,
    user_id: 'preview-user',
    wallet_id: 'w-preview',
    transaction_type: type,
    type,
    nominal: amount,
    amount,
    kategori: type === 'income' ? 'Salary' : 'Food & Beverage',
    category: type === 'income' ? 'Salary' : 'Food & Beverage',
    catatan: null,
    description: type === 'income' ? 'Gaji' : 'Kopi',
    merchant: null,
    tanggal: date,
    date,
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
    created_at: `${date}T02:00:00Z`,
    updated_at: `${date}T02:00:00Z`,
  }
}

const READY_ROWS = [
  tx('tx-b2-1', 35000, IN_PERIOD, 'expense'),
  tx('tx-b2-2', 220000, IN_PERIOD, 'expense'),
  tx('tx-b2-3', 5000000, IN_PERIOD, 'income'),
]

async function openReports(
  page: import('@playwright/test').Page,
  premium: boolean,
  fixtures: Parameters<typeof bootExperience>[2] = {},
) {
  await bootExperience(page, { simplePremiumExperience: premium }, fixtures)
  await page.goto('/reports')
  await page.waitForLoadState('networkidle')
  await waitForOpaque(page, 'reports-summary-card')
  await page.waitForTimeout(600)
}

test.describe('B2 — Reports states (local preview)', () => {
  test('first use: no transactions at all reads as guidance, not as an empty chart', async ({
    page,
  }) => {
    const errors = trackPageErrors(page)
    const width = page.viewportSize()?.width ?? 0

    await openReports(page, true, { transactions: [] })

    await expect(page.getByTestId('reports-state-card')).toBeVisible()
    // A state card the user has to scroll for is a state card they never read.
    await expect(page.getByTestId('reports-state-card')).toBeInViewport()
    await expect(page.getByTestId('reports-state-card')).toContainText(
      'Belum ada transaksi',
    )
    await expect(page.getByTestId('reports-state-action')).toBeVisible()
    // No empty chart while the account has nothing to plot.
    await expect(page.getByTestId('reports-pulse-chart')).toHaveCount(0)
    // The period is stated once, inside the period control.
    await expect(page.getByTestId('reports-period-status')).toBeVisible()
    await page.screenshot({
      path: `test-results/experience/b2-reports-firstuse-on-${width}.png`,
      fullPage: false,
    })
    expect(errors).toEqual([])
  })

  test('flag OFF keeps the pre-B2 rendering for the same empty account', async ({
    page,
  }) => {
    const width = page.viewportSize()?.width ?? 0

    await openReports(page, false, { transactions: [] })

    await expect(page.getByTestId('reports-state-card')).toHaveCount(0)
    await expect(page.getByTestId('reports-pulse-chart')).toHaveCount(1)
    await page.screenshot({
      path: `test-results/experience/b2-reports-firstuse-off-${width}.png`,
      fullPage: false,
    })
  })

  test('ready: real figures keep the chart, and the period line carries the count', async ({
    page,
  }) => {
    const errors = trackPageErrors(page)
    const width = page.viewportSize()?.width ?? 0

    await openReports(page, true, { transactions: READY_ROWS })

    await expect(page.getByTestId('reports-state-card')).toHaveCount(0)
    await expect(page.getByTestId('reports-pulse-chart')).toBeVisible()
    await expect(page.getByTestId('reports-period-status')).toContainText('transaksi')
    // The duplicate "report" info card is gone on premium: the period control
    // owns that line now.
    await expect(page.getByTestId('reports-info-card')).toHaveCount(0)
    await page.screenshot({
      path: `test-results/experience/b2-reports-ready-on-${width}.png`,
      fullPage: false,
    })
    expect(errors).toEqual([])
  })

  test('period without data is distinct from first use', async ({ page }) => {
    const width = page.viewportSize()?.width ?? 0

    await openReports(page, true, {
      transactions: [
        tx('tx-b2-old-1', 40000, OUT_OF_PERIOD, 'expense'),
        tx('tx-b2-old-2', 90000, OUT_OF_PERIOD, 'expense'),
      ],
    })

    await expect(page.getByTestId('reports-state-card')).toBeInViewport()
    await expect(page.getByTestId('reports-state-card')).toContainText('Periode ini')
    await expect(page.getByTestId('reports-state-action')).toBeVisible()
    await expect(page.getByTestId('reports-pulse-chart')).toHaveCount(0)
    await page.screenshot({
      path: `test-results/experience/b2-reports-periodempty-on-${width}.png`,
      fullPage: false,
    })
  })

  test('a failed load offers a retry instead of looking like an empty report', async ({
    page,
  }) => {
    const width = page.viewportSize()?.width ?? 0

    await openReports(page, true, { status: { transactions: 500 } })

    await expect(page.getByTestId('reports-state-card')).toBeVisible()
    await expect(page.getByTestId('reports-state-card')).toBeInViewport()
    await expect(page.getByTestId('reports-state-card')).toContainText(
      'gagal dimuat',
    )
    await expect(page.getByTestId('reports-state-action')).toContainText(
      'Coba lagi',
    )
    await expect(page.getByTestId('reports-pulse-chart')).toHaveCount(0)
    await page.screenshot({
      path: `test-results/experience/b2-reports-error-on-${width}.png`,
      fullPage: false,
    })
  })
})
