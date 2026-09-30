import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../theme/theme-context'
import { financeEditorial as fe } from '../../theme/finance-editorial'

type SectionHeaderProps = {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  const { theme } = useTheme()

  return (
    <LinearGradient
      colors={[fe.navySurface, fe.blueDeep, fe.blueBright]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        minHeight: 124,
        borderRadius: theme.radius['2xl'],
        padding: theme.spacing.xl,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        overflow: 'hidden',
        shadowColor: fe.navy,
        shadowOpacity: 0.16,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
        elevation: 7,
      }}
    >
      <View style={{ flexShrink: 1, gap: 4 }}>
        <Text
          accessibilityRole="header"
          style={{
            color: fe.white,
            fontSize: theme.typography.screenTitle.fontSize,
            fontWeight: theme.typography.screenTitle.fontWeight,
            letterSpacing: theme.typography.letterSpacing.tight,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: 'rgba(255,255,255,0.68)',
              fontSize: theme.typography.fontSize.sm,
              lineHeight: 18,
              maxWidth: 250,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View>{action}</View> : null}
    </LinearGradient>
  )
}
