import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '../../src/theme/theme-context'

type BillStatus = 'paid' | 'upcoming' | 'overdue'

const bills = [
  { id: '1', name: 'Internet Rumah', due: '12 Mei 2026', status: 'upcoming' as BillStatus, amount: 450000, emoji: '📡' },
  { id: '2', name: 'Listrik PLN', due: '08 Mei 2026', status: 'overdue' as BillStatus, amount: 675000, emoji: '⚡' },
  { id: '3', name: 'Netflix Premium', due: '15 Mei 2026', status: 'upcoming' as BillStatus, amount: 186000, emoji: '🎬' },
  { id: '4', name: 'Spotify Family', due: '03 Mei 2026', status: 'paid' as BillStatus, amount: 54990, emoji: '🎵' },
  { id: '5', name: 'Asuransi Kesehatan', due: '20 Mei 2026', status: 'upcoming' as BillStatus, amount: 1200000, emoji: '🏥' },
]

type FilterStatus = 'all' | BillStatus

export default function BillsScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [filter, setFilter] = useState<FilterStatus>('all')

  const filtered = filter === 'all' ? bills : bills.filter((b) => b.status === filter)
  const totalUpcoming = bills.filter((b) => b.status === 'upcoming').reduce((a, b) => a + b.amount, 0)
  const overdueCount = bills.filter((b) => b.status === 'overdue').length

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Tagihan</Text>
            <Text style={styles.subtitle}>Kelola pengingat tagihan rutin.</Text>
          </View>
          <Pressable style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Baru</Text>
          </Pressable>
        </View>

        {/* Alert Card */}
        {overdueCount > 0 && (
          <View style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <Text style={styles.alertIconText}>⚠️</Text>
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Ada {overdueCount} tagihan terlambat</Text>
              <Text style={styles.alertSub}>Segera bayar untuk menghindari denda.</Text>
            </View>
          </View>
        )}

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Tagihan Bulan Ini</Text>
              <Text style={styles.summaryValue}>Rp {totalUpcoming.toLocaleString('id-ID')}</Text>
            </View>
          </View>
        </View>

        {/* Filter Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['all', 'upcoming', 'overdue', 'paid'] as FilterStatus[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                filter === f && { backgroundColor: theme.colors.brandPrimary, borderColor: theme.colors.brandPrimary },
              ]}
            >
              <Text style={[styles.filterChipText, filter === f && { color: theme.colors.textInverse }]}>
                {f === 'all' ? 'Semua' : f === 'upcoming' ? 'Akan Datang' : f === 'overdue' ? 'Terlambat' : 'Lunas'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Bill Cards */}
        {filtered.map((bill) => {
          const statusColor =
            bill.status === 'paid'
              ? theme.colors.success
              : bill.status === 'overdue'
                ? theme.colors.danger
                : theme.colors.warning

          const statusLabel =
            bill.status === 'paid' ? 'Lunas' : bill.status === 'overdue' ? 'Terlambat' : 'Akan Datang'

          return (
            <Pressable key={bill.id} style={[styles.billCard, { borderLeftColor: statusColor, borderLeftWidth: 4 }]}>
              <View style={styles.billTop}>
                <View style={styles.billLeft}>
                  <View style={[styles.billEmoji, { backgroundColor: `${statusColor}15` }]}>
                    <Text style={styles.billEmojiText}>{bill.emoji}</Text>
                  </View>
                  <View>
                    <Text style={styles.billName}>{bill.name}</Text>
                    <Text style={styles.billDue}>Jatuh tempo: {bill.due}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}40` }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>

              <View style={styles.billBottom}>
                <Text style={styles.billAmount}>Rp {bill.amount.toLocaleString('id-ID')}</Text>
                {bill.status === 'upcoming' && (
                  <Pressable style={styles.payButton}>
                    <Text style={styles.payButtonText}>Tandai Lunas</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          )
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, gap: 14, paddingBottom: 26 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    title: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
    subtitle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
    addButton: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    addButtonText: { color: theme.colors.textInverse, fontSize: 12, fontWeight: '700' },
    alertCard: {
      backgroundColor: `${theme.colors.danger}10`,
      borderWidth: 1,
      borderColor: `${theme.colors.danger}40`,
      borderRadius: 16,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    alertIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: `${theme.colors.danger}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertIconText: { fontSize: 20 },
    alertContent: { flex: 1 },
    alertTitle: { color: theme.colors.danger, fontSize: 14, fontWeight: '800' },
    alertSub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 16,
    },
    summaryRow: { gap: 8 },
    summaryItem: { gap: 4 },
    summaryLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
    summaryValue: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800' },
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
    billCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 12,
    },
    billTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    billLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    billEmoji: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    billEmojiText: { fontSize: 20 },
    billName: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
    billDue: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    statusBadge: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusBadgeText: { fontSize: 11, fontWeight: '700' },
    billBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSoft,
      paddingTop: 10,
    },
    billAmount: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' },
    payButton: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    payButtonText: { color: theme.colors.textInverse, fontSize: 11, fontWeight: '700' },
  })
}
