import { kaswiseTokens, type ThemeMode } from '@kaswise/shared/theme'

export function toMobileTheme(mode: ThemeMode) {
  const token = kaswiseTokens[mode]

  return {
    mode,
    colors: {
      background: token.color.bg.base,
      surface: token.color.bg.surface,
      card: token.color.bg.card,
      mutedSurface: token.color.bg.muted,
      textPrimary: token.color.text.primary,
      textSecondary: token.color.text.secondary,
      textMuted: token.color.text.muted,
      textInverse: token.color.text.inverse,
      borderSoft: token.color.border.soft,
      borderStrong: token.color.border.strong,
      brandPrimary: token.color.brand.primary,
      brandAccent: token.color.brand.accent,
      success: token.color.status.success,
      danger: token.color.status.danger,
      warning: token.color.status.warning,
      info: token.color.status.info,
    },
    radius: token.radius,
    spacing: token.spacing,
    typography: token.typography,
  }
}

export type MobileTheme = ReturnType<typeof toMobileTheme>
