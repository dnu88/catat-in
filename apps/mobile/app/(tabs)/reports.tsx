import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, Share, Modal } from 'react-native'

import { KaswiseIcon } from '../../src/components/icons/kaswise-icons'
import type { KaswiseIconName } from '../../src/components/icons/kaswise-icons'
import { IconBubble } from '../../src/components/ui'
import { useTheme } from '../../src/theme/theme-context'
import { useSupabase } from '../../src/lib/supabase'

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun']

type Tab = 'overview' | 'category' | 'compare'
type PeriodFilter = 'month' | '3month' | '6month' | 'year' | 'custom'

const periodLabels: Record<PeriodFilter, string> = {
  month: '1 Bulan',
  '3month': '3 Bulan',
  '6month': '6 Bulan',
  year: '1 Tahun',
  custom: 'Kustom',
}

const categoryIcons: Record<string, KaswiseIconName> = {
  'Makanan': 'chart',
  'Makan': 'chart',
  'Transport': 'transactions',
  'Transportasi': 'transactions',
  'Belanja': 'wallets',
  'Hiburan': 'insight',
  'Tagihan': 'bills',
  'Kesehatan': 'budgets',
  'Pendidikan': 'file',
  'Pendapatan': 'card',
  'Lainnya': 'card',
}

export default function ReportsScreen() {
  const { theme } = useTheme()
  const { supabase } = useSupabase()
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
  const [overviewData, setOverviewData] = useState<{
    totalIncome: number
    totalExpense: number
    totalNet: number
    totalCount: number
    incomeGrowth: number
    expenseGrowth: number
  } | null>(null)
  const [categoryData, setCategoryData] = useState<Array<{
    category: string
    amount: number
    percent: number
    icon: KaswiseIconName
  }>>([])
  const [chartData, setChartData] = useState<{
    months: string[]
    incomeData: number[]
    expenseData: number[]
  }>({ months: [], incomeData: [], expenseData: [] })

  const maxVal = Math.max(...chartData.incomeData, ...chartData.expenseData, 1)

  const formatRupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`

  const totalIncome = overviewData?.totalIncome ?? 0
  const totalExpense = overviewData?.totalExpense ?? 0
  const totalNet = overviewData?.totalNet ?? 0
  const incomeGrowth = overviewData?.incomeGrowth ?? 0
  const expenseGrowth = overviewData?.expenseGrowth ?? 0
  const totalCount = overviewData?.totalCount ?? 0
  const expenseTotalForCategory = categoryData.reduce((sum, item) => sum + item.amount, 0)

  const monthName = (month: number) => ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][month - 1]

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
      setDataError('Rentang tanggal tidak valid')
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
      `Laporan Keuangan (${periodText})`,
      `Pemasukan: ${formatRupiah(totalIncome)}`,
      `Pengeluaran: ${formatRupiah(totalExpense)}`,
      `Tabungan: ${formatRupiah(totalNet)}`,
      realTransactionCount !== null ? `Jumlah transaksi: ${realTransactionCount}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    await Share.share({
      title: 'Laporan Keuangan',
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
          setDataError('Belum login')
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

        // Calculate overview data
        const currentIncome = transactions
          ?.filter((t) => t.transaction_type === 'income')
          .reduce((sum, t) => sum + Number(t.amount ?? 0), 0) || 0
        const currentExpense = transactions
          ?.filter((t) => t.transaction_type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount ?? 0), 0) || 0
        const currentNet = currentIncome - currentExpense

        // Calculate category breakdown
        const expenseByCategory: Record<string, number> = {}
        transactions
          ?.filter((t) => t.transaction_type === 'expense' && t.category)
          .forEach((t) => {
            const key = t.category as string
            expenseByCategory[key] = (expenseByCategory[key] || 0) + Number(t.amount ?? 0)
          })

        const totalExpenseForCategory = Object.values(expenseByCategory).reduce((sum, val) => sum + val, 0)
        const categoryBreakdown = Object.entries(expenseByCategory)
          .map(([category, amount]) => ({
            category,
            amount,
            percent: totalExpenseForCategory > 0 ? Math.round((amount / totalExpenseForCategory) * 100) : 0,
            icon: categoryIcons[category] || 'card',
          }))
          .sort((a, b) => b.amount - a.amount)

        setOverviewData({
          totalIncome: currentIncome,
          totalExpense: currentExpense,
          totalNet: currentNet,
          totalCount: transactions?.length || 0,
          incomeGrowth: 0,
          expenseGrowth: 0,
        })
        setCategoryData(categoryBreakdown)

        // Calculate chart data (monthly breakdown)
        const monthlyData: Record<string, { income: number; expense: number }> = {}
        transactions?.forEach((t) => {
          if (!t.date) return
          const date = new Date(t.date)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { income: 0, expense: 0 }
          }
          if (t.transaction_type === 'income') {
            monthlyData[monthKey].income += Number(t.amount ?? 0)
          } else if (t.transaction_type === 'expense') {
            monthlyData[monthKey].expense += Number(t.amount ?? 0)
          }
        })

        const sortedMonths = Object.keys(monthlyData).sort()
        const chartMonths = sortedMonths.slice(-6).map((key) => {
          const [year, month] = key.split('-')
          return months[parseInt(month) - 1] || month
        })
        const chartIncome = sortedMonths.slice(-6).map((key) => monthlyData[key].income / 1_000_000)
        const chartExpense = sortedMonths.slice(-6).map((key) => monthlyData[key].expense / 1_000_000)

        setChartData({
          months: chartMonths.length > 0 ? chartMonths : ['Mei'],
          incomeData: chartIncome.length > 0 ? chartIncome : [0],
          expenseData: chartExpense.length > 0 ? chartExpense : [0],
        })

        // Load previous period data for growth + comparison
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

        const prevIncome = prevTransactions
          ?.filter((t) => t.transaction_type === 'income')
          .reduce((sum, t) => sum + Number(t.amount ?? 0), 0) || 0
        const prevExpense = prevTransactions
          ?.filter((t) => t.transaction_type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount ?? 0), 0) || 0
        const prevNet = prevIncome - prevExpense

        const prevIncomeGrowth = prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : 0
        const prevExpenseGrowth = prevExpense > 0 ? ((currentExpense - prevExpense) / prevExpense) * 100 : 0

        setOverviewData({
          totalIncome: currentIncome,
          totalExpense: currentExpense,
          totalNet: currentNet,
          totalCount: transactions?.length || 0,
          incomeGrowth: prevIncomeGrowth,
          expenseGrowth: prevExpenseGrowth,
        })

        if (activeTab === 'compare') {
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
        setDataError('Gagal memuat data transaksi')
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
            <Text style={styles.title}>Laporan</Text>
            <Text style={styles.subtitle}>Ringkasan performa finansial bulanan.</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.monthBadge}>
              <Text style={styles.monthBadgeText}>Mei 2026</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.shareButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleShare}
            >
              <Text style={styles.shareButtonText}>Bagikan</Text>
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
            <Text style={[styles.tabChipText, activeTab === 'overview' && styles.tabChipTextActive]}>Ringkasan</Text>
          </Pressable>
          <Pressable
            style={[styles.tabChip, activeTab === 'category' && styles.tabChipActive]}
            onPress={() => setActiveTab('category')}
          >
            <Text style={[styles.tabChipText, activeTab === 'category' && styles.tabChipTextActive]}>Kategori</Text>
          </Pressable>
          <Pressable
            style={[styles.tabChip, activeTab === 'compare' && styles.tabChipActive]}
            onPress={() => setActiveTab('compare')}
          >
            <Text style={[styles.tabChipText, activeTab === 'compare' && styles.tabChipTextActive]}>Perbandingan</Text>
          </Pressable>
        </View>

        {/* Loading/Error State */}
        {dataLoading && (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Memuat data transaksi...</Text>
          </View>
        )}
        {dataError && !dataLoading && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{dataError}</Text>
          </View>
        )}
        {realTransactionCount !== null && !dataLoading && (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>{realTransactionCount} transaksi ditemukan</Text>
          </View>
        )}

        {activeTab === 'overview' && overviewData && (
          <>
            {/* Key Metrics */}
            <View style={styles.metricRow}>
              <View style={[styles.metricCard, { borderBottomWidth: 3, borderBottomColor: theme.colors.success }]}>
                <Text style={styles.metricLabel}>Pemasukan</Text>
                <Text style={[styles.metricValue, { color: theme.colors.success }]}>
                  Rp {(totalIncome / 1_000_000).toFixed(1)} Jt
                </Text>
                {incomeGrowth !== 0 && (
                  <View style={styles.metricTrend}>
                    <Text style={[styles.metricTrendText, { color: incomeGrowth >= 0 ? theme.colors.success : theme.colors.danger }]}>
                      <KaswiseIcon name="back" size={10} color={incomeGrowth >= 0 ? theme.colors.success : theme.colors.danger} weight="bold" /> {Math.abs(incomeGrowth).toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.metricCard, { borderBottomWidth: 3, borderBottomColor: theme.colors.danger }]}>
                <Text style={styles.metricLabel}>Pengeluaran</Text>
                <Text style={[styles.metricValue, { color: theme.colors.danger }]}>
                  Rp {(totalExpense / 1_000_000).toFixed(1)} Jt
                </Text>
                {expenseGrowth !== 0 && (
                  <View style={styles.metricTrend}>
                    <Text style={[styles.metricTrendText, { color: expenseGrowth >= 0 ? theme.colors.danger : theme.colors.success }]}>
                      <KaswiseIcon name="back" size={10} color={expenseGrowth >= 0 ? theme.colors.danger : theme.colors.success} weight="bold" /> {Math.abs(expenseGrowth).toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metricCard, { borderBottomWidth: 3, borderBottomColor: theme.colors.brandPrimary }]}>
                <Text style={styles.metricLabel}>Tabungan</Text>
                <Text style={[styles.metricValue, { color: theme.colors.brandPrimary }]}>
                  Rp {(totalNet / 1_000_000).toFixed(1)} Jt
                </Text>
                <Text style={styles.metricSub}>
                  {totalIncome > 0 ? Math.round((totalNet / totalIncome) * 100) : 0}% saving rate
                </Text>
              </View>
              <View style={[styles.metricCard, { borderBottomWidth: 3, borderBottomColor: theme.colors.warning }]}>
                <Text style={styles.metricLabel}>Transaksi</Text>
                <Text style={[styles.metricValue, { color: theme.colors.warning }]}>{totalCount}</Text>
                <Text style={styles.metricSub}>bulan ini</Text>
              </View>
            </View>

            {/* Chart */}
            {chartData.months.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Tren {chartData.months.length} Bulan</Text>
                <Text style={styles.chartSub}>Pemasukan vs pengeluaran (dalam jutaan Rp)</Text>

                <View style={styles.chartArea}>
                  {chartData.months.map((month, idx) => (
                    <Pressable
                      key={month}
                      style={styles.chartColumn}
                      onPress={() => setSelectedBar(selectedBar === idx ? null : idx)}
                    >
                      <View style={styles.chartBarsWrap}>
                        <View
                          style={[
                            styles.chartBar,
                            { height: `${(chartData.incomeData[idx] / maxVal) * 100}%`, backgroundColor: theme.colors.success },
                            selectedBar === idx && styles.chartBarSelected,
                          ]}
                        />
                        <View
                          style={[
                            styles.chartBar,
                            { height: `${(chartData.expenseData[idx] / maxVal) * 100}%`, backgroundColor: `${theme.colors.danger}90` },
                            selectedBar === idx && styles.chartBarSelected,
                          ]}
                        />
                      </View>
                      <Text style={styles.chartLabel}>{month}</Text>

                      {selectedBar === idx && (
                        <View style={styles.chartTooltip}>
                          <Text style={styles.tooltipTitle}>{month}</Text>
                          <Text style={[styles.tooltipValue, { color: theme.colors.success }]}>
                            +Rp {chartData.incomeData[idx].toFixed(1)} Jt
                          </Text>
                          <Text style={[styles.tooltipValue, { color: theme.colors.danger }]}>
                            -Rp {chartData.expenseData[idx].toFixed(1)} Jt
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>

                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
                    <Text style={styles.legendText}>Pemasukan</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.danger }]} />
                    <Text style={styles.legendText}>Pengeluaran</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
        {activeTab === 'category' && (
          <>
            {/* Category Breakdown */}
            <View style={styles.categoryCard}>
              <Text style={styles.categoryCardTitle}>Breakdown Pengeluaran</Text>
              <Text style={styles.categoryCardSub}>Per kategori</Text>

              {/* Visual Ring Placeholder */}
              <View style={styles.ringArea}>
                <View style={styles.ringOuter}>
                  <View style={styles.ringInner}>
                    <Text style={styles.ringValue}>Rp {(expenseTotalForCategory / 1_000_000).toFixed(1)} Jt</Text>
                    <Text style={styles.ringLabel}>Total</Text>
                  </View>
                </View>
              </View>

              {categoryData.length === 0 ? (
                <View style={styles.emptyCard}>
                  <IconBubble name="reports" tone="primary" size={56} />
                  <Text style={styles.emptyTitle}>Belum ada data</Text>
                  <Text style={styles.emptySub}>Catat transaksi pengeluaran untuk melihat breakdown.</Text>
                </View>
              ) : (
                categoryData.map((cat, idx) => (
                  <View
                    key={cat.category}
                    style={[
                      styles.catRow,
                      idx === 0 && { borderTopWidth: 0 },
                    ]}
                  >
                    <View style={styles.catLeft}>
                      <IconBubble name={cat.icon} tone="primary" size={36} />
                      <View>
                        <Text style={styles.catName}>{cat.category}</Text>
                        <Text style={styles.catAmount}>{formatRupiah(cat.amount)}</Text>
                      </View>
                    </View>
                    <View style={styles.catRight}>
                      <Text style={styles.catPct}>{cat.percent}%</Text>
                      <View style={styles.catBar}>
                        <View style={[styles.catBarFill, { width: `${cat.percent}%`, backgroundColor: theme.colors.brandPrimary }]} />
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
        {activeTab === 'compare' && (
          <>
            {/* Comparison Panel */}
            <View style={styles.categoryCard}>
              <Text style={styles.categoryCardTitle}>Perbandingan Bulan Lalu</Text>
              <Text style={styles.categoryCardSub}>Bandingkan dengan periode sebelumnya</Text>

              {dataLoading && (
                <View style={styles.loadingCard}>
                  <Text style={styles.loadingText}>Memuat data perbandingan...</Text>
                </View>
              )}

              {compareData && compareData.current && compareData.previous && (
                <>
                  <View style={styles.compareRow}>
                    <Text style={styles.compareLabel}>Pemasukan</Text>
                    <View style={styles.compareValues}>
                      <Text style={styles.compareCurrent}>{formatRupiah(compareData.current.income)}</Text>
                      <Text style={[styles.compareDelta, compareData.current.income >= compareData.previous.income ? styles.compareDeltaPositive : styles.compareDeltaNegative]}>
                        {compareData.current.income >= compareData.previous.income ? 'Naik' : 'Turun'} {formatRupiah(Math.abs(compareData.current.income - compareData.previous.income))}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.compareRow}>
                    <Text style={styles.compareLabel}>Pengeluaran</Text>
                    <View style={styles.compareValues}>
                      <Text style={styles.compareCurrent}>{formatRupiah(compareData.current.expense)}</Text>
                      <Text style={[styles.compareDelta, compareData.current.expense <= compareData.previous.expense ? styles.compareDeltaPositive : styles.compareDeltaNegative]}>
                        {compareData.current.expense <= compareData.previous.expense ? 'Turun' : 'Naik'} {formatRupiah(Math.abs(compareData.current.expense - compareData.previous.expense))}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.compareRow}>
                    <Text style={styles.compareLabel}>Tabungan</Text>
                    <View style={styles.compareValues}>
                      <Text style={styles.compareCurrent}>{formatRupiah(compareData.current.net)}</Text>
                      <Text style={[styles.compareDelta, compareData.current.net >= compareData.previous.net ? styles.compareDeltaPositive : styles.compareDeltaNegative]}>
                        {compareData.current.net >= compareData.previous.net ? 'Naik' : 'Turun'} {formatRupiah(Math.abs(compareData.current.net - compareData.previous.net))}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.compareRow}>
                    <Text style={styles.compareLabel}>Jumlah Transaksi</Text>
                    <View style={styles.compareValues}>
                      <Text style={styles.compareCurrent}>{compareData.current.count}</Text>
                      <Text style={[styles.compareDelta, compareData.current.count >= compareData.previous.count ? styles.compareDeltaPositive : styles.compareDeltaNegative]}>
                        {compareData.current.count >= compareData.previous.count ? 'Naik' : 'Turun'} {Math.abs(compareData.current.count - compareData.previous.count)}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {compareData && (!compareData.current || !compareData.previous) && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoText}>Tidak ada data periode sebelumnya untuk dibandingkan.</Text>
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
            <Text style={styles.modalTitle}>Pilih Rentang Tanggal</Text>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Mulai</Text>
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
              <Text style={styles.modalSectionTitle}>Selesai</Text>
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
                <Text style={styles.modalActionCancelText}>Batal</Text>
              </Pressable>
              <Pressable
                style={[styles.modalActionButton, styles.modalActionConfirm]}
                onPress={confirmCustomDateRange}
              >
                <Text style={styles.modalActionConfirmText}>Terapkan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
      gap: 12,
    },
    title: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
    subtitle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
    monthBadge: {
      backgroundColor: `${theme.colors.brandPrimary}1F`,
      borderWidth: 1,
      borderColor: `${theme.colors.brandPrimary}52`,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    monthBadgeText: { color: theme.colors.brandPrimary, fontSize: 12, fontWeight: '700' },
    headerRight: { alignItems: 'flex-end', gap: 8 },
    shareButton: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    shareButtonText: { color: theme.colors.textInverse, fontSize: 11, fontWeight: '700' },
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
      backgroundColor: `${theme.colors.brandPrimary}1A`,
      borderColor: theme.colors.brandPrimary,
    },
    periodChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    periodChipTextActive: {
      color: theme.colors.brandPrimary,
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
      backgroundColor: `${theme.colors.brandPrimary}10`,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${theme.colors.brandPrimary}35`,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    infoText: {
      color: theme.colors.brandPrimary,
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
      backgroundColor: theme.colors.brandPrimary,
      borderColor: theme.colors.brandPrimary,
    },
    tabChipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
    tabChipTextActive: { color: theme.colors.textInverse },
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
    chartArea: {
      height: 160,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 6,
      marginTop: 8,
    },
    chartColumn: {
      flex: 1,
      alignItems: 'center',
      height: '100%',
    },
    chartBarsWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 3,
      width: '100%',
    },
    chartBar: {
      flex: 1,
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
    },
    chartBarSelected: {
      opacity: 0.85,
      transform: [{ scale: 1.03 }],
    },
    chartTooltip: {
      position: 'absolute',
      top: -74,
      left: '50%',
      marginLeft: -62,
      width: 124,
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      padding: 8,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
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
    ringOuter: {
      width: 140,
      height: 140,
      borderRadius: 70,
      borderWidth: 10,
      borderColor: theme.colors.brandPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringInner: { alignItems: 'center' },
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
    catName: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' },
    catAmount: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },
    catRight: { alignItems: 'flex-end', gap: 4 },
    catPct: { color: theme.colors.brandPrimary, fontSize: 13, fontWeight: '800' },
    catBar: { width: 60, height: 4, borderRadius: 999, backgroundColor: theme.colors.mutedSurface },
    catBarFill: { height: '100%', borderRadius: 999 },
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
    customRangeBadge: {
      backgroundColor: `${theme.colors.brandPrimary}1A`,
      borderWidth: 1,
      borderColor: theme.colors.brandPrimary,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    customRangeBadgeText: {
      color: theme.colors.brandPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
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
      backgroundColor: theme.colors.brandPrimary,
      borderColor: theme.colors.brandPrimary,
    },
    monthChipText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    monthChipTextActive: {
      color: theme.colors.textInverse,
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
      backgroundColor: theme.colors.brandPrimary,
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
