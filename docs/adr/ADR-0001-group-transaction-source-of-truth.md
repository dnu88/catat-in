---
title: "ADR-0001: Group Transaction Source of Truth"
id: "ADR-0001"
status: "Accepted"
date: "2026-05-02"
deciders:
  - "ThinkPad"
consulted:
  - "PRD-001"
informed:
  - "Future contributors"
related_prds:
  - "docs/prd/PRD-001-private-beta-go-live-foundation.md"
---

# Context

Catat.in saat ini memakai Firebase-first di frontend, dengan backend FastAPI untuk fitur tambahan. Untuk transaksi grup, ada dua jalur potensial:

1. Frontend menulis langsung ke Firestore.
2. Frontend selalu lewat backend untuk mutasi transaksi grup.

Private beta butuh konsistensi permission, auditability, dan kecepatan delivery oleh solo developer.

# Decision Drivers

- Konsistensi rule Owner/Member
- Integritas saldo wallet saat create/edit/delete transaksi
- Kompleksitas implementasi dalam 4–6 minggu
- Kemudahan observability dan debugging

# Considered Options

## Option A — Firestore-direct untuk semua mutasi grup

Frontend langsung create/edit/delete transaksi grup ke Firestore, backend hanya untuk read/fitur lain.

## Option B — Backend-mediated untuk mutasi transaksi grup (chosen)

Semua create/edit/delete transaksi grup harus melalui endpoint backend. Frontend tetap boleh read dari Firestore untuk responsif, namun write grup dipusatkan di backend.

## Option C — Hybrid tanpa batas tegas

Sebagian write di frontend, sebagian write di backend, tergantung halaman.

# Decision

Memilih **Option B: Backend-mediated untuk mutasi transaksi grup**.

# Rationale

- Permission enforcement lebih konsisten (single enforcement point).
- Logic saldo wallet + validasi role bisa disentralisasi dan dites.
- Audit log mutasi grup lebih mudah ditambahkan di backend.
- Mengurangi risiko mismatch antara Firestore rules dan business rule aplikasi.

# Consequences

## Positive

- Kontrol akses lebih tegas.
- Debugging issue kolaborasi lebih mudah.
- Jalur evolusi ke fitur enterprise lebih jelas.

## Negative

- Ketergantungan backend naik untuk fitur grup.
- Perlu endpoint tambahan dan test backend lebih banyak.
- Latensi write grup tergantung health backend.

# Implementation Notes

1. Tambah endpoint backend khusus transaksi grup (create/update/delete).
2. Frontend Groups/Transactions page untuk grup diarahkan pakai endpoint tersebut.
3. Firestore rules diperketat: write transaksi grup dari client dibatasi/ditutup sesuai model backend-mediated.
4. Tambah integration tests permission matrix:
   - Owner bisa kelola/member role
   - Member bisa write sesuai rule final
   - Non-member tidak bisa akses
5. Tambah audit fields minimal: `created_by`, `updated_by`, `updated_at`.

# Status

Accepted untuk private beta scope (PRD-001). Akan direview ulang setelah beta feedback.
