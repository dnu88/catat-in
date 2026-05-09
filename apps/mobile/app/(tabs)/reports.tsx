import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '../../src/theme/theme-context'

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun']
const incomeData = [4.2, 5.1, 6.8, 7.2, 8.5, 18.65]
const expenseData = [3.1, 3.8, 4.2, 5.0, 4.8, 6.4]

const categories = [
  { label: 'Makanan & Minuman', percent: 32, amount: 'Rp 2.050.000', emoji: '🍽' },
  { label: 'Transportasi', percent: 22, amount: 'Rp 1.408.000', emoji: '🚗' },
  { label: 'Belanja', percent: 18, amount: 'Rp 1.152.000', emoji: '🛒' },
  { label: 'Tagihan', percent: 15, amount: 'Rp 960.000', emoji: '📄' },
  { label: 'Hiburan', percent: 8, amount: 'Rp 512.000', emoji: '🎮' },
  { label: 'Lainnya', percent: 5, amount: 'Rp 320.000', emoji: '📦' },
]

type Tab = 'overview' | 'category'
type PeriodFilter = 'month' | '3month' | '6month' | 'year'

const periodLabels: Record<PeriodFilter, string> = {
  month: '1 Bulan',
  '3month': '3 Bulan',
  '6month': '6 Bulan',
  year: '1 Tahun',
}

export default function ReportsScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month')
  const [selectedBar, setSelectedBar] = useState<number | null>(null)

  const maxVal = Math.max(...incomeData, ...expenseData)

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
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {(Object.keys(periodLabels) as PeriodFilter[]).map((key) => (
            <Pressable
              key={key}
              style={[styles.periodChip, periodFilter === key && styles.periodChipActive]}
              onPress={() => setPeriodFilter(key)}
            >
              <Text style={[styles.periodChipText, periodFilter === key && styles.periodChipTextActive]}>
                {periodLabels[key]}
              </Text>
            </Pressable>
          ))}
        </View>

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
        </View>

        {activeTab === 'overview' ? (
          <>
            {/* Key Metrics */}
            <View style={styles.metricRow}>
              <View style={[styles.metricCard, { borderBottomWidth: 3, borderBottomColor: theme.colors.success }]}>
                <Text style={styles.metricLabel}>Pemasukan</Text>
                <Text style={[styles.metricValue, { color: theme.colors.success }]}>Rp 18,65 Jt</Text>
                <View style={styles.metricTrend}>
                  <Text style={[styles.metricTrendText, { color: theme.colors.success }]}>▲ 12.5%</Text>
                </View>
              </View>
              <View style={[styles.metricCard, { borderBottomWidth: 3, borderBottomColor: theme.colors.danger }]}>
                <Text style={styles.metricLabel}>Pengeluaran</Text>
                <Text style={[styles.metricValue, { color: theme.colors.danger }]}>Rp 6,40 Jt</Text>
                <View style={styles.metricTrend}>
                  <Text style={[styles.metricTrendText, { color: theme.colors.danger }]}>▲ 5.2%</Text>
                </View>
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metricCard, { borderBottomWidth: 3, borderBottomColor: theme.colors.brandPrimary }]}>
                <Text style={styles.metricLabel}>Tabungan</Text>
                <Text style={[styles.metricValue, { color: theme.colors.brandPrimary }]}>Rp 12,25 Jt</Text>
                <Text style={styles.metricSub}>65.7% saving rate</Text>
              </View>
              <View style={[styles.metricCard, { borderBottomWidth: 3, borderBottomColor: theme.colors.warning }]}>
                <Text style={styles.metricLabel}>Transaksi</Text>
                <Text style={[styles.metricValue, { color: theme.colors.warning }]}>142</Text>
                <Text style={styles.metricSub}>bulan ini</Text>
              </View>
            </View>

            {/* Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Tren 6 Bulan</Text>
              <Text style={styles.chartSub}>Pemasukan vs pengeluaran (dalam jutaan Rp)</Text>

              <View style={styles.chartArea}>
                {months.map((month, idx) => (
                  <Pressable
                    key={month}
                    style={styles.chartColumn}
                    onPress={() => setSelectedBar(selectedBar === idx ? null : idx)}
                  >
                    <View style={styles.chartBarsWrap}>
                      <View
                        style={[
                          styles.chartBar,
                          { height: `${(incomeData[idx] / maxVal) * 100}%`, backgroundColor: theme.colors.success },
                          selectedBar === idx && styles.chartBarSelected,
                        ]}
                      />
                      <View
                        style={[
                          styles.chartBar,
                          { height: `${(expenseData[idx] / maxVal) * 100}%`, backgroundColor: `${theme.colors.danger}90` },
                          selectedBar === idx && styles.chartBarSelected,
                        ]}
                      />
                    </View>
                    <Text style={styles.chartLabel}>{month}</Text>

                    {selectedBar === idx && (
                      <View style={styles.chartTooltip}>
                        <Text style={styles.tooltipTitle}>{month} 2026</Text>
                        <Text style={[styles.tooltipValue, { color: theme.colors.success }]}>
                          Pemasukan: Rp {incomeData[idx]} Jt
                        </Text>
                        <Text style={[styles.tooltipValue, { color: theme.colors.danger }]}>
                          Pengeluaran: Rp {expenseData[idx]} Jt
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
          </>
        ) : (
          <>
            {/* Category Breakdown */}
            <View style={styles.categoryCard}>
              <Text style={styles.categoryCardTitle}>Breakdown Pengeluaran</Text>
              <Text style={styles.categoryCardSub}>Per kategori bulan Mei 2026</Text>

              {/* Visual Ring Placeholder */}
              <View style={styles.ringArea}>
                <View style={styles.ringOuter}>
                  <View style={styles.ringInner}>
                    <Text style={styles.ringValue}>Rp 6,4 Jt</Text>
                    <Text style={styles.ringLabel}>Total</Text>
                  </View>
                </View>
              </View>

              {categories.map((cat, idx) => (
                <View
                  key={cat.label}
                  style={[
                    styles.catRow,
                    idx === 0 && { borderTopWidth: 0 },
                  ]}
                >
                  <View style={styles.catLeft}>
                    <Text style={styles.catEmoji}>{cat.emoji}</Text>
                    <View>
                      <Text style={styles.catName}>{cat.label}</Text>
                      <Text style={styles.catAmount}>{cat.amount}</Text>
                    </View>
                  </View>
                  <View style={styles.catRight}>
                    <Text style={styles.catPct}>{cat.percent}%</Text>
                    <View style={styles.catBar}>
                      <View style={[styles.catBarFill, { width: `${cat.percent}%`, backgroundColor: theme.colors.brandPrimary }]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
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
    headerRight: { alignItems: 'flex-end' },
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
    catEmoji: { fontSize: 18 },
    catName: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' },
    catAmount: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },
    catRight: { alignItems: 'flex-end', gap: 4 },
    catPct: { color: theme.colors.brandPrimary, fontSize: 13, fontWeight: '800' },
    catBar: { width: 60, height: 4, borderRadius: 999, backgroundColor: theme.colors.mutedSurface },
    catBarFill: { height: '100%', borderRadius: 999 },
  })
}
