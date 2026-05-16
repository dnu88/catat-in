import { useMemo } from 'react'
import { View } from 'react-native'

import { MoreRow, ScreenHeader, SectionCard } from '../../components/MobileUI'
import { createMobileStyles } from '../../styles/mobileStyles'
import { useTheme } from '../../theme/theme-context'

export function MoreScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createMobileStyles(theme), [theme])

  return (
    <View style={styles.screenWrap}>
      <ScreenHeader title="Lainnya" subtitle="Akses fitur tambahan" />

      <SectionCard title="Menu">
        <MoreRow icon="GR" label="Grup Keuangan" helper="Kelola anggota dan role" />
        <MoreRow icon="TG" label="Tagihan" helper="Reminder pembayaran rutin" />
        <MoreRow icon="ST" label="Pengaturan" helper="Preferensi akun dan aplikasi" />
        <MoreRow icon="PR" label="Upgrade Premium" helper="Buka fitur lanjutan" />
      </SectionCard>
    </View>
  )
}
