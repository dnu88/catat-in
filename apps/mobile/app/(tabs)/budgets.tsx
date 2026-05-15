import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import type { KaswiseIconName } from '../../src/components/icons/kaswise-icons'
import { EmptyState, IconBubble, ScreenHeader, StateMessage } from '../../src/components/ui'
import { useTheme } from '../../src/theme/theme-context'
import { listBudgets, type Budget } from '../../src/services/budgets'
import { listTransactions } from '../../src/services/transactions'

type Period = 'current' | 'prev'

const categoryIcons: Record<string, KaswiseIconName> = {
  'Makan': 'chart',
  'Makanan': 'chart',
  'Transport': 'transactions',
  'Transportasi': 'transactions',
  'Belanja': 'wallets',
  'Hiburan': 'insight',
  'Tagihan': 'bills',
  'Kesehatan': 'budgets',
  'Pendidikan': 'file',
  'Lainnya': 'card',
}

export default function BudgetsScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [period, setPeriod] = useState<Period>('current')
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    loadBudgets()
  }, [])

  const loadBudgets = async () => {
    try {
      setLoadError(null)
      const [budgetData, txData] = await Promise.all([listBudgets(), listTransactions()])
      const active = budgetData.filter((b) => b.is_active)

      const spentByCategory = new Map<string, number>()
      for (const tx of txData) {
        if (tx.transaction_type !== 'expense' || !tx.category) continue
        const key = tx.category.toLowerCase()
        spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + Number(tx.amount ?? 0))
      }

      const withSpent = active.map((b) => {
        const name = b.category?.name?.toLowerCase()
        const spent = name ? spentByCategory.get(name) ?? 0 : 0
        return { ...b, spent_amount: spent }
      })

      setBudgets(withSpent)
    } catch (error) {
      console.error('Error loading budgets:', error)
      setLoadError('Gagal memuat data anggaran. Coba lagi sebentar.')
    } finally {
      setLoading(false)
    }
  }

  const totalSpent = budgets.reduce((a, b) => a + (b.spent_amount ?? 0), 0)
  const totalLimit = budgets.reduce((a, b) => a + b.limit_amount, 0)
  const totalPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0

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
          title="Anggaran"
          subtitle="Kelola batas pengeluaranmu per kategori."
          action={(
            <Pressable style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Baru</Text>
            </Pressable>
          )}
        />

        <View style={styles.periodRow}>
          <Pressable
            style={[styles.periodChip, period === 'current' && styles.periodChipActive]}
            onPress={() => setPeriod('current')}
          >
            <Text style={[styles.periodText, period === 'current' && styles.periodTextActive]}>Mei 2026</Text>
          </Pressable>
          <Pressable
            style={[styles.periodChip, period === 'prev' && styles.periodChipActive]}
            onPress={() => setPeriod('prev')}
          >
            <Text style={[styles.periodText, period === 'prev' && styles.periodTextActive]}>Apr 2026</Text>
          </Pressable>
        </View>

        {loadError ? <StateMessage message={loadError} tone="error" /> : null}

        {/* Total Budget Overview */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewTop}>
            <View>
              <Text style={styles.overviewLabel}>Total Anggaran Terpakai</Text>
              <Text style={styles.overviewPct}>{totalPct}%</Text>
            </View>
            <View style={styles.overviewRight}>
              <Text style={styles.overviewSpent}>Rp {(totalSpent / 1000000).toFixed(2)} Jt</Text>
              <Text style={styles.overviewLimit}>dari Rp {(totalLimit / 1000000).toFixed(1)} Jt</Text>
            </View>
          </View>
          <View style={styles.overviewBar}>
            <View
              style={[
                styles.overviewBarFill,
                {
                  width: `${Math.min(totalPct, 100)}%`,
                  backgroundColor: totalPct > 80 ? theme.colors.warning : theme.colors.brandPrimary,
                },
              ]}
            />
          </View>
          <Text style={styles.overviewHelper}>
            {totalPct < 50
              ? 'Kamu masih punya ruang anggaran yang baik.'
              : totalPct < 80
                ? 'Penggunaan anggaran masih terkontrol.'
                : 'Hati-hati, anggaranmu hampir habis bulan ini.'}
          </Text>
        </View>

        {/* Budget Cards */}
        {budgets.length === 0 ? (
          <EmptyState
            icon="budgets"
            tone="primary"
            title="Belum ada anggaran"
            description="Tambahkan anggaran baru untuk memantau pengeluaran."
          />
        ) : (
          budgets.map((budget) => {
            const spent = budget.spent_amount ?? 0
            const pct = budget.limit_amount > 0 ? Math.round((spent / budget.limit_amount) * 100) : 0
            const over = spent > budget.limit_amount
            const warn = pct >= 80 && !over
            const remaining = budget.limit_amount - spent
            const toneColor = over ? theme.colors.danger : warn ? theme.colors.warning : theme.colors.brandPrimary
            const categoryName = budget.category?.name ?? 'Kategori'
            const categoryIcon = categoryIcons[categoryName] ?? 'card'

            return (
              <Pressable key={budget.id} style={styles.budgetCard}>
                <View style={styles.budgetTop}>
                  <View style={styles.budgetLeft}>
                    <IconBubble
                      name={categoryIcon}
                      tone={over ? 'danger' : warn ? 'warning' : 'primary'}
                      size={44}
                    />
                    <View>
                      <Text style={styles.budgetCategory} numberOfLines={1} ellipsizeMode="tail">{categoryName}</Text>
                      <Text style={styles.budgetMeta}>
                        Rp {(spent / 1000).toFixed(0)}rb / Rp {(budget.limit_amount / 1000).toFixed(0)}rb
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.budgetBadge, { backgroundColor: `${toneColor}15`, borderColor: `${toneColor}40` }]}>
                    <Text style={[styles.budgetBadgeText, { color: toneColor }]}>{pct}%</Text>
                  </View>
                </View>

                <View style={styles.budgetBar}>
                  <View style={[styles.budgetBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: toneColor }]} />
                </View>

                <Text style={styles.budgetFooter}>
                  {over
                    ? `Melebihi anggaran Rp ${Math.abs(remaining / 1000).toFixed(0)}rb`
                    : `Sisa Rp ${Math.max(remaining, 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`}
                </Text>
              </Pressable>
            )
          })
        )}

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
    periodChipActive: {
      backgroundColor: theme.colors.brandPrimary,
      borderColor: theme.colors.brandPrimary,
    },
    periodText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
    periodTextActive: { color: theme.colors.textInverse },
    overviewCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 16,
      gap: 12,
    },
    overviewTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    overviewLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
    overviewPct: { color: theme.colors.textPrimary, fontSize: 32, fontWeight: '800', marginTop: 2 },
    overviewRight: { alignItems: 'flex-end' },
    overviewSpent: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
    overviewLimit: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    overviewBar: {
      height: 8,
      backgroundColor: theme.colors.mutedSurface,
      borderRadius: 999,
      overflow: 'hidden',
    },
    overviewBarFill: { height: '100%', borderRadius: 999 },
    overviewHelper: { color: theme.colors.textMuted, fontSize: 11 },
    budgetCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 10,
    },
    budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    budgetCategory: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
    budgetMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    budgetBadge: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    budgetBadgeText: { fontSize: 13, fontWeight: '800' },
    budgetBar: {
      height: 6,
      backgroundColor: theme.colors.mutedSurface,
      borderRadius: 999,
      overflow: 'hidden',
    },
    budgetBarFill: { height: '100%', borderRadius: 999 },
    budgetFooter: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
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
    emptyTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
    emptySub: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  })
}
