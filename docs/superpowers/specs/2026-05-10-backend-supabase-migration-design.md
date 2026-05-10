# Backend Migration: Firestore → Supabase Direct

> **Status:** Approved  
> **Date:** 2026-05-10  
> **Decision:** Client direct to Supabase (Cara 2), Backend prune to AI/Import/Webhook only (Opsi A langsung)

## Ringkasan

Migrasi backend FastAPI dari Firestore ke arsitektur Supabase-direct. Client (mobile/web) akan query Supabase langsung via SDK dengan RLS. Backend dipangkas hanya untuk fitur khusus: AI processing, import CSV/Excel, dan webhooks.

## Arsitektur Baru

```
┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │     │    Web App      │
│    (Expo)       │     │    (React)      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │  Supabase Client SDK  │
         ▼                       ▼
┌─────────────────────────────────────────┐
│           Supabase Cloud                │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Auth   │ │ Postgres │ │ Storage  │  │
│  └─────────┘ └──────────┘ └──────────┘  │
│              │ RLS Policies │           │
└──────────────┴──────────────┴───────────┘
         │                       ▲
         │ AI/Import/Webhook     │
         ▼                       │
┌─────────────────────────────────────────┐
│        Backend FastAPI (Pruned)         │
│  /ai/*  /imports  /webhooks             │
└─────────────────────────────────────────┘
```

## Scope Perubahan

### 1. Backend FastAPI — Endpoint yang Dihapus

| Endpoint | Aksi | Alasan |
|----------|------|--------|
| `/api/v1/wallets` | HAPUS | CRUD langsung ke Supabase |
| `/api/v1/transactions` | HAPUS | CRUD langsung ke Supabase |
| `/api/v1/budgets` | HAPUS | CRUD langsung ke Supabase |
| `/api/v1/bills` | HAPUS | CRUD langsung ke Supabase |
| `/api/v1/categories` | HAPUS | CRUD langsung ke Supabase |
| `/api/v1/groups` | HAPUS | CRUD langsung ke Supabase |
| `/api/v1/reports` | HAPUS | Hitung di client/Supabase view |
| `/api/v1/professional` | HAPUS | Tidak digunakan |

### 2. Backend FastAPI — Endpoint yang Dipertahankan

| Endpoint | Fungsi |
|----------|--------|
| `/api/v1/ai/chat` | Extract transaction dari text (Claude API) |
| `/api/v1/ai/receipt` | OCR struk (Claude API) |
| `/api/v1/ai/insight` | Financial insight (Claude API) |
| `/api/v1/imports` | Parser CSV/Excel bank statement |
| `/api/v1/webhooks` | Midtrans payment callback |

### 3. Backend — File yang Dihapus

```
backend/app/api/v1/wallets.py
backend/app/api/v1/transactions.py
backend/app/api/v1/budgets.py
backend/app/api/v1/bills.py
backend/app/api/v1/categories.py
backend/app/api/v1/groups.py
backend/app/api/v1/reports.py
backend/app/api/v1/professional.py
backend/app/core/firebase.py
backend/app/core/database.py
backend/tests/test_wallets.py
backend/tests/test_transactions.py
```

### 4. Backend — File yang Dimodifikasi

```
backend/main.py — hapus router CRUD, keep AI/Import/Webhook
backend/app/api/v1/ai.py — update auth ke Supabase JWT
backend/app/api/v1/webhooks.py — update jika perlu
backend/app/api/v1/imports.py — update jika perlu
backend/app/core/auth.py — refactor: Firebase → Supabase JWT verification
backend/app/core/config.py — hapus Firebase env vars
backend/app/core/rate_limit.py — pertahankan
backend/app/services/ai_service.py — pertahankan
backend/app/services/import_service.py — pertahankan
backend/requirements.txt — hapus firebase-admin, pertahankan supabase
backend/.env — hapus Firebase credentials, tambah SUPABASE_URL/KEY
```

### 5. Mobile App — Setup Supabase Direct

```
apps/mobile/src/lib/supabase.ts — client setup
apps/mobile/src/services/wallets.ts — CRUD wallets via Supabase
apps/mobile/src/services/transactions.ts — CRUD transactions via Supabase
apps/mobile/src/services/budgets.ts — CRUD budgets via Supabase
apps/mobile/src/services/bills.ts — CRUD bills via Supabase
apps/mobile/src/services/categories.ts — CRUD categories via Supabase
```

## Data Schema (Sudah Ada di Supabase)

Schema sudah didefinisikan di:
- `supabase/migrations/202605060001_kaswise_base_schema.sql`
- `supabase/migrations/202605060002_storage_buckets.sql`

### Tabel Utama

```sql
profiles        — extends auth.users
wallets         — dompet user
transactions    — transaksi keuangan
budgets         — anggaran per kategori
bill_reminders  — tagihan berulang
categories      — kategori transaksi
groups          — grup shared
group_members   — anggota grup
```

### RLS Policies

Semua tabel sudah RLS-enabled. User hanya bisa akses data miliknya (user_id = auth.uid()).

## Auth Flow Baru

1. User login via Supabase Auth (email/password atau Google OAuth)
2. Supabase mengembalikan JWT
3. Client simpan JWT di secure storage
4. Client kirim JWT di header setiap request ke:
   - Supabase (otomatis via SDK)
   - Backend AI/Import (header: `Authorization: Bearer <jwt>`)
5. Backend verifikasi JWT menggunakan Supabase JWKS

## Error Handling

| Error | Penanganan |
|-------|------------|
| RLS violation (425) | Show "Anda tidak memiliki akses" |
| Network offline | Cache transactions locally, sync when online |
| Supabase rate limit | Exponential backoff |
| AI endpoint error | Show "Layanan AI sedang tidak tersedia" |

## Testing Plan

### Mobile App
1. Login via Supabase Auth
2. CRUD wallet → verify di Supabase dashboard
3. CRUD transaction → verify wallet balance update
4. CRUD budget → verify spent calculation
5. CRUD bill → verify reminder
6. RLS test: User A tidak bisa baca data User B

### Backend
1. `/ai/chat` → extract transaction dari text
2. `/ai/receipt` → OCR struk image
3. `/imports` → parse CSV bank statement
4. `/webhooks` → receive Midtrans callback
5. Auth: JWT invalid → 401

## Environment Variables

### Backend `.env` (baru)
```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Payment
MIDTRANS_SERVER_KEY=...
MIDTRANS_CLIENT_KEY=...
MIDTRANS_IS_PRODUCTION=false

# Runtime
ENVIRONMENT=development
DEBUG=true
```

### Mobile `.env`
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Timeline Estimasi

| Fase | Durasi | Output |
|------|--------|--------|
| Setup Supabase client mobile | 2 jam | Client terkoneksi |
| Verify RLS policies | 1 jam | RLS verified |
| Implement CRUD services mobile | 4 jam | CRUD functions ready |
| Refactor backend auth | 2 jam | Supabase JWT verified |
| Prune backend endpoints | 1 jam | CRUD endpoints removed |
| Testing end-to-end | 2 jam | All tests pass |
| **Total** | **12 jam** | Migration complete |

## Rollback Plan

Jika ada masalah kritis:
1. Restore `main.py` dengan router CRUD
2. Restore file endpoint yang dihapus (dari git history)
3. Mobile fallback ke backend API (jika sudah diimplementasi)

## Success Criteria

- [ ] Mobile bisa login via Supabase Auth
- [ ] Mobile bisa CRUD wallets, transactions, budgets, bills, categories
- [ ] Backend AI endpoint masih berfungsi
- [ ] Backend Import endpoint masih berfungsi
- [ ] Backend Webhook endpoint masih berfungsi
- [ ] RLS policies mencegah cross-user access
- [ ] No Firebase/Firestore code remaining in backend
