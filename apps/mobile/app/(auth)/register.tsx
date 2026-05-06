import { Link, router } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { InputField } from '../../src/components/ui/InputField'
import { useSupabase } from '../../src/lib/supabase'
import { useTheme } from '../../src/theme/theme-context'

export default function RegisterScreen() {
  const { supabase } = useSupabase()
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onRegister = async () => {
    setError(null)
    if (password.length < 8) {
      setError('Password minimal 8 karakter.')
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
      setError('Registrasi gagal. Coba lagi beberapa saat.')
      return
    }

    router.replace('/(tabs)')
  }

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.logoMark}>K</Text>
        <Text style={styles.heroTitle}>Buat akun kaswise</Text>
        <Text style={styles.heroSubtitle}>Mulai pencatatan keuanganmu dalam hitungan menit.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.formArea}>
          <InputField label="Nama lengkap" value={name} onChangeText={setName} placeholder="Andika Putra" />
          <InputField label="Email" value={email} onChangeText={setEmail} placeholder="email@contoh.com" />
          <InputField label="Password" value={password} onChangeText={setPassword} placeholder="Minimal 8 karakter" />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.primaryButton} onPress={onRegister} disabled={loading}>
            {loading ? <ActivityIndicator color={theme.colors.textInverse} /> : <Text style={styles.primaryButtonText}>Daftar sekarang</Text>}
          </Pressable>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Sudah punya akun?</Text>
          <Link href="/(auth)/login" style={styles.linkPrimary}>
            Masuk
          </Link>
        </View>
      </View>
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 20,
      justifyContent: 'center',
      gap: 18,
    },
    hero: {
      alignItems: 'center',
      gap: 6,
    },
    logoMark: {
      width: 58,
      height: 58,
      borderRadius: 16,
      textAlign: 'center',
      lineHeight: 58,
      fontSize: 28,
      fontWeight: '800',
      color: theme.colors.textInverse,
      backgroundColor: theme.colors.brandPrimary,
      overflow: 'hidden',
    },
    heroTitle: {
      color: theme.colors.textPrimary,
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: -0.3,
      textAlign: 'center',
    },
    heroSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 18,
      gap: 12,
    },
    formArea: {
      gap: 12,
    },
    error: {
      color: theme.colors.danger,
      fontSize: 12,
      fontWeight: '600',
      backgroundColor: `${theme.colors.danger}1A`,
      borderWidth: 1,
      borderColor: `${theme.colors.danger}4D`,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    primaryButton: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: 999,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 46,
      marginTop: 4,
    },
    primaryButtonText: {
      color: theme.colors.textInverse,
      fontSize: 15,
      fontWeight: '700',
    },
    footerRow: {
      marginTop: 4,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    footerText: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    linkPrimary: {
      color: theme.colors.brandPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
  })
}
