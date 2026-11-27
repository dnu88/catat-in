/**
 * NotificationsScreen tests.
 */
import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import NotificationsScreen from "../app/notifications";
import { ThemeProvider } from "../src/theme/theme-context";
import { I18nProvider } from "../src/i18n/i18n-context";
import { SafeAreaProvider } from "react-native-safe-area-context";

jest.mock("../src/lib/supabase", () => {
  const supabase = {};
  return {
    useSupabase: () => ({ supabase }),
  };
});

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

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen() {
  return render(
    React.createElement(SafeAreaProvider, { initialMetrics: safeAreaMetrics },
      React.createElement(ThemeProvider, null,
        React.createElement(I18nProvider, null,
          React.createElement(NotificationsScreen)
        )
      )
    )
  );
}

function getFlattenedStyle(node: { props: { style?: StyleProp<ViewStyle> } }): ViewStyle {
  return StyleSheet.flatten(node.props.style) ?? {};
}

describe("NotificationsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListNotifications.mockResolvedValue({ items: [], unread_count: 0 });
    mockMarkAllRead.mockResolvedValue({});
  });

  it("shows loading state initially then empty state when no items", async () => {
    const screen = renderScreen();

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

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("notifications-mark-all-read")).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("uses the bell icon for the empty state", async () => {
    mockListNotifications.mockResolvedValue({ items: [], unread_count: 0 });
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("notifications-empty")).toBeTruthy();
    }, { timeout: 3000 });
    expect(screen.queryByTestId("phosphor-react-native-house")).toBeNull();
    expect(screen.getAllByTestId(/phosphor-react-native-bell/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows an explicit error state with retry and recovers on retry", async () => {
    mockListNotifications.mockRejectedValueOnce(new Error("network"));
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("notifications-error")).toBeTruthy();
    }, { timeout: 3000 });

    mockListNotifications.mockResolvedValue({ items: [], unread_count: 0 });
    fireEvent.press(screen.getByTestId("notifications-retry"));

    await waitFor(() => {
      expect(screen.getByTestId("notifications-empty")).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("provides an accessible label on the back button", async () => {
    const screen = renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("notifications-back")).toBeTruthy();
    }, { timeout: 3000 });
    expect(screen.getByTestId("notifications-back").props.accessibilityLabel).toBe("Kembali");
  });

  it("gives the back and retry controls a real 44x44 touch box", async () => {
    mockListNotifications.mockRejectedValueOnce(new Error("network"));
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("notifications-error")).toBeTruthy();
    }, { timeout: 3000 });

    for (const id of ["notifications-back", "notifications-retry"]) {
      const control = getFlattenedStyle(screen.getByTestId(id));
      expect(Number(control.minHeight)).toBeGreaterThanOrEqual(44);
      expect(Number(control.minWidth)).toBeGreaterThanOrEqual(44);
    }
  });
});
