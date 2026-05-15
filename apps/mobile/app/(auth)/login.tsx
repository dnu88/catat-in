import { Link, router } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { AuthButton, AuthFormCard, AuthHeroPanel, AuthScreenLayout } from '../../src/components/ui'
import { InputField, StateMessage } from '../../src/components/ui'
import { useI18n } from '../../src/i18n/i18n-context'
import { useSupabase } from '../../src/lib/supabase'

export default function LoginScreen() {
  const { supabase } = useSupabase()
  const { t } = useI18n()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
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

  return (
    <AuthScreenLayout>
      <AuthHeroPanel
        icon="lock"
        iconTone="primary"
        eyebrow="Kaswise"
        title="Catat keuangan, tetap tenang, tetap rapi."
        description="Masuk ke ruang finansialmu dengan tampilan navy premium, ringkas, dan fokus ke hal penting tiap hari."
        stats={[
          { icon: 'wallets', label: 'Wallet rapi', color: '#10B981' },
          { icon: 'chart', label: 'Insight cepat', color: '#8B5CF6' },
        ]}
      />

      <AuthFormCard
        title="Masuk ke akunmu"
        subtitle="Lanjutkan ke dashboard Kaswise dengan akun Supabase yang sama."
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

        <InputField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          autoCorrect={false}
          textContentType="password"
        />

        {error ? <StateMessage message={error} tone="error" /> : null}

        <AuthButton label="Masuk" onPress={onLogin} loading={loading} disabled={loading} />

        <Link href="/(auth)/forgot-password" style={{ color: '#6B7280', fontSize: 13, fontWeight: '700', textAlign: 'right' }}>
          Lupa password?
        </Link>
      </AuthFormCard>

      <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
        <Text style={{ color: '#6B7280', fontSize: 13 }}>Belum punya akun?</Text>
        <Link href="/(auth)/register" style={{ color: '#4F46E5', fontSize: 13, fontWeight: '800' }}>
          Daftar sekarang
        </Link>
      </View>
    </AuthScreenLayout>
  )
}
