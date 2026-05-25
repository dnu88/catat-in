import { router, useLocalSearchParams } from 'expo-router'
import * as Linking from 'expo-linking'
import { useEffect, useState } from 'react'

import { StaggeredStack } from '../../src/components/motion'
import { AuthFormCard, AuthHeroPanel, AuthScreenLayout } from '../../src/components/ui'
import { StateMessage } from '../../src/components/ui'
import { useI18n } from '../../src/i18n/i18n-context'
import { getAuthCodeFromUrl, getStringParam } from '../../src/lib/auth-redirects'
import { useSupabase } from '../../src/lib/supabase'

export default function AuthCallbackScreen() {
  const { supabase } = useSupabase()
  const { t } = useI18n()
  const params = useLocalSearchParams<Record<string, string | string[]>>()
  const [message, setMessage] = useState(t('authCallbackLoading'))
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    let mounted = true

    async function completeLogin() {
      const initialUrl = await Linking.getInitialURL()
      const code = getStringParam(params.code) ?? (initialUrl ? getAuthCodeFromUrl(initialUrl) : null)

      if (!code) {
        if (mounted) {
          setIsError(true)
          setMessage(t('authCallbackFailed'))
        }
        return
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!mounted) {
        return
      }

      if (error) {
        setIsError(true)
        setMessage(t('authCallbackFailed'))
        return
      }

      router.replace('/(tabs)')
    }

    completeLogin()

    return () => {
      mounted = false
    }
  }, [params.code, supabase, t])

  return (
    <AuthScreenLayout>
      <StaggeredStack testIDPrefix="auth-callback-entrance">
        <AuthHeroPanel key="auth-callback-hero" icon="lock" iconTone="primary" title={t('authCallbackTitle')} />
        <AuthFormCard key="auth-callback-form" title={t('authCallbackTitle')} subtitle={t('authCallbackSubtitle')}>
          <StateMessage message={message} tone={isError ? 'error' : 'success'} />
        </AuthFormCard>
      </StaggeredStack>
    </AuthScreenLayout>
  )
}
