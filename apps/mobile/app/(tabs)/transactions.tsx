import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '../../src/theme/theme-context'

const transactionData = [
  { id: '1', type: 'income', title: 'Gaji Bulanan', category: 'Pemasukan', amount: '+ Rp 8.500.000', date: '9 Mei 2026', merchant: 'PT Maju Bersama' },
  { id: '2', type: 'expense', title: 'Belanja Bulanan', category: 'Belanja', amount: '- Rp 450.000', date: '8 Mei 2026', merchant: 'Indomaret' },
  { id: '3', type: 'expense', title: 'Transportasi', category: 'Transport', amount: '- Rp 75.000', date: '8 Mei 2026', merchant: 'Gojek' },
  { id: '4', type: 'expense', title: 'Makan Siang', category: 'Makanan', amount: '- Rp 45.000', date: '7 Mei 2026', merchant: 'Warteg Pak Budi' },
  { id: '5', type: 'income', title: 'Freelance Project', category: 'Pemasukan', amount: '+ Rp 2.500.000', date: '5 Mei 2026', merchant: 'Client XYZ' },
  { id: '6', type: 'expense', title: 'Kopi Pagi', category: 'Makanan', amount: '- Rp 38.000', date: '5 Mei 2026', merchant: 'Fore Coffee' },
  { id: '7', type: 'expense', title: 'Langganan Spotify', category: 'Hiburan', amount: '- Rp 54.990', date: '3 Mei 2026', merchant: 'Spotify' },
  { id: '8', type: 'expense', title: 'Bensin Motor', category: 'Transport', amount: '- Rp 80.000', date: '2 Mei 2026', merchant: 'Pertamina' },
]

type Filter = 'all' | 'income' | 'expense'
type Period = 'week' | 'month' | 'year'

export default function TransactionsScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [activePeriod, setActivePeriod] = useState<Period>('month')

  const list =
    activeFilter === 'all'
      ? transactionData
      : transactionData.filter((item) => item.type === activeFilter)

  const totalIncome = transactionData
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + parseInt(t.amount.replace(/[^0-9]/g, '')), 0)

  const totalExpense = transactionData
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + parseInt(t.amount.replace(/[^0-9]/g, '')), 0)

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Transaksi</Text>
            <Text style={styles.subtitle}>Pantau arus kas harianmu dengan detail.</Text>
          </View>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>{list.length} item</Text>
          </View>
        </View>

        {/* Period Chips */}
        <View style={styles.periodRow}>
          {(['week', 'month', 'year'] as Period[]).map((period) => (
            <Pressable
              key={period}
              onPress={() => setActivePeriod(period)}
              style={[
                styles.periodChip,
                activePeriod === period && {
                  backgroundColor: theme.colors.brandPrimary,
                  borderColor: theme.colors.brandPrimary,
                },
              ]}
            >
              <Text
                style={[
                  styles.periodChipText,
                  activePeriod === period && { color: theme.colors.textInverse },
                ]}
              >
                {period === 'week' ? 'Minggu' : period === 'month' ? 'Bulan' : 'Tahun'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Stats Row */}
        <View style={styles.statRow}>
          <View style={[styles.statCard, { borderLeftWidth: 3, borderLeftColor: theme.colors.success }]}>
            <Text style={styles.statLabel}>Pemasukan</Text>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              Rp {(totalIncome / 1000000).toFixed(1)} Jt
            </Text>
          </View>
          <View style={[styles.statCard, { borderLeftWidth: 3, borderLeftColor: theme.colors.danger }]}>
            <Text style={styles.statLabel}>Pengeluaran</Text>
            <Text style={[styles.statValue, { color: theme.colors.danger }]}>
              Rp {(totalExpense / 1000000).toFixed(1)} Jt
            </Text>
          </View>
        </View>

        {/* Filter Row */}
        <View style={styles.filterRow}>
          {(['all', 'income', 'expense'] as Filter[]).map((filter) => (
            <FilterChip
              key={filter}
              label={filter === 'all' ? 'Semua' : filter === 'income' ? 'Pemasukan' : 'Pengeluaran'}
              active={activeFilter === filter}
              onPress={() => setActiveFilter(filter)}
            />
          ))}
        </View>

        {/* Transaction List */}
        {list.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
            <Text style={styles.emptySub}>Coba ubah filter atau tambahkan transaksi baru dari tab Capture.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {list.map((item, index) => (
              <Pressable
                key={item.id}
                style={[
                  styles.row,
                  index < list.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.borderSoft },
                ]}
              >
                <View
                  style={[
                    styles.rowIcon,
                    item.type === 'income'
                      ? { backgroundColor: `${theme.colors.success}15` }
                      : { backgroundColor: `${theme.colors.danger}15` },
                  ]}
                >
                  <Text
                    style={[
                      styles.rowIconText,
                      item.type === 'income' ? { color: theme.colors.success } : { color: theme.colors.danger },
                    ]}
                  >
                    {item.type === 'income' ? '↗' : '↘'}
                  </Text>
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowMerchant}>{item.merchant}</Text>
                  <Text style={styles.rowSub}>
                    {item.category} • {item.date}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.rowAmount,
                    item.type === 'income' ? { color: theme.colors.success } : { color: theme.colors.textPrimary },
                  ]}
                >
                  {item.amount}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? theme.colors.brandPrimary : theme.colors.borderSoft,
        backgroundColor: active ? theme.colors.brandPrimary : theme.colors.surface,
      }}
    >
      <Text
        style={{
          color: active ? theme.colors.textInverse : theme.colors.textSecondary,
          fontSize: 12,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
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
      gap: 12,
    },
    title: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
    subtitle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
    summaryBadge: {
      backgroundColor: `${theme.colors.brandPrimary}1F`,
      borderWidth: 1,
      borderColor: `${theme.colors.brandPrimary}52`,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    summaryBadgeText: {
      color: theme.colors.brandPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    periodRow: { flexDirection: 'row', gap: 8 },
    periodChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
    },
    periodChipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
    statRow: { flexDirection: 'row', gap: 10 },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 4,
    },
    statLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
    statValue: { fontSize: 18, fontWeight: '800' },
    filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    listCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      paddingHorizontal: 14,
    },
    emptyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      borderStyle: 'dashed',
      padding: 24,
      alignItems: 'center',
      gap: 8,
    },
    emptyIcon: { fontSize: 32, marginBottom: 4 },
    emptyTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
    emptySub: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowIconText: { fontSize: 16, fontWeight: '800' },
    rowInfo: { flex: 1 },
    rowTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
    rowMerchant: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 1 },
    rowSub: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
    rowAmount: { fontSize: 14, fontWeight: '800' },
  })
}
