import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useTheme } from '../../theme/theme-context'

type SectionHeaderProps = {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  const { theme } = useTheme()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
      }}
    >
      <View style={{ flexShrink: 1, gap: 2 }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.sectionTitle.fontSize,
            fontWeight: theme.typography.sectionTitle.fontWeight,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.support.fontSize,
              fontWeight: theme.typography.support.fontWeight,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  )
}
