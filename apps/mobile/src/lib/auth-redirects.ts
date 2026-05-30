import * as Linking from 'expo-linking'
import { Platform } from 'react-native'

function getWebRedirectUrl(path: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.location?.origin) {
    return null
  }

  return new URL(path, window.location.origin).toString()
}

export function isStandaloneWebApp() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false
  }

  const mediaMatch = typeof window.matchMedia === 'function'
    ? window.matchMedia('(display-mode: standalone)').matches
    : false
  const navigatorStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  )

  return mediaMatch || navigatorStandalone
}

export function getAuthCallbackRedirectTo() {
  return getWebRedirectUrl('/callback') ?? Linking.createURL('/callback')
}

export function getPasswordResetRedirectTo() {
  return getWebRedirectUrl('/reset-password') ?? Linking.createURL('/reset-password')
}

export function getStringParam(value: string | string[] | undefined | null) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function getUrlSearchParams(url: string) {
  const [, queryAndHash = ''] = url.split('?')
  const [query = ''] = queryAndHash.split('#')
  const hash = url.includes('#') ? url.split('#').at(-1) ?? '' : ''

  return [new URLSearchParams(query), new URLSearchParams(hash)]
}

export function getAuthCodeFromUrl(url: string) {
  const [queryParams, hashParams] = getUrlSearchParams(url)
  return queryParams.get('code') ?? hashParams.get('code')
}

export function getAuthTokensFromUrl(url: string) {
  const [queryParams, hashParams] = getUrlSearchParams(url)

  return {
    accessToken: queryParams.get('access_token') ?? hashParams.get('access_token'),
    refreshToken: queryParams.get('refresh_token') ?? hashParams.get('refresh_token'),
    tokenHash: queryParams.get('token_hash') ?? hashParams.get('token_hash'),
    type: queryParams.get('type') ?? hashParams.get('type'),
  }
}
