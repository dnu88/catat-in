import { Pressable, StyleSheet, Text, View } from 'react-native'
import { financeEditorial } from '../../theme/finance-editorial'
import { useTheme } from '../../theme/theme-context'
import type { KaswiseIconName } from '../icons/kaswise-icons'
import { IconBubble } from '../ui/IconBubble'

type SettingsNavigationRowProps = {
  testID: string
  icon: KaswiseIconName
  title: string
  description?: string
  badge?: string
  onPress: () => void
}

export function SettingsNavigationRow({
  testID, icon, title, description, badge, onPress,
}: SettingsNavigationRowProps) {
  const { theme } = useTheme()

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={description ? `${title}, ${description}` : title}
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: financeEditorial.white,
          borderColor: theme.colors.borderSoft,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        },
      ]}
    >
      <IconBubble name={icon} tone="primary" size={40} />
      <View style={styles.copy}>
        <Text
          numberOfLines={1}
          style={[theme.typography.cardTitle, { color: financeEditorial.ink }]}
        >
          {title}
        </Text>
        {description ? (
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
              marginTop: theme.spacing.xs,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <Text
          numberOfLines={1}
          style={[
            theme.typography.chip,
            {
              color: financeEditorial.blue,
              backgroundColor: financeEditorial.paper,
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              flexShrink: 1,
            },
          ]}
        >
          {badge}
        </Text>
      ) : null}
      <Text
        accessible={false}
        style={{ color: theme.colors.textMuted, fontSize: theme.typography.fontSize['3xl'] }}
      >
        ›
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  copy: { flex: 1, minWidth: 0 },
})
