import { kaswiseTokens, type ThemeMode } from './tokens'

export function toMobileTheme(mode: ThemeMode) {
  const token = kaswiseTokens[mode]

  return {
    mode,
    colors: {
      background: token.color.bg.base,
      surface: token.color.bg.surface,
      card: token.color.bg.card,
      surfaceElevated: token.color.bg.elevated,
      mutedSurface: token.color.bg.muted,
      tabBarBackground: token.color.bg.tabBar,
      headerBackground: token.color.bg.header,
      textPrimary: token.color.text.primary,
      textSecondary: token.color.text.secondary,
      textMuted: token.color.text.muted,
      textInverse: token.color.text.inverse,
      borderSoft: token.color.border.soft,
      borderStrong: token.color.border.strong,
      borderActive: token.color.border.active,
      headerDivider: token.color.border.header,
      brandPrimary: token.color.brand.primary,
      brandAccent: token.color.brand.accent,
      success: token.color.status.success,
      danger: token.color.status.danger,
      warning: token.color.status.warning,
      info: token.color.status.info,
    },
    iconBubbles: {
      primary: { background: token.color.brand.primarySoft, color: token.color.brand.primary },
      success: { background: token.color.status.successSoft, color: token.color.status.success },
      danger: { background: token.color.status.dangerSoft, color: token.color.status.danger },
      warning: { background: token.color.status.warningSoft, color: token.color.status.warning },
      accent: { background: token.color.brand.accentSoft, color: token.color.brand.accent },
      info: { background: token.color.status.infoSoft, color: token.color.status.info },
    },
    shadows: token.shadow,
    radius: token.radius,
    spacing: token.spacing,
    typography: token.typography,
  }
}

export type MobileTheme = ReturnType<typeof toMobileTheme>
