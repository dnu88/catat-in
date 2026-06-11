import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native";

import { KaswiseLogoMark } from "../src/components/brand/KaswiseLogoMark";
import { supabase } from "../src/lib/supabase";
import {
  getPricing,
  createPayment,
  getPaymentStatus,
  type Pricing,
} from "../src/services/billing";
import { useTheme } from "../src/theme/theme-context";
import { useI18n } from "../src/i18n/i18n-context";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

const POLL_INTERVAL = 2000;
const MAX_POLLS = 30;

export default function UpgradeScreen() {
  const { theme } = useTheme();
  const { language } = useI18n();
  const isEn = language === "en";
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [pricingError, setPricingError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "polling" | "paid" | "error">("idle");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pollStatusImpl = useCallback(async () => {
    const currentId = orderId;
    if (!currentId) return;
    try {
      const result = await getPaymentStatus(supabase, currentId);
      pollCountRef.current += 1;
      if (result.status === "paid" || result.status === "settlement") {
        stopPolling();
        setPhase("paid");
        setTimeout(() => router.back(), 1500);
      } else if (pollCountRef.current >= MAX_POLLS) {
        stopPolling();
        setPhase("error");
        setPollError(isEn ? "Payment is still processing. Please check later in settings." : "Pembayaran masih diproses. Silakan cek nanti di pengaturan.");
      }
    } catch {
      if (pollCountRef.current >= MAX_POLLS) {
        stopPolling();
        setPhase("error");
        setPollError(isEn ? "Failed to check payment status. Please try again." : "Gagal memeriksa status. Coba lagi nanti.");
      }
    }
  }, [orderId, stopPolling]);

  const startPolling = useCallback(
    (id: string) => {
      pollCountRef.current = 0;
      setOrderId(id);
      setPhase("polling");
      setPollError(null);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        const currentId = id;
        if (!currentId) return;
        getPaymentStatus(supabase, currentId)
          .then((result) => {
            pollCountRef.current += 1;
            if (result.status === "paid" || result.status === "settlement") {
              stopPolling();
              setPhase("paid");
              setTimeout(() => router.back(), 1500);
            } else if (pollCountRef.current >= MAX_POLLS) {
              stopPolling();
              setPhase("error");
              setPollError(
                "Pembayaran masih diproses. Silakan cek nanti di pengaturan."
              );
            }
          })
          .catch(() => {
            if (pollCountRef.current >= MAX_POLLS) {
              stopPolling();
              setPhase("error");
              setPollError(isEn ? "Failed to check payment status. Please try again." : "Gagal memeriksa status. Coba lagi nanti.");
            }
          });
      }, POLL_INTERVAL);
    },
    [stopPolling]
  );

  const fetchPricing = useCallback(() => {
    setPricingError(false);
    getPricing(supabase)
      .then(setPricing)
      .catch(() => setPricingError(true));
  }, []);

  useEffect(() => {
    fetchPricing();
    return stopPolling;
  }, [fetchPricing, stopPolling]);

  async function buy(plan: "monthly" | "yearly") {
    setBusy(plan);
    try {
      const res = await createPayment(supabase, plan);
      await WebBrowser.openBrowserAsync(res.redirect_url);
      startPolling(res.order_id);
    } catch {
      // createPayment throws on failure — stay idle
    } finally {
      setBusy(null);
    }
  }

  // Loading state
  if (!pricing && !pricingError) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centeredPhase}>
          <ActivityIndicator testID="upgrade-loading" size="large" color={theme.colors.brandPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  // Pricing error state
  if (pricingError && !pricing) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centeredPhase}>
          <Text style={styles.errorTitle}>{isEn ? "Failed to load pricing" : "Gagal memuat harga"}</Text>
          <Text style={styles.errorBody}>{isEn ? "Check your internet connection and try again." : "Periksa koneksi internet Anda dan coba lagi."}</Text>
          <Pressable style={styles.retryButton} onPress={fetchPricing}>
            <Text style={styles.retryButtonText}>{isEn ? "Try Again" : "Coba Lagi"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isPromo = pricing!.tier === "promo";
  const brandText =
    theme.mode === "light"
      ? theme.colors.brandPrimaryDeep
      : theme.colors.brandPrimary;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <KaswiseLogoMark size={40} />
          <Text accessibilityRole="header" style={styles.title}>
            Kaswise Premium
          </Text>
          <Text style={styles.subtitle}>
            {isEn ? "OCR receipts, AI chat 200/month, AI Insight" : "Foto struk OCR, chat AI 200/bulan, AI Insight"}
          </Text>
        </View>

        {/* Promo badge */}
        {isPromo ? (
          <View style={styles.promoBadge}>
            <Text style={styles.promoBadgeText}>
              {isEn ? "Launch price for the first 100 users" : "Harga perkenalan untuk 100 pengguna pertama"}
            </Text>
          </View>
        ) : null}

        {/* Plan cards — idle phase */}
        {phase === "idle" ? (
          <>
            <Pressable
              testID="upgrade-monthly"
              disabled={busy !== null}
              style={({ pressed }) => [
                styles.planCard,
                pressed && styles.planCardPressed,
                busy !== null && styles.planCardDisabled,
              ]}
              onPress={() => buy("monthly")}
            >
              <View style={styles.planCardInner}>
                <View style={styles.planLabelRow}>
                  <Text style={styles.planLabel}>{isEn ? "Monthly" : "Bulanan"}</Text>
                  {busy === "monthly" ? (
                    <ActivityIndicator size="small" color={brandText} />
                  ) : null}
                </View>
                <Text style={styles.planPrice}>{rp(pricing!.monthly)}</Text>
                <Text style={styles.planPerMonth}>{isEn ? "/month" : "/bulan"}</Text>
              </View>
            </Pressable>

            <Pressable
              testID="upgrade-yearly"
              disabled={busy !== null}
              style={({ pressed }) => [
                styles.planCard,
                styles.planCardYearly,
                pressed && styles.planCardPressed,
                busy !== null && styles.planCardDisabled,
              ]}
              onPress={() => buy("yearly")}
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueBadgeText}>HEMAT</Text>
              </View>
              <View style={styles.planCardInner}>
                <View style={styles.planLabelRow}>
                  <Text style={styles.planLabel}>{isEn ? "Yearly" : "Tahunan"}</Text>
                  {busy === "yearly" ? (
                    <ActivityIndicator size="small" color={brandText} />
                  ) : null}
                </View>
                <Text style={styles.planPrice}>{rp(pricing!.yearly)}</Text>
                <Text style={styles.planPerMonth}>{isEn ? "save 2 months" : "hemat 2 bulan"}</Text>
              </View>
            </Pressable>
          </>
        ) : null}

        {/* Polling phase */}
        {phase === "polling" ? (
          <View style={styles.phaseCard}>
            <ActivityIndicator
              testID="upgrade-polling"
              size="large"
              color={theme.colors.brandPrimary}
            />
            <Text testID="upgrade-polling-text" style={styles.phaseText}>
              {isEn ? "Checking payment status..." : "Memeriksa status pembayaran..."}
            </Text>
            <Pressable testID="upgrade-retry-check" style={styles.retryButton} onPress={pollStatusImpl}>
              <Text style={styles.retryButtonText}>{isEn ? "I already paid" : "Saya sudah bayar"}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Success phase */}
        {phase === "paid" ? (
          <View testID="upgrade-success" style={styles.phaseCard}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.phaseTitle}>{isEn ? "Payment successful!" : "Pembayaran berhasil!"}</Text>
            <Text style={styles.phaseText}>{isEn ? "Your account is now Premium." : "Akun Anda sekarang Premium."}</Text>
          </View>
        ) : null}

        {/* Error phase */}
        {phase === "error" ? (
          <View testID="upgrade-poll-error" style={styles.phaseCard}>
            <Text testID="upgrade-poll-error-text" style={styles.errorTitle}>
              {pollError}
            </Text>
            <Pressable
              testID="upgrade-retry-check"
              style={styles.retryButton}
              onPress={() => (orderId ? startPolling(orderId) : null)}
            >
              <Text style={styles.retryButtonText}>{isEn ? "Check again" : "Cek lagi"}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  const brandText =
    theme.mode === "light"
      ? theme.colors.brandPrimaryDeep
      : theme.colors.brandPrimary;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing["3xl"],
      gap: theme.spacing.lg,
    },
    centeredPhase: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    // Header
    header: {
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    title: {
      fontSize: 22,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    // Promo badge
    promoBadge: {
      backgroundColor: brandText,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      alignSelf: "center",
    },
    promoBadgeText: {
      color: theme.colors.textInverse,
      fontSize: 11,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    // Plan cards
    planCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: theme.spacing.xl,
      ...theme.shadow.sm,
    },
    planCardYearly: {
      borderColor: brandText,
      borderWidth: 2,
    },
    planCardPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    planCardDisabled: {
      opacity: 0.5,
    },
    planCardInner: {
      gap: theme.spacing.xs,
    },
    planLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    planLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    planPrice: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.sm,
    },
    planPerMonth: {
      fontSize: 13,
      color: theme.colors.textMuted,
      fontWeight: "600",
    },
    bestValueBadge: {
      position: "absolute",
      top: -1,
      right: theme.spacing.lg,
      backgroundColor: brandText,
      borderBottomLeftRadius: theme.radius.sm,
      borderBottomRightRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    bestValueBadgeText: {
      color: theme.colors.textInverse,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.8,
    },
    // Phase cards (polling, success, error)
    phaseCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: theme.spacing["2xl"],
      alignItems: "center",
      gap: theme.spacing.lg,
      ...theme.shadow.sm,
    },
    phaseTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      textAlign: "center",
    },
    phaseText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    successIcon: {
      fontSize: 48,
    },
    // Error & retry
    errorTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.danger,
      textAlign: "center",
    },
    errorBody: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    retryButton: {
      backgroundColor: theme.colors.buttonPrimaryBg,
      borderRadius: theme.radius.pill,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      minWidth: 140,
    },
    retryButtonText: {
      color: theme.colors.buttonPrimaryText,
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: 0.2,
    },
  });
}
