import { Pressable, Text, View } from 'react-native'

import { Tag } from '../../components/MobileUI'
import { styles } from '../../styles/mobileStyles'

export function WelcomeScreen({
  onRestart,
  onEnterApp,
}: {
  onRestart: () => void
  onEnterApp: () => void
}) {
  return (
    <View style={styles.welcomeWrap}>
      <View style={styles.successIcon}>
        <Text style={styles.successIconText}>OK</Text>
      </View>

      <Text style={styles.welcomeTitle}>Siap, Danu!</Text>
      <Text style={styles.welcomeDescription}>
        Akunmu sudah siap. Mulai catat transaksi pertamamu sekarang.
      </Text>

      <View style={styles.welcomeTags}>
        <Tag text="BCA" />
        <Tag text="GoPay" />
        <Tag text="AI aktif" />
      </View>

      <Pressable style={styles.primaryButton} onPress={onEnterApp}>
        <Text style={styles.primaryButtonText}>{'Mulai catat keuangan ->'}</Text>
      </Pressable>

      <Pressable style={styles.secondaryLinkButton} onPress={onRestart}>
        <Text style={styles.secondaryLinkText}>Lihat onboarding lagi</Text>
      </Pressable>
    </View>
  )
}
