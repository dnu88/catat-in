import { useMemo } from 'react'
import { Text, View } from 'react-native'

import { ProgressBar, StepNavigation } from '../../components/MobileUI'
import { WALLET_OPTIONS } from '../../data/mock'
import { createMobileStyles } from '../../styles/mobileStyles'
import { useTheme } from '../../theme/theme-context'

export function SetupAccountScreen({
  onNext,
  onBack,
}: {
  onNext: () => void
  onBack: () => void
}) {
  const { theme } = useTheme()
  const styles = useMemo(() => createMobileStyles(theme), [theme])

  return (
    <View style={styles.stepCard}>
      <Text style={styles.setupTitle}>Siapkan akun kamu</Text>
      <Text style={styles.setupSubtitle}>Langkah 2 dari 3 · Tambah dompet</Text>

      <ProgressBar activeIndex={1} />

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Nama lengkap</Text>
        <View style={styles.fieldBox}>
          <Text style={styles.fieldValue}>Danu Budiarto</Text>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Pilih dompetmu</Text>
        <View style={styles.walletGrid}>
          {WALLET_OPTIONS.map((wallet) => (
            <View
              key={wallet.id}
              style={[
                styles.walletChip,
                wallet.selected ? styles.walletChipActive : styles.walletChipIdle,
              ]}
            >
              <Text style={styles.walletChipEmoji}>{wallet.label.slice(0, 1)}</Text>
              <Text
                style={[
                  styles.walletChipText,
                  wallet.selected ? styles.walletChipTextActive : styles.walletChipTextIdle,
                ]}
              >
                {wallet.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Saldo awal BCA (opsional)</Text>
        <View style={[styles.fieldBox, styles.fieldBoxActive]}>
          <Text style={styles.fieldValue}>Rp 4.250.000</Text>
        </View>
      </View>

      <StepNavigation onBack={onBack} onNext={onNext} nextLabel="Simpan & lanjut ->" />
    </View>
  )
}
