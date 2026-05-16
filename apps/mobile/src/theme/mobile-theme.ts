import { kaswiseTokens, type ThemeMode } from './tokens'

export function toMobileTheme(mode: ThemeMode) {
  const token = kaswiseTokens[mode]

  return {
    mode,
    colors: {
      background: token.color.bg.base,
      surface: token.color.bg.surface,
      card: token.color.bg.card,
      mutedSurface: token.color.bg.muted,
      surfaceElevated: token.color.bg.elevated,
      tabBarBackground: token.color.bg.tabBar,
      headerBackground: token.color.bg.header,
      headerDivider: token.color.border.soft,
      textPrimary: token.color.text.primary,
      textSecondary: token.color.text.secondary,
      textMuted: token.color.text.muted,
      textDim: token.color.text.dim,
      textInverse: token.color.text.inverse,
      borderSoft: token.color.border.soft,
      borderBase: token.color.border.base,
      borderStrong: token.color.border.strong,
      brandPrimary: token.color.brand.primary,
      brandSecondary: token.color.brand.secondary,
      brandPrimaryDeep: token.color.brand.primaryDeep,
      brandAccent: token.color.brand.secondary,
      success: token.color.status.success,
      danger: token.color.status.danger,
      warning: token.color.status.warning,
      info: token.color.status.info,
      glass: token.color.glass,
    },
    iconBubbles: {
      primary: token.color.iconBubbles.primary,
      navy: token.color.iconBubbles.navy,
      accent: token.color.iconBubbles.accent,
      success: token.color.iconBubbles.success,
      warning: token.color.iconBubbles.warning,
      danger: token.color.iconBubbles.danger,
      info: token.color.iconBubbles.info,
    },
    radius: token.radius,
    spacing: token.spacing,
    typography: token.typography,
    opacity: token.opacity,
    shadow: token.shadow,
  }
}

export type MobileTheme = ReturnType<typeof toMobileTheme>

