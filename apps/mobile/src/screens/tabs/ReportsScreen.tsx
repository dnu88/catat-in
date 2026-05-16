import { useMemo } from 'react'
import { Text, useWindowDimensions, View } from 'react-native'

import { CategoryRow, MetricCard, ScreenHeader, SectionCard } from '../../components/MobileUI'
import { createMobileStyles } from '../../styles/mobileStyles'
import { useTheme } from '../../theme/theme-context'

export function ReportsScreen() {
  const { theme } = useTheme()
  const { width } = useWindowDimensions()
  const styles = useMemo(() => createMobileStyles(theme, width), [theme, width])

  return (
    <View style={styles.screenWrap}>
      <ScreenHeader title="Laporan" subtitle="Ringkasan bulan ini" />

      <View style={styles.reportMetricRow}>
        <MetricCard label="Income" value="Rp 8.000.000" />
        <MetricCard label="Expense" value="Rp 3.750.000" />
      </View>

      <SectionCard title="Tren 6 bulan" action="Detail">
        <View style={styles.chartMock}>
          <View style={[styles.chartBar, { height: 72, backgroundColor: theme.colors.info }]} />
          <View style={[styles.chartBar, { height: 96, backgroundColor: theme.colors.brandAccent }]} />
          <View style={[styles.chartBar, { height: 68, backgroundColor: theme.colors.success }]} />
          <View style={[styles.chartBar, { height: 110, backgroundColor: theme.colors.brandPrimary }]} />
          <View style={[styles.chartBar, { height: 88, backgroundColor: theme.colors.warning }]} />
          <View style={[styles.chartBar, { height: 102, backgroundColor: theme.colors.danger }]} />
        </View>
        <Text style={styles.chartCaption}>Perbandingan pengeluaran 6 bulan terakhir</Text>
      </SectionCard>

      <SectionCard title="Kategori tertinggi" action="Lihat semua">
        <CategoryRow label="Makan & Minum" value="35%" />
        <CategoryRow label="Belanja" value="27%" />
        <CategoryRow label="Transportasi" value="18%" />
      </SectionCard>
    </View>
  )
}
