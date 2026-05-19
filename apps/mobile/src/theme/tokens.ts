// =============================================================
// Kaswise — Theme tokens (Dark Luxury system)
//
// Drop this into `mobile/src/theme/tokens.ts` to replace the old
// indigo+emerald light system with the new dark luxury direction.
// Keeps the same shape (light / dark / radius / spacing /
// typography / opacity / shadow) so `toMobileTheme()` and the
// rest of the consumers in mobile/src/* keep working unchanged.
//
// Light variant = "light luxury" (warm bone ground, white cards,
// neon CTAs with near-black text). Dark variant = the matte-black
// brand surface.
// =============================================================

export type ThemeMode = 'light' | 'dark'

const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 20,
  '2xl': 24,
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
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  fontSize: {
    xs: 10, sm: 12, md: 14, lg: 16, xl: 18,
    '2xl': 20, '3xl': 24, '4xl': 28, '5xl': 32,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeight: { tight: 1.2, normal: 1.4, relaxed: 1.6 },
  letterSpacing: { tight: -0.5, normal: 0, wide: 0.4 },
  // Role-specific (kept for backward compatibility with the old tokens)
  support:      { fontSize: 11, fontWeight: '800' },
  cardTitle:    { fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  metric:       { fontSize: 20, fontWeight: '800' },
  screenTitle:  { fontSize: 22, fontWeight: '800' },
  chip:         { fontSize: 11, fontWeight: '800' },
} as const

const opacity = {
  0: 0,
  10: 0.1,
  14: 0.14,
  15: 0.15,
  18: 0.18,
  20: 0.2,
  25: 0.25,
  30: 0.3,
  40: 0.4,
  50: 0.5,
  60: 0.6,
  65: 0.65,
  70: 0.7,
  72: 0.72,
  75: 0.75,
  80: 0.8,
  90: 0.9,
  100: 1,
} as const

export const kaswiseTokens = {
  // -------------------------------------------------------
  // DARK LUXURY — the brand-canonical theme
  // -------------------------------------------------------
  dark: {
    color: {
      bg: {
        base:     '#141414',  // Matte Black — app background
        surface:  '#1E1E1A',  // Surface Grey — cards / UI elements
        card:     '#18181A',  // Component card surface
        muted:    '#242427',  // Elevated — pills, modals, nested cards
        elevated: '#242427',
        tabBar:   '#18181A',
        header:   '#0A0A0A',  // Deep Black — hero, footer, nav, splash
      },
      text: {
        primary:   '#FFFFFF',
        secondary: '#E5E7EB',
        muted:     '#9CA3AF',
        dim:       '#6B7280',
        inverse:   '#0A0A0A',
      },
      border: {
        soft:   'rgba(255, 255, 255, 0.06)',
        base:   'rgba(255, 255, 255, 0.10)',
        strong: 'rgba(255, 255, 255, 0.18)',
      },
      brand: {
        primary:        '#A3FF12',  // Neon Emerald
        primaryDeep:    '#65A30D',  // Darker neon (for accents on light surfaces)
        secondary:      '#4A80F0',  // Soft Navy
        secondaryDeep:  '#2A5DD0',
      },
      status: {
        success: '#A3FF12',
        danger:  '#FF7B7B',
        warning: '#FFC06D',
        info:    '#38BDF8',
      },
      iconBubbles: {
        primary: { background: 'rgba(163, 255, 18, 0.14)', border: 'rgba(163, 255, 18, 0.25)', color: '#A3FF12' },
        navy:    { background: 'rgba(74, 128, 240, 0.14)', border: 'rgba(74, 128, 240, 0.30)', color: '#4A80F0' },
        accent:  { background: 'rgba(74, 128, 240, 0.14)', border: 'rgba(74, 128, 240, 0.30)', color: '#4A80F0' },
        success: { background: 'rgba(163, 255, 18, 0.10)', border: 'rgba(163, 255, 18, 0.20)', color: '#A3FF12' },
        warning: { background: 'rgba(255, 192, 109, 0.14)', border: 'rgba(255, 192, 109, 0.30)', color: '#FFC06D' },
        danger:  { background: 'rgba(255, 123, 123, 0.14)', border: 'rgba(255, 123, 123, 0.30)', color: '#FF7B7B' },
        info:    { background: 'rgba(56, 189, 248, 0.14)',  border: 'rgba(56, 189, 248, 0.30)',  color: '#38BDF8' },
      },
      glass: {
        background: 'rgba(255, 255, 255, 0.06)',
        border:     'rgba(255, 255, 255, 0.12)',
      },
    },
    radius,
    spacing,
    typography,
    opacity,
    shadow: {
      sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.30, shadowRadius: 2,  elevation: 2 },
      md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 12, elevation: 6 },
      lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 30, elevation: 12 },
      // Neon glow — apply to the FAB, primary buttons on press, and CTAs
      neon: {
        shadowColor: '#A3FF12', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45, shadowRadius: 22, elevation: 16,
      },
    },
  },

  // -------------------------------------------------------
  // LIGHT LUXURY — warm bone counterpart, same accents
  // -------------------------------------------------------
  light: {
    color: {
      bg: {
        base:     '#F5F5F0',  // Warm bone ground
        surface:  '#FFFFFF',
        card:     '#FFFFFF',
        muted:    '#FAFAF5',
        elevated: '#FFFFFF',
        tabBar:   '#FFFFFF',
        header:   '#FFFFFF',
      },
      text: {
        primary:   '#0A0A0A',
        secondary: '#4B5563',
        muted:     '#6B7280',
        dim:       '#9CA3AF',
        inverse:   '#FFFFFF',
      },
      border: {
        soft:   'rgba(10, 10, 10, 0.06)',
        base:   'rgba(10, 10, 10, 0.10)',
        strong: 'rgba(10, 10, 10, 0.16)',
      },
      brand: {
        primary:        '#65A30D',
        primaryDeep:    '#65A30D',
        secondary:      '#4A80F0',
        secondaryDeep:  '#2A5DD0',
      },
      status: {
        success: '#65A30D',   // shifted darker so it reads on white
        danger:  '#DC2626',
        warning: '#B45309',
        info:    '#0284C7',
      },
      iconBubbles: {
        primary: { background: 'rgba(101, 163, 13, 0.16)', border: 'rgba(101, 163, 13, 0.28)', color: '#65A30D' },
        navy:    { background: 'rgba(74, 128, 240, 0.12)', border: 'rgba(42, 93, 208, 0.25)',  color: '#2A5DD0' },
        accent:  { background: 'rgba(74, 128, 240, 0.12)', border: 'rgba(42, 93, 208, 0.25)',  color: '#2A5DD0' },
        success: { background: 'rgba(101, 163, 13, 0.16)', border: 'rgba(101, 163, 13, 0.28)', color: '#65A30D' },
        warning: { background: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.30)', color: '#B45309' },
        danger:  { background: 'rgba(239, 68, 68, 0.10)',  border: 'rgba(239, 68, 68, 0.25)',  color: '#DC2626' },
        info:    { background: 'rgba(14, 165, 233, 0.10)', border: 'rgba(14, 165, 233, 0.25)', color: '#0284C7' },
      },
      glass: {
        background: 'rgba(255, 255, 255, 0.60)',
        border:     'rgba(10, 10, 10, 0.08)',
      },
    },
    radius,
    spacing,
    typography,
    opacity,
    shadow: {
      sm: { shadowColor: '#0A0A0A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2,  elevation: 1 },
      md: { shadowColor: '#0A0A0A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
      lg: { shadowColor: '#0A0A0A', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.10, shadowRadius: 30, elevation: 8 },
      // Light theme glow follows the Bottom Tab + FAB green instead of neon.
      neon: {
        shadowColor: '#65A30D', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35, shadowRadius: 22, elevation: 12,
      },
    },
  },
} as const
