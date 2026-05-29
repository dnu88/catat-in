import { expect, test } from '@playwright/test';

import { expectNoConsoleErrors, login, logout } from '../helpers';

test.describe('Kaswise PWA auth go-live checks', () => {
  test('test user can login and logout', async ({ page }) => {
    const assertNoConsoleErrors = await expectNoConsoleErrors(page);
    await login(page);
    await expect(page.getByText(/Kaswise|Beranda|Home/i).first()).toBeVisible();
    await logout(page);
    await assertNoConsoleErrors();
  });
});
