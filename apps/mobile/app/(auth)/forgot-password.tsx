import { Link } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { InputField } from '../../src/components/ui/InputField'
import { useSupabase } from '../../src/lib/supabase'
import { useTheme } from '../../src/theme/theme-context'

export default function ForgotPasswordScreen() {
  const { supabase } = useSupabase()
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const onReset = async () => {
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'kaswise://reset-password',
    })

    setLoading(false)

    if (error) {
      setMessage('Gagal mengirim email reset. Coba lagi.')
      return
    }

    setMessage('Email reset password berhasil dikirim. Cek inbox kamu.')
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Lupa password?</Text>
        <Text style={styles.subtitle}>Masukkan email akunmu untuk menerima link reset password.</Text>

        <InputField label="Email" value={email} onChangeText={setEmail} placeholder="email@contoh.com" />

        {message ? (
          <Text style={[styles.message, message.includes('Gagal') ? styles.messageError : styles.messageSuccess]}>{message}</Text>
        ) : null}

        <Pressable style={styles.primaryButton} onPress={onReset} disabled={loading}>
          {loading ? <ActivityIndicator color={theme.colors.textInverse} /> : <Text style={styles.primaryButtonText}>Kirim email reset</Text>}
        </Pressable>

        <Link href="/(auth)/login" style={styles.linkPrimary}>
          Kembali ke login
        </Link>
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
      fontSize: 24,
      fontWeight: '800',
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 4,
    },
    message: {
      fontSize: 12,
      fontWeight: '600',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    messageError: {
      color: theme.colors.danger,
      backgroundColor: `${theme.colors.danger}1A`,
      borderWidth: 1,
      borderColor: `${theme.colors.danger}4D`,
    },
    messageSuccess: {
      color: theme.colors.success,
      backgroundColor: `${theme.colors.success}1A`,
      borderWidth: 1,
      borderColor: `${theme.colors.success}4D`,
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
    linkPrimary: {
      marginTop: 8,
      color: theme.colors.brandPrimary,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
  })
}
