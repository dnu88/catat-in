import { Text, TextInput, View } from 'react-native'
import { useTheme } from '../../theme/theme-context'

type InputFieldProps = {
  label: string
  value: string
  onChangeText: (nextValue: string) => void
  placeholder?: string
}

export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
}: InputFieldProps) {
  const { theme } = useTheme()

  return (
    <View style={{ gap: theme.spacing.xs + 2 }}>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.typography.support.fontSize,
          fontWeight: theme.typography.support.fontWeight,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        style={{
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.borderSoft,
          borderRadius: theme.radius.md,
          color: theme.colors.textPrimary,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm + 2,
        }}
      />
    </View>
  )
}
