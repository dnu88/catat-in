import { financeEditorial as fe } from './finance-editorial'

export type ThemeMode = 'light' | 'dark'

const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 24,
  '2xl': 28,
  pill: 999,
} as const

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const

const typography = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  fontSize: {
    xs: 11, sm: 12, md: 14, lg: 16, xl: 18,
    '2xl': 20, '3xl': 24, '4xl': 28, '5xl': 32,
  },
  fontWeight: {
    normal: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800',
  },
  lineHeight: { tight: 1.2, normal: 1.4, relaxed: 1.6 },
  letterSpacing: { tight: -0.5, normal: 0, wide: 0.4 },
  support: { fontSize: 11, fontWeight: '800' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  metric: { fontSize: 20, fontWeight: '800' },
  screenTitle: { fontSize: 28, fontWeight: '700' },
  chip: { fontSize: 11, fontWeight: '800' },
} as const

const opacity = {
  0: 0, 10: 0.1, 14: 0.14, 15: 0.15, 18: 0.18, 20: 0.2,
  25: 0.25, 30: 0.3, 40: 0.4, 50: 0.5, 60: 0.6, 65: 0.65,
  70: 0.7, 72: 0.72, 75: 0.75, 80: 0.8, 90: 0.9, 100: 1,
} as const

const operationalColors = {
  bg: {
    base: fe.paper,
    surface: fe.white,
    card: fe.white,
    muted: '#FAFAF5',
    elevated: fe.white,
    tabBar: fe.white,
    header: fe.white,
  },
  text: {
    primary: fe.ink,
    secondary: fe.textSecondary,
    muted: fe.textMuted,
    dim: fe.textMuted,
    inverse: fe.white,
  },
  border: {
    soft: fe.line,
    base: 'rgba(6, 10, 28, 0.12)',
    strong: 'rgba(6, 10, 28, 0.18)',
  },
  brand: {
    primary: fe.blueBright,
    primaryDeep: fe.blueDeep,
    secondary: fe.blue,
    secondaryDeep: fe.navySurface,
  },
  status: {
    success: fe.successText,
    danger: fe.danger,
    warning: fe.warning,
    info: fe.info,
  },
  iconBubbles: {
    primary: { background: 'rgba(23, 139, 208, 0.12)', border: 'rgba(23, 139, 208, 0.26)', color: fe.blue },
    navy: { background: 'rgba(12, 78, 145, 0.12)', border: 'rgba(12, 78, 145, 0.25)', color: fe.blue },
    accent: { background: 'rgba(23, 139, 208, 0.12)', border: 'rgba(23, 139, 208, 0.25)', color: fe.blue },
    success: { background: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.24)', color: fe.successText },
    warning: { background: 'rgba(138, 75, 8, 0.12)', border: 'rgba(138, 75, 8, 0.24)', color: fe.warning },
    danger: { background: 'rgba(180, 35, 24, 0.10)', border: 'rgba(180, 35, 24, 0.24)', color: fe.danger },
    info: { background: 'rgba(7, 94, 145, 0.10)', border: 'rgba(7, 94, 145, 0.24)', color: fe.info },
  },
  glass: {
    background: 'rgba(255, 255, 255, 0.60)',
    border: fe.line,
  },
} as const

const operationalShadow = {
  sm: { shadowColor: fe.navy, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: fe.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  lg: { shadowColor: fe.navy, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.10, shadowRadius: 30, elevation: 8 },
  accent: { shadowColor: fe.blueBright, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 22, elevation: 12 },
} as const

const operationalTokenSet = {
  color: operationalColors,
  radius,
  spacing,
  typography,
  opacity,
  shadow: operationalShadow,
} as const

// Preference values stay API-compatible, but every operational mode resolves
// to the same light-first Finance Editorial token set.
export const kaswiseTokens = {
  light: operationalTokenSet,
  dark: operationalTokenSet,
} as const
