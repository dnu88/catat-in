# Handoff Catat.in (2026-05-02)

## Workspace

- Project: `C:\Users\ThinkPad\catat-in-dev-setup\catat-in`
- Fokus terakhir: testsprite integration tests + bug fix backend AI endpoint

## Perubahan Terakhir

### 1) Bug fix: endpoint `/api/v1/ai/process` tidak menangkap RuntimeError

- File: `backend/app/api/v1/ai.py` (baris 113–164)
- Masalah:
  - Endpoint `POST /api/v1/ai/process` tidak memiliki `try/except RuntimeError` sehingga
    jika Anthropic API error, exception tidak tertangkap dan menghasilkan 500 Internal Server Error.
  - Endpoint lain (`/chat`, `/receipt`, `/insight`) sudah punya handler yang benar.
- Solusi:
  - Tambah `try/except RuntimeError` → `HTTPException(502)` di blok `text` dan `image`.
- Status: **fix sudah tersimpan, restart backend diperlukan agar aktif**.

### 2) Testsprite integration tests dijalankan (2026-05-02)

- TC001 — POST Transactions Manual Entry: ✅ **LULUS**
- TC002 — POST AI Process Capture: ❌ **GAGAL** (Anthropic API key tidak valid)

### 3) Perbaikan sebelumnya (masih relevan)

- E2E test: `authenticated-smoke.spec.ts` dan `features-smoke.spec.ts` sudah diperbaiki.
- Aktivitas/riwayat: `ActivityPage.tsx` punya fallback ke Firestore jika endpoint backend kosong/gagal.

## Status Verifikasi Terakhir

| Perintah | Status |
|---|---|
| `pnpm --filter @catat-in/web test` | ✅ |
| `pnpm --filter @catat-in/web test:e2e` | ✅ (6 passed) |
| `pnpm test:backend` | ✅ |
| `pnpm --filter @catat-in/web build` | ✅ |
| `pnpm --filter @catat-in/web lint` | ❌ (48 warning `no-explicit-any`, 0 error) |
| Testsprite TC001 | ✅ |
| Testsprite TC002 | ❌ (ANTHROPIC_API_KEY tidak valid) |

## Known Issues

### KRITIS: ANTHROPIC_API_KEY tidak valid

- File: `backend/.env` — nilai `ANTHROPIC_API_KEY` saat ini menghasilkan error dari gateway:
  `"No active credentials for provider: anthropic"` (HTTP 404)
- Dampak: semua endpoint AI yang memanggil Anthropic API gagal dengan 500/502:
  - `POST /api/v1/ai/process`, `/ai/chat`, `/ai/receipt`, `/ai/insight`
- Solusi: perbarui nilai `ANTHROPIC_API_KEY` di `backend/.env` dengan key yang aktif.

### Backend perlu restart

- Fix di `backend/app/api/v1/ai.py` sudah tersimpan tapi uvicorn `--reload` belum mendeteksi perubahan.
- Restart backend untuk mengaktifkan fix:

```bash
cd C:\Users\ThinkPad\catat-in-dev-setup\catat-in\backend
venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

## Cara Menjalankan Lokal

### Web app

```bash
cd C:\Users\ThinkPad\catat-in-dev-setup\catat-in
pnpm dev:web
```

Buka: `http://localhost:3000`

### Backend (opsional)

```bash
cd C:\Users\ThinkPad\catat-in-dev-setup\catat-in\backend
venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Testsprite tests

```bash
backend\venv\Scripts\python.exe testsprite_tests\TC001_post_transactions_manual_entry.py
backend\venv\Scripts\python.exe testsprite_tests\TC002_post_api_ai_process_capture.py
```

Prasyarat TC002: backend aktif + `ANTHROPIC_API_KEY` valid di `backend/.env`.

## Checklist Lanjutan (disarankan)

1. **Perbarui `ANTHROPIC_API_KEY`** di `backend/.env` dengan key yang aktif.
2. Restart backend, lalu jalankan ulang TC002 untuk verifikasi fix `ai.py`.
3. Uji manual flow AI capture di frontend (`/transactions` → input AI).
4. Rapikan label aktivitas agar lebih human-readable (`transaction.income.created` → format display).
5. Putuskan strategi jangka panjang activity logs (fallback Firestore vs backend wajib menulis log).
6. (Opsional) Debt cleanup lint bertahap — mulai dari `auth/` dan `transaction/`.

## Catatan Risiko

- ANTHROPIC_API_KEY invalid memblokir semua fitur AI — perbarui sebelum demo/beta.
- Jika Firestore rules terlalu ketat, list transaksi bisa gagal (error permission).
- Bila backend mati/tidak terkonfigurasi, fitur inti Firebase tetap jalan.
