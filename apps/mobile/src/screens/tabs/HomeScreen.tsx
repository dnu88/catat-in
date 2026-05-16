import { useMemo } from 'react'
import { Text, useWindowDimensions, View } from 'react-native'

import {
  HeroBalance,
  ProgressBarSimple,
  QuickActionCard,
  SectionCard,
  TransactionRow,
} from '../../components/MobileUI'
import { createMobileStyles } from '../../styles/mobileStyles'
import { useTheme } from '../../theme/theme-context'

export function HomeScreen() {
  const { theme } = useTheme()
  const { width } = useWindowDimensions()
  const styles = useMemo(() => createMobileStyles(theme, width), [theme, width])

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

      <HeroBalance
        amount="Rp 4.250.000"
        walletLabel="Main Wallet"
        delta="15%"
        stats={[
          { label: 'Pemasukan', value: '8,00Jt' },
          { label: 'Pengeluaran', value: '3,75Jt' },
          { label: 'Tabungan', value: '53%' },
        ]}
      />

      <View style={styles.quickActionRow}>
        <QuickActionCard icon="transactions" label="Manual" tone="primary" />
        <QuickActionCard icon="ai" label="AI Chat" tone="accent" />
        <QuickActionCard icon="bills" label="Struk" tone="success" />
        <QuickActionCard icon="imports" label="Import" tone="info" />
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
