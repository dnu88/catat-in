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

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockGetStatus.mockResolvedValue({ order_id: "kw-test-123", status: "pending" });
});

afterEach(() => {
  jest.useRealTimers();
});

test("shows promo prices and opens Snap on upgrade", async () => {
  const { getByText, getByTestId } = render(<UpgradeScreen />);
  await waitFor(() => getByText(/29.000/));
  fireEvent.press(getByTestId("upgrade-monthly"));
  await waitFor(() => expect(mockOpen).toHaveBeenCalledWith("https://snap/x"));
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

