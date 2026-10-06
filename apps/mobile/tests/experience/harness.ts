import { type Page } from '@playwright/test'

/**
 * Shared harness for the local Experience preview (P6/T26 + T12 measurements).
 *
 * Drives the real exported bundle with a STUBBED Supabase, a stubbed specialist
 * backend, and runtime feature overrides. Nothing here touches production,
 * credentials, or live data.
 */

export const SUPABASE_HOST = 'preview-stub.supabase.co'
export const SESSION_KEY = 'sb-preview-stub-auth-token'

export type Flags = {
  simpleNavigation: boolean
  transactionEntryV2: boolean
  aiAutosaveText: boolean
  voiceNote: boolean
  importStatement: boolean
  simplePremiumExperience: boolean
}

export const BASE_FLAGS: Flags = {
  simpleNavigation: true,
  transactionEntryV2: true,
  aiAutosaveText: true,
  voiceNote: false,
  importStatement: false,
  simplePremiumExperience: false,
}

export function stubSession() {
  const now = Math.floor(Date.now() / 1000)
  return {
    access_token: 'preview-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'preview-refresh-token',
    user: {
      id: 'preview-user',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'preview@example.invalid',
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  }
}

/** One owner wallet so the premium row is in its "ready" state. */
export const WALLET_ROW = {
  id: 'w-preview',
  user_id: 'preview-user',
  name: 'Preview Wallet',
  type: 'bank',
  balance: 1500000,
  currency: 'IDR',
  is_active: true,
  household_id: null,
}

/**
 * Read-only rows the preview may serve instead of an empty table. Defaults to
 * empty so every existing spec keeps its original behaviour.
 */
export type ExperienceFixtures = {
  transactions?: unknown[]
  /**
   * Force an HTTP status for a table read, so error/retry states can be driven
   * from the preview instead of only being unit tested.
   */
  status?: {
    transactions?: number
  }
}

export async function bootExperience(
  page: Page,
  overrides: Partial<Flags> = {},
  fixtures: ExperienceFixtures = {},
) {
  const flags: Flags = { ...BASE_FLAGS, ...overrides }

  await stubBackend(page)

  // Runs before ANY app script: sets the runtime flag override the app already
  // supports, and seeds a stubbed session.
  await page.addInitScript(
    ([flagsJson, sessionJson, sessionKey]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__KASWISE_FEATURE_FLAGS__ = JSON.parse(flagsJson)
      window.localStorage.setItem(sessionKey, sessionJson)
    },
    [JSON.stringify(flags), JSON.stringify(stubSession()), SESSION_KEY],
  )

  // Every Supabase call is answered locally.
  await page.route(`**/${SUPABASE_HOST}/**`, async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes('/auth/v1/')) {
      if (url.includes('/logout')) return route.fulfill({ status: 204, body: '' })
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...stubSession(),
          access_token: 'preview-access-token',
        }),
      })
    }

    if (method === 'HEAD') {
      return route.fulfill({ status: 200, headers: { 'content-range': '0-0/0' } })
    }

    if (
      url.includes('/rest/v1/transactions') &&
      fixtures.status?.transactions &&
      fixtures.status.transactions >= 400
    ) {
      return route.fulfill({
        status: fixtures.status.transactions,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'preview forced failure', code: 'PGRST000' }),
      })
    }

    // PostgREST reads: wallets get one row, transactions get the caller's
    // fixture when provided, everything else stays empty.
    const body: unknown[] = url.includes('/rest/v1/wallets')
      ? [WALLET_ROW]
      : url.includes('/rest/v1/transactions')
        ? (fixtures.transactions ?? [])
        : []
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': `0-${Math.max(body.length - 1, 0)}/${body.length}` },
      body: JSON.stringify(body),
    })
  })

  return flags
}

/** The backend (entitlements etc.) must never be reached from the preview. */
export async function stubBackend(page: Page) {
  await page.route('**/api.kaswise.com/**', async (route) => {
    const url = route.request().url()
    // Entitlements drive the quota caption and the photo gate, so answer with a
    // realistic shape (photo_limit > 0 => the receipt route stays unlocked).
    const body = url.includes('/me/entitlements')
      ? {
          plan: 'free',
          period_ym: '2026-10',
          chat_used: 1,
          chat_limit: 10,
          photo_used: 0,
          photo_limit: 5,
        }
      : {}
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(body),
    })
  })
}

export async function gotoCapture(page: Page) {
  await page.goto('/capture')
  await page.waitForLoadState('networkidle')
}

/** Plan rule: wait for the real computed opacity, not just `visible`. */
export async function waitForOpaque(page: Page, testId: string) {
  const locator = page.getByTestId(testId).first()
  await locator.waitFor({ state: 'attached' })
  await page
    .waitForFunction(
      (id) => {
        const node = document.querySelector(`[data-testid="${id}"]`)
        if (!node) return false
        let current: Element | null = node
        while (current) {
          const opacity = Number(window.getComputedStyle(current).opacity || '1')
          if (Number.isFinite(opacity) && opacity < 0.95) return false
          current = current.parentElement
        }
        return true
      },
      testId,
      { timeout: 10_000 },
    )
    .catch(() => undefined)
  return locator
}

/** Collects page errors so a test can assert the app never crashed. */
export function trackPageErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  return errors
}
