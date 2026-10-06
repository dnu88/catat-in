import { test, expect, type Page } from '@playwright/test'
import { bootExperience, trackPageErrors, waitForOpaque, WALLET_ROW, stubSession } from './harness'
import { readFileSync } from 'node:fs'

const html = readFileSync('dist/index.html', 'utf8')
const bundleName = html.match(/entry-[a-f0-9]+\.js/)![0]
const host = readFileSync(`dist/_expo/static/js/web/${bundleName}`, 'utf8').match(/https:\/\/([a-z0-9-]+)\.supabase\.co/)![1]

async function open(page: Page, premium = true, language = 'id') {
  await bootExperience(page, { simplePremiumExperience: premium })
  await page.addInitScript(language => localStorage.setItem('kaswise:language-preference', language), language)
  await page.addInitScript(([key, session]) => localStorage.setItem(key, session), [`sb-${host}-auth-token`, JSON.stringify(stubSession())])
  await page.route('**/*.supabase.co/**', r => {
    const u = r.request().url()
    const body = u.includes('/auth/v1/') ? stubSession() : u.includes('/wallets') ? [WALLET_ROW, { ...WALLET_ROW, id: 'w-target', name: 'Second Wallet' }] : u.includes('/categories') ? [{ id: 'c-food', name: 'Food & Beverage', type: 'expense', user_id: 'preview-user', household_id: null }] : []
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  const errors = trackPageErrors(page)
  await page.goto('/transaction-new')
  await page.waitForLoadState('networkidle')
  await waitForOpaque(page, 'transaction-new-page-entrance')
  return errors
}

for (const premium of [false, true]) test(`CF baseline ${premium ? 'ON' : 'OFF'} screenshot`, async ({ page }) => {
  const errors = await open(page, premium)
  await page.screenshot({ path: `test-results/experience/cf-${process.env.CF_PHASE || 'before'}-${premium ? 'on' : 'off'}-${page.viewportSize()!.width}.png`, fullPage: true })
  expect(errors).toEqual([])
})

for (const picker of ['category', 'wallet']) test(`CF ${picker}: close preserves draft and restores focus`, async ({ page }) => {
  const errors = await open(page)
  const amount = page.getByTestId('transaction-fields-amount')
  await amount.fill('35000')
  const amountBefore = await amount.inputValue()
  const opener = page.getByTestId(`transaction-fields-${picker}`)
  await opener.click()
  const sheet = page.getByTestId(`transaction-${picker}-sheet`)
  await expect(sheet).toBeVisible()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByTestId(`transaction-${picker}-sheet-panel`)).toBeInViewport()
  await page.screenshot({ path: `test-results/experience/cf-${process.env.CF_PHASE || 'before'}-${picker}-${page.viewportSize()!.width}.png` })
  const close = page.getByTestId(`transaction-${picker}-sheet-close`)
  const box = await close.boundingBox()
  expect(box!.width).toBeGreaterThanOrEqual(44)
  expect(box!.height).toBeGreaterThanOrEqual(44)
  await close.click()
  await expect(sheet).toHaveCount(0)
  await expect(amount).toHaveValue(amountBefore)
  await expect(opener).toBeFocused()
  expect(errors).toEqual([])
})

test('CF date: Escape preserves date and amount', async ({ page }) => {
  const errors = await open(page)
  const amount = page.getByTestId('transaction-fields-amount')
  await amount.fill('42000')
  const previousAmount = await amount.inputValue()
  const opener = page.getByTestId('transaction-fields-date')
  const previousDate = await opener.innerText()
  await opener.click()
  await expect(page.getByTestId('transaction-date-sheet')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByTestId('transaction-date-sheet-close').focus()
  await expect(page.getByTestId('transaction-date-sheet-close')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('transaction-date-sheet')).toHaveCount(0)
  await expect(opener).toHaveText(previousDate, { useInnerText: true })
  await expect(amount).toHaveValue(previousAmount)
  await expect(opener).toBeFocused()
  expect(errors).toEqual([])
})

test('CF wallet: selection visible after reopen and non-color cue', async ({ page }) => {
  const errors = await open(page)
  const opener = page.getByTestId('transaction-fields-wallet')
  await opener.click()
  await page.getByTestId('transaction-wallet-option-w-target').click()
  await expect(opener).toContainText('Second Wallet')
  await opener.click()
  await expect(page.getByTestId('transaction-wallet-option-w-target')).toContainText('✓')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.screenshot({ path: `test-results/experience/cf-${process.env.CF_PHASE || 'before'}-wallet-selected-${page.viewportSize()!.width}.png` })
  await page.keyboard.press('Escape')
  expect(errors).toEqual([])
})


for (const language of ['id', 'en']) test(`CF category selection ${language}`, async ({ page }) => {
  const errors = await open(page, true, language)
  const opener = page.getByTestId('transaction-fields-category')
  await opener.click()
  const name = language === 'id' ? 'Makan & Minum' : 'Food & Beverage'
  const option = page.getByTestId(`transaction-category-option-${name}`)
  await option.click()
  await expect(opener).toContainText(name)
  await opener.click()
  await expect(option).toContainText('✓')
  await expect(option).toHaveAttribute('aria-label', new RegExp(language === 'id' ? 'Terpilih' : 'Selected'))
  await page.getByTestId('transaction-category-sheet-backdrop').click({ position: { x: 5, y: 5 } })
  await expect(opener).toContainText(name)
  expect(errors).toEqual([])
})

test('CF date confirms and focus stays within modal', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors = await open(page)
  await page.getByTestId('transaction-fields-date').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByTestId('transaction-date-sheet-close').focus()
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('[aria-modal="true"]'))).toBe(true)
  }
  await page.getByTestId('transaction-date-confirm').click()
  await expect(page.getByTestId('transaction-date-sheet')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('CF transfer target selection is explicit', async ({ page }) => {
  const errors = await open(page)
  await page.getByTestId('transaction-fields-type-transfer').click()
  await expect(page.getByTestId('transaction-fields-category')).toHaveCount(0)
  const target = page.getByTestId('transaction-fields-target-wallet')
  await target.click()
  await page.getByTestId('transaction-target-wallet-option-w-target').click()
  await expect(target).toContainText('Second Wallet')
  await target.click()
  await expect(page.getByTestId('transaction-target-wallet-option-w-target')).toContainText('✓')
  await page.getByTestId('transaction-target-wallet-sheet-close').click()
  expect(errors).toEqual([])
})


test('CF context sheet closes without changing personal context', async ({ page }) => {
  const errors = await open(page)
  await page.goto('/capture')
  await page.waitForLoadState('networkidle')
  const trigger = page.getByTestId('finance-context-switcher')
  await expect(trigger).toBeVisible()
  const before = await trigger.innerText()
  await trigger.click()
  await expect(page.getByTestId('finance-context-option-personal')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByTestId('finance-context-sheet-close').click()
  await expect(trigger).toHaveText(before, { useInnerText: true })
  await expect(trigger).toBeFocused()
  expect(errors).toEqual([])
})


async function selectedDay(page: Page) {
  return page.getByTestId('transaction-date-wheel-picker-date-scroll').evaluate(el => {
    const selected = [...el.querySelectorAll('[data-testid]')].find(item => getComputedStyle(item).opacity === '1')
    return Number(selected?.getAttribute('data-testid')?.split('-').at(-1))
  })
}

async function shiftStagedDay(page: Page) {
  const wheel = page.getByTestId('transaction-date-wheel-picker-date-scroll')
  await expect(wheel).toBeVisible()
  await expect.poll(() => selectedDay(page)).toBeGreaterThan(0)
  const before = await selectedDay(page)
  const count = await wheel.locator('[data-testid]').count()
  const next = before < count ? before + 1 : before - 1
  // RN Web drops accessibilityValue; inspect the visible centered day instead.
  // Scroll through the real onScroll debounce, then require three stable reads.
  await wheel.hover()
  await page.mouse.wheel(0, next > before ? 44 : -44)
  let stable = 0
  await expect.poll(async () => {
    const day = await selectedDay(page)
    stable = day === next ? stable + 1 : 0
    return stable
  }, { intervals: [100, 100, 100] }).toBeGreaterThanOrEqual(3)
  return { before, next }
}

for (const dismissal of ['close', 'Escape']) test(`CF changed date cancels via ${dismissal} without changing other draft fields`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors = await open(page)
  const amount = page.getByTestId('transaction-fields-amount')
  await amount.fill('42000')
  const previousAmount = await amount.inputValue()
  const category = page.getByTestId('transaction-fields-category')
  await category.click()
  await page.getByTestId('transaction-category-option-Makan & Minum').click()
  const previousCategory = await category.innerText()
  const wallet = page.getByTestId('transaction-fields-wallet')
  const previousWallet = await wallet.innerText()
  const trigger = page.getByTestId('transaction-fields-date')
  const previousDate = await trigger.innerText()
  await trigger.click()
  const { before } = await shiftStagedDay(page)
  const close = page.getByTestId('transaction-date-sheet-close')
  if (dismissal === 'close') await close.click()
  else { await close.focus(); await page.keyboard.press('Escape') }
  await expect(page.getByTestId('transaction-date-sheet')).toHaveCount(0)
  await expect(trigger).toHaveText(previousDate, { useInnerText: true })
  await expect(trigger).toBeFocused()
  await trigger.click()
  await expect.poll(() => selectedDay(page)).toBe(before)
  await close.click()
  await expect(amount).toHaveValue(previousAmount)
  await expect(category).toHaveText(previousCategory, { useInnerText: true })
  await expect(wallet).toHaveText(previousWallet, { useInnerText: true })
  expect(errors).toEqual([])
})

test('CF changed date confirms and survives reopen without changing amount or wallet', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors = await open(page)
  const amount = page.getByTestId('transaction-fields-amount')
  await amount.fill('42000')
  const previousAmount = await amount.inputValue()
  const wallet = page.getByTestId('transaction-fields-wallet')
  const previousWallet = await wallet.innerText()
  const trigger = page.getByTestId('transaction-fields-date')
  const previousDate = await trigger.innerText()
  await trigger.click()
  const { next } = await shiftStagedDay(page)
  await page.getByTestId('transaction-date-confirm').click()
  await expect(page.getByTestId('transaction-date-sheet')).toHaveCount(0)
  await expect(trigger).not.toHaveText(previousDate, { useInnerText: true })
  await trigger.click()
  await expect.poll(() => selectedDay(page)).toBe(next)
  await page.getByTestId('transaction-date-sheet-close').click()
  await expect(amount).toHaveValue(previousAmount)
  await expect(wallet).toHaveText(previousWallet, { useInnerText: true })
  expect(errors).toEqual([])
})

test('CF reduced viewport keeps amount and action reachable', async ({ page }) => {
  const errors = await open(page)
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 420 })
  const amount = page.getByTestId('transaction-fields-amount')
  await amount.fill('35000')
  const value = await amount.inputValue()
  await amount.blur()
  const submit = page.getByTestId('transaction-form-submit')
  await submit.scrollIntoViewIfNeeded()
  await expect(submit).toBeInViewport()
  expect(await submit.evaluate(el => {
    const r = el.getBoundingClientRect()
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return !!hit && (el === hit || el.contains(hit))
  })).toBe(true)
  await amount.scrollIntoViewIfNeeded()
  await expect(amount).toHaveValue(value)
  expect(errors).toEqual([])
})
