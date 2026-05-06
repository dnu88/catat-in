import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '../../src/theme/theme-context'

const transactionData = [
  { id: '1', type: 'income', title: 'Gaji Bulanan', category: 'Pemasukan', amount: '+ Rp 8.500.000', date: '23 Mei 2024' },
  { id: '2', type: 'expense', title: 'Belanja Bulanan', category: 'Belanja', amount: '- Rp 450.000', date: '22 Mei 2024' },
  { id: '3', type: 'expense', title: 'Transportasi', category: 'Transport', amount: '- Rp 75.000', date: '22 Mei 2024' },
  { id: '4', type: 'expense', title: 'Makan Siang', category: 'Makanan', amount: '- Rp 45.000', date: '22 Mei 2024' },
  { id: '5', type: 'income', title: 'Freelance Project', category: 'Pemasukan', amount: '+ Rp 2.500.000', date: '21 Mei 2024' },
]

type Filter = 'all' | 'income' | 'expense'

export default function TransactionsScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [activeFilter, setActiveFilter] = useState<Filter>('all')

  const list =
    activeFilter === 'all'
      ? transactionData
      : transactionData.filter((item) => item.type === activeFilter)

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Transaksi</Text>
          <Text style={styles.subtitle}>Pantau arus kas harianmu dengan detail.</Text>
        </View>
        <Text style={styles.summaryBadge}>{list.length} item</Text>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pemasukan</Text>
          <Text style={[styles.statValue, { color: theme.colors.success }]}>Rp 11.000.000</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pengeluaran</Text>
          <Text style={[styles.statValue, { color: theme.colors.danger }]}>Rp 570.000</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <FilterChip
          label="Semua"
          active={activeFilter === 'all'}
          onPress={() => setActiveFilter('all')}
        />
        <FilterChip
          label="Pemasukan"
          active={activeFilter === 'income'}
          onPress={() => setActiveFilter('income')}
        />
        <FilterChip
          label="Pengeluaran"
          active={activeFilter === 'expense'}
          onPress={() => setActiveFilter('expense')}
        />
      </View>

      {list.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
          <Text style={styles.emptySub}>Coba ubah filter atau tambahkan transaksi baru dari tab Capture.</Text>
        </View>
      ) : (
        <View style={styles.listCard}>
          {list.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.row,
                index < list.length - 1
                  ? { borderBottomWidth: 1, borderBottomColor: theme.colors.borderSoft }
                  : null,
              ]}
            >
              <View style={styles.rowIcon}>
                <Text style={styles.rowIconText}>{item.type === 'income' ? '↗' : '↘'}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSub}>
                  {item.category} • {item.date}
                </Text>
              </View>
              <Text
                style={[
                  styles.rowAmount,
                  item.type === 'income' ? { color: theme.colors.success } : { color: theme.colors.danger },
                ]}
              >
                {item.amount}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? theme.colors.brandPrimary : theme.colors.borderSoft,
        backgroundColor: active ? `${theme.colors.brandPrimary}1A` : theme.colors.surface,
      }}
    >
      <Text
        style={{
          color: active ? theme.colors.brandPrimary : theme.colors.textSecondary,
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
    content: { padding: 16, gap: 12, paddingBottom: 26 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    title: { color: theme.colors.textPrimary, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
    subtitle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
    summaryBadge: {
      backgroundColor: `${theme.colors.brandPrimary}1F`,
      color: theme.colors.brandPrimary,
      borderWidth: 1,
      borderColor: `${theme.colors.brandPrimary}52`,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      fontSize: 12,
      fontWeight: '700',
      overflow: 'hidden',
    },
    statRow: { flexDirection: 'row', gap: 10 },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 12,
      gap: 3,
    },
    statLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
    statValue: { fontSize: 15, fontWeight: '800' },
    filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    listCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      paddingHorizontal: 12,
    },
    emptyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      borderStyle: 'dashed',
      padding: 16,
      alignItems: 'center',
      gap: 6,
    },
    emptyTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '800' },
    emptySub: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
    },
    rowIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowIconText: { color: theme.colors.brandPrimary, fontSize: 12, fontWeight: '800' },
    rowInfo: { flex: 1 },
    rowTitle: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' },
    rowSub: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },
    rowAmount: { fontSize: 13, fontWeight: '700' },
  })
}
