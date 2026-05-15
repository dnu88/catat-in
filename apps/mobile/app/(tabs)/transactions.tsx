import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { KaswiseIcon } from '../../src/components/icons/kaswise-icons'
import { IconBubble } from '../../src/components/ui'
import { useTheme } from '../../src/theme/theme-context'
import { listTransactions, type Transaction } from '../../src/services/transactions'

type Filter = 'all' | 'income' | 'expense'
type Period = 'week' | 'month' | 'year'

export default function TransactionsScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [activePeriod, setActivePeriod] = useState<Period>('month')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      const data = await listTransactions()
      setTransactions(data)
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const list =
    activeFilter === 'all'
      ? transactions
      : transactions.filter((item) => item.transaction_type === activeFilter)

  const totalIncome = transactions
    .filter((t) => t.transaction_type === 'income')
    .reduce((acc, t) => acc + Number(t.amount ?? 0), 0)

  const totalExpense = transactions
    .filter((t) => t.transaction_type === 'expense')
    .reduce((acc, t) => acc + Number(t.amount ?? 0), 0)

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.brandPrimary} />
      </View>
    )
  }

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
            <KaswiseIcon name="transactions" size={14} color={theme.colors.brandPrimary} weight="bold" />
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
            <IconBubble name="transactions" tone="accent" size={52} />
            <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
            <Text style={styles.emptySub}>Coba ubah filter atau tambahkan transaksi baru dari tab Capture.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {list.map((item, index) => {
              const formattedDate = new Date(
                item.date || item.created_at || Date.now(),
              ).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
              const amount = Number(item.amount ?? 0)
              const title = item.description || item.merchant || item.category || 'Transaksi'
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.row,
                    index < list.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.borderSoft },
                  ]}
                >
                  <View style={styles.rowIcon}>
                    <IconBubble
                      name={item.transaction_type === 'income' ? 'chart' : 'transactions'}
                      tone={item.transaction_type === 'income' ? 'success' : 'danger'}
                      size={40}
                    />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>{title}</Text>
                    {item.merchant && item.merchant !== title && (
                      <Text style={styles.rowMerchant}>{item.merchant}</Text>
                    )}
                    <Text style={styles.rowSub}>
                      {(item.category || '-')} • {formattedDate}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.rowAmount,
                      item.transaction_type === 'income' ? { color: theme.colors.success } : { color: theme.colors.textPrimary },
                    ]}
                  >
                    {item.transaction_type === 'income' ? '+' : '-'} Rp {amount.toLocaleString('id-ID')}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push('/(tabs)/transaction-new')}>
        <KaswiseIcon name="capture" color={theme.colors.textInverse} size={26} weight="bold" />
      </Pressable>
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
    fab: {
      position: 'absolute',
      right: 22,
      bottom: 88,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.brandPrimary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    fabIcon: {
      color: theme.colors.textInverse,
      fontSize: 26,
      fontWeight: '800',
      lineHeight: 28,
    },
  })
}
