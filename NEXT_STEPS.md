# Handoff Catat.in (2026-04-30)

## Workspace

- Project: `C:\Users\ThinkPad\catat-in-dev-setup\catat-in`
- Fokus terakhir: web app Firebase-first

## Perubahan Terakhir

### 1) Perbaikan E2E test (sudah hijau)

- File: `apps/web/tests/e2e/authenticated-smoke.spec.ts`
  - Perbaiki assertion budget agar lebih stabil.
- File: `apps/web/tests/e2e/features-smoke.spec.ts`
  - Perbaiki locator grup agar tidak strict-mode ambiguous.

### 2) Perbaikan riwayat/aktivitas transaksi

- File: `apps/web/src/pages/ActivityPage.tsx`
- Masalah:
  - Halaman aktivitas sebelumnya hanya mengandalkan endpoint backend `/activity-logs`.
  - Jika backend tidak menulis log transaksi, aktivitas terlihat kosong.
- Solusi:
  - Tambah fallback ke Firestore (`listTransactions`) saat endpoint kosong/gagal.
  - Aktivitas sekarang tetap bisa tampil dari data transaksi user.

## Status Verifikasi Terakhir

- `pnpm --filter @catat-in/web test` ✅
- `pnpm --filter @catat-in/web test:e2e` ✅ (6 passed)
- `pnpm test:backend` ✅
- `pnpm --filter @catat-in/web build` ✅
- `pnpm --filter @catat-in/web lint` ❌ (banyak issue lama, mayoritas `no-explicit-any`)

## Cara Menjalankan Lokal

### Web app

```bash
cd C:\Users\ThinkPad\catat-in-dev-setup\catat-in
pnpm dev:web
```

- Buka: `http://localhost:3000`

### Backend (opsional)

```bash
cd C:\Users\ThinkPad\catat-in-dev-setup\catat-in\backend
venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

## Checklist Lanjutan (disarankan)

1. Uji manual flow:
   - tambah transaksi di `/transactions`
   - cek muncul di `/activity`
2. Rapikan label aktivitas agar lebih human-readable (saat ini format fallback: `transaction.income.created` / `transaction.expense.created`).
3. Putuskan strategi jangka panjang:
   - tetap pakai fallback dari transaksi, atau
   - backend wajib menulis `activity_logs` untuk semua create/edit/delete transaksi.
4. (Opsional) Mulai debt cleanup lint bertahap.

## Catatan Risiko

- Jika Firestore rules terlalu ketat, list transaksi bisa gagal (error permission).
- Bila backend mati/tidak terkonfigurasi, fitur backend-only tetap bisa gagal, tapi fitur inti Firebase tetap jalan.
