# Kaswise Simple Premium Experience — Implementation Plan

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task, with spec-compliance review then code-quality review. Other models may execute the same checklist sequentially. No model may skip the approval and verification gates.

**Goal:** Membuat Kaswise terasa sederhana, premium secara visual, dan cepat untuk mencatat transaksi sehari-hari, mengambil prinsip UX Moonveo tanpa menyalin branding dan tanpa mengurangi keamanan pencatatan uang.

**Architecture:** Pertahankan Expo Router, komponen transaction-entry, reducer draft, Supabase RLS, dan persistence/idempotency yang sudah teruji. Ubah hierarchy, progressive disclosure, dan presentation melalui komponen kecil; jangan menciptakan jalur penyimpanan finansial kedua. Rollout pengalaman baru memakai satu flag terpisah yang default OFF; UI lama dan flag AI/entitlement tetap bekerja.

**Tech Stack:** Source aktual `apps/mobile/package.json`: Expo 54, React 19, React Native 0.81, Expo Router 6, TypeScript, Jest + Testing Library, Playwright, Supabase. Backend FastAPI hanya untuk AI/import/payment/webhook. Beberapa versi di CLAUDE.md bersifat historis; package.json dan source aktual mengungguli angka versi lama.

**Workspace:** `/home/Danu88/apps/kaswise`.
**Active app:** `apps/mobile`, bukan legacy `apps/web`.
**Status dokumen:** Plan-only. Pembuatan dokumen ini tidak mengubah source, database, flag live, atau konfigurasi pembayaran. Permintaan plan BUKAN izin deploy redesign.

---

## 1. Ringkasan keputusan

1. **Jangan tambah fitur dulu.** Rapikan pengalaman yang sudah ada, terutama Catat → Review → Simpan → Koreksi.
2. **Premium berarti kualitas pengalaman, bukan paywall baru.** Hierarchy jelas, typography konsisten, feedback tenang, input mudah, dan error yang bisa ditindaklanjuti.
3. **Pertahankan 5 tab:** Beranda, Transaksi, tombol + / Catat, Laporan, Dompet. Jangan membangun navigasi ini dari nol: source saat ini sudah memilikinya saat `simpleNavigation` ON.
4. **Catat adalah pintu utama**, dengan satu composer teks dominan; Struk dan Manual menjadi alternatif yang terlihat tetapi tidak berlomba menjadi CTA utama. Suara hanya ditampilkan bila fitur/entitlement/perangkat benar-benar mendukungnya.
5. **Form kecil dengan detail tersembunyi**, bukan wizard panjang per field. Tanggal, catatan tambahan, dan detail sumber masuk disclosure/picker; field bermasalah tetap terlihat otomatis.
6. **Single dan batch tidak diperlakukan sama.** Single = ringkas; batch = daftar ringkasan yang bisa diedit satu per satu, dengan total dan jumlah transaksi sebelum simpan.
7. **Kaswise tetap Kaswise:** navy/electric-blue, warm-paper, tonal icons, bahasa Indonesia yang jelas; tidak mengambil tema gelap, logo, ilustrasi, atau copy Moonveo secara mentah.
8. **Home wallet stack dipertahankan.** Penghapusan/replacement hanya sesudah before/after visual QA dan persetujuan eksplisit pengguna; bukan bagian default plan ini.

### Sumber referensi dan batas kepastian

Riwayat percakapan berisi analisis video Moonveo: sedikit workflow utama, tombol Add sebagai pusat input, picker/bottom sheet, dan fitur lanjutan di Settings. Ini merupakan konteks historis, bukan audit aplikasi Moonveo terbaru. File contact sheet historis `/home/Danu88/.hermes/cache/videos/moonveo_contact.jpg` sudah tidak tersedia saat plan dibuat; penelusuran web tidak menemukan halaman Moonveo yang dapat diidentifikasi dengan pasti. **Jangan mengarang parity, screenshot, atau fitur Moonveo yang belum diamati.** Bila perlu matching spesifik, minta pengguna mengirim ulang demo; pekerjaan Kaswise tetap dapat dimulai dari kontrak UX di bawah.

## 2. Baseline yang wajib dipertahankan

Hasil rilis sebelumnya, bukan angka kelulusan otomatis untuk redesign:
- Mobile: 89 suite, 806 passed, 8 skipped; type-check, quality gate, dan export berhasil.
- Payment backend: 93 passed; konfigurasi runtime dan pembatasan pembayaran tetap identik.
- Public PWA telah dibaca ulang; 39 marker registry saat rilis tersebut lengkap. Jumlah marker adalah dinamis.
- Live akun sementara: single/batch, replay/concurrent retry, saldo, edit nominal/kategori/dompet, dan cleanup terverifikasi.
- Repository **dirty dan perubahan bugfix penting belum di-commit**. Branch yang ditemukan: `release/v2-transaction-entry`.

Baca dahulu:
- `docs/qa/transaction-checklist-summary.md`
- `docs/qa/reconciliation-safety-results.md`
- `docs/qa/mobile-final-full.json`
- `docs/qa/mobile-release-verification.json`
- `docs/qa/backend-parent-verification.json`

**Jangan `git reset`, `checkout --`, `clean`, auto-format seluruh repo, atau membuat worktree dari HEAD dengan asumsi HEAD sudah memuat source live.** Source bugfix yang belum committed harus ikut baseline. Jika membuat branch/worktree, catat diff termasuk file untracked, sepakati cara mengisolasinya, dan verifikasi hashes/fungsi penjaga tetap ada. Jangan commit/push tanpa instruksi pengguna.

## 3. Larangan dan invariant

- Tidak mengubah schema finansial, trigger saldo, RLS, entitlement, harga, kuota, AI provider/model, konfigurasi Mayar/Midtrans, atau allowlist sebagai bagian redesign.
- Tidak membuat charge/checkout nyata. Premium visual bukan izin membuka pembayaran publik.
- Tidak memperluas autosave ke foto, batch, suara, atau transfer. Gunakan keputusan dari `shouldAutoSaveEntry` yang sudah ada.
- Tidak menghilangkan acknowledgement warning, validasi kategori dua bahasa, pemilih konteks, ataupun izin viewer.
- Unknown save outcome tidak boleh ditampilkan sebagai gagal pasti/belum tersimpan. Jangan mint request baru karena user mengedit payload ketika hasil sebelumnya belum pasti; gunakan guard/recovery yang ada.
- Reconciliation hanya berdasarkan request/context/fingerprint/exact IDs yang lengkap; tidak boleh kembali ke heuristik nominal/tanggal serupa.
- Wallet balance tetap dari database trigger, bukan optimistic increment/decrement client.
- Batch save memakai operasi existing yang atomik. Jangan menyimpan per-item loop karena tampilan berubah menjadi kartu.
- Transfer tetap satu transaksi dengan dompet sumber dan tujuan; jangan ubah menjadi dua transaksi expense/income.
- Draft jangan hilang karena Back, pindah tab, pergantian konteks, buka picker, atau processing cancellation. Konfirmasi bila discard; jangan mengarang offline queue/cross-restart persistence yang belum ada.
- Tidak menambah bottom-sheet dependency/animation library sebelum terbukti komponen existing tidak cukup.

## 4. Kontrak UX yang dapat diukur

### Navigation dan hierarchy
- Satu CTA dominan per state/screen. Tab + mengarah ke Capture existing; phase awal tidak mengganti navigasi global menjadi modal.
- Settings dapat dicapai dari Beranda dengan satu tap yang jelas; secondary route punya Back yang aman, termasuk cold deep link.
- Konteks Pribadi/Keluarga dan dompet tujuan selalu dapat diketahui sebelum write; gunakan label pendek, bukan memenuhi header dengan menu.
- Picker category/wallet/date memakai EntrySheet existing dan mendukung close, Escape/back, focus return, safe area.

### Alur utama yang diusulkan

**Teks jelas / single:**
`+ → ketik “kopi 35 ribu pakai BCA” → Catat → tersimpan + Koreksi/Batalkan yang sudah didukung`.

Jika keputusan autosave existing mengatakan tidak aman: `hasil → review ringkas → Simpan`. Jangan menjanjikan text selalu autosave. Undo existing hanya muncul setelah commit terkonfirmasi, sesuai perilaku dan durasi existing, bukan fake optimistic success.

**Manual:**
`+ → Manual → nominal + jenis + kategori + dompet → Simpan`.
Tanggal default hari ini; detail tambahan tertutup. Target ≤3 tap navigasi/action dari Home pada kasus fixture dengan wallet/category default valid, **tidak termasuk typing**. Jika perlu memilih dompet/kategori, catat taps tambahan; jangan menyembunyikannya dari pengukuran.

**Struk single:**
`+ → Struk → pilih foto → proses → review ringkas → Simpan`.
Reviewer tetap dapat membetulkan nominal, kategori, tanggal, dompet, dan warning. Bedakan data hasil ekstraksi dari transaksi yang sudah tersimpan.

**Multiple:**
`+ → Struk → pilih banyak/hasil banyak transaksi sesuai mode existing → ringkasan N transaksi + total → edit kartu bila perlu → Simpan N transaksi`.
Jangan menyamakan N baris struk dengan N transaksi: preserve mode dan agregasi existing. Tidak ada tampilan sukses penuh untuk batch partial/unconfirmed.

**Edit setelah simpan:**
`Transaksi → transaksi terpilih → edit ringkas → Simpan perubahan`.
Gunakan ID transaksi yang sudah tersimpan. Jangan parse ulang/simpan sebagai create karena tombol Koreksi.

**Transfer:**
`Manual → Transfer → nominal + sumber + tujuan → Simpan`.
Kategori expense/income tidak diminta; dompet sama, lintas context, atau destination invalid ditolak seperti behavior existing.

### Target tampilan dan aksesibilitas
- Viewport wajib: 360×800 dan 390×844; cek layout besar tambahan 430×932.
- Kontrol interaktif minimal 44×44 CSS px pada web; ukur box nyata, center ownership, overlap, bukan hanya `hitSlop`.
- Keyboard tidak menutupi field aktif, pesan validasi, atau satu-satunya tombol simpan.
- Amount menjadi anchor visual; type/category/wallet readable tanpa scroll pada single biasa saat keyboard tertutup di 390×844.
- Normal text contrast ≥4.5:1; large text ≥3:1. Opacity/skeleton tidak boleh membuat kontrol tampak tersedia padahal belum siap.
- Motion singkat dan fungsional, respect reduced motion; jangan menambah entrance stagger yang menunda interaksi.
- Label i18n ID/EN, screen reader role/state, focus management, loading/error/empty/full-width safe area harus diuji.

## 5. Pilihan arsitektur presentation

Bandingkan 3 arah pada prototype, jangan langsung mengimplementasikan semuanya:

A. **Composer-first:** satu input teks dominan, Manual/Struk sekunder. Minim keputusan awal; kelemahannya default teks perlu dipahami pengguna manual.
B. **Sheet-first:** + membuka pemilih metode lalu editor/review sheet. Entry tampak cepat tetapi menambah langkah pemilihan dan risiko keyboard/nested-modal/back handling. Bukan default fase awal.
C. **Context-first:** Capture dedicated, satu baris konteks/dompet, composer teks dan review kartu. Sedikit lebih banyak konteks terlihat, tetapi selaras dengan struktur sekarang dan aman bagi personal/household.

**Rekomendasi:** gabungan A+C. Pertahankan dedicated Capture; gunakan satu composer utama dan context/wallet row yang tenang. Sheet hanya untuk pilihan field. Model tidak boleh mengubah + menjadi modal global tanpa approval desain terpisah.

## 6. Peta source dan rencana komponen

**Existing, reuse terlebih dahulu:**
- `apps/mobile/app/(tabs)/_layout.tsx` — 5 tab, hidden-route Back.
- `apps/mobile/app/(tabs)/capture.tsx` — controller input/review/recovery; jangan rewrite besar-besaran.
- `apps/mobile/app/(tabs)/transaction-new.tsx` — manual/edit/transfer dan submit lock.
- `apps/mobile/app/(tabs)/index.tsx`, `transactions.tsx`, `reports.tsx`, `wallets.tsx`, `settings.tsx`.
- `apps/mobile/src/components/transaction-entry/TransactionFields.tsx` — amount/type, picker rows, details disclosure sudah ada.
- `TransactionReview.tsx`, `TransactionSuccess.tsx`, `AutoSaveToast.tsx`, `EntrySheet.tsx`, `copy.ts` di direktori yang sama.
- `apps/mobile/src/components/layout/KeyboardFormShell.tsx`.
- `apps/mobile/src/components/settings/SettingsSection.tsx`, `SettingsNavigationRow.tsx`.
- `apps/mobile/src/features/transaction-entry/{draft,state,auto-save}.ts`.
- `apps/mobile/src/services/transaction-entry-persistence.ts` — capture RPC/recovery; `apps/mobile/src/services/transactions.ts` — manual/edit/transfer APIs imported by `transaction-new.tsx`.
- `apps/mobile/src/theme/finance-editorial.ts` — identitas dan token existing.

**Proposed NEW files, bukan file yang sudah ada:**
- `apps/mobile/src/components/transaction-entry/CaptureComposer.tsx` + `.test.tsx`.
- `apps/mobile/src/components/transaction-entry/BatchReviewList.tsx` + `.test.tsx`.
- `apps/mobile/src/components/transaction-entry/BatchReviewRow.tsx` + `.test.tsx` bila row butuh reuse nyata; kalau tidak, keep internal list.
- `apps/mobile/src/theme/experience-tokens.ts` + `.test.ts` hanya untuk spacing/radius/type hierarchy; jangan menduplikasi palette.
- `apps/mobile/src/features/transaction-entry/presentation.ts` + `.test.ts` hanya bila needed untuk mapping state → CTA/message, bukan reducer kedua.
- `apps/mobile/tests/experience/transaction-flow.spec.ts` dan `apps/mobile/playwright.experience.config.ts` untuk preview lokal yang tidak otomatis memakai kredensial produksi.

**Aturan komponen:** presentation menerima draft/phase/permissions/callbacks dari controller. Tidak menerima Supabase client/service-role key, tidak menjalankan write, tidak membangun ulang requestId.

Contoh kontrak yang perlu diuji, bukan instruksi mengganti API existing:
```ts
type ExperienceState = 'idle' | 'processing' | 'review' | 'saving' | 'success' | 'unconfirmed';
type ExperienceActions = {
  onTextChange: (value: string) => void;
  onSubmitText: () => void;
  onOpenReceipt: () => void;
  onOpenManual: () => void;
};
// Unknown outcome harus punya action cek status, bukan blind-create.
// Controller existing tetap menjadi pemilik data, permissions, dan persistence.
```

## 7. Execution checklist, urutan, dan acceptance

Setiap tugas coding: **RED test → jalankan dan pastikan gagal karena behavior target → implement minimal → GREEN → review diff**. Substep satu aksi kecil; jangan menulis ulang seluruh screen dalam satu batch. Commit hanya bila user mengizinkan.

### P0. Baseline dan keputusan desain — blocker sebelum implementasi
- [ ] T01: Baca artifact/source di atas; inventarisasi dirty diff/untracked dan actual feature flags. Run baseline type-check dan focused guard tests tanpa mutasi finansial live.
- [ ] T02: Rekam before screenshots Home/Capture/manual/single-review/batch-review/Transactions pada fixture lokal atau akun disposable. Catat taps dan keyboard behavior, bukan sekadar estetika.
- [ ] T03: Buat wireframe 3 kandidat A/B/C memakai fixture statis; tunjukkan happy path + unknown-outcome state. Jangan menulis kode app/controller pada tugas ini.
- [ ] T04: Minta persetujuan layout pilihan A+C dan tiga keputusan ringkas: default teks vs manual; pola batch cards; prioritas perubahan Home setelah input. Default usulan teks, batch summary/cards, Home belakangan. User request plan saat ini belum merupakan persetujuan wireframe.

Output P0: baseline manifest, before screenshots, tap counts, satu desain terpilih. Tidak perlu matching Moonveo pixel-perfect.

### P1. Token dan rollout boundary
- [ ] T05: Tambahkan `simplePremiumExperience` sebagai flag **default OFF** ke `src/config/features.ts` beserta feature override dan tests; env `EXPO_PUBLIC_FEATURE_SIMPLE_PREMIUM_EXPERIENCE`. Existing flags tetap persis.
- [ ] T06: Daftarkan key ke `scripts/rollout-flags.cjs` dan runtime injection `scripts/deploy-pwa.mjs`; update `src/config/features.test.ts`, `__tests__/rollout-flags.test.ts`, `__tests__/store-release.test.ts` sesuai source yang ditemukan. Jangan enable di `rollout-flags.json` live.
- [ ] T07: Tambahkan marker baru hanya jika perubahan kontrak UX memerlukan preservation gate: `scripts/live-feature-registry.json` lalu `corepack pnpm sync:required-markers`. Jangan edit generated markers manual. Default-OFF harus mempertahankan legacy entry.
- [ ] T08: Buat experience tokens untuk spacing/type/radius/CTA dari palette existing; test semantic financial colors unchanged. Preview satu specimen input/review sebelum semua screen diubah.

Acceptance P1: flag OFF identik baseline; flag ON hanya mengubah presentation; tidak mengubah autosave/voice/import/payment flags.

### P2. Capture yang lebih ringan — prioritas utama
- [ ] T09: Tulis tests CaptureComposer untuk satu primary CTA, input text, secondary Manual/Struk, disabled/processing, viewer, dan voice hidden bila unavailable. RED lalu implement presentational component.
- [ ] T10: Pasang CaptureComposer hanya pada branch flag ON di `capture.tsx`; callback diarahkan ke handler existing. `capture-entry-v2.test.tsx`, `capture-autosave.test.tsx`, `capture-gating.test.tsx`, `receipt-entry-mode.test.tsx`, `capture-envelope-suggestion.test.tsx` tetap green.
- [ ] T11: Rapikan context/wallet row dan loading/empty-wallet state; no wallet → CTA membuat dompet, bukan Simpan diam-diam invalid. Context switch dengan draft aktif butuh confirmation dan stale async result tidak boleh menulis ke context baru.
- [ ] T12: Ukur keyboard, tab+, receipt picker cancel, browser Back, cold capture/manual deep link. Uji text jelas dan text ambigu; tidak menambahkan review wajib pada kasus autosave yang existing memang aman.

Acceptance P2: jumlah keputusan/CTA lebih sedikit daripada baseline, tidak ada regresi entitlement/permission/recovery. Exact happy-path tap count direkam.

### P3. Review single dan manual konsisten
- [ ] T13: Refine `TransactionFields` flag-ON/variant: amount anchor, type compact, category/wallet picker rows, tanggal/details disclosure. Tidak perlu rebuild feature yang sudah ada. Tests fields ID/EN dan errors reveal otomatis.
- [ ] T14: Single `TransactionReview` = satu ringkasan/card + satu tombol Simpan; sumber ekstraksi dan detail metadata tersimpan di disclosure. Warning unresolved tetap visible/acknowledged; tidak menghapusnya demi clean UI.
- [ ] T15: Reuse presentation pada manual/edit tanpa mengubah create/update distinction, lock double-submit, transfer logic, atau persistence. Jalankan `transaction-new-compact.test.tsx` dan `transaction-new-edit-mode.test.tsx`.
- [ ] T16: Success memuat nominal/kategori/dompet dan satu action lanjutan jelas. Koreksi menggunakan IDs existing. Pertahankan undo/autosave timeout existing; jangan menambah undo di jalur yang belum mendukungnya.

Acceptance P3: single/manual punya bahasa visual sama, reviewer dapat memperbaiki semua field, editing tidak menciptakan row baru.

### P4. Batch yang tidak melelahkan
- [ ] T17: Tests BatchReviewList untuk count/total, collapsed rows, expand/edit satu item, warning badge, error reveal, incomplete/invalid item, saving lock, viewer, dan mode struk existing.
- [ ] T18: Implement summary N transaksi + total, editable rows dan satu CTA `Simpan N transaksi`. Expand otomatis row bermasalah; tidak meminta user membuka setiap row kalau tidak diperlukan. Gunakan draft keys stabil saat edit.
- [ ] T19: Verify whole batch validation/acknowledgement dan satu atomic persistence request; test gagal salah satu item, double tap, lost response, matching fingerprint/exact IDs, missing operation, missing/partial rows, request mismatch.
- [ ] T20: Outcome belum pasti punya `Cek status` yang jelas. Jangan mint request baru dari edited payload. Warning visible dan guard tetap bekerja meskipun rows collapsed. Gunakan service/reducer existing; setiap perubahan behavior finansial keluar dari scope dan perlu review terpisah.

Acceptance P4: total/count benar, semua item dapat diperiksa, batch tidak false-success, tidak ada duplikasi/partial writes akibat layout baru.

### P5. Home dan permukaan lainnya — setelah entry disetujui
- [ ] T21: Home: hierarchy saldo → income/expense → recent transactions, satu CTA Catat. Pertahankan decorative wallet stack; hanya rapikan spacing/token dengan before/after. Jangan menambah budgeting/AI cards sebagai filler.
- [ ] T22: Transactions: ringkas row icon/description/date/amount, search/filter progressive disclosure; pertahankan swipe actions, selection, pagination, dan review-required affordance.
- [ ] T23: Wallets: saldo total + list + satu add CTA; transfer entry tetap discoverable. Tidak menambahkan debt/asset/goal subsystem baru.
- [ ] T24: Reports: satu ringkasan utama, income/expense, insight existing; date/filter di picker. Jangan mengubah perhitungan laporan, menggabungkan transfers sebagai expense, atau menaikkan panggilan AI.
- [ ] T25: Settings: reuse section/row components; kelompok Akun, Pencatatan, Data, Preferensi, Bantuan. Features yang memang OFF tetap tidak dipromosikan sebagai aktif. Pricing/upgrade wording hanya merapikan current display, tidak menjanjikan entitlement baru.

Acceptance P5: brand consistency, hierarchy low-density, fitur existing tetap terjangkau tanpa memperbanyak primary tabs. Home stack tetap ada kecuali approval terpisah.

### P6. QA, review, dan deployment TERPISAH
- [x] T26: Lengkapi matrix di bagian 8; simpan result JSON, screenshots before/after, test command, exit code, dan jumlah skipped. — **SELESAI 2026-10-03**: bukti di `test-results/experience/t26-matrix.{md,json}`; 39 screenshot before/after (360/390/430); full suite 102/102 suite, 906 passed, **8 skipped (pre-existing, sama dengan baseline)**, exit 0; focused baseline 11/11 suite 116 passed exit 0; `quality:live` exit 0 (39/39 marker). Lihat §8.1.
- [x] T27: Review spec compliance, lalu code quality/performance/financial safety; kedua reviewer tidak boleh menyatakan lulus berdasarkan screenshot atau self-report implementer saja. — **SELESAI 2026-10-03.** Reviewer #1 (spec compliance, 20 suite/183 test sendiri). Reviewer #2 (kualitas/a11y/safety, type-check + 26 test sendiri). **9 temuan: 5 diperbaiki, 2 ditolak dengan bukti, 2 di luar change-set (dilaporkan).** Diperbaiki: (1) **`settings-notification-inbox` hilang dari layout premium** — affordance nyata yang drop, kini komponen bersama; (2) **chip navigasi Bills ikut ter-collapse** — kini tetap terlihat; (3) label a11y picker periode + glyph dekoratif disembunyikan; (4) `MANUAL_BACK_RETURN_URL` kini benar-benar dipakai (anti-drift); (5) export mati `addCtaCount` dihapus, invariant dipindah ke assertion DOM. Ditolak dengan bukti: klaim "filterToggle tanpa 44px" (false positive — `minHeight: 44` ada di baris 1142; reviewernya memotong bukti dengan `grep -A5`) dan usulan `useMemo` untuk array grup Settings (tidak akan pernah hit karena elemen section dibuat ulang tiap render). Di luar change-set: perubahan shared-component P2–P4 (V1) dan rewrite `reconcileEntry` (V4) = pekerjaan dirty pre-existing, bukan change-set presentasi. Verifikasi ulang: jest **11 suite/165 passed/8 skipped/exit 0**, type-check 0, export 0, browser **51 passed/exit 0**, screenshot **39 PNG** diregenerasi. Bukti: `test-results/experience/t27-review.json`.
- [~] T28: Present preview ON vs OFF dan bukti taps/keyboard/a11y ke pengguna. Minta **approval redesign dan scope rollout**; jangan memakai persetujuan rilis bugfix lama. — **Presentasi SELESAI 2026-10-03** (8 screenshot before/after 390px + matriks §8.1). Keputusan yang sudah masuk: (1) **rollout = staged** — nyalakan sebagian dulu, monitor, siap rollback; (2) **perbaikan F2 (Back guard) IKUT dirilis**, tetap flag-gated. **APPROVED:** pengguna membalas laporan T27 dengan “Setujui”. Approval redesign + rollout staged + F2 dicatat. Tahap pertama: deploy bundle live dengan default pengalaman baru OFF dan validasi ON dalam sesi browser canary terisolasi; tidak ada infrastructure percentage/allowlist sehingga bukan rollout persentase pengguna. Aktivasi global tidak termasuk tahap ini. T29/T30 dijalankan sesudah snapshot dan gates; tanpa commit/push/backend/payment change.
- [x] T29: Setelah approval, snapshot index/flags dan hashes, run canonical gates, build/deploy serial, baca ulang exact public bundle/flags. — **Deploy staged default-OFF selesai.** Snapshot 28 file diverifikasi; source hashes sebelum deploy tidak drift; full regression 102 suite/908 passed/8 pre-existing skipped; quality:live exit 0, focused regression 10 suite/154 passed, type-check/export/39 marker PASS. Gates dijalankan terpisah secara serial; `SKIP_LIVE_QUALITY=1` hanya menghindari pengulangan gates pada source identik. Public bundle exact SHA256, 9 public routes, dan seluruh flag lama unchanged terverifikasi. New flag false; tidak ada aktivasi global/commit/push/backend deploy. Bukti: `docs/qa/premium-staged-{snapshot,readback}.json`; rollback helper dry-run 28 file cocok.
- [~] T30: Authenticated smoke user disposable, verified cleanup transaksi → wallets → auth user. — **BELUM PASS/AKTIVASI DIBLOKIR.** Live financial integrity 11 checks PASS dan cleanup verified. Browser real manual create35k + edit42k pada ID identik dan trigger balance PASS, cleanup restored saldo+zero rows+auth404. Smoke terbaru 20 steps, 18 PASS, 2 real blockers: (1) F2 returns Capture but Capture/manual drafts silently discarded; (2) premium Struk sets Foto but existing receipt surface stays unreachable. Harness-only issues (disabled opacity, read-only notification requests, incorrect selector prefix) diperbaiki. User memilih eksplisit **perbaiki perlindungan draft, ulang gates/smoke sebelum aktivasi**. Worker perbaikan flag-gated + receipt regression berjalan; default live tetap OFF. Hasil belum disebut selesai. Bukti smoke: `docs/qa/premium-staged-runs/2026-10-03T11-22-11-323Z-twE4e1/result.json`.

## 8. Matrix pengujian wajib

Untuk masing-masing gunakan current implementation sebagai safety contract; tambah UX regression tests yang spesifik.

1. Teks jelas single: existing autosave + correction/undo behavior tetap.
2. Teks ambigu/unresolved: review + acknowledgement; no silent write.
3. Manual expense dan income: create sekali, fields persist, date/details dapat dibuka.
4. Single struk: preview → correction → confirmed save.
5. Multiple/batch dan mode receipt grouping: count/total sesuai transaksi hasil mode; atomic save.
6. Post-save edit: amount/category/wallet delta benar; row ID tetap.
7. Transfer: source/target tidak sama, same context, debit/credit tepat.
8. Network lost response: no blind create, partial match never success, guard edited-unknown payload visible.
9. Two rapid taps: create/edit request tepat sekali.
10. Cancel processing/picker, Back/tab/context switch: retain work or explicit discard; stale result ignored.
11. Personal dan household owner/member/viewer: presentation tidak melewati RLS/permissions.
12. Free/premium/expired/quota exhausted: current gate tetap; typed input tidak hilang saat perlu upgrade.
13. No wallet, empty transactions, loading, backend error, long merchant/category labels.
14. ID/EN, keyboard, safe area, 44px targets, focus/escape/back, reduced motion, 360/390/430 widths.
15. Flag OFF baseline; ON experience; rollout retains simpleNavigation/transactionEntryV2/aiAutosaveText and does not enable voice/import.

### 8.1 Hasil eksekusi (T26 — 2026-10-03)

Matrix di atas **terisi** dengan hasil nyata; bukti lengkap: `apps/mobile/test-results/experience/t26-matrix.md` dan `t26-matrix.json`.

| # | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Status | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

Gerbang: `git diff --check` 0 · `type-check` 0 · focused baseline 11 suite/116 passed/0 · **full suite 102 suite/906 passed/8 skipped/0 failed/exit 0** · `quality:live` 0 (39/39 marker).
Browser preview (stub, 3 viewport): **96 passed / 0 failed**; **39 screenshot** before/after.
Skipped = 8, **pre-existing** dan sama dengan baseline §2 (tidak ada skipped baru).
Dua temuan infrastruktur ditemukan & diperbaiki saat T26: (1) Jest mengoleksi spec Playwright → `jest.config.js`; (2) Playwright menghapus direktori screenshot tiap run → `outputDir` dipindah. Detail di `findings-fix-log.json` + `t26-matrix.md` bagian E.

## 9. Exact verification commands

Dari `/home/Danu88/apps/kaswise/apps/mobile`, gunakan background + notify-on-complete untuk command panjang. Jalankan serial; jangan test/export/deploy berat bersamaan.

Focused safety baseline dan setelah tiap integrasi:
```bash
corepack pnpm type-check
corepack pnpm test -- --runTestsByPath \
  __tests__/capture-entry-v2.test.tsx \
  __tests__/capture-autosave.test.tsx \
  __tests__/capture-gating.test.tsx \
  __tests__/receipt-entry-mode.test.tsx \
  __tests__/transaction-new-compact.test.tsx \
  __tests__/transaction-new-edit-mode.test.tsx \
  src/services/transaction-entry-persistence.test.ts \
  src/services/transaction-entry-reconciliation.test.ts \
  src/components/transaction-entry/TransactionFields.test.tsx \
  src/components/transaction-entry/TransactionReview.test.tsx \
  src/components/transaction-entry/EntrySheet.test.tsx \
  --runInBand
```
Expected: zero failures. Tambahkan exact new test paths untuk komponen baru per task; jangan melaporkan pass count dari plan sebagai hasil eksekusi.

Full gates:
```bash
git diff --check
corepack pnpm test -- --runInBand
corepack pnpm quality:live
```
Expected: type-check/full tests/registry/export/bundle marker checks PASS. Existing 8 skipped tidak dihitung passed; investigasi kalau skipped baru muncul. Jangan auto-format repo untuk menyelesaikan debt unrelated.

Browser preview setelah config P26 dibuat:
```bash
corepack pnpm exec playwright test -c playwright.experience.config.ts
```
Config harus explicit baseURL preview lokal dan feature override, fixture lokal/stub aman; jangan default ke credentials/live production. Untuk screenshots, tunggu computed opacity ancestor ≥0.95, bukan hanya locator visible; verify URL sesudah navigasi.

Production steps ONLY after T28 approval:
```bash
corepack pnpm deploy:pwa
corepack pnpm verify:live-url
```
Branch harus memenuhi guard release/main/production; jangan bypass branch/quality guard tanpa alasan dan approval tercatat. Deploy script memiliki flag injection; snapshot setiap flag dan preserve semuanya kecuali new flag yang disetujui. Jangan hardcode marker total.

Backend seharusnya tidak berubah/tidak dideploy pada redesign ini. Jika executor mengubah backend/payment atau schema, hentikan: itu scope baru. Rilis backend berikutnya di masa depan harus membaca exact-env override runbook, tetapi bukan langkah plan UI ini.

## 10. Risiko dan tradeoff

- Visual premium bisa menambah motion, cards, dan layar, justru membuat flow lambat. Ukur taps/layout/keyboard, bukan banyak dekorasi.
- Menyembunyikan field membuat warning/permission/context rawan hilang. Error dan unknown outcome wajib membypass collapsed presentation.
- Sheet-first terasa cepat tetapi rumit untuk PWA keyboard/Back; dedicated Capture mengurangi risiko.
- Extracting `capture.tsx` secara besar dapat merusak closures/generation/locks. Komponen kecil presentational dulu; orchestration refactor bukan tujuan utama.
- Preferensi default wallet lintas konteks tidak boleh di-globalize. Preserve current valid selection; fitur belajar preferensi otomatis baru ditunda.
- Bulk receipt rounding/tax/fee dan transfer accounting bukan masalah styling. Jangan mengubah arithmetic agar cocok desain.
- Disk/memory host sebelumnya sempit; cek `df -h /` dan `free -m` sebelum build. Jangan cleanup image/container unrelated atau menjalankan banyak worker build secara bersamaan.
- Missing Moonveo reference menghalangi klaim parity spesifik, bukan kontrak Kaswise simple/premium ini.

## 11. Di luar scope saat ini

New debt/assets, financial goals, bank synchronization, Apple Shortcuts/share-intent, offline queue, new monetization, new AI providers, new notification jobs, dan perluasan autosave. Semuanya dapat direncanakan setelah entry experience terbukti mudah, bukan ditambahkan agar terlihat premium.

## 12. Prompt handoff siap pakai

```text
Baca seluruh Kaswise Simple Premium Experience Implementation Plan yang saya lampirkan.
Workspace: /home/Danu88/apps/kaswise. Ini monorepo aktif Expo/Supabase; apps/web legacy.

Jalankan plan task-by-task, mulai P0 baseline + desain. Baca source dan artifact QA,
preserve seluruh dirty/untracked bugfix yang belum committed. Jangan reset, clean,
commit, push, mengubah pembayaran/AI/DB, atau deploy tanpa izin.

Target bukan clone Moonveo: pertahankan identitas Finance Editorial Kaswise dan Home wallet stack.
Prioritas Capture → single/manual review → batch → Home/Transactions/Wallets/Reports/Settings.
Reuse reducer/persistence/EntrySheet/fields existing; presentation tidak menulis ke database.
Default new experience flag OFF; UI lama dan semua flag existing harus tetap bekerja.

Per task coding lakukan RED-GREEN dan tunjukkan command + exit code + actual counts.
Jangan klaim pass dari angka baseline. Jalankan tests/build serial, bukan beberapa heavy jobs sekaligus.
Unknown save outcome, batch atomicity, fingerprint exact IDs, viewer RLS, kategori ID/EN,
transfer, dan trigger saldo tidak boleh diregresikan.

Pada P0 sajikan wireframe pilihan dan minta approval sebelum implementasi desain.
Sesudah implementasi tunjukkan preview dan QA sebelum meminta izin rollout produksi terpisah.
Laporkan checklist semua task; tutup setiap gap, jangan hanya menulis caveat lalu menganggap selesai.
Jika referensi Moonveo spesifik diperlukan, minta demo ulang; jangan mengarang screenshot/parity.
```

**Definition of Done:** Desain disetujui, seluruh applicable tasks/checks PASS dengan bukti nyata, flag OFF baseline aman, financial semantics unchanged, rollout mendapatkan izin baru, public bundle/flags dan authenticated smoke terverifikasi, serta rollback/cleanup siap. Pernyataan plan-only di atas merupakan status historis saat dokumen dibuat, bukan status live saat ini.

## 13. Rekonsiliasi status dan lanjutan — 2026-10-05

Addendum aktif: `.hermes/plans/2026-10-05_104038-kaswise-controls-forms-premium.md`.

- Package A memiliki bukti completion/deployment di `docs/qa/package-a-technical-completion-2026-10-04.md`; jangan ulang tugas foundation Setelan/Bantuan hanya karena checkbox historis belum diselaraskan.
- B2 Reports lanjutan COMPLETE dan deployed: `docs/qa/b2-continuation-runs/live-1791169186321/result.json`, 18/18 Chromium/WebKit, cleanup terverifikasi; public bundle/hash dan rollout flags telah dibaca ulang. Hierarki, state tab, transfer exclusion, retry dan persistensi periode kini regression baseline, bukan pekerjaan baru.
- EntrySheet, TransactionFields, FinanceContextSwitcher dan KeyboardFormShell sudah tersedia. Jangan menulis ulang; audit gap nyata sebelum patch.
- T30 dan checkbox historis lainnya tidak boleh otomatis ditandai complete dari bukti B2. Gunakan mapping bukti per flow; khusus keyboard HP nyata/focus browser masih memerlukan verifikasi tersendiri.
- Paket berikutnya CF01–CF07: baseline -> shared sheet gaps -> kategori/dompet/tanggal/konteks -> manual/edit/transfer -> keyboard/Back/overlap -> review/gates -> preview/approval/rollout terpisah.
- Capture existing, Home wallet stack, persistence/financial semantics dilindungi. Addendum ini menyelaraskan plan dan merinci pekerjaan; tidak mengubah source aplikasi, rollout flags atau produksi.
