import { render, fireEvent, waitFor } from "@testing-library/react-native";
import UpgradeScreen from "../app/upgrade";

jest.mock("../src/lib/supabase", () => ({ supabase: {} }));
const mockOpen = jest.fn(async (_url: string) => ({ type: "dismiss" as const }));
jest.mock("expo-web-browser", () => ({
  openBrowserAsync: (url: string) => mockOpen(url),
}));
const mockCreate = jest.fn(async (_supabase: unknown, _plan: string) => ({
  redirect_url: "https://snap/x",
  amount: 29000,
  order_id: "kw-x",
}));
jest.mock("../src/services/billing", () => ({
  getPricing: jest.fn(async () => ({ tier: "promo", monthly: 29000, yearly: 249000 })),
  createPayment: (supabase: unknown, plan: string) => mockCreate(supabase, plan),
}));

test("shows promo prices and opens Snap on upgrade", async () => {
  const { getByText, getByTestId } = render(<UpgradeScreen />);
  await waitFor(() => getByText(/29.000/));
  fireEvent.press(getByTestId("upgrade-monthly"));
  await waitFor(() => expect(mockOpen).toHaveBeenCalledWith("https://snap/x"));
});
