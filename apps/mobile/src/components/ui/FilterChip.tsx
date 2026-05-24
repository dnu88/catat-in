import { Pressable, Text } from 'react-native'
import { useTheme } from '../../theme/theme-context'

type FilterChipProps = {
  label: string
  selected: boolean
  onPress: () => void
}

export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  const { theme } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={{
        minHeight: 44,
        paddingHorizontal: theme.spacing.lg - 2,
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: selected ? theme.colors.brandPrimary : theme.colors.glass.border,
        backgroundColor: selected ? theme.colors.brandPrimary : theme.colors.glass.background,
      }}
    >
      <Text
        style={{
          color: selected ? theme.colors.textInverse : theme.colors.textSecondary,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.bold,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}
