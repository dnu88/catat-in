import { defineConfig, devices } from '@playwright/test';

import { loadGoLiveEnv, resolveGoLiveBaseUrl } from './tests/golive/env';

loadGoLiveEnv();

const baseURL = resolveGoLiveBaseUrl();

export default defineConfig({
  testDir: './tests/golive/specs',
  globalSetup: './tests/golive/global.setup.ts',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/golive', open: 'never' }],
    ['json', { outputFile: 'test-results/golive/results.json' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'kaswise-live-mobile-chrome',
      use: {
        ...devices['Pixel 7'],
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'kaswise-live-desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 900 },
      },
    },
  ],
});
