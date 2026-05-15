import { Text, View } from 'react-native'
import { useTheme } from '../../theme/theme-context'
import type { KaswiseIconName } from '../icons/kaswise-icons'
import { Card } from './Card'
import { IconBubble, type IconBubbleTone } from './IconBubble'

type StatCardProps = {
  label: string
  value: string
  helper?: string
  icon: KaswiseIconName
  tone?: IconBubbleTone
}

export function StatCard({ label, value, helper, icon, tone = 'primary' }: StatCardProps) {
  const { theme } = useTheme()

  return (
    <Card variant="default">
      <View style={{ gap: theme.spacing.md }}>
        <IconBubble name={icon} tone={tone} size={36} />
        <View style={{ gap: 2 }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.support.fontSize,
              fontWeight: theme.typography.support.fontWeight,
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.metric.fontSize,
              fontWeight: theme.typography.metric.fontWeight,
            }}
          >
            {value}
          </Text>
          {helper ? (
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.typography.support.fontSize,
                fontWeight: theme.typography.support.fontWeight,
              }}
            >
              {helper}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  )
}
