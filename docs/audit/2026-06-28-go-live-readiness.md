# Audit Go-Live & Monetisasi — Kaswise (catat-in)
**Tanggal audit:** 28 Juni 2026
**Auditor:** Forge (coding agent, automated audit)
**Profile yang diaudit:** `danubudiarto88@gmail.com` (production Supabase)

---

## 🔴 Critical Issues (harus selesai sebelum go-live)

### 1. Tidak ada error tracking / monitoring production
- **Severity:** HIGH
- **Evidence:** Tidak ditemukan Sentry, Crashlytics, atau service log aggregation (search `sentry\|Sentry\|bugsnag\|crashlytics` → 0 results)
- **Risk:** Error di production tidak akan terdeteksi sampai user melapor. Budget sync silent failure yang baru kita fix adalah contoh konkret.
- **Rekomendasi:** Install Sentry `@sentry/react-native` di mobile. Pasang log handler di Python backend. Atau minimal setup cron job monitoring health endpoint.

### 2. Tidak ada rate limiting di API endpoint AI/payment
- **Severity:** HIGH
- **Evidence:** Backend route handler tidak menggunakan rate limit middleware (grep `rate_limit\|RateLimit` → hanya ada 1 file `core/rate_limit.py` tapi tidak dipakai di routers).
- **Risk:** Abuse endpoint `/api/v1/ai/chat` bisa menghabiskan kredit Anthropic. Endpoint payment bisa di-brute-force.
- **Rekomendasi:** Aktifkan `RateLimitMiddleware` di FastAPI app. Limit `/ai/chat`: 20 req/menit untuk free user, 100 untuk premium.

### 3. Webhook Mayar tidak verify signature
- **Severity:** HIGH
- **Evidence:** Skill `secure-code-review` + code comment di `backend/app/api/v1/webhooks.py` menyebutkan Mayar tidak sign payload. Handler hanya re-fetch dari API.
- **Risk:** Attacker bisa kirim fake webhook notification — walaupun premium activation hanya terjadi setelah re-fetch valid, ini bisa menyebabkan database spam dan resource waste.
- **Rekomendasi:** Tambah rate limiting spesifik untuk endpoint webhook. Log dan throttle IP yang mengirim payload tidak valid.

---

## 🟡 High Priority (sebaiknya selesai sebelum go-live)

### 4. Bundle size 8.6 MB — di atas threshold optimal PWA
- **Severity:** MEDIUM → diperburuk (7.4 → 8.6 MB setelah Sentry + monetisasi)
- **Evidence:** `entry-bf7d...js` = 8.6 MB
- **Mitigation plan:** Lazy load reports/budgets screens via Expo Router async routes. Tree-shake Phosphor icons.
- **Status:** Diterima untuk go-live awal. Optimasi dijadwalkan minggu ke-2 setelah soft launch.

### 5. Tidak ada backup strategy otomatis
- **Severity:** MEDIUM
- **Evidence:** Supabase managed service menyediakan backup otomatis, tapi tidak ada verifikasi/restore test.
- **Risk:** Data loss meskipun kemungkinan kecil di Supabase cloud.
- **Rekomendasi:** Setup cron job `supabase db dump` mingguan ke local file + upload ke cloud storage.

### 6. Test coverage tidak ada angka
- **Severity:** MEDIUM
- **Evidence:** Tidak bisa run `jest --coverage` dengan sukses. Target coverage tidak didefinisikan.
- **Risk:** Tidak tahu berapa persen kode yang ter-cover test.
- **Rekomendasi:** Setup minimum 70% coverage untuk service layer. Tambah test untuk flow payment dan AI yang kritis.

---

## 🟢 Sudah Layak / Status OK

### 7. ✅ Keamanan data — RLS proteksi semua tabel
- Semua tabel Supabase memiliki RLS policies aktif.
- `prevent_wallet_balance_direct_change` trigger mencegah manipulasi balance.
- Service role key TIDAK tersimpan di frontend (0 results grep `service_role` di `apps/mobile/src`).

### 8. ✅ Payment system — Midtrans + Mayar siap
- Backend memiliki dual provider: Midtrans (live) + Mayar (gated).
- Flow pembayaran: `POST /api/v1/payments/create` → redirect → webhook → entitlement activation.
- Entitlement system dengan plan `free` vs `premium` + usage tracking.

### 9. ✅ Fitur core berfungsi penuh
| Fitur | Status |
|-------|--------|
| Transaksi (income/expense/transfer) | ✅ Live |
| Wallet auto-sync balance | ✅ Live |
| Budget envelopes | ✅ Live |
| AI Capture (text classifier) | ✅ Live |
| Reports + breakdown kategori | ✅ Live |
| Bill reminders | ✅ Live |
| Household finance context | ✅ Live |
| Kartu Kredit category | ✅ Live |
| Dashboard hero + quick actions | ✅ Live |

### 10. ✅ Deployment pipeline rapi
- CI/CD: GitHub Actions (typecheck + test + build) per branch/PR.
- PWA deploy: `scripts/deploy-pwa.mjs` + `check-bundle-markers.mjs` + live URL verification.
- Bundle marker registry: 32 required markers, auto-verify sebelum dan sesudah deploy.

### 11. ✅ Documentation
- `CLAUDE.md` lengkap: arsitektur, tech stack, design decisions, bug fixes.
- `CHANGELOG.md` up-to-date dengan semua perubahan terkini.
- Audit report `docs/audit/2026-06-27-transaction-logic-audit.md` ada.

### 12. ✅ Branch protection
- Main branch diproteksi. Direct push ditolak. Wajib via PR.
- Pre-push hook: typecheck + test + bundle marker check.

---

## 📊 Monetisasi Readiness

### Current premium gating:
| Fitur | Free | Premium |
|-------|------|---------|
| AI Chat (text capture) | Limited chat per bulan | Unlimited |
| AI Photo (receipt scan) | Limited photo per bulan | Unlimited |
| Basic transactions | ✅ Unlimited | ✅ |
| Budget envelopes | ✅ Unlimited | ✅ |
| Reports | ✅ Unlimited | ✅ |
| Household finance | ? | ? |

### Payment flow:
- ✅ Midtrans (live — sudah berfungsi)
- 🟡 Mayar (gated — `MAYAR_ACTIVATION_ENABLED=false`)
- ✅ Pricing tier `promo` + `normal` ready
- ✅ Premium plan expiry tracking (`plan_expires_at`)
- 🟡 Belum ada UI trial/banner upsell di dashboard

### Revenue model:
- Sudah ada `freemium` model: free users dapat limited AI usage
- Payment gateway: Midtrans (Indonesia), Mayar (global, belum aktif)
- Pricing: monthly / yearly dengan tier normal/promo

### What's missing for monetization:
- ❌ Trial onboarding flow (7-day free trial)
- ❌ Banner/CTA upsell di dashboard free user
- ❌ Pricing page di app (saat ini hanya di settings)
- ❌ Analytics untuk conversion tracking
- ❌ Subscription management UI (cancel, upgrade, downgrade)

---

## 📋 Action Items — Prioritized

### Sebelum Go-Live (BLOCKING):

| # | Item | Estimasi | Effort |
|---|------|----------|--------|
| 1 | Setup Sentry error tracking | 1-2 jam | Low |
| 2 | Aktifkan rate limiting di backend | 1 jam | Low |
| 3 | Bundle size optimization | 3-4 jam | Medium |
| 4 | Test coverage report + target | 1-2 jam | Medium |
| 5 | Backup strategy verification | 1 jam | Low |

### Pasca Go-Live (Optimization):

| # | Item |
|---|------|
| 6 | Trial onboarding flow |
| 7 | Upsell banner di dashboard |
| 8 | Subscription management |
| 9 | Conversion analytics |
| 10 | Performance monitoring |
| 11 | Load testing |
| 12 | Accessibility audit |

---

## 🏁 Go-Live Verdict

**Status: CONDITIONALLY READY** ⚠️

Aplikasi SUDAH LAYAK untuk go-live TERBATAS (soft launch / early access) dengan syarat 5 blocking issue di atas diselesaikan terlebih dahulu. Untuk full public launch + monetisasi, tambahkan 7 item pasca go-live.

**Rekomendasi:**
1. Selesaikan 5 blocking issue (estimasi 1-2 hari kerja)
2. Soft launch ke 10-50 beta tester
3. Monitor 1-2 minggu, fix bug yang muncul
4. Full launch + aktifkan monetisasi

---

*Generated by Forge audit — 28 Jun 2026*
