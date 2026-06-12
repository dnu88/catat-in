# CLAUDE.md — Catat.in / Kaswise

Panduan untuk Claude Code agar langsung paham konteks project tanpa eksplorasi ulang.

> **✅ MIGRATION COMPLETE (2026-05-10):**  
> Migrasi dari Firebase/Firestore + FastAPI ke **Expo + Supabase Cloud** selesai.  
> **Mobile app** (`apps/mobile`) langsung query Supabase via client SDK — tidak lagi lewat backend.  
> **Backend FastAPI** (`backend/`) hanya menangani endpoint spesialis: AI, Import, Webhook.  
> **Legacy stack (`apps/web`)** dalam status MAINTENANCE-ONLY — tidak ada fitur baru.

## Struktur Monorepo

```
catat-in/
├── apps/web/          # [LEGACY] React + Vite (maintenance-only)
├── apps/mobile/       # [ACTIVE] Expo (Android/iOS/Web PWA) — mobile-first
├── backend/           # FastAPI Python — AI, Import, Webhook, Midtrans, Notifications
└── packages/shared/   # TypeScript types bersama
```

Package manager: **pnpm workspaces**. Selalu jalankan perintah dari root atau folder yang tepat.

## Tech Stack

### Active Stack (Kaswise v1.0 — Mobile-First)

| Layer               | Teknologi                                                        |
| ------------------- | ---------------------------------------------------------------- |
| Mobile              | Expo SDK 51, React Native 0.74, Expo Router, NativeWind v4       |
| Data Access         | Supabase Client SDK langsung dari mobile (CRUD via RLS policies) |
| Database            | Supabase PostgreSQL dengan RLS aktif di semua tabel              |
| Auth                | Supabase Auth (email/password + Google OAuth)                    |
| Backend (Spesialis) | FastAPI (Python 3.12) — hanya AI, Import, Webhook                |
| AI                  | Anthropic Claude (Haiku/Sonnet), OpenAI Whisper                  |
| State               | Zustand                                                          |

### Legacy Stack (Maintenance-Only)

| Layer    | Teknologi                                           |
| -------- | --------------------------------------------------- |
| Frontend | React 18, Vite, TypeScript, Zustand, Tailwind CSS   |
| Backend  | FastAPI (Python 3.12) — semua endpoint (deprecated) |
| Database | Cloud Firestore                                     |
| Auth     | Firebase Auth                                       |

## Arsitektur Data

### Active Stack (Supabase PostgreSQL)

Semua data user disimpan di tabel dengan **RLS aktif** dan foreign key ke `auth.users`:

```
profiles (extends auth.users)
  id, email, full_name, plan_type, plan_expires_at, created_at

transactions
  id, user_id, wallet_id, input_type (text|image|voice|import|manual)
  status (processing|done|error), confidence, review_required
  nominal, type (income|expense), kategori, merchant, tanggal, catatan
  receipt_url, is_verified, created_at, updated_at

wallets
  id, user_id, name, type (cash|bank|ewallet|investment)
  balance, currency, bank_name, account_number, is_active

budgets
  id, user_id, category, limit_amount, spent_amount (computed)
  period (monthly), period_start, notify_at_percent, is_active

bill_reminders
  id, user_id, name, amount, due_day, recurrence (monthly|yearly|once)
  next_due_date, notify_before_days, is_paid, payment_history (jsonb)

categories
  id, user_id, name, icon, is_default, budget_limit

groups
  id, name, owner_id, invite_code, max_members

group_members
  id, group_id, user_id, role (admin|member), joined_at
```

### Household finance context

Mobile supports two finance contexts: personal rows with `household_id = null`, and household rows with `household_id` set. Household access is controlled by `households`, `household_members`, and RLS roles `owner/admin/member/viewer`. Mobile service functions must apply the active finance context to every financial query.

### Legacy Stack (Firestore — Maintenance-Only)

Semua data user disimpan di sub-collection `users/{uid}/*`:

```
users/{uid}/
  wallets/        — saldo dompet, diupdate via increment() saat transaksi
  transactions/   — semua transaksi milik user
  budgets/        — anggaran per kategori per bulan
  bills/          — tagihan berulang (pengingat)
  categories/     — kategori kustom + default
  saved_views/    — filter tersimpan di halaman transaksi
  savings_goals/  — target tabungan
```

Shared group transactions disimpan di bawah `users/{pemilik}/transactions/` dengan field `is_shared: true` dan `group_id`. Grup itu sendiri ada di root collection `groups/` dan `group_members/`.

## State Management (Web)

Zustand stores di `apps/web/src/store/`:

- `transaction.store.ts` — CRUD transaksi, pagination
- `budget.store.ts` — CRUD budget, `spent_amount` dihitung dinamis
- `wallet.store.ts` — CRUD wallet, `totalBalance()`
- `bills.store.ts` — CRUD tagihan berulang
- `category.store.ts` — CRUD kategori
- `auth.store.ts` — session Firebase
- `i18n.store.ts` — bahasa (id/en)

Semua operasi Firestore ada di satu file: `apps/web/src/lib/firestore.ts`.

## Keputusan Desain Penting

### Budget: spent_amount dihitung dinamis (JANGAN simpan ke Firestore)

`listBudgets()` menghitung `spent_amount` secara real-time dari transaksi aktual, bukan dari field `spent_amount` yang tersimpan di dokumen budget. Field tersebut diinisialisasi ke `0` saat budget dibuat dan **tidak diupdate** ketika transaksi berubah — ini adalah desain yang disengaja setelah bug ditemukan (lihat bagian Bug Fixes).

Konsekuensi: setiap kali `fetchBudgets()` dipanggil, terjadi satu query tambahan ke koleksi `transactions`. Untuk skala personal finance ini acceptable.

### Wallet balance: disimpan sebagai running total + ada utilitas recalculate

Saldo wallet tetap diupdate via `increment(delta)` setiap kali transaksi dibuat/edit/hapus (`applyWalletDelta`) agar cepat. Jika ada data lama yang mismatch, sekarang tersedia utilitas `recalculateWalletBalances()` untuk menghitung ulang saldo semua wallet user dari histori transaksi di `users/{uid}/transactions`.

### Dashboard income/expense: dari buildMonthlyReport, bukan dari store transaksi

Store transaksi di dashboard hanya mengambil 5 transaksi terakhir (untuk list "transaksi terbaru"). Total pemasukan/pengeluaran bulan ini diambil dari `buildMonthlyReport()` secara terpisah agar mencakup semua transaksi bulan berjalan.

## Bug Fixes yang Sudah Dilakukan

### [2025-05] Budget spent_amount tidak pernah berkurang

- **File:** `apps/web/src/lib/firestore.ts` — `listBudgets()`
- **Root cause:** `createTransaction`, `patchTransaction`, `removeTransaction` tidak pernah mengupdate field `spent_amount` di dokumen budget. Field selalu bernilai 0.
- **Fix:** `listBudgets()` kini menghitung `spent_amount` secara dinamis dari semua transaksi user, difilter per kategori dan periode budget.

### [2025-05] Dashboard income/expense hanya dari 5 transaksi terakhir

- **File:** `apps/web/src/pages/DashboardPage.tsx`
- **Root cause:** `fetchTransactions({ per_page: 5 })` hanya mengambil 5 data, tapi totalnya dihitung dari array yang sama.
- **Fix:** Dashboard memanggil `buildMonthlyReport()` terpisah untuk mendapatkan total yang benar dari semua transaksi bulan berjalan.

### [2025-05] buildMonthlyReport tidak menyertakan shared group transactions

- **File:** `apps/web/src/lib/firestore.ts` — `buildMonthlyReport()`
- **Root cause:** Hanya mengambil dari `users/{uid}/transactions`, tidak termasuk transaksi bersama dari grup.
- **Fix:** Mengikuti pola yang sama dengan `listTransactions()` — gabungkan own + shared group transactions dengan deduplication.

### [2026-05] listBudgets belum menghitung shared group transactions

- **File:** `apps/web/src/lib/firestore.ts` — `listBudgets()`
- **Root cause:** Perhitungan `spent_amount` hanya dari transaksi milik sendiri.
- **Fix:** `listBudgets()` sekarang gabungkan own + shared group transactions (dedup) sebelum menghitung spent per kategori/periode.

### [2026-05] listBills menyembunyikan tagihan once yang sudah dibayar

- **File:** `apps/web/src/lib/firestore.ts` — `listBills()`
- **Root cause:** Filter hanya `is_active: true`.
- **Fix:** Tagihan aktif tetap tampil, plus tagihan `recurrence: once` yang `is_paid: true` juga tetap tampil sebagai riwayat.

### [2026-05] Tidak ada mekanisme recalculate saldo wallet

- **File:** `apps/web/src/lib/firestore.ts`, `apps/web/src/store/wallet.store.ts`, `apps/web/src/pages/WalletPage.tsx`
- **Fix:** Tambah `recalculateWalletBalances()` + aksi store `recalculateBalances()` + tombol `Recalculate Saldo` di halaman Wallet.

## File-file Kunci

### Mobile (Active)

| File                                       | Peran                                  |
| ------------------------------------------ | -------------------------------------- |
| `apps/mobile/src/lib/supabase.ts`          | Inisialisasi Supabase client           |
| `apps/mobile/src/services/wallets.ts`      | CRUD wallet via Supabase SDK           |
| `apps/mobile/src/services/transactions.ts` | CRUD transaksi via Supabase SDK        |
| `apps/mobile/src/services/budgets.ts`      | CRUD budget via Supabase SDK           |
| `apps/mobile/src/services/bills.ts`        | CRUD tagihan berulang via Supabase SDK |
| `apps/mobile/src/services/categories.ts`   | CRUD kategori via Supabase SDK         |

### Backend FastAPI (Spesialis)

| File                                     | Peran                                              |
| ---------------------------------------- | -------------------------------------------------- |
| `backend/app/api/v1/ai.py`               | Endpoint AI (chat extract, OCR, insights)          |
| `backend/app/api/v1/imports.py`          | Endpoint import CSV/Excel bank statement           |
| `backend/app/api/v1/webhooks.py`         | Endpoint webhook handler                           |
| `backend/app/core/auth.py`               | Verifikasi Supabase JWT                            |
| `backend/app/services/ai_service.py`     | Integrasi Claude API (chat extract, OCR, insights) |
| `backend/app/services/ai_insight_data.py` | Query Supabase + aggregasi untuk AI insight        |

### Mobile State & UI

| File | Peran |
|------|-------|
| `apps/mobile/src/state/report-period.tsx` | Shared report period state + provider |
| `apps/mobile/src/components/date/IOSWheelDatePicker.tsx` | Date picker custom period |
| `apps/mobile/src/components/ai/AiInsightCard.tsx` | Card insight AI di Reports |
| `apps/mobile/src/services/ai-insights.ts` | Client service AI insight |
| `backend/app/services/import_service.py` | Parser CSV/Excel bank statement                    |

### Shared

| File                             | Peran                                                       |
| -------------------------------- | ----------------------------------------------------------- |
| `packages/shared/types/index.ts` | TypeScript types bersama (Transaction, Budget, Wallet, dll) |

### Legacy Web (Maintenance-Only)

| File                             | Peran                                                 |
| -------------------------------- | ----------------------------------------------------- |
| `apps/web/src/lib/firestore.ts`  | Semua operasi Firestore — CRUD (legacy, tidak diubah) |
| `apps/web/src/lib/categories.ts` | Daftar kategori default + helper label/emoji          |

## Arsitektur API

### Mobile → Supabase Direct

CRUD utama (transaksi, budget, wallet, bills, categories) langsung via **Supabase Client SDK** dari mobile. RLS policies mengatur akses per user — tidak ada backend layer untuk operasi ini.

### Backend FastAPI (Spesialis)

Base URL: `/api/v1`

Endpoint aktif (spesialis only):

- `/ai/*` — AI processing (chat extract, OCR receipt, insights)
- `/imports` — Parser CSV/Excel bank statement
- `/webhooks` — Webhook handler (Midtrans payment, dll)

Auth: Supabase JWT diverifikasi di `backend/app/core/auth.py`.

## Hal yang Belum Selesai / Diketahui

- Midtrans payment integration sudah ada scaffolding tapi belum fully implemented
- Mobile app terkoneksi langsung ke Supabase; backend FastAPI hanya untuk AI/Import/Webhook
- Backend test `test_ai_insight.py` gagal karena `TrustedHostMiddleware` + TestClient (pre-existing, bukan regresi)

## Sistem Report Period

Mobile punya sistem shared report period (`apps/mobile/src/state/report-period.tsx`) yang menyinkronkan periode aktif antar halaman Dashboard, Reports, dan Transactions.

**Tipe periode:**
| Tipe | Deskripsi |
|------|-----------|
| `month` / `3month` / `6month` / `year` | Preset kalender |
| `custom` | Rentang tanggal bebas (iOS wheel picker) |
| `saved_rule` | Aturan siklus bulanan tersimpan (misal: Gajian 25) |

**Provider:** `ReportPeriodProvider` di `apps/mobile/app/_layout.tsx` — semua screen bisa pakai `useReportPeriod()`.

**File kunci:**
- `apps/mobile/src/state/report-period.tsx` — state, provider, helper (`buildReportPeriod`, `isDateInReportPeriod`, `formatReportPeriodLabel`)
- `apps/mobile/src/components/date/IOSWheelDatePicker.tsx` — date picker ala iPhone untuk custom period

## AI Insight (Period-Aware)

AI Insight (`POST /api/v1/ai/insight`) sekarang mengikuti active report period. Jika user memilih custom period 25 Mei - 24 Juni, backend query transaksi di rentang tersebut.

**Flow:**
1. Frontend `getAiInsight(supabase, type, startDate, endDate)` kirim `type` + `start_date`/`end_date`
2. Backend `build_ai_insight_context(user_id, period, start_date, end_date)` query Supabase dengan rentang custom
3. Claude menghasilkan insight JSON terstruktur

**File kunci:**
- `apps/mobile/src/services/ai-insights.ts` — client service
- `backend/app/api/v1/ai.py` — endpoint + `InsightRequest` (terima `start_date`/`end_date`)
- `backend/app/services/ai_service.py` — Anthropic call (`max_tokens=2048`, jangan dikurangi)
- `backend/app/services/ai_insight_data.py` — query Supabase + aggregasi data

**⚠️ Penting:** `max_tokens=2048` di `generate_financial_insight()` — kalau kurang, JSON terpotong dan insight gagal.

## Sistem Notifikasi

Fitur notifikasi in-app sudah MVP complete. Database, API, mobile screen, dan settings sync ke backend semua aktif.

**Tipe notifikasi aktif:**
| Tipe | Trigger | Dedupe |
|------|---------|--------|
| `ai_insight_ready` | Setelah AI Insight berhasil dibuat | per user/periode/tanggal |
| `budget_threshold` | Budget usage lewat 80% atau 100% | per budget/bulan/threshold |
| `weekly_summary` | Ringkasan mingguan otomatis | per user/ISO week |

**File kunci:**
- `backend/app/api/v1/notifications.py` — API endpoints (preferences, list, unread, read)
- `backend/app/models/notifications.py` — Pydantic models
- `backend/app/services/notification_service.py` — CRUD + preferences
- `backend/app/services/notification_events.py` — Event generator (budget, weekly)
- `backend/scripts/generate_weekly_notifications.py` — Weekly summary script
- `apps/mobile/app/notifications.tsx` — Notification center screen (i18n bilingual)
- `apps/mobile/src/components/notifications/NotificationBell.tsx` — Bell icon + badge di dashboard header
- `apps/mobile/src/services/notifications.ts` — Mobile client service
- `supabase/migrations/202606100001_notifications.sql` — DB migration

**Scheduled jobs:**
- Budget scanner: Hermes cron `6475dced5997` setiap 4 jam
- Weekly summary: Hermes cron `c97b81ff6645` setiap Senin 07:00 WIB
- PWA marker guard: Hermes cron `f6c49fb9c6db` setiap hari 09:00
- Dry run weekly: `docker exec kaswise-backend python3 scripts/generate_weekly_notifications.py --dry-run`

**Tests:**
- Backend: `test_notification_service.py` (19 pass), `test_notifications_api.py` (TrustedHostMiddleware issue, pre-existing)
- Mobile: `notifications.test.ts` (6 pass), `notification-bell.test.tsx` (3 pass), `settings-notifications.test.tsx` (1 pass), `notifications-screen.test.tsx` (async rendering issue, pre-existing)

**Endpoint:** Semua di `/api/v1/notifications/*` — auth required (401 tanpa token).

## Simple Bill Reminder

Fitur tagihan sederhana: buat, lihat, tandai lunas, bulanan auto-rollover.

**Flow:**
- `+ Baru` → form inline (nama, nominal, tanggal jatuh tempo, bulanan/sekali, ingatkan H-3/H-1/Hari H)
- Simpan → `createBill()` ke Supabase `bill_reminders` table
- Tandai lunas → **bulanan**: mundur ke bulan depan + catat pembayaran di `payment_history`; **sekali**: tandai `is_paid: true`
- Filter: Semua / Akan Datang / Terlambat / Lunas

**Catatan perbaikan 2026-06-12:**
- Ikon/kartu bill sekarang pakai warna stabil berbasis nama bill, bukan lookup kategori.
- Tombol "Mark Paid" untuk bill bulanan sekarang benar-benar menandai `is_paid: true` saat pembayaran dicatat, lalu status akan mengikuti siklus berikutnya.

**File kunci:**
- `apps/mobile/app/(tabs)/bills.tsx` — screen + form UI (i18n bilingual)
- `apps/mobile/src/services/bills.ts` — Supabase CRUD (finance context support)
- `backend/scripts/generate_bill_reminder_notifications.py` — cron generator (dry-run ready, belum dijadwalkan)

**UX rules:**
- Form ≤ 5 field (name, amount, due day, recurrence, notify)
- Tidak ada halaman terpisah — form inline di bawah header
- Bilingual: semua string ID/EN mengikuti bahasa yang dipilih

## Sistem Pengaman Deploy (3-Lapis)

### 1. Bundle marker check
- File: `apps/mobile/scripts/required-markers.json` (24 testID wajib)
- Script: `apps/mobile/scripts/check-bundle-markers.mjs`
- Command: `pnpm --filter mobile check:bundle`
- Terintegrasi di `deploy:pwa` — deploy gagal kalau marker hilang

### 2. Pre-push git hook
- File: `.githooks/pre-push`
- Jalan otomatis setiap `git push`, cek: type-check → test → marker
- Bypass: `SKIP_MOBILE_CHECK=1 git push`
- Tracked di repo via `git config core.hooksPath .githooks`

### 3. Cron monitor (Hermes)

| Job ID | Name | Jadwal | Fungsi |
|--------|------|--------|--------|
| `f6c49fb9c6db` | `kaswise-pwa-marker-guard` | Setiap hari 09:00 | Cek marker bundle live, alert kalau hilang |
| `6475dced5997` | `kaswise-budget-threshold-scanner` | Setiap 4 jam | Scan budget, buat notifikasi threshold 80%/100% |
| `c97b81ff6645` | `kaswise-weekly-summary` | Setiap Senin 07:00 | Generate ringkasan mingguan per user |

### 4. CI/CD (GitHub Actions)
- `.github/workflows/ci.yml` — trigger di `feat/*` dan PR ke `main`
- Job `mobile-quality-gate`: type-check → test → export → marker audit

### Pipeline deploy aman:
```bash
pnpm --filter mobile predeploy   # type-check + test + check:bundle
pnpm --filter mobile deploy:pwa  # deploy + auto marker guard
```

## Catatan UI/UX

- **Changelog canonical**: gunakan `docs/changelog/CHANGELOG.md` untuk ringkasan perubahan yang dibaca manusia; detail teknis tetap di `docs/releases/*` dan `docs/plans/*`.

- **Toggle tema**: hanya di dashboard header (`home-theme-toggle`), TIDAK di Settings
- **Hide/view nominal**: di dashboard header (`home-amount-visibility-toggle`)
- **Notifikasi**: bell icon + badge unread di dashboard header, klik buka `/notifications`
- **Saved report period rules**: di Reports tab, dengan modal kelola (rename/delete)
- **iOS date wheel**: muncul saat pilih "Kustom" di Reports → pilih start + end date
- **i18n**: semua halaman sudah bilingual ID/EN (notifications, upgrade, AiInsightCard, reports, dashboard, settings, bills, budgets, transactions)

## Script Kunci

| Script | Peran |
|--------|-------|
| `apps/mobile/scripts/deploy-pwa.mjs` | Deploy PWA + auto marker guard |
| `apps/mobile/scripts/check-bundle-markers.mjs` | Verifikasi marker di bundle |
| `apps/mobile/scripts/required-markers.json` | Daftar 29 testID wajib (disinkronkan dari registry) |

## Cara Menjalankan

```bash
# Install dependencies
pnpm install

# Mobile
cd apps/mobile
npx expo start

# Mobile PWA (build + deploy)
pnpm --filter mobile export:pwa
pnpm --filter mobile predeploy    # quality gate
pnpm --filter mobile deploy:pwa   # deploy + auto marker guard

# Backend Python
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Backend Docker (production)
docker compose -f docker-compose.production.yml --env-file .env.production up -d --build backend
```

## Simple Awareness Roadmap (2026-06-12)

### Milestone 1 (✅ Done): Simple Bill Reminder
- Bill reminder notification test + preferences respect (`feat/bill-reminder-notification-test`)
- Cron job `7d8d17b17cfe` runs daily 07:00 for bill notifications
- PR #12 merged to main

### Milestone 2 (✅ Done): Budget Active Period Polish
- Simplify copy: "dompet"/"wallet" → "budget"/"anggaran"
- Default budget period from active report period
- Status sentence per budget card (safe/near/over with i18n)
- Branch `feat/milestone2-budget-polish`, PR #13 merged to main

### Milestone 3 (🚧 In progress): Transaction Review Queue
- **Task 11:** `transaction-review.ts` service — query & flag transactions needing review
  - Criteria: `review_required=true`, `confidence<0.75`, `Lainnya`/`Other` category, missing fields
- **Task 12:** Dashboard review CTA card — shows between budget & recent sections
  - testID: `home-transaction-review-card`, `home-review-action`
  - Navigates to `/transactions?review=1`
- **Task 13:** Transaction list review filter chip — "Perlu dicek"/"Needs review"
  - testID: `transactions-review-chip`
  - Reads `?review=1` param for auto-activation
- Branch: `feat/milestone3-transaction-review`

### Milestone 4 (planned): Documentation, Quality Gate, Deploy

**New files for Milestone 3:**
| File | Purpose |
|------|---------|
| `apps/mobile/src/services/transaction-review.ts` | Review summary service |
| `apps/mobile/src/services/transaction-review.test.ts` | Service unit tests (9 pass) |

**Modified files for Milestone 3:**
| File | Change |
|------|--------|
| `apps/mobile/src/services/transactions.ts` | Export `normalizeTransaction`, add `review_required` & `confidence` to `Transaction` type |
| `apps/mobile/app/(tabs)/index.tsx` | Review CTA card with state, i18n, loading |
| `apps/mobile/app/(tabs)/transactions.tsx` | Review filter chip, `isReviewable()`, query param support |
| `apps/mobile/__tests__/tabs-index.test.tsx` | Review card tests (3 new tests) |
| `apps/mobile/__tests__/transactions-swipe-actions.test.tsx` | Review filter tests (2 new tests) |
