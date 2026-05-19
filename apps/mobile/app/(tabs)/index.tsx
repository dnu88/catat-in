import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { useTheme } from '../../src/theme/theme-context'

const quickActions = [
  { id: 'manual', label: 'Manual', glyph: '+', route: '/(tabs)/capture' },
  { id: 'ai', label: 'AI Chat', glyph: 'AI', route: '/(tabs)/capture' },
  { id: 'receipt', label: 'Struk', glyph: '▧', route: '/(tabs)/capture' },
  { id: 'import', label: 'Import', glyph: '↥', route: '/(tabs)/imports' },
] as const

const transactions = [
  { id: 'indomaret', title: 'Indomaret', meta: 'Makan • Hari ini', amount: '- Rp 84.000' },
  { id: 'fore', title: 'Fore Coffee', meta: 'Jajan • Kemarin', amount: '- Rp 42.000' },
  { id: 'grab', title: 'Grab Car', meta: 'Transport • Kemarin', amount: '- Rp 68.000' },
] as const

export default function DashboardScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Halo, Danu</Text>
            <Text style={styles.dateText}>April 2026</Text>
          </View>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>DB</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroBloomOne} />
          <View style={styles.heroBloomTwo} />
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>Total saldo</Text>
              <Text style={styles.heroAmount}>Rp 4.250.000</Text>
            </View>
            <Pressable style={styles.managePill} onPress={() => router.push('/(tabs)/wallets' as never)}>
              <Text style={styles.manageText}>Manage</Text>
            </Pressable>
          </View>

          <View style={styles.walletRow}>
            <Text style={styles.walletName}>Main Wallet</Text>
            <View style={styles.trendPill}>
              <Text style={styles.trendText}>↗ 15%</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Pemasukan</Text>
              <Text style={styles.statValue}>8,00 Jt</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Pengeluaran</Text>
              <Text style={styles.statValue}>3,75 Jt</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Tabungan</Text>
              <Text style={styles.statValue}>53%</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActionRow}>
          {quickActions.map((action) => (
            <Pressable
              key={action.id}
              testID={`home-quick-action-${action.id}`}
              style={action.id === 'manual' ? styles.quickActionPrimary : styles.quickActionCard}
              onPress={() => router.push(action.route as never)}
            >
              <View style={styles.quickGlyphWrap}>
                <Text style={styles.quickGlyph}>{action.glyph}</Text>
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Anggaran</Text>
          <Pressable testID="home-budget-action" style={styles.budgetAction} onPress={() => router.push('/(tabs)/budgets' as never)}>
            <Text style={styles.budgetActionText}>Lihat →</Text>
          </Pressable>
        </View>

        <View style={styles.budgetCard}>
          <View style={styles.budgetTopRow}>
            <View>
              <Text style={styles.budgetName}>Makan</Text>
              <Text style={styles.budgetMeta}>620rb / 800rb</Text>
            </View>
            <Text style={styles.budgetPercent}>77%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.budgetStatus}>Sisa 180rb · Hampir habis</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Terakhir</Text>
          <Pressable style={styles.linkButton} onPress={() => router.push('/(tabs)/transactions' as never)}>
            <Text style={styles.linkButtonText}>Semua →</Text>
          </Pressable>
        </View>

        <View style={styles.transactionCard}>
          {transactions.map((item, index) => (
            <View key={item.id} style={[styles.txRow, index === transactions.length - 1 && styles.txRowLast]}>
              <View style={styles.txDot} />
              <View style={styles.txInfo}>
                <Text style={styles.txTitle}>{item.title}</Text>
                <Text style={styles.txMeta}>{item.meta}</Text>
              </View>
              <Text style={styles.txAmount}>{item.amount}</Text>
            </View>
          ))}
        </View>

        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>Insight harian</Text>
          <Text style={styles.insightBody}>Pengeluaran kategori makan naik 12% minggu ini. Kurangi 1 coffee run untuk menjaga target tabungan tetap aman.</Text>
        </View>
      </ScrollView>
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 110,
      gap: 14,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
    },
    greeting: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.extrabold,
      letterSpacing: -0.7,
    },
    dateText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.md,
      marginTop: 3,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    avatarWrap: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: 'rgba(163, 255, 18, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(163, 255, 18, 0.24)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: theme.colors.brandPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    heroCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.borderBase,
      padding: 18,
      gap: 16,
      overflow: 'hidden',
      ...theme.shadow.lg,
    },
    heroBloomOne: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      right: -74,
      top: -78,
      backgroundColor: 'rgba(163, 255, 18, 0.09)',
    },
    heroBloomTwo: {
      position: 'absolute',
      width: 130,
      height: 130,
      borderRadius: 65,
      left: -66,
      bottom: -70,
      backgroundColor: 'rgba(74, 128, 240, 0.12)',
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    heroLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    heroAmount: {
      color: theme.colors.textPrimary,
      fontSize: 34,
      fontWeight: theme.typography.fontWeight.extrabold,
      letterSpacing: -1.1,
      marginTop: 6,
    },
    managePill: {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      borderWidth: 1,
      borderColor: theme.colors.borderBase,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 13,
      paddingVertical: 7,
    },
    manageText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    walletRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    walletName: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    trendPill: {
      backgroundColor: 'rgba(163, 255, 18, 0.12)',
      borderRadius: theme.radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    trendText: {
      color: theme.colors.brandPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    statCard: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      borderRadius: 18,
      padding: 11,
      gap: 4,
    },
    statLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    statValue: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    quickActionRow: {
      flexDirection: 'row',
      gap: 9,
    },
    quickActionCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      borderRadius: 20,
      paddingVertical: 12,
      alignItems: 'center',
      gap: 8,
    },
    quickActionPrimary: {
      flex: 1,
      backgroundColor: 'rgba(163, 255, 18, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(163, 255, 18, 0.24)',
      borderRadius: 20,
      paddingVertical: 12,
      alignItems: 'center',
      gap: 8,
    },
    quickGlyphWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickGlyph: {
      color: theme.colors.brandPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    quickActionLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.extrabold,
      letterSpacing: -0.4,
    },
    budgetAction: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 13,
      paddingVertical: 7,
      ...theme.shadow.neon,
    },
    budgetActionText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    linkButton: {
      paddingHorizontal: 4,
      paddingVertical: 6,
    },
    linkButtonText: {
      color: theme.colors.brandPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    budgetCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      borderRadius: 22,
      padding: 16,
      gap: 11,
    },
    budgetTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    budgetName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    budgetMeta: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      marginTop: 3,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    budgetPercent: {
      color: theme.colors.brandPrimary,
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    progressTrack: {
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: theme.radius.pill,
      overflow: 'hidden',
    },
    progressFill: {
      width: '77%',
      height: '100%',
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: theme.radius.pill,
    },
    budgetStatus: {
      color: theme.colors.warning,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    transactionCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      borderRadius: 22,
      paddingHorizontal: 14,
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSoft,
    },
    txRowLast: {
      borderBottomWidth: 0,
    },
    txDot: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(74, 128, 240, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(74, 128, 240, 0.30)',
    },
    txInfo: {
      flex: 1,
    },
    txTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
    },
    txMeta: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      marginTop: 2,
    },
    txAmount: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    insightCard: {
      backgroundColor: 'rgba(163, 255, 18, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(163, 255, 18, 0.20)',
      borderRadius: 24,
      padding: 16,
      gap: 7,
      marginBottom: 12,
    },
    insightTitle: {
      color: theme.colors.brandPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    insightBody: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.md,
      lineHeight: 21,
      fontWeight: theme.typography.fontWeight.medium,
    },
  })
}
