# Rilis backend AI: DeepSeek sebagai pembaca struk & penyedia Insight

Tanggal: 2026-10-10 · Lingkup: `backend/` (API produksi `api.kaswise.com`)

## Latar: insiden kredit provider

Seluruh fitur AI produksi mati karena kredit habis di semua akun:

| Provider | Peran awal | Error |
| --- | --- | --- |
| DeepSeek | teks (Catat via kalimat) | `402 Insufficient Balance` |
| Anthropic | cadangan teks + **Insight** + cadangan struk | `400 Your credit balance is too low` |
| Gemini | **struk/OCR** utama | `402 prepayment credits are depleted` |

Gejalanya menipu: di HP hanya tampak "Failed to fetch" karena 502 dari origin,
setelah melewati Cloudflare, keluar tanpa header CORS sehingga Chrome melaporkannya
sebagai error CORS.

Setelah kredit DeepSeek diisi ulang, jalur teks pulih. Jalur **struk** dan **Insight**
tetap mati karena keduanya tidak memakai DeepSeek — di situlah dua rilis ini masuk.

## Temuan penting: DeepSeek sanggup membaca gambar

Asumsi lama "DeepSeek tidak menerima gambar" (tertanam di kode dan dokumen deploy)
terbukti **keliru**. Probe terkendali:

- `GET /models` → `deepseek-flash` mengiklankan `input_modalities ['text','image']`
- Dua struk sintetis berbeda (kode nota acak + merchant + total berbeda) dibaca **tepat**
  sesuai masing-masing gambar
- Kontrol tanpa gambar → jawaban kosong (`kode_nota: ""`), jadi bukan halusinasi
- Catatan: `deepseek-flash` adalah model **reasoning** — dengan `max_tokens` kecil seluruh
  anggaran habis untuk `reasoning_content` dan `content` kosong pada HTTP 200

## Rilis 1 — DeepSeek membaca struk

- Commit: `2162790`
- Image: `kaswise-backend:vision-20261010t120000z` (`c0b8bb1e7356`)
- Perubahan: `_deepseek_receipt_json`, `VISION_PROVIDER_ORDER` (bawaan
  `deepseek,gemini,anthropic`), `_RECEIPT_MAX_TOKENS=2500`, plus koreksi komentar usang

## Rilis 2 — DeepSeek sebagai penyedia Insight

- Commit: `d5850f1`
- Image: `kaswise-backend:insight-20261010t130000z` (`18b2c83998ed`)
- Perubahan: `_deepseek_insight_json` + `_anthropic_insight_json`, `insight_provider_order()`
  membaca `INSIGHT_PROVIDER_ORDER` (bawaan `deepseek,anthropic`), `INSIGHT_MAX_TOKENS=4000`
- Prompt Insight dipindah apa adanya; semua provider gagal → tetap ringkasan lokal
  (tidak pernah 500), dengan pesan jujur

## Mekanisme rilis yang dipakai (penting untuk rilis berikutnya)

Backend produksi **tidak** di-deploy dari `~/apps/kaswise`. Detail lengkap ada di skill
`mobile-feature-rollout-workflows` → `references/kaswise-backend-release-mechanism.md`.
Ringkas:

1. **Jangan** `docker compose up` dari `~/apps/kaswise` — tidak ada `.env` di sana, rahasia
   akan ter-interpolasi kosong.
2. Overlay rilis memaku `build.context` ke **snapshot** di `.release-backups/`, bukan worktree.
3. Basis yang benar = **sumber dari image live** (`docker run … tar cf - -C /app`), lalu
   tambahkan hanya delta yang diinginkan; buktikan isolasi dengan membandingkan hash semua
   `.py` terhadap image live.
4. `docker restart nginx-proxy-manager` **wajib** setelah swap (upstream Docker di-cache).
5. Rollback = chain overlay rilis lama (memaku image sha) + `up -d --no-deps backend`.

## Verifikasi

| Uji | Hasil |
| --- | --- |
| Isolasi sumber vs image live (kedua rilis) | Tepat 3 file berubah, 0 file baru/hilang |
| Tes backend | 263 lulus (rilis 1) → 270 lulus (rilis 2) |
| `POST /api/v1/ai/receipt` live | 200 — `total 275000`, `merchant TOKO BANGUN JAYA`, `readable true` |
| `POST /api/v1/ai/insight` live | 200 — ringkasan AI sungguhan (bukan ringkasan lokal) |
| `POST /api/v1/ai/chat` live | 200 — ekstraksi transaksi normal |
| Env runtime | 54/54 identik sebelum dan sesudah kedua swap |
| Kesehatan | container `healthy`; `app.kaswise.com` 200; `/health` ok |

## Catatan divergensi

`config.py` pada image live memuat tambahan dari rilis notifikasi yang **tidak ada** di
worktree `prod/kaswise-backend-live`. Karena itu delta config selalu diterapkan sebagai
**patch di tempat** pada snapshot, bukan menimpa file utuh. Sumber otoritatif sebuah rilis
adalah direktori snapshot + image-nya, bukan worktree.
