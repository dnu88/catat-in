/**
 * NotificationsScreen tests.
 */
import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import NotificationsScreen from "../app/notifications";
import { ThemeProvider } from "../src/theme/theme-context";
import { I18nProvider } from "../src/i18n/i18n-context";
import { SafeAreaProvider } from "react-native-safe-area-context";

jest.mock("../src/lib/supabase", () => ({
  useSupabase: () => ({ supabase: {} }),
}));

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

const mockListNotifications = jest.fn();
const mockMarkRead = jest.fn();
const mockMarkAllRead = jest.fn();

jest.mock("../src/services/notifications", () => ({
  listNotifications: (...args: any[]) => mockListNotifications(...args),
  markNotificationRead: (...args: any[]) => mockMarkRead(...args),
  markAllNotificationsRead: (...args: any[]) => mockMarkAllRead(...args),
}));

describe("NotificationsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListNotifications.mockResolvedValue({ items: [], unread_count: 0 });
    mockMarkAllRead.mockResolvedValue({});
  });

  it("shows loading state initially then empty state when no items", async () => {
    const screen = render(
      React.createElement(SafeAreaProvider, null,
        React.createElement(ThemeProvider, null,
          React.createElement(I18nProvider, null,
            React.createElement(NotificationsScreen)
          )
        )
      )
    );

    // Wait for loading to finish and empty state to appear
    await waitFor(() => {
      expect(mockListNotifications).toHaveBeenCalled();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByTestId("notifications-empty")).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("shows notification list when items exist", async () => {
    mockListNotifications.mockResolvedValue({
      items: [{ id: "n1", type: "budget_threshold", title: "T", body: "B", data: {}, read_at: null, created_at: "2026-06-10T05:00:00Z" }],
      unread_count: 1,
    });

    const screen = render(
      React.createElement(SafeAreaProvider, null,
        React.createElement(ThemeProvider, null,
          React.createElement(I18nProvider, null,
            React.createElement(NotificationsScreen)
          )
        )
      )
    );

    await waitFor(() => {
      expect(screen.getByTestId("notifications-mark-all-read")).toBeTruthy();
    }, { timeout: 3000 });
  });
});
