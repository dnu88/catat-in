import { View } from 'react-native'

import { Pill, ScreenHeader, SectionCard, TransactionRow } from '../../components/MobileUI'
import { styles } from '../../styles/mobileStyles'

export function TransactionsScreen() {
  return (
    <View style={styles.screenWrap}>
      <ScreenHeader title="Transaksi" subtitle="Semua catatan terbaru" />
      <SectionCard title="Filter aktif" action="Reset">
        <View style={styles.pillRow}>
          <Pill text="Bulan ini" active />
          <Pill text="Semua wallet" />
          <Pill text="Expense" />
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
