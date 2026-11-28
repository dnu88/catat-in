import { expect, test } from '@playwright/test'
import { bootExperience } from './harness'

/**
 * Batch 3 / PR-2: caption total di hero Dompet harus terbaca di atas navy.
 * Mengukur warna computed dari `wallets-split-balance` (baris "Nonaktif …")
 * dan mengambil screenshot hero untuk perbandingan before/after.
 */

const WALLETS = [
	{
		id: 'w-preview',
		user_id: 'preview-user',
		name: 'BCA Utama',
		type: 'bank',
		balance: 1500000,
		currency: 'IDR',
		is_active: true,
	},
	{
		id: 'w-preview-2',
		user_id: 'preview-user',
		name: 'Tunai lama',
		type: 'cash',
		balance: 250000,
		currency: 'IDR',
		is_active: false,
	},
]

test('caption total Dompet terbaca (kontras) & tidak memudar', async ({ page }) => {
	const width = page.viewportSize()?.width ?? 390
	await bootExperience(page, { simplePremiumExperience: true })
	// Fixture dompet: harness hanya mengembalikan satu dompet aktif, jadi
	// daftar ini dipasang lewat route yang didaftarkan setelah bootExperience.
	await page.route('**/preview-stub.supabase.co/rest/v1/wallets**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			headers: { 'content-range': `0-${WALLETS.length - 1}/${WALLETS.length}` },
			body: JSON.stringify(WALLETS),
		}),
	)

	await page.goto('/wallets', { waitUntil: 'domcontentloaded' })
	const split = page.getByTestId('wallets-split-balance')
	await expect(split).toBeVisible({ timeout: 30000 })
	await page.waitForTimeout(1000)

	const style = await split.evaluate((el) => {
		const cs = getComputedStyle(el as HTMLElement)
		return { color: cs.color, fontWeight: cs.fontWeight }
	})
	console.log(`[wallets] w=${width} color=${style.color} weight=${style.fontWeight}`)

	await page.screenshot({
		path: `test-results/batch3-wallets-total-${width}.png`,
		clip: { x: 0, y: 0, width, height: 300 },
	})

	// Baseline lama: textSecondary (abu gelap) di atas navy → rasio ~1,6:1.
	expect(style.color).toBe('rgba(255, 255, 255, 0.68)')
	expect(Number(style.fontWeight)).toBeGreaterThanOrEqual(500)

})
