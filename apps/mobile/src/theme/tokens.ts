export type ThemeMode = 'light' | 'dark'

export const kaswiseTokens = {
  light: {
    color: {
      bg: {
        base: '#F3F5FA',
        surface: '#FFFFFF',
        card: '#FFFFFF',
        muted: '#F8FAFD',
      },
      text: {
        primary: '#0C1A3A',
        secondary: '#4C5A78',
        muted: '#8A95AD',
        inverse: '#FFFFFF',
      },
      border: {
        soft: '#E2E7F2',
        strong: '#CBD5E3',
      },
      brand: {
        primary: '#4F46E5',
        accent: '#10B981',
      },
      status: {
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#38BDF8',
      },
    },
    radius: {
      sm: 10,
      md: 14,
      lg: 18,
      pill: 999,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      '2xl': 24,
      '3xl': 32,
    },
    typography: {
      fontFamily:
        'Inter, Poppins, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    },
  },
  dark: {
    color: {
      bg: {
        base: '#050C1B',
        surface: '#08132A',
        card: '#0A1730',
        muted: '#0E1E3D',
      },
      text: {
        primary: '#F8FAFF',
        secondary: '#B4C0DA',
        muted: '#7D8CA9',
        inverse: '#050C1B',
      },
      border: {
        soft: '#1A2A4C',
        strong: '#223861',
      },
      brand: {
        primary: '#4F46E5',
        accent: '#10B981',
      },
      status: {
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#38BDF8',
      },
    },
    radius: {
      sm: 10,
      md: 14,
      lg: 18,
      pill: 999,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      '2xl': 24,
      '3xl': 32,
    },
    typography: {
      fontFamily:
        'Inter, Poppins, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    },
  },
} as const
