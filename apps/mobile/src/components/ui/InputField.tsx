import type { ComponentProps } from 'react'
import { Text, TextInput, View } from 'react-native'
import { useTheme } from '../../theme/theme-context'

type InputFieldProps = {
  label: string
  value: string
  onChangeText: (nextValue: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  keyboardType?: ComponentProps<typeof TextInput>['keyboardType']
  autoCapitalize?: ComponentProps<typeof TextInput>['autoCapitalize']
  autoComplete?: ComponentProps<typeof TextInput>['autoComplete']
  autoCorrect?: boolean
  textContentType?: ComponentProps<typeof TextInput>['textContentType']
}

export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  autoCorrect,
  textContentType,
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
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        textContentType={textContentType}
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
