import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../theme/theme-context'
import { financeEditorial as fe } from '../../theme/finance-editorial'

type ScreenHeaderProps = {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  const { theme } = useTheme()

  return (
    <LinearGradient
      colors={[fe.navySurface, fe.blueDeep, fe.blueBright]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        minHeight: 132,
        borderRadius: theme.radius['2xl'],
        padding: theme.spacing.xl,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: theme.spacing.md,
        overflow: 'hidden',
        shadowColor: fe.navy,
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 8,
      }}
    >
      <View style={{ flex: 1 }}>
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
              marginTop: theme.spacing.xs,
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
