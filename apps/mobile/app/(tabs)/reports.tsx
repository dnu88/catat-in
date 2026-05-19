import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, Share, Modal } from 'react-native'

import { useTheme } from '../../src/theme/theme-context'
import { useSupabase } from '../../src/lib/supabase'
import { IconBubble } from '../../src/components/ui'
import type { KaswiseIconName } from '../../src/components/icons/kaswise-icons'
import { useI18n } from '../../src/i18n/i18n-context'

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const incomeData = [4.2, 5.1, 6.8, 7.2, 8.5, 18.65]
const expenseData = [3.1, 3.8, 4.2, 5.0, 4.8, 6.4]

const categories = [
  { id: 'food', label: 'Makanan & Minuman', percent: 32, amount: 'Rp 2.050.000', icon: 'bills' as KaswiseIconName, color: '#65A30D', tone: 'success' as const },
  { id: 'transport', label: 'Transportasi', percent: 22, amount: 'Rp 1.408.000', icon: 'card' as KaswiseIconName, color: '#4A80F0', tone: 'navy' as const },
  { id: 'shopping', label: 'Belanja', percent: 18, amount: 'Rp 1.152.000', icon: 'wallets' as KaswiseIconName, color: '#B45309', tone: 'warning' as const },
  { id: 'bills', label: 'Tagihan', percent: 15, amount: 'Rp 960.000', icon: 'file' as KaswiseIconName, color: '#DC2626', tone: 'danger' as const },
  { id: 'entertainment', label: 'Hiburan', percent: 8, amount: 'Rp 512.000', icon: 'insight' as KaswiseIconName, color: '#0284C7', tone: 'info' as const },
  { id: 'other', label: 'Lainnya', percent: 5, amount: 'Rp 320.000', icon: 'chart' as KaswiseIconName, color: '#6B7280', tone: 'neutral' as const },
]

type Tab = 'overview' | 'category' | 'compare'
type PeriodFilter = 'month' | '3month' | '6month' | 'year' | 'custom'

const periodLabelsId: Record<PeriodFilter, string> = {
  month: '1 Bulan',
  '3month': '3 Bulan',
  '6month': '6 Bulan',
  year: '1 Tahun',
  custom: 'Kustom',
}
const periodLabelsEn: Record<PeriodFilter, string> = {
  month: '1 Month',
  '3month': '3 Months',
  '6month': '6 Months',
  year: '1 Year',
  custom: 'Custom',
}

export default function ReportsScreen() {
  const { theme } = useTheme()
  const { supabase } = useSupabase()
  const { language } = useI18n()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month')
  const [selectedBar, setSelectedBar] = useState<number | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [realTransactionCount, setRealTransactionCount] = useState<number | null>(null)
  const [showDateModal, setShowDateModal] = useState(false)
  const [customStartYear, setCustomStartYear] = useState(new Date().getFullYear())
  const [customStartMonth, setCustomStartMonth] = useState(new Date().getMonth() + 1)
  const [customEndYear, setCustomEndYear] = useState(new Date().getFullYear())
  const [customEndMonth, setCustomEndMonth] = useState(new Date().getMonth() + 1)
  const [tempStartYear, setTempStartYear] = useState(customStartYear)
  const [tempStartMonth, setTempStartMonth] = useState(customStartMonth)
  const [tempEndYear, setTempEndYear] = useState(customEndYear)
  const [tempEndMonth, setTempEndMonth] = useState(customEndMonth)
  const [compareData, setCompareData] = useState<{
    current: { income: number; expense: number; net: number; count: number } | null
    previous: { income: number; expense: number; net: number; count: number } | null
  } | null>(null)
  const [dynamicCategories, setDynamicCategories] = useState(categories)

  const neutralCategoryColor = theme.colors.textMuted
  const categoryColorByName: Record<string, { color: string; icon: KaswiseIconName; tone: 'success' | 'warning' | 'danger' | 'info' | 'navy' | 'neutral' }> = {
    food: { color: theme.colors.success, icon: 'bills', tone: 'success' },
    makan: { color: theme.colors.success, icon: 'bills', tone: 'success' },
    'makan & minum': { color: theme.colors.success, icon: 'bills', tone: 'success' },
    transport: { color: theme.colors.brandAccent, icon: 'card', tone: 'navy' },
    transportasi: { color: theme.colors.brandAccent, icon: 'card', tone: 'navy' },
    shopping: { color: theme.colors.warning, icon: 'wallets', tone: 'warning' },
    belanja: { color: theme.colors.warning, icon: 'wallets', tone: 'warning' },
    bills: { color: theme.colors.danger, icon: 'file', tone: 'danger' },
    tagihan: { color: theme.colors.danger, icon: 'file', tone: 'danger' },
    entertainment: { color: theme.colors.info, icon: 'insight', tone: 'info' },
    hiburan: { color: theme.colors.info, icon: 'insight', tone: 'info' },
    other: { color: neutralCategoryColor, icon: 'chart', tone: 'neutral' },
    lainnya: { color: neutralCategoryColor, icon: 'chart', tone: 'neutral' },
  }

  const isEn = language === 'en'
  const periodLabels = isEn ? periodLabelsEn : periodLabelsId

  const tx = isEn
    ? {
        title: 'Reports', subtitle: 'Monthly financial performance summary.', share: 'Share',
        overview: 'Overview', category: 'Category', compare: 'Comparison',
        monthBadge: `${new Date().toLocaleString('en-US', { month: 'short' })} ${new Date().getFullYear()}`,
        loading: 'Loading transaction data...', loadingCompare: 'Loading comparison data...',
        errorLogin: 'Not logged in', errorLoad: 'Failed to load transaction data',
        txFound: (n: number) => `${n} transaction${n !== 1 ? 's' : ''} found`,
        trendTitle: '6-Month Trend', trendSub: 'Income vs expense (in millions Rp)',
        income: 'Income', expense: 'Expense', savings: 'Savings', transactions: 'Transactions',
        thisMonth: 'this month', savingRate: '65.7% saving rate',
        tooltipIncome: 'Income', tooltipExpense: 'Expense',
        breakdownTitle: 'Expense Breakdown',
        breakdownSub: `By category ${new Date().toLocaleString('en-US', { month: 'long' })} ${new Date().getFullYear()}`,
        ringLabel: 'Total',
        compareTitle: 'Last Month Comparison', compareSub: 'Compare with previous period',
        compareIncome: 'Income', compareExpense: 'Expense', compareSavings: 'Savings', compareTxCount: 'Transactions',
        noCompareData: 'No data from the previous period to compare.',
        errorDateRange: 'Invalid date range',
        modalTitle: 'Select Date Range', modalStart: 'Start', modalEnd: 'End',
        modalCancel: 'Cancel', modalApply: 'Apply',
        shareTitle: 'Financial Report', shareIncome: 'Income', shareExpense: 'Expense',
        shareSavings: 'Savings', shareTxCount: 'Transactions',
      }
    : {
        title: 'Laporan', subtitle: 'Ringkasan performa finansial bulanan.', share: 'Bagikan',
        overview: 'Ringkasan', category: 'Kategori', compare: 'Perbandingan',
        monthBadge: `${new Date().toLocaleString('id-ID', { month: 'short' })} ${new Date().getFullYear()}`,
        loading: 'Memuat data transaksi...', loadingCompare: 'Memuat data perbandingan...',
        errorLogin: 'Belum login', errorLoad: 'Gagal memuat data transaksi',
        txFound: (n: number) => `${n} transaksi ditemukan`,
        trendTitle: 'Tren 6 Bulan', trendSub: 'Pemasukan vs pengeluaran (dalam jutaan Rp)',
        income: 'Pemasukan', expense: 'Pengeluaran', savings: 'Tabungan', transactions: 'Transaksi',
        thisMonth: 'bulan ini', savingRate: '65.7% saving rate',
        tooltipIncome: 'Pemasukan', tooltipExpense: 'Pengeluaran',
        breakdownTitle: 'Breakdown Pengeluaran',
        breakdownSub: `Per kategori bulan ${new Date().toLocaleString('id-ID', { month: 'long' })} ${new Date().getFullYear()}`,
        ringLabel: 'Total',
        compareTitle: 'Perbandingan Bulan Lalu', compareSub: 'Bandingkan dengan periode sebelumnya',
        compareIncome: 'Pemasukan', compareExpense: 'Pengeluaran', compareSavings: 'Tabungan', compareTxCount: 'Jumlah Transaksi',
        noCompareData: 'Tidak ada data periode sebelumnya untuk dibandingkan.',
        errorDateRange: 'Rentang tanggal tidak valid',
        modalTitle: 'Pilih Rentang Tanggal', modalStart: 'Mulai', modalEnd: 'Selesai',
        modalCancel: 'Batal', modalApply: 'Terapkan',
        shareTitle: 'Laporan Keuangan', shareIncome: 'Pemasukan', shareExpense: 'Pengeluaran',
        shareSavings: 'Tabungan', shareTxCount: 'Jumlah transaksi',
      }

  const maxVal = Math.max(...incomeData, ...expenseData)

  const formatRupiah = (valueInJuta: number) => `Rp ${(valueInJuta * 1_000_000).toLocaleString('id-ID')}`

  const totalIncomeJuta = incomeData[incomeData.length - 1] ?? 0
  const totalExpenseJuta = expenseData[expenseData.length - 1] ?? 0
  const netJuta = totalIncomeJuta - totalExpenseJuta

  const monthName = (month: number) => (language === 'en'
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'])[month - 1]

  const customRangeLabel = `${monthName(customStartMonth)} ${customStartYear} - ${monthName(customEndMonth)} ${customEndYear}`

  const openCustomDateModal = () => {
    setTempStartYear(customStartYear)
    setTempStartMonth(customStartMonth)
    setTempEndYear(customEndYear)
    setTempEndMonth(customEndMonth)
    setShowDateModal(true)
  }

  const confirmCustomDateRange = () => {
    const tempStart = new Date(tempStartYear, tempStartMonth - 1, 1)
    const tempEnd = new Date(tempEndYear, tempEndMonth - 1, 1)
    if (tempStart > tempEnd) {
      setDataError(tx.errorDateRange)
      return
    }

    setCustomStartYear(tempStartYear)
    setCustomStartMonth(tempStartMonth)
    setCustomEndYear(tempEndYear)
    setCustomEndMonth(tempEndMonth)
    setShowDateModal(false)
  }

  const handleShare = async () => {
    const periodText = periodFilter === 'custom' ? customRangeLabel : periodLabels[periodFilter]
    const shareText = [
      `${tx.shareTitle} (${periodText})`,
      `${tx.shareIncome}: ${formatRupiah(totalIncomeJuta)}`,
      `${tx.shareExpense}: ${formatRupiah(totalExpenseJuta)}`,
      `${tx.shareSavings}: ${formatRupiah(netJuta)}`,
      realTransactionCount !== null ? `${tx.shareTxCount}: ${realTransactionCount}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    await Share.share({
      title: tx.shareTitle,
      message: shareText,
    })
  }

  useEffect(() => {
    const loadTransactionData = async () => {
      setDataLoading(true)
      setDataError(null)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setDataError(tx.errorLogin)
          return
        }

        let startDate: Date
        let endDate: Date

        if (periodFilter === 'custom') {
          startDate = new Date(customStartYear, customStartMonth - 1, 1)
          endDate = new Date(customEndYear, customEndMonth, 0)
        } else {
          const now = new Date()
          const monthsBack = periodFilter === 'month' ? 1 :
                           periodFilter === '3month' ? 3 :
                           periodFilter === '6month' ? 6 : 12
          startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        }

        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('amount, transaction_type, category, date')
          .eq('user_id', user.id)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])

        if (error) throw error

        setRealTransactionCount(transactions?.length || 0)

        const expenseTx = (transactions || []).filter((t) => t.transaction_type === 'expense')
        const totalExpense = expenseTx.reduce((sum, t) => sum + (t.amount || 0), 0)
        if (expenseTx.length > 0 && totalExpense > 0) {
          const grouped = new Map<string, number>()
          for (const t of expenseTx) {
            const key = (t.category || 'other').toString().trim().toLowerCase() || 'other'
            grouped.set(key, (grouped.get(key) || 0) + (t.amount || 0))
          }
          const generated = Array.from(grouped.entries())
            .map(([key, amount]) => {
              const percent = Math.max(1, Math.round((amount / totalExpense) * 100))
              const categoryMeta = categoryColorByName[key] || categoryColorByName.other
              return {
                id: key,
                label: key.charAt(0).toUpperCase() + key.slice(1),
                percent,
                amount: `Rp ${amount.toLocaleString('id-ID')}`,
                icon: categoryMeta.icon,
                color: categoryMeta.color,
                tone: categoryMeta.tone,
              }
            })
            .sort((a, b) => b.percent - a.percent)
          setDynamicCategories(generated)
        } else {
          setDynamicCategories(categories.map((c) => ({ ...c, color: c.color || neutralCategoryColor })))
        }

        // Load compare data if activeTab is 'compare'
        if (activeTab === 'compare') {
          const prevStartDate = new Date(startDate)
          prevStartDate.setMonth(prevStartDate.getMonth() - 1)
          const prevEndDate = new Date(endDate)
          prevEndDate.setMonth(prevEndDate.getMonth() - 1)

          const { data: prevTransactions, error: prevError } = await supabase
            .from('transactions')
            .select('amount, transaction_type')
            .eq('user_id', user.id)
            .gte('date', prevStartDate.toISOString().split('T')[0])
            .lte('date', prevEndDate.toISOString().split('T')[0])

          if (prevError) console.error('Failed to load previous period:', prevError)

          const currentIncome = transactions
            ?.filter((t) => t.transaction_type === 'income')
            .reduce((sum, t) => sum + t.amount, 0) || 0
          const currentExpense = transactions
            ?.filter((t) => t.transaction_type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0) || 0
          const currentNet = currentIncome - currentExpense

          const prevIncome = prevTransactions
            ?.filter((t) => t.transaction_type === 'income')
            .reduce((sum, t) => sum + t.amount, 0) || 0
          const prevExpense = prevTransactions
            ?.filter((t) => t.transaction_type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0) || 0
          const prevNet = prevIncome - prevExpense

          setCompareData({
            current: {
              income: currentIncome,
              expense: currentExpense,
              net: currentNet,
              count: transactions?.length || 0,
            },
            previous: {
              income: prevIncome,
              expense: prevExpense,
              net: prevNet,
              count: prevTransactions?.length || 0,
            },
          })
        } else {
          setCompareData(null)
        }
      } catch (err: any) {
        console.error('Failed to load transaction data:', err)
        setDataError(tx.errorLoad)
      } finally {
        setDataLoading(false)
      }
    }

    loadTransactionData()
  }, [activeTab, periodFilter, customStartYear, customStartMonth, customEndYear, customEndMonth, supabase])

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{tx.title}</Text>
            <Text style={styles.subtitle}>{tx.subtitle}</Text>
          </View>
          <View style={styles.headerRight}>
            <View testID="reports-month-badge" style={styles.monthBadge}>
              <Text style={styles.monthBadgeText}>{tx.monthBadge}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.shareButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleShare}
            >
              <Text style={styles.shareButtonText}>{tx.share}</Text>
            </Pressable>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {(Object.keys(periodLabels) as PeriodFilter[]).map((key) => (
            <Pressable
              key={key}
              style={[styles.periodChip, periodFilter === key && styles.periodChipActive]}
              onPress={() => {
                setPeriodFilter(key)
                if (key === 'custom') {
                  openCustomDateModal()
                }
              }}
            >
              <Text style={[styles.periodChipText, periodFilter === key && styles.periodChipTextActive]}>
                {periodLabels[key]}
              </Text>
            </Pressable>
          ))}
        </View>
        {periodFilter === 'custom' && (
          <Pressable style={styles.customRangeBadge} onPress={openCustomDateModal}>
            <Text style={styles.customRangeBadgeText}>{customRangeLabel}</Text>
          </Pressable>
        )}

        {/* Tab Selector */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabChip, activeTab === 'overview' && styles.tabChipActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabChipText, activeTab === 'overview' && styles.tabChipTextActive]}>{tx.overview}</Text>
          </Pressable>
          <Pressable
            style={[styles.tabChip, activeTab === 'category' && styles.tabChipActive]}
            onPress={() => setActiveTab('category')}
          >
            <Text style={[styles.tabChipText, activeTab === 'category' && styles.tabChipTextActive]}>{tx.category}</Text>
          </Pressable>
          <Pressable
            style={[styles.tabChip, activeTab === 'compare' && styles.tabChipActive]}
            onPress={() => setActiveTab('compare')}
          >
            <Text style={[styles.tabChipText, activeTab === 'compare' && styles.tabChipTextActive]}>{tx.compare}</Text>
          </Pressable>
        </View>

        {/* Loading/Error State */}
        {dataLoading && (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>{tx.loading}</Text>
          </View>
        )}
        {dataError && !dataLoading && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{dataError}</Text>
          </View>
        )}
        {realTransactionCount !== null && !dataLoading && (
          <View testID="reports-info-card" style={styles.infoCard}>
            <Text style={styles.infoText}>{tx.txFound(realTransactionCount)}</Text>
          </View>
        )}

        {activeTab === 'overview' && (
          <>
            {/* Key Metrics */}
            <View style={styles.metricRow}>
              <View style={[styles.metricCard, { borderBottomWidth: 3, borderBottomColor: theme.colors.success }]}>
                <Text style={styles.metricLabel}>{tx.income}</Text>
                <Text style={[styles.metricValue, { color: theme.colors.success }]}>Rp 18,65 Jt</Text>
                <View style={styles.metricTrend}>
                  <Text style={[styles.metricTrendText, { color: theme.colors.success }]}>▲ 12.5%</Text>
                </View>
              </View>
              <View style={[styles.metricCard, { borderBottomWidth: 3, borderBottomColor: theme.colors.danger }]}>
                <Text style={styles.metricLabel}>{tx.expense}</Text>
                <Text style={[styles.metricValue, { color: theme.colors.danger }]}>Rp 6,40 Jt</Text>
                <View style={styles.metricTrend}>
                  <Text style={[styles.metricTrendText, { color: theme.colors.danger }]}>▲ 5.2%</Text>
                </View>
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metricCard, { borderBottomWidth: 3, borderBottomColor: theme.colors.brandPrimary }]}>
                <Text style={styles.metricLabel}>{tx.savings}</Text>
                <Text style={[styles.metricValue, { color: theme.colors.brandPrimary }]}>Rp 12,25 Jt</Text>
                <Text style={styles.metricSub}>{tx.savingRate}</Text>
              </View>
              <View style={[styles.metricCard, { borderBottomWidth: 3, borderBottomColor: theme.colors.warning }]}>
                <Text style={styles.metricLabel}>{tx.transactions}</Text>
                <Text style={[styles.metricValue, { color: theme.colors.warning }]}>142</Text>
                <Text style={styles.metricSub}>{tx.thisMonth}</Text>
              </View>
            </View>

            {/* Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{tx.trendTitle}</Text>
              <Text style={styles.chartSub}>{tx.trendSub}</Text>

              <View style={styles.lineChartArea}>
                <View style={styles.lineGrid}>
                  <View style={styles.gridLine} />
                  <View style={styles.gridLine} />
                  <View style={styles.gridLine} />
                </View>
                <View style={styles.lineGraphLayer}>
                  {months.map((month, idx) => {
                    const incomeTop = 10 + (1 - incomeData[idx] / maxVal) * 118
                    const expenseTop = 10 + (1 - expenseData[idx] / maxVal) * 118
                    return (
                      <Pressable
                        key={month}
                        style={styles.lineColumn}
                        onPress={() => setSelectedBar(selectedBar === idx ? null : idx)}
                      >
                        <View testID={`reports-line-dot-income-${idx}`} style={[styles.lineDot, styles.incomeDot, { top: incomeTop }]} />
                        <View testID={`reports-line-dot-expense-${idx}`} style={[styles.lineDot, styles.expenseDot, { top: expenseTop }]} />
                        {idx < months.length - 1 ? (
                          <>
                            <View style={[styles.lineSegment, styles.incomeSegment, { top: incomeTop }]} />
                            <View style={[styles.lineSegment, styles.expenseSegment, { top: expenseTop }]} />
                          </>
                        ) : null}
                        <Text style={styles.chartLabel}>{month}</Text>

                        {selectedBar === idx && (
                          <View style={styles.chartTooltip}>
                            <Text style={styles.tooltipTitle}>{month} 2026</Text>
                            <Text style={[styles.tooltipValue, { color: theme.colors.success }]}>
                              {tx.tooltipIncome}: Rp {incomeData[idx]} Jt
                            </Text>
                            <Text style={[styles.tooltipValue, { color: theme.colors.danger }]}>
                              {tx.tooltipExpense}: Rp {expenseData[idx]} Jt
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
                  <Text style={styles.legendText}>{tx.income}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.colors.danger }]} />
                  <Text style={styles.legendText}>{tx.expense}</Text>
                </View>
              </View>
            </View>
          </>
        )}
        {activeTab === 'category' && (
          <>
            {/* Category Breakdown */}
            <View style={styles.categoryCard}>
              <Text style={styles.categoryCardTitle}>{tx.breakdownTitle}</Text>
              <Text style={styles.categoryCardSub}>{tx.breakdownSub}</Text>

              <View style={styles.ringArea}>
                <View style={styles.donutChart}>
                  {dynamicCategories.map((cat, index) => (
                    <View
                      key={cat.id}
                      testID={`reports-donut-segment-${cat.id}`}
                      style={[
                        styles.donutSegment,
                        {
                          backgroundColor: cat.color,
                          transform: [{ rotate: `${index * 60}deg` }],
                        },
                      ]}
                    />
                  ))}
                  <View style={styles.ringInner}>
                    <Text style={styles.ringValue}>Rp 6,4 Jt</Text>
                    <Text style={styles.ringLabel}>{tx.ringLabel}</Text>
                  </View>
                </View>
              </View>

              {dynamicCategories.map((cat, idx) => (
                <View
                  key={cat.label}
                  style={[
                    styles.catRow,
                    idx === 0 && { borderTopWidth: 0 },
                  ]}
                >
                  <View style={styles.catLeft}>
                    <IconBubble name={cat.icon} tone={cat.tone} size={36} />
                    <View>
                      <Text style={styles.catName}>{cat.label}</Text>
                      <Text style={styles.catAmount}>{cat.amount}</Text>
                    </View>
                  </View>
                  <View style={styles.catRight}>
                    <Text style={[styles.catPct, { color: cat.color }]}>{cat.percent}%</Text>
                    <View style={styles.catBar}>
                      <View testID={`reports-category-fill-${cat.id}`} style={[styles.catBarFill, { width: `${cat.percent}%`, backgroundColor: cat.color }]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
        {activeTab === 'compare' && (
          <>
            {/* Comparison Panel */}
            <View style={styles.categoryCard}>
              <Text style={styles.categoryCardTitle}>{tx.compareTitle}</Text>
              <Text style={styles.categoryCardSub}>{tx.compareSub}</Text>

              {dataLoading && (
                <View style={styles.loadingCard}>
                  <Text style={styles.loadingText}>{tx.loadingCompare}</Text>
                </View>
              )}

              {compareData && compareData.current && compareData.previous && (
                <>
                  <View style={styles.compareRow}>
                    <Text style={styles.compareLabel}>{tx.compareIncome}</Text>
                    <View style={styles.compareValues}>
                      <Text style={styles.compareCurrent}>{formatRupiah(compareData.current.income / 1_000_000)}</Text>
                      <Text style={[styles.compareDelta, compareData.current.income >= compareData.previous.income ? styles.compareDeltaPositive : styles.compareDeltaNegative]}>
                        {compareData.current.income >= compareData.previous.income ? '▲' : '▼'} {formatRupiah(Math.abs(compareData.current.income - compareData.previous.income) / 1_000_000)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.compareRow}>
                    <Text style={styles.compareLabel}>{tx.compareExpense}</Text>
                    <View style={styles.compareValues}>
                      <Text style={styles.compareCurrent}>{formatRupiah(compareData.current.expense / 1_000_000)}</Text>
                      <Text style={[styles.compareDelta, compareData.current.expense <= compareData.previous.expense ? styles.compareDeltaPositive : styles.compareDeltaNegative]}>
                        {compareData.current.expense <= compareData.previous.expense ? '▼' : '▲'} {formatRupiah(Math.abs(compareData.current.expense - compareData.previous.expense) / 1_000_000)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.compareRow}>
                    <Text style={styles.compareLabel}>{tx.compareSavings}</Text>
                    <View style={styles.compareValues}>
                      <Text style={styles.compareCurrent}>{formatRupiah(compareData.current.net / 1_000_000)}</Text>
                      <Text style={[styles.compareDelta, compareData.current.net >= compareData.previous.net ? styles.compareDeltaPositive : styles.compareDeltaNegative]}>
                        {compareData.current.net >= compareData.previous.net ? '▲' : '▼'} {formatRupiah(Math.abs(compareData.current.net - compareData.previous.net) / 1_000_000)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.compareRow}>
                    <Text style={styles.compareLabel}>{tx.compareTxCount}</Text>
                    <View style={styles.compareValues}>
                      <Text style={styles.compareCurrent}>{compareData.current.count}</Text>
                      <Text style={[styles.compareDelta, compareData.current.count >= compareData.previous.count ? styles.compareDeltaPositive : styles.compareDeltaNegative]}>
                        {compareData.current.count >= compareData.previous.count ? '▲' : '▼'} {Math.abs(compareData.current.count - compareData.previous.count)}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {compareData && (!compareData.current || !compareData.previous) && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoText}>{tx.noCompareData}</Text>
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Date Range Modal */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{tx.modalTitle}</Text>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{tx.modalStart}</Text>
              <View style={styles.modalRow}>
                <Pressable
                  style={styles.modalButton}
                  onPress={() => setTempStartYear(tempStartYear - 1)}
                >
                  <Text style={styles.modalButtonText}>-</Text>
                </Pressable>
                <Text style={styles.modalValue}>{tempStartYear}</Text>
                <Pressable
                  style={styles.modalButton}
                  onPress={() => setTempStartYear(tempStartYear + 1)}
                >
                  <Text style={styles.modalButtonText}>+</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.monthChip, tempStartMonth === m && styles.monthChipActive]}
                    onPress={() => setTempStartMonth(m)}
                  >
                    <Text style={[styles.monthChipText, tempStartMonth === m && styles.monthChipTextActive]}>
                      {monthName(m)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{tx.modalEnd}</Text>
              <View style={styles.modalRow}>
                <Pressable
                  style={styles.modalButton}
                  onPress={() => setTempEndYear(tempEndYear - 1)}
                >
                  <Text style={styles.modalButtonText}>-</Text>
                </Pressable>
                <Text style={styles.modalValue}>{tempEndYear}</Text>
                <Pressable
                  style={styles.modalButton}
                  onPress={() => setTempEndYear(tempEndYear + 1)}
                >
                  <Text style={styles.modalButtonText}>+</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.monthChip, tempEndMonth === m && styles.monthChipActive]}
                    onPress={() => setTempEndMonth(m)}
                  >
                    <Text style={[styles.monthChipText, tempEndMonth === m && styles.monthChipTextActive]}>
                      {monthName(m)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalActionButton, styles.modalActionCancel]}
                onPress={() => setShowDateModal(false)}
              >
                <Text style={styles.modalActionCancelText}>{tx.modalCancel}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalActionButton, styles.modalActionConfirm]}
                onPress={confirmCustomDateRange}
              >
                <Text style={styles.modalActionConfirmText}>{tx.modalApply}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  const brandText = theme.mode === 'light' ? theme.colors.brandPrimaryDeep : theme.colors.brandPrimary
  const brandSoftBg = theme.mode === 'light' ? 'rgba(101, 163, 13, 0.14)' : 'rgba(163, 255, 18, 0.10)'
  const brandSoftBorder = theme.mode === 'light' ? 'rgba(101, 163, 13, 0.28)' : 'rgba(163, 255, 18, 0.35)'

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, gap: 10, paddingBottom: 26 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    title: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize['4xl'], fontWeight: theme.typography.fontWeight.extrabold, letterSpacing: theme.typography.letterSpacing.tight },
    subtitle: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, marginTop: 2 },
    monthBadge: {
      backgroundColor: brandSoftBg,
      borderWidth: 1,
      borderColor: brandSoftBorder,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    monthBadgeText: { color: brandText, fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.bold },
    headerRight: { alignItems: 'flex-end', gap: 8 },
    shareButton: {
      backgroundColor: theme.mode === 'light' ? theme.colors.brandPrimaryDeep : theme.colors.brandPrimary,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    shareButtonText: { color: theme.colors.textInverse, fontSize: 11, fontWeight: theme.typography.fontWeight.bold },
    periodRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    periodChip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface,
    },
    periodChipActive: {
      backgroundColor: brandSoftBg,
      borderColor: brandSoftBorder,
    },
    periodChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    periodChipTextActive: {
      color: brandText,
    },
    loadingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    errorCard: {
      backgroundColor: `${theme.colors.danger}12`,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${theme.colors.danger}40`,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 12,
      fontWeight: '600',
    },
    infoCard: {
      backgroundColor: brandSoftBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: brandSoftBorder,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    infoText: {
      color: brandText,
      fontSize: 12,
      fontWeight: '600',
    },
    tabRow: { flexDirection: 'row', gap: 8 },
    tabChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
    },
    tabChipActive: {
      backgroundColor: brandSoftBg,
      borderColor: brandSoftBorder,
    },
    tabChipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
    tabChipTextActive: { color: brandText },
    metricRow: { flexDirection: 'row', gap: 10 },
    metricCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 3,
    },
    metricLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
    metricValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
    metricTrend: { marginTop: 2 },
    metricTrendText: { fontSize: 11, fontWeight: '700' },
    metricSub: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
    chartCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 16,
      gap: 10,
    },
    chartTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' },
    chartSub: { color: theme.colors.textSecondary, fontSize: 12 },
    lineChartArea: {
      height: 170,
      marginTop: 8,
      position: 'relative',
    },
    lineGrid: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 10,
      bottom: 24,
      justifyContent: 'space-between',
    },
    gridLine: {
      height: 1,
      backgroundColor: theme.colors.borderSoft,
    },
    lineGraphLayer: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 10,
      paddingBottom: 22,
    },
    lineColumn: {
      flex: 1,
      alignItems: 'center',
      height: '100%',
      position: 'relative',
    },
    lineDot: {
      position: 'absolute',
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: theme.colors.surface,
      zIndex: 3,
    },
    incomeDot: {
      backgroundColor: theme.colors.success,
    },
    expenseDot: {
      backgroundColor: theme.colors.danger,
    },
    lineSegment: {
      position: 'absolute',
      left: '50%',
      width: '100%',
      height: 3,
      borderRadius: 999,
      opacity: 0.72,
      zIndex: 1,
    },
    incomeSegment: {
      backgroundColor: theme.colors.success,
    },
    expenseSegment: {
      backgroundColor: theme.colors.danger,
    },
    chartTooltip: {
      position: 'absolute',
      top: -74,
      left: '50%',
      marginLeft: -62,
      width: 124,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: 8,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      ...theme.shadow.md,
      zIndex: 12,
    },
    tooltipTitle: { fontSize: 11, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 },
    tooltipValue: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
    chartLabel: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 6 },
    chartLegend: { flexDirection: 'row', gap: 16, marginTop: 4 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 999 },
    legendText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
    categoryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 16,
      gap: 10,
    },
    categoryCardTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' },
    categoryCardSub: { color: theme.colors.textSecondary, fontSize: 12 },
    ringArea: { alignItems: 'center', paddingVertical: 14 },
    donutChart: {
      width: 150,
      height: 150,
      borderRadius: 75,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: theme.colors.mutedSurface,
    },
    donutSegment: {
      position: 'absolute',
      width: 75,
      height: 75,
      top: 0,
      left: 75,
      transformOrigin: '0px 75px',
      opacity: 0.9,
    },
    ringInner: {
      width: 92,
      height: 92,
      borderRadius: 46,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
    },
    ringValue: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800' },
    ringLabel: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
    catRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSoft,
    },
    catLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    catEmoji: { fontSize: 18 },
    catName: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' },
    catAmount: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },
    catRight: { alignItems: 'flex-end', gap: 4 },
    catPct: { color: theme.colors.brandPrimary, fontSize: 13, fontWeight: '800' },
    catBar: { width: 60, height: 4, borderRadius: 999, backgroundColor: theme.colors.mutedSurface },
    catBarFill: { height: '100%', borderRadius: 999 },
    customRangeBadge: {
      backgroundColor: brandSoftBg,
      borderWidth: 1,
      borderColor: brandSoftBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    customRangeBadgeText: {
      color: brandText,
      fontSize: 12,
      fontWeight: '700',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: `${theme.colors.background}${theme.opacity[50] * 100}`,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 40,
      maxHeight: '80%',
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 20,
    },
    modalSection: {
      marginBottom: 16,
    },
    modalSectionTitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
    },
    modalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      marginBottom: 12,
    },
    modalButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '700',
    },
    modalValue: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '800',
      minWidth: 60,
      textAlign: 'center',
    },
    monthScroll: {
      marginHorizontal: -20,
      paddingHorizontal: 20,
    },
    monthChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.background,
      marginRight: 8,
    },
    monthChipActive: {
      backgroundColor: brandSoftBg,
      borderColor: brandSoftBorder,
    },
    monthChipText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    monthChipTextActive: {
      color: brandText,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    modalActionButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    modalActionCancel: {
      backgroundColor: theme.colors.mutedSurface,
    },
    modalActionConfirm: {
      backgroundColor: theme.mode === 'light' ? theme.colors.brandPrimaryDeep : theme.colors.brandPrimary,
    },
    modalActionCancelText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
    modalActionConfirmText: {
      color: theme.colors.textInverse,
      fontSize: 14,
      fontWeight: '700',
    },
    compareRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSoft,
    },
    compareLabel: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    compareValues: {
      alignItems: 'flex-end',
      gap: 4,
    },
    compareCurrent: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    compareDelta: {
      fontSize: 11,
      fontWeight: '700',
    },
    compareDeltaPositive: {
      color: theme.colors.success,
    },
    compareDeltaNegative: {
      color: theme.colors.danger,
    },
  })
}
