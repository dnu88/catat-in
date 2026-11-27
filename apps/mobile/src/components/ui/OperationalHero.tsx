import type { ReactNode } from 'react'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { financeEditorial as fe } from '../../theme/finance-editorial'

export type OperationalHeroVariant = 'fullBleed' | 'compact' | 'analytics'

type OperationalHeroProps = {
  children: ReactNode
  variant?: OperationalHeroVariant
  style?: StyleProp<ViewStyle>
  testID?: string
}

const variantStyles = StyleSheet.create({
  fullBleed: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  compact: {
    minHeight: 124,
    padding: 20,
  },
  analytics: {
    marginHorizontal: -20,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },
})

export function OperationalHero({
  children,
  variant = 'compact',
  style,
  testID,
}: OperationalHeroProps) {
  return (
    <LinearGradient
      testID={testID}
      colors={[fe.navySurface, fe.blueDeep, fe.blueBright]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.base, variantStyles[variant], style]}
    >
      {children}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  base: {
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
    overflow: 'hidden',
    shadowColor: fe.navy,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
})
