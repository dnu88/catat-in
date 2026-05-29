import { expect, test } from '@playwright/test';

import { getGoLiveCredentials } from '../env';
import {
  createBudget,
  createCaptureExpense,
  createManualExpense,
  createWallet,
  editFirstTransactionViaSwipe,
  expectNoConsoleErrors,
  expectReportContainsCategory,
  expectTransactionVisible,
  login,
  testData,
} from '../helpers';
import { createSupabaseAdmin, ensureGoLiveUser, readGoLiveState } from '../supabase-admin';

test.describe.serial('Kaswise PWA core finance go-live flow', () => {
  test('wallet, budget, manual transaction, reports, capture, and budget allocation work end-to-end', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name.includes('desktop'),
      'Core data-mutating smoke runs once on the mobile project; desktop is covered by public/auth checks.',
    );

    const assertNoConsoleErrors = await expectNoConsoleErrors(page);

    await login(page);
    await createWallet(page);
    await createBudget(page);
    await createManualExpense(page);
    await expectTransactionVisible(page, testData.manualDescription);
    await expectReportContainsCategory(page, 'Makan');
    await editFirstTransactionViaSwipe(page);
    await createCaptureExpense(page);
    await expectTransactionVisible(page, 'Beli kopi 35rb');

    const { email, password } = getGoLiveCredentials();
    const admin = createSupabaseAdmin();
    const user = await ensureGoLiveUser(admin, email, password);
    const state = await readGoLiveState(admin, user.id);

    expect(state.wallets.some((wallet: { name?: string }) => wallet.name === testData.walletName)).toBe(true);
    expect(state.envelopes.some((envelope: { name?: string }) => envelope.name === testData.budgetName)).toBe(true);
    expect(state.transactions.some((tx: { catatan?: string }) => tx.catatan === testData.manualDescription)).toBe(true);
    expect(state.transactions.some((tx: { catatan?: string; raw_input?: string }) =>
      tx.catatan?.includes('Beli kopi') || tx.raw_input?.includes('Beli kopi'),
    )).toBe(true);
    expect(state.allocations.length).toBeGreaterThanOrEqual(1);

    await assertNoConsoleErrors();
  });
});
