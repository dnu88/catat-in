import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { financeEditorial } from '../../theme/finance-editorial'
import { useTheme } from '../../theme/theme-context'

type SettingsSectionProps = {
  title: string
  description?: string
  children: ReactNode
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  const { theme } = useTheme()

  return (
    <View style={{ backgroundColor: financeEditorial.paper, gap: theme.spacing.md }}>
      <View style={{ gap: theme.spacing.xs }}>
        <Text
          accessibilityRole="header"
          style={[theme.typography.sectionTitle, { color: financeEditorial.ink }]}
        >
          {title}
        </Text>
        {description ? (
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
            {description}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: theme.spacing.sm }}>{children}</View>
    </View>
  )
}
