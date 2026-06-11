/**
 * NotificationBell component tests.
 */
import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { NotificationBell } from "../src/components/notifications/NotificationBell";
import { ThemeProvider } from "../src/theme/theme-context";

jest.mock("../src/lib/supabase", () => ({
  useSupabase: () => ({ supabase: {} }),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockGetUnreadCount = jest.fn();
jest.mock("../src/services/notifications", () => ({
  getUnreadNotificationCount: (...args: any[]) => mockGetUnreadCount(...args),
}));

describe("NotificationBell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUnreadCount.mockResolvedValue(0);
  });

  function renderBell(pollIntervalMs = 0) {
    return render(
      React.createElement(ThemeProvider, null,
        React.createElement(NotificationBell, { pollIntervalMs })
      )
    );
  }

  it("renders the bell icon", async () => {
    const { findByTestId } = renderBell();
    await findByTestId("notification-bell");
  });

  it("shows no badge when unread count is 0", async () => {
    const { queryByTestId } = renderBell();
    await new Promise((r) => setTimeout(r, 100));
    expect(queryByTestId("notification-bell-badge")).toBeNull();
  });

  it("shows badge when unread > 0", async () => {
    mockGetUnreadCount.mockResolvedValue(5);
    const { findByTestId } = renderBell();
    await findByTestId("notification-bell-badge");
  });

  it("navigates to /notifications on press", async () => {
    const { findByTestId } = renderBell();
    const bell = await findByTestId("notification-bell");
    fireEvent.press(bell);
    expect(mockPush).toHaveBeenCalledWith("/notifications");
  });
});
