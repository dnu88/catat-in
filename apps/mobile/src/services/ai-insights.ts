import type { SupabaseClient } from "@supabase/supabase-js";
import { authHeader, getApiBaseUrl } from "./api-client";

export type AiInsight = {
  period: string;
  generated_at: string;
  summary: string;
  highlights: string[];
  recommendations: string[];
  risk_flags: string[];
  data_quality: {
    transaction_count: number;
    has_previous_period?: boolean;
    other_category_percent?: number;
  };
};

export class AiInsightPremiumRequiredError extends Error {
  constructor() {
    super("Fitur ini hanya tersedia untuk pengguna Premium.");
    this.name = "AiInsightPremiumRequiredError";
  }
}

function toBackendInsightPeriod(period: string) {
  if (period === "month") return "monthly";
  return period;
}

export async function getAiInsight(
  supabase: SupabaseClient,
  period: string = "monthly",
): Promise<AiInsight> {
  const backendPeriod = toBackendInsightPeriod(period);
  const res = await fetch(`${getApiBaseUrl()}/api/v1/ai/insight`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader(supabase)),
    },
    body: JSON.stringify({ period: backendPeriod }),
  });

  if (res.status === 402 || res.status === 403) {
    throw new AiInsightPremiumRequiredError();
  }
  if (!res.ok) throw new Error(`Gagal memuat insight AI (${res.status})`);
  return res.json();
}
