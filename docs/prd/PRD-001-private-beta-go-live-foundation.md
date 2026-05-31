---
title: "PRD-001: Private Beta Go-Live Foundation"
id: "PRD-001"
status: "Draft"
owner: "ThinkPad"
last_updated: "2026-05-02"
related_adrs:
  - "docs/adr/ADR-0001-group-transaction-source-of-truth.md"
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
- Jika Mode B dipilih: backend endpoint inti merespons <2 detik pada beban private beta normal (non-AI heavy path).
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
- Group collaboration (conditional):
  - Mode A: read-only/limited visibility untuk konteks grup yang sudah ada (tanpa group write baru).
  - Mode B: create/join/member role/shared transaction/summary penuh via backend-mediated flow.
- FE deploy Vercel.
- Basic monitoring/logging, error handling, and runbook.

## 6.2 Release Modes (Gate Wajib sebelum go-live)

### Mode A — Firebase-only

- `VITE_API_BASE_URL` kosong.
- Fitur inti aktif: auth, wallet, transaction manual, budget, bills, reports, AI chat fallback lokal.
- Sesuai ADR-0001, **group write baru tidak diaktifkan** pada Mode A (create/join/leave/update role/remove member/mutasi transaksi grup).
- Fitur backend-only dianggap non-scope launch: OCR receipt, import mutasi, groups write via backend.

### Mode B — Firebase + Backend

- `VITE_API_BASE_URL` mengarah ke backend production.
- Backend `/health` wajib healthy/degraded yang terdefinisi.
- Fitur backend aktif: AI chat backend, OCR receipt, import, groups APIs.
- Untuk grup, jalur write (create/join/leave/update role/remove member/transaksi grup) wajib backend-mediated sesuai ADR-0001.

Go-live decision harus eksplisit memilih Mode A atau Mode B dan mengikuti acceptance criteria mode tersebut.

## 6.3 Out of Scope (Wave berikutnya)

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
- Owner dan member mengikuti permission sederhana.
- Untuk private beta, keputusan permission dan source-of-truth transaksi grup mengikuti **ADR-0001 (Accepted)**.
  - Owner: kelola anggota/role.
  - Member: input & edit transaksi grup sesuai batasan yang ditetapkan ADR-0001 dan implementasi turunannya.
- Dashboard grup menampilkan total pengeluaran/pemasukan/net + kontribusi.

## FR-5 Reporting

- Dashboard dan reports bulanan dapat membaca data Firestore dan menampilkan ringkasan kategori/tren.

## FR-6 Deployability

- FE production build dan deploy sukses di Vercel.
- Jika Mode B dipilih: BE health endpoint tersedia (`/health`) dan status environment terlihat.

# 8. Non-Functional Requirements

- P95 endpoint non-AI core path < 2 detik pada traffic beta.
  - Cakupan endpoint (Mode B):
    - `GET /health`
    - `GET /api/v1/groups`
    - `POST /api/v1/groups/join`
    - `GET /api/v1/reports/*` (non-AI path)
  - Metode ukur: sampling smoke + synthetic check minimal 30 request/endpoint pada env production/staging-like.
  - Evidence: simpan artifact hasil uji (timestamp, environment, pass/fail, latency summary) pada dokumen release note/checklist.
- Uptime target private beta: best effort dengan recovery runbook.
- Error API harus memiliki pesan ramah user (ID).
- Secrets tidak boleh ada di repo.

# 9. Success Metrics

## 9.1 Launch Readiness Metrics

- 100% critical happy-path checklist pass (acu ke `docs/plan/CHECKLIST-002-go-live-final.md`).
- 0 blocker bug pada smoke test private beta.
- FE build/deploy pass di branch release.
- Jika Mode B: BE `/health` status ok/degraded terjelas dan dapat ditindaklanjuti.

## 9.2 Product Metrics (beta)

- ≥70% tester berhasil menyelesaikan first transaction via AI pada sesi pertama.
- ≥50% tester kembali dan mencatat transaksi minimal 3 hari berbeda dalam 2 minggu.

# 10. Acceptance Criteria

1. Flow onboarding → AI capture → save → dashboard → history lulus test E2E internal.
2. Flow groups lulus sesuai mode rilis:
   - Mode A (Firebase-only): tidak ada group write baru; UI/akses grup yang ditampilkan tidak menimbulkan error blocker.
   - Mode B (Firebase+Backend): flow create/join/manage group dan mutasi transaksi grup wajib lewat backend endpoint (bukan Firestore direct) dan lulus E2E internal.
3. Semua env production minimum terisi dan tervalidasi (acu ke `docs/deployment/DEPLOYMENT.md`, section env frontend/backend) dengan evidence:
   - Mode A: checklist env frontend + Firebase authorized domains.
   - Mode B: checklist env frontend+backend + output health check backend (`GET /health`).
4. Tidak ada P0/P1 open bug saat beta gate.

# 11. Milestones (4–6 Minggu)

- Week 1: Architecture hardening + auth/access contract.
  - Artifact wajib: access matrix + boundary decision note.
- Week 2: AI reliability + transaction integrity fixes.
  - Artifact wajib: test report integrity saldo + fallback AI behavior.
- Week 3: Group collaboration hardening + performance pass.
  - Artifact wajib: E2E group flow report + latency sampling report.
- Week 4: QA regression + release runbook + beta gate.
  - Artifact wajib: go-live checklist signed + launch decision note.
- Week 5–6 (buffer): bugfix dan stabilisasi.
  - Artifact wajib: known issues update + post-beta backlog seed.

# 12. Risks & Mitigations

- Permission mismatch Firestore vs backend: tetapkan access matrix + integration tests.
- AI extraction quality variance: golden prompts dataset + fallback + review UX.
- Solo-dev bandwidth: strict scope freeze dan wave-based rollout.

## 12.1 Risk Register (Operasional)

| Risk                            | Severity | Owner     | Trigger                                                                                         | Mitigation                                              | Contingency                                                   |
| ------------------------------- | -------- | --------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| Permission mismatch FE/BE/Rules | High     | Eng owner | Forbidden/unauthorized >2% pada group mutation selama 15 menit, atau group write gagal berulang | Access matrix + integration test + ADR compliance check | Freeze fitur group baru, fallback ke mode read-only sementara |
| AI extraction quality drop      | Medium   | Eng owner | Auto-save salah kategori/nominal naik                                                           | Confidence gate + review UX + fallback parser           | Force review-only mode sementara                              |
| Backend instability (Mode B)    | High     | Eng owner | `/health` degraded berkepanjangan                                                               | Health monitor + restart runbook + rate limit tuning    | Switch launch mode ke Mode A Firebase-only                    |
| Delivery capacity overload      | Medium   | Eng owner | Milestone slip >1 week                                                                          | Scope freeze + wave priority                            | De-scope fitur non-core ke wave berikutnya                    |

# 13. Dependencies

- Firebase Auth/Firestore configuration benar.
- Anthropic API key aktif.
- Vercel env var sinkron.

# 14. Related Decisions

- **Accepted:** `ADR-0001` Source-of-truth mutasi transaksi grup = backend-mediated untuk scope yang diputuskan.
- **Current-state gap (harus ditutup sebelum Mode B go-live):** implementasi frontend saat ini masih memiliki jalur write grup Firestore-direct; perlu migrasi bertahap ke backend-mediated sesuai ADR-0001.
- **Konsistensi mode:** Mode A tidak mengaktifkan group write baru agar tidak bertentangan dengan ADR-0001.
- Planned next ADRs:
  - ADR: Permission model Owner/Member untuk operasi grup (detail lanjutan).
  - ADR: AI reliability policy (confidence gate, fallback, failure mode).

# 15. Open Questions

1. Apakah edit transaksi grup oleh member selalu diizinkan atau dibatasi per role editor?
2. Apakah OCR/import wajib masuk beta wave-1 atau wave-2?
3. Apakah cakupan endpoint SLA perlu diperluas di luar daftar NFR §8 untuk fase setelah private beta?
