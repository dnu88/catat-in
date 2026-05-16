import { useMemo } from 'react'
import { useWindowDimensions } from 'react-native'
import { useTheme } from '../theme/theme-context'
import { createMobileStyles } from './mobileStyles'

export function useMobileStyles() {
  const { theme } = useTheme()
  const { width } = useWindowDimensions()
  const styles = useMemo(() => createMobileStyles(theme, width), [theme, width])
  return styles
}