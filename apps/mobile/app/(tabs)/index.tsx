import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { useTheme } from '../../src/theme/theme-context'
import { IconBubble } from '../../src/components/ui/IconBubble'
import type { KaswiseIconName } from '../../src/components/icons/kaswise-icons'

const recentTransactions = [
  { id: '1', title: 'Gaji Bulanan', date: '9 Mei 2026', amount: '+ Rp 8.500.000', tone: 'positive', category: 'Pemasukan' },
  { id: '2', title: 'Belanja Bulanan', date: '8 Mei 2026', amount: '- Rp 450.000', tone: 'negative', category: 'Belanja' },
  { id: '3', title: 'Transportasi', date: '8 Mei 2026', amount: '- Rp 75.000', tone: 'negative', category: 'Transport' },
  { id: '4', title: 'Makan Siang', date: '7 Mei 2026', amount: '- Rp 45.000', tone: 'negative', category: 'Makanan' },
]

const budgetItems: Array<{ id: string; name: string; spent: number; limit: number; icon: KaswiseIconName }> = [
  { id: '1', name: 'Makan', spent: 620000, limit: 800000, icon: 'bills' },
  { id: '2', name: 'Transport', spent: 180000, limit: 300000, icon: 'card' },
  { id: '3', name: 'Belanja', spent: 450000, limit: 500000, icon: 'wallets' },
]

const quickActions: Array<{ id: string; label: string; icon: KaswiseIconName; route: string }> = [
  { id: 'text', label: 'Teks', icon: 'transactions', route: '/(tabs)/capture' },
  { id: 'photo', label: 'Foto', icon: 'capture', route: '/(tabs)/capture' },
  { id: 'voice', label: 'Suara', icon: 'file', route: '/(tabs)/capture' },
  { id: 'import', label: 'Import', icon: 'imports', route: '/(tabs)/imports' },
]

export default function DashboardScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const styles = useMemo(() => createStyles(theme), [theme])

  const totalBudgetSpent = budgetItems.reduce((acc, item) => acc + item.spent, 0)
  const totalBudgetLimit = budgetItems.reduce((acc, item) => acc + item.limit, 0)
  const budgetPercentage = Math.round((totalBudgetSpent / totalBudgetLimit) * 100)

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Selamat datang, Danu</Text>
            <Text style={styles.dateText}>Mei 2026</Text>
          </View>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>DB</Text>
          </View>
        </View>

        {/* Balance Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Total Saldo</Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Premium</Text>
            </View>
          </View>
          <Text style={styles.heroAmount}>Rp 24.250.000</Text>
          <View style={styles.heroTrendRow}>
            <View style={styles.trendDot}>
              <Text style={styles.trendDotText}>▲</Text>
            </View>
            <Text style={styles.heroTrend}>+12.5% dari bulan lalu</Text>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Pemasukan</Text>
              <Text style={[styles.heroStatValue, { color: theme.colors.success }]}>+Rp 18.65 Jt</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Pengeluaran</Text>
              <Text style={[styles.heroStatValue, { color: theme.colors.danger }]}>-Rp 6.40 Jt</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Catat Cepat</Text>
        </View>
        <View style={styles.quickActionRow}>
          {quickActions.map((action) => (
            <Pressable
              key={action.id}
              style={styles.quickActionCard}
              onPress={() => router.push(action.route as any)}
            >
              <IconBubble name={action.icon} tone="primary" size={36} />
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Budget Overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Anggaran Bulan Ini</Text>
          <Pressable style={styles.sectionLinkWrap}>
            <Text style={styles.sectionLink}>Lihat Semua</Text>
          </Pressable>
        </View>
        <View style={styles.budgetSummaryCard}>
          <View style={styles.budgetSummaryTop}>
            <View>
              <Text style={styles.budgetSummaryLabel}>Terpakai</Text>
              <Text style={styles.budgetSummaryValue}>{budgetPercentage}%</Text>
            </View>
            <View style={styles.budgetSummaryRight}>
              <Text style={styles.budgetSummarySpent}>Rp {(totalBudgetSpent / 1000000).toFixed(2)} Jt</Text>
              <Text style={styles.budgetSummaryLimit}>dari Rp {(totalBudgetLimit / 1000000).toFixed(1)} Jt</Text>
            </View>
          </View>
          <View style={styles.budgetProgressBar}>
            <View
              style={[
                styles.budgetProgressFill,
                {
                  width: `${budgetPercentage}%`,
                  backgroundColor: budgetPercentage > 80 ? theme.colors.warning : theme.colors.brandPrimary,
                },
              ]}
            />
          </View>
        </View>

        {budgetItems.map((item, index) => {
          const percentage = Math.round((item.spent / item.limit) * 100)
          const isOver = percentage > 100
          const isWarning = percentage > 80 && !isOver
          return (
            <View
              key={item.id}
              style={[
                styles.budgetItemCard,
                index === budgetItems.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={styles.budgetItemLeft}>
                <IconBubble name={item.icon} tone="primary" size={36} />
                <View>
                  <Text style={styles.budgetItemName}>{item.name}</Text>
                  <Text style={styles.budgetItemMeta}>
                    Rp {(item.spent / 1000).toFixed(0)}rb / Rp {(item.limit / 1000).toFixed(0)}rb
                  </Text>
                </View>
              </View>
              <View style={styles.budgetItemRight}>
                <Text
                  style={[
                    styles.budgetItemPct,
                    isOver && { color: theme.colors.danger },
                    isWarning && { color: theme.colors.warning },
                  ]}
                >
                  {percentage}%
                </Text>
              </View>
            </View>
          )
        })}

        {/* Recent Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transaksi Terbaru</Text>
          <Pressable style={styles.sectionLinkWrap} onPress={() => router.push('/(tabs)/transactions')}>
            <Text style={styles.sectionLink}>Lihat Semua</Text>
          </Pressable>
        </View>
        <View style={styles.transactionCard}>
          {recentTransactions.map((tx, index) => (
            <Pressable
              key={tx.id}
              style={[
                styles.txRow,
                index === 0 && { borderTopWidth: 0 },
              ]}
            >
              <View style={[styles.txIcon, tx.tone === 'positive' && { backgroundColor: `${theme.colors.success}15` }]}>
                <Text style={[styles.txIconText, tx.tone === 'positive' && { color: theme.colors.success }]}>
                  {tx.tone === 'positive' ? '↑' : '↓'}
                </Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txTitle}>{tx.title}</Text>
                <Text style={styles.txSub}>{tx.category} • {tx.date}</Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  tx.tone === 'positive' ? { color: theme.colors.success } : { color: theme.colors.textPrimary },
                ]}
              >
                {tx.amount}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 100 }} />
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
      padding: 20,
      gap: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    greeting: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize['3xl'],
      fontWeight: theme.typography.fontWeight.extrabold,
      letterSpacing: theme.typography.letterSpacing.tight,
    },
    dateText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.md,
      marginTop: 2,
      fontWeight: theme.typography.fontWeight.medium,
    },
    avatarWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.brandPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    heroCard: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: theme.radius.lg,
      padding: 20,
      gap: 12,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    heroLabel: {
      color: theme.colors.textInverse,
      opacity: theme.opacity[75],
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    heroBadge: {
      backgroundColor: theme.colors.textInverse,
      opacity: theme.opacity[20],
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    heroBadgeText: {
      color: theme.colors.brandPrimary,
      fontSize: 11,
      fontWeight: '700',
    },
    heroAmount: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize['5xl'],
      fontWeight: theme.typography.fontWeight.extrabold,
      letterSpacing: theme.typography.letterSpacing.tight,
    },
    heroTrendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    trendDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.textInverse,
      opacity: theme.opacity[20],
      alignItems: 'center',
      justifyContent: 'center',
    },
    trendDotText: {
      color: theme.colors.success,
      fontSize: 8,
      fontWeight: '700',
    },
    heroTrend: {
      color: theme.colors.success,
      fontSize: 13,
      fontWeight: '600',
    },
    heroDivider: {
      height: 1,
      backgroundColor: theme.colors.textInverse,
      opacity: theme.opacity[15],
    },
    heroStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    heroStat: {
      flex: 1,
      gap: 2,
    },
    heroStatDivider: {
      width: 1,
      height: 32,
      backgroundColor: theme.colors.textInverse,
      opacity: theme.opacity[15],
      marginHorizontal: 16,
    },
    heroStatLabel: {
      color: theme.colors.textInverse,
      opacity: theme.opacity[65],
      fontSize: 12,
      fontWeight: '500',
    },
    heroStatValue: {
      fontSize: 16,
      fontWeight: '700',
      marginTop: 2,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 17,
      fontWeight: '700',
    },
    sectionLinkWrap: {
      paddingVertical: 4,
    },
    sectionLink: {
      color: theme.colors.brandPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    quickActionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    quickActionCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      paddingVertical: 14,
      paddingHorizontal: 8,
      alignItems: 'center',
      gap: 8,
    },
    quickActionIconWrap: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.md,
      backgroundColor: `${theme.colors.brandPrimary}10`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionIcon: {
      fontSize: theme.typography.fontSize.xl,
    },
    quickActionLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    budgetSummaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 16,
      gap: 12,
    },
    budgetSummaryTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    budgetSummaryLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '500',
    },
    budgetSummaryValue: {
      color: theme.colors.textPrimary,
      fontSize: 28,
      fontWeight: '800',
      marginTop: 2,
    },
    budgetSummaryRight: {
      alignItems: 'flex-end',
    },
    budgetSummarySpent: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    budgetSummaryLimit: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    budgetProgressBar: {
      height: 6,
      backgroundColor: `${theme.colors.brandPrimary}15`,
      borderRadius: 999,
      overflow: 'hidden',
    },
    budgetProgressFill: {
      height: '100%',
      borderRadius: 999,
    },
    budgetItemCard: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSoft,
    },
    budgetItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    budgetItemIcon: {
      fontSize: 20,
    },
    budgetItemName: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    budgetItemMeta: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    budgetItemRight: {},
    budgetItemPct: {
      color: theme.colors.brandPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    transactionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      paddingHorizontal: 16,
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSoft,
    },
    txIcon: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.md,
      backgroundColor: `${theme.colors.danger}10`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    txIconText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
    },
    txInfo: {
      flex: 1,
    },
    txTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    txSub: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    txAmount: {
      fontSize: 14,
      fontWeight: '700',
    },
  })
}
