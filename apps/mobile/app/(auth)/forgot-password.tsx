import { router } from 'expo-router'
import { useState } from 'react'
import { StaggeredStack } from "../../src/components/motion";

import { AuthBackButton, AuthButton, AuthFormCard, AuthHeroPanel, AuthLink, AuthScreenLayout } from '../../src/components/ui'
import { InputField, StateMessage } from '../../src/components/ui'
import { useI18n } from '../../src/i18n/i18n-context'
import { getPasswordResetRedirectTo } from '../../src/lib/auth-redirects'
import { useSupabase } from '../../src/lib/supabase'

export default function ForgotPasswordScreen() {
  const { supabase } = useSupabase()
  const { t, language } = useI18n()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const isError = message === t('resetFailed')

  const onReset = async () => {
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getPasswordResetRedirectTo(),
    })

    setLoading(false)

    if (error) {
      setMessage(t('resetFailed'))
      return
    }

    setMessage(t('resetSuccess'))
  }

  return (
    <AuthScreenLayout>
      <StaggeredStack testIDPrefix="forgot-password-entrance">
      <AuthBackButton key="forgot-password-back" onPress={() => router.back()} label={t('back')} />

      <AuthHeroPanel key="forgot-password-hero" icon="email" iconTone="warning" eyebrow={language === 'id' ? 'Reset password' : 'Reset password'} title={t('forgotPasswordHeroTitle')} />

      <AuthFormCard key="forgot-password-form" title={t('forgotPasswordTitle')} subtitle={t('forgotPasswordSubtitle')}>
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

        {message ? <StateMessage message={message} tone={isError ? 'error' : 'success'} /> : null}

        <AuthButton label={t('forgotPasswordButton')} onPress={onReset} loading={loading} disabled={loading} />

        <AuthLink href="/(auth)/login" label={t('forgotPasswordLink')} align="center" />
      </AuthFormCard>
      </StaggeredStack>
    </AuthScreenLayout>
  )
}
