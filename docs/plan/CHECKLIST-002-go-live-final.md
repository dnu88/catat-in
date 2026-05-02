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
- [ ] Repo clean untuk release branch (tidak ada file modified/untracked)
- [ ] Semua env production tervalidasi (Vercel + Backend)
- [ ] Firestore rules sudah dideploy ke project production
- [ ] Health backend production terverifikasi (`GET /health`) jika backend dipakai
- [ ] Tidak ada bug P0/P1 open di launch board

# P1 (Sangat disarankan)

- [ ] Warning lint utama dikurangi (fokus auth/transaction/firestore)
- [ ] Tambah backend smoke tests untuk endpoint kritikal non-happy-path
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
- Git status: belum clean (`.gitignore`, `NEXT_STEPS.md`, `docs/plan/` belum commit).
- Secret scan pola umum: tidak terdeteksi hardcoded key pada tracked files.
- Env keyset: `apps/web/.env` dan `backend/.env` sudah memuat key utama sesuai `.env.example`.

- Hasil saat ini menunjukkan aplikasi siap untuk **private beta terbatas**.
- Untuk go-live publik lebih aman, tuntaskan semua item P0 dan mayoritas P1.
