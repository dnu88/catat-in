import { fireEvent, render } from "@testing-library/react-native";

import ForgotPasswordScreen from "../app/(auth)/forgot-password";

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;

jest.mock("expo-router", () => {
  const { Text } = require("react-native");
  return {
    router: {
      back: () => mockBack(),
      replace: (href: string) => mockReplace(href),
      canGoBack: () => mockCanGoBack,
    },
    Link: ({ children }: any) => <Text>{children}</Text>,
  };
});

jest.mock("../src/lib/supabase", () => ({
  useSupabase: () => ({
    supabase: {
      auth: {
        resetPasswordForEmail: jest.fn(async () => ({ error: null })),
      },
    },
  }),
}));

jest.mock("../src/i18n/i18n-context", () => ({
  useI18n: () => ({ t: (key: string) => key, language: "id" }),
}));

jest.mock("../src/theme/theme-context", () => ({
  useTheme: () => ({
    theme: {
      mode: "light",
      colors: {
        background: "#F5F5F0",
        surface: "#FFFFFF",
        card: "#FFFFFF",
        mutedSurface: "#FAFAF5",
        surfaceElevated: "#FFFFFF",
        textPrimary: "#0A0A0A",
        textSecondary: "#4B5563",
        textMuted: "#6B7280",
        textDim: "#6B7280",
        textInverse: "#FFFFFF",
        borderSoft: "rgba(10,10,10,0.06)",
        borderBase: "rgba(10,10,10,0.10)",
        borderStrong: "rgba(10,10,10,0.16)",
        brandPrimary: "#178BD0",
        brandPrimaryDeep: "#0A3D78",
        brandSecondary: "#4A80F0",
        brandAccent: "#4A80F0",
        buttonPrimaryBg: "#0A3D78",
        buttonPrimaryText: "#FFFFFF",
        success: "#22C55E",
        danger: "#DC2626",
        warning: "#B45309",
        info: "#0284C7",
        glass: {
          background: "rgba(255,255,255,0.60)",
          border: "rgba(10,10,10,0.08)",
        },
      },
      iconBubbles: {
        primary: { background: "", border: "", color: "#0C4E91" },
        navy: { background: "", border: "", color: "#2A5DD0" },
        accent: { background: "", border: "", color: "#2A5DD0" },
        success: { background: "", border: "", color: "#22C55E" },
        warning: { background: "", border: "", color: "#B45309" },
        danger: { background: "", border: "", color: "#DC2626" },
        info: { background: "", border: "", color: "#0284C7" },
      },
      radius: { sm: 10, md: 14, lg: 18, xl: 20, "2xl": 24, pill: 999 },
      spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, "2xl": 24, "3xl": 32 },
      typography: {
        fontFamily: "System",
        fontSize: { sm: 12, md: 14, lg: 16, xl: 18, "2xl": 22 },
        fontWeight: {
          regular: "400",
          medium: "500",
          semibold: "600",
          bold: "700",
          extrabold: "800",
          black: "900",
        },
        support: { fontSize: 11, fontWeight: "800" },
        cardTitle: { fontSize: 16, fontWeight: "700" },
        sectionTitle: { fontSize: 15, fontWeight: "700" },
        metric: { fontSize: 20, fontWeight: "800" },
        screenTitle: { fontSize: 22, fontWeight: "800" },
        chip: { fontSize: 11, fontWeight: "800" },
      },
      opacity: {},
      shadow: {
        sm: {
          shadowColor: "#0A0A0A",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 2,
          elevation: 1,
        },
        md: {
          shadowColor: "#0A0A0A",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3,
        },
        lg: {
          shadowColor: "#0A0A0A",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.1,
          shadowRadius: 30,
          elevation: 8,
        },
      },
    },
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack = true;
});

test("exits through the auth entry when forgot-password opens cold", () => {
  mockCanGoBack = false;
  const { getByLabelText } = render(<ForgotPasswordScreen />);

  fireEvent.press(getByLabelText("back"));

  expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
  expect(mockBack).not.toHaveBeenCalled();
});

test("uses history back for forgot-password when history exists", () => {
  mockCanGoBack = true;
  const { getByLabelText } = render(<ForgotPasswordScreen />);

  fireEvent.press(getByLabelText("back"));

  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
});
