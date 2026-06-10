import type { SupabaseClient } from "@supabase/supabase-js";
import { authHeader, getApiBaseUrl } from "./api-client";

// ── Types ────────────────────────────────────────────────────────────────

export type NotificationPreferences = {
  enabled: boolean;
  daily_reminder_enabled: boolean;
  daily_reminder_time: string;
  budget_alert_enabled: boolean;
  budget_alert_thresholds: number[];
  weekly_summary_enabled: boolean;
  weekly_summary_day: number;
  weekly_summary_time: string;
  ai_insight_enabled: boolean;
  bill_reminder_enabled: boolean;
  timezone: string;
  push_enabled: boolean;
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type NotificationListResponse = {
  items: NotificationItem[];
  unread_count: number;
};

// ── Preferences ──────────────────────────────────────────────────────────

export async function getNotificationPreferences(
  supabase: SupabaseClient
): Promise<NotificationPreferences> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/notifications/preferences`,
    { headers: { ...(await authHeader(supabase)) } }
  );
  if (!res.ok)
    throw new Error(`Gagal memuat preferensi notifikasi (${res.status})`);
  return res.json();
}

export async function updateNotificationPreferences(
  supabase: SupabaseClient,
  patch: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/notifications/preferences`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader(supabase)),
      },
      body: JSON.stringify(patch),
    }
  );
  if (!res.ok)
    throw new Error(`Gagal menyimpan preferensi notifikasi (${res.status})`);
  return res.json();
}

// ── Notification list ────────────────────────────────────────────────────

export async function listNotifications(
  supabase: SupabaseClient,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<NotificationListResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.unreadOnly) params.set("unreadOnly", "true");
  const qs = params.toString();
  const url = `${getApiBaseUrl()}/api/v1/notifications${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: { ...(await authHeader(supabase)) },
  });
  if (!res.ok)
    throw new Error(`Gagal memuat notifikasi (${res.status})`);
  return res.json();
}

// ── Unread count ─────────────────────────────────────────────────────────

export async function getUnreadNotificationCount(
  supabase: SupabaseClient
): Promise<number> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/notifications/unread-count`,
    { headers: { ...(await authHeader(supabase)) } }
  );
  if (!res.ok)
    throw new Error(`Gagal memuat jumlah notifikasi (${res.status})`);
  const data = await res.json();
  return data.unread_count ?? 0;
}

// ── Mark read ────────────────────────────────────────────────────────────

export async function markNotificationRead(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/notifications/${id}/read`,
    {
      method: "PATCH",
      headers: { ...(await authHeader(supabase)) },
    }
  );
  if (!res.ok)
    throw new Error(`Gagal menandai notifikasi terbaca (${res.status})`);
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient
): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/notifications/read-all`,
    {
      method: "PATCH",
      headers: { ...(await authHeader(supabase)) },
    }
  );
  if (!res.ok)
    throw new Error(`Gagal menandai semua terbaca (${res.status})`);
}
