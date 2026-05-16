import { useMemo } from 'react'
import { useWindowDimensions, View } from 'react-native'

import { Pill, ScreenHeader, SectionCard, TransactionRow } from '../../components/MobileUI'
import { createMobileStyles } from '../../styles/mobileStyles'
import { useTheme } from '../../theme/theme-context'

export function TransactionsScreen() {
  const { theme } = useTheme()
  const { width } = useWindowDimensions()
  const styles = useMemo(() => createMobileStyles(theme, width), [theme, width])

  return (
    <View style={styles.screenWrap}>
      <ScreenHeader title="Transaksi" subtitle="Semua catatan terbaru" />
      <SectionCard title="Filter aktif" action="Reset">
        <View style={styles.pillRow}>
          <Pill text="Bulan ini" active />
          <Pill text="Semua wallet" />
          <Pill text="Expense" active />
          <Pill text="Income" />
        </View>
      </SectionCard>

      <SectionCard title="Daftar transaksi" action="+ Tambah">
        <TransactionRow merchant="Indomaret" amount="-45rb" icon="IM" sublabel="Hari ini · GoPay" />
        <TransactionRow merchant="Gaji April" amount="+8Jt" icon="GA" sublabel="1 Apr · BCA" positive />
        <TransactionRow merchant="Grab Car" amount="-22rb" icon="GC" sublabel="Kemarin" />
      </SectionCard>
    </View>
  )
}
