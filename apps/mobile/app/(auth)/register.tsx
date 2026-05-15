import { Link, router } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'

import { KaswiseIcon } from '../../src/components/icons/kaswise-icons'
import { Card, IconBubble, InputField, SectionHeader } from '../../src/components/ui'
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
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.heroPanel}>
          <View style={styles.heroBadgeRow}>
            <IconBubble name="ai" tone="accent" size={52} />
            <View style={styles.brandCopy}>
              <Text style={styles.brandEyebrow}>Kaswise</Text>
              <Text style={styles.brandTitle}>Buat akun untuk mulai mencatat dalam hitungan menit.</Text>
            </View>
          </View>

          <Text style={styles.heroBody}>
            Dompet, anggaran, dan tagihan tergabung dalam satu shell finansial yang sama di semua perangkat.
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <KaswiseIcon name="wallets" size={16} color={theme.colors.success} weight="bold" />
              <Text style={styles.heroStatText}>Multi wallet</Text>
            </View>
            <View style={styles.heroStat}>
              <KaswiseIcon name="insight" size={16} color={theme.colors.warning} weight="bold" />
              <Text style={styles.heroStatText}>Insight AI</Text>
            </View>
          </View>
        </View>

        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <SectionHeader title="Akun baru" subtitle="Data tersimpan aman di Supabase dengan kebijakan RLS aktif." />
          </View>

          <View style={styles.formArea}>
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

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} onPress={onRegister} disabled={loading}>
              {loading ? <ActivityIndicator color={theme.colors.textInverse} /> : <Text style={styles.primaryButtonText}>Daftar sekarang</Text>}
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Sudah punya akun?</Text>
            <Link href="/(auth)/login" style={styles.linkPrimary}>
              Masuk
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
    heroPanel: {
      backgroundColor: theme.colors.mutedSurface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    heroBadgeRow: {
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
      fontSize: 24,
      fontWeight: '800',
      lineHeight: 30,
    },
    heroBody: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
    },
    heroStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    heroStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
    },
    heroStatText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.support.fontSize,
      fontWeight: '700',
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
    error: {
      color: theme.colors.danger,
      fontSize: theme.typography.support.fontSize,
      fontWeight: '700',
      backgroundColor: theme.iconBubbles.danger.background,
      borderWidth: 1,
      borderColor: theme.colors.danger,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
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
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    footerText: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    linkPrimary: {
      color: theme.colors.brandPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
  })
}
