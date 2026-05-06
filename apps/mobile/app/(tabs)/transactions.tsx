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

      <View style={styles.listCard}>
        {list.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.row,
              index < list.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.colors.borderSoft } : null,
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
            <Text style={[styles.rowAmount, item.type === 'income' ? { color: theme.colors.success } : { color: theme.colors.danger }]}>
              {item.amount}
            </Text>
          </View>
        ))}
      </View>
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
    filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    listCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      paddingHorizontal: 12,
    },
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
