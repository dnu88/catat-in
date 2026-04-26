import { expect, test, type Response } from '@playwright/test'

import { bootstrapSession, buildTestUser, loginUserViaBackend, registerUserViaBackend } from './test-helpers'

async function expectOkResponse(response: Response, label: string) {
  if (response.ok()) return

  let body = ''
  try {
    body = await response.text()
  } catch {
    body = '<response body unavailable>'
  }
  throw new Error(`${label} failed with ${response.status()} ${response.statusText()}: ${body}`)
}

test.describe('authenticated smoke flow', () => {
  test.setTimeout(120_000)

  test('can login and complete wallet, transaction, budget, and bill basics', async ({ page, request }) => {
    const user = buildTestUser('smoke')
    const walletName = `Wallet ${Date.now()}`
    const budgetCategory = `kategori-${Date.now()}`
    const billName = `Internet ${Date.now()}`

    page.on('dialog', async (dialog) => {
      await dialog.accept()
    })

    await registerUserViaBackend(request, user)
    const session = await loginUserViaBackend(request, user)
    await bootstrapSession(page, session, '/wallets')

    await expect(page.getByRole('button', { name: '+ Tambah Wallet' })).toBeVisible()

    await page.getByRole('button', { name: '+ Tambah Wallet' }).click()
    await page.getByPlaceholder('cth: BCA Utama').fill(walletName)
    await page.locator('select').first().selectOption('cash')
    await page.getByPlaceholder('cth: BCA, GoPay, OVO').fill('Kas QA')
    await page.getByPlaceholder('0').fill('150000')
    const walletResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/v1/wallets') && response.request().method() === 'POST' && response.status() !== 307,
    )
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expectOkResponse(await walletResponsePromise, 'create wallet')
    await expect(page.getByRole('heading', { name: 'Tambah Wallet Baru' })).toBeHidden()
    await expect(page.getByText(walletName)).toBeVisible()

    await page.goto('/transactions')
    await page.waitForURL('**/transactions')
    const addTransactionButton = page.locator('main button').filter({ hasText: 'Tambah' }).first()
    await page.waitForFunction(() => {
      const buttons = [...document.querySelectorAll('main button')]
      return buttons.some((button) => button.textContent?.includes('Tambah') && !button.disabled)
    }, { timeout: 20000 })
    await addTransactionButton.click()
    await page.waitForResponse((response) =>
      response.url().includes('/api/v1/categories/?type=expense') && response.request().method() === 'GET' && response.status() === 200,
    )
    await page.getByPlaceholder('50000').fill('50000')
    await page.locator('select').nth(1).selectOption({ label: walletName })
    await page.getByPlaceholder('Contoh: Indomaret').fill('Warung QA')
    await page.getByPlaceholder('Contoh: makan siang bersama tim').fill('Playwright smoke')
    const transactionResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/v1/transactions/') && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expectOkResponse(await transactionResponsePromise, 'create transaction')
    await expect(page.getByRole('heading', { name: 'Tambah Transaksi' })).toBeHidden()
    await expect(page.getByText('Warung QA')).toBeVisible()

    await page.goto('/budgets')
    await page.waitForURL('**/budgets')
    await page.getByRole('button', { name: '+ Tambah Budget' }).click()
    await page.getByPlaceholder('Tambah kategori kustom').fill(budgetCategory)
    const categoryResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/v1/categories') && response.request().method() === 'POST' && response.status() !== 307,
    )
    await page.getByRole('button', { name: 'Tambah', exact: true }).click()
    await expectOkResponse(await categoryResponsePromise, 'create category')
    await page.getByPlaceholder('500000').fill('300000')
    const budgetResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/v1/budgets') && response.request().method() === 'POST' && response.status() !== 307,
    )
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expectOkResponse(await budgetResponsePromise, 'create budget')
    await expect(page.getByRole('heading', { name: 'Tambah Budget Bulan Ini' })).toBeHidden()
    await expect(page.getByText(budgetCategory)).toBeVisible()

    await page.goto('/bills')
    await page.waitForURL('**/bills')
    await page.getByRole('button', { name: '+ Tambah Tagihan' }).click()
    await page.getByPlaceholder('cth: Listrik PLN').fill(billName)
    await page.getByPlaceholder('500000').fill('199000')
    const billResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/v1/bills') && response.request().method() === 'POST' && !response.url().includes('/pay') && response.status() !== 307,
    )
    await page.getByRole('button', { name: 'Simpan' }).click()
    await expectOkResponse(await billResponsePromise, 'create bill')
    await expect(page.getByRole('heading', { name: 'Tambah Tagihan' })).toBeHidden()
    await expect(page.getByText(billName)).toBeVisible()
    const payBillResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/v1/bills/') && response.url().includes('/pay') && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Bayar' }).first().click()
    await expectOkResponse(await payBillResponsePromise, 'pay bill')
    await expect(page.getByText(billName)).toBeVisible()
  })
})
