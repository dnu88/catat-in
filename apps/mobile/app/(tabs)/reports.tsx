import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, Share, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Circle, Polyline } from 'react-native-svg'

import { useTheme } from '../../src/theme/theme-context'
import { useSupabase } from '../../src/lib/supabase'
import { IconBubble } from '../../src/components/ui'
import type { KaswiseIconName } from '../../src/components/icons/kaswise-icons'
import { useI18n } from '../../src/i18n/i18n-context'

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const incomeData = [4.2, 5.1, 6.8, 7.2, 8.5, 18.65]
const expenseData = [3.1, 3.8, 4.2, 5.0, 4.8, 6.4]

const categories = [
  { id: 'food', label: 'Makanan & Minuman', percent: 32, value: 2_050_000, amount: 'Rp 2.050.000', icon: 'bills' as KaswiseIconName, color: '#65A30D', tone: 'success' as const },
  { id: 'transport', label: 'Transportasi', percent: 22, value: 1_408_000, amount: 'Rp 1.408.000', icon: 'card' as KaswiseIconName, color: '#2A5DD0', tone: 'navy' as const },
  { id: 'shopping', label: 'Belanja', percent: 18, value: 1_152_000, amount: 'Rp 1.152.000', icon: 'wallets' as KaswiseIconName, color: '#B45309', tone: 'warning' as const },
  { id: 'bills', label: 'Tagihan', percent: 15, value: 960_000, amount: 'Rp 960.000', icon: 'file' as KaswiseIconName, color: '#DC2626', tone: 'danger' as const },
  { id: 'entertainment', label: 'Hiburan', percent: 8, value: 512_000, amount: 'Rp 512.000', icon: 'insight' as KaswiseIconName, color: '#0284C7', tone: 'info' as const },
  { id: 'other', label: 'Lainnya', percent: 5, value: 320_000, amount: 'Rp 320.000', icon: 'chart' as KaswiseIconName, color: '#6B7280', tone: 'neutral' as const },
]

type Tab = 'overview' | 'category' | 'compare'
type PeriodFilter = 'month' | '3month' | '6month' | 'year' | 'custom'
type CategoryTone = 'success' | 'warning' | 'danger' | 'info' | 'navy' | 'neutral'

type CategoryVisualMeta = {
  color: string
  icon: KaswiseIconName
  tone: CategoryTone
}

type ReportTransaction = {
  amount: number
  transaction_type: 'income' | 'expense'
  category: string | null
  date: string | null
  description?: string | null
  merchant?: string | null
  note?: string | null
}

const fallbackCategoryColors = {
  light: ['#65A30D', '#2A5DD0', '#B45309', '#DC2626', '#0284C7', '#7C3AED', '#DB2777', '#0F766E'],
  dark: ['#A3FF12', '#4A80F0', '#F59E0B', '#FF7B7B', '#38BDF8', '#A78BFA', '#F472B6', '#2DD4BF'],
}

function stableCategoryIndex(categoryName: string, paletteLength: number) {
  const normalized = categoryName.trim().toLowerCase() || 'other'
  let hash = 0
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) % paletteLength
  }
  return hash
}

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
  const router = useRouter()
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
  const [customStartDay, setCustomStartDay] = useState(1)
  const [customEndYear, setCustomEndYear] = useState(new Date().getFullYear())
  const [customEndMonth, setCustomEndMonth] = useState(new Date().getMonth() + 1)
  const [customEndDay, setCustomEndDay] = useState(new Date().getDate())
  const [tempStartYear, setTempStartYear] = useState(customStartYear)
  const [tempStartMonth, setTempStartMonth] = useState(customStartMonth)
  const [tempStartDay, setTempStartDay] = useState(customStartDay)
  const [tempEndYear, setTempEndYear] = useState(customEndYear)
  const [tempEndMonth, setTempEndMonth] = useState(customEndMonth)
  const [tempEndDay, setTempEndDay] = useState(customEndDay)
  const [compareData, setCompareData] = useState<{
    current: { income: number; expense: number; net: number; count: number } | null
    previous: { income: number; expense: number; net: number; count: number } | null
  } | null>(null)
  const [dynamicCategories, setDynamicCategories] = useState(categories)
  const [reportTransactions, setReportTransactions] = useState<ReportTransaction[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const neutralCategoryColor = theme.mode === 'light' ? '#6B7280' : '#9CA3AF'
  const categoryColorByName: Record<string, CategoryVisualMeta> = {
    food: { color: theme.mode === 'light' ? '#65A30D' : '#A3FF12', icon: 'bills', tone: 'success' },
    makan: { color: theme.mode === 'light' ? '#65A30D' : '#A3FF12', icon: 'bills', tone: 'success' },
    'makan & minum': { color: theme.mode === 'light' ? '#65A30D' : '#A3FF12', icon: 'bills', tone: 'success' },
    transport: { color: theme.mode === 'light' ? '#2A5DD0' : '#4A80F0', icon: 'card', tone: 'navy' },
    transportasi: { color: theme.mode === 'light' ? '#2A5DD0' : '#4A80F0', icon: 'card', tone: 'navy' },
    shopping: { color: theme.mode === 'light' ? '#B45309' : '#F59E0B', icon: 'wallets', tone: 'warning' },
    belanja: { color: theme.mode === 'light' ? '#B45309' : '#F59E0B', icon: 'wallets', tone: 'warning' },
    bills: { color: theme.mode === 'light' ? '#DC2626' : '#FF7B7B', icon: 'file', tone: 'danger' },
    tagihan: { color: theme.mode === 'light' ? '#DC2626' : '#FF7B7B', icon: 'file', tone: 'danger' },
    entertainment: { color: theme.mode === 'light' ? '#0284C7' : '#38BDF8', icon: 'insight', tone: 'info' },
    hiburan: { color: theme.mode === 'light' ? '#0284C7' : '#38BDF8', icon: 'insight', tone: 'info' },
    other: { color: neutralCategoryColor, icon: 'chart', tone: 'neutral' },
    lainnya: { color: neutralCategoryColor, icon: 'chart', tone: 'neutral' },
  }
  const getCategoryVisualMeta = (categoryName: string): CategoryVisualMeta => {
    const key = categoryName.trim().toLowerCase() || 'other'
    const known = categoryColorByName[key]
    if (known) return known

    const palette = fallbackCategoryColors[theme.mode]
    return {
      color: palette[stableCategoryIndex(key, palette.length)],
      icon: 'chart',
      tone: 'neutral',
    }
  }

  const colorForCategoryIndex = (categoryName: string, offset: number) => {
    const palette = fallbackCategoryColors[theme.mode]
    const baseIndex = stableCategoryIndex(categoryName, palette.length)
    return palette[(baseIndex + offset) % palette.length]
  }

  const withUniqueCategoryColors = <T extends { id: string; color: string }>(items: T[]) => {
    const usedColors = new Set<string>()
    return items.map((item) => {
      if (!usedColors.has(item.color)) {
        usedColors.add(item.color)
        return item
      }

      let offset = 1
      let nextColor = colorForCategoryIndex(item.id, offset)
      while (usedColors.has(nextColor) && offset < fallbackCategoryColors[theme.mode].length) {
        offset += 1
        nextColor = colorForCategoryIndex(item.id, offset)
      }
      usedColors.add(nextColor)
      return { ...item, color: nextColor }
    })
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
        modalTitle: 'Select Date Range', modalStart: 'Start', modalEnd: 'End', modalDay: 'Day',
        modalCancel: 'Cancel', modalApply: 'Apply', detailTitle: 'Transactions', noCategoryTransactions: 'No transactions in this category.',
        shareTitle: 'Financial Report', shareIncome: 'Income', shareExpense: 'Expense',
        shareSavings: 'Savings', shareTxCount: 'Transactions',
        budgetWalletTitle: 'Budget Wallets', budgetWalletMeta: 'Personal budgets like Coffee, Ride-hailing, and Hangout.', budgetWalletManage: 'Manage',
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
        modalTitle: 'Pilih Rentang Tanggal', modalStart: 'Mulai', modalEnd: 'Selesai', modalDay: 'Tanggal',
        modalCancel: 'Batal', modalApply: 'Terapkan', detailTitle: 'Transaksi', noCategoryTransactions: 'Belum ada transaksi di kategori ini.',
        shareTitle: 'Laporan Keuangan', shareIncome: 'Pemasukan', shareExpense: 'Pengeluaran',
        shareSavings: 'Tabungan', shareTxCount: 'Jumlah transaksi',
        budgetWalletTitle: 'Dompet', budgetWalletMeta: 'Budget personal seperti Kopi, Ojol, dan Nongkrong.', budgetWalletManage: 'Kelola',
      }

  const maxVal = Math.max(...incomeData, ...expenseData)
  const lineChartWidth = 300
  const lineChartHeight = 150
  const lineChartPadding = 16
  const linePointFor = (value: number, idx: number) => {
    const usableWidth = lineChartWidth - lineChartPadding * 2
    const usableHeight = 118
    const x = lineChartPadding + (idx / (months.length - 1)) * usableWidth
    const y = lineChartPadding + (1 - value / maxVal) * usableHeight
    return `${Math.round(x)},${Math.round(y)}`
  }
  const incomeLinePoints = incomeData.map(linePointFor).join(' ')
  const expenseLinePoints = expenseData.map(linePointFor).join(' ')
  const donutSize = 180
  const donutCenter = donutSize / 2
  const donutRadius = 64
  const donutStrokeWidth = 18
  const donutGlowStrokeWidth = 21
  const donutCircumference = 2 * Math.PI * donutRadius
  const donutSegmentGap = 6
  const incomeAccent = theme.mode === 'light' ? '#65A30D' : '#A3FF12'
  const expenseAccent = theme.mode === 'light' ? theme.colors.textPrimary : '#FF7B7B'

  const formatRupiah = (valueInJuta: number) => `Rp ${(valueInJuta * 1_000_000).toLocaleString('id-ID')}`
  const formatCompactRupiah = (value: number) => {
    if (value >= 1_000_000) {
      return `Rp ${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
    }
    if (value >= 1_000) {
      return `Rp ${(value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`
    }
    return `Rp ${value.toLocaleString('id-ID')}`
  }

  const totalIncomeJuta = incomeData[incomeData.length - 1] ?? 0
  const totalExpenseJuta = expenseData[expenseData.length - 1] ?? 0
  const netJuta = totalIncomeJuta - totalExpenseJuta
  const reportExpenseTotal = reportTransactions
    .filter((transaction) => transaction.transaction_type === 'expense')
    .reduce((sum, transaction) => sum + (transaction.amount || 0), 0)
  const donutTotalLabel = formatCompactRupiah(reportExpenseTotal || totalExpenseJuta * 1_000_000)
  const categoryValueTotal = dynamicCategories.reduce((sum, cat) => sum + Math.max(0, cat.value ?? 0), 0)
  const categoryPercentTotal = dynamicCategories.reduce((sum, cat) => sum + Math.max(0, cat.percent), 0) || 100
  const donutSegments = dynamicCategories.map((cat) => {
    const normalizedRatio = categoryValueTotal > 0
      ? Math.max(0, cat.value ?? 0) / categoryValueTotal
      : Math.max(0, cat.percent) / categoryPercentTotal
    const rawDashLength = normalizedRatio * donutCircumference
    const segmentGap = Math.min(donutSegmentGap, rawDashLength * 0.32)
    return {
      ...cat,
      dashLength: Math.max(0, rawDashLength - segmentGap),
      gapLength: donutCircumference - Math.max(0, rawDashLength - segmentGap),
      sweepLength: rawDashLength,
      offsetLength: 0,
    }
  }).map((cat, index, items) => {
    const previousLength = items.slice(0, index).reduce((sum, item) => sum + item.sweepLength, 0)
    return { ...cat, offsetLength: previousLength }
  })

  const monthName = (month: number) => (language === 'en'
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'])[month - 1]

  const pad2 = (value: number) => String(value).padStart(2, '0')
  const dateKey = (year: number, month: number, day: number) => `${year}-${pad2(month)}-${pad2(day)}`
  const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate()
  const dayNumbers = (year: number, month: number) => Array.from({ length: daysInMonth(year, month) }, (_, index) => index + 1)
  const customRangeLabel = `${customStartDay} ${monthName(customStartMonth)} ${customStartYear} - ${customEndDay} ${monthName(customEndMonth)} ${customEndYear}`
  const selectedCategory = dynamicCategories.find((cat) => cat.id === selectedCategoryId) ?? null
  const selectedCategoryTransactions = selectedCategoryId
    ? reportTransactions
        .filter((transaction) => transaction.transaction_type === 'expense')
        .filter((transaction) => ((transaction.category || 'other').toString().trim().toLowerCase() || 'other') === selectedCategoryId)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    : []

  const openCustomDateModal = () => {
    setTempStartYear(customStartYear)
    setTempStartMonth(customStartMonth)
    setTempStartDay(customStartDay)
    setTempEndYear(customEndYear)
    setTempEndMonth(customEndMonth)
    setTempEndDay(customEndDay)
    setShowDateModal(true)
  }

  const confirmCustomDateRange = () => {
    const safeStartDay = Math.min(tempStartDay, daysInMonth(tempStartYear, tempStartMonth))
    const safeEndDay = Math.min(tempEndDay, daysInMonth(tempEndYear, tempEndMonth))
    const tempStart = new Date(tempStartYear, tempStartMonth - 1, safeStartDay)
    const tempEnd = new Date(tempEndYear, tempEndMonth - 1, safeEndDay)
    if (tempStart > tempEnd) {
      setDataError(tx.errorDateRange)
      return
    }

    setCustomStartYear(tempStartYear)
    setCustomStartMonth(tempStartMonth)
    setCustomStartDay(safeStartDay)
    setCustomEndYear(tempEndYear)
    setCustomEndMonth(tempEndMonth)
    setCustomEndDay(safeEndDay)
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
        let startDateString: string
        let endDateString: string

        if (periodFilter === 'custom') {
          startDate = new Date(customStartYear, customStartMonth - 1, customStartDay)
          endDate = new Date(customEndYear, customEndMonth - 1, customEndDay)
          startDateString = dateKey(customStartYear, customStartMonth, customStartDay)
          endDateString = dateKey(customEndYear, customEndMonth, customEndDay)
        } else {
          const now = new Date()
          const monthsBack = periodFilter === 'month' ? 1 :
                           periodFilter === '3month' ? 3 :
                           periodFilter === '6month' ? 6 : 12
          startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          startDateString = dateKey(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate())
          endDateString = dateKey(endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate())
        }

        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('amount, transaction_type, category, date, description, merchant, note')
          .eq('user_id', user.id)
          .gte('date', startDateString)
          .lte('date', endDateString)

        if (error) throw error

        const loadedTransactions = (transactions || []) as ReportTransaction[]
        setReportTransactions(loadedTransactions)
        setRealTransactionCount(loadedTransactions.length)

        const expenseTx = loadedTransactions.filter((t) => t.transaction_type === 'expense')
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
              const categoryMeta = getCategoryVisualMeta(key)
              return {
                id: key,
                label: key.charAt(0).toUpperCase() + key.slice(1),
                percent,
                value: amount,
                amount: `Rp ${amount.toLocaleString('id-ID')}`,
                icon: categoryMeta.icon,
                color: categoryMeta.color,
                tone: categoryMeta.tone,
              }
            })
            .sort((a, b) => b.percent - a.percent)
          setDynamicCategories(withUniqueCategoryColors(generated))
        } else {
          setDynamicCategories(withUniqueCategoryColors(categories.map((c) => ({ ...c, ...getCategoryVisualMeta(c.id) }))))
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
            .gte('date', dateKey(prevStartDate.getFullYear(), prevStartDate.getMonth() + 1, prevStartDate.getDate()))
            .lte('date', dateKey(prevEndDate.getFullYear(), prevEndDate.getMonth() + 1, prevEndDate.getDate()))

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
  }, [activeTab, periodFilter, customStartYear, customStartMonth, customStartDay, customEndYear, customEndMonth, customEndDay, supabase])

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

        {/* Summary Row — shown before controls */}
        <View testID="reports-summary-card" style={styles.summaryCard}>
          <View style={styles.heroBloomOne} />
          <View style={styles.heroBloomTwo} />
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryHalf}>
              <Text style={styles.summaryLabel}>{tx.income}</Text>
              <Text testID="reports-summary-income-value" style={[styles.summaryValue, { color: incomeAccent }]}>Rp 18,65 Jt</Text>
              <Text style={[styles.summaryTrend, { color: incomeAccent }]}>▲ 12.5%</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryHalf}>
              <Text style={styles.summaryLabel}>{tx.expense}</Text>
              <Text testID="reports-summary-expense-value" style={[styles.summaryValue, { color: expenseAccent }]}>Rp 6,40 Jt</Text>
              <Text style={[styles.summaryTrend, { color: expenseAccent }]}>▲ 5.2%</Text>
            </View>
          </View>
          <View style={styles.summarySavingsRow}>
            <Text style={styles.summaryLabel}>{tx.savings}</Text>
            <Text testID="reports-summary-savings-value" style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>Rp 12,25 Jt</Text>
            <Text style={styles.summarySavingRate}>{tx.savingRate}</Text>
          </View>
        </View>

        <View testID="reports-envelope-entry" style={styles.envelopeEntryCard}>
          <View style={styles.envelopeEntryTopRow}>
            <View style={styles.envelopeEntryTitleRow}>
              <IconBubble name="budgets" tone="primary" size={36} />
              <View>
                <Text style={styles.envelopeEntryTitle}>{tx.budgetWalletTitle}</Text>
                <Text style={styles.envelopeEntryMeta}>{tx.budgetWalletMeta}</Text>
              </View>
            </View>
            <Pressable
              testID="reports-envelope-manage"
              style={styles.envelopeManageButton}
              onPress={() => router.push('/(tabs)/budgets' as never)}
            >
              <Text style={styles.envelopeManageText}>{tx.budgetWalletManage}</Text>
            </Pressable>
          </View>
        </View>

        {/* Tab Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollView} contentContainerStyle={styles.tabRow}>
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
        </ScrollView>

        {/* Period Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScrollView} contentContainerStyle={styles.periodRow}>
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
        </ScrollView>
        {periodFilter === 'custom' && (
          <Pressable style={styles.customRangeBadge} onPress={openCustomDateModal}>
            <Text style={styles.customRangeBadgeText}>{customRangeLabel}</Text>
          </Pressable>
        )}

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
                  <Svg testID="reports-line-chart-svg" width="100%" height={lineChartHeight} viewBox={`0 0 ${lineChartWidth} ${lineChartHeight}`} style={styles.lineSvgLayer}>
                    <Polyline testID="reports-line-path-income" accessibilityLabel={incomeLinePoints} points={incomeLinePoints} fill="none" stroke={theme.colors.success} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                    <Polyline testID="reports-line-path-expense" accessibilityLabel={expenseLinePoints} points={expenseLinePoints} fill="none" stroke={theme.colors.danger} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
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
                  <Svg testID="reports-donut-svg" width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`} accessibilityLabel={`0 0 ${donutSize} ${donutSize}`} style={styles.donutSvg}>
                    <Circle
                      cx={donutCenter}
                      cy={donutCenter}
                      r={donutRadius + 4}
                      fill="none"
                      stroke={theme.colors.borderSoft}
                      strokeWidth={1}
                      opacity={theme.mode === 'dark' ? 0.55 : 0.72}
                    />
                    <Circle
                      cx={donutCenter}
                      cy={donutCenter}
                      r={donutRadius}
                      fill="none"
                      stroke={theme.colors.borderSoft}
                      strokeWidth={donutStrokeWidth}
                      opacity={theme.mode === 'dark' ? 0.18 : 0.28}
                    />
                    <Circle
                      cx={donutCenter}
                      cy={donutCenter}
                      r={donutRadius - 14}
                      fill="none"
                      stroke={theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'}
                      strokeWidth={1}
                    />
                    {donutSegments.map((cat) => (
                      <Circle
                        key={`glow-${cat.id}`}
                        testID={`reports-donut-glow-${cat.id}`}
                        cx={donutCenter}
                        cy={donutCenter}
                        r={donutRadius}
                        accessibilityLabel={cat.color}
                        fill="none"
                        stroke={cat.color}
                        strokeWidth={donutGlowStrokeWidth}
                        strokeDasharray={`${cat.dashLength} ${cat.gapLength}`}
                        strokeDashoffset={-cat.offsetLength}
                        strokeLinecap="butt"
                        opacity={theme.mode === 'dark' ? 0.09 : 0.045}
                        transform={`rotate(-90 ${donutCenter} ${donutCenter})`}
                      />
                    ))}
                    {donutSegments.map((cat) => (
                      <Circle
                        key={cat.id}
                        testID={`reports-donut-segment-${cat.id}`}
                        cx={donutCenter}
                        cy={donutCenter}
                        r={donutRadius}
                        accessibilityLabel={cat.color}
                        fill="none"
                        stroke={cat.color}
                        strokeWidth={donutStrokeWidth}
                        strokeDasharray={`${cat.dashLength} ${cat.gapLength}`}
                        strokeDashoffset={-cat.offsetLength}
                        strokeLinecap="butt"
                        opacity={theme.mode === 'dark' ? 0.9 : 0.86}
                        transform={`rotate(-90 ${donutCenter} ${donutCenter})`}
                      />
                    ))}
                  </Svg>
                  <View style={styles.ringInner}>
                    <Text style={styles.ringValue}>{donutTotalLabel}</Text>
                    <Text style={styles.ringLabel}>{tx.ringLabel}</Text>
                  </View>
                </View>
              </View>

              {dynamicCategories.map((cat, idx) => (
                <Pressable
                  key={cat.label}
                  testID={`reports-category-row-${cat.id}`}
                  style={({ pressed }) => [
                    styles.catRow,
                    idx === 0 && { borderTopWidth: 0 },
                    pressed && { opacity: 0.72 },
                  ]}
                  onPress={() => setSelectedCategoryId(cat.id)}
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
                </Pressable>
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
                    onPress={() => {
                      setTempStartMonth(m)
                      setTempStartDay(Math.min(tempStartDay, daysInMonth(tempStartYear, m)))
                    }}
                  >
                    <Text style={[styles.monthChipText, tempStartMonth === m && styles.monthChipTextActive]}>
                      {monthName(m)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.modalSectionTitle}>{tx.modalDay}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                {dayNumbers(tempStartYear, tempStartMonth).map((day) => (
                  <Pressable
                    key={day}
                    testID={`reports-start-day-${day}`}
                    style={[styles.dayChip, tempStartDay === day && styles.monthChipActive]}
                    onPress={() => setTempStartDay(day)}
                  >
                    <Text style={[styles.monthChipText, tempStartDay === day && styles.monthChipTextActive]}>{day}</Text>
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
                    onPress={() => {
                      setTempEndMonth(m)
                      setTempEndDay(Math.min(tempEndDay, daysInMonth(tempEndYear, m)))
                    }}
                  >
                    <Text style={[styles.monthChipText, tempEndMonth === m && styles.monthChipTextActive]}>
                      {monthName(m)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.modalSectionTitle}>{tx.modalDay}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                {dayNumbers(tempEndYear, tempEndMonth).map((day) => (
                  <Pressable
                    key={day}
                    testID={`reports-end-day-${day}`}
                    style={[styles.dayChip, tempEndDay === day && styles.monthChipActive]}
                    onPress={() => setTempEndDay(day)}
                  >
                    <Text style={[styles.monthChipText, tempEndDay === day && styles.monthChipTextActive]}>{day}</Text>
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

      <Modal
        visible={!!selectedCategory}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCategoryId(null)}
      >
        <View style={styles.modalOverlay}>
          <View testID="reports-category-detail-modal" style={styles.modalContent}>
            <View style={styles.detailHeaderRow}>
              <Pressable
                testID="reports-category-detail-back"
                style={({ pressed }) => [styles.detailBackButton, pressed && { opacity: 0.72 }]}
                onPress={() => setSelectedCategoryId(null)}
              >
                <Text style={styles.detailBackText}>‹</Text>
                <Text style={styles.detailBackLabel}>{tx.modalCancel}</Text>
              </Pressable>
              <View style={styles.detailHeaderTitleWrap}>
                <Text style={styles.modalTitle}>{selectedCategory?.label}</Text>
              </View>
            </View>
            <Text style={styles.detailSubtitle}>{tx.detailTitle} · {selectedCategory?.amount} · {selectedCategory?.percent}%</Text>

            {selectedCategoryTransactions.length === 0 ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>{tx.noCategoryTransactions}</Text>
              </View>
            ) : selectedCategoryTransactions.map((transaction, index) => {
              const title = transaction.description || transaction.merchant || transaction.note || selectedCategory?.label || '-'
              return (
                <View key={`${transaction.date}-${transaction.amount}-${index}`} style={styles.detailTxRow}>
                  <View style={styles.detailTxInfo}>
                    <Text style={styles.detailTxTitle}>{title}</Text>
                    {transaction.merchant ? <Text style={styles.detailTxMeta}>{transaction.merchant}</Text> : null}
                    <Text style={styles.detailTxMeta}>{transaction.date || '-'}</Text>
                  </View>
                  <Text style={styles.detailTxAmount}>Rp {Number(transaction.amount || 0).toLocaleString('id-ID')}</Text>
                </View>
              )
            })}


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
    periodScrollView: {
      marginHorizontal: -20,
    },
    periodRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
      paddingHorizontal: 20,
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
    envelopeEntryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
    },
    envelopeEntryTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    envelopeEntryTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    envelopeEntryTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    envelopeEntryMeta: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    envelopeManageButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: brandSoftBorder,
      backgroundColor: brandSoftBg,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    envelopeManageText: {
      color: brandText,
      fontSize: 12,
      fontWeight: '800',
    },
    tabScrollView: {
      marginHorizontal: -20,
    },
    tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
    tabChip: {
      minWidth: 96,
      paddingVertical: 10,
      paddingHorizontal: 16,
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
    summaryCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      gap: 14,
      overflow: 'hidden',
    },
    heroBloomOne: {
      position: 'absolute',
      top: -60,
      right: -60,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: 'rgba(163, 255, 18, 0.14)',
      opacity: 0.55,
    },
    heroBloomTwo: {
      position: 'absolute',
      bottom: -80,
      left: -60,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: 'rgba(74, 128, 240, 0.10)',
      opacity: 0.6,
    },
    summaryTopRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 12,
    },
    summaryHalf: {
      flex: 1,
      gap: 4,
    },
    summaryDivider: {
      width: 1,
      backgroundColor: theme.colors.borderSoft,
    },
    summarySavingsRow: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSoft,
      paddingTop: 12,
      gap: 4,
    },
    summaryLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
    summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
    summaryTrend: { fontSize: 11, fontWeight: '700' },
    summarySavingRate: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
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
      position: 'relative',
    },
    lineSvgLayer: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
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
    ringArea: {
      alignItems: 'center',
      paddingTop: 24,
      paddingBottom: 20,
    },
    donutChart: {
      width: 180,
      height: 180,
      borderRadius: 90,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
      position: 'relative',
      backgroundColor: theme.mode === 'light' ? '#FBFAF7' : 'rgba(255,255,255,0.035)',
      borderWidth: 1,
      borderColor: theme.mode === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.09)',
      shadowColor: theme.mode === 'light' ? '#0F172A' : '#000000',
      shadowOpacity: theme.mode === 'light' ? 0.09 : 0.32,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 16 },
      elevation: 7,
    },
    donutSvg: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 180,
      height: 180,
    },
    donutSegment: {
      height: 150,
      opacity: 0.92,
    },
    ringInner: {
      position: 'absolute',
      top: 41,
      left: 41,
      width: 98,
      height: 98,
      borderRadius: 49,
      backgroundColor: theme.mode === 'light' ? '#FFFFFF' : theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.mode === 'light' ? 'rgba(15,23,42,0.07)' : theme.colors.borderSoft,
      shadowColor: theme.mode === 'light' ? '#0F172A' : '#000000',
      shadowOpacity: theme.mode === 'light' ? 0.06 : 0.24,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    ringValue: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '900', letterSpacing: -0.4 },
    ringLabel: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 3, textTransform: 'uppercase' },
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
    dayChip: {
      minWidth: 38,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.background,
      marginRight: 8,
      alignItems: 'center',
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
    detailHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    detailBackButton: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingRight: 12,
    },
    detailBackText: {
      color: brandText,
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 30,
    },
    detailBackLabel: {
      color: brandText,
      fontSize: 13,
      fontWeight: '800',
    },
    detailHeaderTitleWrap: {
      flex: 1,
      paddingRight: 54,
    },
    detailSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: -4,
      marginBottom: 12,
    },
    detailTxRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSoft,
    },
    detailTxInfo: {
      flex: 1,
    },
    detailTxTitle: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    detailTxMeta: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginTop: 3,
    },
    detailTxAmount: {
      color: theme.colors.danger,
      fontSize: 13,
      fontWeight: '800',
    },
  })
}
