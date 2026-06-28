import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { KaswiseIcon } from "../icons/kaswise-icons";
import { useTheme } from "../../theme/theme-context";
import { useI18n } from "../../i18n/i18n-context";
import { useEntitlements } from "../../hooks/useEntitlements";

function colorWithAlpha(color: string, alpha: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;
}

function UsageGauge({
  used,
  limit,
  label,
  icon,
  theme,
}: {
  used: number;
  limit: number;
  label: string;
  icon: "ai" | "image";
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const percent = limit > 0 ? Math.min(1, used / limit) : 0;
  const remaining = Math.max(0, limit - used);

  const gaugeColor =
    percent >= 0.9
      ? theme.colors.danger
      : percent >= 0.7
        ? theme.colors.warning
        : theme.colors.brandPrimary;

  return (
    <View style={gaugeStyles.gauge}>
      <View style={gaugeStyles.gaugeTopRow}>
        <View style={gaugeStyles.gaugeIcon}>
          <KaswiseIcon
            name={icon}
            size={14}
            weight="bold"
            color={gaugeColor}
          />
        </View>
        <Text style={[gaugeStyles.gaugeLabel, { color: gaugeColor }]}>
          {label}
        </Text>
        <Text style={gaugeStyles.gaugeRemaining}>
          {remaining}
        </Text>
      </View>
      <View style={gaugeStyles.gaugeTrack}>
        <View
          style={[
            gaugeStyles.gaugeFill,
            { width: `${Math.round(percent * 100)}%`, backgroundColor: gaugeColor },
          ]}
        />
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  gauge: { gap: 4 },
  gaugeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  gaugeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeLabel: {
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  gaugeRemaining: {
    fontSize: 11,
    fontWeight: "800",
    color: "currentColor",
  },
  gaugeTrack: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  gaugeFill: {
    height: "100%",
    borderRadius: 999,
  },
});

export function UpsellCard() {
  const { theme } = useTheme();
  const { language } = useI18n();
  const { data: entitlements } = useEntitlements();
  const router = useRouter();

  const isEn = language === "en";

  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!entitlements || entitlements.plan !== "free") return null;

  const chatUsed = entitlements.chat_used ?? 0;
  const chatLimit = entitlements.chat_limit ?? 0;
  const photoUsed = entitlements.photo_used ?? 0;
  const photoLimit = entitlements.photo_limit ?? 0;

  return (
    <View
      testID="home-upsell-card"
      accessibilityRole="summary"
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.copyBlock}>
          <Text style={styles.eyebrow}>
            {isEn ? "AI Usage" : "Penggunaan AI"}
          </Text>
          <Text style={styles.title}>
            {isEn ? "Free plan limits" : "Batas paket gratis"}
          </Text>
        </View>
        <Pressable
          testID="home-upsell-cta"
          accessibilityRole="button"
          accessibilityLabel={isEn ? "Unlock premium" : "Buka premium"}
          style={styles.ctaButton}
          onPress={() => router.push("/upgrade" as never)}
        >
          <KaswiseIcon name="insight" size={12} weight="fill" color={theme.colors.textInverse} />
          <Text style={styles.ctaText}>
            {isEn ? "Unlock" : "Buka"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.gauges}>
        <UsageGauge
          used={chatUsed}
          limit={chatLimit}
          label={isEn ? "Chat" : "Obrolan"}
          icon="ai"
          theme={theme}
        />
        <UsageGauge
          used={photoUsed}
          limit={photoLimit}
          label={isEn ? "Photo" : "Foto"}
          icon="image"
          theme={theme}
        />
      </View>

      <Pressable
        testID="home-upsell-link-settings"
        accessibilityRole="button"
        accessibilityLabel={isEn ? "View plan details" : "Lihat detail paket"}
        style={styles.footerRow}
        onPress={() => router.push("/(tabs)/settings" as never)}
      >
        <Text style={styles.footerText}>
          {isEn ? "View plan details →" : "Lihat detail paket →"}
        </Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 12,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    copyBlock: {
      flex: 1,
      gap: 3,
    },
    eyebrow: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.bold,
    },
    ctaButton: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.buttonPrimaryBg,
      paddingHorizontal: 12,
      paddingVertical: 7,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    ctaText: {
      color: theme.colors.buttonPrimaryText,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    gauges: {
      gap: 10,
    },
    footerRow: {
      alignItems: "flex-end",
    },
    footerText: {
      color: theme.colors.brandPrimary,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
