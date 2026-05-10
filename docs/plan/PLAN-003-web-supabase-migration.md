---
title: "PLAN-003: Migrasi apps/web dari Firebase ke Supabase"
status: "Draft"
owner: "ThinkPad"
last_updated: "2026-05-06"
related_prd:
  - "PRD_Kaswise_v1.md"
---

# Tujuan
Migrasi bertahap `apps/web` dari Firebase/Firestore ke Supabase agar selaras dengan arsitektur Kaswise v1.0, sambil menjaga aplikasi tetap bisa dipakai selama transisi.

# Prinsip Eksekusi
1. **No big-bang rewrite**: migrasi per fase dengan gate verifikasi.
2. **Rollback-ready**: provider dapat di-switch lewat env flag selama transisi.
3. **UI modernisasi ditunda**: fokus fase ini hanya data/auth/infrastruktur, lalu lanjut redesign UI.

# Scope
## In Scope
- Auth web: Firebase Auth -> Supabase Auth.
- Data layer web: Firestore -> Supabase Postgres + RLS.
- AI flow web: Supabase Edge Functions (`process-text`, `process-image`, `process-voice`).
- Premium gate: enforce via Edge Function (`check-usage`, to be implemented).

## Out of Scope (fase ini)
- Redesign UI modern.
- Penambahan fitur baru di luar PRD.

# Fase Migrasi

## Fase 0 — Baseline & Freeze (1 hari)
- Freeze fitur baru di `apps/web`.
- Dokumentasi flow kritikal saat ini (login, transaksi, wallet, budget, bills, reports).
- Buat smoke checklist pembanding sebelum/sesudah migrasi.

**Gate**
- Baseline test tersimpan dan bisa diulang.

---

## Fase 1 — Foundation Supabase di Web (1–2 hari)
- Tambah `apps/web/src/lib/supabase.ts`.
- Tambah env web:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_DATA_PROVIDER=firebase|supabase`
- Siapkan provider switch infra (belum cutover).

**Gate**
- App tetap jalan normal di mode `firebase`.

---

## Fase 2 — Repository Abstraction (2 hari)
- Bentuk kontrak repository untuk domain:
  - auth
  - transactions
  - wallets
  - budgets
  - bills
  - reports
- Implementasi awal:
  - `firebaseRepository` (adapter dari kode existing)
  - `supabaseRepository` (bertahap)
- Store/UI konsumsi repository interface, bukan direct `firestore.ts`.

**Gate**
- Build, type-check, unit test lulus di mode firebase lewat abstraction.

---

## Fase 3 — Auth Cutover (2–3 hari)
- Migrasi `auth.store.ts` ke Supabase Auth.
- Update login/register/reset/logout pages.
- Session guard pindah ke Supabase session.

**Gate**
- Semua auth flow lulus smoke test di mode `supabase`.

---

## Fase 4 — Read Path Migration (3–4 hari)
Migrasi query baca dahulu (risiko rendah):
- profile/settings
- list transactions
- list wallets
- list budgets
- list bills
- reports read

**Gate**
- Read flows stabil di mode `supabase`.
- Tidak ada RLS violation untuk user valid.

---

## Fase 5 — Write Path Migration (4–6 hari)
Migrasi create/update/delete:
- transactions (termasuk konsistensi update saldo wallet)
- wallets
- budgets
- bills

**Gate**
- Konsistensi saldo wallet tervalidasi untuk create/edit/delete transaksi.

---

## Fase 6 — AI + Realtime + Premium Gate (3–4 hari)
- Web capture gunakan Supabase Edge Functions:
  - `process-text`
  - `process-image`
  - `process-voice`
- Realtime status transaction (`processing -> done/error`) aktif di UI web.
- Implement + integrasi `check-usage` untuk enforcement free/premium server-side.

**Gate**
- Confidence-based flow berjalan:
  - high confidence: auto-save + undo window
  - low confidence: review card
- Limit free tier enforced server-side.

---

## Fase 7 — Cutover & Cleanup (2 hari)
- UAT penuh di mode `supabase`.
- Set default `VITE_DATA_PROVIDER=supabase`.
- Deprecate/hapus Firebase dependency web setelah stabil.

**Gate**
- Semua acceptance flow lulus.
- Rollback plan terdokumentasi.

# Verifikasi Wajib per Fase
- `pnpm --filter @kaswise/web type-check`
- `pnpm --filter @kaswise/web test`
- `pnpm --filter @kaswise/web build`
- Smoke test manual critical flows.

# Risiko & Mitigasi
1. **RLS reject query valid**
   - Mitigasi: audit policy per tabel + test user-scope.
2. **Saldo wallet tidak konsisten**
   - Mitigasi: test matrix create/edit/delete transaction + recalculation command.
3. **Dual provider menambah kompleksitas**
   - Mitigasi: batasi masa transisi, cutover cepat setelah gate terpenuhi.
4. **Scope creep karena redesign UI bersamaan**
   - Mitigasi: redesign UI dikerjakan setelah Fase 3 atau setelah full cutover.

# Urutan Kerja Selanjutnya
1. Eksekusi Fase 0–1.
2. Setelah auth/read path stabil, baru mulai redesign UI modern di atas data layer Supabase.
3. Lanjutkan fase write + AI + premium gate.

# Catatan untuk UI Modernisasi
Agar redesign tidak terhambat migrasi backend, idealnya:
- Minimal selesaikan Fase 3 (auth cutover) + Fase 4 (read path),
- lalu mulai redesign komponen visual, sementara write/AI diselesaikan paralel bertahap.
