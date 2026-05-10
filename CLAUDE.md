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
├── backend/           # [LEGACY] FastAPI Python (maintenance-only)
└── packages/shared/   # TypeScript types bersama
```

Package manager: **pnpm workspaces**. Selalu jalankan perintah dari root atau folder yang tepat.

## Tech Stack

### Active Stack (Kaswise v1.0 — Mobile-First)
| Layer          | Teknologi                                                              |
| -------------- | ---------------------------------------------------------------------- |
| Mobile         | Expo SDK 51, React Native 0.74, Expo Router, NativeWind v4             |
| Data Access    | Supabase Client SDK langsung dari mobile (CRUD via RLS policies)       |
| Database       | Supabase PostgreSQL dengan RLS aktif di semua tabel                    |
| Auth           | Supabase Auth (email/password + Google OAuth)                          |
| Backend (Spesialis) | FastAPI (Python 3.12) — hanya AI, Import, Webhook                |
| AI             | Anthropic Claude (Haiku/Sonnet), OpenAI Whisper                        |
| State          | Zustand                                                                |

### Legacy Stack (Maintenance-Only)
| Layer    | Teknologi                                                            |
| -------- | -------------------------------------------------------------------- |
| Frontend | React 18, Vite, TypeScript, Zustand, Tailwind CSS                    |
| Backend  | FastAPI (Python 3.12) — semua endpoint (deprecated)                  |
| Database | Cloud Firestore                                                      |
| Auth     | Firebase Auth                                                        |

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
| File                                              | Peran                                                        |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `apps/mobile/src/lib/supabase.ts`                 | Inisialisasi Supabase client                                 |
| `apps/mobile/src/services/wallets.ts`             | CRUD wallet via Supabase SDK                                 |
| `apps/mobile/src/services/transactions.ts`        | CRUD transaksi via Supabase SDK                              |
| `apps/mobile/src/services/budgets.ts`             | CRUD budget via Supabase SDK                                 |
| `apps/mobile/src/services/bills.ts`               | CRUD tagihan berulang via Supabase SDK                       |
| `apps/mobile/src/services/categories.ts`          | CRUD kategori via Supabase SDK                               |

### Backend FastAPI (Spesialis)
| File                                     | Peran                                                        |
| ---------------------------------------- | ------------------------------------------------------------ |
| `backend/app/api/v1/ai.py`               | Endpoint AI (chat extract, OCR, insights)                    |
| `backend/app/api/v1/imports.py`          | Endpoint import CSV/Excel bank statement                     |
| `backend/app/api/v1/webhooks.py`         | Endpoint webhook handler                                     |
| `backend/app/core/auth.py`               | Verifikasi Supabase JWT                                      |
| `backend/app/services/ai_service.py`     | Integrasi Claude API (chat extract, OCR, insights)           |
| `backend/app/services/import_service.py` | Parser CSV/Excel bank statement                              |

### Shared
| File                                     | Peran                                                        |
| ---------------------------------------- | ------------------------------------------------------------ |
| `packages/shared/types/index.ts`         | TypeScript types bersama (Transaction, Budget, Wallet, dll)  |

### Legacy Web (Maintenance-Only)
| File                                     | Peran                                                        |
| ---------------------------------------- | ------------------------------------------------------------ |
| `apps/web/src/lib/firestore.ts`          | Semua operasi Firestore — CRUD (legacy, tidak diubah)        |
| `apps/web/src/lib/categories.ts`         | Daftar kategori default + helper label/emoji                 |

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

## Cara Menjalankan

```bash
# Install dependencies
pnpm install

# Web frontend (dari root atau apps/web)
pnpm --filter web dev

# Backend Python
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Mobile
cd apps/mobile
npx expo start
```
