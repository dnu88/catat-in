# Freemium Mobile UI (Plan 3/3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Permukaan freemium di app: indikator kuota chat, gembok foto + paywall untuk free, layar Upgrade yang membuka Snap (QRIS/GoPay/ShopeePay), status plan di Settings, dan refresh entitlement setelah bayar.

**Architecture:** Service `billing.ts` (panggil backend `/me/entitlements`, `/payments/*` dgn token Supabase, pola sama `receipt-intake.ts`). Hook `useEntitlements`. Layar `app/upgrade.tsx`. Modifikasi `capture.tsx` (gating UI) & `settings.tsx` (status plan). Snap dibuka via `expo-web-browser` (sudah dependency).

**Tech Stack:** Expo Router, React Native, `@supabase/supabase-js`, `expo-web-browser`, `expo-linking`, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-06-07-freemium-ai-monetization-design.md` · **Branch:** `feat/freemium-ai-monetization`
**Prasyarat:** Plan 1 (`/me/entitlements`, gating 402/429) & Plan 2 (`/payments/create`, status) sudah ada di backend.

> Test mobile: `cd /home/Danu88/catat-in && corepack pnpm --filter mobile test -- --runInBand`.

---

### Task 1: Backend — `GET /api/v1/payments/pricing`

> Mobile paywall butuh tahu harga & tier yang berlaku **sebelum** checkout. Endpoint kecil ini melengkapi Plan 2.

**Files:**
- Modify: `backend/app/api/v1/payments.py`
- Test: `backend/tests/test_payments_pricing_endpoint.py`

- [ ] **Step 1: Test gagal**

```python
# backend/tests/test_payments_pricing_endpoint.py
from unittest.mock import patch
from main import app
from app.core.auth import get_current_user

FAKE = {"user_id": "u1", "email": "u1@example.com"}


def setup_module():
    app.dependency_overrides[get_current_user] = lambda: FAKE


def teardown_module():
    app.dependency_overrides.clear()


def test_pricing_promo_when_few_users(client):
    with patch("app.api.v1.payments.count_paid_users", return_value=10):
        r = client.get("/api/v1/payments/pricing", headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    data = r.json()
    assert data["tier"] == "promo"
    assert data["monthly"] == 29000 and data["yearly"] == 249000


def test_pricing_normal_when_quota_reached(client):
    with patch("app.api.v1.payments.count_paid_users", return_value=100):
        r = client.get("/api/v1/payments/pricing", headers={"Authorization": "Bearer x"})
    assert r.json()["tier"] == "normal"
    assert r.json()["monthly"] == 39000
```

- [ ] **Step 2: Jalankan, gagal** → FAIL (404)
- [ ] **Step 3: Tambah route di `payments.py`**

```python
@router.get("/pricing")
async def pricing(current_user=Depends(get_current_user)):
    tier = tier_for_count(count_paid_users())
    return {
        "tier": tier,
        "monthly": price_for("monthly", tier),
        "yearly": price_for("yearly", tier),
    }
```

- [ ] **Step 4: Lulus** → `cd backend && python -m pytest tests/test_payments_pricing_endpoint.py -v` PASS
- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/payments.py backend/tests/test_payments_pricing_endpoint.py
git commit -m "feat(api): GET /payments/pricing (current tier + prices)"
```

---

### Task 2: Service `billing.ts`

**Files:**
- Create: `apps/mobile/src/services/billing.ts`
- Test: `apps/mobile/src/services/billing.test.ts`

> Reuse `getApiBaseUrl` dari `receipt-intake.ts`; token via `supabase.auth.getSession()`.

- [ ] **Step 1: Test gagal**

```ts
// apps/mobile/src/services/billing.test.ts
import { getEntitlements, createPayment, getPricing } from "./billing";

jest.mock("./receipt-intake", () => ({ getApiBaseUrl: () => "https://api.test" }));

const fakeSupabase: any = {
  auth: { getSession: async () => ({ data: { session: { access_token: "tok" } } }) },
};

afterEach(() => jest.restoreAllMocks());

test("getEntitlements calls backend with bearer token", async () => {
  const json = { plan: "free", chat_used: 3, chat_limit: 25, photo_used: 0, photo_limit: 0 };
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => json })) as any;
  const out = await getEntitlements(fakeSupabase);
  expect(out.plan).toBe("free");
  const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
  expect(url).toBe("https://api.test/api/v1/me/entitlements");
  expect(opts.headers.Authorization).toBe("Bearer tok");
});

test("createPayment posts plan and returns snap data", async () => {
  const json = { snap_token: "tok-1", redirect_url: "https://snap/x", amount: 29000 };
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => json })) as any;
  const out = await createPayment(fakeSupabase, "monthly");
  expect(out.redirect_url).toBe("https://snap/x");
  const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
  expect(url).toBe("https://api.test/api/v1/payments/create");
  expect(JSON.parse(opts.body)).toEqual({ plan: "monthly" });
});

test("getPricing returns tier + prices", async () => {
  const json = { tier: "promo", monthly: 29000, yearly: 249000 };
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => json })) as any;
  const out = await getPricing(fakeSupabase);
  expect(out.tier).toBe("promo");
});
```

- [ ] **Step 2: Jalankan, gagal** → FAIL (modul belum ada)
- [ ] **Step 3: Implementasi**

```ts
// apps/mobile/src/services/billing.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getApiBaseUrl } from "./receipt-intake";

export type Entitlements = {
  plan: "free" | "premium";
  period_ym: string;
  chat_used: number;
  chat_limit: number;
  photo_used: number;
  photo_limit: number;
};

export type Pricing = { tier: "promo" | "normal"; monthly: number; yearly: number };
export type CreatedPayment = {
  order_id: string; amount: number; price_tier: string; plan: string;
  snap_token: string; redirect_url: string;
};

async function authHeader(supabase: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
  return { Authorization: `Bearer ${token}` };
}

export async function getEntitlements(supabase: SupabaseClient): Promise<Entitlements> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/me/entitlements`, {
    headers: { ...(await authHeader(supabase)) },
  });
  if (!res.ok) throw new Error(`entitlements gagal (${res.status})`);
  return res.json();
}

export async function getPricing(supabase: SupabaseClient): Promise<Pricing> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/payments/pricing`, {
    headers: { ...(await authHeader(supabase)) },
  });
  if (!res.ok) throw new Error(`pricing gagal (${res.status})`);
  return res.json();
}

export async function createPayment(
  supabase: SupabaseClient, plan: "monthly" | "yearly",
): Promise<CreatedPayment> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/payments/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader(supabase)) },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error(`pembayaran gagal (${res.status})`);
  return res.json();
}
```

- [ ] **Step 4: Lulus** → `corepack pnpm --filter mobile test -- billing --runInBand` PASS
- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/services/billing.ts apps/mobile/src/services/billing.test.ts
git commit -m "feat(mobile): billing service (entitlements, pricing, create payment)"
```

---

### Task 3: Hook `useEntitlements`

**Files:**
- Create: `apps/mobile/src/hooks/useEntitlements.ts`
- Test: `apps/mobile/src/hooks/useEntitlements.test.tsx`

- [ ] **Step 1: Test gagal**

```tsx
// apps/mobile/src/hooks/useEntitlements.test.tsx
import { renderHook, waitFor } from "@testing-library/react-native";
import { useEntitlements } from "./useEntitlements";

jest.mock("../services/billing", () => ({
  getEntitlements: jest.fn(async () => ({
    plan: "free", period_ym: "2026-06", chat_used: 3, chat_limit: 25,
    photo_used: 0, photo_limit: 0,
  })),
}));
jest.mock("../lib/supabase", () => ({ supabase: {} }));

test("loads entitlements", async () => {
  const { result } = renderHook(() => useEntitlements());
  await waitFor(() => expect(result.current.data?.plan).toBe("free"));
  expect(result.current.data?.chat_limit).toBe(25);
});
```

- [ ] **Step 2: Jalankan, gagal** → FAIL
- [ ] **Step 3: Implementasi**

```ts
// apps/mobile/src/hooks/useEntitlements.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getEntitlements, type Entitlements } from "../services/billing";

export function useEntitlements() {
  const [data, setData] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getEntitlements(supabase));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh };
}
```

- [ ] **Step 4: Lulus** → PASS
- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/hooks/useEntitlements.ts apps/mobile/src/hooks/useEntitlements.test.tsx
git commit -m "feat(mobile): useEntitlements hook"
```

---

### Task 4: Layar Paywall `app/upgrade.tsx`

**Files:**
- Create: `apps/mobile/app/upgrade.tsx`
- Test: `apps/mobile/__tests__/upgrade-screen.test.tsx`

- [ ] **Step 1: Test gagal**

```tsx
// apps/mobile/__tests__/upgrade-screen.test.tsx
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import UpgradeScreen from "../app/upgrade";

jest.mock("../src/lib/supabase", () => ({ supabase: {} }));
const openMock = jest.fn(async () => ({ type: "dismiss" }));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: (...a: any[]) => openMock(...a) }));
const createMock = jest.fn(async () => ({ redirect_url: "https://snap/x", amount: 29000 }));
jest.mock("../src/services/billing", () => ({
  getPricing: jest.fn(async () => ({ tier: "promo", monthly: 29000, yearly: 249000 })),
  createPayment: (...a: any[]) => createMock(...a),
}));

test("shows promo prices and opens Snap on upgrade", async () => {
  const { getByText, getByTestId } = render(<UpgradeScreen />);
  await waitFor(() => getByText(/29.000/));
  fireEvent.press(getByTestId("upgrade-monthly"));
  await waitFor(() => expect(openMock).toHaveBeenCalledWith("https://snap/x"));
});
```

- [ ] **Step 2: Jalankan, gagal** → FAIL
- [ ] **Step 3: Implementasi**

```tsx
// apps/mobile/app/upgrade.tsx
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
      <Text>Foto struk OCR · chat AI 200/bulan · AI Insight</Text>

      <Pressable testID="upgrade-monthly" disabled={busy !== null} onPress={() => buy("monthly")}>
        <Text>Bulanan {rp(pricing.monthly)}{busy === "monthly" ? " ..." : ""}</Text>
      </Pressable>
      <Pressable testID="upgrade-yearly" disabled={busy !== null} onPress={() => buy("yearly")}>
        <Text>Tahunan {rp(pricing.yearly)} (hemat 2 bulan){busy === "yearly" ? " ..." : ""}</Text>
      </Pressable>
    </View>
  );
}
```

> Styling mengikuti design tokens Kaswise (matte black + neon emerald); samakan dgn komponen lain saat implementasi. Test hanya memverifikasi perilaku, bukan gaya.

- [ ] **Step 4: Lulus** → PASS
- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/upgrade.tsx apps/mobile/__tests__/upgrade-screen.test.tsx
git commit -m "feat(mobile): paywall/upgrade screen opens Midtrans Snap"
```

---

### Task 5: Gating UI di `capture.tsx`

**Files:**
- Modify: `apps/mobile/app/(tabs)/capture.tsx`
- Test: `apps/mobile/__tests__/capture-gating.test.tsx`

Perilaku:
- Tampilkan sisa kuota chat (free): "Chat AI: {used}/{limit}".
- Tab **Foto**: jika `photo_limit === 0` (free) → tampil gembok; tekan → `router.push("/upgrade")` (tidak memanggil OCR).
- Saat panggilan AI balas **402/429**, arahkan ke `/upgrade` (chat habis / premium-only) atau tampilkan pesan fair-use.

- [ ] **Step 1: Test gagal (komponen kecil pembungkus logika gating)**

Ekstrak keputusan gating ke fungsi murni agar mudah diuji:
```tsx
// apps/mobile/__tests__/capture-gating.test.tsx
import { photoLocked, quotaLabel } from "../app/(tabs)/capture";

test("photo locked when limit 0 (free)", () => {
  expect(photoLocked({ photo_limit: 0 } as any)).toBe(true);
  expect(photoLocked({ photo_limit: 100 } as any)).toBe(false);
});

test("quota label shows used/limit", () => {
  expect(quotaLabel({ chat_used: 3, chat_limit: 25 } as any)).toBe("Chat AI: 3/25");
});
```

- [ ] **Step 2: Jalankan, gagal** → FAIL (export belum ada)
- [ ] **Step 3: Tambah helper murni + wiring di `capture.tsx`**

Tambahkan ekspor helper (di atas komponen):
```tsx
import type { Entitlements } from "../../src/hooks/useEntitlements";
// ... atau import dari services/billing
export function photoLocked(ent: { photo_limit: number } | null): boolean {
  return !!ent && ent.photo_limit === 0;
}
export function quotaLabel(ent: { chat_used: number; chat_limit: number } | null): string {
  return ent ? `Chat AI: ${ent.chat_used}/${ent.chat_limit}` : "";
}
```
Di komponen `capture.tsx`:
- `const { data: ent, refresh } = useEntitlements();`
- Render `quotaLabel(ent)` di header capture.
- Saat user pilih tab **Foto** dan `photoLocked(ent)` → `router.push("/upgrade")` alih-alih membuka picker.
- Di handler submit (teks & foto), bila `response.status === 402` → `router.push("/upgrade")`; bila `429` → tampilkan pesan ("Batas wajar tercapai, coba lagi bulan depan"). Setelah sukses simpan → `refresh()` untuk perbarui kuota.

(`useEntitlements` dari Task 3; `router` dari `expo-router`.)

- [ ] **Step 4: Lulus** → `corepack pnpm --filter mobile test -- capture-gating --runInBand` PASS
- [ ] **Step 5: Commit**

```bash
git add "apps/mobile/app/(tabs)/capture.tsx" apps/mobile/__tests__/capture-gating.test.tsx
git commit -m "feat(mobile): capture quota label + photo paywall gating"
```

---

### Task 6: Status plan di `settings.tsx`

**Files:**
- Modify: `apps/mobile/app/(tabs)/settings.tsx`
- Test: `apps/mobile/__tests__/settings-plan.test.tsx`

- [ ] **Step 1: Test gagal (helper murni untuk label status)**

```tsx
// apps/mobile/__tests__/settings-plan.test.tsx
import { planStatusLabel } from "../app/(tabs)/settings";

test("free plan label", () => {
  expect(planStatusLabel({ plan: "free" } as any)).toBe("Gratis");
});
test("premium plan label", () => {
  expect(planStatusLabel({ plan: "premium" } as any)).toBe("Premium aktif");
});
test("null while loading", () => {
  expect(planStatusLabel(null)).toBe("...");
});
```

- [ ] **Step 2: Jalankan, gagal** → FAIL
- [ ] **Step 3: Tambah helper + section di `settings.tsx`**

```tsx
export function planStatusLabel(ent: { plan: string } | null): string {
  if (!ent) return "...";
  return ent.plan === "premium" ? "Premium aktif" : "Gratis";
}
```
Di komponen settings: pakai `useEntitlements`, tampilkan section "Paket" → `planStatusLabel(ent)`; jika free → tombol "Upgrade ke Premium" → `router.push("/upgrade")`; jika premium → tampilkan masa berlaku + tombol "Perpanjang" → `/upgrade`.

- [ ] **Step 4: Lulus** → PASS
- [ ] **Step 5: Commit**

```bash
git add "apps/mobile/app/(tabs)/settings.tsx" apps/mobile/__tests__/settings-plan.test.tsx
git commit -m "feat(mobile): plan status + upgrade entry in settings"
```

---

### Task 7: Refresh setelah bayar + regresi

**Files:**
- Modify: `apps/mobile/app/upgrade.tsx` (refresh entitlement saat browser ditutup), `apps/mobile/app/(tabs)/capture.tsx`

- [ ] **Step 1: Tambah refresh pasca-Snap**

Di `upgrade.tsx` setelah `WebBrowser.openBrowserAsync` selesai (browser ditutup), panggil ulang status agar UI ter-update saat user kembali — gunakan `getEntitlements` atau navigasi balik + `useEntitlements().refresh()` di layar tujuan. Karena webhook mengaktifkan premium async, beri sedikit jeda + opsi "Saya sudah bayar / Refresh" yang memanggil `GET /payments/{order_id}/status` lewat service (tambahkan `getPaymentStatus(supabase, orderId)` di `billing.ts` jika perlu).

```ts
// tambahan di billing.ts
export async function getPaymentStatus(supabase: SupabaseClient, orderId: string) {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/payments/${orderId}/status`, {
    headers: { ...(await authHeader(supabase)) },
  });
  if (!res.ok) throw new Error(`status gagal (${res.status})`);
  return res.json() as Promise<{ order_id: string; status: string }>;
}
```
Di `upgrade.tsx`: simpan `order_id` dari `createPayment`, setelah browser dismiss panggil `getPaymentStatus` (fallback bila webhook telat), jika `paid` → tampilkan sukses + arahkan balik.

- [ ] **Step 2: Test service tambahan**

```ts
// tambah di apps/mobile/src/services/billing.test.ts
test("getPaymentStatus hits status endpoint", async () => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200,
    json: async () => ({ order_id: "kw-x", status: "paid" }) })) as any;
  const out = await getPaymentStatus(fakeSupabase, "kw-x");
  expect(out.status).toBe("paid");
  expect((global.fetch as jest.Mock).mock.calls[0][0])
    .toBe("https://api.test/api/v1/payments/kw-x/status");
});
```

- [ ] **Step 3: Lulus + regresi penuh**

Run: `corepack pnpm --filter mobile test -- --runInBand`
Expected: semua PASS.

- [ ] **Step 4: Type-check & build mobile**

Run: `corepack pnpm --filter mobile type-check`
Expected: PASS. (Bila ada, jalankan juga lint.)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/services/billing.ts apps/mobile/src/services/billing.test.ts apps/mobile/app/upgrade.tsx
git commit -m "feat(mobile): post-payment status refresh (webhook fallback)"
```

---

### Task 8: Verifikasi manual end-to-end (sandbox)

- [ ] **Step 1: Jalankan PWA + backend sandbox**, login akun uji (free).
- [ ] **Step 2:** Capture → header menampilkan "Chat AI: x/25"; tab Foto → gembok → buka `/upgrade`.
- [ ] **Step 3:** Di `/upgrade` tekan Bulanan → Snap terbuka (QRIS sandbox) → bayar simulator.
- [ ] **Step 4:** Kembali ke app → tekan "Refresh"/status → `paid`; capture kini tab Foto terbuka, "Chat AI: x/200"; Settings → "Premium aktif".
- [ ] **Step 5:** Set akun balik ke free (DB) → foto terkunci lagi. Catat hasil.

---

## Selesai (3/3)
Setelah Plan 1–3: freemium aktif end-to-end dengan pembayaran otomatis (sandbox). Go-live menunggu **approval merchant Midtrans** lalu flip `MIDTRANS_IS_PRODUCTION=true`. Deploy backend + PWA mengikuti prosedur `DEPLOY_VPS_HANDOVER.md` / `deploy:pwa`, atas persetujuan eksplisit.
