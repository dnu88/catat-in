# Catat.in

Catat.in adalah aplikasi pencatatan keuangan personal dengan web app utama berbasis Firebase.

## Arsitektur Saat Ini (April 2026)

- Frontend web: React + Vite (Firebase-first)
- Auth: Firebase Auth
- Data utama app: Cloud Firestore
- Backend FastAPI (opsional/pendukung): endpoint AI, import mutasi, dan groups
  - Auth backend: verifikasi Firebase ID token
  - Storage backend fitur pendukung: Firestore

## Progress Fitur

### Sudah jalan di web (Firebase-first)
- Login/register
- Dashboard
- Wallet
- Transaksi manual
- Budget + kategori kustom
- Bills / tagihan
- Reports (dihitung dari Firestore)
- AI capture:
  - Jika backend AI hidup: pakai endpoint `/api/v1/ai/chat`
  - Jika backend AI mati: fallback parser lokal tetap jalan

### Fitur yang butuh backend aktif
- AI receipt OCR (`/api/v1/ai/receipt`)
- Import mutasi (`/api/v1/imports/*`)
- Groups (`/api/v1/groups/*`)

## Struktur Proyek

```text
catat-in/
|-- apps/
|   |-- web/
|   `-- mobile/
|-- backend/
|   |-- app/
|   |   |-- api/v1/        # ai, imports, groups, webhooks
|   |   |-- core/          # config, auth, firebase, database
|   |   `-- services/      # ai_service, import_service
|   |-- main.py
|   `-- requirements.txt
|-- packages/shared/
|-- firestore.rules
|-- firebase.json
|-- DEPLOYMENT.md
`-- .env.example
```

## Environment Variables

### Frontend (`apps/web/.env`)

Wajib:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Opsional:
- `VITE_API_BASE_URL` (isi jika backend AI/import/groups dipakai)

### Backend (`backend/.env`)

Wajib untuk backend Firebase:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Penting:
- `ALLOWED_ORIGINS`
- `ALLOWED_HOSTS`
- `SECRET_KEY`

Opsional:
- `ANTHROPIC_API_KEY` (kalau kosong, AI chat pakai fallback parser)

## Menjalankan Lokal

### 1) Install dependency

```bash
pnpm install
```

### 2) Jalankan frontend

```bash
pnpm dev:web
```

### 3) Jalankan backend (opsional)

```bash
cd backend
venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 4) Cek health backend

```bash
curl http://127.0.0.1:8000/health
```

## Testing

### 1) Web unit test (Vitest)

```bash
pnpm --filter @catat-in/web test
```

### 2) Web E2E (Playwright)

```bash
pnpm --filter @catat-in/web test:e2e
```

Catatan:
- Playwright config sudah otomatis menyalakan dev server web (`http://localhost:3000`) saat test dijalankan.
- Suite E2E saat ini mengikuti arsitektur Firebase-first (auth/register/login via UI, bukan endpoint auth backend lama).
- Jika flow budget menampilkan error Firestore index di environment tertentu, buat index yang direkomendasikan di Firebase Console agar data budget bisa tampil di list.

### 3) Backend test (Pytest)

```bash
pnpm test:backend
```

## API Backend Saat Ini

- `POST /api/v1/ai/chat`
- `POST /api/v1/ai/receipt`
- `POST /api/v1/ai/insight`
- `POST /api/v1/imports/preview`
- `POST /api/v1/imports/confirm`
- `GET /api/v1/groups`
- `POST /api/v1/groups`
- `GET /api/v1/groups/{group_id}`
- `POST /api/v1/groups/join`
- `PATCH /api/v1/groups/{group_id}`
- `DELETE /api/v1/groups/{group_id}/leave`
- `PATCH /api/v1/groups/{group_id}/members/{member_user_id}`
- `DELETE /api/v1/groups/{group_id}/members/{member_user_id}`

## Catatan Penting

- Frontend/backbone aplikasi berjalan dengan stack Firebase (Auth + Firestore).
- Firestore rules sudah disiapkan di `firestore.rules`.
- Jika backend belum deploy, fitur inti personal finance tetap jalan (wallet/transaction/budget/bills/reports).
- Jangan commit secret asli ke Git.
