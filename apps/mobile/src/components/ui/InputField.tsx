import { useState, type ComponentProps } from 'react'
import { Text, TextInput, View } from 'react-native'
import { useTheme } from '../../theme/theme-context'

type InputFieldProps = {
  label: string
  value: string
  onChangeText: (nextValue: string) => void
  placeholder?: string
  error?: string
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
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  autoCorrect,
  textContentType,
}: InputFieldProps) {
  const { theme } = useTheme()
  const [focused, setFocused] = useState(false)

  const fieldStyle = error
    ? {
        backgroundColor: theme.iconBubbles.danger.background,
        borderColor: theme.colors.danger,
        boxShadow: `0 0 0 3px ${theme.iconBubbles.danger.border}`,
      }
    : focused
      ? {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.brandPrimary,
          boxShadow: theme.mode === 'light' ? `0 0 0 3px rgba(101, 163, 13, 0.30)` : `0 0 0 3px rgba(163, 255, 18, 0.25)`,
        }
      : {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.borderBase,
          boxShadow: undefined,
        }

  return (
    <View style={{ gap: theme.spacing.xs + 2 }}>
      <Text
        style={{
          color: error
            ? theme.colors.danger
            : focused
              ? theme.mode === 'light'
                ? theme.colors.brandPrimaryDeep
                : theme.colors.brandPrimary
              : theme.colors.textMuted,
          fontSize: 10,
          fontWeight: theme.typography.fontWeight.extrabold,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          borderWidth: 1,
          borderRadius: theme.radius.md,
          color: theme.colors.textPrimary,
          fontSize: theme.typography.fontSize.md,
          fontFamily: theme.typography.fontFamily,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
          ...fieldStyle,
        }}
      />
      {error ? (
        <Text
          style={{
            color: theme.colors.danger,
            fontSize: theme.typography.support.fontSize,
            fontWeight: theme.typography.support.fontWeight,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  )
}
