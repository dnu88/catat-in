# PLAN-004 — Wave C Finance Management Kickoff

**Date:** 2026-05-09  
**Status:** 🚀 Started

## Objective
Modernisasi Wave C untuk management screens agar visual parity setara Wave B, tetap token-first, dan siap diteruskan ke Groups/Imports advanced flow.

## Scope Wave C (phase ini)
1. Wallets
2. Budgets
3. Bills
4. Categories (via budget/category management flow)

## Principles
- Semua warna/surface wajib berbasis theme vars / shared tokens.
- Pertahankan behavior existing; fokus utama di UI modernization + state quality.
- Setiap screen wajib punya state: loading, empty, error, normal.

## Kickoff Execution Order

### Slice C1 — Wallets (Web first)
- Refactor visual style `apps/web/src/pages/WalletPage.tsx` ke struktur Wave B (`page-shell`, `page-header`, `page-section-card`).
- Hapus hardcoded color per type menjadi semantic mapping berbasis CSS var.
- Pastikan modal add/edit konsisten dengan style form system.

### Slice C2 — Budgets (Web)
- Refactor `apps/web/src/pages/BudgetPage.tsx` ke visual Wave B.
- Progress/badge warning-overrun pakai status tokens (`--green`, `--amber`, `--red`).
- Rapikan category custom UX agar state/error lebih jelas.

### Slice C3 — Bills (Web)
- Refactor `apps/web/src/pages/BillsPage.tsx` dengan pola card + status chip konsisten.
- Deadline state (overdue/soon/paid) gunakan semantic token mapping.

### Slice C4 — QA & Consistency Pass
- Audit hardcoded hex untuk seluruh screen Wave C.
- Verifikasi command:
  - `pnpm --filter @kaswise/web test`
  - `pnpm --filter @kaswise/web type-check`
  - `pnpm --filter @kaswise/web build`

## Definition of Done (Wave C phase ini)
- Wallet/Budget/Bills visual parity mengikuti pattern Wave B.
- Tidak ada hardcoded visual drift pada screen yang dimodernisasi.
- Semua verifikasi teknis PASS.

## Next After This Plan
Lanjut Wave C ext:
- Groups + Imports advanced flows
- Mobile parity pass untuk screen management yang relevan
