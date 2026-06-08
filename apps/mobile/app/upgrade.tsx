import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { getPricing, createPayment, getPaymentStatus, type Pricing } from "../src/services/billing";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

const POLL_INTERVAL = 2000;
const MAX_POLLS = 30;

export default function UpgradeScreen() {
  const [pricing, setPricing] = useState<Pricing | null>(null);
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
        setPollError("Pembayaran masih diproses. Silakan cek nanti di pengaturan.");
      }
    } catch {
      if (pollCountRef.current >= MAX_POLLS) {
        stopPolling();
        setPhase("error");
        setPollError("Gagal memeriksa status. Coba lagi nanti.");
      }
    }
  }, [orderId, stopPolling]);

  const startPolling = useCallback((id: string) => {
    pollCountRef.current = 0;
    setOrderId(id);
    setPhase("polling");
    setPollError(null);
    // Check immediately once, then set interval
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
            setPollError("Pembayaran masih diproses. Silakan cek nanti di pengaturan.");
          }
        })
        .catch(() => {
          if (pollCountRef.current >= MAX_POLLS) {
            stopPolling();
            setPhase("error");
            setPollError("Gagal memeriksa status. Coba lagi nanti.");
          }
        });
    }, POLL_INTERVAL);
  }, [stopPolling]);

  useEffect(() => {
    getPricing(supabase).then(setPricing).catch(() => setPricing(null));
    return stopPolling;
  }, [stopPolling]);

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

  if (!pricing) return <ActivityIndicator testID="upgrade-loading" />;
  const isPromo = pricing.tier === "promo";

  return (
    <View>
      <Text accessibilityRole="header">Kaswise Premium</Text>
      {isPromo ? <Text>Harga perkenalan untuk 100 pengguna pertama</Text> : null}
      <Text>Foto struk OCR, chat AI 200/bulan, AI Insight</Text>

      {phase === "idle" ? (
        <>
          <Pressable testID="upgrade-monthly" disabled={busy !== null} onPress={() => buy("monthly")}>
            <Text>Bulanan {rp(pricing.monthly)}{busy === "monthly" ? " ..." : ""}</Text>
          </Pressable>
          <Pressable testID="upgrade-yearly" disabled={busy !== null} onPress={() => buy("yearly")}>
            <Text>Tahunan {rp(pricing.yearly)} (hemat 2 bulan){busy === "yearly" ? " ..." : ""}</Text>
          </Pressable>
        </>
      ) : null}

      {phase === "polling" ? (
        <>
          <ActivityIndicator testID="upgrade-polling" />
          <Text testID="upgrade-polling-text">Memeriksa status pembayaran...</Text>
          <Pressable testID="upgrade-retry-check" onPress={pollStatusImpl}>
            <Text>Saya sudah bayar</Text>
          </Pressable>
        </>
      ) : null}

      {phase === "paid" ? (
        <View testID="upgrade-success">
          <Text>✅ Pembayaran berhasil!</Text>
          <Text>Akun Anda sekarang Premium.</Text>
        </View>
      ) : null}

      {phase === "error" ? (
        <View testID="upgrade-poll-error">
          <Text testID="upgrade-poll-error-text">{pollError}</Text>
          <Pressable testID="upgrade-retry-check" onPress={() => orderId ? startPolling(orderId) : null}>
            <Text>Cek lagi</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
