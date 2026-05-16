import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import { useMobileStyles } from '../styles/useMobileStyles'

export function ScreenHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle: string
  action?: string
}) {
  const styles = useMobileStyles()

  return (
    <View style={styles.screenHeader}>
      <View>
        <Text style={styles.screenHeaderTitle}>{title}</Text>
        <Text style={styles.screenHeaderSubtitle}>{subtitle}</Text>
      </View>
      {action ? (
        <View style={styles.headerAction}>
          <Text style={styles.headerActionText}>{action}</Text>
        </View>
      ) : null}
    </View>
  )
}

export function SectionCard({
  title,
  action,
  children,
}: {
  title: string
  action?: string
  children: ReactNode
}) {
  const styles = useMobileStyles()

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <Text style={styles.sectionCardTitle}>{title}</Text>
        {action ? <Text style={styles.sectionCardAction}>{action}</Text> : null}
      </View>
      {children}
    </View>
  )
}

export function TransactionRow({
  merchant,
  amount,
  icon,
  sublabel,
  positive = false,
}: {
  merchant: string
  amount: string
  icon: string
  sublabel?: string
  positive?: boolean
}) {
  const styles = useMobileStyles()

  return (
    <View style={styles.transactionRow}>
      <View style={styles.transactionIcon}>
        <Text style={styles.transactionIconText}>{icon}</Text>
      </View>
      <View style={styles.transactionContent}>
        <Text style={styles.transactionMerchant}>{merchant}</Text>
        {sublabel ? <Text style={styles.transactionSub}>{sublabel}</Text> : null}
      </View>
      <Text style={[styles.transactionAmount, positive ? styles.transactionAmountPositive : null]}>
        {amount}
      </Text>
    </View>
  )
}

export function QuickActionCard({ icon, label }: { icon: string; label: string }) {
  const styles = useMobileStyles()

  return (
    <View style={styles.quickActionCard}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </View>
  )
}

export function HeroMiniStat({ label, value }: { label: string; value: string }) {
  const styles = useMobileStyles()

  return (
    <View style={styles.heroMiniStat}>
      <Text style={styles.heroMiniStatLabel}>{label}</Text>
      <Text style={styles.heroMiniStatValue}>{value}</Text>
    </View>
  )
}

export function ProgressBar({ activeIndex }: { activeIndex: number }) {
  const styles = useMobileStyles()

  return (
    <View style={styles.progressRow}>
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={[
            styles.progressSegment,
            index < activeIndex
              ? styles.progressDone
              : index === activeIndex
                ? styles.progressActive
                : styles.progressIdle,
          ]}
        />
      ))}
    </View>
  )
}

export function StepNavigation({
  onBack,
  onNext,
  nextLabel,
}: {
  onBack: () => void
  onNext: () => void
  nextLabel: string
}) {
  const styles = useMobileStyles()

  return (
    <View style={styles.navigationRow}>
      <Pressable
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Kembali"
      >
        <Text style={styles.backButtonText}>{'<'}</Text>
      </Pressable>
      <Pressable
        style={styles.nextButton}
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel={nextLabel}
      >
        <Text style={styles.nextButtonText}>{nextLabel}</Text>
      </Pressable>
    </View>
  )
}

export function Tag({ text }: { text: string }) {
  const styles = useMobileStyles()

  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{text}</Text>
    </View>
  )
}

export function ProgressBarSimple({
  value,
  tone,
}: {
  value: number
  tone: 'ok' | 'warn' | 'over'
}) {
  const styles = useMobileStyles()
  const barColor =
    tone === 'ok' ? theme.colors.success : tone === 'warn' ? theme.colors.warning : theme.colors.danger

  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${value}%`, backgroundColor: barColor }]} />
    </View>
  )
}

export function MonthChip({ label, active = false }: { label: string; active?: boolean }) {
  const styles = useMobileStyles()

  return (
    <View style={[styles.monthChip, active ? styles.monthChipActive : null]}>
      <Text style={[styles.monthChipText, active ? styles.monthChipTextActive : null]}>{label}</Text>
    </View>
  )
}

export function BudgetCard({
  icon,
  title,
  meta,
  pct,
  value,
  tone,
  footer,
}: {
  icon: string
  title: string
  meta: string
  pct: string
  value: number
  tone: 'ok' | 'warn' | 'over'
  footer: string
}) {
  const styles = useMobileStyles()

  return (
    <View style={styles.budgetCard}>
      <View style={styles.budgetCardTop}>
        <View style={styles.budgetCardTitleWrap}>
          <Text style={styles.budgetCardEmoji}>{icon}</Text>
          <View>
            <Text style={styles.budgetCardTitle}>{title}</Text>
            <Text style={styles.budgetCardMeta}>{meta}</Text>
          </View>
        </View>
        <Text style={styles.budgetCardPct}>{pct}</Text>
      </View>
      <ProgressBarSimple value={value} tone={tone} />
      <Text style={styles.budgetCardFooter}>{footer}</Text>
    </View>
  )
}

export function MetricCard({ label, value }: { label: string; value: string }) {
  const styles = useMobileStyles()

  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricCardLabel}>{label}</Text>
      <Text style={styles.metricCardValue}>{value}</Text>
    </View>
  )
}

export function CategoryRow({ label, value }: { label: string; value: string }) {
  const styles = useMobileStyles()

  return (
    <View style={styles.categoryRow}>
      <Text style={styles.categoryLabel}>{label}</Text>
      <Text style={styles.categoryValue}>{value}</Text>
    </View>
  )
}

export function MoreRow({
  icon,
  label,
  helper,
}: {
  icon: string
  label: string
  helper: string
}) {
  const styles = useMobileStyles()

  return (
    <View style={styles.moreRow}>
      <View style={styles.moreIconWrap}>
        <Text style={styles.moreIcon}>{icon}</Text>
      </View>
      <View style={styles.moreContent}>
        <Text style={styles.moreLabel}>{label}</Text>
        <Text style={styles.moreHelper}>{helper}</Text>
      </View>
    </View>
  )
}

export function Pill({ text, active = false }: { text: string; active?: boolean }) {
  const styles = useMobileStyles()

  return (
    <View style={[styles.pill, active ? styles.pillActive : null]}>
      <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>{text}</Text>
    </View>
  )
}
