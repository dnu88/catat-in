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
    <View style={{ gap: 6 }}>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: 12,
          fontWeight: '600',
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
          borderWidth: 1,
          borderColor: theme.colors.borderStrong,
          borderRadius: theme.radius.md,
          color: theme.colors.textPrimary,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm + 2,
        }}
      />
    </View>
  )
}
