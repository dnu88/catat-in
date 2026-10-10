import { expect, test } from '@playwright/test';

import { expectNoConsoleErrors, login, logout } from '../helpers';

test.describe('Kaswise PWA auth go-live checks', () => {
  test('test user can login and logout', async ({ page }) => {
    const assertNoConsoleErrors = await expectNoConsoleErrors(page);
    await login(page);
    // Premium Home no longer renders a literal "Beranda/Kaswise" heading, so assert a stable
    // post-login surface instead (home CTA or the legacy nav label).
    await expect(
      page.getByTestId('home-capture-cta').or(page.getByText(/Beranda|Home/i).first()),
    ).toBeVisible({ timeout: 30_000 });
    await logout(page);
    await assertNoConsoleErrors();
  });
});
