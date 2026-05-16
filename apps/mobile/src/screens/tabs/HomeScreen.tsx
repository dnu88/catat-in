import { useMemo } from 'react'
import { Text, View } from 'react-native'

import {
  HeroMiniStat,
  ProgressBarSimple,
  QuickActionCard,
  SectionCard,
  TransactionRow,
} from '../../components/MobileUI'
import { createMobileStyles } from '../../styles/mobileStyles'
import { useTheme } from '../../theme/theme-context'

export function HomeScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createMobileStyles(theme), [theme])

  return (
    <View style={styles.screenWrap}>
      <View style={styles.mobileTopbar}>
        <View>
          <Text style={styles.mobileTopbarTitle}>Halo, Danu</Text>
          <Text style={styles.mobileTopbarSub}>April 2026</Text>
        </View>
        <View style={styles.avatarBadge}>
          <Text style={styles.avatarBadgeText}>DB</Text>
        </View>
      </View>

      <View style={styles.mobileHero}>
        <Text style={styles.mobileHeroLabel}>Total saldo</Text>
        <Text style={styles.mobileHeroAmount}>Rp 4.250.000</Text>
        <View style={styles.mobileHeroStats}>
          <HeroMiniStat label="Pemasukan" value="8,00Jt" />
          <HeroMiniStat label="Pengeluaran" value="3,75Jt" />
          <HeroMiniStat label="Tabungan" value="53%" />
        </View>
      </View>

      <View style={styles.quickActionRow}>
        <QuickActionCard icon="M" label="Manual" />
        <QuickActionCard icon="AI" label="AI Chat" />
        <QuickActionCard icon="S" label="Struk" />
        <QuickActionCard icon="I" label="Import" />
      </View>

      <SectionCard title="Anggaran" action="Lihat ->">
        <View style={styles.inlineBudgetCard}>
          <View style={styles.inlineBudgetHeader}>
            <Text style={styles.inlineBudgetTitle}>Makan</Text>
            <Text style={styles.inlineBudgetPct}>77%</Text>
          </View>
          <Text style={styles.inlineBudgetMeta}>620rb / 800rb</Text>
          <ProgressBarSimple value={77} tone="warn" />
        </View>
      </SectionCard>

      <SectionCard title="Terakhir" action="Semua ->">
        <TransactionRow merchant="Indomaret" amount="-45rb" icon="IM" />
        <TransactionRow merchant="Fore Coffee" amount="-38rb" icon="FC" />
      </SectionCard>
    </View>
  )
}
