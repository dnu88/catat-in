import { expect, test, type Page } from '@playwright/test'
import { bootExperience, trackPageErrors, waitForOpaque } from './harness'

const date = '2026-11-14'
const transactions = [
  { id: 'demo-coffee', title: 'Kopi dan sarapan', category: 'Food & Beverage', type: 'expense', amount: 43500 },
  { id: 'demo-pay', title: 'Gaji bulanan', category: 'Salary', type: 'income', amount: 8250000 },
  { id: 'demo-travel', title: 'Tiket kereta untuk perjalanan akhir pekan', category: 'Transportation', type: 'expense', amount: 175000 },
].map(({ title, category, type, amount, ...row }, index) => ({
  ...row, user_id: 'preview-user', wallet_id: 'w-preview', household_id: null,
  description: title, catatan: title, category, kategori: category, transaction_type: type, type,
  nominal: amount, amount, date, tanggal: date, is_verified: true,
  created_at: `${date}T0${5 - index}:00:00Z`, status: 'done',
}))

test.use({ serviceWorkers: 'block' })

async function prepareHome(page: Page, baseURL: string, language: 'id' | 'en') {
  const localOrigin = new URL(baseURL).origin
  await page.route('**/*', (route) => new URL(route.request().url()).origin === localOrigin
    ? route.continue() : route.abort())
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.install({ time: new Date(`${date}T12:00:00Z`) })
  await page.addInitScript((value) => localStorage.setItem('kaswise:language-preference', value), language)
}

for (const premium of [true, false]) {
  test(`Beranda demo — premium ${premium ? 'ON' : 'OFF'}`, async ({ page, baseURL }) => {
    const errors = trackPageErrors(page)
    await prepareHome(page, baseURL!, 'id')
    await bootExperience(page, { simplePremiumExperience: premium }, { transactions })
    await page.goto('/')
    const cta = page.getByTestId('home-capture-cta')
    const total = page.getByTestId('home-total-balance')
    const period = page.getByTestId('home-active-period-label')
    const amounts = transactions.map(({ id }) => page.getByTestId(`home-recent-amount-${id}`))
    const privateAmounts = [total, page.getByTestId('home-monthly-remaining'), page.getByTestId('home-monthly-expense'), ...amounts]
    await expect(total).toHaveText(/1[.,]500[.,]000/)
    await expect(amounts.at(-1)!).toBeVisible()
    await waitForOpaque(page, 'home-entrance-recent')
    await expect(page.getByTestId('home-entrance-recent')).toHaveCSS('opacity', '1')
    await page.evaluate(() => document.fonts.ready)
    await expect(page.getByText('1 dompet · 1 aktif')).toBeVisible()
    await expect(period).toBeVisible()
    await expect(cta).toHaveCount(premium ? 1 : 0)
    if (premium) {
      await expect(cta).toBeInViewport({ ratio: 1 })
      expect((await cta.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
    const rightEdges = await Promise.all(amounts.map(async (amount) => {
      const box = (await amount.boundingBox())!
      return box.x + box.width
    }))
    // Sub-pixel layout can differ by a fraction; amounts must still line up within 1px.
    expect(Math.max(...rightEdges) - Math.min(...rightEdges)).toBeLessThanOrEqual(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width)
    const width = page.viewportSize()!.width
    const phase = process.env.HOME_UNSLOP_PHASE ?? 'candidate'
    const ctaBox = premium ? await cta.boundingBox() : null
    console.log('HOME_UNSLOP ' + JSON.stringify({ phase, width, premium, ctaBox, period: await period.innerText(), rightEdges }))
    if (phase !== 'baseline' && premium) {
      await expect(page.getByText('Transaksi terbaru', { exact: true })).toBeVisible()
      // Delta 4: metric sub dipertahankan saat polish web aktif.
      await expect(page.getByText('Pengeluaran bulan ini', { exact: true })).toHaveCount(1)
      await expect(period).toHaveText('Periode aktif: Nov 2026')
    } else if (!premium) {
      await expect(page.getByText('Terakhir', { exact: true })).toBeVisible()
      await expect(page.getByText('Pengeluaran bulan ini', { exact: true })).toBeVisible()
    }
    await page.screenshot({ path: `test-results/home-unslop/${phase}-${premium ? 'on' : 'off'}-${width}.png`, animations: 'disabled' })

    const privacy = page.getByTestId('home-amount-visibility-toggle')
    const unmasked = await Promise.all(privateAmounts.map((amount) => amount.innerText()))
    await privacy.click()
    await expect(privacy).toHaveAccessibleName('Tampilkan nominal dashboard')
    for (const amount of privateAmounts) await expect(amount).toHaveText('Rp ••••••')
    await page.reload()
    for (const amount of privateAmounts) await expect(amount).toHaveText('Rp ••••••')
    await privacy.click()
    for (const [index, amount] of privateAmounts.entries()) await expect(amount).toHaveText(unmasked[index])
    if (premium) {
      await cta.click()
      await expect(page).toHaveURL(/\/capture(?:[/?#]|$)/)
    }
    expect(errors).toEqual([])
  })
}

test('English Home keeps a custom period and its reset action', async ({ page, baseURL }) => {
  await prepareHome(page, baseURL!, 'en')
  await page.addInitScript(() => {
    localStorage.setItem('kaswise:report-period:preview-user:personal', JSON.stringify({
      rules: [], selection: { type: 'custom', startDate: '2026-11-01', endDate: '2026-11-12' },
    }))
  })
  await bootExperience(page, { simplePremiumExperience: true }, { transactions })
  await page.goto('/')
  const period = page.getByTestId('home-active-period-label')
  const reset = page.getByTestId('home-period-reset')
  const spending = page.getByTestId('home-monthly-expense')
  const remaining = page.getByTestId('home-monthly-remaining')
  await expect(period).toHaveText(/Active period: .*12.*Nov/)
  await expect(reset).toHaveAccessibleName('This month')
  await expect(reset).toBeInViewport({ ratio: 1 })
  await expect(spending).toHaveText('Rp 0')
  await expect(remaining).toHaveText('Rp 0')
  await expect(page.getByRole('button', { name: 'Record a transaction' })).toHaveCount(1)
  await expect(page.getByText('Recent transactions', { exact: true })).toBeVisible()
  // Delta 4: metric sub dipertahankan saat polish web aktif.
  await expect(page.getByText('Expense this period', { exact: true })).toHaveCount(1)
  await reset.click()
  await expect(period).toHaveText('Active period: Nov 2026')
  await expect(reset).toHaveCount(0)
  await expect(spending).toHaveText('Rp 218.500')
  await expect(remaining).toHaveText('Rp 8.031.500')
})

// Enam delta unslop Beranda yang disetujui Danu. ON harus memakai nilai baru,
// OFF harus tetap baseline (bukti flag OFF byte-identik).
test('Beranda polish web deltas + OFF baseline', async ({ page, baseURL }) => {
  const read = async (id: string, prop: string) =>
    page.getByTestId(id).evaluate((el, p) => getComputedStyle(el)[p as never], prop)

  await prepareHome(page, baseURL!, 'id')
  await bootExperience(page, { simplePremiumExperience: true }, { transactions })
  await page.goto('/')
  await expect(page.getByTestId('home-total-balance')).toBeVisible()

  // delta 2: logo, bukan tracked caps
  await expect(page.getByTestId('home-wallet-stack-logo')).toBeVisible()
  await expect(page.getByText('KASWISE', { exact: true })).toHaveCount(0)

  // delta 1: sapaan kecil
  const greeting = page.getByText('Halo', { exact: true })
  expect(await greeting.evaluate((el) => getComputedStyle(el).fontSize)).toBe('14px')
  expect(await greeting.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('500')

  // delta 3: CTA biru, radius kontrol, semibold
  const cta = page.getByTestId('home-capture-cta')
  expect(await cta.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('12px')
  expect(await cta.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(12, 78, 145)')

  // delta 4: metric sub dipertahankan, alpha .70
  const sub = page.getByTestId('home-monthly-expense-sub')
  await expect(sub).toBeVisible()
  expect(await sub.evaluate((el) => getComputedStyle(el).fontSize)).toBe('11px')
  expect(await sub.evaluate((el) => getComputedStyle(el).color)).toBe('rgba(255, 255, 255, 0.7)')

  // delta 5: token income dalam di permukaan terang
  expect(await read('home-recent-amount-demo-pay', 'color')).toBe('rgb(15, 112, 137)')

  // OFF baseline
  await bootExperience(page, { simplePremiumExperience: false }, { transactions })
  await page.goto('/')
  await expect(page.getByTestId('home-total-balance')).toBeVisible()
  await expect(page.getByText('KASWISE', { exact: true })).toHaveCount(1)
  await expect(page.getByTestId('home-wallet-stack-logo')).toHaveCount(0)
  expect(await read('home-recent-amount-demo-pay', 'color')).toBe('rgb(22, 143, 168)')
})
