import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '../../src/theme/theme-context'


export default function ReportsScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const categories = [
    { label: 'Makanan & Minuman', percent: 32, amount: 'Rp 2.050.000', color: theme.colors.success },
    { label: 'Transportasi', percent: 22, amount: 'Rp 1.408.000', color: theme.colors.info },
    { label: 'Belanja', percent: 18, amount: 'Rp 1.152.000', color: theme.colors.warning },
    { label: 'Tagihan', percent: 15, amount: 'Rp 960.000', color: theme.colors.danger },
  ]

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Laporan</Text>
          <Text style={styles.subtitle}>Ringkasan performa finansial bulananmu.</Text>
        </View>
        <Text style={styles.monthBadge}>Mei 2024</Text>
      </View>

      <View style={styles.metricRow}>
        <MetricCard label="Pemasukan" value="Rp 18.650.000" tone="positive" />
        <MetricCard label="Pengeluaran" value="Rp 6.400.000" tone="negative" />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Tren 6 Bulan</Text>
        <Text style={styles.sectionSub}>Pemasukan lebih tinggi dari pengeluaran secara konsisten.</Text>

        <View style={styles.chartMock}>
          {[40, 58, 52, 66, 70, 76].map((height, idx) => (
            <View key={`income-${idx}`} style={[styles.chartBar, { height, backgroundColor: theme.colors.success }]} />
          ))}
          {[20, 24, 28, 36, 30, 34].map((height, idx) => (
            <View key={`expense-${idx}`} style={[styles.chartBar, { height, backgroundColor: theme.colors.danger }]} />
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Breakdown Kategori</Text>
        <Text style={styles.sectionSub}>Kategori pengeluaran tertinggi bulan ini.</Text>

        <View style={styles.listWrap}>
          {categories.map((category) => (
            <View key={category.label} style={styles.listRow}>
              <View style={styles.listRowLeft}>
                <View style={[styles.dot, { backgroundColor: category.color }]} />
                <Text style={styles.listLabel}>{category.label}</Text>
              </View>
              <View style={styles.listRowRight}>
                <Text style={styles.listPercent}>{category.percent}%</Text>
                <Text style={styles.listAmount}>{category.amount}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'positive' | 'negative' }) {
  const { theme } = useTheme()

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        padding: 14,
        gap: 4,
      }}
    >
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: tone === 'positive' ? theme.colors.success : theme.colors.danger, fontSize: 16, fontWeight: '800' }}>
        {value}
      </Text>
    </View>
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
    monthBadge: {
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
    metricRow: {
      flexDirection: 'row',
      gap: 10,
    },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 10,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    sectionSub: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    chartMock: {
      height: 120,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 4,
      marginTop: 4,
    },
    chartBar: {
      width: 12,
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
      opacity: 0.95,
    },
    listWrap: {
      gap: 8,
    },
    listRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSoft,
    },
    listRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    dot: { width: 8, height: 8, borderRadius: 999 },
    listLabel: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' },
    listRowRight: { alignItems: 'flex-end' },
    listPercent: { color: theme.colors.brandPrimary, fontSize: 12, fontWeight: '700' },
    listAmount: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },
  })
}
