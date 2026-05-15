import { Link, router } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'

import { KaswiseIcon } from '../../src/components/icons/kaswise-icons'
import { Card, IconBubble, InputField, SectionHeader } from '../../src/components/ui'
import { useSupabase } from '../../src/lib/supabase'
import { useTheme } from '../../src/theme/theme-context'

export default function ForgotPasswordScreen() {
  const { supabase } = useSupabase()
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

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
      setMessage('Gagal mengirim email reset. Coba lagi.')
      return
    }

    setMessage('Email reset password berhasil dikirim. Cek inbox kamu.')
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backRow} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Kembali">
          <KaswiseIcon name="back" size={18} color={theme.colors.textSecondary} weight="bold" />
          <Text style={styles.backLabel}>Kembali</Text>
        </Pressable>

        <View style={styles.heroPanel}>
          <IconBubble name="email" tone="warning" size={52} />
          <View style={styles.brandCopy}>
            <Text style={styles.brandEyebrow}>Reset password</Text>
            <Text style={styles.brandTitle}>Kirim ulang akses ke akun Kaswise-mu.</Text>
          </View>
        </View>

        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <SectionHeader title="Lupa password?" subtitle="Masukkan email akunmu, link reset akan dikirim ke inbox." />
          </View>

          <View style={styles.formArea}>
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

            {message ? (
              <Text style={[styles.message, isError ? styles.messageError : styles.messageSuccess]}>{message}</Text>
            ) : null}

            <Pressable style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} onPress={onReset} disabled={loading}>
              {loading ? <ActivityIndicator color={theme.colors.textInverse} /> : <Text style={styles.primaryButtonText}>Kirim email reset</Text>}
            </Pressable>

            <Link href="/(auth)/login" style={styles.linkPrimary}>
              Kembali ke login
            </Link>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing['2xl'],
      gap: theme.spacing.lg,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    backLabel: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    heroPanel: {
      backgroundColor: theme.colors.mutedSurface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: theme.spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    brandCopy: {
      flex: 1,
      gap: 4,
    },
    brandEyebrow: {
      color: theme.colors.brandPrimary,
      fontSize: theme.typography.support.fontSize,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    brandTitle: {
      color: theme.colors.textPrimary,
      fontSize: 22,
      fontWeight: '800',
      lineHeight: 28,
    },
    card: {
      gap: theme.spacing.lg,
    },
    cardHeader: {
      gap: theme.spacing.xs,
    },
    formArea: {
      gap: theme.spacing.md,
    },
    message: {
      fontSize: theme.typography.support.fontSize,
      fontWeight: '700',
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      borderWidth: 1,
    },
    messageError: {
      color: theme.colors.danger,
      backgroundColor: theme.iconBubbles.danger.background,
      borderColor: theme.colors.danger,
    },
    messageSuccess: {
      color: theme.colors.success,
      backgroundColor: theme.iconBubbles.success.background,
      borderColor: theme.colors.success,
    },
    primaryButton: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: theme.radius.pill,
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      marginTop: 4,
    },
    primaryButtonDisabled: {
      opacity: 0.7,
    },
    primaryButtonText: {
      color: theme.colors.textInverse,
      fontSize: 15,
      fontWeight: '800',
    },
    linkPrimary: {
      marginTop: theme.spacing.xs,
      color: theme.colors.brandPrimary,
      fontSize: 13,
      fontWeight: '800',
      textAlign: 'center',
    },
  })
}
