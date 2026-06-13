# Panduan Kelola User & Pembayaran Kaswise

> Untuk **pemilik aplikasi (owner)** — tanpa perlu bisa ngoding.
> Versi 1.0 · 12 Juni 2026 · Cara memantau user dan mengurus pembayaran/Premium lewat dashboard yang sudah ada.

---

## Bagian 0 — Peta 2 Dashboard

Untuk mengelola Kaswise, kamu cukup memakai **dua website dashboard**. Anggap seperti dua ruangan dengan fungsi berbeda:

| Dashboard | Ibaratnya | Untuk apa | Alamat |
|-----------|-----------|-----------|--------|
| **Supabase** | Buku besar / lemari arsip | Lihat semua **user**, data mereka, dan **status Premium** | supabase.com → login → pilih project |
| **Midtrans** | Mesin kasir | Lihat **uang masuk** & detail tiap **pembayaran** | dashboard.midtrans.com |

**Aturan main sederhana:**
- Mau tahu **siapa user-nya & apakah dia Premium?** → buka **Supabase**.
- Mau tahu **siapa yang bayar & berapa uangnya?** → buka **Midtrans**.

---

## Bagian 1 — ⚠️ Aturan Keselamatan (WAJIB BACA DULU)

Dashboard ini memegang **data asli pengguna**. Salah klik bisa menghapus data orang. Ikuti aturan ini dan kamu aman.

**✅ BOLEH dilakukan:**
- Melihat-lihat data (membaca tidak merusak apa pun).
- Menjalankan perintah "statistik siap-pakai" di Bagian 3 (semuanya hanya **membaca**, tidak mengubah).
- Mengubah status Premium seseorang **hanya dengan cara di Bagian 5** (langkah yang sudah teruji aman).

**❌ JANGAN dilakukan:**
- **Jangan menghapus baris (row) apa pun** di tabel Supabase — terutama di `auth.users`, `profiles`, `transactions`, `wallets`. Menghapus user = menghilangkan semua catatan keuangannya, **tidak bisa dikembalikan**.
- **Jangan mengganti perintah** di Bagian 3/5 secara sembarangan. Tempel persis seperti yang tertulis.
- **Jangan membagikan** ke siapa pun: password login, dan terutama kunci bernama **`service_role`** atau **`SECRET_KEY`**. Kunci itu seperti kunci induk seluruh aplikasi.
- **Jangan mengubah** menu *Settings*, *Database*, *Authentication → Policies* di Supabase. Itu wilayah teknis.

> 💡 **Pegangan emas:** kalau ragu, **cuma lihat, jangan ubah**. Membaca data tidak pernah merusak apa pun.

---

## Bagian 2 — Memantau User di Supabase

### 2.1 Lihat semua user yang mendaftar

1. Buka **supabase.com**, login, lalu klik project Kaswise.
2. Di menu kiri, klik **Authentication** (ikon orang) → **Users**.
3. Kamu akan melihat **daftar semua orang yang pernah daftar**, lengkap dengan:
   - **Email** mereka
   - **Created at** = kapan mereka daftar
   - **Last sign in** = kapan terakhir mereka membuka aplikasi (penunjuk keaktifan)
4. Angka total user biasanya tertulis di atas daftar (mis. "1,248 users").

> Gunakan kolom **Last sign in** untuk melihat siapa yang masih aktif vs yang sudah lama tidak buka aplikasi.

### 2.2 Lihat siapa yang Premium

1. Di menu kiri, klik **Table Editor** (ikon tabel).
2. Pilih tabel **`profiles`**.
3. Perhatikan dua kolom ini:
   - **`plan_type`** → isinya `free` (gratis) atau `premium` (berbayar).
   - **`plan_expires_at`** → tanggal Premium-nya habis. Kalau kosong/lewat dari hari ini, berarti tidak aktif lagi.
4. Untuk menyaring hanya yang Premium: klik tombol **Filter** di atas tabel → pilih kolom `plan_type` → **equals** → ketik `premium` → **Apply**.

---

## Bagian 3 — 📊 Statistik Siap-Pakai (Copy-Paste)

Ini "jurus andalan". Kamu **tidak perlu paham** isi perintahnya — cukup **salin-tempel** lalu klik **Run**, dan angka langsung muncul.

**Cara pakai (sama untuk semua perintah di bawah):**
1. Di Supabase, menu kiri → klik **SQL Editor**.
2. Klik **+ New query**.
3. **Hapus** isi yang ada, lalu **tempel** salah satu perintah di bawah.
4. Klik tombol **Run** (atau tekan Ctrl+Enter). Hasilnya muncul di bawah.

> 🛟 Semua perintah di bagian ini **hanya membaca** data — aman, tidak mengubah apa pun.

### Berapa total user saya?
```sql
select count(*) as total_user from auth.users;
```

### Berapa user baru dalam 7 hari terakhir?
```sql
select count(*) as user_baru_7_hari
from auth.users
where created_at >= now() - interval '7 days';
```

### Berapa user Premium yang masih aktif?
```sql
select count(*) as premium_aktif
from profiles
where plan_type = 'premium'
  and (plan_expires_at is null or plan_expires_at > now());
```

### Siapa saja yang Premium-nya akan habis 7 hari ke depan?
*(berguna untuk mengingatkan mereka perpanjang)*
```sql
select email, full_name, plan_expires_at
from profiles
where plan_type = 'premium'
  and plan_expires_at between now() and now() + interval '7 days'
order by plan_expires_at;
```

### Pertumbuhan user per bulan
```sql
select to_char(created_at, 'YYYY-MM') as bulan,
       count(*) as user_baru
from auth.users
group by 1
order by 1 desc;
```

### Berapa total pendapatan saya (dari semua pembayaran sukses)?
```sql
select count(*) as jumlah_pembayaran_sukses,
       sum(amount) as total_pendapatan_rupiah
from payments
where status = 'paid';
```

### Berapa pendapatan bulan ini?
```sql
select coalesce(sum(amount), 0) as pendapatan_bulan_ini
from payments
where status = 'paid'
  and paid_at >= date_trunc('month', now());
```

### Siapa user paling aktif (paling banyak mencatat transaksi)?
```sql
select p.email,
       count(t.id) as jumlah_transaksi
from profiles p
left join transactions t on t.user_id = p.id
group by p.email
order by jumlah_transaksi desc
limit 20;
```

> 💡 **Tips:** simpan perintah-perintah ini. Di SQL Editor ada tombol **Save** — beri nama (mis. "Total Pendapatan") supaya lain kali tinggal klik tanpa menempel ulang.

---

## Bagian 4 — Memantau Pembayaran di Midtrans

### 4.1 Lihat semua transaksi

1. Buka **dashboard.midtrans.com** dan login.
2. **Pastikan mode yang benar:** ada pilihan **Sandbox** (uji coba) dan **Production** (asli). Untuk uang sungguhan, pilih **Production**.
3. Klik menu **Transactions**. Kamu akan melihat daftar pembayaran: tanggal, jumlah, metode (QRIS/GoPay/ShopeePay), dan **status**.

### 4.2 Arti status pembayaran

| Status di Midtrans | Artinya | Tindakan |
|--------------------|---------|----------|
| **settlement** / **capture** | ✅ Pembayaran **berhasil**, uang masuk | Tidak perlu apa-apa — Premium aktif otomatis |
| **pending** | ⏳ User belum menyelesaikan bayar | Tunggu; biasanya hangus sendiri kalau tak dibayar |
| **expire** | ⌛ Kedaluwarsa, user tidak jadi bayar | Tidak perlu apa-apa |
| **deny** / **cancel** | ❌ Ditolak/dibatalkan | Tidak perlu apa-apa |

### 4.3 Mencocokkan dengan Supabase

Setiap pembayaran punya **Order ID** dengan pola `kw-xxxxxxxx-...`. Kalau kamu menemukan transaksi yang janggal di Midtrans, salin Order ID-nya, lalu cek di Supabase apakah tercatat (lihat Bagian 5.1).

---

## Bagian 5 — Kasus Khusus

### 5.1 User sudah bayar tapi belum dapat Premium ("pembayaran nyangkut")

**Langkah aman:**

1. **Pastikan dulu dia benar-benar sudah bayar.** Buka Midtrans → Transactions → cari berdasarkan email/Order ID user. Status harus **settlement** atau **capture**.
2. Cek catatan di Supabase. Buka **SQL Editor**, tempel ini (ganti emailnya):
```sql
select order_id, plan, amount, status, midtrans_status, created_at, paid_at
from payments
where user_id = (select id from auth.users where email = 'tulis-email-user@contoh.com')
order by created_at desc;
```
3. **Bandingkan:**
   - Kalau di Supabase `status` sudah `paid` tapi Premium belum muncul di aplikasi → minta user **tutup-buka ulang aplikasi** (status disegarkan saat dibuka).
   - Kalau di Midtrans **berhasil** tapi di Supabase masih `pending` → lanjut ke **5.2** untuk memberikan Premium secara manual.

### 5.2 Memberi Premium ke seseorang (manual / gratis)

Berguna untuk: memperbaiki pembayaran nyangkut, atau memberi Premium gratis ke teman/tester.

> ⚠️ Perintah ini **MENGUBAH data**. Periksa **email-nya dua kali** sebelum Run. Ubah hanya satu orang sesuai email.

1. Supabase → **SQL Editor** → **+ New query**.
2. Tempel ini, ganti email dan lama waktunya:
```sql
update profiles
set plan_type = 'premium',
    plan_expires_at = now() + interval '1 year'
where email = 'tulis-email-target@contoh.com';
```
3. Klik **Run**. Akan muncul "Success. 1 row(s) affected" → berarti berhasil untuk **1 orang**.
   - Untuk 1 bulan, ganti `interval '1 year'` menjadi `interval '1 month'`.
   - Kalau muncul "0 rows affected" → email salah ketik, tidak ada yang berubah.
4. Minta user **tutup-buka ulang** aplikasi. Premium akan aktif.

### 5.3 Menangani Premium yang akan habis

Pakai perintah "akan habis 7 hari ke depan" di **Bagian 3**. Dari daftar itu kamu bisa menghubungi mereka untuk mengingatkan perpanjang. (Kaswise juga sudah punya notifikasi otomatis, ini hanya untuk sentuhan personal kalau perlu.)

---

## Bagian 6 — ✅ Rutinitas yang Disarankan

Tidak perlu setiap saat. Cukup pola sederhana ini:

**Setiap hari (2 menit):**
- [ ] Buka Midtrans → Transactions → pastikan tidak ada yang aneh.

**Setiap minggu (10 menit):**
- [ ] Jalankan "user baru 7 hari terakhir" & "premium aktif" (Bagian 3).
- [ ] Jalankan "pendapatan bulan ini".
- [ ] Cek "Premium akan habis 7 hari ke depan" → ingatkan bila perlu.

**Setiap bulan:**
- [ ] Jalankan "pertumbuhan user per bulan" & "total pendapatan" untuk melihat tren.

---

## Bagian 7 — Kamus Istilah

| Istilah | Arti sederhana |
|---------|----------------|
| **Supabase** | Layanan tempat semua data Kaswise disimpan (user, transaksi, dll). |
| **Midtrans** | Layanan pembayaran (payment gateway) yang memproses uang masuk. |
| **Tabel / Table** | Seperti satu sheet Excel berisi satu jenis data (mis. `profiles` = data semua user). |
| **Row / Baris** | Satu baris data = satu orang/satu catatan. |
| **Query / SQL** | Perintah untuk bertanya ke database, mis. "berapa total user?". |
| **RLS** | Aturan keamanan yang memastikan user hanya bisa melihat datanya sendiri. |
| **service_role / SECRET_KEY** | Kunci induk super-rahasia. **Jangan pernah dibagikan.** |
| **settlement / capture** | Status Midtrans yang berarti pembayaran **berhasil**. |
| **Order ID** | Nomor unik tiap pembayaran, berpola `kw-...`. |
| **plan_type** | Kolom di tabel `profiles`: `free` atau `premium`. |
| **plan_expires_at** | Tanggal berakhirnya Premium seseorang. |

---

*Dokumen ini bagian dari rencana 2 tahap: **Tahap 1** memakai alat yang sudah ada (panduan ini). **Tahap 2** (menyusul) = membuat "Halaman Owner" khusus agar semua ini bisa dilihat dalam satu layar berbahasa awam, tanpa membuka Supabase/Midtrans.*
