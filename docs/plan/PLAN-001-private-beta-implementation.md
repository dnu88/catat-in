---
title: "PLAN-001: Private Beta Implementation Plan"
id: "PLAN-001"
status: "Draft"
owner: "ThinkPad"
last_updated: "2026-05-02"
related_prds:
  - "docs/prd/PRD-001-private-beta-go-live-foundation.md"
related_adrs:
  - "docs/adr/ADR-0001-group-transaction-source-of-truth.md"
---

# 1. Objective

Mengeksekusi PRD-001 menjadi rilis private beta stabil dalam 4–6 minggu dengan kapasitas kerja ±2 jam/hari.

# 2. Delivery Strategy

- **Wave-based delivery**: setiap wave menghasilkan outcome yang bisa diverifikasi.
- **Risk-first**: selesaikan boundary architecture + access control sebelum polishing.
- **Small batch**: task kecil, selesai harian, dengan checklist verifikasi.

# 3. Workstreams & Milestones

## Wave 1 (Minggu 1) — Foundation & Contracts

### Scope

1. Tetapkan boundary write grup = backend-mediated (ADR-0001).
2. Definisikan access matrix Owner/Member/Non-member.
3. Audit endpoint/backend services yang menyentuh grup + transaksi.

### Deliverables

- Access matrix terdokumentasi (`docs/plan/access-matrix-owner-member.md`)
- Draft endpoint contract grup (`docs/plan/group-transaction-api-contract.md`)
- Daftar gap implementation + prioritas

### Exit Criteria

- Semua mutasi transaksi grup punya jalur backend yang jelas.
- Tidak ada ambiguity permission untuk operasi utama.

## Wave 2 (Minggu 2) — Backend Group Mutation + Integrity

### Scope

1. Implement endpoint create/update/delete transaksi grup di FastAPI.
2. Tambah audit fields (`created_by`, `updated_by`, `updated_at`).
3. Pastikan update saldo wallet konsisten pada mutasi transaksi.

### Deliverables

- Endpoint backend mutasi grup aktif
- Unit/integration test backend minimal untuk jalur kritikal
- Error handling standar untuk unauthorized/forbidden/not-found

### Exit Criteria

- Test backend untuk jalur grup lulus.
- Tidak ada bug saldo pada skenario create/edit/delete dasar.

## Wave 3 (Minggu 3) — Frontend Integration + AI Reliability Guardrails

### Scope

1. Ubah FE group transactions agar write lewat endpoint backend.
2. Sinkronkan UI states: loading, error, retry.
3. Terapkan confidence-gate AI (auto-save vs review).

### Deliverables

- FE groups write flow terhubung backend
- E2E scenario: create group → join → add/edit/delete transaction
- UX fallback message saat AI/backend bermasalah

### Exit Criteria

- E2E kritikal lulus stabil.
- Flow AI capture tetap usable saat fallback aktif.

## Wave 4 (Minggu 4) — QA Hardening & Beta Gate

### Scope

1. Regression run (web test, e2e, backend test).
2. Validasi env production (Firebase, Anthropic, Vercel).
3. Siapkan runbook incident ringan + rollback plan.

### Deliverables

- Beta readiness checklist
- Known issues list + severity
- Launch decision note

### Exit Criteria

- 0 bug blocker (P0/P1) untuk scope beta.
- Build/deploy FE + health backend terverifikasi.

## Wave 5–6 (Buffer) — Stabilization

### Scope

- Bugfix berdasarkan feedback tester.
- Perbaikan performa endpoint prioritas.
- Scope tambahan kecil jika risiko rendah.

# 4. Daily Execution Template (2 Jam/Hari)

1. 20m: review objective + pilih 1 task kecil.
2. 70m: implement/test.
3. 20m: verifikasi (test command + hasil).
4. 10m: update changelog/task board.

# 5. Verification Commands

- Frontend unit: `pnpm --filter web test`
- Frontend E2E: `pnpm --filter web test:e2e`
- Backend test: `pnpm test:backend`
- Build check: `pnpm build`

# 6. Risk Controls

- Jika backend test gagal berulang, freeze fitur baru dan fokus stabilisasi.
- Jika scope meluas, pindahkan ke wave berikutnya (no scope creep).
- Jika SLA endpoint tidak tercapai, prioritaskan caching/query/index sebelum fitur tambahan.

# 7. Decision Gates

- **Gate A (akhir Wave 1):** Contract & permission jelas.
- **Gate B (akhir Wave 3):** End-to-end group flow aman & stabil.
- **Gate C (akhir Wave 4):** Siap private beta release.

# 8. Open Follow-ups

1. Tentukan daftar endpoint yang wajib SLA <2 detik.
2. Putuskan OCR/import masuk wave mana.
3. Putuskan policy edit transaksi grup oleh member (full edit vs constrained).
