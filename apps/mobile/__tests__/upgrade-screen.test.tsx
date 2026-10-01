import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import UpgradeScreen from "../app/upgrade";

const mockGetStoreReleaseConfig = jest.fn((_platformOS?: string) => ({
  isNativeStoreBuildCandidate: false,
  allowNativePremiumPurchase: true,
}));

jest.mock("../src/config/store-release", () => ({
  getStoreReleaseConfig: (platformOS?: string) => mockGetStoreReleaseConfig(platformOS),
}));

jest.mock("../src/lib/supabase", () => ({ supabase: {} }));

const mockOpen = jest.fn(async (_url: string) => ({ type: "dismiss" as const }));
jest.mock("expo-web-browser", () => ({
  openBrowserAsync: (url: string) => mockOpen(url),
}));

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock("expo-router", () => ({
  router: {
    back: () => mockBack(),
    replace: (href: string) => mockReplace(href),
    canGoBack: () => mockCanGoBack,
    push: jest.fn(),
  },
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
        glass: { background: "rgba(255,255,255,0.60)", border: "rgba(10,10,10,0.08)" },
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
        accent: { shadowColor: "#178BD0", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 22, elevation: 12 },
      },
    },
  }),
}));

jest.mock("../src/i18n/i18n-context", () => ({
  useI18n: () => ({ language: "id" }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockCanGoBack = true;
  mockGetStoreReleaseConfig.mockReturnValue({
    isNativeStoreBuildCandidate: false,
    allowNativePremiumPurchase: true,
  });
  mockGetStatus.mockResolvedValue({ order_id: "kw-test-123", status: "pending" });
});

afterEach(() => {
  jest.useRealTimers();
});

test("shows unavailable native message when premium purchase is disabled for store builds", async () => {
  mockGetStoreReleaseConfig.mockReturnValue({
    isNativeStoreBuildCandidate: true,
    allowNativePremiumPurchase: false,
  });

  const { getByText, queryByTestId } = render(<UpgradeScreen />);
  await waitFor(() => getByText("Premium belum tersedia di aplikasi ini."));

  expect(getByText("Premium belum tersedia di aplikasi ini.")).toBeTruthy();
  expect(getByText("Gunakan Kaswise web/PWA untuk upgrade sementara.")).toBeTruthy();
  expect(queryByTestId("upgrade-monthly")).toBeNull();
  expect(queryByTestId("upgrade-yearly")).toBeNull();
  expect(mockCreate).not.toHaveBeenCalled();
  expect(mockOpen).not.toHaveBeenCalled();
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

test("falls back to settings when upgrade opens cold without history", async () => {
  mockCanGoBack = false;
  mockGetStatus.mockResolvedValue({ order_id: "kw-test-123", status: "paid" });

  const { getByText, getByTestId } = render(<UpgradeScreen />);
  await waitFor(() => getByText(/29.000/));

  fireEvent.press(getByTestId("upgrade-monthly"));
  await waitFor(() => expect(mockOpen).toHaveBeenCalled());

  await act(async () => {
    jest.advanceTimersByTime(2100);
  });

  await waitFor(() => expect(getByTestId("upgrade-success")).toBeTruthy());

  await act(async () => {
    jest.advanceTimersByTime(1600);
  });

  expect(mockReplace).toHaveBeenCalledWith("/(tabs)/settings");
  expect(mockBack).not.toHaveBeenCalled();
});

test("uses history back for upgrade when history exists", async () => {
  mockCanGoBack = true;
  mockGetStatus.mockResolvedValue({ order_id: "kw-test-123", status: "paid" });

  const { getByText, getByTestId } = render(<UpgradeScreen />);
  await waitFor(() => getByText(/29.000/));

  fireEvent.press(getByTestId("upgrade-monthly"));
  await waitFor(() => expect(mockOpen).toHaveBeenCalled());

  await act(async () => {
    jest.advanceTimersByTime(2100);
  });

  await waitFor(() => expect(getByTestId("upgrade-success")).toBeTruthy());

  await act(async () => {
    jest.advanceTimersByTime(1600);
  });

  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
});

test("retry-check drives the poll path to paid and falls back to settings without history", async () => {
  mockCanGoBack = false;
  mockGetStatus.mockResolvedValue({ order_id: "kw-test-123", status: "paid" });

  const { getByText, getByTestId } = render(<UpgradeScreen />);
  await waitFor(() => getByText(/29.000/));

  fireEvent.press(getByTestId("upgrade-monthly"));
  await waitFor(() => expect(mockOpen).toHaveBeenCalled());

  // The polling interval has not ticked yet, so whatever reports "paid" below
  // has to come from pressing the retry check itself.
  await act(async () => {
    jest.advanceTimersByTime(100);
  });
  expect(mockGetStatus).not.toHaveBeenCalled();

  fireEvent.press(getByTestId("upgrade-retry-check"));
  await waitFor(() => expect(getByTestId("upgrade-success")).toBeTruthy());

  await act(async () => {
    jest.advanceTimersByTime(1600);
  });

  expect(mockReplace).toHaveBeenCalledWith("/(tabs)/settings");
  expect(mockBack).not.toHaveBeenCalled();
});

test("retry-check drives the poll path to paid and uses history back when it exists", async () => {
  mockCanGoBack = true;
  mockGetStatus.mockResolvedValue({ order_id: "kw-test-123", status: "paid" });

  const { getByText, getByTestId } = render(<UpgradeScreen />);
  await waitFor(() => getByText(/29.000/));

  fireEvent.press(getByTestId("upgrade-monthly"));
  await waitFor(() => expect(mockOpen).toHaveBeenCalled());

  await act(async () => {
    jest.advanceTimersByTime(100);
  });
  expect(mockGetStatus).not.toHaveBeenCalled();

  fireEvent.press(getByTestId("upgrade-retry-check"));
  await waitFor(() => expect(getByTestId("upgrade-success")).toBeTruthy());

  await act(async () => {
    jest.advanceTimersByTime(1600);
  });

  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
});

// Leaving during the 1500 ms paid-exit delay must not navigate afterwards:
// with history the stale timer pops an extra level, and without history the
// replace branch would teleport the user to /(tabs)/settings.
test.each([true, false])(
  "performs no navigation when the screen unmounts during the paid exit delay (canGoBack: %s)",
  async (canGoBack) => {
    mockCanGoBack = canGoBack;
    mockGetStatus.mockResolvedValue({ order_id: "kw-test-123", status: "paid" });

    const { getByText, getByTestId, unmount } = render(<UpgradeScreen />);
    await waitFor(() => getByText(/29.000/));

    fireEvent.press(getByTestId("upgrade-monthly"));
    await waitFor(() => expect(mockOpen).toHaveBeenCalled());

    await act(async () => {
      jest.advanceTimersByTime(2100);
    });
    await waitFor(() => expect(getByTestId("upgrade-success")).toBeTruthy());

    unmount();

    await act(async () => {
      jest.advanceTimersByTime(1600);
    });

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  },
);

test("performs exactly one navigation when the user stays on the paid screen", async () => {
  mockCanGoBack = true;
  mockGetStatus.mockResolvedValue({ order_id: "kw-test-123", status: "paid" });

  const { getByText, getByTestId } = render(<UpgradeScreen />);
  await waitFor(() => getByText(/29.000/));

  fireEvent.press(getByTestId("upgrade-monthly"));
  await waitFor(() => expect(mockOpen).toHaveBeenCalled());

  await act(async () => {
    jest.advanceTimersByTime(2100);
  });
  await waitFor(() => expect(getByTestId("upgrade-success")).toBeTruthy());

  await act(async () => {
    jest.advanceTimersByTime(1600);
  });

  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();

  // The exit timer must not stay armed behind the paid screen.
  await act(async () => {
    jest.advanceTimersByTime(60000);
  });
  expect(mockBack).toHaveBeenCalledTimes(1);
});
