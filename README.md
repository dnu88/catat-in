# Catat.in

Aplikasi pencatatan keuangan pribadi untuk pengguna Indonesia. Mendukung input manual, AI chat berbahasa Indonesia, OCR struk belanja, dan import mutasi bank.

## Fitur Utama

- **Input Transaksi Manual** — Catat pemasukan dan pengeluaran dengan kategori, wallet, dan catatan
- **AI Chat** — Ceritakan pengeluaran dalam bahasa Indonesia, AI akan ekstrak datanya otomatis
- **OCR Struk** — Foto struk belanja, data langsung terbaca (JPG, PNG, PDF)
- **Import Bank** — Upload mutasi rekening dalam format CSV atau Excel
- **Manajemen Wallet** — Bank, e-wallet, kas, dan investasi dalam satu tampilan
- **Anggaran Bulanan** — Set budget per kategori, pantau sisa anggaran secara real-time
- **Pengingat Tagihan** — Reminder tagihan berulang (bulanan, tahunan, sekali)
- **Laporan Keuangan** — Ringkasan bulanan, tren 6 bulan, dan breakdown per kategori
- **Keuangan Grup** — Kolaborasi pencatatan bersama tim atau keluarga
- **Multi Bahasa** — Indonesia dan Inggris

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend Web | React 18, TypeScript, Vite, Zustand, Tailwind CSS |
| Backend | FastAPI (Python 3.12) |
| Database | Cloud Firestore |
| Autentikasi | Firebase Auth (email/password + Google) |
| AI | Claude API (Anthropic) |
| Mobile | React Native / Expo |
| Package Manager | pnpm (monorepo workspaces) |

## Struktur Project

```
catat-in/
├── apps/
│   ├── web/                  # Aplikasi web (React + Vite)
│   │   └── src/
│   │       ├── pages/        # Halaman (Dashboard, Transaksi, Budget, dll)
│   │       ├── store/        # State management (Zustand)
│   │       ├── lib/          # Firestore, Firebase, utilitas
│   │       └── types/        # TypeScript types lokal
│   └── mobile/               # Aplikasi mobile (React Native / Expo)
├── backend/                  # API server (FastAPI)
│   └── app/
│       ├── api/v1/           # Endpoint API
│       ├── services/         # Logika bisnis (AI, import)
│       └── core/             # Auth, config, database
└── packages/
    └── shared/types/         # TypeScript types bersama
```

## Prasyarat

- Node.js 18+
- pnpm 8+
- Python 3.12+
- Akun Firebase (Firestore + Auth)
- API key Anthropic (untuk fitur AI)

## Setup & Menjalankan

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Konfigurasi Environment

```bash
# Web frontend
cp apps/web/.env.example apps/web/.env.local

# Backend
cp backend/.env.example backend/.env
```

Variabel yang dibutuhkan untuk web (`apps/web/.env.local`):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=http://localhost:8000
```

Variabel yang dibutuhkan untuk backend (`backend/.env`):
```
ANTHROPIC_API_KEY=
FIREBASE_SERVICE_ACCOUNT_JSON=
```

### 3. Menjalankan

```bash
# Web frontend (http://localhost:5173)
pnpm --filter web dev

# Backend API (http://localhost:8000)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Mobile
cd apps/mobile
npx expo start
```

## Arsitektur Singkat

### Alur Data Transaksi

```
User input → TransactionPage
  → addTransaction() [transaction.store.ts]
    → createTransaction() [firestore.ts]
      → Tulis ke Firestore: users/{uid}/transactions/
      → Update saldo wallet via increment()
```

### Alur Budget

```
BudgetPage mount
  → fetchBudgets(periodStart) [budget.store.ts]
    → listBudgets() [firestore.ts]
      → Ambil dokumen budget dari Firestore
      → Hitung spent_amount secara dinamis dari transaksi aktual
      → Return budget + spent_amount yang akurat
```

Budget `spent_amount` dihitung real-time dari transaksi — tidak disimpan sebagai field terpisah — agar selalu sinkron meski transaksi diedit atau dihapus.

### Alur AI Chat

```
User kirim pesan → CapturePage
  → POST /api/v1/ai/chat [backend]
    → Claude API ekstrak data transaksi dari teks
    → Return structured transaction data
  → User konfirmasi → simpan ke Firestore
```

## Testing

```bash
# Unit & integration test (web)
pnpm --filter web test

# E2E test (Playwright)
pnpm --filter web test:e2e

# Backend test (Pytest)
cd backend
pytest
```

## Deployment

```bash
# Build web untuk production
pnpm --filter web build

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

## Kategori Transaksi Default

| Kategori | Slug | Tipe |
|---|---|---|
| Makan & Minum | `food` | Pengeluaran |
| Transportasi | `transport` | Pengeluaran |
| Belanja | `shopping` | Pengeluaran |
| Kesehatan | `health` | Pengeluaran |
| Hiburan | `entertainment` | Pengeluaran |
| Pendidikan | `education` | Pengeluaran |
| Rumah | `housing` | Pengeluaran |
| Lainnya | `other` | Pengeluaran |
| Gaji | `salary` | Pemasukan |
| Freelance | `freelance` | Pemasukan |
| Investasi | `investment` | Pemasukan |

Kategori kustom bisa ditambahkan per user dari halaman Budget atau Transaksi.
