# Deployment Guide (Firebase-first)

Dokumen ini mengikuti arsitektur produksi saat ini:
- Frontend: Vercel (`apps/web`)
- Auth + data inti: Firebase Auth + Cloud Firestore
- Backend FastAPI (opsional): fitur AI receipt, import mutasi, dan groups

Jika kamu full Firebase tanpa backend tambahan, cukup ikuti langkah 1-2 lalu lewati langkah backend.

## 1) Setup Firebase

1. Buat Firebase project.
2. Aktifkan:
   - Authentication (`Email/Password`, `Google`)
   - Cloud Firestore
3. Tambahkan Authorized Domains:
   - domain Vercel frontend (production + preview jika perlu)
   - `localhost` untuk local dev
4. Deploy Firestore rules dari root repo:

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

Rules file:
- `firestore.rules`

## 2) Deploy Frontend (Vercel)

Vercel project settings:
- Root Directory: `apps/web`

Environment variables (Production/Preview):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_API_BASE_URL` (opsional, isi jika backend dipakai)

Setelah env diubah, lakukan redeploy.

## 3) Deploy Backend (Opsional, jika dipakai)

Backend service settings:
- Root directory: `backend`
- Health endpoint: `/health`

Environment variables minimal:
- `ENVIRONMENT=production`
- `DEBUG=false`
- `SECRET_KEY=<random-strong-secret>`
- `FIREBASE_PROJECT_ID=<project-id>`
- `FIREBASE_CLIENT_EMAIL=<service-account-email>`
- `FIREBASE_PRIVATE_KEY=<service-account-private-key>`
- `ALLOWED_ORIGINS=https://your-frontend.vercel.app`
- `ALLOWED_HOSTS=api.yourdomain.com`

Penting:
- Isi `FIREBASE_PRIVATE_KEY` dalam format satu baris dengan `\n` escape (bukan multiline mentah).
- `ALLOWED_ORIGINS` dan `ALLOWED_HOSTS` boleh pakai format comma-separated.

Optional:
- `ANTHROPIC_API_KEY=<key>` (tanpa ini AI chat pakai fallback parser)
- `ANTHROPIC_MODEL=claude-sonnet-4-6` (atau model lain)

Legacy vars (boleh kosong):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 4) Integrasi Frontend-Backend

Jika backend aktif:
- set `VITE_API_BASE_URL=https://api.yourdomain.com/api/v1`

Jika backend belum aktif:
- boleh kosongkan `VITE_API_BASE_URL`
- fitur inti Firebase tetap jalan (wallet/transaction/budget/bills/reports)
- fitur backend-only (OCR/import/groups) tidak aktif

## 5) Verifikasi Setelah Deploy

Checklist minimum:
1. Login/register Firebase berjalan di frontend production.
2. Wallet CRUD berjalan.
3. Transaksi manual berjalan.
4. Budget + kategori kustom + bills berjalan.
5. Reports tampil dari Firestore.
6. Jika backend aktif: `GET /health` mengembalikan status sehat.
7. Jika backend aktif: AI receipt/import/groups bisa dipakai dari frontend.

Verifikasi lokal sebelum release:

```bash
pnpm --filter @catat-in/web test
pnpm --filter @catat-in/web test:e2e
pnpm test:backend
```

## 6) Troubleshooting Cepat

### Frontend masih minta Supabase
- Pastikan deployment memakai commit terbaru.
- Hard refresh / incognito.
- Cek env Vercel memakai `VITE_FIREBASE_*`, bukan `VITE_SUPABASE_*`.

### Backend gagal start
- Cek `FIREBASE_PRIVATE_KEY` valid dan format `\n` benar.
- Cek `ALLOWED_ORIGINS` dan `ALLOWED_HOSTS` benar.
- Jalankan lokal:

```bash
cd backend
venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### AI chat error ke localhost saat production
- `VITE_API_BASE_URL` masih menunjuk backend lokal.
- Ganti ke backend publik atau kosongkan jika ingin hanya mode Firebase-first.

### Budget list gagal dengan pesan "The query requires an index"
- Buat Firestore composite index dari link yang muncul di error page.
- Setelah index `Ready`, reload halaman budget.
