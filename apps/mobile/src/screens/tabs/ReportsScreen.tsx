import { Text, View } from 'react-native'

import { CategoryRow, MetricCard, ScreenHeader, SectionCard } from '../../components/MobileUI'
import { styles } from '../../styles/mobileStyles'

export function ReportsScreen() {
  return (
    <View style={styles.screenWrap}>
      <ScreenHeader title="Laporan" subtitle="Ringkasan bulan ini" />

      <View style={styles.reportMetricRow}>
        <MetricCard label="Income" value="Rp 8.000.000" />
        <MetricCard label="Expense" value="Rp 3.750.000" />
      </View>

      <SectionCard title="Tren 6 bulan" action="Detail">
        <View style={styles.chartMock}>
          <View style={[styles.chartBar, { height: 72, backgroundColor: '#93C5FD' }]} />
          <View style={[styles.chartBar, { height: 96, backgroundColor: '#60A5FA' }]} />
          <View style={[styles.chartBar, { height: 68, backgroundColor: '#3B82F6' }]} />
          <View style={[styles.chartBar, { height: 110, backgroundColor: '#2563EB' }]} />
          <View style={[styles.chartBar, { height: 88, backgroundColor: '#1D4ED8' }]} />
          <View style={[styles.chartBar, { height: 102, backgroundColor: '#1E40AF' }]} />
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
