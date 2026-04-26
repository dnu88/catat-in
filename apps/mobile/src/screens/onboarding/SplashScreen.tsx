import { Pressable, Text, View } from 'react-native'

import { styles } from '../../styles/mobileStyles'

export function SplashScreen({
  onPrimary,
  onSecondary,
}: {
  onPrimary: () => void
  onSecondary: () => void
}) {
  return (
    <View style={styles.splashScreen}>
      <View style={styles.splashOrbTop} />
      <View style={styles.splashOrbBottom} />

      <View style={styles.splashLogo}>
        <Text style={styles.splashLogoText}>CI</Text>
      </View>

      <Text style={styles.splashTitle}>Catat.in</Text>
      <Text style={styles.splashSubtitle}>
        Catat keuanganmu dengan{'\n'}mudah, cerdas, dan menyenangkan.
      </Text>

      <View style={styles.splashActions}>
        <Pressable style={styles.whiteButton} onPress={onPrimary}>
          <Text style={styles.whiteButtonText}>Mulai gratis</Text>
        </Pressable>
        <Pressable style={styles.ghostButton} onPress={onSecondary}>
          <Text style={styles.ghostButtonText}>Sudah punya akun? Masuk</Text>
        </Pressable>
      </View>
    </View>
  )
}
