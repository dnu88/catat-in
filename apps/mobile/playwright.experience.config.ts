import { defineConfig, devices } from '@playwright/test'

/**
 * Local Experience preview config (P6/T26).
 *
 * Deliberately SEPARATE from playwright.golive.config.ts: this one never points
 * at production and never uses real credentials. It serves the local
 * `expo export` output through scripts/preview-server.mjs and lets each test
 * stub Supabase over the network + toggle the presentation flags at runtime.
 *
 *   corepack pnpm export:pwa          # once, with stub Supabase env
 *   corepack pnpm exec playwright test -c playwright.experience.config.ts
 */
const HOST = process.env.EXPERIENCE_PREVIEW_HOST || '127.0.0.1'
const PORT = Number(process.env.EXPERIENCE_PREVIEW_PORT || 4174)
const BASE_URL = `http://${HOST}:${PORT}`

export default defineConfig({
  testDir: './tests/experience',
  // Playwright wipes its outputDir at the start of every run. Keep that scratch
  // dir away from `test-results/experience/`, which holds the T26 before/after
  // screenshots that must survive across runs.
  outputDir: './test-results/pw-output',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    // No auth state is loaded from disk: every test seeds its own stubbed
    // session, so a stale real token can never leak into the preview.
    storageState: undefined,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  webServer: {
    command: `node scripts/preview-server.mjs ${PORT}`,
    url: `${BASE_URL}/index.html`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'preview-360',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 800 } },
    },
    {
      name: 'preview-390',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'preview-430',
      use: { ...devices['Desktop Chrome'], viewport: { width: 430, height: 932 } },
    },
  ],
})
