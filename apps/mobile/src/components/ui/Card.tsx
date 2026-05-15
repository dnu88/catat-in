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
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderSoft,
      borderWidth: 1,
    },
    elevated: {
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 0,
      ...theme.shadow.md,
    },
    muted: {
      backgroundColor: theme.colors.mutedSurface,
      borderColor: theme.colors.borderSoft,
      borderWidth: 1,
    },
  }

  return (
    <View
      style={[
        {
          borderRadius: theme.radius.lg,
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
