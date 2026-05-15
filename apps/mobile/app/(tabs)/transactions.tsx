import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { KaswiseIcon } from '../../src/components/icons/kaswise-icons'
import { EmptyState, FilterChip, IconBubble, ScreenHeader, StatCard, StateMessage } from '../../src/components/ui'
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
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      setLoadError(null)
      const data = await listTransactions()
      setTransactions(data)
    } catch (error) {
      console.error('Error loading transactions:', error)
      setLoadError('Gagal memuat transaksi. Coba lagi sebentar.')
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
        <ScreenHeader
          title="Transaksi"
          subtitle="Pantau arus kas harianmu dengan detail."
          action={(
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeText}>{list.length} item</Text>
            </View>
          )}
        />

        {loadError ? <StateMessage message={loadError} tone="error" /> : null}

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
          <StatCard label="Pemasukan" value={`Rp ${(totalIncome / 1000000).toFixed(1)} Jt`} icon="chart" tone="success" />
          <StatCard label="Pengeluaran" value={`Rp ${(totalExpense / 1000000).toFixed(1)} Jt`} icon="transactions" tone="danger" />
        </View>

        {/* Filter Row */}
        <View style={styles.filterRow}>
          {(['all', 'income', 'expense'] as Filter[]).map((filter) => (
            <FilterChip
              key={filter}
              label={filter === 'all' ? 'Semua' : filter === 'income' ? 'Pemasukan' : 'Pengeluaran'}
              selected={activeFilter === filter}
              onPress={() => setActiveFilter(filter)}
            />
          ))}
        </View>

        {/* Transaction List */}
        {list.length === 0 ? (
          <EmptyState
            icon="transactions"
            tone="accent"
            title="Belum ada transaksi"
            description="Coba ubah filter atau tambahkan transaksi baru dari tab Capture."
          />
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
                    <Text style={styles.rowTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
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

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, gap: 14, paddingBottom: 26 },
    summaryBadge: {
      backgroundColor: theme.colors.mutedSurface,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    summaryBadgeText: {
      color: theme.colors.textSecondary,
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
    filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    listCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      paddingHorizontal: 14,
    },
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
