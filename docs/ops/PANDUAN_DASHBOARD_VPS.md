# Panduan Dashboard Monitoring VPS Kaswise

Panduan ini untuk pemilik non-teknis. Tiga dashboard ini membantu kamu memantau kesehatan server dan aplikasi Kaswise tanpa perlu akses SSH.

---

## 1. Tiga Bookmark — Simpan Sekarang

| Bookmark | Fungsi | Alat |
|---|---|---|
| `status.kaswise.com` | Cek apakah website/aplikasi hidup | Uptime Kuma |
| `health.kaswise.com` | Cek kesehatan server (RAM, CPU, disk) | Beszel |
| `panel.kaswise.com` | Lihat & restart container | Portainer |

---

## 2. Cara Masuk (2 Langkah)

**Langkah 1 — Cloudflare Access:**
Setiap kali buka dashboard, kamu akan diminta:
1. Masukkan email: `danubudiarto88@gmail.com`
2. Cek email kamu — akan ada kode OTP 6 digit
3. Masukkan kode tersebut
4. (Session berlaku 24 jam — tidak perlu login ulang di hari yang sama)

**Langkah 2 — Login alat:**
Setelah lolos Cloudflare, login dengan username & password yang sudah kamu buat saat setup.

---

## 3. Status Dashboard — Memantau Uptime

Buka `status.kaswise.com`.

**Yang dilihat:**
- **Hijau / "Up"** = website hidup normal
- **Merah / "Down"** = website tidak bisa diakses

**Monitor yang terpasang:**
- `Aplikasi Kaswise` — memantau `https://kaswise.com`
- `Backend API` — memantau `https://api.kaswise.com/health`

Kamu akan dapat notifikasi Telegram otomatis kalau salah satu **down** atau **sertifikat HTTPS mau kedaluwarsa**.

---

## 4. Health Dashboard — Memantau Kesehatan Server

Buka `health.kaswise.com`.

**Yang dilihat:**
- **Grafik RAM** — berapa banyak memori terpakai
- **Grafik CPU** — beban prosesor
- **Grafik Disk** — kapasitas penyimpanan
- **Status Container** — setiap aplikasi dalam container Docker

**Warna grafik:**
- **Hijau** = sehat, tidak ada masalah
- **Kuning/Oranye** = mendekati batas
- **Merah** = melebihi ambang (kamu akan dapat notifikasi Telegram)

---

## 5. Panel Dashboard — Mengelola Container

Buka `panel.kaswise.com`.

### Cara Restart Aplikasi (kalau lemot atau error)

1. Klik **Containers** di menu kiri
2. Cari container yang ingin direstart (mis. `kaswise-backend`)
3. Centang kotak di sebelah kiri nama container
4. Klik tombol **Restart** di bagian atas

> 💡 Tunggu 10-30 detik setelah restart — aplikasi perlu waktu untuk siap kembali.

### Cara Lihat Log (kalau ingin tahu error)

1. Klik nama container (mis. `kaswise-backend`)
2. Scroll ke tab **Logs**
3. Kamu akan melihat log terbaru aplikasi

---

## 6. Apa yang Harus Dilakukan Saat Dapat Alert Telegram

### Alert: "Aplikasi Down" atau "Monitor Down"

1. Buka `status.kaswise.com` — lihat monitor mana yang merah
2. Buka `panel.kaswise.com` → Containers → restart container yang bermasalah
3. Tunggu 1-2 menit, cek `status.kaswise.com` — harusnya hijau lagi
4. Kalau masih merah setelah restart, hubungi teknisi

### Alert: "RAM > 85%" atau "Disk > 85%"

1. Buka `health.kaswise.com` — lihat grafik, apa yang tinggi
2. Buka `panel.kaswise.com` — lihat container mana yang paling banyak pakai resource
3. Kalau tidak yakin, hubungi teknisi

### Alert: "Sertifikat HTTPS Kedaluwarsa"

Ini biasanya otomatis diperpanjang oleh Nginx Proxy Manager. Tapi kalau dapat alert ini:
1. Hubungi teknisi untuk cek
2. Jangan diabaikan — website akan muncul peringatan "Not Secure" kalau sertifikat kedaluwarsa

---

## 7. Yang TIDAK BOLEH Disentuh di Portainer

Di halaman Containers, **jangan**:
- ❌ Hapus (Remove) container `kaswise-backend`
- ❌ Hapus (Remove) container `nginx-proxy-manager`
- ❌ Stop container production tanpa alasan jelas
- ❌ Hapus volume/data

Yang **boleh**:
- ✅ Restart container
- ✅ Lihat log
- ✅ Lihat status (running/stopped)

---

## 8. Ringkasan Cepat

| Saya mau... | Buka... | Lalu... |
|---|---|---|
| Cek apakah website hidup | `status.kaswise.com` | Lihat warna hijau/merah |
| Cek RAM/CPU server | `health.kaswise.com` | Lihat grafik |
| Restart aplikasi | `panel.kaswise.com` | Containers → pilih → Restart |
| Lihat error aplikasi | `panel.kaswise.com` | Klik container → tab Logs |
| Dapat alert masalah | Telegram DM | Ikuti panduan bagian 6 |

---

*Dokumen ini dibuat 16 Juni 2026. Update terakhir: 16 Juni 2026.*
