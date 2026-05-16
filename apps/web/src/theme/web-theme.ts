import { kaswiseTokens, type ThemeMode } from '@kaswise/shared/theme'

export type ThemePreference = ThemeMode | 'system'

export function resolveSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function resolveThemeMode(preference: ThemePreference): ThemeMode {
  return preference === 'system' ? resolveSystemTheme() : preference
}

export function buildCssVariables(mode: ThemeMode): Record<string, string> {
  const token = kaswiseTokens[mode]

  return {
    '--ks-bg-base': token.color.bg.base,
    '--ks-bg-surface': token.color.bg.surface,
    '--ks-bg-card': token.color.bg.card,
    '--ks-bg-muted': token.color.bg.muted,
    '--ks-text-primary': token.color.text.primary,
    '--ks-text-secondary': token.color.text.secondary,
    '--ks-text-muted': token.color.text.muted,
    '--ks-text-inverse': token.color.text.inverse,
    '--ks-border-soft': token.color.border.soft,
    '--ks-border-strong': token.color.border.strong,
    '--ks-brand-primary': token.color.brand.primary,
    '--ks-brand-accent': token.color.brand.accent,
    '--ks-status-success': token.color.status.success,
    '--ks-status-danger': token.color.status.danger,
    '--ks-status-warning': token.color.status.warning,
    '--ks-status-info': token.color.status.info,
    '--ks-radius-sm': `${token.radius.sm}px`,
    '--ks-radius-md': `${token.radius.md}px`,
    '--ks-radius-lg': `${token.radius.lg}px`,
    '--ks-radius-pill': `${token.radius.pill}px`,
  }
}

export function applyWebTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const vars = buildCssVariables(mode)

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })

  root.dataset.theme = mode
}
