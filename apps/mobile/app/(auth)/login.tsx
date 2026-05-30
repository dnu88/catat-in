import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Platform } from 'react-native'
import { StaggeredStack } from "../../src/components/motion";

import { AuthButton, AuthFooter, AuthFormCard, AuthHeroPanel, AuthLink, AuthScreenLayout } from '../../src/components/ui'
import { InputField, StateMessage } from '../../src/components/ui'
import { KaswiseLogoMark } from '../../src/components/brand/KaswiseLogoMark'
import { useI18n } from '../../src/i18n/i18n-context'
import { getAuthCallbackRedirectTo, getAuthCodeFromUrl, isStandaloneWebApp } from '../../src/lib/auth-redirects'
import { useSupabase } from '../../src/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const { supabase } = useSupabase()
  const { t } = useI18n()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onLogin = async () => {
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(t('loginFailed'))
      return
    }

    router.replace('/(tabs)')
  }

  const onGoogleLogin = async () => {
    setError(null)
    setGoogleLoading(true)

    const redirectTo = getAuthCallbackRedirectTo()
    const shouldUseFullRedirect = Platform.OS === 'web' && isStandaloneWebApp()
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: !shouldUseFullRedirect,
      },
    })

    if (oauthError || !data.url) {
      setGoogleLoading(false)
      setError(t('googleLoginFailed'))
      return
    }

    if (shouldUseFullRedirect) {
      if (typeof window !== 'undefined') {
        window.location.assign(data.url)
      }
      return
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

    if (result.type !== 'success') {
      setGoogleLoading(false)
      return
    }

    const code = getAuthCodeFromUrl(result.url)
    if (!code) {
      setGoogleLoading(false)
      setError(t('googleLoginFailed'))
      return
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    setGoogleLoading(false)

    if (exchangeError) {
      setError(t('googleLoginFailed'))
      return
    }

    router.replace('/(tabs)')
  }

  return (
    <AuthScreenLayout>
      <StaggeredStack testIDPrefix="login-entrance">
      <KaswiseLogoMark key="login-logo" testID="login-kaswise-logo-mark" size={58} />
      <AuthHeroPanel
        key="login-hero"
        icon="lock"
        iconTone="primary"
        title={t('loginHeroTitle')}
        description={t('loginHeroDescription')}
        stats={[
          { icon: 'wallets', label: t('statWalletNeat'), tone: 'success' },
          { icon: 'chart', label: t('statInsightFast'), tone: 'accent' },
        ]}
      />

      <AuthFormCard key="login-form" title={t('loginTitle')} subtitle={t('loginSubtitle')}>
        <InputField
          label={t('emailLabel')}
          value={email}
          onChangeText={setEmail}
          placeholder={t('emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          textContentType="emailAddress"
        />

        <InputField
          label={t('passwordLabel')}
          value={password}
          onChangeText={setPassword}
          placeholder={t('passwordPlaceholder')}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          autoCorrect={false}
          textContentType="password"
        />

        {error ? <StateMessage message={error} tone="error" /> : null}

        <AuthButton label={t('loginButton')} onPress={onLogin} loading={loading} disabled={loading || googleLoading} />
        <AuthButton testID="auth-google-button" label={t('googleLoginButton')} onPress={onGoogleLogin} loading={googleLoading} disabled={loading || googleLoading} />

        <AuthLink href="/(auth)/forgot-password" label={t('forgotPasswordPrompt')} variant="secondary" align="right" />
      </AuthFormCard>

      <AuthFooter key="login-footer" question={t('noAccount')} linkLabel={t('registerButton')} linkHref="/(auth)/register" />
      </StaggeredStack>
    </AuthScreenLayout>
  )
}
