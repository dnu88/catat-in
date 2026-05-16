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
      textDim: token.color.text.muted,
      textInverse: token.color.text.inverse,
      borderSoft: token.color.border.soft,
      borderBase: token.color.border.soft,
      borderStrong: token.color.border.strong,
      brandPrimary: token.color.brand.primary,
      brandSecondary: token.color.brand.accent,
      brandPrimaryDeep: token.color.brand.primary,
      brandAccent: token.color.brand.accent,
      success: token.color.status.success,
      danger: token.color.status.danger,
      warning: token.color.status.warning,
      info: token.color.status.info,
      glass: {
        background: `rgba(255,255,255,${token.opacity[18]})`,
        border: `rgba(255,255,255,${token.opacity[25]})`,
      },
    },
    iconBubbles: {
      primary: { ...token.color.iconBubbles.primary, border: token.color.border.soft },
      success: { ...token.color.iconBubbles.success, border: token.color.border.soft },
      warning: { ...token.color.iconBubbles.warning, border: token.color.border.soft },
      danger: { ...token.color.iconBubbles.danger, border: token.color.border.soft },
      accent: { ...token.color.iconBubbles.accent, border: token.color.border.soft },
      info: { ...token.color.iconBubbles.info, border: token.color.border.soft },
    },
    radius: {
      ...token.radius,
      '2xl': token.spacing['2xl'],
    },
    spacing: token.spacing,
    typography: token.typography,
    opacity: token.opacity,
    shadow: {
      ...token.shadow,
      neon: {
        shadowColor: token.color.brand.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: token.opacity[30],
        shadowRadius: 12,
        elevation: 10,
      },
    },
  }
}

export type MobileTheme = ReturnType<typeof toMobileTheme>
