import { Pressable, Text } from 'react-native'
import { useTheme } from '../../theme/theme-context'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

type ButtonProps = {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  disabled?: boolean
}

export function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  const { theme } = useTheme()

  const variantStyles = {
    primary: {
      backgroundColor: theme.colors.brandPrimary,
      borderColor: theme.colors.brandPrimary,
      color: theme.colors.textInverse,
      shadow: theme.shadow.neon,
    },
    secondary: {
      backgroundColor: theme.colors.glass.background,
      borderColor: theme.colors.glass.border,
      color: theme.colors.textPrimary,
      shadow: undefined,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: theme.colors.textPrimary,
      shadow: undefined,
    },
    danger: {
      backgroundColor: `rgba(239,68,68,${theme.opacity[10]})`,
      borderColor: `rgba(239,68,68,${theme.opacity[30]})`,
      color: theme.colors.danger,
      shadow: undefined,
    },
  }[variant]

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          borderWidth: 1,
          borderRadius: theme.radius.pill,
          opacity: disabled ? 0.55 : 1,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
        },
        variantStyles.shadow,
      ]}
    >
      <Text
        style={{
          color: variantStyles.color,
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}
