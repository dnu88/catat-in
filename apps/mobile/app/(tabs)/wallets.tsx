import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '../../src/theme/theme-context'

type WalletType = 'bank' | 'ewallet' | 'cash' | 'investment'

const wallets = [
  { id: '1', name: 'BCA Utama', type: 'bank' as WalletType, balance: 12450000, icon: '🏦', accountHint: '••• 4821' },
  { id: '2', name: 'GoPay', type: 'ewallet' as WalletType, balance: 1350000, icon: '💳', accountHint: '081•••4512' },
  { id: '3', name: 'OVO', type: 'ewallet' as WalletType, balance: 725000, icon: '💳', accountHint: '081•••4512' },
  { id: '4', name: 'Dompet Tunai', type: 'cash' as WalletType, balance: 425000, icon: '💵', accountHint: '' },
  { id: '5', name: 'Reksadana Bareksa', type: 'investment' as WalletType, balance: 9300000, icon: '📈', accountHint: '' },
]

const typeLabels: Record<WalletType, string> = {
  bank: 'Bank',
  ewallet: 'E-Wallet',
  cash: 'Tunai',
  investment: 'Investasi',
}

// Wallet type colors mapped to theme colors
function getTypeColor(type: WalletType, theme: ReturnType<typeof useTheme>['theme']): string {
  const colorMap: Record<WalletType, string> = {
    bank: theme.colors.info,
    ewallet: theme.colors.brandPrimary,
    cash: theme.colors.success,
    investment: theme.colors.warning,
  }
  return colorMap[type]
}

type FilterType = 'all' | WalletType

export default function WalletsScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = filter === 'all' ? wallets : wallets.filter((w) => w.type === filter)
  const totalBalance = wallets.reduce((a, b) => a + b.balance, 0)

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Dompet</Text>
            <Text style={styles.subtitle}>Kelola semua saldo akunmu.</Text>
          </View>
          <Pressable style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Baru</Text>
          </Pressable>
        </View>

        {/* Total Balance Card */}
        <View testID="wallets-total-hero" style={styles.totalCard}>
          <View style={styles.heroBloomOne} />
          <View style={styles.heroBloomTwo} />
          <Text style={styles.totalLabel}>Total Saldo Semua Akun</Text>
          <Text style={styles.totalValue}>Rp {totalBalance.toLocaleString('id-ID')}</Text>
          <View style={styles.totalRow}>
            <View style={styles.totalChip}>
              <Text style={styles.totalChipText}>{wallets.length} akun aktif</Text>
            </View>
          </View>
        </View>

        {/* Filter Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['all', 'bank', 'ewallet', 'cash', 'investment'] as FilterType[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                filter === f && { backgroundColor: theme.colors.brandPrimary, borderColor: theme.colors.brandPrimary },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === f && { color: theme.colors.textInverse },
                ]}
              >
                {f === 'all' ? 'Semua' : typeLabels[f]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Wallet Cards */}
        {filtered.map((wallet) => (
          <Pressable key={wallet.id} style={styles.walletCard}>
            <View style={styles.walletTop}>
              <View style={[styles.walletIcon, { backgroundColor: `${getTypeColor(wallet.type, theme)}${theme.opacity[15] * 100}` }]}>
                <Text style={styles.walletIconText}>{wallet.icon}</Text>
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletName}>{wallet.name}</Text>
                <View style={styles.walletMeta}>
                  <View style={[styles.typeBadge, { backgroundColor: `${getTypeColor(wallet.type, theme)}${theme.opacity[15] * 100}` }]}>
                    <Text style={[styles.typeBadgeText, { color: getTypeColor(wallet.type, theme) }]}>
                      {typeLabels[wallet.type]}
                    </Text>
                  </View>
                  {wallet.accountHint ? <Text style={styles.walletHint}>{wallet.accountHint}</Text> : null}
                </View>
              </View>
            </View>
            <View style={styles.walletBottom}>
              <Text style={styles.walletBalance}>Rp {wallet.balance.toLocaleString('id-ID')}</Text>
            </View>
          </Pressable>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, gap: 10, paddingBottom: 26 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    title: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize['4xl'], fontWeight: theme.typography.fontWeight.extrabold, letterSpacing: theme.typography.letterSpacing.tight },
    subtitle: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, marginTop: 2 },
    addButton: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    addButtonText: { color: theme.colors.textInverse, fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.bold },
    totalCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 18,
      gap: 6,
      overflow: 'hidden',
      ...(theme.mode === 'light' ? theme.shadow.lg : {}),
    },
    heroBloomOne: {
      position: 'absolute',
      top: -60,
      right: -60,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: theme.mode === 'light' ? 'rgba(163, 255, 18, 0.22)' : 'rgba(163, 255, 18, 0.14)',
      opacity: 0.55,
    },
    heroBloomTwo: {
      position: 'absolute',
      bottom: -80,
      left: -60,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: theme.mode === 'light' ? 'rgba(74, 128, 240, 0.08)' : 'rgba(74, 128, 240, 0.10)',
      opacity: 0.6,
    },
    totalLabel: { color: theme.colors.textMuted, fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold },
    totalValue: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize['4xl'], fontWeight: theme.typography.fontWeight.extrabold, letterSpacing: theme.typography.letterSpacing.tight },
    totalRow: { marginTop: 6 },
    totalChip: {
      backgroundColor: theme.colors.glass.background,
      borderWidth: 1,
      borderColor: theme.colors.glass.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
      alignSelf: 'flex-start',
    },
    totalChipText: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold },
    filterRow: { gap: 8, paddingVertical: 2 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface,
    },
    filterChipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    walletCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 12,
    },
    walletTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    walletIcon: {
      width: 46,
      height: 46,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    walletIconText: { fontSize: 22 },
    walletInfo: { flex: 1, gap: 4 },
    walletName: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold },
    walletMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    typeBadge: { borderRadius: theme.radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
    typeBadgeText: { fontSize: 11, fontWeight: theme.typography.fontWeight.bold },
    walletHint: { color: theme.colors.textMuted, fontSize: 11, fontWeight: theme.typography.fontWeight.semibold },
    walletBottom: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSoft,
      paddingTop: 10,
    },
    walletBalance: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800' },
  })
}
