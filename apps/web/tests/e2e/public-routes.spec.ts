import { expect, test } from '@playwright/test'

test.describe('public routes', () => {
  test('renders auth pages and reset fallback message', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Masuk ke akun kamu' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Lupa password?' })).toBeVisible()

    await page.goto('/register')
    await expect(page.getByRole('heading', { name: 'Buat akun baru' })).toBeVisible()

    await page.goto('/forgot-password')
    await expect(page.getByRole('heading', { name: 'Lupa password' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Kirim link reset' })).toBeVisible()

    await page.goto('/reset-password')
    await expect(page.getByRole('heading', { name: 'Atur password baru' })).toBeVisible()
    await expect(page.getByText('Link reset belum aktif atau sudah kedaluwarsa.')).toBeVisible()
  })

  test('shows friendly error for invalid login', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('not-found@example.com')
    await page.getByLabel('Password').fill('WrongPass123!')
    await page.getByRole('button', { name: 'Masuk', exact: true }).click()

    await expect(page.getByText('Email atau password salah. Coba periksa lagi.')).toBeVisible()
  })
})
