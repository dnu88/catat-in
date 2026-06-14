import { render, screen } from "@testing-library/react-native";

import PrivacyPage from "../app/privacy";
import AccountDeletionPage from "../app/account-deletion";

jest.mock("../src/theme/theme-context", () => ({
  useTheme: () => ({
    theme: {
      mode: "light",
      radius: { xl: 24, pill: 999 },
      colors: {
        background: "#F5F5F0",
        surface: "#FFFFFF",
        borderSoft: "#E5E7EB",
        brandPrimary: "#65A30D",
        brandPrimaryDeep: "#3F6212",
        textPrimary: "#111827",
        textSecondary: "#4B5563",
        textMuted: "#6B7280",
        textInverse: "#FFFFFF",
      },
    },
  }),
}));

jest.mock("expo-linking", () => ({
  openURL: jest.fn(),
}));

describe("public legal mobile routes", () => {
  it("renders the privacy route content", () => {
    render(<PrivacyPage />);
    expect(screen.getByTestId("legal-screen-privacy")).toBeTruthy();
    expect(screen.getByRole("header", { name: /Kebijakan Privasi Kaswise/i })).toBeTruthy();
  });

  it("renders the account deletion route content", () => {
    render(<AccountDeletionPage />);
    expect(screen.getByTestId("legal-screen-accountDeletion")).toBeTruthy();
    expect(screen.getByRole("header", { name: /Penghapusan Akun Kaswise/i })).toBeTruthy();
    expect(screen.getByText(/hingga 30 hari/i)).toBeTruthy();
  });
});
