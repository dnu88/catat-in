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
      style={{
        paddingHorizontal: theme.spacing.lg - 2,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: selected ? theme.colors.brandPrimary : theme.colors.borderSoft,
        backgroundColor: selected ? theme.colors.brandPrimary : theme.colors.surface,
      }}
    >
      <Text
        style={{
          color: selected ? theme.colors.textInverse : theme.colors.textSecondary,
          fontSize: 12,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}
