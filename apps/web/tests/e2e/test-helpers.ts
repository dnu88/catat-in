import { expect, type Page } from '@playwright/test'

export interface TestUser {
  fullName: string
  email: string
  password: string
}

export function buildTestUser(prefix = 'pw'): TestUser {
  const stamp = `${Date.now()}_${Math.floor(Math.random() * 10_000)}`
  return {
    fullName: `Playwright ${prefix}`,
    email: `${prefix}_${stamp}@example.com`,
    password: 'Pass1234!',
  }
}

export async function registerUserViaUi(page: Page, user: TestUser) {
  await page.goto('/register')
  await expect(page.getByRole('heading', { name: 'Buat akun baru' })).toBeVisible()

  await page.getByLabel('Nama Lengkap').fill(user.fullName)
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Daftar Sekarang' }).click()
}

export async function loginUserViaUi(page: Page, user: TestUser) {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Masuk ke akun kamu' })).toBeVisible()

  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await page.waitForURL('**/dashboard')
}

export async function registerAndAuthenticateViaUi(page: Page, user: TestUser) {
  await registerUserViaUi(page, user)

  const isSuccessScreen = await page
    .getByRole('heading', { name: 'Pendaftaran Berhasil!' })
    .isVisible({ timeout: 2000 })
    .catch(() => false)

  if (isSuccessScreen) {
    await page.getByRole('link', { name: 'Kembali ke Login' }).click()
    await loginUserViaUi(page, user)
    return
  }

  await page.waitForURL(/\/(dashboard|wallets|transactions|budgets|bills|capture|reports|groups|imports|settings)$/)
}
