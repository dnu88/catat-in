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
    },
    secondary: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderSoft,
      color: theme.colors.textPrimary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: theme.colors.textPrimary,
    },
    danger: {
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.danger,
      color: theme.colors.textInverse,
    },
  }[variant]

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: variantStyles.backgroundColor,
        borderColor: variantStyles.borderColor,
        borderWidth: 1,
        borderRadius: theme.radius.pill,
        opacity: disabled ? 0.55 : 1,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
      }}
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
