import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useTheme } from '../../theme/theme-context'

type ScreenHeaderProps = {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  const { theme } = useTheme()

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: theme.spacing.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.screenTitle.fontSize,
            fontWeight: theme.typography.screenTitle.fontWeight,
            letterSpacing: -0.4,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  )
}
