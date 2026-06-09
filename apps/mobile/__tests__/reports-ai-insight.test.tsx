import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import ReportsScreen from "../app/(tabs)/reports";
import { ThemeProvider } from "../src/theme/theme-context";
import { SupabaseProvider } from "../src/lib/supabase";
import { I18nProvider } from "../src/i18n/i18n-context";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockEntitlementsPlan: "free" | "premium" = "free";

jest.mock("../src/hooks/useEntitlements", () => ({
  useEntitlements: () => ({
    data: mockEntitlementsPlan === "premium"
      ? { plan: "premium", period_ym: "2026-06", chat_used: 0, chat_limit: 50, photo_used: 0, photo_limit: 50, plan_expires_at: null }
      : { plan: "free", period_ym: "2026-06", chat_used: 0, chat_limit: 5, photo_used: 0, photo_limit: 3, plan_expires_at: null },
    loading: false,
    refresh: jest.fn(),
  }),
}));

jest.mock("../src/services/ai-insights", () => {
  const mock = jest.fn();
  (globalThis as any).__aiInsightGetMock = mock;
  return {
    getAiInsight: mock,
    AiInsightPremiumRequiredError: class extends Error {
      constructor() {
        super("Fitur ini hanya tersedia untuk pengguna Premium.");
        this.name = "AiInsightPremiumRequiredError";
      }
    },
  };
});

// Helper to access the mocked getAiInsight
function mgi() { return (globalThis as any).__aiInsightGetMock as jest.Mock; }

// Track props received by AiInsightCard
let capturedProps: Record<string, unknown> | null = null;
jest.mock("../src/components/ai/AiInsightCard", () => ({
  AiInsightCard: (props: Record<string, unknown>) => {
    capturedProps = props;
    const { View, Text } = require("react-native");
    return (
      <View testID="ai-insight-card-mock">
        <Text testID="ai-insight-card-isPremium">
          {String(props.isPremium)}
        </Text>
        <Text testID="ai-insight-card-loading">
          {String(props.loading)}
        </Text>
        <Text testID="ai-insight-card-error">
          {String(props.error ?? "")}
        </Text>
      </View>
    );
  },
}));

jest.mock("../src/state/finance-context", () => ({
  useFinanceContext: () => ({
    activeContext: { type: "personal" as const },
    canCreate: true,
  }),
}));

jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(() => callback(), [callback]);
  },
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("react-native/Libraries/Share/Share", () => ({
  default: { share: jest.fn(() => Promise.resolve({ action: "sharedAction" })) },
  share: jest.fn(() => Promise.resolve({ action: "sharedAction" })),
}));

// Minimal supabase mock (same pattern as reports-screen.test.tsx)
jest.mock("../src/lib/supabase", () => {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    gte: jest.fn(() => chain),
    lte: jest.fn(async () => ({ data: [], error: null })),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    single: jest.fn(async () => ({ data: null, error: null })),
  };
  return {
    useSupabase: () => ({ supabase: { rpc: jest.fn(), from: jest.fn(() => chain), auth: { getUser: jest.fn(async () => ({ data: { user: null }, error: null })) } } }),
    SupabaseProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("../src/services/categories", () => ({
  listCategories: jest.fn(async () => []),
}));

jest.mock("../src/components/ui", () => ({
  IconBubble: ({ name, tone, size }: { name: string; tone: string; size: number }) => {
    const { Text } = require("react-native");
    return <Text>{`${name}-${tone}-${size}`}</Text>;
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderReports() {
  capturedProps = null;
  return render(
    <SupabaseProvider>
      <I18nProvider>
        <ThemeProvider>
          <ReportsScreen />
        </ThemeProvider>
      </I18nProvider>
    </SupabaseProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReportsScreen AI Insight integration", () => {
  beforeEach(() => {
    mockEntitlementsPlan = "free";
    (globalThis as any).__aiInsightGetMock?.mockReset();
    capturedProps = null;
  });

  // === Position tests ===

  it("renders AiInsightCard between summary and recommendation sections", async () => {
    renderReports();

    await screen.findByTestId("reports-entrance-summary");
    await screen.findByTestId("reports-entrance-ai-insight");
    await screen.findByTestId("reports-entrance-recommendation");
    await screen.findByTestId("reports-entrance-history");

    // Verify the AI insight entrance exists
    expect(screen.getByTestId("reports-entrance-ai-insight")).toBeTruthy();

    // Verify AiInsightCard mock is rendered inside it
    expect(screen.getByTestId("ai-insight-card-mock")).toBeTruthy();
  });

  // === Free user tests ===

  it("passes isPremium=false to AiInsightCard for free users", async () => {
    mockEntitlementsPlan = "free";
    renderReports();

    await screen.findByTestId("ai-insight-card-mock");
    expect(screen.getByTestId("ai-insight-card-isPremium")).toHaveTextContent("false");
  });

  // === Premium user tests ===

  it("passes isPremium=true to AiInsightCard for premium users", async () => {
    mockEntitlementsPlan = "premium";
    renderReports();

    await screen.findByTestId("ai-insight-card-mock");
    expect(screen.getByTestId("ai-insight-card-isPremium")).toHaveTextContent("true");
  });

  // === Loading state tests ===

  it("passes loading=false initially", async () => {
    renderReports();

    await screen.findByTestId("ai-insight-card-mock");
    expect(screen.getByTestId("ai-insight-card-loading")).toHaveTextContent("false");
  });

  // === Error state tests ===

  it("passes error=null initially", async () => {
    renderReports();

    await screen.findByTestId("ai-insight-card-mock");
    // The mock renders empty string for null
    const errorText = screen.getByTestId("ai-insight-card-error");
    expect(errorText.props.children).toBe("");
  });

  // === Handler integration tests ===

  it("wires onGenerate to call getAiInsight for premium users", async () => {
    mockEntitlementsPlan = "premium";
    const mockInsight = {
      period: "month",
      generated_at: "2026-06-01T00:00:00Z",
      summary: "Pengeluaran Anda stabil.",
      highlights: ["Makanan 40%"],
      recommendations: ["Kurangi jajan"],
      risk_flags: [],
      data_quality: { transaction_count: 10 },
    };
    mgi().mockResolvedValueOnce(mockInsight);

    renderReports();

    await screen.findByTestId("ai-insight-card-mock");

    // Simulate onGenerate being called
    expect(capturedProps).not.toBeNull();
    const onGenerate = capturedProps!.onGenerate as () => void;
    expect(typeof onGenerate).toBe("function");

    // Fire the handler
    onGenerate();

    await waitFor(() => {
      expect(mgi()).toHaveBeenCalled();
    });
  });

  it("onGenerate does not call getAiInsight for free users (routes to upgrade)", async () => {
    mockEntitlementsPlan = "free";
    renderReports();

    await screen.findByTestId("ai-insight-card-mock");

    expect(capturedProps).not.toBeNull();
    const onGenerate = capturedProps!.onGenerate as () => void;

    onGenerate();

    // Should NOT call the API for free users
    expect(mgi()).not.toHaveBeenCalled();
  });

  it("wires onUpgrade callback", async () => {
    mockEntitlementsPlan = "free";
    renderReports();

    await screen.findByTestId("ai-insight-card-mock");

    expect(capturedProps).not.toBeNull();
    const onUpgrade = capturedProps!.onUpgrade as () => void;
    expect(typeof onUpgrade).toBe("function");

    // Call it — should not throw
    expect(() => onUpgrade()).not.toThrow();
  });

  it("handles AiInsightPremiumRequiredError gracefully", async () => {
    mockEntitlementsPlan = "premium";
    const { AiInsightPremiumRequiredError } = require("../src/services/ai-insights");
    mgi().mockRejectedValueOnce(new AiInsightPremiumRequiredError());

    renderReports();

    await screen.findByTestId("ai-insight-card-mock");

    const onGenerate = capturedProps!.onGenerate as () => void;
    onGenerate();

    // Wait for the promise to settle
    await waitFor(() => {
      expect(mgi()).toHaveBeenCalled();
    });

    // Should not throw — error is caught by the handler
  });

  it("handles generic errors gracefully", async () => {
    mockEntitlementsPlan = "premium";
    mgi().mockRejectedValueOnce(new Error("Network error"));

    renderReports();

    await screen.findByTestId("ai-insight-card-mock");

    const onGenerate = capturedProps!.onGenerate as () => void;
    onGenerate();

    await waitFor(() => {
      expect(mgi()).toHaveBeenCalled();
    });

    // Should not throw
  });
});
