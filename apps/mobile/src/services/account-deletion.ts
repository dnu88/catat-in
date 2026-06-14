import type { SupabaseClient } from "@supabase/supabase-js";

import { authHeader, getApiBaseUrl } from "./api-client";

export type AccountDeletionRequestStatus =
  | "pending"
  | "in_review"
  | "completed"
  | "rejected"
  | "cancelled";

export type AccountDeletionRequestItem = {
  id: string;
  user_id: string;
  email: string;
  status: AccountDeletionRequestStatus;
  reason: string | null;
  details: string | null;
  review_notes: string | null;
  requested_at: string;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AccountDeletionRequestEnvelope = {
  request: AccountDeletionRequestItem | null;
};

export type AccountDeletionSubmitResponse = {
  request: AccountDeletionRequestItem;
  created: boolean;
};

export async function getLatestAccountDeletionRequest(
  supabase: SupabaseClient,
): Promise<AccountDeletionRequestEnvelope> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/me/account-deletion-request`, {
    headers: { ...(await authHeader(supabase)) },
  });
  if (!res.ok) {
    throw new Error(`gagal memuat status penghapusan akun (${res.status})`);
  }
  return res.json();
}

export async function submitAccountDeletionRequest(
  supabase: SupabaseClient,
  payload: { confirm_email: string; reason?: string; details?: string },
): Promise<AccountDeletionSubmitResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/me/account-deletion-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader(supabase)),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = `pengajuan penghapusan akun gagal (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string" && data.detail.trim()) {
        detail = data.detail.trim();
      }
    } catch {
      // keep fallback detail
    }
    throw new Error(detail);
  }

  return res.json();
}
