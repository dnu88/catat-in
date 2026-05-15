export type ThemeMode = 'light' | 'dark'

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32 } as const
const radius = { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 } as const
const typography = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  screenTitle: { fontSize: 28, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  support: { fontSize: 12, fontWeight: '600' },
  metric: { fontSize: 26, fontWeight: '800' },
  chip: { fontSize: 11, fontWeight: '700' },
  tab: { fontSize: 10, fontWeight: '700' },
} as const

export const kaswiseTokens = {
  light: {
    color: {
      bg: {
        base: '#F8FAFC',
        surface: '#FFFFFF',
        card: '#FFFFFF',
        elevated: '#FFFFFF',
        muted: '#F1F5F9',
        tabBar: '#FFFFFF',
        header: '#FFFFFF',
      },
      text: {
        primary: '#0F172A',
        secondary: '#475569',
        muted: '#64748B',
        inverse: '#FFFFFF',
      },
      border: {
        soft: '#E2E8F0',
        strong: '#CBD5E1',
        active: '#6366F1',
        header: '#E2E8F0',
      },
      brand: {
        primary: '#6366F1',
        primarySoft: 'rgba(99, 102, 241, 0.10)',
        accent: '#38BDF8',
        accentSoft: 'rgba(56, 189, 248, 0.12)',
      },
      status: {
        success: '#10B981',
        successSoft: 'rgba(16, 185, 129, 0.12)',
        danger: '#F43F5E',
        dangerSoft: 'rgba(244, 63, 94, 0.12)',
        warning: '#F59E0B',
        warningSoft: 'rgba(245, 158, 11, 0.14)',
        info: '#38BDF8',
        infoSoft: 'rgba(56, 189, 248, 0.12)',
      },
    },
    shadow: {
      card: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      },
    },
    radius,
    spacing,
    typography,
  },
  dark: {
    color: {
      bg: {
        base: '#0F172A',
        surface: '#1E293B',
        card: '#1E293B',
        elevated: '#243247',
        muted: '#162033',
        tabBar: 'rgba(15, 23, 42, 0.94)',
        header: '#0F172A',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#94A3B8',
        muted: '#64748B',
        inverse: '#FFFFFF',
      },
      border: {
        soft: '#334155',
        strong: '#475569',
        active: '#6366F1',
        header: '#1E293B',
      },
      brand: {
        primary: '#6366F1',
        primarySoft: 'rgba(99, 102, 241, 0.16)',
        accent: '#38BDF8',
        accentSoft: 'rgba(56, 189, 248, 0.16)',
      },
      status: {
        success: '#10B981',
        successSoft: 'rgba(16, 185, 129, 0.16)',
        danger: '#F43F5E',
        dangerSoft: 'rgba(244, 63, 94, 0.16)',
        warning: '#F59E0B',
        warningSoft: 'rgba(245, 158, 11, 0.16)',
        info: '#38BDF8',
        infoSoft: 'rgba(56, 189, 248, 0.16)',
      },
    },
    shadow: {
      card: {
        shadowColor: '#020617',
        shadowOpacity: 0.28,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 16 },
        elevation: 5,
      },
    },
    radius,
    spacing,
    typography,
  },
} as const
