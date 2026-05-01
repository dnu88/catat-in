---
title: "PRD-001: Private Beta Go-Live Foundation"
id: "PRD-001"
status: "Draft"
owner: "ThinkPad"
last_updated: "2026-05-02"
related_adrs: []
---

# 1. Executive Summary

Catat.in akan disiapkan untuk private beta 4–6 minggu sebagai personal finance app AI-first untuk pasar Indonesia dengan fitur inti: onboarding, input transaksi via chat, kategorisasi otomatis, dashboard ringkasan, riwayat transaksi, dan kolaborasi grup.

Tujuan PRD ini adalah menetapkan fondasi go-live agar fitur yang sudah ada di codebase berjalan stabil, aman, dan siap dipakai tester beta.

# 2. Problem Statement

Walau happy-path utama sudah berjalan (berdasarkan test web/e2e/backend), kesiapan production belum cukup karena:

- boundary Firebase-first vs backend-assisted belum didefinisikan sebagai kontrak rilis,
- coverage non-happy-path/security/performance masih lemah,
- observability dan release gate belum lengkap.

# 3. Goals

## 3.1 Business Goals

- Meluncurkan private beta Catat.in dengan pengalaman stabil untuk early adopters.
- Memvalidasi value proposition AI-assisted transaction capture + collaborative finance.

## 3.2 Product Goals

- Semua flow inti beta berjalan end-to-end tanpa critical blocker.
- Fitur grup mendukung kolaborasi owner/member sesuai requirement.

## 3.3 Engineering Goals

- FE deploy sukses di Vercel tanpa build failure.
- Backend endpoint inti merespons <2 detik pada beban private beta normal (non-AI heavy path).
- Tidak ada critical bug pada happy path.

# 4. Non-Goals

- Menambah payment/subscription production billing penuh.
- Menambah provider auth baru di luar Firebase Email/Google.
- Replatform stack (harus tetap React/Vite/Next-style FE, FastAPI, Firebase, Anthropic, Vercel).

# 5. Users and Use Cases

## 5.1 Primary Users

- Beta user individual yang ingin catat transaksi cepat via chat.
- Small group (keluarga/teman) untuk pengeluaran bersama.

## 5.2 Core Use Cases

1. User register/login, membuat wallet, dan mencatat transaksi via AI chat.
2. AI mengekstrak nominal/kategori/wallet hint, lalu simpan (auto-save atau review).
3. User melihat dashboard dan riwayat transaksi.
4. User membuat grup, mengundang anggota, dan mengelola transaksi bersama.
5. Owner mengelola anggota; member dapat input/edit transaksi grup.

# 6. Scope (Private Beta)

## 6.1 In Scope

- Onboarding/auth Firebase.
- Wallet, transaction, budget, bills, reports dari Firestore.
- AI chat extraction (Anthropic + local fallback).
- Group collaboration (create/join/member role/shared transaction/summary).
- FE deploy Vercel + BE deploy FastAPI.
- Basic monitoring/logging, error handling, and runbook.

## 6.2 Out of Scope (Wave berikutnya)

- Advanced RBAC detail beyond owner/member.
- Enterprise-grade observability/paid CI.
- Major UI redesign.

# 7. Functional Requirements

## FR-1 Auth & Session

- User dapat register/login/logout dengan Firebase Auth.
- Session expiry ditangani dengan error message yang jelas.

## FR-2 AI Transaction Capture

- Input natural language Bahasa Indonesia diproses via `/api/v1/ai/chat`.
- Jika backend AI gagal/tidak tersedia, fallback parser lokal tetap menghasilkan kandidat transaksi.
- Confidence threshold menentukan auto-save vs manual review.

## FR-3 Transaction Integrity

- Create/edit/delete transaksi harus menjaga konsistensi saldo wallet.
- Riwayat transaksi harus sinkron dengan data Firestore.

## FR-4 Group Collaboration

- User dapat create group dan join via invite code/link.
- Member aktif dapat melihat transaksi grup.
- Owner dan member mengikuti permission sederhana:
  - Owner: kelola anggota/role.
  - Member: input & edit transaksi grup sesuai kebijakan final ADR.
- Dashboard grup menampilkan total pengeluaran/pemasukan/net + kontribusi.

## FR-5 Reporting

- Dashboard dan reports bulanan dapat membaca data Firestore dan menampilkan ringkasan kategori/tren.

## FR-6 Deployability

- FE production build dan deploy sukses di Vercel.
- BE health endpoint tersedia (`/health`) dan status environment terlihat.

# 8. Non-Functional Requirements

- P95 endpoint non-AI core path < 2 detik pada traffic beta.
- Uptime target private beta: best effort dengan recovery runbook.
- Error API harus memiliki pesan ramah user (ID).
- Secrets tidak boleh ada di repo.

# 9. Success Metrics

## 9.1 Launch Readiness Metrics

- 100% critical happy-path checklist pass.
- 0 blocker bug pada smoke test private beta.
- FE build/deploy pass di branch release.
- BE `/health` status ok/degraded terjelas dan dapat ditindaklanjuti.

## 9.2 Product Metrics (beta)

- ≥70% tester berhasil menyelesaikan first transaction via AI pada sesi pertama.
- ≥50% tester kembali dan mencatat transaksi minimal 3 hari berbeda dalam 2 minggu.

# 10. Acceptance Criteria

1. Flow onboarding → AI capture → save → dashboard → history lulus test E2E internal.
2. Flow create group → join second user → shared transaction visible lulus E2E internal.
3. Semua env production minimum terisi dan tervalidasi.
4. Tidak ada P0/P1 open bug saat beta gate.

# 11. Milestones (4–6 Minggu)

- Week 1: Architecture hardening + auth/access contract.
- Week 2: AI reliability + transaction integrity fixes.
- Week 3: Group collaboration hardening + performance pass.
- Week 4: QA regression + release runbook + beta gate.
- Week 5–6 (buffer): bugfix dan stabilisasi.

# 12. Risks & Mitigations

- Permission mismatch Firestore vs backend: tetapkan access matrix + integration tests.
- AI extraction quality variance: golden prompts dataset + fallback + review UX.
- Solo-dev bandwidth: strict scope freeze dan wave-based rollout.

# 13. Dependencies

- Firebase Auth/Firestore configuration benar.
- Anthropic API key aktif.
- Vercel env var sinkron.

# 14. Related Decisions (Planned ADRs)

- ADR: Source-of-truth untuk mutasi transaksi grup (Firestore direct vs backend-mediated).
- ADR: Permission model Owner/Member untuk operasi grup.
- ADR: AI reliability policy (confidence gate, fallback, failure mode).

# 15. Open Questions

1. Apakah edit transaksi grup oleh member selalu diizinkan atau dibatasi per role editor?
2. Apakah OCR/import wajib masuk beta wave-1 atau wave-2?
3. Endpoint mana saja yang wajib SLA <2 detik (AI endpoint dikecualikan/tidak)?
