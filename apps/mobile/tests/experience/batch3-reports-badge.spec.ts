import { expect, test } from '@playwright/test'
import { bootExperience, WALLET_ROW } from './harness'

/**
 * Batch 3 / PR-1: badge periode Laporan tidak boleh meluber keluar layar.
 *
 * Fixture: preferensi periode = saved_rule "Cycle 25–24" (label terpanjang yang
 * dilaporkan Danu) + 3 transaksi supaya hero berisi angka. Screenshot hero
 * diambil untuk flag OFF (baseline) dan ON (candidate), lalu bounding box badge
 * diukur terhadap lebar viewport di 360/390/430.
 */

const DAY = '2026-11-26'

function tx(id: string, amount: number, type: 'income' | 'expense', category: string, note: string) {
	return {
		id,
		user_id: 'preview-user',
		wallet_id: WALLET_ROW.id,
		transaction_type: type,
		type,
		nominal: amount,
		amount,
		kategori: category,
		category,
		catatan: note,
		description: note,
		merchant: null,
		tanggal: DAY,
		date: DAY,
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
		created_at: `${DAY}T02:00:00Z`,
		updated_at: `${DAY}T02:00:00Z`,
	}
}

const TRANSACTIONS = [
	tx('tx-b3-1', 16380459, 'income', 'Salary', 'Gaji November'),
	tx('tx-b3-2', 3047500, 'expense', 'Housing', 'Sewa bulanan'),
	tx('tx-b3-3', 35000, 'expense', 'Food & Beverage', 'Kopi susu pagi'),
]

const RULE_ROW = {
	id: 'rule-b3',
	user_id: 'preview-user',
	household_id: null,
	name: 'Cycle 25–24',
	rule_type: 'monthly',
	start_day: 25,
	end_day: 24,
}

const PREF_ROW = {
	user_id: 'preview-user',
	household_id: null,
	context_type: 'personal',
	context_key: 'personal',
	active_type: 'saved_rule',
	preset_type: null,
	active_rule_id: 'rule-b3',
	custom_start_date: null,
	custom_end_date: null,
}

async function seedPeriodFixtures(page: import('@playwright/test').Page) {
	// Didaftarkan SETELAH bootExperience → handler ini dipanggil lebih dulu.
	await page.route('**/preview-stub.supabase.co/rest/v1/report_period_rules**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			headers: { 'content-range': '0-0/1' },
			body: JSON.stringify([RULE_ROW]),
		}),
	)
	await page.route('**/preview-stub.supabase.co/rest/v1/report_period_preferences**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			headers: { 'content-range': '0-0/1' },
			body: JSON.stringify([PREF_ROW]),
		}),
	)
}

for (const variant of [
	{ label: 'OFF-baseline', flag: false },
	{ label: 'ON-candidate', flag: true },
] as const) {
	test(`badge periode tidak meluber (${variant.label})`, async ({ page }, testInfo) => {
		const width = page.viewportSize()?.width ?? 390
		await bootExperience(page, { simplePremiumExperience: variant.flag }, { transactions: TRANSACTIONS })
		await seedPeriodFixtures(page)

		await page.goto('/reports', { waitUntil: 'domcontentloaded' })
		const badge = page.getByTestId('reports-month-badge')
		await expect(badge).toBeVisible({ timeout: 30000 })
		if (variant.flag) await expect(badge).toContainText(/Cycle 25/i)
		await page.waitForTimeout(1200)

		const box = await badge.boundingBox()
		expect(box).not.toBeNull()
		const right = (box?.x ?? 0) + (box?.width ?? 0)
		console.log(
			`[${variant.label}] w=${width} badge x=${(box?.x ?? 0).toFixed(1)} width=${(box?.width ?? 0).toFixed(1)} right=${right.toFixed(1)} overflow=${right > width}`,
		)
		await page.screenshot({
			path: `test-results/batch3-reports-badge-${variant.label}-${width}.png`,
			clip: { x: 0, y: 0, width, height: 340 },
		});
		testInfo.attach(`badge-${variant.label}-${width}`, {
			path: `test-results/batch3-reports-badge-${variant.label}-${width}.png`,
		});
		if (variant.flag) {
			// Candidate: badge di baris sendiri, tidak boleh melewati layar.
			await expect(page.getByTestId('reports-month-badge-row')).toBeVisible()
			expect(right).toBeLessThanOrEqual(width + 0.5)
		} else {
			// Baseline: bug asli — badge meluber keluar viewport (dokumentasi).
			console.log(`[baseline-overflow] ${right > width}`);
		}


	})
}
