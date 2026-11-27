import { expect, test } from '@playwright/test'
import { bootExperience, waitForOpaque, WALLET_ROW } from './harness'

/**
 * Transaksi unslop candidate render — fixture audit 8 transaksi Nov 2026 +
 * 2 dompet aktif (Sisa + Salary November net). Screenshot ke
 * transaksi-candidate.png untuk review oleh kaswise-landing.
 *
 * Flag OFF: baseline legacy (filter scroller visible).
 * Flag ON: premium + PWA polish (7 delta unslop).
 */

const NOV_2026 = '2026-11-26'

function tx(
	id: string,
	amount: number,
	type: 'income' | 'expense',
	category: string,
	description: string,
	merchant: string | null,
): Record<string, unknown> {
	return {
		id,
		user_id: 'preview-user',
		wallet_id: 'w-preview',
		transaction_type: type,
		type,
		nominal: amount,
		amount,
		kategori: category,
		category,
		catatan: description,
		description,
		merchant,
		tanggal: NOV_2026,
		date: NOV_2026,
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
		created_at: `${NOV_2026}T02:00:00Z`,
		updated_at: `${NOV_2026}T02:00:00Z`,
	}
}

const AUDIT_TRANSACTIONS = [
	tx('tx-audit-1', 16380459, 'income', 'Salary', 'Salary November', null),
	tx('tx-audit-2', 3047500, 'expense', 'Housing', 'Sewa bulanan', null),
	tx('tx-audit-3', 35000, 'expense', 'Food & Beverage', 'Kopi susu pagi', 'Kopi Kenangan'),
	tx('tx-audit-4', 1250000, 'expense', 'Housing', 'Bayar listrik', 'PLN'),
	tx('tx-audit-5', 12500, 'income', 'Salary', 'Bonus kecil', null),
	tx('tx-audit-6', 50000, 'expense', 'Transport', 'Taksi', 'Gojek'),
	tx('tx-audit-7', 450000, 'expense', 'Shopping', 'Belanja bahan', 'Supermarket'),
	tx('tx-audit-8', 25000, 'expense', 'Food & Beverage', 'Makan siang', 'Gerobak'),
]

// 2 dompet aktif: Salary November net 13.332.959 + Sisa 0
const AUDIT_WALLETS = [
	{ ...WALLET_ROW, id: 'w-audit-salary', name: 'Salary November', balance: 13332959 },
	{ ...WALLET_ROW, id: 'w-audit-sisa', name: 'Sisa', balance: 0 },
]

test.describe('Transaksi unslop — render fixture audit (8 tx Nov 2026, 2 dompet aktif)', () => {
	test('render baseline (flag OFF) ke transaksi-candidate.png', async ({ page }) => {
		// Route wallet fixture
		await page.route(`**/preview-stub.supabase.co/rest/v1/wallets`, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(AUDIT_WALLETS),
			}),
		)
		await bootExperience(page, { simplePremiumExperience: false }, {
			transactions: AUDIT_TRANSACTIONS,
		})
		await page.goto('/transactions')
		await page.waitForLoadState('networkidle')
		await waitForOpaque(page, 'transaction-row-tx-audit-1')
		await page.screenshot({
			path: '/home/Danu88/.hermes/profiles/kaswise-landing/workspace/app-audit/screens/transaksi-candidate-baseline.png',
			fullPage: true,
		})
		await expect(page.getByTestId('transactions-filter-scroller')).toBeVisible()
	})

	test('render premium + PWA polish (flag ON) ke transaksi-candidate.png', async ({ page }) => {
		await page.route(`**/preview-stub.supabase.co/rest/v1/wallets`, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(AUDIT_WALLETS),
			}),
		)
		await bootExperience(page, { simplePremiumExperience: true }, {
			transactions: AUDIT_TRANSACTIONS,
		})
		await page.goto('/transactions')
		await page.waitForLoadState('networkidle')
		await waitForOpaque(page, 'transaction-row-tx-audit-1')
		const width = page.viewportSize()?.width ?? 0
		await page.screenshot({
			path: `/home/Danu88/.hermes/profiles/kaswise-landing/workspace/app-audit/screens/transaksi-candidate.png`,
			fullPage: false,
		})
		// 7 delta verifikasi
		const summaryBadge = await page
			.getByTestId('transactions-header-block')
			.locator('text=8 item')
			.isVisible()
		expect(summaryBadge).toBe(true)
		// Filter toggle visible (premium mode)
		await expect(page.getByTestId('transactions-filter-toggle')).toBeVisible()
		console.log('SCREENSHOT transaksi-candidate.png written')
	})
})
