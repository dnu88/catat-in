# AI Continuation Handoff — Mobile Refresh, Budget CRUD, AI Capture, Sample Cleanup

**Tanggal:** 2026-05-27  
**Scope:** `apps/mobile` Expo Android/iOS/Web PWA, Supabase Budget Envelopes, Capture AI, pull-to-refresh, sample data cleanup, PWA deploy `kaswise.com`  
**Branch:** `main`  
**Status:** Perubahan sudah divalidasi, PWA sudah dideploy, dan siap dilanjutkan.

## Ringkasan perubahan terakhir

Perubahan terakhir menutup daftar perbaikan user:

1. **Create Budget diperbaiki**
   - `createBudgetEnvelope()` sekarang mengirim `status: "active"` eksplisit.
   - Form budget otomatis mengisi default tanggal awal/akhir bulan berjalan saat dibuka.
   - Error create budget menampilkan detail error agar mudah didiagnosis jika schema/RLS produksi drift.

2. **Konfirmasi hapus di halaman Budget**
   - Card budget aktif punya tombol **Hapus/Delete**.
   - Native memakai `Alert.alert()`.
   - Web/PWA memakai `window.confirm` via `globalThis.confirm`.
   - Delete budget dilakukan sebagai **soft-delete/archive**: update `status = 'archived'`, bukan hard delete.

3. **Tombol batal di halaman edit Dompet**
   - Form edit wallet sekarang punya tombol **Batal/Cancel**.
   - Tombol ini menutup mode edit dan membersihkan state edit.

4. **Pull-to-refresh**
   - Ditambahkan `RefreshControl` pada halaman-halaman utama:
     - `index.tsx` / Home
     - `budgets.tsx`
     - `wallets.tsx`
     - `transactions.tsx`
     - `bills.tsx`
     - `reports.tsx`
     - `capture.tsx`
     - `imports.tsx`
     - `settings.tsx`
     - `groups.tsx`

5. **Responsif**
   - Action row/card penting dibuat `flexWrap`/flexible agar lebih aman di layar kecil.
   - Bagian wallet edit action, wallet action buttons, bills bottom row, dan budget footer row sudah disesuaikan.

6. **Capture/Input AI diperbaiki**
   - Submit AI tidak lagi menunggu Edge Function `process-text` selesai sebelum melepas loading tombol.
   - Flow sekarang:
     1. Insert row `transactions` dengan `status = 'processing'`.
     2. Set `transactionId` agar realtime hook memantau status.
     3. Invoke `process-text` secara async/fire-and-forget.
     4. Tampilkan status antrean/proses dan pesan sukses setelah realtime menerima `done`.
   - Ditambahkan pilihan wallet/akun aktif untuk sinkronisasi saldo.
   - Jika tidak ada wallet aktif, transaksi tetap bisa dibuat, tetapi saldo wallet tidak berubah.
   - Pesan sukses sekarang eksplisit: transaksi tercatat/berhasil disimpan dan aturan budget/saldo tersinkron saat akun dipilih.

7. **Sample data dibersihkan dan dicegah muncul lagi**
   - Tombol Dev Tools `Seed Sample Data` di Settings dihapus dari UI agar sample baru tidak bisa dibuat dari aplikasi.
   - Riwayat import statis/sample di halaman Import dihapus; kini menampilkan empty state.
   - Fallback kategori laporan sample di Reports dihapus; saat tidak ada transaksi, kategori dinamis kosong.
   - Migration/SQL cleanup dibuat:
     - `supabase/migrations/202605270001_mobile_pwa_budget_sample_cleanup_sync.sql`
   - SQL cleanup sudah dijalankan ke remote Supabase menggunakan `npx supabase db query --linked --file ...`.

## File utama yang berubah

- `apps/mobile/app/(tabs)/budgets.tsx`
  - Default date range create budget.
  - Tombol delete + konfirmasi.
  - Pull-to-refresh.
  - Responsif footer budget.

- `apps/mobile/src/services/budget-envelopes.ts`
  - `createBudgetEnvelope()` explicit `status: "active"`.
  - `deleteBudgetEnvelope()` soft archive via `status: "archived"`.

- `apps/mobile/app/(tabs)/wallets.tsx`
  - Tombol batal pada edit wallet.
  - Pull-to-refresh.
  - Responsive action rows.

- `apps/mobile/app/(tabs)/capture.tsx`
  - Wallet selector untuk Capture AI.
  - Async Edge Function invoke.
  - Pesan queued/processing/success.
  - Pull-to-refresh untuk wallet list.

- `apps/mobile/app/(tabs)/imports.tsx`
  - Hapus import history sample statis.
  - Empty state riwayat import.
  - Pull-to-refresh.

- `apps/mobile/app/(tabs)/reports.tsx`
  - Hapus fallback kategori sample saat tidak ada transaksi.
  - Pull-to-refresh via `refreshTick`.

- `apps/mobile/app/(tabs)/settings.tsx`
  - Hapus Dev Tools seed sample data dari UI.
  - Pull-to-refresh profile/settings.

- `apps/mobile/app/(tabs)/index.tsx`
  - Refactor loader menjadi `loadDashboard()`.
  - Pull-to-refresh Home.

- `apps/mobile/app/(tabs)/transactions.tsx`
  - Pull-to-refresh transaksi.

- `apps/mobile/app/(tabs)/bills.tsx`
  - Pull-to-refresh tagihan.
  - Responsive bill bottom row.

- `apps/mobile/app/(tabs)/groups.tsx`
  - Pull-to-refresh daftar keluarga.

- `supabase/migrations/202605270001_mobile_pwa_budget_sample_cleanup_sync.sql`
  - Set default `budget_envelopes.status = 'active'`.
  - Delete deterministic sample transactions/budgets.
  - Recreate wallet balance sync trigger.

## Validasi yang sudah dilakukan

Di repo `/home/Danu88/catat-in`:

```bash
npm --prefix apps/mobile run type-check
```

Status: **passed**.

Full Jest mobile:

```bash
cd apps/mobile
npm test -- --runInBand
```

Status terakhir:

- Test suites: **33 passed / 33 total**
- Tests: **216 passed / 216 total**

Catatan: warning Jest `act(...)` dari komponen motion/Animated masih muncul, tetapi test tetap pass. Warning ini sudah ada sebelumnya dan belum dibersihkan.

## Validasi Supabase cleanup

SQL cleanup sudah dijalankan ke remote:

```bash
npx supabase db query --linked --file supabase/migrations/202605270001_mobile_pwa_budget_sample_cleanup_sync.sql
```

Verifikasi remote:

```sql
select count(*) as sample_transactions
from public.transactions
where catatan in (
  'Penerimaan gaji bulanan',
  'Pembayaran proyek freelance',
  'Bonus kinerja kuartalan'
) or catatan like 'Pengeluaran % rutin';
```

Hasil: `0`.

```sql
select count(*) as sample_budgets
from public.budgets
where category in ('Makanan','Transportasi','Belanja','Tagihan','Hiburan')
  and period='monthly'
  and notify_at_percent=80
  and is_active=true;
```

Hasil: `0`.

## Deploy PWA terakhir

Perintah yang sudah dijalankan:

```bash
cd /home/Danu88/catat-in
corepack pnpm --filter mobile export:pwa
corepack pnpm --filter mobile deploy:pwa
```

Deploy berhasil ke:

```text
/home/Danu88/nginx-proxy-manager/placeholder
```

Bundle live terbaru di `kaswise.com`:

```text
/_expo/static/js/web/entry-c2450833c8db6ab7f5d8cc3cd1d6185c.js
```

Catatan: `curl -I https://kaswise.com` mengembalikan `501` dari openresty, tetapi `GET https://kaswise.com` berhasil mengembalikan HTML PWA. Gunakan GET/browser untuk validasi live.

## Area yang perlu QA manual berikutnya

1. **Create Budget di `kaswise.com`**
   - Buat budget baru dengan default tanggal.
   - Buat budget dengan tanggal manual.
   - Pastikan muncul di daftar aktif dan bisa dihapus/archive.

2. **Delete Budget**
   - Test PWA web confirm.
   - Test native Alert di Android/iOS build.

3. **Edit Wallet**
   - Masuk mode edit, tekan Batal, pastikan state kembali normal.
   - Simpan perubahan dan cek saldo/nama/type tetap benar.

4. **Pull-to-refresh**
   - Swipe down di semua halaman utama.
   - Khusus web/PWA, behavior refresh tergantung dukungan pointer/touch browser.

5. **Capture AI**
   - Pilih wallet aktif.
   - Input teks natural.
   - Pastikan transaksi masuk `processing`, lalu `done`.
   - Pastikan saldo wallet berubah sesuai trigger DB setelah `process-text` update nominal/type/wallet.
   - Jika AI lama, user harus tetap melihat status proses/antrean.

6. **Sample data**
   - Pastikan Settings tidak lagi menampilkan Dev Tools seed sample.
   - Pastikan Reports tidak menampilkan kategori sample saat belum ada transaksi nyata.

7. **Sync rules**
   - Wallet balance sync bergantung pada trigger DB `sync_wallet_balance_from_transaction`.
   - Jika saldo tidak berubah, cek trigger/function di remote Supabase dan pastikan transaksi punya `wallet_id`, `type`, dan `nominal` setelah AI selesai.

## Catatan penting untuk penerus

- `kaswise.com` masih serve Expo web dari `apps/mobile`, bukan `apps/web`.
- Jangan menghapus env injection manual pada target deploy tanpa pengganti yang jelas.
- Migration cleanup sudah dieksekusi via `db query`, tetapi file migration tetap dicatat di repo agar perubahan dapat direplay/ditinjau.
- `supabase migration list` masih menunjukkan remote legacy IDs `001..008`, jadi project remote kemungkinan punya history migration lama yang tidak sejajar dengan nama migration lokal. Hati-hati saat memakai `supabase db push`.
- Untuk apply SQL tertentu ke remote, pattern yang terbukti jalan:

```bash
npx supabase db query --linked --file path/to/file.sql
```
