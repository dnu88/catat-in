---
title: "PLAN-002: Firebase-only Migration"
id: "PLAN-002"
status: "In Progress"
owner: "ThinkPad"
last_updated: "2026-05-02"
related_prds:
  - "docs/prd/PRD-001-private-beta-go-live-foundation.md"
---

# Objective

Menjalankan mode Firebase-only secara aman tanpa error blocker pada fitur backend-only.

# Audit Ringkas

## Sudah Firebase-first

- Auth, wallets, transactions, budgets, bills, reports utama.
- Groups saat ini masih Firestore direct.

## Masih tergantung backend

- OCR/import (`ImportsPage`)
- Saved views (`SavedViewsPage`, `TransactionPage` saved view loader)
- Savings goals (`SavingsGoalsPage`)
- Health score report (opsional, sudah graceful fallback)

# Prioritas Implementasi

1. Guard UI untuk fitur backend-only saat `VITE_API_BASE_URL` kosong.
2. Hindari network error berulang ke endpoint backend pada mode Firebase-only.
3. Pertahankan core flow Firebase tetap berfungsi.

# Implementasi Selesai (batch ini)

- Tambah flag runtime `isBackendConfigured` dan `backendRequiredMessage` di `apps/web/src/lib/api.ts`.
- Tambah guard backend di:
  - `apps/web/src/pages/SavedViewsPage.tsx`
  - `apps/web/src/pages/SavingsGoalsPage.tsx`
  - `apps/web/src/pages/ImportsPage.tsx`
  - `apps/web/src/pages/TransactionPage.tsx` (saved views loader)

# Next Batch

1. Putuskan strategi fitur `SavedViews` dan `SavingsGoals`:
   - A) Migrasi ke Firestore, atau
   - B) Hide menu/page saat Firebase-only.
2. Sinkronkan PRD acceptance test dengan perilaku aktual Firebase-only.
3. Tambah E2E khusus Firebase-only untuk memastikan tidak ada backend blocker message di core flow.
