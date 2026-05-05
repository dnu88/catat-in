# CLAUDE.md — Catat.in

Panduan untuk Claude Code agar langsung paham konteks project tanpa eksplorasi ulang.

## Struktur Monorepo

```
catat-in/
├── apps/web/          # React + Vite (frontend utama)
├── apps/mobile/       # React Native / Expo (early stage, pakai mock data)
├── backend/           # FastAPI Python (AI, import CSV/Excel, groups)
└── packages/shared/   # TypeScript types bersama
```

Package manager: **pnpm workspaces**. Selalu jalankan perintah dari root atau folder yang tepat.

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 18, Vite, TypeScript, Zustand, Tailwind CSS |
| Backend | FastAPI (Python 3.12) |
| Database | Cloud Firestore (primary) |
| Auth | Firebase Auth |
| AI | Claude API (Anthropic) — chat extract, OCR struk, financial insights |
| Mobile | React Native / Expo |

## Arsitektur Data (Firestore)

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

### Wallet balance: disimpan sebagai running total

Saldo wallet diupdate via `increment(delta)` setiap kali transaksi dibuat/edit/hapus (`applyWalletDelta`). Tidak ada recalculation dari transaksi — jika data inconsistent, saldo bisa salah secara permanen.

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

## File-file Kunci

| File | Peran |
|---|---|
| `apps/web/src/lib/firestore.ts` | Semua operasi Firestore — CRUD transaksi, budget, wallet, bills, grup, report |
| `apps/web/src/lib/firebase.ts` | Inisialisasi Firebase Auth |
| `apps/web/src/lib/firebase-db.ts` | Inisialisasi Firestore DB |
| `apps/web/src/lib/categories.ts` | Daftar kategori default + helper label/emoji |
| `backend/app/services/ai_service.py` | Integrasi Claude API (chat extract, OCR, insights) |
| `backend/app/services/import_service.py` | Parser CSV/Excel bank statement |
| `packages/shared/types/index.ts` | TypeScript types bersama (Transaction, Budget, Wallet, dll) |

## API Backend (FastAPI)

Base URL: `/api/v1`

Endpoint utama: `/transactions`, `/budgets`, `/wallets`, `/bills`, `/categories`, `/groups`, `/imports`, `/ai/chat`, `/ai/receipt`, `/ai/insight`, `/reports`

Backend hanya dipakai untuk: AI processing, import CSV/Excel, dan operasi grup lintas user. CRUD utama (transaksi, budget, wallet, bills) langsung ke Firestore dari frontend.

## Hal yang Belum Selesai / Diketahui

- Mobile app (`apps/mobile/`) masih pakai mock data, belum terkoneksi ke backend/Firestore
- Wallet balance tidak ada mekanisme "recalculate dari transaksi" — jika ada bug lama, saldo bisa off
- Midtrans payment integration sudah ada scaffolding tapi belum fully implemented
- Shared group transactions di `listBudgets()` belum diperhitungkan (hanya transaksi milik sendiri yang dihitung ke budget)
- `listBills()` hanya menampilkan `is_active: true` — tagihan sekali bayar yang sudah dibayar langsung hilang dari list

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
