import { router, useLocalSearchParams } from 'expo-router'
import * as Linking from 'expo-linking'
import { useEffect, useState } from 'react'

import { StaggeredStack } from '../src/components/motion'
import { AuthBackButton, AuthButton, AuthFormCard, AuthHeroPanel, AuthScreenLayout } from '../src/components/ui'
import { InputField, StateMessage } from '../src/components/ui'
import { useI18n } from '../src/i18n/i18n-context'
import { getAuthCodeFromUrl, getAuthTokensFromUrl, getStringParam } from '../src/lib/auth-redirects'
import { useSupabase } from '../src/lib/supabase'

export default function ResetPasswordScreen() {
  const { supabase } = useSupabase()
  const { t } = useI18n()
  const params = useLocalSearchParams<Record<string, string | string[]>>()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [message, setMessage] = useState(t('resetPasswordPreparing'))
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    let mounted = true

    async function prepareRecoverySession() {
      const initialUrl = await Linking.getInitialURL()
      const code = getStringParam(params.code) ?? (initialUrl ? getAuthCodeFromUrl(initialUrl) : null)
      const urlTokens = initialUrl ? getAuthTokensFromUrl(initialUrl) : null
      const accessToken = getStringParam(params.access_token) ?? urlTokens?.accessToken ?? null
      const refreshToken = getStringParam(params.refresh_token) ?? urlTokens?.refreshToken ?? null
      const tokenHash = getStringParam(params.token_hash) ?? urlTokens?.tokenHash ?? null

      const result = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : accessToken && refreshToken
          ? await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          : tokenHash
            ? await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
            : await supabase.auth.getSession()

      if (!mounted) {
        return
      }

      if (result.error || !result.data.session) {
        setIsError(true)
        setSessionReady(false)
        setMessage(t('resetPasswordLinkInvalid'))
        return
      }

      setIsError(false)
      setSessionReady(true)
      setMessage(t('resetPasswordReady'))
    }

    prepareRecoverySession()

    return () => {
      mounted = false
    }
  }, [params.access_token, params.code, params.refresh_token, params.token_hash, supabase, t])

  const onUpdatePassword = async () => {
    setIsError(false)

    if (password.length < 8) {
      setIsError(true)
      setMessage(t('passwordTooShort'))
      return
    }

    if (password !== confirmPassword) {
      setIsError(true)
      setMessage(t('passwordsDoNotMatch'))
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setIsError(true)
      setMessage(t('resetPasswordUpdateFailed'))
      return
    }

    setIsError(false)
    setMessage(t('resetPasswordUpdateSuccess'))
    router.replace('/(auth)/login')
  }

  return (
    <AuthScreenLayout>
      <StaggeredStack testIDPrefix="reset-password-entrance">
        <AuthBackButton key="reset-password-back" onPress={() => router.replace('/(auth)/login')} label={t('back')} />
        <AuthHeroPanel key="reset-password-hero" icon="lock" iconTone="warning" title={t('resetPasswordHeroTitle')} />

        <AuthFormCard key="reset-password-form" title={t('resetPasswordTitle')} subtitle={t('resetPasswordSubtitle')}>
          <InputField
            label={t('newPasswordLabel')}
            value={password}
            onChangeText={setPassword}
            placeholder={t('passwordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            autoCorrect={false}
            textContentType="newPassword"
          />

          <InputField
            label={t('confirmPasswordLabel')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('passwordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            autoCorrect={false}
            textContentType="newPassword"
          />

          {message ? <StateMessage message={message} tone={isError ? 'error' : 'success'} /> : null}

          <AuthButton
            label={t('resetPasswordButton')}
            onPress={onUpdatePassword}
            loading={loading}
            disabled={loading || !sessionReady}
          />
        </AuthFormCard>
      </StaggeredStack>
    </AuthScreenLayout>
  )
}
