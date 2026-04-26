import { expect, type APIRequestContext, type Page } from '@playwright/test'

export interface TestUser {
  fullName: string
  email: string
  password: string
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresIn: number
  userId: string
  email: string
}

const SUPABASE_AUTH_STORAGE_KEY = 'sb-xqvtsgfakuehjwdmenuw-auth-token'
const APP_AUTH_STORAGE_KEY = 'catat-in-auth'

export function buildTestUser(prefix = 'pw'): TestUser {
  const stamp = `${Date.now()}_${Math.floor(Math.random() * 10_000)}`
  return {
    fullName: `Playwright ${prefix}`,
    email: `${prefix}_${stamp}@example.com`,
    password: 'Pass1234!',
  }
}

export async function registerUserViaBackend(request: APIRequestContext, user: TestUser) {
  const response = await request.post('http://127.0.0.1:8000/api/v1/auth/register', {
    data: {
      email: user.email,
      password: user.password,
      full_name: user.fullName,
    },
  })

  expect(response.ok()).toBeTruthy()
}

export async function loginUserViaBackend(request: APIRequestContext, user: TestUser): Promise<AuthSession> {
  const response = await request.post('http://127.0.0.1:8000/api/v1/auth/login', {
    data: {
      email: user.email,
      password: user.password,
    },
  })

  expect(response.ok()).toBeTruthy()
  const payload = await response.json()

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in,
    userId: payload.user.id,
    email: payload.user.email,
  }
}

export async function bootstrapSession(page: Page, session: AuthSession, targetPath = '/dashboard') {
  const expiresAt = Math.floor(Date.now() / 1000) + session.expiresIn
  const authTokenPayload = {
    access_token: session.accessToken,
    token_type: 'bearer',
    expires_in: session.expiresIn,
    expires_at: expiresAt,
    refresh_token: session.refreshToken,
    user: {
      id: session.userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: session.email,
    },
  }
  const persistedAuthPayload = {
    state: {
      user: {
        id: session.userId,
        email: session.email,
        full_name: null,
      },
      isAuthenticated: true,
    },
    version: 0,
  }

  await page.addInitScript(
    ({ authToken, persistedAuth, authStorageKey, appStorageKey }) => {
      window.localStorage.setItem(authStorageKey, JSON.stringify(authToken))
      window.localStorage.setItem(appStorageKey, JSON.stringify(persistedAuth))
    },
    {
      authToken: authTokenPayload,
      persistedAuth: persistedAuthPayload,
      authStorageKey: SUPABASE_AUTH_STORAGE_KEY,
      appStorageKey: APP_AUTH_STORAGE_KEY,
    },
  )
  await page.goto(targetPath)
  await page.waitForURL(`**${targetPath}`)
}
