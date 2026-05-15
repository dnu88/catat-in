import { Text, View } from 'react-native'
import { useTheme } from '../../theme/theme-context'

type StatusBadgeProps = {
  label: string
  color: string
}

export function StatusBadge({ label, color }: StatusBadgeProps) {
  const { theme } = useTheme()

  return (
    <View
      style={{
        borderWidth: 1,
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.md - 2,
        paddingVertical: theme.spacing.xs,
        backgroundColor: `${color}15`,
        borderColor: `${color}40`,
      }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  )
}
