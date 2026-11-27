import { expect, test } from '@playwright/test'
import { bootExperience, waitForOpaque, WALLET_ROW } from './harness'

/**
 * Laporan (Reports) unslop candidate render — fixture audit 8 transaksi Nov
 * 2026 + 2 dompet aktif. Screenshot ke laporan-candidate.png untuk review
 * kaswise-landing. Flag OFF = baseline; flag ON = premium + PWA polish.
 *
 * Deterministik: screenshot hanya diambil SETELAH kartu ringkasan berisi
 * angka (bukan "Rp 0" / bukan state memuat), supaya baseline dan candidate
 * selalu pasangan yang konsisten.
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

const AUDIT_WALLETS = [
	{ ...WALLET_ROW, id: 'w-audit-salary', name: 'Salary November', balance: 13332959 },
	{ ...WALLET_ROW, id: 'w-audit-sisa', name: 'Sisa', balance: 0 },
]

const AUDIT_CATEGORIES = [
	{ id: 'cat-salary', name: 'Salary', type: 'income', is_active: true },
	{ id: 'cat-housing', name: 'Housing', type: 'expense', is_active: true },
	{ id: 'cat-food', name: 'Food & Beverage', type: 'expense', is_active: true },
	{ id: 'cat-transport', name: 'Transport', type: 'expense', is_active: true },
	{ id: 'cat-shopping', name: 'Shopping', type: 'expense', is_active: true },
]

const SCREENS_DIR =
	'/home/Danu88/.hermes/profiles/kaswise-landing/workspace/app-audit/screens'

test.describe('Laporan unslop — render fixture audit (8 tx Nov 2026, 2 dompet aktif)', () => {
	for (const premium of [false, true] as const) {
		test(`render ${premium ? 'candidate (flag ON)' : 'baseline (flag OFF)'} dengan ringkasan berisi angka`, async ({ page }) => {
			await bootExperience(page, { simplePremiumExperience: premium }, {
				transactions: AUDIT_TRANSACTIONS,
			})
			// Terdaftar SETELAH bootExperience — Playwright memilih handler
			// LIFO, jadi route spesifik ini menang atas handler generik
			// harness untuk wallets/categories.
			await page.route(`**/preview-stub.supabase.co/rest/v1/wallets`, (route) =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(AUDIT_WALLETS),
				}),
			)
			await page.route(`**/preview-stub.supabase.co/rest/v1/categories**`, (route) =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(AUDIT_CATEGORIES),
				}),
			)

			await page.goto('/reports')
			await page.waitForLoadState('networkidle')

			// Deterministik: tunggu kartu ringkasan benar-benar berisi angka.
			// Income fixture = 16.380.459 + 12.500 = Rp 16.392.959.
			const income = page.getByTestId('reports-summary-income-value')
			await expect(income).toBeVisible({ timeout: 20_000 })
			await expect(income).not.toHaveText(/Rp 0|—|Memuat/, { timeout: 20_000 })
			await expect(page.getByTestId('reports-summary-expense-value')).not.toHaveText(/Rp 0|—/, { timeout: 20_000 })

			const incomeText = (await income.textContent()) ?? ''
			console.log(`MEASURE reports-${premium ? 'on' : 'off'}-income=` + incomeText)
			expect(incomeText).toContain('16')

			if (premium) {
				await waitForOpaque(page, 'reports-analytics-hero')
				await page.screenshot({
					path: `${SCREENS_DIR}/laporan-candidate.png`,
					fullPage: false,
				})
				console.log('SCREENSHOT laporan-candidate.png written')
			} else {
				await page.screenshot({
					path: `${SCREENS_DIR}/laporan-candidate-baseline.png`,
					fullPage: true,
				})
				console.log('SCREENSHOT laporan-candidate-baseline.png written')
			}
		})
	}
})
