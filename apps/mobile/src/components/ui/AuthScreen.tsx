import { ReactNode, useMemo } from 'react'
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'

import type { IconBubbleTone } from './IconBubble'
import type { KaswiseIconName } from '../icons/kaswise-icons'
import { IconBubble } from './IconBubble'
import { KaswiseIcon } from '../icons/kaswise-icons'
import { useTheme } from '../../theme/theme-context'

type AuthScreenLayoutProps = {
  children: ReactNode
}

export function AuthScreenLayout({ children }: AuthScreenLayoutProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => createLayoutStyles(theme), [theme])

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

type AuthHeroPanelProps = {
  icon: KaswiseIconName
  iconTone?: IconBubbleTone
  eyebrow?: string
  title: string
  description?: string
  stats?: { icon: KaswiseIconName; label: string; tone?: IconBubbleTone }[]
}

export function AuthHeroPanel({
  icon,
  iconTone = 'primary',
  eyebrow = 'Kaswise',
  title,
  description,
  stats,
}: AuthHeroPanelProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => createHeroStyles(theme), [theme])

  return (
    <View style={styles.heroPanel}>
      <View style={styles.heroBadgeRow}>
        <IconBubble name={icon} tone={iconTone} size={52} />
        <View style={styles.brandCopy}>
          <Text style={styles.brandEyebrow}>{eyebrow}</Text>
          <Text style={styles.brandTitle}>{title}</Text>
        </View>
      </View>

      {description ? <Text style={styles.heroBody}>{description}</Text> : null}

      {stats && stats.length > 0 ? (
        <View style={styles.heroStatsRow}>
          {stats.map((stat, index) => {
            const bubbleTone = stat.tone === 'neutral' ? null : stat.tone === 'accent' ? 'navy' : stat.tone || 'primary'
            const iconColor = bubbleTone ? theme.iconBubbles[bubbleTone].color : theme.colors.textMuted

            return (
              <View key={index} style={styles.heroStat}>
                <KaswiseIcon name={stat.icon} size={16} color={iconColor} weight="bold" />
                <Text style={styles.heroStatText}>{stat.label}</Text>
              </View>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

type AuthFormCardProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export function AuthFormCard({ title, subtitle, children }: AuthFormCardProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => createCardStyles(theme), [theme])

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.formArea}>{children}</View>
    </View>
  )
}

type AuthButtonProps = {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
}

export function AuthButton({ label, onPress, loading, disabled }: AuthButtonProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => createButtonStyles(theme), [theme])

  return (
    <Pressable
      style={[styles.primaryButton, (loading || disabled) && styles.primaryButtonDisabled]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.textInverse} />
      ) : (
        <Text style={styles.primaryButtonText}>{label}</Text>
      )}
    </Pressable>
  )
}

type AuthLinkProps = {
  href: string
  label: string
  variant?: 'primary' | 'secondary'
  align?: 'left' | 'center' | 'right'
  compact?: boolean
}

export function AuthLink({ href, label, variant = 'primary', align = 'left', compact = false }: AuthLinkProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => createLinkStyles(theme), [theme])

  const textStyle = variant === 'primary' ? styles.linkPrimary : styles.linkSecondary
  const containerStyle = align === 'center' ? styles.linkContainerCenter : align === 'right' ? styles.linkContainerRight : styles.linkContainer

  return (
    <View style={[containerStyle, compact && styles.linkContainerCompact]}>
      <Link href={href} style={textStyle} accessibilityRole="link" accessibilityLabel={label}>
        {label}
      </Link>
    </View>
  )
}

type AuthFooterProps = {
  question: string
  linkLabel: string
  linkHref: string
}

export function AuthFooter({ question, linkLabel, linkHref }: AuthFooterProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => createFooterStyles(theme), [theme])

  return (
    <View style={styles.footerRow}>
      <Text style={styles.footerText}>{question}</Text>
      <AuthLink href={linkHref} label={linkLabel} variant="primary" compact />
    </View>
  )
}

type AuthBackButtonProps = {
  onPress: () => void
  label?: string
}

export function AuthBackButton({ onPress, label = 'Kembali' }: AuthBackButtonProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => createBackStyles(theme), [theme])

  return (
    <Pressable style={styles.backRow} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <KaswiseIcon name="back" size={18} color={theme.colors.textSecondary} weight="bold" />
      <Text style={styles.backLabel}>{label}</Text>
    </Pressable>
  )
}

// Style factories
function createLayoutStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'flex-start',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing['3xl'],
      paddingBottom: theme.spacing['2xl'],
      gap: theme.spacing['2xl'],
    },
  })
}

function createHeroStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    heroPanel: {
      backgroundColor: theme.colors.mutedSurface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    heroBadgeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
    },
    brandCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    brandEyebrow: {
      color: theme.colors.brandPrimary,
      fontSize: theme.typography.support.fontSize,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    brandTitle: {
      color: theme.colors.textPrimary,
      fontSize: 22,
      fontWeight: '800',
      lineHeight: 28,
    },
    heroBody: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
      marginTop: theme.spacing.xs,
    },
    heroStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    heroStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
    },
    heroStatText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.support.fontSize,
      fontWeight: '700',
    },
  })
}

function createCardStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: theme.spacing.xl,
      gap: theme.spacing.xl,
    },
    cardHeader: {
      gap: theme.spacing.sm,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.cardTitle.fontSize,
      fontWeight: theme.typography.cardTitle.fontWeight,
    },
    cardSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    formArea: {
      gap: theme.spacing.lg,
    },
  })
}

function createButtonStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    primaryButton: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: theme.radius.pill,
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryButtonText: {
      color: theme.colors.textInverse,
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
  })
}

function createFooterStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      rowGap: 2,
      marginTop: theme.spacing.md,
    },
    footerText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    linkPrimary: {
      color: theme.colors.brandPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
  })
}

function createBackStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    backLabel: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
  })
}

function createLinkStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    linkContainer: {
      alignSelf: 'flex-start',
      marginTop: theme.spacing.xs,
    },
    linkContainerCenter: {
      alignSelf: 'center',
      marginTop: theme.spacing.sm,
    },
    linkContainerRight: {
      alignSelf: 'flex-end',
      marginTop: theme.spacing.xs,
    },
    linkContainerCompact: {
      marginTop: 0,
    },
    linkPrimary: {
      color: theme.colors.brandPrimary,
      fontSize: 14,
      fontWeight: '800',
      lineHeight: 20,
    },
    linkSecondary: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 20,
    },
  })
}
