import { Link, router } from 'expo-router'
import { useState } from 'react'

import { AuthBackButton, AuthButton, AuthFormCard, AuthHeroPanel, AuthScreenLayout } from '../../src/components/ui'
import { InputField, StateMessage } from '../../src/components/ui'
import { useI18n } from '../../src/i18n/i18n-context'
import { useSupabase } from '../../src/lib/supabase'

export default function ForgotPasswordScreen() {
  const { supabase } = useSupabase()
  const { t } = useI18n()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const isError = message?.includes('Gagal') ?? false

  const onReset = async () => {
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'kaswise://reset-password',
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
      <AuthBackButton onPress={() => router.back()} label="Kembali" />

      <AuthHeroPanel
        icon="email"
        iconTone="warning"
        eyebrow="Reset password"
        title="Kirim ulang akses ke akun Kaswise-mu."
      />

      <AuthFormCard
        title="Lupa password?"
        subtitle="Masukkan email akunmu, link reset akan dikirim ke inbox."
      >
        <InputField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="email@contoh.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          textContentType="emailAddress"
        />

        {message ? <StateMessage message={message} tone={isError ? 'error' : 'success'} /> : null}

        <AuthButton label="Kirim email reset" onPress={onReset} loading={loading} disabled={loading} />

        <Link href="/(auth)/login" style={{ marginTop: 4, color: '#4F46E5', fontSize: 13, fontWeight: '800', textAlign: 'center' }}>
          Kembali ke login
        </Link>
      </AuthFormCard>
    </AuthScreenLayout>
  )
}
