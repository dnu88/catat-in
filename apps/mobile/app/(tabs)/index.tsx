import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import type { KaswiseIconName } from '../../src/components/icons/kaswise-icons'
import { IconBubble, SectionHeader } from '../../src/components/ui'
import type { IconBubbleTone } from '../../src/components/ui/IconBubble'
import { useTheme } from '../../src/theme/theme-context'
import { listTransactions, type Transaction } from '../../src/services/transactions'
import { listWallets, type Wallet } from '../../src/services/wallets'

type BudgetItem = { id: string; name: string; spent: number; limit: number; icon: KaswiseIconName }
type QuickAction = { id: string; label: string; icon: KaswiseIconName; route: string; tone: IconBubbleTone }

const budgetItems: BudgetItem[] = [
  { id: '1', name: 'Makan', spent: 620000, limit: 800000, icon: 'bills' },
  { id: '2', name: 'Transport', spent: 180000, limit: 300000, icon: 'card' },
  { id: '3', name: 'Belanja', spent: 450000, limit: 500000, icon: 'wallets' },
]

const quickActions: QuickAction[] = [
  { id: 'manual', label: 'Manual', icon: 'file', route: '/(tabs)/transaction-new', tone: 'primary' },
  { id: 'text', label: 'Teks', icon: 'transactions', route: '/(tabs)/capture', tone: 'success' },
  { id: 'photo', label: 'Foto', icon: 'capture', route: '/(tabs)/capture', tone: 'accent' },
  { id: 'import', label: 'Import', icon: 'imports', route: '/(tabs)/imports', tone: 'info' },
]

export default function DashboardScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [txData, walletData] = await Promise.all([listTransactions(), listWallets()])
      setTransactions(txData)
      setWallets(walletData.filter((w) => w.is_active))
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalBudgetSpent = budgetItems.reduce((acc, item) => acc + item.spent, 0)
  const totalBudgetLimit = budgetItems.reduce((acc, item) => acc + item.limit, 0)
  const budgetPercentage = Math.round((totalBudgetSpent / totalBudgetLimit) * 100)
  const totalBalance = wallets.reduce((acc, w) => acc + (w.balance || 0), 0)
  const totalIncome = transactions.filter((t) => t.transaction_type === 'income').reduce((acc, t) => acc + Number(t.amount ?? 0), 0)
  const totalExpense = transactions.filter((t) => t.transaction_type === 'expense').reduce((acc, t) => acc + Number(t.amount ?? 0), 0)
  const recentTransactions = transactions.slice(0, 4).map((tx) => {
    const amount = Number(tx.amount ?? 0)
    return {
      id: tx.id,
      title: tx.description || tx.merchant || tx.category || 'Transaksi',
      date: new Date(tx.date || tx.created_at || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      amount: tx.transaction_type === 'income' ? `+ Rp ${amount.toLocaleString('id-ID')}` : `- Rp ${amount.toLocaleString('id-ID')}`,
      tone: tx.transaction_type === 'income' ? 'positive' : 'negative',
      category: tx.category || '-',
    }
  })

  if (loading) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator size="large" color={theme.colors.brandPrimary} /></View>
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Kaswise Dashboard</Text>
            <Text style={styles.greeting}>Selamat datang, Danu</Text>
            <Text style={styles.dateText}>Mei 2026, arus kas siap ditinjau.</Text>
          </View>
          <View style={styles.avatarWrap}><Text style={styles.avatarText}>DB</Text></View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroTitleRow}>
              <IconBubble name="wallets" tone="primary" size={46} />
              <View>
                <Text style={styles.heroLabel}>Total Saldo</Text>
                <Text style={styles.heroSubtitle}>{wallets.length} dompet aktif</Text>
              </View>
            </View>
            <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>Premium</Text></View>
          </View>
          <Text style={styles.heroAmount}>Rp {totalBalance.toLocaleString('id-ID')}</Text>
          <Text style={styles.heroTrend}>+{wallets.length * 2}% dari bulan lalu</Text>
        </View>

        <View style={styles.statGrid}>
          <MiniStatCard label="Pemasukan" value={`Rp ${(totalIncome / 1000000).toFixed(1)} Jt`} helper="Bulan ini" icon="chart" tone="success" />
          <MiniStatCard label="Pengeluaran" value={`Rp ${(totalExpense / 1000000).toFixed(1)} Jt`} helper="Bulan ini" icon="transactions" tone="danger" />
          <MiniStatCard label="Anggaran" value={`${budgetPercentage}%`} helper="Terpakai" icon="budgets" tone="primary" />
        </View>

        <SectionHeader title="Catat Cepat" subtitle="Pilih jalur input tersingkat." />
        <View style={styles.quickActionRow}>
          {quickActions.map((action) => (
            <Pressable key={action.id} style={styles.quickActionCard} onPress={() => router.push(action.route as any)}>
              <IconBubble name={action.icon} tone={action.tone} size={42} />
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <SectionHeader title="Anggaran Bulan Ini" subtitle="Kategori paling aktif" action={<Pressable onPress={() => router.push('/(tabs)/budgets' as any)}><Text style={styles.sectionLink}>Lihat Semua</Text></Pressable>} />
        <View style={styles.budgetSummaryCard}>
          <View style={styles.budgetSummaryTop}>
            <View><Text style={styles.budgetSummaryLabel}>Terpakai</Text><Text style={styles.budgetSummaryValue}>{budgetPercentage}%</Text></View>
            <View style={styles.budgetSummaryRight}><Text style={styles.budgetSummarySpent}>Rp {(totalBudgetSpent / 1000000).toFixed(2)} Jt</Text><Text style={styles.budgetSummaryLimit}>dari Rp {(totalBudgetLimit / 1000000).toFixed(1)} Jt</Text></View>
          </View>
          <View style={styles.budgetProgressBar}><View style={[styles.budgetProgressFill, { width: `${budgetPercentage}%`, backgroundColor: budgetPercentage > 80 ? theme.colors.warning : theme.colors.brandPrimary }]} /></View>
        </View>

        <View style={styles.budgetListCard}>
          {budgetItems.map((item, index) => {
            const percentage = Math.round((item.spent / item.limit) * 100)
            const isWarning = percentage > 80
            return <View key={item.id} style={[styles.budgetItemCard, index === budgetItems.length - 1 && { borderBottomWidth: 0 }]}><View style={styles.budgetItemLeft}><IconBubble name={item.icon} tone={isWarning ? 'warning' : 'primary'} size={38} /><View><Text style={styles.budgetItemName}>{item.name}</Text><Text style={styles.budgetItemMeta}>Rp {(item.spent / 1000).toFixed(0)}rb / Rp {(item.limit / 1000).toFixed(0)}rb</Text></View></View><Text style={[styles.budgetItemPct, isWarning && { color: theme.colors.warning }]}>{percentage}%</Text></View>
          })}
        </View>

        <SectionHeader title="Transaksi Terbaru" subtitle="Aktivitas terakhir" action={<Pressable onPress={() => router.push('/(tabs)/transactions')}><Text style={styles.sectionLink}>Lihat Semua</Text></Pressable>} />
        {recentTransactions.length === 0 ? <View style={styles.emptyCard}><IconBubble name="transactions" tone="accent" size={52} /><Text style={styles.emptyTitle}>Belum ada transaksi</Text><Text style={styles.emptySub}>Mulai catat transaksi pertamamu dari tab Capture.</Text></View> : <View style={styles.transactionCard}>{recentTransactions.map((tx, index) => <Pressable key={tx.id} style={[styles.txRow, index === 0 && { borderTopWidth: 0 }]}><IconBubble name={tx.tone === 'positive' ? 'chart' : 'transactions'} tone={tx.tone === 'positive' ? 'success' : 'danger'} size={38} /><View style={styles.txInfo}><Text style={styles.txTitle}>{tx.title}</Text><Text style={styles.txSub}>{tx.category} • {tx.date}</Text></View><Text style={[styles.txAmount, tx.tone === 'positive' ? { color: theme.colors.success } : { color: theme.colors.textPrimary }]}>{tx.amount}</Text></Pressable>)}</View>}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

function MiniStatCard({ label, value, helper, icon, tone }: { label: string; value: string; helper: string; icon: KaswiseIconName; tone: IconBubbleTone }) {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return <View style={styles.statCard}><View style={styles.statTopRow}><IconBubble name={icon} tone={tone} size={34} /><Text style={[styles.statHelper, { color: theme.iconBubbles[tone].color }]}>{helper}</Text></View><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    center: { justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20, gap: 16, paddingBottom: 28 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 },
    headerCopy: { flex: 1 },
    eyebrow: { color: theme.colors.brandPrimary, fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 },
    greeting: { color: theme.colors.textPrimary, fontSize: theme.typography.screenTitle.fontSize, fontWeight: theme.typography.screenTitle.fontWeight, letterSpacing: -0.6 },
    dateText: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18, fontWeight: '600' },
    avatarWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: theme.colors.brandPrimary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: theme.colors.textInverse, fontSize: 14, fontWeight: '800' },
    heroCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.borderSoft, padding: 20, gap: 14 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroLabel: { color: theme.colors.textPrimary, fontSize: theme.typography.cardTitle.fontSize, fontWeight: theme.typography.cardTitle.fontWeight },
    heroSubtitle: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
    heroBadge: { backgroundColor: theme.iconBubbles.primary.background, borderColor: theme.colors.brandPrimary, borderWidth: 1, borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
    heroBadgeText: { color: theme.colors.brandPrimary, fontSize: theme.typography.chip.fontSize, fontWeight: theme.typography.chip.fontWeight },
    heroAmount: { color: theme.colors.textPrimary, fontSize: 34, fontWeight: '900', letterSpacing: -0.8 },
    heroTrend: { color: theme.colors.success, fontSize: 13, fontWeight: '700' },
    statGrid: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderSoft, padding: 12, gap: 8 },
    statTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
    statHelper: { fontSize: 10, fontWeight: '800' },
    statValue: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
    statLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
    sectionLink: { color: theme.colors.brandPrimary, fontSize: 13, fontWeight: '800' },
    quickActionRow: { flexDirection: 'row', gap: 10 },
    quickActionCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderSoft, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 9 },
    quickActionLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '800' },
    budgetSummaryCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderSoft, padding: 16, gap: 12 },
    budgetSummaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetSummaryLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    budgetSummaryValue: { color: theme.colors.textPrimary, fontSize: 30, fontWeight: '900', marginTop: 2 },
    budgetSummaryRight: { alignItems: 'flex-end' },
    budgetSummarySpent: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
    budgetSummaryLimit: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
    budgetProgressBar: { height: 8, backgroundColor: theme.iconBubbles.primary.background, borderRadius: theme.radius.pill, overflow: 'hidden' },
    budgetProgressFill: { height: '100%', borderRadius: theme.radius.pill },
    budgetListCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderSoft, paddingHorizontal: 14 },
    budgetItemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSoft, gap: 12 },
    budgetItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    budgetItemName: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '800' },
    budgetItemMeta: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
    budgetItemPct: { color: theme.colors.brandPrimary, fontSize: 14, fontWeight: '900' },
    transactionCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderSoft, paddingHorizontal: 14 },
    txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: theme.colors.borderSoft },
    txInfo: { flex: 1 },
    txTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '800' },
    txSub: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
    txAmount: { fontSize: 14, fontWeight: '900' },
    emptyCard: { backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.borderSoft, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 8 },
    emptyTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
    emptySub: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  })
}
