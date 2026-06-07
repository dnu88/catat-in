import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../src/lib/supabase";
import { getPricing, createPayment, type Pricing } from "../src/services/billing";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export default function UpgradeScreen() {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { getPricing(supabase).then(setPricing).catch(() => setPricing(null)); }, []);

  async function buy(plan: "monthly" | "yearly") {
    setBusy(plan);
    try {
      const res = await createPayment(supabase, plan);
      await WebBrowser.openBrowserAsync(res.redirect_url);
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

      <Pressable testID="upgrade-monthly" disabled={busy !== null} onPress={() => buy("monthly")}>
        <Text>Bulanan {rp(pricing.monthly)}{busy === "monthly" ? " ..." : ""}</Text>
      </Pressable>
      <Pressable testID="upgrade-yearly" disabled={busy !== null} onPress={() => buy("yearly")}>
        <Text>Tahunan {rp(pricing.yearly)} (hemat 2 bulan){busy === "yearly" ? " ..." : ""}</Text>
      </Pressable>
    </View>
  );
}
