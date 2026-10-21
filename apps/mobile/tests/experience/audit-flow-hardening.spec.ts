import { expect, test } from '@playwright/test'
import { bootExperience, gotoCapture, waitForOpaque } from './harness'

// All persistence is intercepted; no production or real financial data.
test('autosave Edit opens the original persisted transaction, never another create review', async ({ page }) => {
  await bootExperience(page, { simplePremiumExperience: true })
  const date = new Date().toISOString().slice(0, 10)
  const saved = { id: 'audit-saved-original', user_id: 'preview-user', wallet_id: 'w-preview', type: 'expense', transaction_type: 'expense', nominal: 35000, amount: 35000, kategori: 'Food & Beverage', category: 'Food & Beverage', tanggal: date, date, catatan: 'Beli kopi', description: 'Beli kopi', household_id: null }
  let creates = 0
  const updatedIds: string[] = []
  await page.route('**/api.kaswise.com/api/v1/ai/chat', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transactions: [{ amount: 35000, type: 'expense', category: 'Makan & Minum', note: 'Beli kopi', confidence: 0.96, date }], unclear: null }) }))
  await page.route('**/preview-stub.supabase.co/rest/v1/categories**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'audit-cat', name: 'Food & Beverage', type: 'expense', is_active: true }]) }))
  await page.route('**/preview-stub.supabase.co/rest/v1/rpc/create_transaction_entry_v2', route => { creates++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([saved]) }) })
  await page.route('**/preview-stub.supabase.co/rest/v1/transactions**', route => {
    const url = new URL(route.request().url())
    const single = url.searchParams.has('id')
    if (route.request().method() === 'PATCH') {
      updatedIds.push(url.searchParams.get('id') || '')
      Object.assign(saved, route.request().postDataJSON())
      saved.amount = saved.nominal
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? saved : [saved]) })
  })
  await gotoCapture(page)
  await waitForOpaque(page, 'capture-composer')
  await page.getByTestId('capture-composer-input').fill('Beli kopi 35rb')
  await page.getByTestId('capture-composer-submit').click()
  await expect(page.getByTestId('auto-save-edit')).toBeVisible()
  await expect(page.getByTestId('auto-save-edit')).toBeInViewport()
  expect(creates).toBe(1)
  await page.getByTestId('auto-save-edit').click()
  await expect(page).toHaveURL(/transaction-new.*transactionId=audit-saved-original/)
  await expect(page.getByTestId('capture-entry-review')).toHaveCount(0)
  await expect(page.getByTestId('transaction-form-compact')).toBeVisible()
  await page.getByTestId('transaction-form-compact').getByRole('textbox', { name: 'Nominal', exact: true }).fill('45000')
  await page.getByTestId('transaction-form-submit').click()
  await expect.poll(() => updatedIds).toEqual(['eq.audit-saved-original'])
  expect(saved.nominal).toBe(45000)
  expect(creates).toBe(1)
})

test('Home distinguishes loading and failed fetch from an empty account, then retries', async ({ page }) => {
  await bootExperience(page, { simplePremiumExperience: true })
  let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  let fail = true
  await page.route('**/preview-stub.supabase.co/rest/v1/transactions**', async route => {
    if (fail) {
      await held
      await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'audit offline fixture' }) })
    } else await route.fallback()
  })
  await page.goto('/')
  await expect(page.getByTestId('home-data-status')).toContainText('Memuat keuangan')
  await expect(page.getByTestId('home-total-balance')).toHaveText('—')
  await expect(page.getByText('Belum ada transaksi', { exact: true })).toHaveCount(0)
  release()
  await expect(page.getByTestId('home-data-status')).toContainText('Keuangan belum berhasil dimuat')
  await expect(page.getByTestId('home-total-balance')).toHaveText('—')
  fail = false
  await page.getByTestId('home-data-retry').click()
  await expect(page.getByTestId('home-data-status')).toHaveCount(0)
  await expect(page.getByTestId('home-total-balance')).toHaveText('Rp 1.500.000')
  await expect(page.getByText('Belum ada transaksi', { exact: true })).toBeVisible()
  await waitForOpaque(page, 'home-capture-cta')
  await expect(page.getByTestId('home-capture-cta')).toBeInViewport()
})

test('premium reports keep one period section while retaining legacy card when OFF', async ({ page }) => {
  await bootExperience(page, { simplePremiumExperience: true })
  await page.goto('/reports')
  await expect(page.getByTestId('reports-period-toggle')).toBeVisible()
  await expect(page.getByTestId('reports-active-period-card')).toHaveCount(0)
  await page.getByTestId('reports-period-toggle').click()
  await page.getByRole('button', { name: 'Pilih periode 6 Bulan', exact: true }).click()
  await expect(page.getByTestId('reports-period-status')).toContainText('6 Bulan')
  await bootExperience(page, { simplePremiumExperience: false })
  await page.goto('/reports')
  await expect(page.getByTestId('reports-active-period-card')).toBeVisible()
})
