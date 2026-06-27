# Audit Logic Transaksi Kaswise — 27 Juni 2026

## Ringkasan

Audit menyeluruh terhadap flow transaksi di aplikasi Kaswise (`/home/Danu88/catat-in/apps/mobile/`)
mencakup: create, update, delete, capture AI, manual entry, receipt, wallet balance, budget
envelope sync, dan household context.

## Arsitektur Wallet Balance

Wallet balance diupdate oleh **database trigger** `sync_wallet_balance_from_transaction`
(bukan oleh client code). Trigger ini fire AFTER INSERT/UPDATE/DELETE pada tabel
`transactions` dan mengupdate `wallets.balance` secara atomik.

**File kunci:**
- `supabase/migrations/202605210002_wallet_balance_trigger.sql` — trigger asli
- `supabase/migrations/202606010001_security_hardening_phase2.sql` — versi hardening (REPLACE function + tambah `prevent_wallet_balance_direct_change`)
- `supabase/migrations/202605270001_mobile_pwa_budget_sample_cleanup_sync.sql` — recreate trigger
- `supabase/migrations/202605280001_drop_legacy_wallet_balance_trigger.sql` — DROP trigger legacy (bukan yang canonical)

---

## BUG #1 [CRITICAL] — Income tidak tercatat otomatis ke wallet balance

**Root cause:** BUKAN bug di trigger SQL. Trigger logic sudah benar untuk INSERT income:
```sql
delta_amount := case
  when new.type = 'income' then coalesce(new.nominal, 0)
  ...
end;
-- ...
update public.wallets set balance = balance + delta_amount where id = target_wallet_id
```

**Tapi ada 3 skenario di mana income TIDAK update wallet balance:**

### 1a. User tidak punya wallet aktif → wallet_id = null
Jika user belum membuat wallet, `walletId` akan null. Trigger punya guard:
`if target_wallet_id is not null and delta_amount <> 0 then`
Sehingga balance tidak terupdate. UX sudah menampilkan pesan: "Belum ada akun aktif. Transaksi tersimpan tanpa mengubah saldo akun." Tapi user tetap complaint — ini UX gap.

### 1b. Wallet scope mismatch — `wallet_matches_transaction_scope` gagal
Trigger memanggil `wallet_matches_transaction_scope()` yang memverifikasi wallet_id
milik user/household yang benar. Jika mismatch (misal: transaksi personal dengan
wallet_id milik household), WHERE clause return 0 row dan balance TIDAK update —
**tanpa error apapun**. Silent failure.

### 1c. Trigger tidak terinstall di production
Ini perlu diverifikasi di Supabase production. Migration `202605270001` recreate trigger,
dan `202606010001` hanya replace function (bukan trigger). Jika migration tidak
dijalankan dengan urutan benar, trigger bisa hilang.

**Cara verifikasi production:**
```sql
SELECT tgname FROM pg_trigger WHERE tgname = 'sync_wallet_balance_from_transaction';
```

**Rekomendasi fix:**
- Verifikasi trigger exists di production
- Kalau user complaint tapi trigger ada, cek apakah wallet_id null (user belum punya wallet)
- Kalau wallet_id ada tapi balance tidak update, cek scope mismatch
- Tambahkan logging / notification jika wallet scope mismatch terjadi secara silent

---

## BUG #2 [HIGH] — `capture.tsx` tidak refresh wallet list setelah transaksi

Setelah `createTransaction` sukses (line 373-428), capture screen set
`optimisticTransaction` dan menampilkan pesan sukses, tapi **tidak memanggil
`loadWalletOptions()` ulang**. Akibatnya:

- Wallet selector di capture screen masih menampilkan balance lama
- Jika user langsung membuat transaksi kedua, wallet balance yang ditampilkan stale
- Ini bisa memberi kesan "income tidak tercatat" padahal sebenarnya balance sudah
  terupdate di database, hanya UI yang tidak merefresh

**Rekomendasi fix:** Panggil `loadWalletOptions()` setelah transaksi sukses.

---

## BUG #3 [HIGH] — `transaction-new.tsx` reset form selalu ke "expense"

`resetForm()` (line 397-409) selalu set `setTxType("expense")`. Setelah user
membuat transaksi income, form reset ke expense. Ini minor UX issue, tapi
bisa menyebabkan user tidak sengaja membuat transaksi expense saat ingin
membuat income lagi.

**Rekomendasi fix:** Pertahankan `txType` terakhir, jangan reset ke "expense".

---

## BUG #4 [MEDIUM] — `deleteTransaction` TIDAK memicu refresh wallet di UI

Service `deleteTransaction()` (transactions.ts:291-305) menghapus transaksi.
Database trigger membalikkan delta balance dengan benar. Tapi:

1. Transactions screen (`transactions.tsx`) setelah delete tidak me-refresh
   wallet list — balance di UI mungkin stale
2. Dashboard (`index.tsx`) mungkin tidak langsung me-refresh

Ini bukan bug di service layer, tapi di UI layer.

---

## BUG #5 [MEDIUM] — `updateTransaction` mengubah type/amount — trigger logic benar tapi tidak ada UI feedback

Service `updateTransaction()` (transactions.ts:261-289) memungkinkan perubahan
`transaction_type` (income ↔ expense) dan `amount`. Trigger menghitung delta dengan:
```
(new_delta) - (old_delta)
```
Ini **benar secara matematis**. Contoh: expense 50k → income 50k =
(+50k) - (-50k) = +100k (wallet naik 100k). Tapi:

- UI transaksi screen tidak menampilkan dampak perubahan pada wallet balance
- Tidak ada konfirmasi "ini akan mengubah saldo wallet sebesar X"
- User bisa tidak sadar bahwa mengedit transaksi mengubah saldo

---

## BUG #6 [MEDIUM] — Receipt fallback: wallet_id di-null-kan saat RLS error

`capture.tsx` line 552-560: jika `createTransaction` gagal dengan RLS error
dan `walletId` tidak null, kode akan retry dengan `wallet_id: null`. 
Akibatnya transaksi receipt TERSIMPAN tapi TANPA wallet_id → balance TIDAK
terupdate. Tidak ada indikasi ke user bahwa ini terjadi.

**Rekomendasi fix:** Tampilkan pesan ke user bahwa transaksi disimpan tanpa
sinkronisasi wallet, atau minta user memilih wallet yang valid.

---

## BUG #7 [LOW] — `updateWallet` secara eksplisit abaikan field `balance`

`wallets.ts` line 98: `const { balance: _ignoredBalance, ...safeUpdates } = updates`
Ini adalah security feature yang benar (balance hanya boleh diupdate via trigger
transaksi). Tapi screens `wallets.tsx` line 226 menampilkan input "Saldo" di form
edit yang nilainya TIDAK PERNAH dikirim ke server. UX misleading.

**Rekomendasi:** Hapus input balance dari form edit wallet, atau ganti jadi
read-only display.

---

## BUG #8 [LOW] — Tidak ada fitur "Transfer" antar wallet

Saat ini tidak ada transaction type "transfer". Jika user ingin memindahkan
uang dari Bank ke E-Wallet, mereka harus membuat 2 transaksi: 1 expense + 1 income.
Tidak efisien dan rawan kesalahan input.

---

## BUG #9 [LOW] — Bill reminders tidak otomatis membuat transaksi

Service `bills.ts` hanya mengelola data `bill_reminders` — tidak ada mekanisme
untuk otomatis membuat transaksi saat tagihan jatuh tempo atau saat user membayar.
Tidak ada integrasi antara bill_reminders dan transactions.

---

## Verifikasi yang Perlu Dilakukan di Production

1. Cek trigger exists:
```sql
SELECT tgname, tgfoid::regproc FROM pg_trigger 
WHERE tgname = 'sync_wallet_balance_from_transaction';
```

2. Cek apakah ada transaksi income dengan wallet_id NOT NULL tapi balance wallet tidak berubah:
```sql
SELECT t.id, t.type, t.nominal, t.wallet_id, w.balance, w.name
FROM transactions t
LEFT JOIN wallets w ON w.id = t.wallet_id
WHERE t.type = 'income' AND t.wallet_id IS NOT NULL
ORDER BY t.created_at DESC LIMIT 20;
```

3. Cek function exists:
```sql
SELECT proname FROM pg_proc WHERE proname = 'sync_wallet_balance_from_transaction';
```

---

## Prioritas Perbaikan

| ID  | Severity | Issue | Estimasi |
|-----|----------|-------|----------|
| #1  | CRITICAL | Income tidak tercatat ke wallet (verifikasi trigger + scope) | 1-2 jam |
| #2  | HIGH     | Refresh wallet list setelah transaksi di capture | 15 menit |
| #3  | HIGH     | Reset form selalu expense | 5 menit |
| #4  | MEDIUM   | Delete transaction tidak refresh UI wallet | 30 menit |
| #5  | MEDIUM   | Update transaction tidak ada UI feedback balance | 1 jam |
| #6  | MEDIUM   | Receipt RLS fallback null-kan wallet_id | 20 menit |
| #7  | LOW      | Edit wallet tampilkan input balance palsu | 15 menit |
| #8  | LOW      | Tidak ada fitur transfer | Fitur baru |
| #9  | LOW      | Bill reminder tidak auto-create transaksi | Fitur baru |
