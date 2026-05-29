import { View } from 'react-native'
import { useTheme } from '../../theme/theme-context'
import { KaswiseIcon, type KaswiseIconName } from '../icons/kaswise-icons'

export type IconBubbleTone =
  | 'primary'
  | 'navy'
  | 'accent'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral'

type IconBubbleProps = {
  name: KaswiseIconName
  tone?: IconBubbleTone
  size?: number
  color?: string
  backgroundColor?: string
  borderColor?: string
}

function withAlpha(color: string, alpha: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color
}

export function IconBubble({
  name,
  tone = 'primary',
  size = 42,
  color,
  backgroundColor,
  borderColor,
}: IconBubbleProps) {
  const { theme } = useTheme()

  let bubble
  if (tone === 'neutral') {
    bubble = {
      background: theme.colors.glass.background,
      border: theme.colors.glass.border,
      color: theme.colors.textMuted,
    }
  } else if (tone === 'accent') {
    bubble = theme.iconBubbles.navy
  } else {
    bubble = theme.iconBubbles[tone]
  }

  const resolvedColor = color ?? bubble.color
  const resolvedBackground = backgroundColor ?? (color ? withAlpha(color, '18') : bubble.background)
  const resolvedBorder = borderColor ?? (color ? withAlpha(color, '40') : bubble.border)
  const iconSize = Math.round(size * 0.5)

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: resolvedBorder,
        backgroundColor: resolvedBackground,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <KaswiseIcon name={name} color={resolvedColor} size={iconSize} weight="bold" />
    </View>
  )
}
