# Catat.in

Aplikasi pencatatan keuangan personal berbasis AI untuk Bahasa Indonesia.

Saat ini repo ini berisi:
- web app React + Vite + TypeScript
- mobile scaffold Expo + React Native
- backend FastAPI + Supabase
- flow inti yang sudah terhubung untuk AI chat, OCR struk, import mutasi, grup, dan laporan

Deploy public:
- panduan production deployment ada di [DEPLOYMENT.md](./DEPLOYMENT.md)
- jalur biaya minimum yang direkomendasikan saat ini: `Supabase Free + Render Free + Vercel Hobby`

Catatan penting:
- `apps/mobile` sekarang sudah punya onboarding awal dan shell bottom navigation, tapi masih belum setara fitur web.
- Beberapa bagian masih MVP atau placeholder, terutama integrasi API mobile, payment, dan push notification end-to-end.

## Status Implementasi

### Sudah tersedia di web
- Auth login dan register
- Dashboard
- Transaksi manual
- AI chat input transaksi dengan review sebelum simpan
- Upload struk dengan OCR review sebelum simpan
- Import mutasi CSV/Excel dengan preview, deteksi duplikat, dan confirm import
- Wallet / dompet
- Budget / anggaran (termasuk dukungan Kategori Kustom)
- Bills / tagihan
- Grup: buat grup, join via kode, lihat anggota, ubah role, keluarkan anggota, keluar dari grup
- Laporan: summary bulanan, tren 6 bulan, breakdown kategori, detail kategori

### Belum lengkap / belum ada
- Mobile app feature-complete
- Export PDF / Excel
- Midtrans subscription flow end-to-end
- Push notification FCM end-to-end
- Integrasi mobile ke API nyata dan state management
- Privacy sharing controls grup seperti wireframe
- AI financial insights premium yang benar-benar terhubung ke data riil

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend Web | React 18 + Vite + TypeScript |
| State | Zustand |
| Charting | Recharts |
| Styling | Tailwind CSS + custom CSS |
| Backend | FastAPI (Python 3.12) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| AI | Anthropic Claude API |
| Import Processing | Pandas + OpenPyXL + Chardet |

## Struktur Proyek

```text
catat-in/
├── apps/
│   ├── mobile/              # Scaffold Expo + React Native
│   └── web/                 # Frontend web React + Vite
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Router FastAPI
│   │   ├── core/            # Config, auth, db, rate limit
│   │   └── services/        # AI service, import service
│   ├── supabase/
│   │   └── migrations/      # SQL migration
│   ├── main.py              # Entry point FastAPI
│   └── requirements.txt
├── packages/
│   └── shared/              # Shared TypeScript types
├── .env.example
├── docker-compose.yml
├── package.json
└── pnpm-workspace.yaml
```

## Prasyarat

Pastikan environment lokal sudah punya:

- Node.js `>= 20`
- pnpm `>= 9`
- Python `>= 3.12`
- Supabase CLI
- Docker Desktop atau Docker Engine

## Setup Development

### 1. Install dependency

```bash
pnpm install
```

### 2. Siapkan environment variable

```bash
cp .env.example .env
```

Lalu isi nilai penting berikut:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `SECRET_KEY`
- `ALLOWED_ORIGINS`
- `ALLOWED_HOSTS`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`

Catatan:
- frontend memakai variabel `VITE_*`
- backend memakai variabel non-`VITE_*`
- untuk production, `ALLOWED_ORIGINS` harus berisi domain frontend Vercel dan `ALLOWED_HOSTS` harus berisi host backend Render
- backend juga menambahkan host production penting secara defensif agar Render tidak menolak request dengan `Invalid host header`

### 3. Jalankan Supabase lokal

```bash
cd backend
supabase start
supabase db reset
```

Setelah itu biasanya tersedia:
- Supabase Studio: `http://localhost:54323`
- API lokal Supabase: `http://localhost:54321`

Jika Anda baru menambahkan file migration dan hanya ingin menerapkannya ke database lokal yang sudah berjalan:

```bash
cd backend
supabase db push --local
```

### 3b. Jika pakai Supabase Cloud (bukan lokal)

Di project ini ada gap schema antara cloud lama vs backend terbaru.  
Sebelum testing fitur transaksi, grup, budget, kategori kustom, dan tagihan di cloud, pastikan migration berikut sudah ter-apply.

Opsi 1, jalankan via Supabase CLI:

```bash
cd backend
supabase login
supabase link --project-ref xqvtsgfakuehjwdmenuw
supabase db push
```

Catatan:
- `supabase db push` ke cloud membutuhkan sesi login CLI aktif atau environment variable `SUPABASE_ACCESS_TOKEN`.
- Jika CLI belum login, perintah remote push akan gagal walaupun project sudah ter-link.

Opsi 2, jalankan manual di Supabase SQL Editor file per file:

```sql
-- file:
backend/supabase/migrations/003_fix_schema.sql
```

Tanpa migration ini, endpoint tersebut akan mengembalikan `503` dengan pesan panduan migration.

Jika signup atau register cloud masih gagal dengan error seperti `Database error saving new user`, jalankan juga:

```sql
-- file:
backend/supabase/migrations/004_repair_auth_cloud.sql
```

Migration ini fokus memperbaiki jalur `auth.users -> public.profiles` dan trigger `on_auth_user_created` yang biasanya menjadi sumber error `500` saat user baru dibuat.

Jika ingin mengaktifkan dukungan kategori kustom untuk Budget & Transaksi:

```sql
-- file:
backend/supabase/migrations/005_custom_categories.sql
```

Jika ingin menyelaraskan schema cloud dengan PRD terbaru untuk:
- `wallets.currency`
- `bill_reminders.payment_history`
- metadata kategori backend yang dipakai flow Budget / Transaction / Import terbaru

jalankan juga:

```sql
-- file:
backend/supabase/migrations/006_prd_phase1_alignment.sql
```

Jika tabel `categories` Anda sudah lebih dulu ada sebelum migration `006`, jalankan juga backfill berikut agar kolom metadata kategori lengkap:

```sql
-- file:
backend/supabase/migrations/007_categories_schema_backfill.sql
```

### 3c. Penggunaan Seed Data (Testing)

Untuk mempermudah testing lokal tanpa harus mengulang entri data secara manual, project ini telah dilengkapi dengan data *dummy* evaluasi.
Jika Anda menjalankan Supabase lokal dan ingin mereset database sembari memasukkan ulang data testing terakhir:

```bash
npx supabase db reset
```

Ini akan mengosongkan DB, menjalankan semua skrip migrasi, dan menyuntikkan data testing dari `backend/supabase/seed.sql`.

### 4. Jalankan backend

Dari root repo:

```bash
pnpm backend:dev
```

Atau manual:

```bash
cd backend
venv\Scripts\uvicorn main:app --reload --port 8000
```

Backend tersedia di:
- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

### 5. Jalankan web

Dari root repo:

```bash
pnpm dev:web
```

Web tersedia di:
- `http://localhost:3000`

Catatan:
- `vite.config.ts` saat ini memakai port `3000`
- backend API default diarahkan ke `http://localhost:8000/api/v1`

### 6. Jalankan web + backend bersamaan

```bash
pnpm dev
```

### 7. Jalankan scaffold mobile

```bash
pnpm dev:mobile
```

Catatan:
- `apps/mobile` sekarang sudah punya onboarding awal dan screen shell dasar
- dependency mobile mungkin perlu `pnpm install` ulang jika lockfile belum diperbarui di environment lain

## Script Penting

| Script | Fungsi |
|--------|--------|
| `pnpm dev` | Jalankan web + backend |
| `pnpm dev:web` | Jalankan web saja |
| `pnpm backend:dev` | Jalankan backend saja |
| `pnpm build` | Build frontend web |
| `pnpm type-check` | Type check monorepo |
| `pnpm --filter @catat-in/web test:e2e` | Jalankan Playwright E2E web |
| `pnpm db:start` | Jalankan Supabase lokal |
| `pnpm db:stop` | Stop Supabase lokal |
| `pnpm db:reset` | Reset database lokal |
| `pnpm db:migrate` | Push migration |

## Playwright E2E

Untuk menjalankan smoke test UI web dengan Playwright:

```bash
pnpm install
pnpm --filter @catat-in/web exec playwright install chromium
pnpm backend:dev
pnpm dev:web
pnpm --filter @catat-in/web test:e2e
```

Catatan:
- `apps/web/playwright.config.ts` saat ini menjalankan suite dengan `workers: 2` dan `fullyParallel: true`.
- Suite E2E yang aktif saat ini mencakup route publik, login invalid, serta smoke flow login + wallet + transaction + budget + bills.
- Smoke test sudah memakai bootstrap session yang lebih cepat agar runtime suite tetap efisien.

## Catatan Production Auth dan Backend

- Frontend menunggu Supabase menyelesaikan cek sesi awal sebelum menampilkan route auth/protected.
- Cek sesi awal sekarang punya timeout pendek, sehingga halaman `/login` tidak lagi stuck selamanya di layar "Memuat halaman login" jika Supabase auth atau browser lock lambat.
- Jika user belum punya sesi aktif, frontend akan lanjut sebagai guest dan menampilkan form login.
- Backend production memakai `TrustedHostMiddleware`; jika host Render belum diizinkan, endpoint akan menjawab `400 Invalid host header` dan frontend menampilkan pesan tidak bisa terhubung ke backend.
- Untuk service saat ini, host backend production yang harus valid adalah `catat-in-backend.onrender.com`, dan origin frontend production adalah `https://catat-in-nine.vercel.app`.

## API yang Tersedia

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

### Wallets
- `GET /api/v1/wallets`
- `POST /api/v1/wallets`
- `PATCH /api/v1/wallets/{id}`
- `DELETE /api/v1/wallets/{id}`

### Transactions
- `GET /api/v1/transactions`
- `POST /api/v1/transactions`
- `PUT /api/v1/transactions/{id}`
- `DELETE /api/v1/transactions/{id}`

### AI
- `POST /api/v1/ai/chat`
- `POST /api/v1/ai/receipt`
- `POST /api/v1/ai/insight`

### Budgets
- `GET /api/v1/budgets`
- `POST /api/v1/budgets`
- `DELETE /api/v1/budgets/{id}`

### Bills
- `GET /api/v1/bills`
- `POST /api/v1/bills`
- `POST /api/v1/bills/{id}/pay`
- `DELETE /api/v1/bills/{id}`

### Imports
- `POST /api/v1/imports/preview`
- `POST /api/v1/imports/confirm`

### Groups
- `GET /api/v1/groups`
- `POST /api/v1/groups`
- `GET /api/v1/groups/{group_id}`
- `POST /api/v1/groups/join`
- `PATCH /api/v1/groups/{group_id}`
- `DELETE /api/v1/groups/{group_id}/leave`
- `PATCH /api/v1/groups/{group_id}/members/{member_user_id}`
- `DELETE /api/v1/groups/{group_id}/members/{member_user_id}`

### Reports
- `GET /api/v1/reports/summary`
- `GET /api/v1/reports/trends`
- `GET /api/v1/reports/category-detail`

## Fitur Web Saat Ini

### AI chat input
- User menulis transaksi dengan bahasa natural
- Backend AI mengekstrak nominal, kategori, dan konteks
- Hasil muncul sebagai draft review sebelum disimpan

### OCR struk
- User upload gambar atau PDF struk
- Backend AI menganalisis merchant, tanggal, total, kategori, dan item
- Hasil bisa diedit dulu sebelum jadi transaksi

### Import mutasi
- User pilih sumber bank atau e-wallet
- File dipreview dulu, termasuk duplikat dan error parse
- Import dikonfirmasi setelah user memilih wallet tujuan

### Grup
- Buat grup
- Join via kode undangan
- Lihat anggota
- Admin bisa ubah role dan keluarkan anggota

### Laporan
- Filter bulan
- Filter wallet
- Ringkasan income/expense/net
- Grafik tren 6 bulan
- Breakdown pengeluaran per kategori
- Detail transaksi per kategori

### Mobile scaffold
- Struktur Expo dasar sudah ada
- Sudah punya onboarding awal sesuai arah wireframe
- Sudah punya shell bottom navigation dan screen dasar mobile
- Siap dilanjutkan ke integrasi API, state, dan navigator production-ready

## Testing

### Frontend

Type check:

```bash
pnpm type-check
```

Build frontend:

```bash
pnpm build
```

### Backend

```bash
cd backend
pytest
```

Catatan:
- Saat ini test backend belum banyak. Dalam beberapa pengecekan terakhir, `pytest` bisa jalan tetapi belum mengumpulkan suite test yang signifikan.

## Kondisi yang Perlu Diketahui

- Mobile sudah punya onboarding awal dan shell navigasi dasar, tetapi belum setara dengan flow web.
- Beberapa file lama masih punya issue encoding karakter, walau file yang aktif untuk fitur utama sudah dirapikan lewat implementasi terbaru.
- Backend Render Free bisa cold start setelah idle. Jika health check pertama lambat, tunggu sebentar lalu ulangi.
- Jika muncul pesan frontend "Tidak bisa terhubung ke backend", cek dulu `https://catat-in-backend.onrender.com/health`. Response sehat adalah JSON dengan `status: ok` dan `database: ok`.
- Jika kamu ingin mengikuti PRD penuh, langkah berikutnya yang paling logis adalah:

1. sambungkan screen mobile ke API dan state nyata
2. pecah `App.tsx` ke navigator dan screen per modul
3. tambah export laporan
4. tambah payment dan push notification
5. polishing design system agar makin dekat ke wireframe akhir

## Environment Variables

Referensi utama tetap ada di:
- [.env.example](C:/Users/ThinkPad/catat-in-dev-setup/catat-in/.env.example)

## Konvensi Commit

Gunakan format Conventional Commits:

```text
feat: tambah flow AI chat input transaksi
fix: perbaiki import mutasi duplikat
docs: sinkronkan README dengan kondisi repo
chore: update dependencies
```

## Lisensi

Proprietary - Catat.in © 2026. Semua hak dilindungi.
