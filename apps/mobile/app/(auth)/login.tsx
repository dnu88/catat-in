import { Link, router } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { InputField } from '../../src/components/ui/InputField'
import { useSupabase } from '../../src/lib/supabase'
import { useTheme } from '../../src/theme/theme-context'

export default function LoginScreen() {
  const { supabase } = useSupabase()
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

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
      setError('Login gagal. Periksa email dan password kamu.')
      return
    }

    router.replace('/(tabs)')
  }

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.logoMark}>K</Text>
        <Text style={styles.heroTitle}>kaswise</Text>
        <Text style={styles.heroSubtitle}>Catat Keuangan, Bijak Setiap Hari</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Masuk ke akunmu</Text>
        <Text style={styles.subtitle}>Kelola keuanganmu dengan tampilan modern dan cerdas.</Text>

        <View style={styles.formArea}>
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="email@contoh.com"
          />

          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.primaryButton} onPress={onLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={theme.colors.textInverse} /> : <Text style={styles.primaryButtonText}>Masuk</Text>}
          </Pressable>

          <Link href="/(auth)/forgot-password" style={styles.linkSecondary}>
            Lupa password?
          </Link>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Belum punya akun?</Text>
          <Link href="/(auth)/register" style={styles.linkPrimary}>
            Daftar sekarang
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
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    heroSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 18,
      gap: 12,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 22,
      fontWeight: '800',
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },
    formArea: {
      gap: 12,
      marginTop: 4,
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
    },
    primaryButtonText: {
      color: theme.colors.textInverse,
      fontSize: 15,
      fontWeight: '700',
    },
    linkSecondary: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'right',
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
