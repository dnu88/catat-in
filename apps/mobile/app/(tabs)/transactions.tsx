import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { KaswiseIcon } from '../../src/components/icons/kaswise-icons'
import { EmptyState, FilterChip, IconBubble, ScreenHeader, StatCard, StateMessage } from '../../src/components/ui'
import { useTheme } from '../../src/theme/theme-context'
import { listTransactions, type Transaction } from '../../src/services/transactions'

type Filter = 'all' | 'income' | 'expense'
type Period = 'week' | 'month' | 'year'

type TransactionListItem = {
  item: Transaction
  index: number
  total: number
  theme: ReturnType<typeof useTheme>['theme']
  styles: ReturnType<typeof createStyles>
}

function TransactionRow({ item, index, total, theme, styles }: TransactionListItem) {
  const formattedDate = new Date(
    item.date || item.created_at || Date.now(),
  ).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const amount = Number(item.amount ?? 0)
  const title = item.description || item.merchant || item.category || 'Transaksi'

  return (
    <Pressable
      style={[
        styles.row,
        index < total - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.borderSoft },
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
}

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

  const list = useMemo(
    () =>
      activeFilter === 'all'
        ? transactions
        : transactions.filter((item) => item.transaction_type === activeFilter),
    [activeFilter, transactions],
  )

  const totalIncome = useMemo(
    () =>
      transactions
        .filter((t) => t.transaction_type === 'income')
        .reduce((acc, t) => acc + Number(t.amount ?? 0), 0),
    [transactions],
  )

  const totalExpense = useMemo(
    () =>
      transactions
        .filter((t) => t.transaction_type === 'expense')
        .reduce((acc, t) => acc + Number(t.amount ?? 0), 0),
    [transactions],
  )

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.brandPrimary} />
      </View>
    )
  }

  const renderTransaction = ({ item, index }: { item: Transaction; index: number }) => (
    <TransactionRow
      item={item}
      index={index}
      total={list.length}
      theme={theme}
      styles={styles}
    />
  )

  const keyExtractor = (item: Transaction) => item.id

  const ListHeader = () => (
    <>
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

      <View style={styles.statRow}>
        <StatCard label="Pemasukan" value={`Rp ${(totalIncome / 1000000).toFixed(1)} Jt`} icon="chart" tone="success" />
        <StatCard label="Pengeluaran" value={`Rp ${(totalExpense / 1000000).toFixed(1)} Jt`} icon="transactions" tone="danger" />
      </View>

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
    </>
  )

  const ListEmpty = () => (
    <EmptyState
      icon="transactions"
      tone="accent"
      title="Belum ada transaksi"
      description="Coba ubah filter atau tambahkan transaksi baru dari tab Capture."
    />
  )

  return (
    <View style={styles.screen}>
      <FlatList
        data={list}
        renderItem={renderTransaction}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={<View style={{ height: 100 }} />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
      />

      <Pressable style={styles.fab} onPress={() => router.push('/(tabs)/transaction-new')}>
        <KaswiseIcon name="capture" color={theme.colors.textInverse} size={26} weight="bold" />
      </Pressable>
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.xl, gap: theme.spacing.sm + theme.spacing.xs - 2, paddingBottom: 26 },
    summaryBadge: {
      backgroundColor: theme.colors.mutedSurface,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm - 2,
    },
    summaryBadgeText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    periodRow: { flexDirection: 'row', gap: theme.spacing.sm },
    periodChip: {
      flex: 1,
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.radius.sm + 2,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
    },
    periodChipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: theme.typography.fontWeight.bold },
    statRow: { flexDirection: 'row', gap: theme.spacing.sm + theme.spacing.xs - 2 },
    filterRow: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.radius.md,
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.sm + 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowInfo: { flex: 1 },
    rowTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.bold },
    rowMerchant: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, marginTop: 1 },
    rowSub: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
    rowAmount: { fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.extrabold },
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
      ...theme.shadow.lg,
    },
    fabIcon: {
      color: theme.colors.textInverse,
      fontSize: 26,
      fontWeight: theme.typography.fontWeight.extrabold,
      lineHeight: 28,
    },
  })
}
