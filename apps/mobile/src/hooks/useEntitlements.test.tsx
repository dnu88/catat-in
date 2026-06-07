import { renderHook, waitFor } from "@testing-library/react-native";
import { useEntitlements } from "./useEntitlements";

jest.mock("../services/billing", () => ({
  getEntitlements: jest.fn(async () => ({
    plan: "free", period_ym: "2026-06", chat_used: 3, chat_limit: 25,
    photo_used: 0, photo_limit: 0,
  })),
}));
jest.mock("../lib/supabase", () => ({ supabase: {} }));

test("loads entitlements", async () => {
  const { result } = renderHook(() => useEntitlements());
  await waitFor(() => expect(result.current.data?.plan).toBe("free"));
  expect(result.current.data?.chat_limit).toBe(25);
});
