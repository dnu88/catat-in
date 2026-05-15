import { Link, router } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { AuthButton, AuthFormCard, AuthHeroPanel, AuthScreenLayout } from '../../src/components/ui'
import { InputField, StateMessage } from '../../src/components/ui'
import { useI18n } from '../../src/i18n/i18n-context'
import { useSupabase } from '../../src/lib/supabase'

export default function RegisterScreen() {
  const { supabase } = useSupabase()
  const { t } = useI18n()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onRegister = async () => {
    setError(null)
    if (password.length < 8) {
      setError(t('passwordTooShort'))
      return
    }

    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(t('registerFailed'))
      return
    }

    router.replace('/(tabs)')
  }

  return (
    <AuthScreenLayout>
      <AuthHeroPanel
        icon="ai"
        iconTone="accent"
        eyebrow="Kaswise"
        title="Buat akun untuk mulai mencatat dalam hitungan menit."
        description="Dompet, anggaran, dan tagihan tergabung dalam satu shell finansial yang sama di semua perangkat."
        stats={[
          { icon: 'wallets', label: 'Multi wallet', color: '#10B981' },
          { icon: 'insight', label: 'Insight AI', color: '#F59E0B' },
        ]}
      />

      <AuthFormCard
        title="Akun baru"
        subtitle="Data tersimpan aman di Supabase dengan kebijakan RLS aktif."
      >
        <InputField
          label="Nama lengkap"
          value={name}
          onChangeText={setName}
          placeholder="Andika Putra"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
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
          placeholder="Minimal 8 karakter"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password-new"
          autoCorrect={false}
          textContentType="newPassword"
        />

        {error ? <StateMessage message={error} tone="error" /> : null}

        <AuthButton label="Daftar sekarang" onPress={onRegister} loading={loading} disabled={loading} />
      </AuthFormCard>

      <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6 }}>
        <Text style={{ color: '#6B7280', fontSize: 13 }}>Sudah punya akun?</Text>
        <Link href="/(auth)/login" style={{ color: '#4F46E5', fontSize: 13, fontWeight: '800' }}>
          Masuk
        </Link>
      </View>
    </AuthScreenLayout>
  )
}
