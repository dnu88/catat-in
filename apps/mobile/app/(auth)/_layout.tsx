import { Stack } from 'expo-router'

import { useTheme } from '../../src/theme/theme-context'
import { createKaswiseStackScreenOptions } from '../../src/navigation/transitions'

export default function AuthLayout() {
  const { theme } = useTheme()

  return (
    <Stack
      screenOptions={createKaswiseStackScreenOptions(theme.colors.background)}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="callback" />
    </Stack>
  )
}