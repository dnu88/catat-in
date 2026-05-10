export type ThemeMode = 'light' | 'dark'

export const kaswiseTokens = {
  light: {
    color: {
      bg: {
        base: '#FFFFFF',
        surface: '#F5F5F5',
        card: '#FFFFFF',
        muted: '#F8FAFD',
      },
      text: {
        primary: '#28303F',
        secondary: '#4C5A78',
        muted: '#8A95AD',
        inverse: '#FFFFFF',
      },
      border: {
        soft: '#E2E7F2',
        strong: '#CBD5E3',
      },
      brand: {
        primary: '#47D6A3',
        accent: '#41C093',
      },
      status: {
        success: '#4CAF50',
        danger: '#FF7B7B',
        warning: '#FFC06D',
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
        base: '#1A1A2E',
        surface: '#252538',
        card: '#252538',
        muted: '#2E2E42',
      },
      text: {
        primary: '#F5F7FF',
        secondary: '#C7CEE0',
        muted: '#99A3BA',
        inverse: '#1A1A2E',
      },
      border: {
        soft: '#34344A',
        strong: '#4A4A64',
      },
      brand: {
        primary: '#5EE8B0',
        accent: '#47D6A3',
      },
      status: {
        success: '#4CAF50',
        danger: '#FF7060',
        warning: '#FFC06D',
        info: '#5EE8B0',
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
