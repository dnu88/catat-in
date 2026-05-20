import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { useTheme } from '../../src/theme/theme-context'

const quickActions = [
  { id: 'manual', label: 'Manual', glyph: '✎', route: '/(tabs)/capture', tone: 'primary' },
  { id: 'import', label: 'Import', glyph: '↓', route: '/(tabs)/imports', tone: 'info' },
] as const

const transactions = [
  { id: 'indomaret', title: 'Indomaret', meta: 'Hari ini · GoPay', amount: '-45rb', tone: 'primary' },
  { id: 'fore', title: 'Fore Coffee', meta: 'Hari ini · GoPay', amount: '-38rb', tone: 'warning' },
  { id: 'grab', title: 'Grab Car', meta: 'Kemarin · GoPay', amount: '-22rb', tone: 'primary' },
] as const

export default function DashboardScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Halo, Danu</Text>
            <Text style={styles.dateText}>April 2026</Text>
          </View>
          <View testID="home-avatar" style={styles.avatarWrap}>
            <Text style={styles.avatarText}>DB</Text>
          </View>
        </View>

        <View testID="home-hero-card" style={styles.heroCard}>
          <View style={styles.heroBloomOne} />
          <View style={styles.heroBloomTwo} />

          <View style={styles.heroControlRow}>
            <Pressable testID="home-wallet-pill" style={styles.walletPill} onPress={() => router.push('/(tabs)/wallets' as never)}>
              <Text style={styles.walletIcon}>▱</Text>
              <Text style={styles.walletName}>Main Wallet</Text>
              <Text style={styles.walletCaret}>⌄</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/wallets' as never)}>
              <Text style={styles.manageText}>Manage</Text>
            </Pressable>
          </View>

          <View style={styles.balanceBlock}>
            <Text style={styles.heroLabel}>Total saldo</Text>
            <View style={styles.amountRow}>
              <Text style={styles.heroAmount}>Rp 4.250.000</Text>
              <View style={styles.deltaPill}>
                <Text style={styles.deltaText}>↗ 15%</Text>
              </View>
            </View>
          </View>

        </View>

        <View style={styles.quickActionRow}>
          {quickActions.map((action) => (
            <Pressable
              key={action.id}
              testID={`home-quick-action-${action.id}`}
              style={styles.quickActionCard}
              onPress={() => router.push(action.route as never)}
            >
              <View testID={`home-quick-bubble-${action.id}`} style={[styles.iconBubble, styles[`${action.tone}Bubble`]]}>
                <Text style={[styles.iconBubbleText, styles[`${action.tone}BubbleText`]]}>{action.glyph}</Text>
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <View testID="home-budget-section" style={styles.sectionCard}>
          <View style={styles.sectionTopRow}>
            <Text style={styles.sectionTitle}>Anggaran</Text>
            <Pressable testID="home-budget-action" onPress={() => router.push('/(tabs)/budgets' as never)}>
              <Text style={styles.sectionAction}>Lihat →</Text>
            </Pressable>
          </View>
          <View testID="home-envelope-alert" style={styles.budgetContent}>
            <View style={styles.budgetTopRow}>
              <View style={styles.budgetTextBlock}>
                <Text style={styles.budgetName}>Kopi hampir habis</Text>
                <Text style={styles.budgetMeta}>Rp42.000 tersisa sampai 25 Mei</Text>
              </View>
              <Text style={styles.budgetPercent}>82%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.budgetStatus}>Amplop aktif yang perlu perhatian</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionTopRow}>
            <Text style={styles.sectionTitle}>Terakhir</Text>
            <Pressable onPress={() => router.push('/(tabs)/transactions' as never)}>
              <Text style={styles.sectionAction}>Semua →</Text>
            </Pressable>
          </View>
          {transactions.map((item, index) => (
            <View key={item.id} style={[styles.txRow, index === transactions.length - 1 && styles.txRowLast]}>
              <View style={[styles.txBubble, styles[`${item.tone}Bubble`]]}>
                <Text style={[styles.txBubbleText, styles[`${item.tone}BubbleText`]]}>{item.title.slice(0, 1)}</Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txTitle}>{item.title}</Text>
                <Text style={styles.txMeta}>{item.meta}</Text>
              </View>
              <Text style={styles.txAmount}>{item.amount}</Text>
            </View>
          ))}
        </View>

        <View style={styles.insightCard}>
          <View style={[styles.txBubble, styles.infoBubble]}>
            <Text style={[styles.txBubbleText, styles.infoBubbleText]}>i</Text>
          </View>
          <View style={styles.insightTextBlock}>
            <Text style={styles.insightTitle}>Insight harian</Text>
            <Text style={styles.insightBody}>Pengeluaran kategori Belanja melebihi 10% bulan ini. Mungkin saatnya rem sebentar?</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 110,
      gap: 14,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 6,
    },
    greeting: {
      color: theme.colors.textPrimary,
      fontSize: 22,
      fontWeight: theme.typography.fontWeight.extrabold,
      letterSpacing: -0.3,
    },
    dateText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    avatarWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.brandPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.bold,
    },
    heroCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      overflow: 'hidden',
    },
    heroBloomOne: {
      position: 'absolute',
      top: -60,
      right: -60,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: 'rgba(163, 255, 18, 0.14)',
      opacity: 0.55,
    },
    heroBloomTwo: {
      position: 'absolute',
      bottom: -80,
      left: -60,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: 'rgba(74, 128, 240, 0.10)',
      opacity: 0.6,
    },
    heroControlRow: {
      position: 'relative',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    walletPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.glass.background,
      borderWidth: 1,
      borderColor: theme.colors.glass.border,
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },
    walletIcon: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.bold,
    },
    walletName: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.bold,
    },
    walletCaret: {
      color: theme.colors.textDim,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
    },
    manageText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    balanceBlock: {
      position: 'relative',
      marginBottom: 14,
    },
    heroLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginBottom: 4,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 10,
      flexWrap: 'wrap',
    },
    heroAmount: {
      color: theme.colors.textPrimary,
      fontSize: 30,
      fontWeight: theme.typography.fontWeight.extrabold,
      letterSpacing: -0.6,
    },
    deltaPill: {
      backgroundColor: 'rgba(163, 255, 18, 0.14)',
      borderRadius: 6,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    deltaText: {
      color: theme.colors.brandPrimary,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    quickActionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    quickActionCard: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
      gap: 6,
    },
    iconBubble: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBubbleText: {
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    primaryBubble: {
      backgroundColor: 'rgba(163, 255, 18, 0.14)',
      borderColor: 'rgba(163, 255, 18, 0.25)',
    },
    primaryBubbleText: {
      color: theme.colors.brandPrimary,
    },
    warningBubble: {
      backgroundColor: 'rgba(255, 192, 109, 0.14)',
      borderColor: 'rgba(255, 192, 109, 0.30)',
    },
    warningBubbleText: {
      color: theme.colors.warning,
    },
    infoBubble: {
      backgroundColor: 'rgba(56, 189, 248, 0.14)',
      borderColor: 'rgba(56, 189, 248, 0.30)',
    },
    infoBubbleText: {
      color: theme.colors.info,
    },
    quickActionLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.bold,
    },
    sectionCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      borderRadius: 18,
      padding: 14,
      gap: 10,
    },
    sectionTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.bold,
    },
    sectionAction: {
      color: theme.colors.brandPrimary,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.bold,
    },
    budgetContent: {
      gap: 6,
    },
    budgetTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    budgetTextBlock: {
      flex: 1,
      gap: 3,
    },
    budgetName: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.bold,
    },
    budgetPercent: {
      color: theme.colors.warning,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    budgetMeta: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    progressTrack: {
      height: 6,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 999,
      overflow: 'hidden',
    },
    progressFill: {
      width: '82%',
      height: '100%',
      backgroundColor: theme.colors.warning,
      borderRadius: 999,
    },
    budgetStatus: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSoft,
    },
    txRowLast: {
      borderBottomWidth: 0,
    },
    txBubble: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    txBubbleText: {
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    txInfo: {
      flex: 1,
    },
    txTitle: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.bold,
    },
    txMeta: {
      color: theme.colors.textDim,
      fontSize: 11,
      marginTop: 2,
    },
    txAmount: {
      color: theme.colors.danger,
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    insightCard: {
      backgroundColor: theme.colors.mutedSurface,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      borderRadius: 16,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    insightTextBlock: {
      flex: 1,
    },
    insightTitle: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    insightBody: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
  })
}
