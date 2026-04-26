import { Text, View } from 'react-native'

import { ProgressBar, StepNavigation } from '../../components/MobileUI'
import { styles } from '../../styles/mobileStyles'

export function AiIntroScreen({
  onNext,
  onBack,
  onSkip,
}: {
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}) {
  return (
    <View style={styles.stepCard}>
      <Text style={styles.skipText} onPress={onSkip}>
        {'Lewati ->'}
      </Text>

      <ProgressBar activeIndex={1} />

      <View style={styles.featureHero}>
        <View style={styles.featureBadge}>
          <Text style={styles.featureBadgeText}>AI Powered</Text>
        </View>
        <Text style={styles.featureHeroEmoji}>AI</Text>
      </View>

      <Text style={styles.stepTitle}>
        Catat transaksi{'\n'}cukup dengan chat
      </Text>
      <Text style={styles.stepDescription}>
        Ketik seperti pesan biasa, misalnya "habis makan 45rb di warteg", lalu AI menyiapkan draft transaksi tanpa form panjang.
      </Text>

      <StepNavigation onBack={onBack} onNext={onNext} nextLabel="Lanjut ->" />
    </View>
  )
}
