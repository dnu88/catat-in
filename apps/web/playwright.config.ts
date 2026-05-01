import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  webServer: {
    command: 'pnpm dev -- --host 127.0.0.1 --port 3000',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 960 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
