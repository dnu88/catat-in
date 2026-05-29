import { expect, test } from '@playwright/test';

import { expectNoConsoleErrors, gotoApp } from '../helpers';

test.describe('Kaswise PWA public go-live checks', () => {
  test('loads kaswise.com and exposes Supabase runtime config', async ({ page }) => {
    const assertNoConsoleErrors = await expectNoConsoleErrors(page);
    await gotoApp(page, '/');

    await expect(page.locator('body')).toBeVisible();
    const runtime = await page.evaluate(() => ({
      url: process.env.EXPO_PUBLIC_SUPABASE_URL,
      keyPresent: Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
    }));
    expect(runtime.url).toContain('supabase.co');
    expect(runtime.keyPresent).toBe(true);
    await assertNoConsoleErrors();
  });
});
