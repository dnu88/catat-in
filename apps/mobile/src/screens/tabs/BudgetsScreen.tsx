import { Text, View } from 'react-native'

import { BudgetCard, HeroMiniStat, MonthChip, ScreenHeader } from '../../components/MobileUI'
import { styles } from '../../styles/mobileStyles'

export function BudgetsScreen() {
  return (
    <View style={styles.screenWrap}>
      <ScreenHeader title="Anggaran" subtitle="April 2026" action="+ Tambah" />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryCardLabel}>Total anggaran</Text>
        <Text style={styles.summaryCardAmount}>Rp 2.200.000</Text>
        <View style={styles.summaryCardStats}>
          <HeroMiniStat label="Terpakai" value="1,41Jt" />
          <HeroMiniStat label="Sisa" value="790rb" />
        </View>
      </View>

      <View style={styles.monthChipRow}>
        <MonthChip label="Mar" />
        <MonthChip label="Apr" active />
        <MonthChip label="Mei" />
      </View>

      <BudgetCard
        icon="MK"
        title="Makan"
        meta="620rb / 800rb"
        pct="77%"
        value={77}
        tone="warn"
        footer="Sisa 180rb · Hampir habis"
      />
      <BudgetCard
        icon="TR"
        title="Transport"
        meta="280rb / 400rb"
        pct="70%"
        value={70}
        tone="ok"
        footer="Sisa 120rb · Aman"
      />
      <BudgetCard
        icon="BL"
        title="Belanja"
        meta="510rb / 500rb"
        pct="102%"
        value={100}
        tone="over"
        footer="Lebih 10rb · Melebihi"
      />
    </View>
  )
}
