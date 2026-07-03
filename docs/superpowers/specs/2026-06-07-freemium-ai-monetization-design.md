# Freemium AI Monetization — Design Spec (2026-06-07)

## 1. Ringkasan

Memberlakukan model **freemium** di Kaswise: pencatatan **manual gratis selamanya**, pencatatan **AI dimonetisasi**. Pengguna gratis mendapat jatah **chat AI bulanan terbatas**; **foto struk eksklusif Premium**. Pembayaran **otomatis via Midtrans Snap** (QRIS + GoPay/ShopeePay). Biaya AI ditekan dengan pindah ke **Claude Haiku 4.5** + **prompt caching**, dan margin dijaga lewat **fair-use cap** pada akun Premium.

Target: **`backend` (FastAPI)** + **`apps/mobile` (Expo PWA, live di kaswise.com)**. **`apps/web` (legacy) tidak disentuh.**

## 2. Tujuan & Non-tujuan

**Tujuan**
- Monetisasi fitur AI dengan margin terjaga di semua skenario pemakaian.
- Free tier tetap berguna (manual tanpa batas + cicipi chat AI) agar retensi terjaga.
- Aktivasi Premium **otomatis** setelah bayar.

**Non-tujuan (v1)**
- Auto-renew / langganan berulang (recurring) — butuh tokenisasi; QRIS/e-wallet recurring terbatas.
- Layar admin khusus.
- Mekanisme grandfather user lama (basis user ~0 nyata; comp manual bila perlu).
- Perubahan pada `apps/web`.
- Pengingat kedaluwarsa otomatis (boleh manual dulu; cron menyusul).

## 3. Model Freemium

| Kapabilitas | Free | Premium |
|---|---|---|
| Catat manual | ✅ tanpa batas | ✅ tanpa batas |
| Chat AI (teks) | **25 / bulan** | **200 / bulan** (fair-use) |
| Foto struk (OCR) | **terkunci** (Premium-only) | **100 / bulan** (fair-use) |
| AI Insight | ❌ | ✅ (sudah Premium hari ini) |
| Model AI | Haiku 4.5 | Haiku 4.5 (Insight: Sonnet 4.6) |

**Aturan kuota**
- **Reset mengikuti tanggal langganan** (anniversary-based), otomatis via kunci `period_ym` yang dihitung dari tanggal pembayaran aktif; bukan reset kalender tanggal 1.
- **Hitung per pesan sukses**: 1 panggilan AI = 1 unit, walau menghasilkan banyak transaksi sekaligus. Panggilan **gagal/tidak terbaca tidak memotong** jatah.
- Saat limit tercapai: **gate tegas, manual selalu tersedia**.
  - Free, chat habis → **paywall**; foto → **paywall** (Premium-only).
  - Premium, foto cap → **blokir foto sampai reset**, chat tetap jalan.

## 4. Harga & Promo

| | Normal | Promo perkenalan (early-bird) |
|---|---|---|
| Bulanan | **Rp39.000** | **Rp29.000** |
| Tahunan | **Rp349.000** | **Rp249.000** |

- **Eligibility promo: kuota user** — **100 pelanggan Premium pertama** dapat harga promo. Parameter konfigurasi: `PROMO_MAX_SUBSCRIBERS` (default 100).
- Harga ditentukan **server-side saat checkout** berdasarkan jumlah pelanggan Premium berbayar yang sudah ada (< `PROMO_MAX_SUBSCRIBERS` → promo; selebihnya → normal).
- Renewal: harga dikunci **saat pembelian** (pembeli tahunan otomatis mengunci promo selama setahun); perpanjangan berikutnya pakai harga yang berlaku saat itu.

## 5. Arsitektur

```
apps/mobile (Expo PWA)                  backend (FastAPI)                     Supabase (Postgres + RLS)
─ Capture (chat/foto) ──┐  gating      ┌─ entitlements.py (plan + kuota) ───── profiles
─ Paywall + Snap webview ┼────────────▶├─ /ai/chat, /ai/receipt (Haiku+cache) ─ ai_usage
─ Status plan & kuota ───┘             ├─ /payments/create  (buat Snap)        ─ payments
─ Settings (kelola plan) ─             ├─ /payments/{order_id}/status (fallback)
                                       └─ /webhooks/midtrans (verifikasi+aktivasi)
                                                  ▲
                                       Midtrans Snap (QRIS / GoPay / ShopeePay) — SANDBOX dulu
```

**Modul baru/diubah (backend)**
- `app/core/entitlements.py` — sumber kebenaran plan + kuota (perluasan pola `require_premium` yang sudah ada).
- `app/api/v1/payments.py` — buat transaksi Snap + status-check.
- `app/api/v1/webhooks.py` — implementasi notifikasi Midtrans (saat ini stub).
- `app/api/v1/ai.py` — sisipkan pengecekan entitlement + increment kuota.
- `app/services/ai_service.py` — model Haiku 4.5 + prompt caching.

## 6. Data Model

`profiles.plan_type` (`free`|`premium`) & `plan_expires_at` — **sudah ada**.

**Tabel baru — `ai_usage`** (kuota pemakaian)
| kolom | tipe | catatan |
|---|---|---|
| `user_id` | uuid (FK auth.users) | PK bersama |
| `period_ym` | text (`YYYY-MM`) | PK bersama; reset implisit |
| `chat_count` | int default 0 | |
| `photo_count` | int default 0 | |
| `updated_at` | timestamptz | |
PK = (`user_id`, `period_ym`). Increment **atomik** (DB-side `update ... set chat_count = chat_count + 1`). RLS: user hanya baca barisnya sendiri; tulis lewat service role dari backend.

**Tabel baru — `payments`** (order Snap + idempotensi)
| kolom | tipe | catatan |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | |
| `order_id` | text **unik** | dipakai untuk idempotensi webhook |
| `plan` | text (`monthly`|`yearly`) | |
| `amount` | int | rupiah; **dari peta harga server-side** |
| `price_tier` | text (`promo`|`normal`) | |
| `method` | text | mis. `qris`/`gopay`/`shopeepay` (dari Midtrans) |
| `midtrans_status` | text | `transaction_status` mentah |
| `status` | text (`pending`|`paid`|`failed`|`expired`) | status internal |
| `paid_at` | timestamptz null | |
| `granted_until` | timestamptz null | `plan_expires_at` setelah aktivasi |
| `raw_payload` | jsonb | notifikasi terakhir (audit) |
| `created_at` | timestamptz | |

## 7. Gating & Kuota (backend, authoritative)

`entitlements.py` menyediakan:
- `is_premium_active(user) -> bool` — `plan_type='premium'` & (`plan_expires_at` null atau di masa depan). (Logika sama `require_premium`.)
- `check_and_reserve_chat(user)` dan `check_and_reserve_photo(user)`.

**`/ai/chat`**
1. `period = current_ym()`.
2. Premium aktif → batas = 200; selain itu (free) → batas = 25.
3. Baca `ai_usage(user, period).chat_count`. Jika `>= batas`:
   - free → HTTP **402** `{reason: "quota_exhausted", feature: "chat"}` (picu paywall).
   - premium → HTTP **429** `{reason: "fair_use", feature: "chat"}`.
4. Panggil Claude (Haiku). **Jika ekstraksi sukses (≥1 transaksi)** → `chat_count += 1` (atomik). Gagal/`unclear` total → tidak increment.

**`/ai/receipt`**
1. Free / tidak premium → HTTP **402** `{reason: "premium_only", feature: "photo"}` (paywall) — **tanpa** memanggil model.
2. Premium → batas foto = 100. `photo_count >= 100` → HTTP **429** `{reason: "fair_use", feature: "photo"}`.
3. Panggil Claude (Haiku). **Jika `readable` / sukses** → `photo_count += 1`. Gagal → tidak increment.

Endpoint baru **`GET /me/entitlements`** → `{ plan, plan_expires_at, chat_used, chat_limit, photo_used, photo_limit, period_ym }` untuk dipakai UI.

## 8. Pembayaran (Midtrans Snap)

**Peta harga (server-side, anti-tamper)**
```
monthly: { promo: 29000, normal: 39000 }
yearly:  { promo: 249000, normal: 349000 }
```
Tier dipilih server: hitung **jumlah user unik** yang pernah punya pembayaran `status='paid'`; jika `< PROMO_MAX_SUBSCRIBERS` → `promo`, selain itu `normal`. (User yang sudah pernah bayar promo tetap dihitung sebagai bagian dari kuota 100.)

**Alur**
1. `POST /payments/create` (auth) body `{plan}`:
   - tentukan `amount` + `price_tier` dari peta harga;
   - buat `order_id` unik (mis. `kw-{userid8}-{ts}`);
   - panggil Snap `create_transaction` dgn `enabled_payments=["qris","gopay","shopeepay"]`, `gross_amount=amount`, `item_details`;
   - simpan baris `payments` (status `pending`);
   - balikkan `{ snap_token, order_id }`.
2. Mobile buka **Snap** (webview/redirect) dengan `snap_token`.
3. **Webhook** `POST /webhooks/midtrans`:
   - baca **raw body**, verifikasi **signature** (`order_id+status_code+gross_amount+server_key`, helper `midtransclient`);
   - **idempoten**: cari `payments.order_id`; jika sudah `paid`, balas 200 tanpa aksi;
   - map `transaction_status`: `settlement`/`capture(accept)` → **paid**; `pending` → pending; `deny`/`cancel`/`expire` → failed/expired;
   - saat **paid**: set `profiles.plan_type='premium'`, `plan_expires_at = max(now, plan_expires_at_lama) + (30|365) hari`; update `payments` (`status='paid'`, `paid_at`, `granted_until`, `raw_payload`, `method`).
4. **Fallback** `GET /payments/{order_id}/status` — query status Midtrans bila webhook telat; jalankan aktivasi yang sama (idempoten).

**Konfigurasi**
- `MIDTRANS_IS_PRODUCTION=false` (sandbox) sampai akun merchant disetujui, lalu flip.
- Pastikan `TrustedHostMiddleware` mengizinkan host webhook & **proxy (NPM/Cloudflare) tidak mengubah raw body**.

## 9. Mobile / PWA UX

- Konsumsi `GET /me/entitlements` (mobile **belum baca plan sama sekali** — ini fondasi).
- **Capture**: tampilkan sisa kuota chat (free); tab **Foto** → gembok + paywall bila free; indikator dekat cap bila premium.
- **Paywall screen**: dua paket (harga sesuai tier yang berlaku) + benefit + tombol **Upgrade** → `/payments/create` → buka Snap; tangani hasil (sukses/pending/gagal) + refresh entitlements.
- **Settings**: status plan + masa berlaku + tombol "Perpanjang".
- Manual entry selalu tersedia.

## 10. Optimasi Biaya

- **Model**: pindahkan chat & foto ke **Haiku 4.5** (`ANTHROPIC_MODEL_EXTRACT` baru, default `claude-haiku-4-5`). Insight tetap Sonnet 4.6 (`ANTHROPIC_MODEL_INSIGHT`). **Uji akurasi OCR struk dengan Haiku**; jika kurang, foto fallback ke Sonnet (cap foto lebih konservatif).
- **Prompt caching**: tambahkan `cache_control: {type: ephemeral}` pada system prompt chat & receipt → input ter-cache ~0,1×.

## 11. Unit Economics (acuan, FX ~Rp16.000/USD)

Biaya per operasi (Haiku 4.5, perkiraan): chat ~Rp29, foto ~Rp53. Fee Midtrans: QRIS ~0,7%, e-wallet ~2%.

Margin Premium bulanan (net ~Rp28.400 setelah fee, harga promo Rp29k):
| Skenario | Biaya AI | Margin |
|---|---|---|
| Wajar (30 chat, 15 foto) | ~Rp1.665 | ~94% |
| Aktif (100 chat, 50 foto) | ~Rp5.550 | ~80% |
| Worst-case (cap 200+100) | ~Rp11.100 | ~61% |

Margin positif di semua skenario; tahunan & harga normal lebih sehat lagi.

## 12. Edge Cases & Keamanan

- **Harga**: selalu server-side; klien tak pernah mengirim nominal.
- **Webhook**: verifikasi signature + idempotensi by `order_id` + raw body utuh.
- **Race kuota**: increment atomik di DB (hindari double-spend).
- **Bayar tapi webhook hilang**: status-check fallback + aktivasi idempoten.
- **Kedaluwarsa**: otomatis balik free (cek `plan_expires_at`).
- **Promo habis saat user di tengah checkout**: tier dikunci di baris `payments` saat create (harga yang dilihat user dihormati sampai order itu expired).
- **Service role key**: hanya dipakai backend; jangan bocor ke klien.

## 13. Di Luar v1 (fase berikutnya)
Auto-renew/recurring; layar admin; pengingat kedaluwarsa otomatis (cron); foto Core-API QRIS native; `apps/web`; **uji & flip produksi Midtrans** (tergantung approval merchant); dashboard biaya/konversi (event log).

## 14. Parameter Konfigurasi
- `PROMO_MAX_SUBSCRIBERS` = 100
- `FREE_CHAT_MONTHLY` = 25
- `PREMIUM_CHAT_MONTHLY` = 200
- `PREMIUM_PHOTO_MONTHLY` = 100
- `PRICE_MONTHLY_PROMO/NORMAL` = 29000 / 39000
- `PRICE_YEARLY_PROMO/NORMAL` = 249000 / 349000
- `ANTHROPIC_MODEL_EXTRACT` = `claude-haiku-4-5`
- `ANTHROPIC_MODEL_INSIGHT` = `claude-sonnet-4-6`
- `MIDTRANS_IS_PRODUCTION` = false (sandbox)
