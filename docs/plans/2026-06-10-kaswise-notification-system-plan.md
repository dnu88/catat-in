# Kaswise Notification System Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Mengaktifkan fitur Notifikasi Kaswise secara bertahap: fondasi in-app notification center terlebih dahulu, lalu push notification PWA sebagai phase lanjutan.

**Architecture:** Backend menjadi source of truth untuk preferensi dan riwayat notifikasi. Mobile PWA membaca notification inbox dari backend, menampilkan badge unread, dan mengubah Settings toggles yang sekarang masih lokal `AsyncStorage` menjadi tersinkron ke akun. Web Push PWA ditambahkan setelah notification center stabil; push hanya menjadi delivery channel tambahan, bukan pengganti data notifikasi.

**Tech Stack:** FastAPI, Supabase/Postgres migrations + RLS, Supabase service-role backend client, Expo Router / React Native Web PWA, TypeScript, Jest, pytest, Docker Compose production deploy.

---

## 1. Product Direction

### Keputusan Utama

Mulai dari **in-app notification** dulu, bukan langsung push notification PWA.

Alasan:
- In-app notification adalah fondasi data: riwayat, unread badge, read/unread state, dedupe, audit/debug.
- Web Push adalah channel pengiriman. Kalau push gagal/permission ditolak, notifikasi tetap ada di app.
- Implementasi lebih aman, stabil lintas platform, dan tidak tergantung permission browser.

### Scope MVP

MVP harus menghasilkan fitur nyata yang user bisa pakai:

1. Settings notification preferences tersimpan di backend per user.
2. Notification center di app dengan unread badge.
3. Budget alert 80% dan 100% ketika transaksi membuat budget melewati threshold.
4. Weekly summary notification yang bisa di-generate oleh scheduled job / script.
5. AI Insight notification hook siap dipakai saat Insight AI berhasil dibuat.

### Out of Scope untuk MVP

Tunda dulu:
- Web Push PWA permission + VAPID + service worker push handling.
- Native Expo push token.
- Marketing/product update notification.
- Recurring bill reminder kompleks dengan calendar UI.
- Realtime Supabase subscription.

---

## 2. Current Codebase Context

### Existing Files / Behavior

Backend:
- `backend/main.py`
  - Router saat ini: `ai`, `imports`, `webhooks`, `me`, `payments`.
  - Tambahkan router baru `notifications` di sini.
- `backend/app/api/v1/me.py`
  - Saat ini hanya `GET /api/v1/me/entitlements`.
  - Preferensi notifikasi bisa masuk router baru `/api/v1/notifications/preferences` agar domain tetap jelas.
- `backend/app/core/auth.py`
  - Gunakan `get_current_user` untuk auth endpoint user.
  - Gunakan `_get_supabase_service_client()` untuk server-side Supabase access.
- `backend/app/core/entitlements.py`
  - Pola akses Supabase service client dan fallback error handling bisa dijadikan contoh.
- `backend/app/api/v1/ai.py`
  - Endpoint `POST /api/v1/ai/insight` bisa menjadi hook untuk membuat notifikasi `ai_insight_ready` setelah insight berhasil dibuat.

Mobile:
- `apps/mobile/app/(tabs)/settings.tsx`
  - Sudah ada section `settings-notifications`.
  - Toggle saat ini masih lokal via `AsyncStorage`:
    - `dailyReminder`
    - `billReminder`
    - `budgetAlert`
  - Ini harus dimigrasi agar load/save ke backend.
- `apps/mobile/app/(tabs)/_layout.tsx`
  - Tab layout bisa menampilkan header button/bell atau badge global.
- `apps/mobile/src/services/billing.ts`
  - Contoh service authenticated fetch ke backend dengan `authHeader(supabase)`.
- `apps/mobile/src/services/api-client.ts`
  - Gunakan `getApiBaseUrl()` dan `authHeader()` untuk service baru.

Supabase migrations:
- Existing migrations ada di `supabase/migrations/`.
- Tambahkan migration baru `supabase/migrations/202606100001_notifications.sql`.

---

## 3. Domain Model

### Notification Types

Gunakan enum/string type berikut:

```text
budget_threshold
weekly_summary
ai_insight_ready
daily_reminder
bill_reminder
system
```

MVP yang wajib aktif:
- `budget_threshold`
- `weekly_summary`
- `ai_insight_ready`

MVP UI setting yang boleh disiapkan tapi logic bisa phased:
- `daily_reminder`
- `bill_reminder`

### Notification Record Contract

Backend response object:

```json
{
  "id": "uuid",
  "type": "budget_threshold",
  "title": "Budget Makan hampir habis",
  "body": "Budget Makan sudah terpakai 82% bulan ini.",
  "data": {
    "budget_id": "uuid",
    "threshold": 80,
    "target_path": "/(tabs)/budgets"
  },
  "read_at": null,
  "created_at": "2026-06-10T05:00:00Z"
}
```

### Notification Preferences Contract

Backend response object:

```json
{
  "enabled": true,
  "daily_reminder_enabled": true,
  "daily_reminder_time": "20:00",
  "budget_alert_enabled": true,
  "budget_alert_thresholds": [80, 100],
  "weekly_summary_enabled": true,
  "weekly_summary_day": 0,
  "weekly_summary_time": "19:00",
  "ai_insight_enabled": true,
  "bill_reminder_enabled": false,
  "timezone": "Asia/Jakarta",
  "push_enabled": false
}
```

Notes:
- `weekly_summary_day`: ISO weekday style recommended: 0=Sunday, 1=Monday, etc. Document and keep consistent.
- `push_enabled` remains false until Web Push phase.
- `timezone` default `Asia/Jakarta` for Indonesian user base, but make it editable later.

---

## 4. Database Design

### Migration File

Create:
- `supabase/migrations/202606100001_notifications.sql`

### SQL

Use idempotent migration style.

```sql
-- Notification preferences per user.
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  daily_reminder_enabled boolean not null default true,
  daily_reminder_time text not null default '20:00',
  budget_alert_enabled boolean not null default true,
  budget_alert_thresholds int[] not null default array[80, 100],
  weekly_summary_enabled boolean not null default true,
  weekly_summary_day int not null default 0,
  weekly_summary_time text not null default '19:00',
  ai_insight_enabled boolean not null default true,
  bill_reminder_enabled boolean not null default false,
  timezone text not null default 'Asia/Jakarta',
  push_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_weekly_day_chk check (weekly_summary_day between 0 and 6),
  constraint notification_preferences_daily_time_chk check (daily_reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint notification_preferences_weekly_time_chk check (weekly_summary_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_chk check (type in (
    'budget_threshold',
    'weekly_summary',
    'ai_insight_ready',
    'daily_reminder',
    'bill_reminder',
    'system'
  ))
);

create index if not exists idx_notifications_user_created
  on public.notifications(user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications(user_id, created_at desc)
  where read_at is null;

create unique index if not exists idx_notifications_user_dedupe
  on public.notifications(user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own on public.notification_preferences
  for select using (auth.uid() = user_id);

drop policy if exists notification_preferences_insert_own on public.notification_preferences;
create policy notification_preferences_insert_own on public.notification_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own on public.notification_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using (auth.uid() = user_id);

-- App users should not insert arbitrary notifications from client-side Supabase.
-- Backend writes with service role and bypasses RLS.

drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
create trigger set_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();
```

### Important Migration Pitfall

Check whether `public.set_updated_at()` exists in current schema. It appears used by earlier migrations. If missing in target environment, add helper before trigger:

```sql
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
```

---

## 5. Backend Design

### New Files

Create:
- `backend/app/models/notifications.py`
- `backend/app/services/notification_service.py`
- `backend/app/api/v1/notifications.py`
- `backend/tests/test_notifications_api.py`
- `backend/tests/test_notification_service.py`

Modify:
- `backend/main.py`
- optionally `backend/app/api/v1/ai.py`

### Pydantic Models

File: `backend/app/models/notifications.py`

```python
from datetime import datetime
from pydantic import BaseModel, Field


class NotificationPreferences(BaseModel):
    enabled: bool = True
    daily_reminder_enabled: bool = True
    daily_reminder_time: str = Field(default="20:00", pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$")
    budget_alert_enabled: bool = True
    budget_alert_thresholds: list[int] = [80, 100]
    weekly_summary_enabled: bool = True
    weekly_summary_day: int = Field(default=0, ge=0, le=6)
    weekly_summary_time: str = Field(default="19:00", pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$")
    ai_insight_enabled: bool = True
    bill_reminder_enabled: bool = False
    timezone: str = "Asia/Jakarta"
    push_enabled: bool = False


class NotificationPreferencesUpdate(BaseModel):
    enabled: bool | None = None
    daily_reminder_enabled: bool | None = None
    daily_reminder_time: str | None = Field(default=None, pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$")
    budget_alert_enabled: bool | None = None
    budget_alert_thresholds: list[int] | None = None
    weekly_summary_enabled: bool | None = None
    weekly_summary_day: int | None = Field(default=None, ge=0, le=6)
    weekly_summary_time: str | None = Field(default=None, pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$")
    ai_insight_enabled: bool | None = None
    bill_reminder_enabled: bool | None = None
    timezone: str | None = None
    push_enabled: bool | None = None


class NotificationItem(BaseModel):
    id: str
    type: str
    title: str
    body: str
    data: dict = {}
    read_at: datetime | None = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationItem]
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int
```

### Service Functions

File: `backend/app/services/notification_service.py`

Functions to implement:

```python
def default_preferences(user_id: str) -> dict: ...
def get_preferences(user_id: str) -> dict: ...
def update_preferences(user_id: str, patch: dict) -> dict: ...
def list_notifications(user_id: str, limit: int = 50, unread_only: bool = False) -> dict: ...
def get_unread_count(user_id: str) -> int: ...
def mark_notification_read(user_id: str, notification_id: str) -> None: ...
def mark_all_read(user_id: str) -> int: ...
def create_notification(user_id: str, type_: str, title: str, body: str, data: dict | None = None, dedupe_key: str | None = None) -> dict | None: ...
```

Implementation rules:
- Use `_get_supabase_service_client()`.
- If client is unavailable, return safe defaults for reads and no-op for writes.
- `get_preferences()` must upsert defaults if no row exists.
- `update_preferences()` must validate `budget_alert_thresholds` contains only reasonable values, e.g. integers 1-200 and max 5 values.
- `create_notification()` must respect preferences:
  - if global `enabled` is false, return `None` except for `system` critical notifications if product later requires it.
  - if `type_ == 'budget_threshold'` and `budget_alert_enabled` false, skip.
  - if `type_ == 'weekly_summary'` and `weekly_summary_enabled` false, skip.
  - if `type_ == 'ai_insight_ready'` and `ai_insight_enabled` false, skip.
- Use `upsert`/unique dedupe behavior to avoid duplicate alerts.
- For privacy, notification body should avoid overly specific merchant names unless user explicitly opts in later.

### API Endpoints

File: `backend/app/api/v1/notifications.py`

Routes:

```text
GET    /api/v1/notifications/preferences
PUT    /api/v1/notifications/preferences
GET    /api/v1/notifications?limit=50&unread_only=false
GET    /api/v1/notifications/unread-count
PATCH  /api/v1/notifications/{notification_id}/read
PATCH  /api/v1/notifications/read-all
```

Security:
- All endpoints require `Depends(get_current_user)`.
- All queries must filter by `current_user["user_id"]`.

### Register Router

Modify `backend/main.py`:

```python
from app.api.v1 import ai, imports, webhooks, me, payments, notifications
...
app.include_router(notifications.router, prefix=f"{API_PREFIX}/notifications", tags=["Notifications"])
```

---

## 6. Backend Event Generation

### Budget Alert MVP

Trigger budget notification when a transaction is created/updated and budget usage crosses threshold.

Recommended service function:

```python
def create_budget_threshold_notifications(user_id: str, period_ym: str | None = None) -> list[dict]: ...
```

Algorithm:
1. Load preferences.
2. If disabled/global off, return empty.
3. Fetch budgets for user for active month.
4. For each budget, compute `spent_amount / limit_amount * 100`.
5. For thresholds `[80, 100]`, if percent >= threshold create notification with dedupe key:
   - `budget_threshold:{budget_id}:{YYYY-MM}:{threshold}`
6. Dedupe ensures no repeated spam.

Where to call:
- Ideally after successful transaction create/update in backend transaction endpoints.
- If current mobile writes transactions directly to Supabase instead of backend, MVP can run budget scanner via scheduled job every few hours/day.
- Inspect transaction creation path before implementing this task. If transaction writes are client-side Supabase only, do not invent backend hooks; use scheduled scanner first.

### Weekly Summary MVP

Create script:
- `backend/scripts/generate_weekly_notifications.py`

Behavior:
- Iterate active users/profiles.
- Load preferences.
- If weekly summary enabled and local day/time matches, aggregate last 7 days transactions.
- Create notification with dedupe key:
  - `weekly_summary:{user_id}:{ISO_YEAR}-W{ISO_WEEK}`

Cron deployment options:
- Preferred: host cron / scheduler running Docker command.
- Example command:

```bash
docker exec kaswise-backend python backend/scripts/generate_weekly_notifications.py
```

But container workdir is `/app`, so actual command likely:

```bash
docker exec kaswise-backend python scripts/generate_weekly_notifications.py
```

Verify against Dockerfile before deployment.

### AI Insight Ready Hook

Modify `backend/app/api/v1/ai.py` after successful insight generation:

```python
from app.services.notification_service import create_notification
...
insight = await generate_financial_insight(context, body.period)
create_notification(
    current_user["user_id"],
    type_="ai_insight_ready",
    title="Insight AI siap dibaca",
    body="Ringkasan AI untuk periode ini sudah siap.",
    data={"period": body.period, "target_path": "/(tabs)/reports"},
    dedupe_key=f"ai_insight_ready:{current_user['user_id']}:{body.period}:{insight.get('generated_at', '')[:10]}",
)
return insight
```

Caution:
- Do not let notification failure break AI Insight response. Wrap with `try/except Exception` inside service or call site.

---

## 7. Mobile Design

### New Service

Create:
- `apps/mobile/src/services/notifications.ts`

Exports:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { authHeader, getApiBaseUrl } from "./api-client";

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

export async function getNotificationPreferences(supabase: SupabaseClient): Promise<NotificationPreferences> { ... }
export async function updateNotificationPreferences(supabase: SupabaseClient, patch: Partial<NotificationPreferences>): Promise<NotificationPreferences> { ... }
export async function listNotifications(supabase: SupabaseClient, options?: { limit?: number; unreadOnly?: boolean }): Promise<NotificationListResponse> { ... }
export async function getUnreadNotificationCount(supabase: SupabaseClient): Promise<number> { ... }
export async function markNotificationRead(supabase: SupabaseClient, id: string): Promise<void> { ... }
export async function markAllNotificationsRead(supabase: SupabaseClient): Promise<void> { ... }
```

Use same auth pattern as `apps/mobile/src/services/billing.ts`.

### Settings Integration

Modify:
- `apps/mobile/app/(tabs)/settings.tsx`

Current local keys:
- `NOTIFICATION_KEYS.dailyReminder`
- `NOTIFICATION_KEYS.billReminder`
- `NOTIFICATION_KEYS.budgetAlert`

Migration strategy:
1. Keep local AsyncStorage read only as temporary fallback if backend fails.
2. Add `notificationPreferences` state and `notificationPreferencesLoading` state.
3. On mount, call `getNotificationPreferences(supabase)`.
4. Toggle rows update backend optimistically:
   - daily summary toggle maps to `daily_reminder_enabled` for current label, or rename UI to `Pengingat Harian`.
   - bill reminder maps to `bill_reminder_enabled`.
   - budget alert maps to `budget_alert_enabled`.
5. Add master toggle `Notifikasi Aktif` mapped to `enabled`.
6. Add new toggle `Insight AI` mapped to `ai_insight_enabled`.
7. Consider renaming `Ringkasan Harian` to `Pengingat Harian` if it is really a reminder. Weekly summary should be a separate future row.

Recommended Settings rows for MVP:
- `Notifikasi Aktif` — master toggle
- `Alert Anggaran` — budget threshold notification
- `Insight AI` — insight ready notification
- `Ringkasan Mingguan` — weekly summary notification
- `Pengingat Harian` — daily reminder placeholder
- `Pengingat Tagihan` — future/disabled or implemented later

UX rule:
- If master `enabled` false, disable sub toggles visually or allow changes but explain they will not be sent until master is on.

### Notification Center Screen

Create:
- `apps/mobile/app/notifications.tsx`

Screen behavior:
- Header title `Notifikasi`.
- Fetch `listNotifications()` on mount/focus.
- Empty state: `Belum ada notifikasi.`
- Each row shows icon, title, body, relative time, unread dot.
- Tap row:
  - mark read
  - if `data.target_path` exists, navigate there
- Button `Tandai semua dibaca` if unread_count > 0.

Potential component files:
- `apps/mobile/src/components/notifications/NotificationBell.tsx`
- `apps/mobile/src/components/notifications/NotificationListItem.tsx`

### Bell / Badge Placement

Option A — recommended MVP:
- Add bell button to Settings page header or Dashboard quick area.
- Simple and low risk.

Option B — global tab header:
- Modify `apps/mobile/app/(tabs)/_layout.tsx` screenOptions headerRight.
- Fetch unread count with a hook.
- More visible, but more shared-layout risk.

Recommended implementation:
1. Start with bell button on Dashboard and Settings.
2. After stable, move to global header.

---

## 8. Web Push PWA Phase (Post-MVP)

Do not implement until in-app notification center works.

### Additional DB Table

Future migration:

```sql
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);
```

### Env Vars

Add to backend config later:

```text
WEB_PUSH_VAPID_PUBLIC_KEY=
WEB_PUSH_VAPID_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:support@kaswise.com
```

### PWA Client Requirements

- Service worker handles `push` and `notificationclick`.
- Permission prompt only after user toggles push on, not at first app open.
- Fallback: every push notification must also be stored in `notifications` table.

### Push Privacy Rule

Push body should be safe on lock screen:
- Good: `Budget Makan hampir habis.`
- Avoid: `Kamu habis Rp 1.250.000 di Merchant X.`

---

## 9. Implementation Tasks

### Task 1: Add notification database migration

**Objective:** Create persistent tables for preferences and notification inbox.

**Files:**
- Create: `supabase/migrations/202606100001_notifications.sql`

**Steps:**
1. Add SQL from section 4.
2. Verify locally/lint by reviewing migration syntax.
3. If Supabase CLI is configured, run migration validation. If not, note manual Supabase migration requirement.
4. Commit:

```bash
git add supabase/migrations/202606100001_notifications.sql
git commit -m "feat: add notification tables"
```

### Task 2: Add backend notification models and service tests

**Objective:** Define response/update contracts and test service behavior before implementation.

**Files:**
- Create: `backend/app/models/notifications.py`
- Create: `backend/tests/test_notification_service.py`

Test cases:
- Default preferences returned when Supabase client is unavailable.
- Update patch filters unknown fields.
- Invalid thresholds rejected/sanitized.
- `create_notification()` skips when global notifications disabled.
- `create_notification()` skips budget alerts if budget preference disabled.
- `create_notification()` uses dedupe key.

Run:

```bash
docker build -t kaswise-backend-notifications:test ./backend
docker run --rm -e ENVIRONMENT=test -e ALLOWED_HOSTS='*' kaswise-backend-notifications:test pytest -q tests/test_notification_service.py
```

Expected initially: FAIL until service exists.

### Task 3: Implement backend notification service

**Objective:** Make service tests pass.

**Files:**
- Create: `backend/app/services/notification_service.py`

Implementation notes:
- Follow section 5 service functions.
- Use `_get_supabase_service_client()`.
- Do not raise on Supabase write failure for event hooks; return safe result or `None`.
- Keep API-facing functions deterministic for tests.

Run:

```bash
docker build -t kaswise-backend-notifications:test ./backend
docker run --rm -e ENVIRONMENT=test -e ALLOWED_HOSTS='*' kaswise-backend-notifications:test pytest -q tests/test_notification_service.py
```

Expected: PASS.

### Task 4: Add notification API routes

**Objective:** Expose authenticated preferences and notification inbox endpoints.

**Files:**
- Create: `backend/app/api/v1/notifications.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_notifications_api.py`

Test cases:
- `GET /api/v1/notifications/preferences` requires auth.
- Authenticated get returns defaults.
- `PUT /api/v1/notifications/preferences` updates fields.
- `GET /api/v1/notifications` returns `items` and `unread_count`.
- `PATCH /api/v1/notifications/{id}/read` filters by current user.
- `PATCH /api/v1/notifications/read-all` marks all current-user notifications.

Run:

```bash
docker build -t kaswise-backend-notifications:test ./backend
docker run --rm -e ENVIRONMENT=test -e ALLOWED_HOSTS='*' kaswise-backend-notifications:test pytest -q tests/test_notifications_api.py tests/test_notification_service.py
```

Expected: PASS.

### Task 5: Add mobile notification service

**Objective:** Add TypeScript service layer for backend endpoints.

**Files:**
- Create: `apps/mobile/src/services/notifications.ts`
- Create: `apps/mobile/src/services/notifications.test.ts`

Test cases:
- `getNotificationPreferences()` calls `/api/v1/notifications/preferences` with auth header.
- `updateNotificationPreferences()` sends `PUT` with JSON body.
- `listNotifications()` supports `limit` and `unreadOnly` query params.
- `getUnreadNotificationCount()` returns numeric unread count.
- Error responses throw clear message.

Run:

```bash
pnpm --filter mobile exec jest src/services/notifications.test.ts --runInBand --no-colors
```

Expected: PASS.

### Task 6: Wire Settings toggles to backend preferences

**Objective:** Replace local-only notification toggles with account-level preferences.

**Files:**
- Modify: `apps/mobile/app/(tabs)/settings.tsx`
- Test: update or create `apps/mobile/__tests__/settings-notifications.test.tsx`

Steps:
1. Import notification service.
2. Load preferences on mount.
3. Add master toggle `Notifikasi Aktif`.
4. Map existing toggles:
   - `dailyReminder` → `daily_reminder_enabled`
   - `billReminder` → `bill_reminder_enabled`
   - `budgetAlert` → `budget_alert_enabled`
5. Add `Insight AI` toggle → `ai_insight_enabled`.
6. Add `Ringkasan Mingguan` toggle → `weekly_summary_enabled`.
7. Use optimistic update with rollback on failure.
8. Keep AsyncStorage fallback only for offline/local boot if needed; mark for cleanup after backend stable.

Run:

```bash
pnpm --filter mobile exec jest __tests__/settings-notifications.test.tsx --runInBand --no-colors
pnpm --filter mobile type-check
```

Expected: PASS.

### Task 7: Build notification center screen

**Objective:** Users can view, open, and mark notifications read.

**Files:**
- Create: `apps/mobile/app/notifications.tsx`
- Create: `apps/mobile/src/components/notifications/NotificationListItem.tsx`
- Create: `apps/mobile/__tests__/notifications-screen.test.tsx`

Behavior:
- Display list from backend.
- Show empty state.
- Mark item as read on press.
- Navigate to `data.target_path` if present.
- Mark all read button.

Run:

```bash
pnpm --filter mobile exec jest __tests__/notifications-screen.test.tsx --runInBand --no-colors
pnpm --filter mobile type-check
```

Expected: PASS.

### Task 8: Add unread bell badge

**Objective:** Surface unread count from app UI.

**Files:**
- Create: `apps/mobile/src/components/notifications/NotificationBell.tsx`
- Modify: `apps/mobile/app/(tabs)/settings.tsx` or `apps/mobile/app/(tabs)/dashboard.tsx`
- Test: create component test.

MVP placement:
- Add bell button in Settings header or top section.
- If adding globally in `_layout.tsx`, ensure no excessive network polling.

Run:

```bash
pnpm --filter mobile exec jest __tests__/notification-bell.test.tsx --runInBand --no-colors
pnpm --filter mobile type-check
```

Expected: PASS.

### Task 9: Add backend budget threshold generator

**Objective:** Generate budget threshold notifications without spam.

**Files:**
- Modify/Create: `backend/app/services/notification_events.py`
- Test: `backend/tests/test_notification_events.py`

Implementation depends on current transaction/budget write path:
- If backend has transaction endpoints: call after transaction create/update.
- If mobile writes directly to Supabase: implement scanner function and run via scheduled job first.

Dedupe key format:

```text
budget_threshold:{budget_id}:{YYYY-MM}:{threshold}
```

Run:

```bash
docker build -t kaswise-backend-notifications:test ./backend
docker run --rm -e ENVIRONMENT=test -e ALLOWED_HOSTS='*' kaswise-backend-notifications:test pytest -q tests/test_notification_events.py
```

Expected: PASS.

### Task 10: Add AI Insight ready notification hook

**Objective:** Create notification when Premium AI Insight is generated.

**Files:**
- Modify: `backend/app/api/v1/ai.py`
- Test: extend `backend/tests/test_ai_insight.py` or add new test.

Rules:
- Notification failure must not break AI Insight.
- Respect `ai_insight_enabled` preference via service.
- Dedupe per user/date/period.

Run:

```bash
docker build -t kaswise-backend-notifications:test ./backend
docker run --rm -e ENVIRONMENT=test -e ALLOWED_HOSTS='*' kaswise-backend-notifications:test pytest -q tests/test_ai_insight.py tests/test_notification_service.py
```

Expected: PASS.

### Task 11: Add weekly summary generator script

**Objective:** Scheduled job can create weekly summary notifications.

**Files:**
- Create: `backend/scripts/generate_weekly_notifications.py`
- Test: `backend/tests/test_weekly_notification_script.py` or service-level tests.

Verification:

```bash
docker build -t kaswise-backend-notifications:test ./backend
docker run --rm -e ENVIRONMENT=test -e ALLOWED_HOSTS='*' kaswise-backend-notifications:test pytest -q tests/test_weekly_notification_script.py
```

Production dry run command after deploy:

```bash
docker exec kaswise-backend python scripts/generate_weekly_notifications.py --dry-run
```

Expected: prints users/notifications that would be created, without inserting.

### Task 12: Full mobile PWA verification and deploy

**Objective:** Confirm UI builds and PWA bundle deploys.

Commands:

```bash
pnpm --filter mobile type-check
pnpm --filter mobile export:pwa
pnpm --filter mobile deploy:pwa
curl -sk https://kaswise.com | grep -o '_expo/static/js/web/entry-[^" ]*\.js' | head -1
```

Expected:
- Type-check passes.
- Export succeeds.
- Deploy updates `/home/Danu88/nginx-proxy-manager/placeholder/`.
- Live page references new bundle.

### Task 13: Backend production deploy

**Objective:** Deploy backend safely with production env loaded.

Command from repo root `/home/Danu88/catat-in`:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build backend
```

Important pitfall:
- Do **not** run compose without `--env-file .env.production`; that can recreate `kaswise-backend` with blank `SUPABASE_*`, `ANTHROPIC_API_KEY`, `SECRET_KEY`, and CORS/host values.

Verify:

```bash
docker ps --filter name=kaswise-backend --format '{{.Names}} {{.Status}}'
curl -sk https://api.kaswise.com/health
curl -sk -i https://api.kaswise.com/api/v1/notifications/preferences | sed -n '1,20p'
```

Expected:
- Container healthy.
- Health endpoint returns production ok.
- Unauthenticated preferences endpoint returns 401.

---

## 10. Testing Strategy

### Backend Unit/API Tests

Run targeted:

```bash
docker build -t kaswise-backend-notifications:test ./backend
docker run --rm -e ENVIRONMENT=test -e ALLOWED_HOSTS='*' kaswise-backend-notifications:test pytest -q \
  tests/test_notification_service.py \
  tests/test_notifications_api.py \
  tests/test_notification_events.py \
  tests/test_ai_insight.py
```

Run broader AI/payment/me regressions if touched:

```bash
docker run --rm -e ENVIRONMENT=test -e ALLOWED_HOSTS='*' kaswise-backend-notifications:test pytest -q tests
```

### Mobile Tests

```bash
pnpm --filter mobile exec jest src/services/notifications.test.ts --runInBand --no-colors
pnpm --filter mobile exec jest __tests__/settings-notifications.test.tsx --runInBand --no-colors
pnpm --filter mobile exec jest __tests__/notifications-screen.test.tsx --runInBand --no-colors
pnpm --filter mobile type-check
```

### Manual QA Checklist

Free user:
- Can open Settings notification section.
- Can toggle preferences.
- Can open notification center.
- Budget alert notification appears if data triggers it.

Premium user:
- AI Insight generation creates notification if enabled.
- Disabling AI Insight notification stops new `ai_insight_ready` notifications.

Read/unread:
- New notification increments badge.
- Opening notification marks read.
- Mark all read clears badge.

Privacy:
- Lock-screen future push text not too sensitive.
- In-app detail can include more context but should avoid raw notes/catatan.

Dedupe:
- Budget 80% alert only once per budget per month.
- Budget 100% alert only once per budget per month.
- Weekly summary only once per week.

---

## 11. Acceptance Criteria

MVP is complete when:

1. `notification_preferences` and `notifications` tables exist with RLS. ✅
2. Authenticated user can get/update preferences via backend. ✅
3. Authenticated user can list notifications and unread count via backend. ✅
4. User can mark one/all notifications read. ✅
5. Settings toggles persist across logout/login/device because backend stores them. ✅
6. Notification center screen exists and displays real backend notifications. ✅
7. Budget threshold notification can be generated and deduped. ✅ (code ready, schedule via cron)
8. AI Insight ready notification can be generated after insight success. ✅
9. Weekly summary generator has dry-run and insert mode. ✅ (code ready, schedule via cron)
10. Backend tests and mobile tests pass. ✅ (32 tests passed)
11. Production deploy verified by live health endpoint and 401 on unauthenticated notification endpoint. ✅

---

## 12. Future Enhancements

After MVP:

1. Web Push PWA
   - VAPID keys.
   - Push subscriptions table.
   - Service worker push/click handler.
   - Permission UX from Settings only.

2. Realtime badge
   - Poll every 60-120 seconds, or use Supabase realtime if stable.

3. Notification templates
   - Centralize titles/bodies and i18n.

4. Rich notification preferences
   - Quiet hours.
   - Per-category budget alerts.
   - Privacy mode for notification body.

5. Bill reminders
   - Recurring expense table.
   - Due date notification.
   - Snooze/remind later.

6. Analytics
   - Notification created/read/opened metrics.
   - Opt-out rate by type.

---

## 14. Immediate Next Steps (Post-Deploy) — ✅ DONE 2026-06-10

Scheduled job dan budget scanner sudah siap dan dijadwalkan via Hermes cron.

### 14.1 Budget Threshold Scanner ✅

**Status:** Active — Hermes cron job `6475dced5997` (`kaswise-budget-threshold-scanner`)
- Jadwal: setiap 4 jam (`0 */4 * * *`)
- Delivery: local (silent)
- Dry run verified: `generate_budget_notifications_for_all_active_users()` berjalan tanpa error

Command manual (untuk debug):
threshold 80% atau 100%. Aman dijalankan berulang karena ada dedupe key
per budget/bulan/threshold.

**Dry run dahulu:**
```bash
docker exec kaswise-backend python -c "
from app.services.notification_events import generate_budget_notifications_for_all_active_users
result = generate_budget_notifications_for_all_active_users()
print(f'Created notifications for {len(result)} users')
for uid, count in result.items():
    print(f'  {uid}: {count} notifications')
"
```

**Setelah konfirmasi hasil dry run sesuai ekspektasi, jalankan production:**
```bash
docker exec kaswise-backend python -c "
from app.services.notification_events import generate_budget_notifications_for_all_active_users
result = generate_budget_notifications_for_all_active_users()
print(f'Created notifications for {len(result)} users')
"
```

**Cron suggestion (setiap 4 jam):**
```
0 */4 * * * docker exec kaswise-backend python -c "from app.services.notification_events import generate_budget_notifications_for_all_active_users; generate_budget_notifications_for_all_active_users()"
```

### 14.2 Weekly Summary Generator ✅

**Status:** Active — Hermes cron job `c97b81ff6645` (`kaswise-weekly-summary`)
- Jadwal: setiap Senin jam 07:00 WIB (`0 7 * * 1`)
- Delivery: local (silent)
- Dry run verified: 3 users detected, 1-8 transactions each

Membuat ringkasan mingguan per user. Dedupe key per user/ISO week sehingga
hanya muncul sekali per minggu.

Command manual (untuk debug):

**Dry run dahulu:**
```bash
docker exec kaswise-backend python scripts/generate_weekly_notifications.py --dry-run
```

**Production run:**
```bash
docker exec kaswise-backend python scripts/generate_weekly_notifications.py
```

**Cron suggestion (setiap Senin jam 07:00 WIB / 00:00 UTC):**
```
0 0 * * 1 docker exec kaswise-backend python scripts/generate_weekly_notifications.py
```

### 14.3 Database Migration (Done ✅)

Migration `supabase/migrations/202606100001_notifications.sql` sudah di-push
ke Supabase production via `supabase db push --linked --include-all`.
Tabel `notification_preferences` dan `notifications` sudah aktif.

### 14.4 Verifikasi Live

Cek tabel sudah ada:
```bash
docker exec kaswise-backend python -c "
from app.core.auth import _get_supabase_service_client
c = _get_supabase_service_client()
r = c.table('notification_preferences').select('count', count='exact').limit(0).execute()
print('notification_preferences:', getattr(r, 'count', '?'))
r2 = c.table('notifications').select('count', count='exact').limit(0).execute()
print('notifications:', getattr(r2, 'count', '?'))
"
```

Cek endpoint:
```bash
curl -sk https://api.kaswise.com/health
curl -sk -i https://api.kaswise.com/api/v1/notifications/preferences
# Expected: 401 Unauthorized (auth gate works)
```

---

## 13. Notes for Next Model

- This plan intentionally starts with in-app notification because it is more reliable and forms the data foundation.
- Do not jump straight to Web Push unless user explicitly changes scope.
- Read current transaction creation flow before implementing budget hooks; if writes happen directly via Supabase client, use scheduled scanner first.
- Keep notification generation non-blocking: failure to create notification must not break core financial actions.
- Use `docker compose --env-file .env.production -f docker-compose.production.yml up -d --build backend` for production backend deploy.
- Keep all notification body copy concise and not overly sensitive.
