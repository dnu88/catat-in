import { Text, View } from 'react-native'
import type { KaswiseIconName } from '../icons/kaswise-icons'
import { useTheme } from '../../theme/theme-context'
import { IconBubble, type IconBubbleTone } from './IconBubble'

type EmptyStateProps = {
  icon: KaswiseIconName
  title: string
  description: string
  tone?: IconBubbleTone
}

export function EmptyState({ icon, title, description, tone = 'accent' }: EmptyStateProps) {
  const { theme } = useTheme()

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        borderStyle: 'dashed',
        padding: theme.spacing['2xl'],
        alignItems: 'center',
        gap: theme.spacing.sm,
      }}
    >
      <IconBubble name={icon} tone={tone} size={56} />
      <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' }}>
        {title}
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontSize: 13,
          textAlign: 'center',
          lineHeight: 20,
        }}
      >
        {description}
      </Text>
    </View>
  )
}
