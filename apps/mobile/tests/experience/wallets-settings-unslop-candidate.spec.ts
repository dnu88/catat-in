import { expect, test } from '@playwright/test'
import { bootExperience, waitForOpaque, WALLET_ROW } from './harness'

/**
 * Dompet + Settings unslop candidate render — fixture audit konsisten dengan
 * pasangan baseline (flag OFF) vs candidate (flag ON premium + PWA polish).
 *
 * Deterministik: screenshot hanya SETELAH konten terisi (total saldo dompet
 * bukan "—", seksi settings terlihat).
 */

const NOV_2026 = '2026-11-26'

const AUDIT_WALLETS = [
	{ ...WALLET_ROW, id: 'w-audit-salary', name: 'Salary November', balance: 13332959 },
	{ ...WALLET_ROW, id: 'w-audit-sisa', name: 'Sisa', balance: 0 },
	{ ...WALLET_ROW, id: 'w-audit-bca', name: 'BCA Pribadi', balance: 1000000 },
]

const AUDIT_TRANSACTIONS = [
	{
		id: 'tx-audit-w1',
		user_id: 'preview-user',
		wallet_id: 'w-audit-salary',
		transaction_type: 'expense',
		type: 'expense',
		nominal: 3047500,
		amount: 3047500,
		kategori: 'Housing',
		category: 'Housing',
		catatan: 'Sewa bulanan',
		description: 'Sewa bulanan',
		merchant: null,
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
	},
]

const SCREENS_DIR =
	'/home/Danu88/.hermes/profiles/kaswise-landing/workspace/app-audit/screens'

test.describe('Dompet + Settings unslop — render fixture audit', () => {
	for (const premium of [false, true] as const) {
		const suffix = premium ? '' : '-baseline'
		const label = premium ? 'candidate (flag ON)' : 'baseline (flag OFF)'

		test(`wallets ${label}`, async ({ page }) => {
			await bootExperience(page, { simplePremiumExperience: premium }, {
				transactions: AUDIT_TRANSACTIONS,
			})
			await page.route(`**/preview-stub.supabase.co/rest/v1/wallets*`, (route) =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(AUDIT_WALLETS),
				}),
			)
			await page.goto('/wallets')
			await page.waitForLoadState('networkidle')
			await waitForOpaque(page, 'wallets-total-value')
			const total = page.getByTestId('wallets-total-value')
			await expect(total).toBeVisible({ timeout: 20_000 })
			await expect(total).not.toHaveText(/—|Rp 0|Memuat/, { timeout: 20_000 })
			console.log(`MEASURE wallets-${premium ? 'on' : 'off'}-total=` + (await total.textContent()))
			await page.screenshot({
				path: `${SCREENS_DIR}/wallets-candidate${suffix}.png`,
				fullPage: false,
			})
			console.log(`SCREENSHOT wallets-candidate${suffix}.png written`)
		})

		test(`settings ${label}`, async ({ page }) => {
			await bootExperience(page, { simplePremiumExperience: premium }, {
				transactions: AUDIT_TRANSACTIONS,
			})
			await page.route(`**/preview-stub.supabase.co/rest/v1/wallets*`, (route) =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(AUDIT_WALLETS),
				}),
			)
			await page.goto('/settings')
			await page.waitForLoadState('networkidle')
			await page.waitForTimeout(1500)
			// Deterministik: tunggu salah satu header seksi sentence case muncul.
			await expect(page.getByText('Tampilan').first()).toBeVisible({ timeout: 20_000 })
			await page.screenshot({
				path: `${SCREENS_DIR}/settings-candidate${suffix}.png`,
				fullPage: false,
			})
			console.log(`SCREENSHOT settings-candidate${suffix}.png written`)
		})
	}
})
