import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useTheme } from "../../theme/theme-context";
import { KaswiseIcon } from "../icons/kaswise-icons";
import { IconBubble } from "../ui/IconBubble";
import { StaggeredEntrance } from "../motion/entrance";
import type { AiInsight } from "../../services/ai-insights";

type Props = {
  insight?: AiInsight | null;
  loading?: boolean;
  error?: string | null;
  isPremium: boolean;
  onGenerate: () => void;
  onUpgrade: () => void;
};

export function AiInsightCard({
  insight,
  loading = false,
  error = null,
  isPremium,
  onGenerate,
  onUpgrade,
}: Props) {
  const { theme } = useTheme();

  // --- State determination (in priority order) ---
  const isError = error != null && error !== "";
  const hasInsight = insight != null;

  // --- Render helpers ---

  function renderHeader(iconName: "insight" | "lock", iconTone: "primary" | "warning") {
    return (
      <View style={styles(theme).headerRow}>
        <IconBubble name={iconName} tone={iconTone} size={40} />
        <Text
          testID="ai-insight-title"
          style={styles(theme).title}
        >
          Insight AI Bulan Ini
        </Text>
      </View>
    );
  }

  function renderLockedState() {
    return (
      <View testID="ai-insight-card" style={styles(theme).card}>
        {renderHeader("lock", "warning")}
        <Text testID="ai-insight-body" style={styles(theme).body}>
          Dapatkan ringkasan pola pengeluaran dan rekomendasi praktis dari AI.
        </Text>
        <Pressable
          testID="ai-insight-upgrade-btn"
          onPress={onUpgrade}
          accessibilityRole="button"
          accessibilityLabel="Upgrade Premium"
          style={({ pressed }) => [
            styles(theme).ctaButton,
            styles(theme).ctaButtonPrimary,
            pressed && styles(theme).ctaButtonPressed,
          ]}
        >
          <Text style={styles(theme).ctaButtonPrimaryText}>
            Upgrade Premium
          </Text>
        </Pressable>
      </View>
    );
  }

  function renderEmptyPremiumState() {
    return (
      <View testID="ai-insight-card" style={styles(theme).card}>
        {renderHeader("insight", "primary")}
        <Text testID="ai-insight-body" style={styles(theme).body}>
          Analisis AI siap membantu membaca pola keuanganmu bulan ini.
        </Text>
        <Pressable
          testID="ai-insight-generate-btn"
          onPress={onGenerate}
          accessibilityRole="button"
          accessibilityLabel="Buat Insight AI"
          style={({ pressed }) => [
            styles(theme).ctaButton,
            styles(theme).ctaButtonPrimary,
            pressed && styles(theme).ctaButtonPressed,
          ]}
        >
          <Text style={styles(theme).ctaButtonPrimaryText}>
            Buat Insight AI
          </Text>
        </Pressable>
      </View>
    );
  }

  function renderLoadingState() {
    return (
      <View testID="ai-insight-card" style={styles(theme).card}>
        <View style={styles(theme).centeredContent}>
          <ActivityIndicator
            size="large"
            color={theme.colors.brandPrimary}
          />
          <Text
            testID="ai-insight-loading-text"
            style={styles(theme).loadingText}
          >
            Menganalisis laporan...
          </Text>
        </View>
      </View>
    );
  }

  function renderErrorState() {
    return (
      <View testID="ai-insight-card" style={styles(theme).card}>
        <View style={styles(theme).centeredContent}>
          <IconBubble name="insight" tone="danger" size={48} />
          <Text testID="ai-insight-error-text" style={styles(theme).errorText}>
            {error}
          </Text>
          <Pressable
            testID="ai-insight-retry-btn"
            onPress={onGenerate}
            accessibilityRole="button"
            accessibilityLabel="Coba lagi"
            style={({ pressed }) => [
              styles(theme).ctaButton,
              styles(theme).ctaButtonOutline,
              pressed && styles(theme).ctaButtonPressed,
            ]}
          >
            <Text style={styles(theme).ctaButtonOutlineText}>
              Coba lagi
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function formatTimestamp(isoString: string): string {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMinutes < 1) return "Diperbarui barusan";
      if (diffMinutes < 60)
        return `Diperbarui ${diffMinutes} menit lalu`;
      if (diffHours < 24)
        return `Diperbarui ${diffHours} jam lalu`;
      if (diffDays < 7)
        return `Diperbarui ${diffDays} hari lalu`;

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `Diperbarui ${day}/${month}/${year}`;
    } catch {
      return "Diperbarui";
    }
  }

  function renderSuccessState() {
    if (!insight) return null;

    return (
      <View testID="ai-insight-card" style={styles(theme).card}>
        {renderHeader("insight", "primary")}

        {/* Summary */}
        <Text testID="ai-insight-summary" style={styles(theme).summary}>
          {insight.summary}
        </Text>

        {/* Highlights */}
        {insight.highlights.length > 0 && (
          <View testID="ai-insight-highlights" style={styles(theme).section}>
            <Text style={styles(theme).sectionTitle}>Sorotan</Text>
            {insight.highlights.map((item, idx) => (
              <View key={`hl-${idx}`} style={styles(theme).listItem}>
                <Text style={styles(theme).bullet}>•</Text>
                <Text style={styles(theme).listItemText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommendations */}
        {insight.recommendations.length > 0 && (
          <View
            testID="ai-insight-recommendations"
            style={styles(theme).section}
          >
            <Text style={styles(theme).sectionTitle}>Rekomendasi</Text>
            {insight.recommendations.map((item, idx) => (
              <View key={`rec-${idx}`} style={styles(theme).listItem}>
                <View style={styles(theme).checkBadge}>
                  <KaswiseIcon
                    name="check"
                    size={14}
                    color={theme.colors.success}
                    weight="bold"
                  />
                </View>
                <Text style={styles(theme).listItemText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Risk Flags */}
        {insight.risk_flags.length > 0 && (
          <View testID="ai-insight-risk-flags" style={styles(theme).section}>
            <View style={styles(theme).riskHeader}>
              <KaswiseIcon
                name="insight"
                size={16}
                color={theme.colors.warning}
                weight="bold"
              />
              <Text style={styles(theme).riskTitle}>Perhatian</Text>
            </View>
            {insight.risk_flags.map((flag, idx) => (
              <View key={`rf-${idx}`} style={styles(theme).riskItem}>
                <Text style={styles(theme).riskText}>{flag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Timestamp */}
        <Text testID="ai-insight-timestamp" style={styles(theme).timestamp}>
          {formatTimestamp(insight.generated_at)}
        </Text>

        {/* Refresh button */}
        <Pressable
          testID="ai-insight-refresh-btn"
          onPress={onGenerate}
          accessibilityRole="button"
          accessibilityLabel="Refresh insight"
          style={({ pressed }) => [
            styles(theme).ctaButton,
            styles(theme).ctaButtonOutline,
            pressed && styles(theme).ctaButtonPressed,
          ]}
        >
          <KaswiseIcon
            name="insight"
            size={16}
            color={theme.colors.brandPrimary}
            weight="bold"
          />
          <Text style={styles(theme).ctaButtonOutlineText}>Refresh</Text>
        </Pressable>
      </View>
    );
  }

  // --- Render logic ---

  if (loading) {
    return (
      <StaggeredEntrance index={0} testID="ai-insight-entrance">
        {renderLoadingState()}
      </StaggeredEntrance>
    );
  }

  if (isError) {
    return (
      <StaggeredEntrance index={0} testID="ai-insight-entrance">
        {renderErrorState()}
      </StaggeredEntrance>
    );
  }

  if (hasInsight) {
    return (
      <StaggeredEntrance index={0} testID="ai-insight-entrance">
        {renderSuccessState()}
      </StaggeredEntrance>
    );
  }

  if (!isPremium) {
    return (
      <StaggeredEntrance index={0} testID="ai-insight-entrance">
        {renderLockedState()}
      </StaggeredEntrance>
    );
  }

  // Empty premium state
  return (
    <StaggeredEntrance index={0} testID="ai-insight-entrance">
      {renderEmptyPremiumState()}
    </StaggeredEntrance>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function styles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.borderSoft,
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      flex: 1,
    },
    body: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.md,
      lineHeight: theme.typography.fontSize.md * theme.typography.lineHeight.relaxed,
    },
    centeredContent: {
      alignItems: "center",
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.lg,
    },
    loadingText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.md,
      marginTop: theme.spacing.sm,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.md,
      textAlign: "center",
      lineHeight: theme.typography.fontSize.md * theme.typography.lineHeight.relaxed,
    },
    summary: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      lineHeight: theme.typography.fontSize.md * theme.typography.lineHeight.relaxed,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: theme.spacing.xs,
    },
    listItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
    },
    bullet: {
      color: theme.colors.brandPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      width: 16,
      textAlign: "center",
    },
    checkBadge: {
      width: 20,
      height: 20,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.iconBubbles.success.background,
      alignItems: "center",
      justifyContent: "center",
    },
    listItemText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.md,
      lineHeight: theme.typography.fontSize.md * theme.typography.lineHeight.relaxed,
      flex: 1,
    },
    riskHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    riskTitle: {
      color: theme.colors.warning,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    riskItem: {
      backgroundColor: theme.iconBubbles.warning.background,
      borderColor: theme.iconBubbles.warning.border,
      borderWidth: 1,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    riskText: {
      color: theme.colors.warning,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
    },
    timestamp: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      textAlign: "center",
    },
    ctaButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      borderRadius: theme.radius.sm,
      minHeight: 44,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    ctaButtonPrimary: {
      backgroundColor: theme.colors.buttonPrimaryBg,
      borderColor: theme.colors.buttonPrimaryBg,
      borderWidth: 1,
    },
    ctaButtonPrimaryText: {
      color: theme.colors.buttonPrimaryText,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    ctaButtonOutline: {
      backgroundColor: "transparent",
      borderColor: theme.colors.borderSoft,
      borderWidth: 1,
    },
    ctaButtonOutlineText: {
      color: theme.colors.brandPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    ctaButtonPressed: {
      opacity: 0.85,
    },
  });
}
