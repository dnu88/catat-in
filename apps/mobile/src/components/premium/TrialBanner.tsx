import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { KaswiseIcon } from "../icons/kaswise-icons";
import { useTheme } from "../../theme/theme-context";
import { useI18n } from "../../i18n/i18n-context";
import { useEntitlements } from "../../hooks/useEntitlements";

const TRIAL_BANNER_DISMISSED_KEY = "kaswise:trial-banner-dismissed";
const TRIAL_DAYS = 7;

function colorWithAlpha(color: string, alpha: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;
}

export function TrialBanner() {
  const { theme } = useTheme();
  const { language } = useI18n();
  const { data: entitlements } = useEntitlements();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const isEn = language === "en";

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(TRIAL_BANNER_DISMISSED_KEY)
      .then((value) => {
        if (active && value === "true") setDismissed(true);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    void AsyncStorage.setItem(TRIAL_BANNER_DISMISSED_KEY, "true").catch(() => undefined);
  }, []);

  const trialInfo = useMemo(() => {
    if (!entitlements || entitlements.plan !== "free" || !entitlements.plan_expires_at) {
      return null;
    }
    const now = new Date();
    const expiresAt = new Date(entitlements.plan_expires_at);
    const diffMs = expiresAt.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const progress = Math.min(1, Math.max(0, 1 - daysLeft / TRIAL_DAYS));

    if (daysLeft <= 0) return null;

    return { daysLeft, progress };
  }, [entitlements]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  if (dismissed || !trialInfo) return null;

  return (
    <View
      testID="home-trial-banner"
      accessibilityRole="alert"
      accessibilityLabel={isEn ? `Free trial: ${trialInfo.daysLeft} days left` : `Uji coba gratis: ${trialInfo.daysLeft} hari tersisa`}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.copyBlock}>
          <Text style={styles.eyebrow}>
            {isEn ? "Free Trial" : "Uji Coba Gratis"}
          </Text>
          <Text style={styles.title}>
            {isEn
              ? `${trialInfo.daysLeft} ${trialInfo.daysLeft === 1 ? "day" : "days"} left`
              : `${trialInfo.daysLeft} hari tersisa`}
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            testID="home-trial-upgrade"
            accessibilityRole="button"
            accessibilityLabel={isEn ? "Upgrade to Premium" : "Upgrade ke Premium"}
            style={styles.upgradeButton}
            onPress={() => router.push("/upgrade" as never)}
          >
            <Text style={styles.upgradeText}>
              {isEn ? "Upgrade" : "Upgrade"}
            </Text>
          </Pressable>
          <Pressable
            testID="home-trial-dismiss"
            accessibilityRole="button"
            accessibilityLabel={isEn ? "Dismiss" : "Tutup"}
            hitSlop={10}
            style={styles.dismissButton}
            onPress={dismiss}
          >
            <KaswiseIcon name="close" size={14} weight="bold" color={theme.colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          testID="home-trial-progress-fill"
          style={[
            styles.progressFill,
            { width: `${Math.round(trialInfo.progress * 100)}%` },
          ]}
        />
      </View>
      <Text style={styles.progressLabel}>
        {isEn
          ? `Day ${Math.round(trialInfo.progress * TRIAL_DAYS)} of ${TRIAL_DAYS}`
          : `Hari ${Math.round(trialInfo.progress * TRIAL_DAYS)} dari ${TRIAL_DAYS}`}
      </Text>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colorWithAlpha(theme.colors.brandPrimary, "40"),
      padding: 14,
      gap: 10,
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
      color: theme.colors.brandPrimary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.extrabold,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.bold,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexShrink: 0,
    },
    upgradeButton: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.brandPrimary,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    upgradeText: {
      color: theme.colors.textInverse,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    dismissButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    progressTrack: {
      height: 6,
      backgroundColor: theme.colors.borderBase,
      borderRadius: 999,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: 999,
    },
    progressLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
