import { View } from 'react-native'
import { useTheme } from '../../theme/theme-context'

export function Card({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()

  return (
    <View
      style={{
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
      }}
    >
      {children}
    </View>
  )
}
