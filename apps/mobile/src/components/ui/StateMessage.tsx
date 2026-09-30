import { Text } from 'react-native'
import { useTheme } from '../../theme/theme-context'

type StateMessageTone = 'error' | 'success' | 'warning' | 'info'

const TONE_LIVE_REGION: Record<StateMessageTone, 'polite' | 'assertive'> = {
	error: 'assertive',
	success: 'polite',
	warning: 'assertive',
	info: 'polite',
}

const TONE_ROLE: Record<StateMessageTone, 'alert' | 'text'> = {
	error: 'alert',
	success: 'text',
	warning: 'alert',
	info: 'text',
}

type StateMessageProps = {
  message: string
  tone?: StateMessageTone
}

export function StateMessage({ message, tone = 'info' }: StateMessageProps) {
  const { theme } = useTheme()

  const color = {
    error: theme.colors.danger,
    success: theme.colors.success,
    warning: theme.colors.warning,
    info: theme.colors.info,
  }[tone]

  const backgroundColor = {
    error: theme.iconBubbles.danger.background,
    success: theme.iconBubbles.success.background,
    warning: theme.iconBubbles.warning.background,
    info: theme.iconBubbles.info.background,
  }[tone]

  return (
    <Text
      accessibilityRole={TONE_ROLE[tone]}
      accessibilityLiveRegion={TONE_LIVE_REGION[tone]}
      style={{
        color,
        backgroundColor,
        borderWidth: 1,
        borderColor: color,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm + 2,
        fontSize: theme.typography.support.fontSize,
        fontWeight: '700',
        lineHeight: 18,
      }}
    >
      {message}
    </Text>
  )
}
