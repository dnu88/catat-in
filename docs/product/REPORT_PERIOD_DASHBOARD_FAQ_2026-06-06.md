# Report Period + Dashboard FAQ

Date: 2026-06-06
Surface: `apps/mobile` / PWA `https://kaswise.com`
Audience: Support, QA, and future in-app help copy

## Apa itu `Sisa bulan ini`?

`Sisa bulan ini` adalah pemasukan bulan berjalan dikurangi pengeluaran bulan berjalan.

```text
Sisa bulan ini = pemasukan bulan ini - pengeluaran bulan ini
```

Nilai ini membantu user melihat performa cashflow bulan ini, bukan jumlah aset atau saldo dompet.

## Apa itu `Sisa periode ini`?

`Sisa periode ini` muncul ketika user memilih periode selain bulan berjalan, misalnya custom range atau aturan periode tersimpan.

```text
Sisa periode ini = pemasukan periode aktif - pengeluaran periode aktif
```

Contoh:

```text
Periode aktif: Siklus gajian · 25 Mei – 24 Jun 2026
```

Maka nilai hero dashboard dihitung hanya dari transaksi tanggal 25 Mei sampai 24 Juni 2026.

## Apa bedanya `Total saldo` dan `Sisa bulan/periode ini`?

`Total saldo` adalah total saldo semua dompet aktif.

```text
Total saldo = saldo semua dompet aktif
```

`Sisa bulan ini` atau `Sisa periode ini` adalah performa cashflow pada periode aktif.

```text
Sisa periode = pemasukan periode - pengeluaran periode
```

Keduanya sengaja dipisahkan supaya saldo dompet tidak tercampur dengan performa cashflow.

## Bagaimana membuat aturan periode gajian?

1. Buka `Laporan / Reports`.
2. Pilih `Kustom / Custom`.
3. Pilih tanggal mulai dan selesai, misalnya `25 Mei – 24 Jun`.
4. Tap `Simpan sebagai aturan / Save as rule`.
5. Beri nama, misalnya `Siklus gajian`.
6. Simpan.

Aturan tersebut akan muncul di `Aturan periode / Saved periods` dan bisa dipilih ulang kapan saja.

## Apa fungsi aturan `25–24`?

Aturan `25–24` berarti periode laporan berjalan dari tanggal 25 sampai tanggal 24 siklus berikutnya.

Contoh jika hari ini Juni 2026:

```text
25 Mei 2026 – 24 Jun 2026
```

Setelah masuk siklus berikutnya, periode otomatis bergeser.

## Apakah periode aktif sinkron ke Dashboard dan Transactions?

Ya.

Jika user memilih aturan periode di Reports:

- Dashboard memakai periode yang sama untuk hero cashflow.
- Transactions default ke filter `Laporan / Report` dengan periode yang sama.
- Reports tetap menjadi tempat utama untuk memilih dan mengelola periode.

## Bagaimana kembali ke bulan ini?

Di Dashboard dan Reports tersedia tombol:

```text
Bulan ini / This month
```

Tombol ini mengembalikan periode aktif ke bulan berjalan.

## Bagaimana menyembunyikan nominal di Dashboard?

Di Dashboard, tap icon mata:

```text
Eye      = nominal terlihat
EyeSlash = nominal disembunyikan
```

Saat disembunyikan, nominal ditampilkan sebagai:

```text
Rp ••••••
```

Preference ini tersimpan lokal di perangkat/browser.

## Di mana mengubah tema gelap/terang?

Theme toggle sekarang ada di header Dashboard:

```text
Sun  = ganti ke mode terang
Moon = ganti ke mode gelap
```

Section `Tampilan / Appearance` sudah tidak ada di Settings.
