# Security Audit — Catat.in / Kaswise (Full Review)

> **Status:** 🟡 PARTIALLY REMEDIATED — repo-side fixes implemented; production Supabase policy verification remains.
> **Tanggal audit:** 2026-06-12
> **Remediation branch:** `fix/security-audit-2026-06-12`
> **Commit saat audit:** `490cf77` (branch `fix/bills-color-and-mark-paid`)
> **Auditor:** Claude (Opus 4.8) — review otomatis, 3 agen paralel + verifikasi manual
> **Scope:** Supabase RLS, backend FastAPI, konfigurasi/secret/dependency, Docker, CI/CD

---

## Remediation status — 2026-06-13

Repo-side fixes have been implemented for C1, H1, H2, H3, M1, M2, M3, M4, M5, L1, and L3:

- hardcoded TestSprite key values were replaced with `${TESTSPRITE_API_KEY}` placeholders in tracked config files;
- payment status now checks order ownership before calling Midtrans;
- payment webhook/status sync validates amount and treats terminal states idempotently;
- upload/import paths now enforce bounded reads/rows and spreadsheet formula escaping;
- backend dependencies were upgraded until `pip-audit -r backend/requirements.txt` returned no known vulnerabilities;
- backend Docker runtime now uses a non-root user and `.dockerignore` excludes dev/env artifacts;
- Vercel response headers now include HSTS and remove script `unsafe-inline` from CSP;
- a Supabase migration drops known legacy permissive RLS policies if they exist.

Still pending outside the repo:

1. Run the new Supabase migration and verify production `pg_policies` has no legacy permissive policies.

Completed external action:

- TestSprite API key was revoked by the account owner on 2026-06-13.

Verification evidence from remediation:

- Backend tests: `148 passed`.
- Backend dependency audit: `pip-audit -r requirements.txt` → `No known vulnerabilities found`.
- Backend Docker build: successful.
- Web type-check/build: successful.
- Mobile type-check: successful.
- Mobile targeted tests: notifications and motion coverage pass; full mobile Jest still has a pre-existing settings test harness issue unrelated to these security fixes.

---

## 0. Cara pakai dokumen ini (untuk model/agen penerus)

1. Kerjakan temuan **berurutan sesuai prioritas** di [§2](#2-action-plan-berurutan). Jangan loncat.
2. Setiap temuan punya **ID stabil** (C1, H1, …). Saat selesai, ubah checkbox `[ ]` → `[x]` dan tambahkan catatan commit di kolom Status.
3. Temuan bertanda **⚠️ butuh aksi di luar repo** (rotate key, cek production DB) **tidak bisa** diverifikasi dari kode — tandai dan minta konfirmasi user.
4. Severity rating sudah **direkonsiliasi & diverifikasi manual** — beberapa temuan agen di-*downgrade* (lihat catatan). Jangan menaikkan severity tanpa bukti baru.
5. Setelah memperbaiki, jalankan ulang verifikasi yang tercantum di tiap temuan.

---

## 1. Ringkasan eksekutif

**Postur keamanan secara umum BAGUS — di atas rata-rata.** Fondasi solid:

- ✅ Verifikasi JWT Supabase kuat (JWKS, allowlist algoritma, `alg=none` diblok, audience/issuer/expiry dicek)
- ✅ RLS Supabase berkualitas tinggi — semua tabel data user `auth.uid()`-scoped + `WITH CHECK`, proteksi privilege-escalation household eksplisit
- ✅ Webhook Midtrans signature SHA512 + constant-time compare
- ✅ Tidak ada SQL injection (semua via Supabase SDK parameterized), tidak ada SSRF
- ✅ Secret tidak ada di source code; `service_role` key tidak bocor ke mobile (hanya anon key)
- ✅ CORS non-wildcard, security headers backend lengkap, compose production di-hardening (read-only rootfs, `cap_drop: ALL`, `no-new-privileges`)

**Tapi ada lubang nyata** yang harus ditutup — terutama 1 secret bocor & 1 IDOR di endpoint pembayaran.

| Severity    | Jumlah | Temuan                                                        |
| ----------- | ------ | ------------------------------------------------------------- |
| 🔴 Critical | 1      | C1 (TestSprite key bocor di git)                              |
| 🟠 High     | 3      | H1 (payment IDOR), H2 (migrasi RLS konflik), H3 (dep CVE)     |
| 🟡 Medium   | 5      | M1–M5                                                         |
| ⚪ Low       | 4      | L1–L4                                                         |

> **Koreksi vs draf awal:** temuan "Midtrans key di `.env.example`" **dibatalkan** — `.env.example` yang ter-track sudah kosong (`MIDTRANS_SERVER_KEY=`); agen salah membaca `backend/.env` (gitignored). Temuan "secret production di `.env.production`" **di-downgrade** dari Critical → hardening biasa (file gitignored, perms `600`, tidak pernah masuk histori git — ini praktik standar, bukan kerentanan).

---

## 2. Action plan berurutan

### 🔴 CRITICAL

- [x] **C1 — Rotate API key TestSprite + keluarkan dari `.mcp.json`**

  - **File:** `.mcp.json:7` — hardcoded TestSprite API key (REDACTED)
  - **Bukti:** `git ls-files .mcp.json` → **tracked**. Key asli ter-commit ke histori git → siapa pun dengan akses repo / clone lama bisa mengambil. Histori git tetap menyimpan walau dihapus sekarang.
  - **Dampak:** Penyalahgunaan kuota/billing TestSprite atas nama akun user.
  - **Fix:**
    1. ⚠️ **Revoke/rotate** key di dashboard TestSprite (di luar repo).
    2. Ganti nilai di `.mcp.json` jadi `"API_KEY": "${TESTSPRITE_API_KEY}"` (env var).
    3. Bila repo pernah dibagikan/publik: bersihkan histori dengan `git filter-repo` / BFG, lalu force-push (koordinasi dengan tim).
  - **Verifikasi:** secret scan tidak menemukan API key literal; `.mcp.json` hanya berisi placeholder env var.
  - **Status:** Repo-side placeholders implemented in `ef90d89`; exposed TestSprite API key revoked by account owner on 2026-06-13.

### 🟠 HIGH

- [ ] **H1 — IDOR di `GET /payments/{order_id}/status`**

  - **File:** `backend/app/api/v1/payments.py:70-76` → `backend/app/services/payment_service.py:65` (`fetch_and_sync_status`)
  - **Masalah:** Endpoint menerima `order_id` sembarang tanpa cek bahwa order itu milik `current_user["user_id"]`. Order ID polanya tertebak: `kw-{user_id[:8]}-{epoch_ms}-{6 hex}` (`payment_service.py:81-83`).
  - **Dampak:**
    1. Enumerasi/menebak `order_id` user lain → bocor status pembayaran (IDOR).
    2. Memicu `activate_premium_from_notification()` dari hasil `core.transactions.status()` Midtrans → jalur aktivasi premium yang **melewati cek signature webhook**.
    3. Panggilan keluar Midtrans tak terbatas → cost/abuse.
  - **Fix:** Sebelum panggil Midtrans, lookup row `payments` by `order_id`, pastikan `row["user_id"] == current_user["user_id"]` (return 404 kalau bukan). Tambah rate-limit pada endpoint ini.
  - **Verifikasi:** Tulis test: user A request `order_id` milik user B → 404; user A request order_id sendiri → 200.
  - **Status:** _belum dikerjakan_

- [ ] **H2 — Dua set migrasi RLS konflik (kebersihan migrasi)** ⚠️ verifikasi butuh akses production DB

  - **File:** `supabase/migrations/001_initial_schema.sql`, `002_*.sql`, `003_*.sql`, `008_fix_group_members_rls_recursion.sql` (set legacy era Firebase) vs set Kaswise `202605…`
  - **Masalah:** Policy legacy permisif — `transactions_own` (008:33, `FOR ALL`), `wallets_own_and_group` (008:43), `groups_member_access` (008:53), `group_members_access` (008:59), `profiles_own` (003:253) — **tidak pernah di-`DROP`** oleh migrasi Kaswise. Postgres menggabung multiple permissive policy dengan **OR**, jadi kalau set legacy ikut ter-`push` ke DB, akses bisa **melebar lintas user/grup**.
  - **Mitigasi yang sudah ada:** Set Kaswise pakai `create table if not exists` dan tabelnya tidak punya kolom `is_shared`/`group_id`, jadi bila set legacy belum pernah jalan, policy-nya tidak terbentuk. Tapi tetap berbahaya untuk deploy fresh / `db push` di environment baru.
  - **Fix:**
    1. Pindahkan file `001`–`008` keluar dari path migrasi (mis. `supabase/migrations/legacy/`), ATAU buat satu migrasi squash dengan `drop policy if exists` eksplisit untuk semua nama policy legacy.
    2. ⚠️ **Verifikasi di production DB:**
       ```sql
       select schemaname, tablename, policyname, qual
       from pg_policies where schemaname = 'public'
       order by tablename, policyname;
       ```
       Pastikan **hanya** policy dari set `202605…` yang hidup; tidak ada `transactions_own`, `groups_member_access`, dll.
  - **Status:** _belum dikerjakan_

- [ ] **H3 — Dependency backend dengan CVE diketahui**

  - **File:** `backend/requirements.txt`
  - `python-jose[cryptography]==3.3.0` (baris 34) — CVE-2024-33663 (algorithm confusion via OpenSSH ECDSA key) & CVE-2024-33664 (JWE decompression DoS / "JWT bomb"). **Relevan** karena dipakai verifikasi JWT Supabase. → upgrade ≥ **3.4.0**, atau migrasi ke `PyJWT`.
  - `Pillow==10.3.0` (baris 31) — CVE-2024-28219 (buffer overflow di `_imagingcms.c`). Backend memproses gambar struk upload → vektor langsung. → upgrade ≥ **10.4.0** (idealnya ≥11.x).
  - **Verifikasi:** `pip install -U` lalu jalankan test suite backend; konfirmasi verifikasi JWT masih lulus.
  - **Status:** _belum dikerjakan_

### 🟡 MEDIUM

- [ ] **M1 — `/ai/receipt` baca seluruh file sebelum cek ukuran (risiko OOM)**
  - `backend/app/api/v1/ai.py:90-95` — `image_data = await file.read()` membaca seluruh upload sebelum cek `MAX_FILE_SIZE`. Client bisa stream body besar → exhaust memory.
  - **Fix:** Tiru pola `imports.py:135-149` — cek header `Content-Length` + baca terbatas (`await file.read(MAX_FILE_SIZE + 1)`).

- [ ] **M2 — Import Excel/CSV: tidak ada guard zip-bomb / decompression ratio**
  - `backend/app/services/import_service.py:168-183`, `imports.py:224` — `MAX_ROWS` baru dicek **setelah** `pd.read_excel` parse penuh; `.xlsx` kecil bisa mekar besar di memori. Formula injection (`=`, `+`, `-`, `@`) juga lolos verbatim ke `description`/`merchant`.
  - **Fix:** Cap `nrows` di `read_excel`/`read_csv` ke `MAX_ROWS+1`; prefix-escape karakter formula di field teks sebelum disimpan.

- [ ] **M3 — Webhook tidak cross-check `gross_amount` vs `payments.amount`**
  - `backend/app/api/v1/webhooks.py:11-17`, `payment_service.py:112-151` — signature sudah benar, tapi idempotency hanya short-circuit status `paid`; status `failed`/`expired` bisa diproses ulang, dan nominal tidak diverifikasi.
  - **Fix:** Verifikasi `payload.gross_amount == payments.amount` sebelum aktivasi; treat semua status terminal sebagai no-op.

- [ ] **M4 — Container backend jalan sebagai root**
  - `backend/Dockerfile` — tidak ada directive `USER`. **Sangat dimitigasi** oleh `docker-compose.production.yml` (`read_only: true`, `cap_drop: ALL`, `no-new-privileges:true`, `pids_limit`, `mem_limit`), tapi `USER` non-root tetap defense-in-depth yang hilang.
  - **Fix:** Tambah user non-root di Dockerfile (`useradd`, `chown` app dir, `USER appuser`), sesuaikan path `/root/.local` ke home user baru.

- [ ] **M5 — Vercel (web legacy): HSTS hilang + CSP `unsafe-inline`**
  - `vercel.json:24-49` — sudah ada CSP/X-Frame-Options/nosniff/Referrer-Policy, tapi **tidak ada** `Strict-Transport-Security`; dan `script-src` mengizinkan `'unsafe-inline'`.
  - **Fix:** Tambah `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`; hapus `'unsafe-inline'` dari `script-src` (pakai nonce/hash untuk build Vite).

### ⚪ LOW

- [ ] **L1 — Error handler AI/import bocorkan detail upstream** — `ai_service.py:120,176` & `import_service.py:184-185` melempar `str(exc)` mentah ke client (`ai.py:73,110,129`; `imports.py:218-222`). Log server-side, return pesan generik.
- [ ] **L2 — Rate limiter per-proses in-memory** — `backend/app/core/rate_limit.py:10-37`; dengan `--workers 2` + multi-instance, limit efektif = N × workers × instances. Pindah ke Redis / proxy-level untuk multi-worker.
- [ ] **L3 — Permission file `.env` longgar** — `.worktrees/family-finance/apps/mobile/.env` perms `-rw-rw-r--` (world-readable). Hanya berisi anon key (bukan secret server), tapi jadikan `chmod 600` sebagai kebijakan konsisten.
- [ ] **L4 — `generate_tx_hash` pakai MD5** — `import_service.py:116-122`; untuk dedup, bukan keamanan, dan di-re-derive server-side (`imports.py:256-261`) jadi tak bisa dipalsukan. Pertimbangkan SHA-256 untuk higiene.

---

## 3. Hal yang sudah AMAN (verified — JANGAN diutak-atik tanpa alasan)

| Area                  | Bukti / Lokasi                                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **JWT verification**  | `backend/app/core/auth.py:163-247` — JWKS RS256/ES256, allowlist algoritma, `alg=none` & confusion diblok, aud/iss/exp dicek, `role==authenticated` + `sub` UUID divalidasi |
| **Semua endpoint ber-auth** | Semua route `ai.py`/`imports.py`/`payments.py`/`me.py`/`notifications.py` pakai `Depends(get_current_user)`/`require_premium`. Public hanya `/health`, `/`, `/webhooks/midtrans` (signature-verified) |
| **RLS Kaswise (`202605…`)** | Semua tabel data user RLS-enabled, `auth.uid()`-scoped, `WITH CHECK` cegah spoofing; household punya proteksi privilege-escalation (`household_members_insert_admin/update_admin`, `join_household_by_invite_code` selalu `member`) + test regresi |
| **Trigger proteksi field** | `prevent_profile_server_managed_field_change` (billing), `prevent_wallet_balance_direct_change` (saldo), `prevent_financial_scope_change` — hanya service_role yang bisa ubah |
| **service_role tidak bocor** | `apps/mobile/src/lib/supabase.ts` hanya `EXPO_PUBLIC_SUPABASE_ANON_KEY`. service_role hanya di backend & Edge Functions |
| **Webhook signature**  | `payment_service.py:34-38` — SHA512 + `hmac.compare_digest` (constant-time) sebelum perubahan state |
| **Tidak ada SQLi / SSRF** | Semua DB via Supabase SDK query builder parameterized; OCR hanya base64 bytes upload (tidak fetch URL) |
| **Prompt injection terbatas** | Input chat capped 2–500 char (`ai.py:48-58`); output insight di-sanitasi (`_sanitize_string`, `ai_service.py:319-347`); user text dikirim sebagai message `user` terpisah, bukan disambung ke system prompt |
| **CORS / headers / debug** | `main.py:33-61` — origins non-wildcard (`config.py:181-193` hard-fail kalau `*`/non-HTTPS/localhost di prod), `allow_credentials` default false, HSTS/CSP/X-Frame/nosniff, docs dimatikan saat non-DEBUG, TrustedHostMiddleware aktif |
| **Compose production**  | `docker-compose.production.yml` — read-only rootfs, `cap_drop: ALL`, `no-new-privileges`, resource limits, DB port hanya `expose` (tidak ke host), semua secret via `${VAR}`, base image di-pin `python:3.12-slim` |
| **Secret management**   | Tidak ada secret di source code; tidak pernah masuk histori git (kecuali C1); `.gitignore` benar (`.env`, `.env.production`, `*.key`); `.env.production` perms `600` |
| **CI/CD**               | `ci.yml`/`golive-pwa.yml` — tidak ada `pull_request_target` berbahaya; secret via `${{ secrets.* }}`; SECRET_KEY CI hanya dummy |

> **⚠️ Catat:** `backend/.env` lokal punya `DEBUG=true`/`ENVIRONMENT=development`. **Pastikan deployment production memakai `.env.production` dengan `DEBUG=false`/`ENVIRONMENT=production`** — kalau tidak, docs endpoint & TrustedHostMiddleware ikut nonaktif.

---

## 4. Metodologi & cakupan

- **3 agen paralel:** (a) RLS Supabase, (b) backend FastAPI (auth/webhook/AI/import/IDOR), (c) konfigurasi/secret/dependency/Docker/CI.
- **Verifikasi manual:** status tracking git untuk `.mcp.json`, `.env*`, histori git untuk secret, isi `.env.example`.
- **TIDAK dicakup (saran audit lanjutan):**
  - Pengujian dinamis / DAST terhadap endpoint live.
  - `pnpm audit` / `npm audit` penuh untuk dependency frontend (mobile/web) — hanya backend `requirements.txt` yang dicek.
  - Audit Edge Functions Supabase (`supabase/functions/*`) secara mendalam.
  - Verifikasi langsung state `pg_policies` di production DB (perlu kredensial — lihat H2).
  - Review keamanan legacy `apps/web` (Firebase) — status maintenance-only.

---

## 5. Changelog dokumen

| Tanggal    | Perubahan                                              |
| ---------- | ------------------------------------------------------ |
| 2026-06-12 | Dokumen dibuat — audit penuh, semua temuan masih OPEN  |
