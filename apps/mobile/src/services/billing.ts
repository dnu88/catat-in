import type { SupabaseClient } from "@supabase/supabase-js";
import { getApiBaseUrl } from "./receipt-intake";

export type Entitlements = {
  plan: "free" | "premium";
  plan_expires_at?: string | null;
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

export async function getPaymentStatus(
  supabase: SupabaseClient, orderId: string,
): Promise<{ order_id: string; status: string }> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/payments/${orderId}/status`, {
    headers: { ...(await authHeader(supabase)) },
  });
  if (!res.ok) throw new Error(`status gagal (${res.status})`);
  return res.json();
}
