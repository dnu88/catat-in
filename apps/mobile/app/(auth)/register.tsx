import { router } from 'expo-router'
import { useState } from 'react'
import { StaggeredStack } from "../../src/components/motion";

import { AuthButton, AuthFooter, AuthFormCard, AuthHeroPanel, AuthScreenLayout } from '../../src/components/ui'
import { InputField, StateMessage } from '../../src/components/ui'
import { useI18n } from '../../src/i18n/i18n-context'
import { getAuthCallbackRedirectTo } from '../../src/lib/auth-redirects'
import { useSupabase } from '../../src/lib/supabase'

export default function RegisterScreen() {
  const { supabase } = useSupabase()
  const { t } = useI18n()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const onRegister = async () => {
    setError(null)
    setMessage(null)
    if (password.length < 8) {
      setError(t('passwordTooShort'))
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: getAuthCallbackRedirectTo(),
        data: {
          full_name: name.trim(),
        },
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(t('registerFailed'))
      return
    }

    if (data.session) {
      router.replace('/(tabs)')
      return
    }

    setMessage(t('registerCheckEmail'))
  }

  return (
    <AuthScreenLayout>
      <StaggeredStack testIDPrefix="register-entrance">
      <AuthHeroPanel
        key="register-hero"
        icon="ai"
        iconTone="accent"
        title={t('registerHeroTitle')}
        description={t('registerHeroDescription')}
        stats={[
          { icon: 'wallets', label: t('statMultiWallet'), tone: 'success' },
          { icon: 'insight', label: t('statInsightAI'), tone: 'warning' },
        ]}
      />

      <AuthFormCard key="register-form" title={t('registerTitle')} subtitle={t('registerSubtitle')}>
        <InputField
          label={t('nameLabel')}
          value={name}
          onChangeText={setName}
          placeholder={t('namePlaceholder')}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
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
          placeholder={t('passwordHint')}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
          autoCorrect={false}
          textContentType="newPassword"
        />

        {error ? <StateMessage message={error} tone="error" /> : null}
        {message ? <StateMessage message={message} tone="success" /> : null}

        <AuthButton label={t('registerButton')} onPress={onRegister} loading={loading} disabled={loading} />
      </AuthFormCard>

      <AuthFooter key="register-footer" question={t('alreadyHaveAccount')} linkLabel={t('loginButton')} linkHref="/(auth)/login" />
      </StaggeredStack>
    </AuthScreenLayout>
  )
}
