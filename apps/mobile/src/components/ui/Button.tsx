import { Pressable, Text } from 'react-native'
import { useTheme } from '../../theme/theme-context'

type ButtonProps = {
  label: string
  onPress: () => void
}

export function Button({ label, onPress }: ButtonProps) {
  const { theme } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: theme.colors.brandPrimary,
        borderRadius: theme.radius.pill,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      <Text
        style={{
          color: theme.colors.textInverse,
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}
