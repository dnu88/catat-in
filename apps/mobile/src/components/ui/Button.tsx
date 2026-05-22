import { ActivityIndicator, Pressable, Text } from 'react-native'
import { useTheme } from '../../theme/theme-context'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

type ButtonProps = {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  disabled?: boolean
  loading?: boolean
}

export function Button({ label, onPress, variant = 'primary', disabled = false, loading = false }: ButtonProps) {
  const { theme } = useTheme()

  const isDisabled = disabled || loading

  const variantStyles = {
    primary: {
      backgroundColor: theme.colors.buttonPrimaryBg,
      borderColor: theme.colors.buttonPrimaryBg,
      color: theme.colors.buttonPrimaryText,
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
      backgroundColor: theme.iconBubbles.danger.background,
      borderColor: theme.iconBubbles.danger.border,
      color: theme.colors.danger,
      shadow: undefined,
    },
  }[variant]

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          borderWidth: 1,
          borderRadius: theme.radius.sm,
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled ? theme.opacity[60] : pressed ? 0.85 : theme.opacity[100],
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
        },
        variantStyles.shadow,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.color} />
      ) : (
        <Text
          style={{
            color: variantStyles.color,
            fontWeight: theme.typography.fontWeight.bold,
            fontSize: theme.typography.fontSize.md,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}
