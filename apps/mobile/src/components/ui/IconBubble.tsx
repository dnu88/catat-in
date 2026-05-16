import { View } from 'react-native'
import { useTheme } from '../../theme/theme-context'
import { KaswiseIcon, type KaswiseIconName } from '../icons/kaswise-icons'

export type IconBubbleTone =
  | 'primary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'accent'
  | 'info'

type IconBubbleProps = {
  name: KaswiseIconName
  tone?: IconBubbleTone
  size?: number
}

export function IconBubble({ name, tone = 'primary', size = 42 }: IconBubbleProps) {
  const { theme } = useTheme()
  const bubble = theme.iconBubbles[tone]
  const iconSize = Math.round(size * 0.5)

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: bubble.border,
        backgroundColor: bubble.background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <KaswiseIcon name={name} color={bubble.color} size={iconSize} weight="bold" />
    </View>
  )
}
