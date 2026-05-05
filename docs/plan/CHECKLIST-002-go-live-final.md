---
title: "CHECKLIST-002: Final Go-Live Checklist"
id: "CHECKLIST-002"
status: "In Progress"
owner: "ThinkPad"
last_updated: "2026-05-02"
related_prds:
  - "docs/prd/PRD-001-private-beta-go-live-foundation.md"
related_plans:
  - "docs/plan/PLAN-001-private-beta-implementation.md"
---

# P0 (Wajib sebelum go-live)

- [x] Web typecheck lulus (`pnpm --filter @catat-in/web type-check`)
- [x] Web unit test lulus (`pnpm --filter @catat-in/web test`)
- [x] Web build production lulus (`pnpm --filter @catat-in/web build`)
- [x] Backend test lulus (`pnpm test:backend`)
- [x] E2E smoke lulus (`pnpm --filter @catat-in/web test:e2e`)
- [x] Repo clean untuk release branch (tidak ada file modified/untracked)
- [ ] Semua env production tervalidasi (Vercel + Backend)
- [x] Firestore rules sudah dideploy ke project production
- [ ] Health backend production terverifikasi (`GET /health`) jika backend dipakai
- [ ] Tidak ada bug P0/P1 open di launch board

# P1 (Sangat disarankan)

- [ ] Warning lint utama dikurangi (fokus auth/transaction/firestore)
- [~] Tambah backend smoke tests untuk endpoint kritikal non-happy-path — testsprite TC001 ✅, TC002 ❌ (ANTHROPIC_API_KEY invalid)
- [ ] Dokumentasi incident runbook + rollback steps final
- [ ] Verifikasi Firebase Authorized Domains (prod + preview)

# P2 (Setelah go-live / hardening)

- [ ] Optimasi bundle chunk besar (firebase/vendor split)
- [ ] Naikkan coverage test backend dan e2e negative cases
- [ ] Observability lanjutan (alerts, error budget, SLO dashboard)

# Catatan Eksekusi

## Hasil verifikasi aktual (2026-05-02)

- Quality gate lulus: typecheck, unit test, build, backend test, E2E smoke.
- Lint: 48 warning (`no-explicit-any`), 0 error.
- Build warning: chunk `vendor-firebase` > 500 kB.
- Git status: clean (semua perubahan checklist/plan sudah di-commit).
- Firestore rules: sukses deploy ke project `catat-in-69ca6` (up-to-date).
- Catatan env lokal web: `VITE_API_BASE_URL` masih mengarah localhost (wajar untuk dev, pastikan env production tidak localhost).
- Secret scan pola umum: tidak terdeteksi hardcoded key pada tracked files.
- Env keyset: `apps/web/.env` dan `backend/.env` sudah memuat key utama sesuai `.env.example`.

## Testsprite integration tests (2026-05-02)

| Test | Hasil | Catatan |
|---|---|---|
| TC001 — POST Transactions Manual Entry | ✅ LULUS | Create, verifikasi, dan cleanup transaksi berhasil |
| TC002 — POST AI Process Capture | ❌ GAGAL | `ANTHROPIC_API_KEY` tidak valid; endpoint `/ai/process` juga diperbaiki (missing `try/except RuntimeError`) |

Bug yang ditemukan dan diperbaiki:
- `backend/app/api/v1/ai.py`: endpoint `POST /api/v1/ai/process` tidak punya `try/except RuntimeError` → akan return 500 saat Anthropic API error. **Fix sudah diterapkan**, perlu restart backend.

Blocker yang masih terbuka:
- `ANTHROPIC_API_KEY` di `backend/.env` tidak valid (gateway: "No active credentials for provider: anthropic"). Perbarui key sebelum beta demo.

- Hasil saat ini menunjukkan aplikasi siap untuk **private beta terbatas** (Mode A Firebase-only).
- Untuk Mode B (dengan backend AI), perbarui `ANTHROPIC_API_KEY` dan restart backend terlebih dahulu.
- Untuk go-live publik lebih aman, tuntaskan semua item P0 dan mayoritas P1.
