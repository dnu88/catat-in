import type { StyleProp, ViewStyle } from 'react-native'
import { View } from 'react-native'
import { useTheme } from '../../theme/theme-context'

export type CardVariant = 'default' | 'elevated' | 'muted'

type CardProps = {
  children: React.ReactNode
  variant?: CardVariant
  style?: StyleProp<ViewStyle>
}

export function Card({ children, variant = 'default', style }: CardProps) {
  const { theme } = useTheme()

  const variantStyles: Record<CardVariant, ViewStyle> = {
    default: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.borderSoft,
      borderWidth: 1,
      borderRadius: theme.radius['2xl'],
      ...theme.shadow.sm,
    },
    elevated: {
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 0,
      borderRadius: theme.radius['2xl'],
      ...theme.shadow.md,
    },
    muted: {
      backgroundColor: theme.colors.mutedSurface,
      borderColor: theme.colors.borderSoft,
      borderWidth: 1,
      borderRadius: theme.radius['2xl'],
      ...theme.shadow.sm,
    },
  }

  return (
    <View
      style={[
        {
          padding: theme.spacing.lg,
        },
        variantStyles[variant],
        style,
      ]}
    >
      {children}
    </View>
  )
}
