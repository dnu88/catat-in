import { render, screen, fireEvent } from "@testing-library/react-native";
import { ActivityIndicator } from "react-native";

// ---------------------------------------------------------------------------
// Mock dependencies (inline to avoid hoisting restrictions)
// ---------------------------------------------------------------------------

jest.mock("../src/theme/theme-context", () => ({
  useTheme: () => ({
    theme: {
      colors: {
        textPrimary: "#FFFFFF",
        textSecondary: "#E5E7EB",
        textMuted: "#9CA3AF",
        textInverse: "#0A0A0A",
        textDim: "#9CA3AF",
        card: "#18181A",
        surfaceElevated: "#242427",
        mutedSurface: "#242427",
        surface: "#1E1E1A",
        borderSoft: "rgba(255,255,255,0.06)",
        brandPrimary: "#A3FF12",
        brandSecondary: "#4A80F0",
        statusSuccess: "#A3FF12",
        statusWarning: "#FFC06D",
        statusError: "#FF7B7B",
        danger: "#FF7B7B",
        buttonPrimaryBg: "#A3FF12",
        buttonPrimaryText: "#0A0A0A",
        glass: {
          background: "rgba(255,255,255,0.06)",
          border: "rgba(255,255,255,0.12)",
        },
      },
      iconBubbles: {
        primary: {
          background: "rgba(163,255,18,0.14)",
          border: "rgba(163,255,18,0.25)",
          color: "#A3FF12",
        },
        success: {
          background: "rgba(163,255,18,0.10)",
          border: "rgba(163,255,18,0.20)",
          color: "#A3FF12",
        },
        warning: {
          background: "rgba(255,192,109,0.14)",
          border: "rgba(255,192,109,0.30)",
          color: "#FFC06D",
        },
        danger: {
          background: "rgba(255,123,123,0.14)",
          border: "rgba(255,123,123,0.30)",
          color: "#FF7B7B",
        },
        navy: {
          background: "rgba(74,128,240,0.14)",
          border: "rgba(74,128,240,0.30)",
          color: "#4A80F0",
        },
      },
      radius: { sm: 10, md: 14, lg: 18, xl: 20, pill: 999 },
      spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
      typography: {
        fontSize: {
          xs: 10, sm: 12, md: 14, lg: 16, xl: 18,
          "2xl": 20, "3xl": 24, "4xl": 28, "5xl": 32,
        },
        fontWeight: {
          normal: "400", medium: "500", semibold: "600",
          bold: "700", extrabold: "800",
        },
        lineHeight: { tight: 1.2, normal: 1.4, relaxed: 1.6 },
        letterSpacing: { tight: -0.5, normal: 0, wide: 0.4 },
      },
      shadow: { sm: {}, md: {} },
      opacity: { 60: 0.6, 100: 1 },
    },
  }),
}));

jest.mock("../src/components/icons/kaswise-icons", () => ({
  KaswiseIcon: () => null,
}));

jest.mock("../src/components/ui/IconBubble", () => ({
  IconBubble: () => null,
}));

jest.mock("../src/components/motion/entrance", () => ({
  StaggeredEntrance: ({ children }: any) => children,
}));

import { AiInsightCard } from "../src/components/ai/AiInsightCard";
import type { AiInsight } from "../src/services/ai-insights";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockInsight: AiInsight = {
  period: "monthly",
  generated_at: "2026-06-09T10:00:00Z",
  summary: "Pengeluaran Anda bulan ini naik 15% dibanding bulan lalu.",
  highlights: [
    "Kategori Makanan & Minuman mendominasi 40% pengeluaran",
    "Transaksi tertinggi: Rp 500.000 di restoran",
  ],
  recommendations: [
    "Coba batasi pengeluaran makan di luar menjadi maksimal Rp 1.500.000 per bulan",
    "Pertimbangkan untuk memasak di rumah 2x seminggu",
  ],
  risk_flags: ["Pengeluaran kategori Hiburan naik 200% dari bulan lalu"],
  data_quality: {
    transaction_count: 47,
    has_previous_period: true,
    other_category_percent: 12.5,
  },
};

const mockInsightNoRisks: AiInsight = {
  period: "monthly",
  generated_at: "2026-06-09T10:00:00Z",
  summary: "Semua terlihat baik bulan ini.",
  highlights: ["Pengeluaran stabil"],
  recommendations: ["Lanjutkan kebiasaan baik"],
  risk_flags: [],
  data_quality: {
    transaction_count: 30,
    has_previous_period: true,
    other_category_percent: 5,
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AiInsightCard", () => {
  // --- State 1: Locked / free -----------------------------------------------
  describe("locked (free) state", () => {
    it("renders the card with title, body, and upgrade button", () => {
      const onUpgrade = jest.fn();
      const onGenerate = jest.fn();

      render(
        <AiInsightCard
          isPremium={false}
          insight={null}
          loading={false}
          error={null}
          onGenerate={onGenerate}
          onUpgrade={onUpgrade}
        />,
      );

      expect(screen.getByTestId("ai-insight-card")).toBeTruthy();
      expect(screen.getByTestId("ai-insight-title")).toBeTruthy();
      expect(screen.getByTestId("ai-insight-body")).toBeTruthy();
      expect(screen.getByTestId("ai-insight-upgrade-btn")).toBeTruthy();

      // Generate button should NOT be present in locked state
      expect(screen.queryByTestId("ai-insight-generate-btn")).toBeNull();
    });

    it("calls onUpgrade when upgrade button is pressed", () => {
      const onUpgrade = jest.fn();
      const onGenerate = jest.fn();

      render(
        <AiInsightCard
          isPremium={false}
          insight={null}
          loading={false}
          error={null}
          onGenerate={onGenerate}
          onUpgrade={onUpgrade}
        />,
      );

      fireEvent.press(screen.getByTestId("ai-insight-upgrade-btn"));
      expect(onUpgrade).toHaveBeenCalledTimes(1);
      expect(onGenerate).not.toHaveBeenCalled();
    });
  });

  // --- State 2: Empty premium -----------------------------------------------
  describe("empty premium state", () => {
    it("renders card with generate CTA when premium but no insight", () => {
      const onUpgrade = jest.fn();
      const onGenerate = jest.fn();

      render(
        <AiInsightCard
          isPremium={true}
          insight={null}
          loading={false}
          error={null}
          onGenerate={onGenerate}
          onUpgrade={onUpgrade}
        />,
      );

      expect(screen.getByTestId("ai-insight-card")).toBeTruthy();
      expect(screen.getByTestId("ai-insight-title")).toBeTruthy();
      expect(screen.getByTestId("ai-insight-body")).toBeTruthy();
      expect(screen.getByTestId("ai-insight-generate-btn")).toBeTruthy();

      // Upgrade button should NOT be present when premium
      expect(screen.queryByTestId("ai-insight-upgrade-btn")).toBeNull();
      // Loading/error/success elements should not be present
      expect(screen.queryByTestId("ai-insight-loading-text")).toBeNull();
      expect(screen.queryByTestId("ai-insight-error-text")).toBeNull();
      expect(screen.queryByTestId("ai-insight-summary")).toBeNull();
    });

    it("calls onGenerate when generate button is pressed", () => {
      const onUpgrade = jest.fn();
      const onGenerate = jest.fn();

      render(
        <AiInsightCard
          isPremium={true}
          insight={null}
          loading={false}
          error={null}
          onGenerate={onGenerate}
          onUpgrade={onUpgrade}
        />,
      );

      fireEvent.press(screen.getByTestId("ai-insight-generate-btn"));
      expect(onGenerate).toHaveBeenCalledTimes(1);
    });
  });

  // --- State 3: Loading -----------------------------------------------------
  describe("loading state", () => {
    it("shows spinner and loading text", () => {
      const onUpgrade = jest.fn();
      const onGenerate = jest.fn();

      render(
        <AiInsightCard
          isPremium={true}
          insight={null}
          loading={true}
          error={null}
          onGenerate={onGenerate}
          onUpgrade={onUpgrade}
        />,
      );

      expect(screen.getByTestId("ai-insight-card")).toBeTruthy();
      expect(screen.getByTestId("ai-insight-loading-text")).toBeTruthy();

      // ActivityIndicator is present
      const spinner = screen.UNSAFE_getByType(ActivityIndicator);
      expect(spinner).toBeTruthy();
    });

    it("does not show insight content or error while loading", () => {
      const onUpgrade = jest.fn();
      const onGenerate = jest.fn();

      render(
        <AiInsightCard
          isPremium={true}
          insight={mockInsight}
          loading={true}
          error={null}
          onGenerate={onGenerate}
          onUpgrade={onUpgrade}
        />,
      );

      // Loading takes priority over insight
      expect(screen.getByTestId("ai-insight-loading-text")).toBeTruthy();
      expect(screen.queryByTestId("ai-insight-summary")).toBeNull();
    });
  });

  // --- State 4: Success -----------------------------------------------------
  describe("success state", () => {
    it("renders summary, highlights, recommendations, risk flags, refresh button, and timestamp", () => {
      const onUpgrade = jest.fn();
      const onGenerate = jest.fn();

      render(
        <AiInsightCard
          isPremium={true}
          insight={mockInsight}
          loading={false}
          error={null}
          onGenerate={onGenerate}
          onUpgrade={onUpgrade}
        />,
      );

      expect(screen.getByTestId("ai-insight-card")).toBeTruthy();
      expect(screen.getByTestId("ai-insight-summary")).toBeTruthy();
      expect(screen.getByTestId("ai-insight-highlights")).toBeTruthy();
      expect(screen.getByTestId("ai-insight-recommendations")).toBeTruthy();
      expect(screen.getByTestId("ai-insight-risk-flags")).toBeTruthy();
      expect(screen.getByTestId("ai-insight-refresh-btn")).toBeTruthy();
      expect(screen.getByTestId("ai-insight-timestamp")).toBeTruthy();
    });

    it("renders summary text correctly", () => {
      render(
        <AiInsightCard
          isPremium={true}
          insight={mockInsight}
          loading={false}
          error={null}
          onGenerate={jest.fn()}
          onUpgrade={jest.fn()}
        />,
      );

      expect(
        screen.getByText(
          "Pengeluaran Anda bulan ini naik 15% dibanding bulan lalu.",
        ),
      ).toBeTruthy();
    });

    it("renders highlight items", () => {
      render(
        <AiInsightCard
          isPremium={true}
          insight={mockInsight}
          loading={false}
          error={null}
          onGenerate={jest.fn()}
          onUpgrade={jest.fn()}
        />,
      );

      expect(
        screen.getByText(
          "Kategori Makanan & Minuman mendominasi 40% pengeluaran",
        ),
      ).toBeTruthy();
      expect(
        screen.getByText("Transaksi tertinggi: Rp 500.000 di restoran"),
      ).toBeTruthy();
    });

    it("renders recommendation items", () => {
      render(
        <AiInsightCard
          isPremium={true}
          insight={mockInsight}
          loading={false}
          error={null}
          onGenerate={jest.fn()}
          onUpgrade={jest.fn()}
        />,
      );

      expect(
        screen.getByText(
          "Coba batasi pengeluaran makan di luar menjadi maksimal Rp 1.500.000 per bulan",
        ),
      ).toBeTruthy();
      expect(
        screen.getByText(
          "Pertimbangkan untuk memasak di rumah 2x seminggu",
        ),
      ).toBeTruthy();
    });

    it("renders risk flags when present", () => {
      render(
        <AiInsightCard
          isPremium={true}
          insight={mockInsight}
          loading={false}
          error={null}
          onGenerate={jest.fn()}
          onUpgrade={jest.fn()}
        />,
      );

      expect(
        screen.getByText(
          "Pengeluaran kategori Hiburan naik 200% dari bulan lalu",
        ),
      ).toBeTruthy();
    });

    it("does not render risk flags section when empty", () => {
      render(
        <AiInsightCard
          isPremium={true}
          insight={mockInsightNoRisks}
          loading={false}
          error={null}
          onGenerate={jest.fn()}
          onUpgrade={jest.fn()}
        />,
      );

      expect(screen.queryByTestId("ai-insight-risk-flags")).toBeNull();
    });

    it("calls onGenerate when refresh button is pressed", () => {
      const onGenerate = jest.fn();

      render(
        <AiInsightCard
          isPremium={true}
          insight={mockInsight}
          loading={false}
          error={null}
          onGenerate={onGenerate}
          onUpgrade={jest.fn()}
        />,
      );

      fireEvent.press(screen.getByTestId("ai-insight-refresh-btn"));
      expect(onGenerate).toHaveBeenCalledTimes(1);
    });

    it("shows timestamp from generated_at", () => {
      render(
        <AiInsightCard
          isPremium={true}
          insight={mockInsight}
          loading={false}
          error={null}
          onGenerate={jest.fn()}
          onUpgrade={jest.fn()}
        />,
      );

      // The timestamp text should contain "Diperbarui"
      const timestamp = screen.getByTestId("ai-insight-timestamp");
      expect(timestamp).toBeTruthy();
      // The text should include the generated_at date info
      const textContent = timestamp.props.children;
      expect(textContent).toEqual(expect.stringContaining("Diperbarui"));
    });
  });

  // --- State 5: Error -------------------------------------------------------
  describe("error state", () => {
    it("renders error message and retry button", () => {
      const onUpgrade = jest.fn();
      const onGenerate = jest.fn();

      render(
        <AiInsightCard
          isPremium={true}
          insight={null}
          loading={false}
          error="Gagal memuat insight AI (500)"
          onGenerate={onGenerate}
          onUpgrade={onUpgrade}
        />,
      );

      expect(screen.getByTestId("ai-insight-card")).toBeTruthy();
      expect(screen.getByTestId("ai-insight-error-text")).toBeTruthy();
      expect(screen.getByTestId("ai-insight-retry-btn")).toBeTruthy();

      expect(
        screen.getByText("Gagal memuat insight AI (500)"),
      ).toBeTruthy();
    });

    it("calls onGenerate when retry button is pressed", () => {
      const onGenerate = jest.fn();

      render(
        <AiInsightCard
          isPremium={true}
          insight={null}
          loading={false}
          error="Network error"
          onGenerate={onGenerate}
          onUpgrade={jest.fn()}
        />,
      );

      fireEvent.press(screen.getByTestId("ai-insight-retry-btn"));
      expect(onGenerate).toHaveBeenCalledTimes(1);
    });

    it("error takes priority over insight data", () => {
      render(
        <AiInsightCard
          isPremium={true}
          insight={mockInsight}
          loading={false}
          error="Something went wrong"
          onGenerate={jest.fn()}
          onUpgrade={jest.fn()}
        />,
      );

      expect(screen.getByTestId("ai-insight-error-text")).toBeTruthy();
      expect(screen.queryByTestId("ai-insight-summary")).toBeNull();
    });
  });

  // --- Edge cases -----------------------------------------------------------
  describe("state priority", () => {
    it("loading takes priority over everything", () => {
      render(
        <AiInsightCard
          isPremium={true}
          insight={mockInsight}
          loading={true}
          error="Some error"
          onGenerate={jest.fn()}
          onUpgrade={jest.fn()}
        />,
      );

      expect(screen.getByTestId("ai-insight-loading-text")).toBeTruthy();
      expect(screen.queryByTestId("ai-insight-summary")).toBeNull();
      expect(screen.queryByTestId("ai-insight-error-text")).toBeNull();
    });
  });
});
