import { Pressable, Text } from 'react-native'
import { useTheme } from '../../theme/theme-context'
import { financeEditorial as fe } from '../../theme/finance-editorial'

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
        borderColor: 'transparent',
        backgroundColor: selected ? fe.ink : fe.white,
      }}
    >
      <Text
        style={{
          color: selected ? fe.white : fe.slate,
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
