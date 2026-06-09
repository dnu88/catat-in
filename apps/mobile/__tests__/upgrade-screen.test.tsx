import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import UpgradeScreen from "../app/upgrade";

jest.mock("../src/lib/supabase", () => ({ supabase: {} }));

const mockOpen = jest.fn(async (_url: string) => ({ type: "dismiss" as const }));
jest.mock("expo-web-browser", () => ({
  openBrowserAsync: (url: string) => mockOpen(url),
}));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  router: { back: () => mockBack(), push: jest.fn() },
}));

const mockCreate = jest.fn(async (_supabase: unknown, _plan: string) => ({
  redirect_url: "https://snap/x",
  amount: 29000,
  order_id: "kw-test-123",
}));

const mockGetStatus = jest.fn(async (_supabase: unknown, _orderId: string) => ({
  order_id: "kw-test-123",
  status: "pending",
}));

jest.mock("../src/services/billing", () => ({
  getPricing: jest.fn(async () => ({ tier: "promo", monthly: 29000, yearly: 249000 })),
  createPayment: (supabase: unknown, plan: string) => mockCreate(supabase, plan),
  getPaymentStatus: (supabase: unknown, orderId: string) => mockGetStatus(supabase, orderId),
}));

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaView: ({ children, style, ...props }: any) => (
      <View style={style} {...props}>
        {children}
      </View>
    ),
  };
});

// Mock useTheme with light theme tokens
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
        brandPrimary: "#3F6212",
        brandPrimaryDeep: "#3F6212",
        brandSecondary: "#4A80F0",
        brandAccent: "#4A80F0",
        buttonPrimaryBg: "#3F6212",
        buttonPrimaryText: "#FFFFFF",
        success: "#65A30D",
        danger: "#DC2626",
        warning: "#B45309",
        info: "#0284C7",
        glass: { background: "rgba(255,255,255,0.60)", border: "rgba(10,10,10,0.08)" },
      },
      iconBubbles: {
        primary: { background: "", border: "", color: "#65A30D" },
        navy: { background: "", border: "", color: "#2A5DD0" },
        accent: { background: "", border: "", color: "#2A5DD0" },
        success: { background: "", border: "", color: "#65A30D" },
        warning: { background: "", border: "", color: "#B45309" },
        danger: { background: "", border: "", color: "#DC2626" },
        info: { background: "", border: "", color: "#0284C7" },
      },
      radius: { sm: 10, md: 14, lg: 18, xl: 20, "2xl": 24, pill: 999 },
      spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, "2xl": 24, "3xl": 32 },
      typography: {
        support: { fontSize: 11, fontWeight: "800" },
        cardTitle: { fontSize: 16, fontWeight: "700" },
        sectionTitle: { fontSize: 15, fontWeight: "700" },
        metric: { fontSize: 20, fontWeight: "800" },
        screenTitle: { fontSize: 22, fontWeight: "800" },
        chip: { fontSize: 11, fontWeight: "800" },
      },
      opacity: {},
      shadow: {
        sm: { shadowColor: "#0A0A0A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
        md: { shadowColor: "#0A0A0A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
        lg: { shadowColor: "#0A0A0A", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.10, shadowRadius: 30, elevation: 8 },
        neon: { shadowColor: "#65A30D", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 22, elevation: 12 },
      },
    },
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockGetStatus.mockResolvedValue({ order_id: "kw-test-123", status: "pending" });
});

afterEach(() => {
  jest.useRealTimers();
});

test("shows promo prices and opens Snap on upgrade", async () => {
  const { getByText, getByTestId, unmount } = render(<UpgradeScreen />);
  await waitFor(() => getByText(/29.000/));

  fireEvent.press(getByTestId("upgrade-monthly"));

  await waitFor(() => expect(mockOpen).toHaveBeenCalledWith("https://snap/x"));
  unmount();
});

test("starts polling after browser dismiss", async () => {
  const { getByText, getByTestId } = render(<UpgradeScreen />);
  await waitFor(() => getByText(/29.000/));

  fireEvent.press(getByTestId("upgrade-monthly"));
  await waitFor(() => expect(mockOpen).toHaveBeenCalled());

  // After browser dismiss, polling should start
  await act(async () => {
    jest.advanceTimersByTime(100);
  });

  // Polling indicator should appear
  expect(getByTestId("upgrade-polling")).toBeTruthy();
});

test("shows success and navigates back when payment is paid", async () => {
  mockGetStatus.mockResolvedValue({ order_id: "kw-test-123", status: "paid" });

  const { getByText, getByTestId } = render(<UpgradeScreen />);
  await waitFor(() => getByText(/29.000/));

  fireEvent.press(getByTestId("upgrade-monthly"));
  await waitFor(() => expect(mockOpen).toHaveBeenCalled());

  // Advance timers to trigger polling
  await act(async () => {
    jest.advanceTimersByTime(2100);
  });

  await waitFor(() => expect(getByTestId("upgrade-success")).toBeTruthy());

  // Should navigate back after 1.5s
  await act(async () => {
    jest.advanceTimersByTime(1600);
  });

  expect(mockBack).toHaveBeenCalled();
});

test("shows retry button during polling", async () => {
  const { getByText, getByTestId } = render(<UpgradeScreen />);
  await waitFor(() => getByText(/29.000/));

  fireEvent.press(getByTestId("upgrade-monthly"));
  await waitFor(() => expect(mockOpen).toHaveBeenCalled());

  await act(async () => {
    jest.advanceTimersByTime(100);
  });

  expect(getByText("Saya sudah bayar")).toBeTruthy();
});
