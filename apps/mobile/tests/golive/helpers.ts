import { expect, type Dialog, type Locator, type Page } from '@playwright/test';

import { isIgnoredGoLiveConsoleError } from './console-errors';
import { getGoLiveCredentials } from './env';

export const runId = process.env.KASWISE_GOLIVE_RUN_ID || new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

export const testData = {
  walletName: `GoLive Wallet ${runId}`,
  budgetName: `GoLive Makan ${runId}`,
  manualDescription: `GoLive makan manual ${runId}`,
  captureDescription: `Beli kopi 35rb di Kopi Kenangan ${runId}`,
  manualAmount: '125000',
  budgetLimit: '500000',
};

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function currentMonthRange(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start: todayKey(start), end: todayKey(end), startDay: 1, endDay: end.getUTCDate() };
}

function byName(page: Page, name: string | RegExp): Locator {
  return page.getByRole('button', { name }).or(page.getByRole('link', { name }));
}

export async function expectNoConsoleErrors(page: Page) {
  const errors: string[] = [];
  const record = (text: string) => {
    if (!isIgnoredGoLiveConsoleError(text)) errors.push(text);
  };
  page.on('console', (message) => {
    if (message.type() === 'error') record(message.text());
  });
  page.on('pageerror', (error) => record(error.message));
  return () => expect(errors, `Browser console/page errors:\n${errors.join('\n')}`).toEqual([]);
}

export async function gotoApp(page: Page, path = '/') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

export async function login(page: Page) {
  const { email, password } = getGoLiveCredentials();
  await gotoApp(page, '/login');

  const appShell = page
    .getByText(/Beranda|Home|Transaksi|Transactions|Laporan|Reports|Setelan|Settings/i)
    .first();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await appShell.isVisible().catch(() => false)) return;

    const emailInput = page.getByLabel('Email').first();
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(email);
      await page.getByLabel('Password').first().fill(password);
      await page.getByRole('button', { name: /^Masuk$|^Sign in$/i }).first().click();
    } else {
      await gotoApp(page, '/');
    }

    await appShell.waitFor({ state: 'visible', timeout: 12_000 }).catch(() => undefined);
  }

  await expect(appShell).toBeVisible({ timeout: 30_000 });
}

export async function logout(page: Page) {
  await gotoApp(page, '/settings');
  await page.getByTestId('settings-logout').click();
  await expect(page.getByLabel('Email').first()).toBeVisible({ timeout: 30_000 });
}

export async function openWallets(page: Page) {
  await gotoApp(page, '/wallets');
  await expect(page.getByTestId('wallets-header')).toBeVisible();
}

export async function openBudgets(page: Page) {
  await gotoApp(page, '/budgets');
  await expect(page.getByTestId('budgets-overview')).toBeVisible();
}

export async function openManualTransaction(page: Page) {
  await gotoApp(page, '/transaction-new');
  await expect(page.getByTestId('transaction-form-amount')).toBeVisible();
}

export async function createWallet(page: Page, name = testData.walletName) {
  await openWallets(page);
  await page.getByTestId('wallets-create-toggle').click();
  await expect(page.getByTestId('wallet-create-form')).toBeVisible();
  await page.getByLabel(/Nama dompet|Wallet name/i).first().fill(name);
  await page.getByLabel(/Saldo awal|Starting balance/i).first().fill('1000000');
  await page.getByTestId('wallet-type-cash').click();
  await page.getByTestId('wallet-create-submit').click();
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 30_000 });
}

export async function createBudget(page: Page, name = testData.budgetName) {
  await openBudgets(page);
  await page.getByRole('button', { name: /\+ Baru|\+ New/i }).click();
  await expect(page.getByTestId('envelope-create-form')).toBeVisible();
  await page.getByLabel(/Nama dompet|Wallet name/i).first().fill(name);
  await page.getByLabel(/Limit/i).first().fill(testData.budgetLimit);
  await page.getByTestId('budget-category-dropdown').click();
  await page.getByRole('button', { name: /Kategori: Makan|Category: Food|Food & Beverage|Makan & Minum/i }).first().click();
  const range = currentMonthRange();
  await page.getByTestId('budget-start-date-dropdown').click();
  await page.getByTestId(`budget-start-date-option-${range.startDay}`).click();
  await page.getByTestId('budget-end-date-dropdown').click();
  await page.getByTestId(`budget-end-date-option-${range.endDay}`).click();
  await page.getByLabel(/Catatan|Notes/i).first().fill('makan kopi gofood nasi ayam');
  await page.getByRole('button', { name: /Simpan dompet|Save budget wallet/i }).click();
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 30_000 });
}

function registerExpectedDialogAutoAccept(page: Page, expectedMessage: RegExp) {
  const unexpectedDialogs: string[] = [];
  const handler = (dialog: Dialog) => {
    void (async () => {
      const message = dialog.message();
      if (expectedMessage.test(message)) {
        await dialog.accept();
        return;
      }

      unexpectedDialogs.push(`${dialog.type()}: ${message}`);
      await dialog.dismiss().catch(() => undefined);
    })();
  };

  page.on('dialog', handler);
  return () => {
    page.off('dialog', handler);
    return unexpectedDialogs;
  };
}

async function readVisibleTransactionFormError(page: Page) {
  const formError = page.getByTestId('transaction-form-error');
  if (!(await formError.isVisible().catch(() => false))) return null;
  return (await formError.textContent())?.trim() || 'Unknown transaction form error';
}

async function waitForManualTransactionResult(page: Page, description: string) {
  const formError = page.getByTestId('transaction-form-error');
  const outcome = await Promise.race([
    formError.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'form-error' as const),
    page.waitForURL(/\/transactions\/?(?:[?#]|$)/, { timeout: 30_000 }).then(() => 'transactions-page' as const),
  ]).catch(() => 'timeout' as const);

  if (outcome === 'form-error') {
    const message = await readVisibleTransactionFormError(page);
    throw new Error(`Manual transaction insert failed: ${message}`);
  }

  const message = await readVisibleTransactionFormError(page);
  if (message) throw new Error(`Manual transaction insert failed: ${message}`);

  await expectTransactionVisible(page, description);
}

export async function createManualExpense(page: Page) {
  await openManualTransaction(page);
  await page.getByLabel('Nominal transaksi').fill(testData.manualAmount);
  await page.getByLabel('Deskripsi transaksi').fill(testData.manualDescription);
  await page.getByRole('button', { name: new RegExp(`Pilih dompet ${testData.walletName}`) }).first().click();
  await page.getByRole('button', { name: /Pilih kategori Makan/i }).click();
  await page.getByLabel('Tanggal transaksi').fill(todayKey());
  await page.getByLabel('Merchant transaksi opsional').fill('GoLive Warteg');

  const stopDialogAutoAccept = registerExpectedDialogAutoAccept(page, /Berhasil|Transaksi tersimpan/i);
  let operationError: unknown = null;
  try {
    await page.getByRole('button', { name: /Simpan transaksi manual/i }).click();
    await waitForManualTransactionResult(page, testData.manualDescription);
  } catch (error) {
    operationError = error;
    throw error;
  } finally {
    const unexpectedDialogs = stopDialogAutoAccept();
    if (!operationError && unexpectedDialogs.length > 0) {
      throw new Error(`Unexpected manual transaction dialog(s): ${unexpectedDialogs.join(' | ')}`);
    }
  }
}

export async function createCaptureExpense(page: Page) {
  await gotoApp(page, '/capture');
  await expect(page.getByTestId('capture-input')).toBeVisible();
  const walletChip = page.getByRole('button', { name: new RegExp(`Dompet.*${testData.walletName}|Wallet.*${testData.walletName}`) }).first();
  if (await walletChip.isVisible().catch(() => false)) await walletChip.click();
  await page.getByLabel(/Input teks transaksi|Transaction text input/i).fill(testData.captureDescription);
  await page.getByRole('button', { name: /Proses transaksi dengan AI|Process transaction with AI/i }).click();
  await expect(page.getByTestId('capture-success')).toBeVisible({ timeout: 30_000 });
}

export async function expectTransactionVisible(page: Page, description: string) {
  await gotoApp(page, '/transactions');
  await expect(page.getByText(description).first()).toBeVisible({ timeout: 30_000 });
}

export async function expectReportContainsCategory(page: Page, category = 'Makan') {
  await gotoApp(page, '/reports');
  await page.getByRole('button', { name: /Tampilkan kategori laporan|Show category report|Kategori|Category/i }).click({ force: true });
  await expect(page.getByText(new RegExp(category, 'i')).first()).toBeVisible({ timeout: 30_000 });
}

export async function editFirstTransactionViaSwipe(page: Page) {
  await gotoApp(page, '/transactions');
  await expect(page.getByText(testData.manualDescription).first()).toBeVisible();
  const editButton = page.getByRole('button', {
    name: new RegExp(`Edit transaksi.*${testData.manualDescription}|Edit transaction.*${testData.manualDescription}`),
  });
  await expect(editButton.first()).toBeVisible();
}

export async function clickAny(page: Page, name: string | RegExp) {
  await byName(page, name).first().click();
}
