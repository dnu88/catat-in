import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '../../src/theme/theme-context'

const recentTransactions = [
  { id: '1', title: 'Gaji Bulanan', date: '23 Mei 2024', amount: '+ Rp 8.500.000', tone: 'positive' },
  { id: '2', title: 'Belanja Bulanan', date: '22 Mei 2024', amount: '- Rp 450.000', tone: 'negative' },
  { id: '3', title: 'Transportasi', date: '22 Mei 2024', amount: '- Rp 75.000', tone: 'negative' },
  { id: '4', title: 'Makan Siang', date: '22 Mei 2024', amount: '- Rp 45.000', tone: 'negative' },
]

export default function DashboardScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Halo, Andika! 👋</Text>
          <Text style={styles.sub}>Kelola keuanganmu dengan bijak</Text>
        </View>
        <Text style={styles.profileChip}>Premium</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo Total</Text>
        <Text style={styles.balanceValue}>Rp 24.250.000</Text>
        <Text style={styles.balanceTrend}>▲ 12.5% dari minggu lalu</Text>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Pemasukan</Text>
          <Text style={styles.statValue}>Rp 18.650.000</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Pengeluaran</Text>
          <Text style={[styles.statValue, { color: theme.colors.danger }]}>Rp 6.400.000</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ringkasan Kategori</Text>
          <Text style={styles.sectionLink}>Lihat Semua</Text>
        </View>
        <View style={styles.donutWrap}>
          <View style={styles.donutOuter}>
            <View style={styles.donutInner}>
              <Text style={styles.donutLabel}>Total</Text>
              <Text style={styles.donutValue}>Rp 6.400.000</Text>
            </View>
          </View>
          <View style={styles.legendCol}>
            <LegendDot color="#10B981" label="Makanan" />
            <LegendDot color="#F59E0B" label="Belanja" />
            <LegendDot color="#EF4444" label="Tagihan" />
            <LegendDot color="#3B82F6" label="Transport" />
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transaksi Terbaru</Text>
          <Text style={styles.sectionLink}>Lihat Semua</Text>
        </View>

        {recentTransactions.map((transaction) => (
          <View key={transaction.id} style={styles.txRow}>
            <View style={styles.txIcon}>
              <Text style={styles.txIconText}>{transaction.tone === 'positive' ? '↗' : '↘'}</Text>
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txTitle}>{transaction.title}</Text>
              <Text style={styles.txDate}>{transaction.date}</Text>
            </View>
            <Text
              style={[
                styles.txAmount,
                transaction.tone === 'positive' ? { color: theme.colors.success } : { color: theme.colors.danger },
              ]}
            >
              {transaction.amount}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: color }} />
      <Text style={{ fontSize: 12, color: '#94A3B8' }}>{label}</Text>
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
      gap: 12,
      paddingBottom: 26,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    greeting: {
      color: theme.colors.textPrimary,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    sub: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    profileChip: {
      backgroundColor: `${theme.colors.brandAccent}26`,
      color: theme.colors.brandAccent,
      borderWidth: 1,
      borderColor: `${theme.colors.brandAccent}55`,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      fontSize: 11,
      fontWeight: '700',
      overflow: 'hidden',
    },
    balanceCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 16,
      gap: 4,
    },
    balanceLabel: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    balanceValue: {
      color: theme.colors.textPrimary,
      fontSize: 36,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    balanceTrend: {
      color: theme.colors.success,
      fontSize: 13,
      fontWeight: '700',
    },
    statRow: {
      flexDirection: 'row',
      gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 4,
    },
    statTitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    statValue: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    sectionLink: {
      color: theme.colors.brandPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    donutWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
    },
    donutOuter: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 14,
      borderColor: '#4F46E5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    donutInner: {
      alignItems: 'center',
      gap: 2,
    },
    donutLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    donutValue: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    legendCol: {
      gap: 10,
      flex: 1,
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSoft,
    },
    txIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    txIconText: {
      color: theme.colors.brandPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    txInfo: {
      flex: 1,
    },
    txTitle: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    txDate: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginTop: 1,
    },
    txAmount: {
      fontSize: 13,
      fontWeight: '700',
    },
  })
}
