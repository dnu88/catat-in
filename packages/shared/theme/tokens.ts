// =============================================================
// Kaswise — Theme tokens (Dark Luxury system)
//
// Single source of truth for the web app theme.
// Dark luxury is the canonical brand direction (matte black +
// neon emerald). Light = "light luxury" (warm bone ground,
// white cards, neon CTAs with near-black text).
//
// Mirrors `Kaswise Design System/tokens.kaswise.ts` and
// `apps/mobile/src/theme/tokens.ts`.
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
    'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  fontFamilyMono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
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
} as const

export const kaswiseTokens = {
  // -------------------------------------------------------
  // DARK LUXURY — the brand-canonical theme
  // -------------------------------------------------------
  dark: {
    color: {
      bg: {
        base: '#141414', // Matte Black — app background
        surface: '#1E1E1A', // Surface Grey — cards / UI elements
        card: '#18181A', // Component card surface
        muted: '#242427', // Elevated — pills, modals, nested cards
        elevated: '#242427',
        deep: '#0A0A0A', // Hero, footer, nav, splash ground
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#E5E7EB',
        muted: '#9CA3AF',
        dim: '#6B7280',
        inverse: '#0A0A0A',
      },
      border: {
        soft: 'rgba(255, 255, 255, 0.06)',
        base: 'rgba(255, 255, 255, 0.10)',
        strong: 'rgba(255, 255, 255, 0.18)',
      },
      brand: {
        primary: '#A3FF12', // Neon Emerald
        primaryDeep: '#65A30D', // Darker neon (accents on light surfaces)
        secondary: '#4A80F0', // Soft Navy
        secondaryDeep: '#2A5DD0',
      },
      status: {
        success: '#A3FF12',
        danger: '#FF7B7B',
        warning: '#FFC06D',
        info: '#38BDF8',
      },
      iconBubbles: {
        primary: { background: 'rgba(163, 255, 18, 0.14)', border: 'rgba(163, 255, 18, 0.25)', color: '#A3FF12' },
        navy: { background: 'rgba(74, 128, 240, 0.14)', border: 'rgba(74, 128, 240, 0.30)', color: '#4A80F0' },
        success: { background: 'rgba(163, 255, 18, 0.10)', border: 'rgba(163, 255, 18, 0.20)', color: '#A3FF12' },
        warning: { background: 'rgba(255, 192, 109, 0.14)', border: 'rgba(255, 192, 109, 0.30)', color: '#FFC06D' },
        danger: { background: 'rgba(255, 123, 123, 0.14)', border: 'rgba(255, 123, 123, 0.30)', color: '#FF7B7B' },
        info: { background: 'rgba(56, 189, 248, 0.14)', border: 'rgba(56, 189, 248, 0.30)', color: '#38BDF8' },
      },
      glass: {
        background: 'rgba(255, 255, 255, 0.06)',
        border: 'rgba(255, 255, 255, 0.12)',
      },
    },
    radius,
    spacing,
    typography,
    shadow: {
      card: '0 1px 2px rgba(0, 0, 0, 0.30)',
      elevated: '0 10px 30px rgba(0, 0, 0, 0.45)',
      glowSoft: '0 0 22px rgba(163, 255, 18, 0.30)',
      glowStrong: '0 0 26px rgba(163, 255, 18, 0.45), 0 14px 36px rgba(163, 255, 18, 0.22)',
      focusRing: '0 0 0 3px rgba(163, 255, 18, 0.25)',
      focusRingDanger: '0 0 0 3px rgba(255, 123, 123, 0.20)',
    },
  },

  // -------------------------------------------------------
  // LIGHT LUXURY — warm bone counterpart, same accents
  // -------------------------------------------------------
  light: {
    color: {
      bg: {
        base: '#F5F5F0', // Warm bone ground
        surface: '#FFFFFF',
        card: '#FFFFFF',
        muted: '#FAFAF5',
        elevated: '#FFFFFF',
        deep: '#ECECE5',
      },
      text: {
        primary: '#0A0A0A',
        secondary: '#4B5563',
        muted: '#6B7280',
        dim: '#9CA3AF',
        inverse: '#FFFFFF',
      },
      border: {
        soft: 'rgba(10, 10, 10, 0.06)',
        base: 'rgba(10, 10, 10, 0.10)',
        strong: 'rgba(10, 10, 10, 0.16)',
      },
      brand: {
        primary: '#A3FF12',
        primaryDeep: '#65A30D',
        secondary: '#4A80F0',
        secondaryDeep: '#2A5DD0',
      },
      status: {
        success: '#65A30D', // shifted darker so it reads on white
        danger: '#DC2626',
        warning: '#B45309',
        info: '#0284C7',
      },
      iconBubbles: {
        primary: { background: 'rgba(163, 255, 18, 0.18)', border: 'rgba(101, 163, 13, 0.28)', color: '#65A30D' },
        navy: { background: 'rgba(74, 128, 240, 0.12)', border: 'rgba(42, 93, 208, 0.25)', color: '#2A5DD0' },
        success: { background: 'rgba(163, 255, 18, 0.18)', border: 'rgba(101, 163, 13, 0.28)', color: '#65A30D' },
        warning: { background: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.30)', color: '#B45309' },
        danger: { background: 'rgba(239, 68, 68, 0.10)', border: 'rgba(239, 68, 68, 0.25)', color: '#DC2626' },
        info: { background: 'rgba(14, 165, 233, 0.10)', border: 'rgba(14, 165, 233, 0.25)', color: '#0284C7' },
      },
      glass: {
        background: 'rgba(255, 255, 255, 0.60)',
        border: 'rgba(10, 10, 10, 0.08)',
      },
    },
    radius,
    spacing,
    typography,
    shadow: {
      card: '0 1px 2px rgba(10, 10, 10, 0.04), 0 4px 12px rgba(10, 10, 10, 0.06)',
      elevated: '0 8px 24px rgba(10, 10, 10, 0.08), 0 16px 36px rgba(10, 10, 10, 0.06)',
      glowSoft: '0 0 0 3px rgba(163, 255, 18, 0.30)',
      glowStrong: '0 12px 28px rgba(163, 255, 18, 0.35)',
      focusRing: '0 0 0 3px rgba(101, 163, 13, 0.30)',
      focusRingDanger: '0 0 0 3px rgba(220, 38, 38, 0.20)',
    },
  },
} as const
