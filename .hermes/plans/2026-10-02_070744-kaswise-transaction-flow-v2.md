# Kaswise Transaction Flow V2 — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task. Load kaswise-mobile-finance-editorial first. This document authorizes planning only; implementation, commits, schema application and deployment require the user's next execution instruction.

**Goal:** Membuat pencatatan Kaswise sesederhana pola interaksi Moonveo: mulai input cepat, koreksi hasil AI sebelum simpan, form manual ringkas, tujuan penyimpanan jelas, dan hasil penyimpanan dapat dipercaya.

**Architecture:** Capture menjadi orchestration tipis untuk input → draft bersama → review editable → persistence → success. Manual dan edit berbagi field/picker, tetapi manual valid tidak diberi review tambahan. Service transaksi, RLS, audit konteks dan trigger saldo tetap menjadi sumber kebenaran; perubahan batch/idempotency dibuat additive dan digate terpisah.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, Expo Router 6, TypeScript, Supabase PostgreSQL/RLS, Jest + React Native Testing Library, Playwright. Versi berdasarkan package.json yang dibaca, bukan CLAUDE.md lama.

---

## 0. Cara memakai dokumen ini / batas otorisasi

- Repo: `/home/Danu88/apps/kaswise`; seluruh path task di bawah relatif ke repo.
- Semua path bertanda Create adalah PROPOSAL, bukan file yang sudah tersedia.
- Ini plan, bukan laporan implementasi. Tidak ada test/build/deploy baru yang dijalankan untuk perubahan V2.
- Baca ulang git status, branch, package scripts dan kode saat mulai. Snapshot baseline bisa berubah.
- Pertahankan perubahan unrelated; jangan reset/clean working tree. Jangan menyalin rahasia ke handoff, log, screenshot atau laporan.
- Commit hanya setelah diminta; judul commit di bawah adalah saran, bukan perintah otomatis.
- Deploy hanya setelah gate QA dan persetujuan release. Jangan menjadikan ALLOW_NON_PROD_BRANCH=1 default.
- Referensi Moonveo adalah inspirasi interaksi, bukan spesifikasi produk yang disalin. Video tidak memperlihatkan semua detail penyimpanan.

## 1. Baseline yang diperiksa

Snapshot terminal 2026-10-02, timezone host tidak diasumsikan WIB:
- Branch `feat/kaswise-simple-mode`.
- HEAD `b3b52a9af40a8193eb09e3471754bdab2235d50e`.
- Git status saat diperiksa: untracked dua plan lama, screenshot dan alat/hasil theme preview. Tidak ditemukan tracked modifications dalam output itu; periksa ulang sebelum eksekusi.
- `apps/mobile/rollout-flags.json` berisi `{ "simpleNavigation": true }`. Voice default bergantung deployment, jangan otomatis mengaktifkan.
- Laporan deployment terdahulu dari percakapan: live app.kaswise.com, 35/35 bundle markers, probe 10 rute/99 kontrol tanpa pelanggaran, full suite 72 suite/605 pass/8 skipped. Ini HISTORICAL, tidak diverifikasi ulang pada turn planning dan bukan jaminan untuk V2.

Temuan langsung dari source:
1. `app/(tabs)/capture.tsx:450-561`: teks dianalisis lalu langsung createTransaction untuk seluruh draft dengan Promise.all; tidak melalui review sebelum write.
2. `capture.tsx:620-701`: suara dianalisis lalu ada konfirmasi, tetapi preview belum mengedit field langsung. Tanggal fallback memakai UTC string; gunakan helper tanggal lokal.
3. `capture.tsx:752-900`: struk otomatis dianalisis; preview daftar item; confirm menjalankan beberapa insert paralel. RLS error dapat di-retry dengan wallet_id:null. Hilangkan fallback ini.
4. `capture.tsx:1013-1052`: preview suara/struk berbeda dan terutama read-only.
5. `capture.tsx:1095+`: header besar, kuota, destination/context, wallet chips, mode chips sebelum workspace.
6. `app/(tabs)/transaction-new.tsx:563-819`: banyak field/chip tampil bersama, wheel tanggal dan konfirmasi tampil permanen, merchant/note selalu terlihat.
7. `src/services/transactions.ts`: createTransaction sudah memeriksa canCreateInContext, melakukan insert.select.single, sync anggaran best-effort, notifyWalletChanged. Wallet nullable masih didukung service untuk legacy/import. Jangan memaksakan perubahan global tanpa audit caller.
8. Mapping database menggunakan type/nominal/kategori/catatan/tanggal. TransactionCreate memakai transaction_type/amount/category/description/date. Jangan menulis field model UI langsung ke DB.
9. `note` tidak diserialisasikan oleh buildInsertPayload; update hanya menggunakan note untuk fallback catatan ketika description tidak dikirim. Jangan membuat UI menjanjikan penyimpanan catatan terpisah yang sebenarnya hilang.
10. `receipt-intake.ts:386-475`: item normalizer menyesuaikan selisih total ke item terbesar. Ini bukan sumber rincian asli yang aman ditampilkan sebagai breakdown pajak/diskon.
11. Pencarian terbatas pada supabase menemukan komentar import-idempotency, belum membuktikan adanya endpoint idempotent untuk capture. Audit schema/functions penuh pada Task 02.
12. Tidak ditemukan Modal/BottomSheet di pencarian komponen bersama saat ini. Mulai dari primitive RN Modal, bukan menambah library berat tanpa kebutuhan.

## 2. Scope dan keputusan UX

### Termasuk
- Capture entry minimal dengan satu aksi utama; voice bila flag aktif, text bila tidak.
- Review bersama editable untuk teks/suara/struk, termasuk batch teks.
- Manual ringkas; edit existing transaction tetap aman.
- Picker kategori/dompet/tanggal lewat sheet/dialog.
- Tujuan Pribadi/Keluarga dan dompet selalu terlihat, scoped defaults.
- Success/error yang jujur; single-flight dan retry tanpa duplikasi.
- Struk total sebagai default; split eksplisit digate integritas batch.
- Permission viewer, entitlement AI, deep links, i18n Indonesia/English, mobile accessibility.

### Tidak termasuk
- Redesign Home/decorative wallet stack, Reports, bottom nav atau seluruh design system.
- Meniru dark theme Moonveo; perubahan identitas brand.
- Import statement, recurring transactions, OCR provider rewrite, auto-record tanpa review AI, Apple Shortcuts/share intent.
- Offline transaction queue, autosave draft berisi data sensitif, lintas-device draft sync.
- Rewrite schema legacy, mengedit saldo dari client, membersihkan data produksi atau mengubah kebijakan akses keluarga.

### Target flow
AI: `Catat → input → processing → Cek transaksi/edit → Simpan → Tersimpan`.
Manual: `Catat → Manual → nominal/kategori (default dompet/tanggal terlihat) → Simpan → Tersimpan`.
Transfer: `Manual → Transfer → nominal + dompet asal/tujuan → Simpan`; kategori/deskripsi belanja tersembunyi, tidak dihitung expense.

### Wireframe perilaku
Capture idle:
```
Catat transaksi
Pribadi · Seabank ▾

[ Ketuk untuk bicara ]  // hanya voice aktif; jangan auto-request permission
Ketik · Scan · Manual
```
Review:
```
Cek transaksi                    Tutup
Pribadi · Seabank ▾
Rp35.000                         [editable]
Pengeluaran                      [editable]
Kategori      Makan & Minum       >
Tanggal       Hari ini           >
Deskripsi     Kopi               >
Tambah detail                    >
Lihat sumber                     >
[ Simpan transaksi ]             // sticky, keyboard/safe-area aware
```
Manual memiliki field yang sama, tanpa Lihat sumber dan tanpa langkah review terpisah. Nominal auto-focus hanya create/manual, bukan ketika membuka edit atau setiap re-render.
Success:
```
Tersimpan ke Seabank
Kopi · Rp35.000
[ Catat lagi ]
Lihat transaksi
```
Batch: tampilkan jumlah transaksi, total, tujuan; Lihat transaksi membuka daftar/hasil tersimpan, tidak hanya item pertama.

### Aturan default dan state
- Context selalu aktif dan tampak. Default wallet diprioritaskan last-valid wallet untuk context yang sama; jika tidak ada, wallet aktif pertama dalam context itu. Jangan memindahkan last wallet Pribadi ke keluarga.
- Jika tidak ada dompet, tampilkan Buat/Pilih dompet dan pertahankan draft; V2 tidak menyimpan tanpa dompet. Service legacy/import tetap nullable.
- Ganti konteks saat draft: konfirmasi eksplisit sebelum reset; selama recording/processing/saving kunci context. Respons async lama ditolak dengan request generation + context snapshot.
- Pada idle, ganti mode tanpa discard diam-diam; dirty input perlu konfirmasi. Rekaman harus stop/unload pada cancel/unmount.
- Review field nominal/kategori/jenis/dompet/tanggal bisa dikoreksi sebelum insert. Tidak memanggil create/update ketika editing draft.
- Confidence extraction tetap metadata model, jangan dinaikkan karena user edit. Setelah semua field required valid dan warning diakui, konfirmasi explicit dapat set verified; review flag unresolved tetap true. Satukan semantik dengan transaction-review service, jangan menebak.
- Validation inline, fokus ke error pertama, tetap mempertahankan input. Tidak menampilkan raw RLS/backend text.
- Viewer melihat notice permanen; semua entry dan submit handlers guard; deep-link tidak bypass. RLS tetap enforcement akhir.
- Denied mic/camera, voice flag off, AI quota habis: manual tetap tersedia bagi role yang boleh create. Jangan redirect upgrade tanpa affordance kembali.
- UI loading bukan jaminan idempotency; lihat Task 05 untuk timeout setelah DB sudah commit.

### Catatan produk yang diputuskan sebagai default plan
- Tidak menambah review manual kedua.
- Tidak menambah wizard per-field.
- Receipt default satu total; kategori summary dipilih pengguna jika struk campuran.
- Scan split per item didukung hanya bila total reconcile dan persistence atomic/idempotent terbukti. Jika gate belum siap, UI harus menyatakan split belum tersedia, bukan mengklaim P1 selesai.
- Receipt total wajib finite, positif, integer rupiah. Jika total tidak terbaca, pengguna memasukkan/mengonfirmasi nominal; jangan langsung menjadikan subtotal item sebagai total final.
- Selisih subtotal vs total ditampilkan sebagai selisih yang harus ditinjau; tidak menamai pajak/diskon jika extraction tidak menyediakannya. Split diblokir sampai jumlah draft sama dengan total yang dikonfirmasi. Jangan mengubah angka item terbesar diam-diam.
- Rincian struk disimpan pada ai_extracted (JSON yang sudah tersedia) dengan versi schema internal dan metadata pilihan total/split; source receipt_url tetap dipakai. Jangan menimpa transaksi historis.
- Merchant optional; description default pendek dapat disunting. Catatan terpisah ditampilkan hanya jika kontrak persistence mendukung; bila belum, gabungkan secara eksplisit ke description atau sembunyikan field catatan baru. Review keputusan pada Gate A, jangan kehilangan note silently.

## 3. Architecture / kontrak proposed

Files Create:
- `apps/mobile/src/features/transaction-entry/draft.ts`
- `apps/mobile/src/features/transaction-entry/draft.test.ts`
- `apps/mobile/src/features/transaction-entry/state.ts`
- `apps/mobile/src/features/transaction-entry/state.test.ts`
- `apps/mobile/src/features/transaction-entry/adapters.ts`
- `apps/mobile/src/features/transaction-entry/adapters.test.ts`
- `apps/mobile/src/features/transaction-entry/save.ts`
- `apps/mobile/src/features/transaction-entry/save.test.ts`
- `apps/mobile/src/components/transaction-entry/EntrySheet.tsx`
- `apps/mobile/src/components/transaction-entry/EntrySheet.test.tsx`
- `apps/mobile/src/components/transaction-entry/TransactionFields.tsx`
- `apps/mobile/src/components/transaction-entry/TransactionReview.tsx`
- `apps/mobile/src/components/transaction-entry/TransactionSuccess.tsx`

Kontrak awal (sesuaikan dengan tipe service sesungguhnya; jangan copy sebagai pengganti integrasi):
```ts
import type { TransactionType } from '../../services/transactions';

export type EntrySource = 'manual' | 'text' | 'voice' | 'image';
export type TransactionDraft = {
  key: string;
  source: EntrySource;
  transactionType: TransactionType;
  amount: number | null;
  category: string;
  description: string;
  walletId: string | null;
  targetWalletId: string | null;
  date: string;
  merchant: string | null;
  confidence: number | null;
  unresolvedFields: Array<'amount' | 'category' | 'date' | 'wallet'>;
  receiptUrl: string | null;
  extraction: Record<string, unknown> | null;
};
export type EntryPhase =
  | 'idle' | 'recording' | 'processing' | 'review'
  | 'saving' | 'success' | 'error';
```
Context snapshot disimpan pada sesi entry, bukan digandakan di setiap draft. State menyimpan request generation, current source, raw input/source, drafts, previous recoverable phase, requestId dan committed IDs. Context identity menggunakan helper yang mengenali personal/household, bukan JSON stringify object role yang bisa berubah.

Pure validation:
- amount finite/positif/integer, valid local ISO date.
- wallet aktif ada pada context snapshot; source != target pada transfer.
- expense/income kategori valid taxonomy/custom options; transfer jangan dipaksa kategori expense.
- role current masih boleh create/update; role dapat berubah saat draft terbuka.
- semua draft batch valid sebelum persistence.

Kontrak save:
```
saveEntry({ requestId, contextSnapshot, drafts })
→ { transactions: Transaction[], budgetSyncWarning?: boolean }
```
Input freeze ketika saving. `requestId` baru ketika payload yang belum committed berubah; retry payload sama memakai ID yang sama. Semua CTA/keyboard submit memakai satu sinkron in-flight ref, bukan state boolean saja.

## 4. Integritas persistence (release blocker)

### Single-flight vs idempotency
- Ref lock mencegah dua handler sebelum React rerender.
- Untuk timeout/network error dengan outcome unknown, jangan langsung membuka retry yang melakukan insert ulang.
- Prefer server-side operation identity untuk single maupun batch. Audit fitur import idempotency sebelum membuat baru.
- Jika tidak tersedia, proposed additive migration `supabase/migrations/202610020001_transaction_entry_idempotency.sql` (rename bila nomor bentrok) dan wrapper `src/services/transaction-entry-persistence.ts`.
- Proposed RPC name `create_transaction_entry_v2`, bukan endpoint yang sudah ada. Kontrak parameter typed JSON drafts + request UUID; user identity auth.uid(), context diverifikasi server, tidak menerima user_id dipercaya client.
- Implementasi security invoker bila memungkinkan. Jangan memakai service role dari mobile. Bila definer benar-benar diperlukan, security review wajib: fixed search_path, explicit role/context/wallet checks, grants ketat, RLS setara.
- Operation record scoped user + context + requestId, fingerprint payload, hasil IDs. Concurrent retry serializes/unique key; return hasil yang sama; key reuse dengan payload berbeda ditolak.
- Insert seluruh batch dalam satu database transaction. Item invalid menyebabkan rollback semua insert dan perubahan saldo trigger. Jangan Promise.all create individual sebagai atomic batch.
- Audit DB trigger/RLS existing sebelum menulis SQL; jangan invent nama tabel/kolom constraints.
- Reuse normalization, finance audit fields dan notifyWalletChanged. Budget allocation setelah save harus idempotent dan tidak menimbulkan retry insert; bedakan warning anggaran dari gagal transaksi.
- Apply migration hanya ke local/staging yang user izinkan. Tidak mengeksekusi schema production sebagai bagian UI task.
- Jika user tidak mengizinkan schema, stop di gate ini dan tawarkan scope client-only secara eksplisit. Tidak menyebut idempotency cross-network selesai atau split safe hanya karena double-tap test pass.

## 5. Task checklist dan urutan implementasi

Semua task kode mengikuti micro-steps: (1) tulis failing assertion spesifik; (2) run focused Jest dan pastikan gagal karena perilaku belum ada, bukan harness; (3) implement minimum; (4) run ulang sampai pass; (5) diff review/spec review/code review; commit hanya bila user meminta. Setiap langkah adalah satu unit kerja; task kompleks dibagi menjadi subtask kecil, bukan dianggap selesai dalam satu sesi.

Per-task commands dijalankan dari `/home/Danu88/apps/kaswise/apps/mobile`, kecuali SQL dan git yang root. Untuk tiap nama test di bawah: `corepack pnpm test -- --runTestsByPath <path> --runInBand`; expected awal FAIL, sesudah implement PASS. Jangan menginvent hitungan test.

### Task 01 — Rebaseline dan lock desain (Gate A)
- [ ] Baca ulang git status/HEAD, CLAUDE.md, skill design dan plan sebelumnya; catat perbedaan baseline.
- [ ] Screenshot authenticated local/staging capture/manual/review/success sebelum perubahan; tidak login dengan credential tebakan.
- [ ] Mockup minimal idle, review, manual, transfer, success, batch, viewer, no-wallet; 360px dan 390px.
- [ ] Konfirmasi receipt total/split, note persistence dan no-wallet default dengan user sebelum behavior/schema berubah.
Files Read: capture.tsx, transaction-new.tsx, transactions.ts, receipt-intake.ts, transaction-review.ts, theme/finance-editorial.ts.
Done: desain + acceptance di bawah disepakati; tidak ada Home stack yang dihapus.

### Task 02 — Audit service/schema, caller dan regression baseline
- [ ] Enumerate create/update caller, nullable-wallet penggunaan import/legacy, trigger transfer, budget sync, note mapping, review semantics.
- [ ] Audit idempotency import/constraints/RPC/RLS di migrations dan environment staging.
- [ ] Run type-check dan existing focused suites; pisahkan existing failures dari new failures.
Files Read/Test: src/services/transactions.test.ts, transaction-review.test.ts, receipt-intake.test.ts; __tests__/capture-gating.test.tsx, capture-envelope-suggestion.test.tsx, transaction-new-edit-mode.test.tsx, voice-intake.test.ts.
Done: pilihan persistence tercatat, current failures diketahui, tidak melemahkan test untuk menghilangkan behavior regression.

### Task 03 — Draft model dan validator pure
- [ ] Create draft.ts + draft.test.ts.
- [ ] Cases: NaN/Infinity/zero/negative/fraction rupiah, date invalid, foreign/inactive/missing wallet, role viewer, source=target transfer, valid income/expense/transfer.
- [ ] Export field errors; tidak melakukan I/O atau mutate saldo.
Done: validasi identik dipakai manual dan AI, kategori custom tetap bisa dipilih.
Suggested commit: `feat(entry): add typed drafts and validation`.

### Task 04 — Lifecycle reducer, context safety dan submit lock
- [ ] Create state.ts/state.test.ts.
- [ ] Assert generation lama tidak dapat mengisi review/success context baru; dirty mode/context switch tidak discard silently.
- [ ] Assert reset sesudah success membuat request baru; failure menjaga source/drafts; permission berubah memblokir submit.
- [ ] Ref lock melindungi semua submission pathways; cancel/unmount unload recording.
Done: deterministic transitions, tidak ada double-submit dalam tick yang sama.
Suggested commit: `feat(entry): define safe capture lifecycle`.

### Task 05 — Idempotent atomic persistence (Gate B)
- [ ] Buat/extend mekanisme existing jika audit membuktikan sesuai; bila tidak, additive SQL + wrapper seperti Section 4.
Files Create proposed: migration di Section 4; `apps/mobile/src/services/transaction-entry-persistence.ts` dan `.test.ts`; `supabase/tests/transaction_entry_v2.sql` menggunakan harness database yang tersedia, jangan mengklaim executable sebelum harness ditemukan.
- [ ] Test same request dua kali/concurrent → IDs sama dan saldo berubah sekali.
- [ ] Test timeout after commit → retry hasil sama; mismatch payload same ID ditolak.
- [ ] Test batch item kedua invalid → tidak ada transaksi/saldo parsial; viewer, foreign context/wallet, auth missing gagal.
- [ ] Test transfer debit/credit dan no expense-budget allocation; RLS tidak dilemahkan.
Done: bukti integration database nyata pada local/staging, bukan mock-only. Gate B tidak pass jika SQL belum dieksekusi.
Suggested commit: `feat(entry): add atomic idempotent persistence`.

### Task 06 — Input adapters (text/voice/receipt)
- [ ] Create adapters.ts/adapters.test.ts. Pindahkan conversion logic dari screen tanpa mengubah classifier heuristics sembarang.
- [ ] Teks batch menghasilkan draft, tidak insert. Voice metadata/source dipertahankan, local date helper.
- [ ] Receipt summary menggunakan final total; item rincian disimpan terpisah dari angka rekonsiliasi lama.
- [ ] Confidence/warnings/taxonomy/date/raw source/merchant dipertahankan.
Done: fixtures yang sama dari 3 source masuk draft contract yang sama; analyze tidak menulis transaksi.
Suggested commit: `refactor(entry): normalize capture results into drafts`.

### Task 07 — Sheet/picker primitive accessible
Files Create: components/transaction-entry/EntrySheet.tsx + .test.ts.
- [ ] RN Modal + sheet appearance; focus entering/restoring, accessibility modal semantics, Escape/back/backdrop, safe-area, scroll.
- [ ] Category picker searchable dengan recent options; wallet hanya context aktif; date picker menampung wheel existing dengan Apply/Cancel lokal.
- [ ] Cancel tanggal tidak mengubah draft committed date; Apply hanya di sheet, bukan dua status permanen pada form.
- [ ] Search keyboard tidak menutup hasil/CTA; touch targets >=44px, focus terlihat.
Done: tested web/PWA + RN-compatible, jangan mengklaim native tested tanpa runtime native.
Suggested commit: `feat(entry): add accessible transaction pickers`.

### Task 08 — Shared fields dan detail disclosure
Files Create: TransactionFields.tsx; `apps/mobile/__tests__/transaction-fields.test.tsx`.
- [ ] Amount/type/category/destination/date + progressive disclosure merchant/description detail.
- [ ] Satu baris value/chevron per picker, bukan semua wallet/category chips.
- [ ] Explicit Indonesian/English copy; apply theme tokens, no green/lime CTA atau bright-red expense.
- [ ] Description dan note mengikuti keputusan Gate A dan serialization test Task 02.
Done: essential fields terlihat tanpa scroll berlebihan pada keyboard tertutup; CTA keyboard-aware, bukan menutupi field.
Suggested commit: `feat(entry): build compact transaction fields`.

### Task 09 — Editable unified review
Files Create: TransactionReview.tsx; `apps/mobile/__tests__/transaction-review-editable.test.tsx`.
- [ ] Same shared fields untuk suara/teks/scan; field edit tidak melakukan persistence.
- [ ] Show field warning + acknowledge/correction; expandable source, bukan transkrip besar selalu tampil.
- [ ] Batch menampilkan count/total dan setiap draft dapat diedit; Save all diblokir jika satu invalid.
- [ ] Manual tidak dirutekan kembali ke review setelah field lengkap.
Done: koreksi amount/category/wallet/date mempengaruhi save payload; metadata extraction tidak hilang.
Suggested commit: `feat(entry): unify editable AI review`.

### Task 10 — Capture orchestration dan entry minimal
Files Modify: app/(tabs)/capture.tsx; tests capture-gating/capture-envelope-suggestion; Create `__tests__/capture-entry-v2.test.tsx`.
- [ ] Extract header kecil + combined destination; voice utama hanya flag aktif, text safe default, manual/scan alternatif.
- [ ] Text button berubah dari Simpan transaksi menjadi Cek transaksi/Buat draft; analyze → review tanpa create.
- [ ] Suara/struk menggunakan adapters dan review bersama.
- [ ] Deep link ?mode=text/photo/voice tetap dihormati dengan flag/quota; viewer guards setiap handler.
- [ ] Quota secondary; manual tersedia tanpa entitlement AI.
- [ ] Existing envelope suggestion hanya setelah persistence; hindari double allocation.
Done: semua source masuk review; stale requests/cancel/permission rejection diuji.
Suggested commit: `feat(capture): adopt review-first entry flow`.

### Task 11 — Manual & edit compact, transfer tetap benar
Files Modify: app/(tabs)/transaction-new.tsx; __tests__/transaction-new-edit-mode.test.tsx; Create `__tests__/transaction-new-compact.test.tsx`.
- [ ] Reuse fields/pickers; nominal auto-focus hanya create, local Hari ini, details collapsed.
- [ ] Save manual valid satu kali, tidak ada halaman review kedua.
- [ ] Edit hydrate seluruh saved field, tidak overwrite note/description, cancel tidak update, deep-link transactionId tetap kompatibel.
- [ ] Transfer asal/tujuan berbeda; category hidden; stale async edit load tidak mengambil context salah.
Done: exact create/update payload contract dan transfer regressions pass.
Suggested commit: `feat(manual): simplify entry without breaking edit`.

### Task 12 — Save orchestration, invalid-wallet recovery, success
Files Create: feature save.ts/save.test.ts, TransactionSuccess.tsx; `__tests__/transaction-save-flow.test.tsx`.
Files Modify: capture.tsx, transaction-new.tsx.
- [ ] Freeze payload/context; synchronous ref lock; gunakan persistence Task 05.
- [ ] Delete RLS retry-with-null-wallet. Re-fetch scoped wallet lalu minta pilih ulang, draft tetap.
- [ ] Distinguish known failure vs unknown outcome; reconcile same requestId, jangan insert baru otomatis.
- [ ] Success berdasarkan rows server, exact destination/amount/count; refresh wallets dan transaction history.
- [ ] Catat lagi reset draft/error/receipt/realtime subscription/requestId; Lihat transaksi menemukan saved row atau batch.
- [ ] Budget sync failure menampilkan warning terpisah, tidak menganggap transaction insert gagal dan tidak menginsert ulang.
Done: error/timeout/rapid tap/midflight role change cases pass; tidak ada fabricated success.
Suggested commit: `fix(entry): make save recovery and confirmation reliable`.

### Task 13 — Receipt total/split reconciliation (Gate C)
Files Modify: receipt-intake.ts + receipt-intake.test.ts; adapters.ts/test; TransactionReview.tsx; Create `__tests__/receipt-entry-mode.test.tsx`.
- [ ] Default satu transaksi total, raw items pada ai_extracted.
- [ ] Opsi total/per item eksplisit; item count dan total di CTA review, tidak keduanya disimpan.
- [ ] Cases quantity, line-total/unit-price ambiguity, discount/tax discrepancy, no total, unreadable, mixed category, zero adjustment.
- [ ] Tidak menampilkan legacy largest-item adjustment sebagai data asli; selisih perlu koreksi/acknowledgement.
- [ ] Split hanya submit kalau reconciled, valid, Task 05 gate pass; batch rollback/timeout safe.
Done: sum saved = confirmed total, saldo berubah sekali per jumlah total, history/report count sesuai mode. Legacy helper callers tidak berubah diam-diam.
Suggested commit: `feat(receipts): make total and split recording explicit`.

### Task 14 — Controlled flag wiring dan rollback path
Files Modify: src/config/features.ts, scripts/rollout-flags.cjs, scripts/deploy-pwa.mjs, rollout-flags.json, __tests__/rollout-flags.test.ts; add feature tests as needed.
- [ ] Proposed independent `transactionEntryV2` / `EXPO_PUBLIC_FEATURE_TRANSACTION_ENTRY_V2`, default false sebelum QA; jangan tie permanent ke simpleNavigation.
- [ ] Wire override/type/env/runtime HTML/deployment flag strip list/committed config secara end-to-end. deploy script memiliki beberapa daftar eksplisit; bukan cukup edit features.ts saja.
- [ ] Test ON/OFF, legacy routes, true/false flag parsing, quality gate sanitized env.
- [ ] Safety fix no-null fallback dan submit lock dipertahankan di legacy path setelah disepakati; rollback UI tidak boleh mengembalikan silent-wallet bug.
Done: local export disertai runtime config benar; flag off rollback UI terbukti, additive DB tetap backward-compatible.
Suggested commit: `feat(rollout): gate transaction entry v2 safely`.

### Task 15 — Automated regression dan security review
- [ ] Run semua focused tests baru + existing, full Jest, type-check, git diff --check.
- [ ] Review data leakage: logs/source snapshots tidak berisi audio URL signed tokens/receipt PII/context secrets.
- [ ] Review existing markers/registry; jika UI copy mengubah markers, update requirement dengan semantic coverage, jangan menghapus marker supaya lolos.
- [ ] Review Gate B integration results termasuk concurrent requestId, rollback, RLS role/wallet scope.
Done: tidak ada new regressions atau untested safety gate.

### Task 16 — Browser/device UX acceptance
Files Create proposed: `apps/mobile/tests/golive/transaction-entry-v2.spec.ts` setelah baca playwright.golive.config.ts untuk memastikan testDir/path sebenarnya; jika config tidak mencakup path ini, taruh pada configured testDir, catat actual path.
- [ ] Authenticated smoke dengan test user + cleanup; test data isolated, tanpa memodifikasi user asli.
- [ ] Chrome mobile 360/390/430 + Safari/iOS nyata bila tersedia. Jika Safari/native tidak tersedia, laporkan unverified dan jangan menyebut parity selesai; user harus menerima pengurangan matrix sebelum release.
- [ ] Keyboard terbuka, long category/wallet names, zoom/text scale, bottom safe area, sheet dismissal/focus restoration, scroll to error.
- [ ] Touch probe nyata: >=44px, center ownership, tidak overlap; seluruh halaman dan sheets, bukan viewport awal saja.
- [ ] Screenshot before/after dan review desain berdasar bukti, brand Kaswise tetap.
Done: semua acceptance Section 6 punya bukti test/QA, bukan screenshot mockup saja.

### Task 17 — Canary, production verification, rollback and final handoff
- [ ] Approval release; backup deployment artifact dan catat flag/DB migration versions.
- [ ] Deploy canary/staging V2 ON dan OFF; quality gate + bundle/registry verification.
- [ ] Production deploy hanya setelah user meminta; bila branch guard menolak, minta keputusan merge/release branch atau explicit exception.
- [ ] Read back exact live URL + served runtime flags/bundle, authenticated review-edit-save-readback, saldo/row count, viewer, no-wallet, entitlement, success navigation.
- [ ] Rollback UI flag + last good artifact tested; jangan drop additive operation records/migration saat ada saved data. Tidak menjalankan rollback destructive otomatis.
- [ ] Release summary checklist: actual changed files, test counts returned, DB evidence, live evidence, remaining accepted limitations, next model pointer.
Done: produksi baru boleh disebut done setelah external state dibaca balik.

## 6. Acceptance matrix (setiap baris wajib dicentang saat eksekusi)

| ID | Kriteria | Bukti minimum |
|---|---|---|
| A01 | Voice flag ON voice utama; OFF text utama; mode deep link aman | gating + browser |
| A02 | Destination context/wallet tampak, default tidak lintas context | validator + browser |
| A03 | AI analysis tidak insert sebelum confirm | mocked create call count=0 sebelum save |
| A04 | Semua field review editable dan tersimpan hasil edit | component payload + DB readback |
| A05 | Manual valid tanpa review kedua; keyboard CTA aman | component + mobile browser |
| A06 | Edit mempertahankan field existing dan cancel tanpa update | edit regression |
| A07 | Transfer debit/credit benar, bukan expense report/budget | integration DB + report smoke |
| A08 | Missing/foreign/inactive wallet tidak save/null fallback | error test + DB row count |
| A09 | Viewer blocked semua entry/handler/deep link dan DB write | component + RLS integration |
| A10 | Quota/mic denied tidak menutup manual bagi writable role | component + browser |
| A11 | Same-tick rapid submit hanya satu operation | deferred promise test |
| A12 | Timeout after commit retry tidak duplikasi | DB integration same IDs + saldo |
| A13 | Known failure menjaga semua draft dan corrected values | failure/retry tests |
| A14 | Context switch/late response tidak menulis context salah | reducer + deferred async tests |
| A15 | Receipt total default satu; split count/total eksplisit | fixtures + DB readback |
| A16 | Split invalid/partial error rollback seluruh batch | atomic DB integration |
| A17 | Receipt discrepancy tidak hidden-adjust item | adapter + UI warning test |
| A18 | Description/merchant/note sesuai kontrak persistence | serialization + readback |
| A19 | Success exact server rows, destination, amount/count | browser + row readback |
| A20 | Catat lagi reset; Lihat transaksi menemukan hasil/batch | browser navigation |
| A21 | ID/EN lengkap, 44px targets, focus/modal/keyboard/safe area | visual + accessibility checks |
| A22 | V2 ON/OFF build/runtime dan rollback aman | flags tests + canary |
| A23 | No new regressions, markers/registry PASS | commands output |
| A24 | Production exact target verified, no credentials/PII leaked | live readback + review |

## 7. Exact validation commands / expected gates

Dari `apps/mobile` (jangan run pada turn planning):
```bash
corepack pnpm type-check
corepack pnpm test -- --runTestsByPath src/features/transaction-entry/draft.test.ts src/features/transaction-entry/state.test.ts src/features/transaction-entry/adapters.test.ts src/features/transaction-entry/save.test.ts --runInBand
corepack pnpm test -- --runTestsByPath __tests__/capture-gating.test.tsx __tests__/capture-envelope-suggestion.test.tsx __tests__/transaction-new-edit-mode.test.tsx __tests__/voice-intake.test.ts src/services/transactions.test.ts src/services/receipt-intake.test.ts src/services/transaction-review.test.ts --runInBand
corepack pnpm test -- --runInBand
corepack pnpm quality:live
```
Jalankan juga seluruh new component/integration tests pada exact actual paths; task 15 tidak boleh hanya menjalankan daftar existing di atas. Expected: exit 0, tidak ada test V2 dibypass/skipped untuk lolos; catat actual passed/failed/skipped counts.

Dari root:
```bash
git diff --check
git status --short
```
SQL integration: resolve actual local/staging harness saat Task 02; tidak ada command production/schema palsu di plan ini. Gate B requires execute migration + assertion script and save full output. Bila Supabase CLI/local Docker tersedia dan izin diberikan, pakai workflow repo; jangan auto-install/apply production schema.

Playwright: `corepack pnpm test:golive` setelah membaca configured base URL/testDir/credentials mode. Jangan menarget produksi secara tak sengaja. Gunakan isolated authenticated test fixtures; credentials user tidak ditebak.

Release setelah authorization dari `apps/mobile`:
```bash
corepack pnpm deploy:pwa
corepack pnpm verify:live-url
```
Preserve verified KASWISE_PWA_TARGET; inspect deploy config sebelum command. Long jobs background + notify_on_complete, kemudian baca hasil. Jangan push paralel saat deploy/quality gate membaca dist. Tidak pipe test/build ke head/tail/cat; exit code harus milik command aslinya.

Local export caveat: expo export tidak menjamin env dynamic flags di-inline. Gunakan runtime HTML injection sesuai deploy pipeline ketika QA flags, bukan mengasumsikan env shell cukup. Add proposed new flag pada injection + stripping lists. Required markers harus dibaca dari registry saat eksekusi; historical 35/35 bukan angka hardcoded untuk semua build masa depan.

## 8. Dependency / parallel lanes

Urutan: 01 → 02 → (03,04,05); 03 → 06; 07 → 08 → (09,11); 04+05+06+09 → 10+12; 05+06+09 → 13; 10+11+12+13 → 14 → 15 → 16 → 17.

Bisa parallel:
- Lane A data contract/adapters/persistence (03/05/06).
- Lane B primitive fields/pickers/review (07/08/09).
- Lane C reducer/race tests (04).
Integrator tunggal mengedit capture.tsx/transaction-new.tsx setelah contracts stabil. Jangan dua worker menyunting capture.tsx bersamaan. Database/security reviewer harus terpisah dari pembuat RPC. Tiap lane deliver exact paths/test output, integrator baca ulang sebelum mengklaim done.

## 9. Risiko, tradeoffs dan stop conditions

- UI-only redesign tanpa atomic/idempotency tidak menyelesaikan unknown-write duplicate; jangan menyamakan loading button dengan jaminan saldo.
- Receipt total vs split mengubah granularitas kategori/report/budget: default perlu Gate A; tidak backfill data lama.
- note model/DB mismatch adalah dependency, bukan boleh ditutup dengan field UI yang kehilangan data.
- New shared components dapat menambah bundle/native risk; prefer no new library.
- Live flag OFF rollback tidak otomatis membatalkan DB migration; additive design wajib.
- Budget sync setelah insert bisa gagal sementara; jangan insert ulang untuk memperbaiki allocation.
- API/routing mobile punya PWA runtime behavior; test real deployed config.
- Jika login diperlukan dan tidak ada test fixture/authorized access, stop minta user, jangan guess.
- Tidak menulis data user asli, tidak menghapus category overrides, tidak mengubah saldo langsung.
- Bila acceptance tidak bisa dibuktikan, status BLOCKED/UNVERIFIED pada ID terkait; kembali menyelesaikan gap atau minta persetujuan explicit reduced scope. Jangan final dengan caveat parsial yang disamarkan sebagai complete.

## 10. Definition of done dan model continuation

Done hanya bila Task 01–17 dan A01–A24 verified (atau user secara eksplisit menyetujui scope release yang lebih sempit). Plan checklist semuanya belum dieksekusi. Model penerus wajib membedakan planning complete dari implementation complete.

Suggested skills: kaswise-mobile-finance-editorial, coding-debugging-workflow, tdd, design-an-interface, mobile-feature-rollout-workflows, subagent-driven-development, visual-qa-review. Load grill-me hanya untuk keputusan Gate A yang belum dijawab; jangan mengulang pertanyaan yang sudah terjawab di dokumen.

Prompt untuk model berikutnya:
> Baca plan Kaswise Transaction Flow V2 ini penuh. Pengguna baru meminta planning; jangan implementasi sebelum instruksi eksekusi. Setelah diizinkan, rebaseline repo, selesaikan Gate A/B, jalankan task terurut memakai TDD dan checklist per task. Pertahankan identitas Kaswise, Home wallet stack dan perubahan unrelated. Jangan commit/push/deploy/apply schema produksi tanpa scope izin. Laporkan bukti pengujian dan readback aktual, bukan hasil historical pada Section 1.

## 11. Temuan eksekusi (batasan yang wajib dipertahankan)

**Marker = testID, bukan nama flag.** `scripts/required-markers.json` diturunkan dari `scripts/live-feature-registry.json` dan berisi testID komponen. Empat marker berikut WAJIB tetap ada setelah integrasi, atau registry harus diperbarui dengan cakupan semantik setara (bukan dihapus agar lolos):

- `capture-receipt-preview` dan `capture-receipt-confirm` → review struk harus tetap memakai testID ini pada kartu draft dan CTA simpan.
- `transaction-date-wheel-picker` dan `transaction-date-confirm` → pemilih tanggal di `transaction-new.tsx` harus tetap memakai testID ini pada wheel dan tombol apply, walau wheel sekarang hidup di dalam sheet.

Menambah nama flag baru TIDAK mengubah marker (marker hanya testID), tetapi mengubah `ROLLOUT_FLAG_ENV_KEYS` membuat test `rollout-flags.test.ts` gagal dengan sengaja sampai `DOCUMENTED_ROLLOUT_FLAG_KEYS` diperbarui.

## 12. Log progres eksekusi

| Task | Status | Bukti |
|---|---|---|
| 01 Rebaseline + lock desain | Sebagian | branch `feat/kaswise-simple-mode`, HEAD `b3b52a9`, working tree bersih saat mulai. Gate A (persetujuan desain/receipt/note/no-wallet) BELUM diambil dari user. |
| 02 Audit service/schema | Selesai | Caller, nullable-wallet, trigger saldo, budget sync, note mapping, semantik review, dan idempotency import sudah dipetakan dari source. |
| 03 Draft + validator | Selesai | `src/features/transaction-entry/draft.ts` + `draft.test.ts` — 18/18 pass. |
| 04 Lifecycle reducer + submit lock | Selesai | `state.ts` + `state.test.ts` — 15/15 pass (termasuk stale-generation, unknown-outcome tanpa retry buta, lock single-flight). |
| 05 Persistence atomic/idempotent | Sebagian (Gate B BLOCKED) | `supabase/migrations/202610020001_transaction_entry_idempotency.sql`, `src/services/transaction-entry-persistence.ts`, test — 13/13 pass. Migrasi TIDAK diterapkan ke database mana pun; RPC `create_transaction_entry_v2` belum ada di DB, jadi flag produksi wajib tetap false sampai user mengizinkan apply. |
| 06 Adapters | Selesai | `src/features/transaction-entry/adapters.ts` + test — 24/24 pass. |
| 07–09 Komponen (sheet, fields, review, success) | Selesai | `src/components/transaction-entry/{EntrySheet,TransactionFields,TransactionReview,TransactionSuccess,TransactionDatePickerSheet}.tsx` + `copy.ts` + 4 test — 23/23 pass. |
| 10 Integrasi capture | Dikerjakan lane integrasi | Wajib mempertahankan marker Section 11. |
| 11 Integrasi manual/edit | Dikerjakan lane integrasi | Idem. |
| 12 Save orchestration + success | Dikerjakan di dalam Task 10 | Menunggu gate 05. |
| 13 Receipt total/split | Belum | Gate C bergantung Task 05 (split tidak boleh diaktifkan sebelum atomic/idempotent terbukti di DB). |
| 14 Flag wiring | Selesai | `features.ts` (+`transactionEntryV2`), `rollout-flags.cjs`, `deploy-pwa.mjs` (rolloutEnv + resolve + injeksi), `rollout-flags.json` (`false`), `rollout-flags.test.ts` — 26/26 pass. Bug `\\n` literal pada injeksi ditemukan dan diperbaiki; blok runtime diverifikasi punya newline nyata. |
| 15 Regression + security review | Belum | |
| 16 Browser/device acceptance | Belum | |
| 17 Canary + verifikasi produksi | Belum | |

Verifikasi independen (dijalankan sendiri, bukan self-report lane): 10 suite / **127/127 pass**; `npx tsc --noEmit -p tsconfig.json` → **exit 0**.

**Gate A (keputusan desain) TIDAK dijawab user (timeout).** Default plan dipakai sementara dan wajib dikonfirmasi ulang sebelum perilaku ini dibekukan: struk = satu transaksi total dengan split sebagai opsi eksplisit; catatan digabung ke description (tanpa kolom DB baru); transaksi tanpa dompet diblokir dan user diminta memilih dompet.

Catatan: angka di atas berasal dari hasil test aktual pada turn ini, bukan carry-over.

## 13. Update akhir turn (eksekusi integrasi + validasi migrasi)

**Keputusan user:** Gate B = **1A** (apply ke staging/local dulu, buktikan idempotency + rollback, baru nyalakan). Gate A = **disetujui** (default plan dikunci: struk satu total + split opsional; catatan digabung ke description; tanpa dompet diblokir).

| Task | Status akhir | Bukti |
|---|---|---|
| 10 Integrasi capture | Selesai (flag-gated) | Lane timeout meninggalkan 3 error tsc (`entryWalletId` tak dideklarasikan) dan CTA save terkunci karena draft masuk review tanpa dompet. Diperbaiki: (a) `entryWalletId` → `resolveEntryWalletId()`; (b) ditambah efek attach dompet default context saat review aktif; (c) test lane diperbaiki arity `jest.fn<any, any[]>`; (d) 2 `console.log` debug dibuang. `__tests__/capture-entry-v2.test.tsx` — **6/6 pass** (termasuk double-submit single-flight dan reconcile tanpa retry buta). Marker `capture-receipt-preview`/`capture-receipt-confirm` dipertahankan. |
| 11 Integrasi manual/edit | Selesai (flag-gated) | Lane melaporkan `transaction-new-compact.test.tsx` + `transaction-new-edit-mode.test.tsx` — 20/20 pass; marker date wheel/confirm dipertahankan. |
| 12 Save orchestration + success | Selesai | `saveReviewedDrafts` (requestId per attempt + `draftFingerprint`), lock single-flight, jalur `permission` → refetch dompet + minta pilih ulang (fallback `wallet_id: null` DIHAPUS), jalur `network`/`unknown` → `reconcileEntry`, bukan retry buta. |
| 05 Gate B | **Belum lulus — blocked environment** | Migrasi belum dieksekusi di DB mana pun. Tidak ada Supabase CLI (`npx supabase` = paket belum terpasang) dan tidak ada container Supabase lokal; hanya tersedia harness statis. Validasi yang benar-benar dijalankan: `supabase/tests/test_transaction_entry_idempotency_migration.py` (13 test) — **31/31 pass** bersama 18 test statis lama tanpa regresi. Dependensi diverifikasi ada di migration set: `public.households`, `public.can_write_household`, enum `public.transaction_type` (+`transfer`), kolom `target_wallet_id`/`created_by`/`updated_by`/`household_id`/`input_text`-family. Catatan penting: `202605060001_kaswise_base_schema.sql` mendefinisikan `transactions.type` sebagai TEXT+CHECK, tetapi `create table if not exists` kemungkinan no-op karena tabel sudah dibuat di `001_initial_schema.sql`/`003_fix_schema.sql` (yang memakai enum `transaction_type`). Perbedaan TEXT vs ENUM ini **harus dikonfirmasi saat apply nyata**. |

**Verifikasi akhir turn ini (dijalankan sendiri):**
- `npx tsc --noEmit -p tsconfig.json` → **exit 0**
- `npx jest --runInBand` → **82/82 suite, 710 passed, 8 skipped, 0 failed** (exit 0)
- `python3 -m unittest discover supabase/tests` → **31/31 pass**

**Yang masih belum:** Gate B apply nyata, Task 13 (receipt split, bergantung Gate B), Task 15–17 (regression penuh lint/bundle, QA browser, canary/verifikasi produksi). Flag `transactionEntryV2` tetap `false` di `rollout-flags.json`, jadi produksi TIDAK berubah. Tidak ada commit/push/deploy.

## 14. Gate B — hasil runtime pada Postgres nyata (opsi 1, disetujui user)

Harness disposable (bukan produksi): `postgres:15` container `kaswise-v2-pg` di `127.0.0.1:55432`, plus stub Supabase.

Artefak baru (dapat dipakai ulang):
- `supabase/tests/live/00_supabase_stubs.sql` — stub `auth.users`/`auth.uid()`/`auth.role()`, role `anon|authenticated|service_role|supabase_admin`, publication `supabase_realtime`, schema `storage` + `foldername()`.
- `supabase/tests/live/10_apply_migrations.sh` — apply SEMUA migrasi berurutan (dipakai untuk diagnosis lineage).
- `supabase/tests/live/20_assert_transaction_entry_v2.sql` — 5 assertion runtime.
- `supabase/tests/live/30_run_gate_b.sh` — runner: stub → lineage date-prefixed → enum → transfer → migrasi idempotency → assertion.

**Hasil assertion (semua PASS):**
1. First call: batch 2 draft masuk, saldo dompet terdebit **sekali** (1.000.000 → 952.500).
2. Replay `request_id` + fingerprint sama: **id identik, 0 baris baru, saldo tidak berubah** → idempotency terbukti.
3. Replay `request_id` sama + fingerprint beda: ditolak `ENTRY_REQUEST_CONFLICT` → conflict detection terbukti.
4. Batch dengan draft kedua invalid: **rollback utuh** — 0 baris tersisa, 0 baris operation, saldo tidak berubah → atomicity terbukti.
5. Tanpa auth: ditolak `ENTRY_AUTH_REQUIRED` → identitas server-side terbukti.

**Temuan penting #1 — riwayat migrasi TIDAK replayable dari nol.** Lineage numeric (`001`/`003`/`005`) dan lineage date-prefixed saling konflik bila dijalankan keduanya pada DB kosong: `202605060001_kaswise_base_schema.sql` gagal (`trigger "set_profiles_updated_at" already exists`) dan `202605210001` gagal (`column "tanggal" does not exist`), sehingga `transactions` berakhir TANPA `nominal/kategori/tanggal/catatan`. Karena itu Gate B memakai lineage date-prefixed + enum `transaction_type` yang diwarisi produksi dari lineage numeric. **Ini rekonstruksi berbentuk produksi, bukan dump DB asli** — validasi definitif tetap butuh dump staging.

**Temuan penting #2 — risiko TEXT vs ENUM ternyata tidak berbahaya.** Di skema rekonstruksi `transactions.type` adalah `text` (udt_name=`text`), dan RPC dengan cast `::public.transaction_type` tetap berhasil insert dan lulus semua assertion. Artinya cast itu aman baik kolomnya `text` maupun enum. Catatan: satu hasil test ini TIDAK membuktikan jalur enum; jalur tersebut hanya terbukti secara statis.

**Belum tersentuh:** Task 13 split struk tetap terblokir sampai apply ke DB nyata. Container `kaswise-v2-pg` masih hidup — hapus dengan `docker rm -f kaswise-v2-pg`.

## 15. RLS runtime — hasil (celah ditutup)

Runner: `supabase/tests/live/50_run_rls_check.sh`, assertion `supabase/tests/live/40_assert_rls.sql`. Grants ala Supabase (yang tidak dibuat oleh migrasi mana pun) ada di `05_supabase_default_grants.sql`: `usage`+`all` pada schema `public`/`auth`/`storage` untuk `anon|authenticated|service_role`, lalu lockdown RPC (`revoke ... from public, anon`) diterapkan ulang.

Assertion berjalan sebagai role `authenticated` sungguhan dengan JWT claims (bukan superuser), sehingga **policy RLS adalah satu-satunya gate**:

| # | Skenario | Hasil |
|---|---|---|
| R1 | User authenticated simpan batch personal pribadi di bawah RLS | PASS — 2 baris, saldo terdebit sekali |
| R2 | Replay di bawah RLS | PASS — id sama, saldo tidak berubah |
| R3 | Baca baris operation milik user lain | PASS — tidak terlihat (isolasi antar-user) |
| R4 | Tulis ke household yang bukan miliknya | PASS — `ENTRY_PERMISSION_DENIED` |
| R5 | Household role viewer | PASS — `ENTRY_PERMISSION_DENIED` |
| R6 | Household role member | PASS — boleh menulis |
| R7 | Role `anon` | PASS — ditolak di level grant |

Catatan teknis yang ditemukan saat menyusun fixture (berguna untuk model berikutnya):
- `households.invite_code` NOT NULL dan wajib `= upper(btrim(...))` serta cocok `^[A-Z0-9]{6,12}$` (constraint `households_invite_code_normalized`).
- Trigger `create_owner_household_membership` otomatis membuat membership OWNER, jadi household yang dipakai menguji role `member` harus dimiliki user lain.
- `auth.uid()` butuh USAGE pada schema `auth`, bukan hanya grant di tabel `auth.users`.
- Role switching di dalam blok `DO` memakai `perform set_config('role', ..., true)`, bukan `SET LOCAL ROLE`.

## 16. Skema PRODUKSI asli — diverifikasi langsung (read-only)

Dijalankan otomatis lewat Supabase Management API memakai token yang sudah ada di host (`~/.supabase/access-token`, 44 byte). **Tanpa password, tanpa copy-paste user, tanpa modifikasi apa pun.** Project produksi: `xqvtsgfakuehjwdmenuw` (nama di dashboard: "Bismillah Cuan"), region `ap-southeast-1`. Skrip: `/tmp/live_schema_digest.py`, `/tmp/live_tx_cols.py`. Bukti tersimpan di `supabase/tests/live/live-schema-export/*.json` (columns 254 baris, constraints 106, policies 57, triggers 23, enums 22, migrations 32).

**Temuan 1 — SEMUA 19 kolom yang ditulis migrasi idempotency ADA di produksi.** `user_id, wallet_id, target_wallet_id, type, nominal, kategori, catatan, merchant, tanggal, receipt_url, household_id, created_by, updated_by, input_type, status, raw_input, review_required, is_verified, confidence` → semuanya PRESENT. Daftar kolom INSERT di RPC valid.

**Temuan 2 — `transactions.type` ADALAH ENUM `transaction_type`** (bukan text), dengan label `income, expense, transfer`. Jadi cast `::public.transaction_type` di RPC itu **benar dan memang diperlukan**. Kekhawatiran TEXT-vs-ENUM dari Section 14 **selesai**: enumerasi final = ENUM. Catatan: produksi juga punya kolom legacy `transaction_type` bertipe text, sehingga tabel memuat DUA keluarga penamaan (`amount/category/description/date` + `nominal/kategori/catatan/tanggal`); RPC menulis ke keluarga legacy + `type` enum, yang memang jalur kanonik penulisan mobile.

**Temuan 3 — RPC dan tabel operation belum ada** (`rpc_exists=false`, `ops_table_exists=false`), jadi migrasi ini murni penambahan tanpa konflik.

**Temuan 4 — koreksi klaim Section 14.** Repo ternyata punya SEMUA file migrasi (33 file = 32 yang tercatat di produksi + migrasi baru). History produksi: `001..008` (termasuk `002_missing_tables`, `004_repair_auth_cloud`, `006_prd_phase1_alignment`, `007_categories_schema_backfill`, `008_fix_group_members_rls_recursion`) lalu seluruh `2026*`. Klaim "tidak replayable" tetap benar secara empiris, tapi penyebabnya lebih tepat: **file migrasi di repo sudah bergeser dari kondisi saat diterapkan** (mis. `202605060001_kaswise_base_schema.sql` mencoba `create trigger set_profiles_updated_at` padahal trigger itu sudah dibuat migrasi lebih awal), sehingga replay bersih memang tidak mereproduksi produksi. Karena itu **baseline definitif adalah export skema live ini, bukan replay migrasi.**

**Langkah penutup — SELESAI.** Replika dibangun dan diverifikasi terhadap export live:
- Runner: `supabase/tests/live/60_run_full_gate_b.sh` (stubs → lineage date-prefixed → enum → transfer → migrasi idempotency → `06_production_shape.sql` → grants → kedua suite assertion).
- `06_production_shape.sql` menyelaraskan replika ke bentuk produksi: `transactions.type` dikonversi dari text → **enum `public.transaction_type`** (hasil: `transactions.type is now: USER-DEFINED / transaction_type`), dan constraint `transactions_type_check` DIBUANG karena **produksi tidak memilikinya** (produksi hanya punya `transactions_transaction_type_check` pada kolom text `transaction_type`). Constraint itu artefak drift repo, bukan bagian produksi.

**Hasil akhir 12/12 PASS dengan `type` berupa enum produksi:**
- Suite A (atomicity/idempotency/rollback): batch 2 baris + saldo terdebit sekali; replay → id sama & 0 baris baru & saldo tetap; fingerprint bentrok → `ENTRY_REQUEST_CONFLICT`; draft kedua invalid → rollback utuh (0 baris, 0 operation row, saldo utuh); tanpa auth → `ENTRY_AUTH_REQUIRED`.
- Suite B (RLS sebagai `authenticated`): simpan personal lolos RLS; replay idempotent; baris operation user lain tak terlihat; household asing & viewer ditolak; member diizinkan; `anon` ditolak di level grant.

**Batas jujur yang tersisa:** replika ini **selaras-produksi pada objek yang disentuh migrasi**, bukan salinan byte-identik. Penyebabnya bukan kelalaian, melainkan temuan nyata: **file migrasi di repo sudah bergeser dari keadaan saat diterapkan** (dua bukti: `202605060001` gagal karena trigger `set_profiles_updated_at` sudah ada, dan `transactions_type_check` ada di replay tapi tidak ada di produksi). Untuk replika byte-identik diperlukan `pg_dump` asli, yang butuh kredensial DB — tidak diperlukan lagi karena semua kolom yang ditulis migrasi sudah diverifikasi ada di produksi.

**Sisa pekerjaan:** Task 15–17 (regresi bundle/registry, QA browser, canary & verifikasi produksi). Flag `transactionEntryV2` tetap `false`; produksi tidak berubah; tidak ada commit/push/deploy.

## 17. Task 13 (Gate C) — mode pencatatan struk eksplisit

Dikerjakan via lane; lane **timeout tanpa ringkasan**, jadi seluruh hasil diverifikasi ulang sendiri (bukan menerima self-report).

**Yang dibangun:**
- `reconcileReceipt(extraction)` + tipe `ReceiptReconciliation` (`src/services/receipt-intake.ts`) — melaporkan `total`, `itemsSubtotal`, `discrepancy`, `reconciled`, `hasItems` secara jujur.
- `receiptDraftsForMode(extraction, mode, walletId)` dan `draftsMatchConfirmedTotal(drafts, confirmedTotal)` (`src/features/transaction-entry/adapters.ts`).
- `capture.tsx`: state `receiptMode` default `"total"`; switch dua mode dengan copy id+en (`receiptModeLabel`/`receiptModeTotal`/`receiptModeItems`); gating simpan di baris ~1498-1502 dan ~1616-1625.

**Verifikasi sendiri atas kriteria inti:**
- Jalur `items` memakai `receiptItemLines(...)` — **baris struk asli** — dan TIDAK memakai `normalizeReceiptItems` yang menambal selisih ke item terbesar. Saat tidak rekonsiliasi, draft ditandai `unresolvedFields: ['amount']` sehingga harus diakui/dikoreksi, bukan disembunyikan (lihat `adapters.ts:347-354`).
- `draftsMatchConfirmedTotal` menolak batch yang jumlahnya tidak sama persis dengan total terkonfirmasi (`adapters.ts:362-374`).
- `normalizeReceiptItems` sengaja TIDAK diubah agar pemanggil lama tetap jalan; ia hanya tidak lagi disajikan sebagai data asli di jalur baru.
- Marker tetap ada di bundle: `capture-receipt-preview` (baris 1246 & 1842), `capture-receipt-confirm` (1258 & 1951), `capture-receipt-split` (1881).
- `splitUnavailable` sudah tidak dipakai lagi.

**Bukti yang dijalankan:** `tsc --noEmit` → **exit 0**; test fokus (`receipt-entry-mode`, `receipt-intake`, `capture-entry-v2`) → **3 suite / 26 test PASS**. Full suite: **83/83 suite, 723 passed, 8 skipped, 0 failed**; `git diff --check` bersih.

**Cacat ditemukan & diperbaiki (flake, bukan logika):** full suite pertama **GAGAL** — `capture-entry-v2.test.tsx` test (d) & (e) flaky (lulus ~1 dari 3). Diagnosa: setelah review muncul, **press pertama selalu dibuang** (terbukti 4/4 via probe: press-1 = 0 panggilan `saveEntry`, press-2 = 1). Instrumentasi sementara di `saveReviewedDrafts` membuktikan handler-nya **tidak pernah dipanggil** pada press pertama — jadi bukan gerbang izin/`canCreate`/lock, melainkan press yang di-drop satu frame sebelum state entry settle (dompet/kategori default). Perbaikan: kedua test mem-flush satu frame (`await act(async () => { await Promise.resolve(); })`) sebelum menekan; logika produksi **tidak diubah** (log debug sudah dibersihkan). Hasil: **6/6 lulus 5x berturut-turut** (sebelumnya flaky), lalu full suite hijau.

**Belum:** Task 15–17. Flag tetap `false`; produksi tidak berubah; tidak ada commit/push/deploy.

## 19. Eksekusi Task 15–17 (langsung, 2026-10-02)

### Task 15 — regresi otomatis & security review
- `verify:live-registry` → ✅ **Live feature registry valid (12 features, 35 required markers)**.
- `type-check` → ✅ exit 0 (juga diverifikasi ulang setelah perbaikan flake).
- Full Jest → ✅ **83/83 suite, 723 passed, 8 skipped, 0 failed**.
- `git diff --check` → ✅ bersih.
- Review kebocoran log/snapshot → ✅ nol `console.*` di `src/features/transaction-entry/` dan `src/components/transaction-entry/`. Dua `console.error` baru di `transaction-entry-persistence.ts` hanya mencetak objek error (tanpa draft, amount, PII, token, atau URL audio bertanda tangan) — sama polanya dengan `transactions.ts` yang sudah ada.
- Marker/registry → ✅ 35 marker tetap; `capture-receipt-preview` & `capture-receipt-confirm` masih required dan masih ada di source; `capture-receipt-split` ada di source (bukan marker gated).
- Tidak ada test di-bypass → ✅ satu-satunya `.skip` adalah pola kondisional lama di `settings-screen.test.tsx`.
- Gate B → sudah tercatat di Section 12–16 (12/12 assertion; RLS 7/7; dijalankan pada replika skema hasil export live).
- `quality:live` (export + `check:bundle`) → ✅ **QUALITY_EXIT=0**: registry valid → type-check → `test:live-regression` semua PASS → `export:pwa` (dist, 22 SPA route) → `check:bundle`: **All 35 required markers present in `entry-80860722b7a87f32cde0a10d624317a4.js`**.

### Task 16 — UX browser/device
- Harness nyata: `apps/mobile/playwright.golive.config.ts` → `testDir: ./tests/golive/specs`, baseURL dari `KASWISE_GOLIVE_BASE_URL` (default `https://kaswise.com`), spec lama: `00-public`, `10-auth`, `20-core-finance`. Chromium sudah terpasang (`~/.cache/ms-playwright/chromium-1228`).
- **Blocker kredensial:** `.env.golive` tidak ada di mesin ini, jadi smoke authenticated tidak bisa dijalankan (butuh `KASWISE_GOLIVE_EMAIL`, `KASWISE_GOLIVE_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`). Kredensial tidak ditebak.
- **Blocker kedua:** V2 belum ter-deploy di lingkungan mana pun (`transactionEntryV2=false`), sehingga belum ada target V2-ON untuk diuji browser.
- Keputusan user: **buat akun smoke khusus**, panduan klik-demi-klik diberikan; templat `apps/mobile/.env.golive` sudah dibuat (gitignored di root & app) berisi 3 baris yang perlu diisi.
- Urutan realistis setelah kredensial ada: QA browser di **build lokal V2-ON** (bukan produksi) → probe sentuh ≥44px/center/overlap + screenshot. Matrix Safari/iOS tetap **unverified** sampai ada perangkat; tidak boleh disebut parity selesai.

**Hasil QA lokal V2-ON — SUDAH DIJALANKAN (2026-10-02):** target `/tmp/kw-v2-local` (di luar repo, bukan produksi) dari `export:pwa` (exit 0) + injeksi runtime `EXPO_PUBLIC_FEATURE_TRANSACTION_ENTRY_V2="true"`; bundle `entry-80860722b7a87f32cde0a10d624317a4.js`; server `127.0.0.1:8099`. Playwright chromium, 3 viewport (360/390/430) × 8 rute = **24 run**.
- Flag runtime di aplikasi terbukti hidup: `v2=true`, `simpleNav=true`.
- `/capture/` tanpa sesi → **redirect ke `/login`** di ketiga viewport (gerbang auth bekerja).
- **0 center dicuri, 0 tumpang-tindih, 0 console error** pada seluruh 24 run.
- Temuan (pra-eksisting, di luar alur V2): tautan teks publik di bawah 44px tinggi — `Lupa password?` 111×20, `Daftar sekarang` 106×20, `Masuk` 44×20, `Kembali` 83×30, `Kembali ke login` 111×20, tautan footer 35px. Diukur pada kotak elemen; alur entry (di balik auth) belum terukur.
- Screenshot: 24 file di `/tmp/kw-qa-shots/`; review visual: identitas brand (navy–biru, kertas hangat, logo sendiri) terjaga, teks tidak terpotong.
- **Lanjutan (kredensial tersedia — akun smoke disposable dibuat via Supabase Auth API `kw-smoke-*@example.com`; `mailer_autoconfirm=true`, `disable_signup=false` dibaca dari `/auth/v1/settings` sehingga inbox user tidak diperlukan):**
  - Login akun uji di build lokal **berhasil**; `/capture/` hanya bisa diakses setelah login.
  - **Reproduksi keluhan user:** pendaftaran di build lokal **berhasil** (signup 200 + sesi langsung). Jadi "Registrasi gagal" di HP user bukan bug alur daftar — kemungkinan besar email itu sudah terdaftar (pesan errornya generik, tidak membedakan penyebab).
  - **CRUD dompet berhasil end-to-end** ke Supabase produksi (dompet uji tersimpan; total saldo Rp 250.000).
  - **Geometri layar alur V2** (capture 11 kontrol, review 9, wallets 14): **minSize 44px, 0 kontrol <44px, 0 center dicuri, 0 tumpang-tindih** di lebar 390px.
  - **BLOCKED — akar masalah terbukti:** alur review berbasis AI tidak dapat dijalankan oleh browser otomatis. `/api/v1/ai/chat` dilindungi Cloudflare bot-management: panggilan sisi-server → **403 error code 1010 tanpa header CORS**, sementara preflight endpoint itu sendiri mengizinkan origin `https://app.kaswise.com` (diverifikasi via OPTIONS). Jadi ini bukan bug kode dan bukan CORS salah konfigurasi.
  - Konsekuensi: item Task 16 yang bergantung pada klasifikasi AI (review editable, mode total vs split, keyboard terbuka, nama panjang, zoom, safe area, scroll ke error) **hanya bisa diverifikasi manusia di browser asli**, atau setelah V2 ON ter-deploy.
  - Artefak uji yang tercipta di project produksi (terisolasi, hanya akun uji): 3 user auth disposable `kw-smoke-*`/`kw-probe-*` + 1 dompet uji. Dapat dihapus lewat alur hapus akun di app (atau service key bila user mengizinkan).
- Belum: `tests/golive/specs/transaction-entry-v2.spec.ts` — sengaja dibuat setelah kredensial siap agar spec-nya benar-benar dijalankan, bukan artefak tak teruji.

### Task 17 — persiapan canary/produksi/rollback (TANPA deploy, sesuai keputusan user)
Inventaris yang wajib dicatat sebelum release:
- Branch: `feat/kaswise-simple-mode` @ `b3b52a9` — belum di-commit/di-push, tree masih kotor.
- Flag: `apps/mobile/rollout-flags.json` = `{"simpleNavigation": true, "transactionEntryV2": false}`.
- Migrasi: `supabase/migrations/202610020001_transaction_entry_idempotency.sql` — **belum pernah diterapkan ke produksi**; Gate B hanya divalidasi pada replika skema export live.
- Target deploy: `KASWISE_PWA_TARGET` (default `/home/Danu88/nginx-proxy-manager/placeholder`).
- Artifact live terakhir: bundle `entry-478e0648b64b447284374f7ebdfae1ce.js` (verifikasi simple-navigation sebelumnya). Tidak ada direktori backup artifact di repo — snapshot harus diambil dari target dir sebelum deploy.

**Temuan guard branch (akan menggagalkan deploy):** `deploy-pwa.mjs` menolak deploy dari branch selain `main` / `production` / `release/*`. Branch saat ini `feat/kaswise-simple-mode`, jadi deploy gagal by design kecuali merge ke release branch atau override `ALLOW_NON_PROD_BRANCH=1`. Keputusan diserahkan ke user.

**Rencana rollback (belum dijalankan, non-destruktif):**
1. UI: set `transactionEntryV2` → `false` (rollout-flags.json atau env) lalu deploy ulang; `false` = perilaku lama.
2. DB: migrasi bersifat additive (operation records + RPC + kolom baru). Jangan drop selama ada baris tersimpan; V1 tetap jalan karena kolom lama tidak diubah.
3. Artifact: snapshot target dir (`index.html`, `_expo`, `assets`) ke folder bertanggal sebelum deploy; rollback = restore snapshot.
4. Larangan tetap: tidak ada rollback destruktif otomatis.

## 20. Runbook canary V2 — SIAP, BELUM DIEKSEKUSI

**Fakta yang membentuk rencana ini**
1. **Flag `transactionEntryV2` bersifat GLOBAL.** Tidak ada gating per-user/allowlist di `src/config/features.ts` — nilainya dibaca dari `process.env` saat runtime. Konsekuensi: begitu `true`, setiap pengguna yang memuat app masuk V2. Tidak ada canary "sebagian user" bawaan; canary sejati butuh host/route terpisah.
2. **Pola rollback sudah ada di proyek ini.** `~/services/nginx-proxy-manager/rollback-<timestamp>-canary-state/` berisi `index.html.prev`, `entry-bundle.txt`, `flag-state.txt`. Snapshot terakhir: `rollback-20261001-canary-state/` (bundle `entry-dced743f07d297f002e3457af0ed6c3a.js`, `SIMPLE_NAVIGATION="true"`) dan `rollback-20261002-020706/index.html`. Karena flag disuntik sebagai string ke 23 `index.html` (root + 22 rute SPA), **rollback = restore `index.html.prev`, tanpa build ulang** (hitungan detik).
3. **Guard branch.** `deploy-pwa.mjs` menolak deploy dari branch selain `main` / `production` / `release/*`. Branch sekarang `feat/kaswise-simple-mode` → wajib keputusan (merge ke `release/*` atau override `ALLOW_NON_PROD_BRANCH=1`).
4. **Migrasi wajib lebih dulu.** `supabase/migrations/202610020001_transaction_entry_idempotency.sql` belum ada di produksi, sedangkan alur simpan V2 memakai RPC `create_transaction_entry_v2`. Tanpa migrasi, simpan akan gagal. Urutan: **migrasi → bundle → flag ON**.
5. **Jangan `supabase db push`.** Repo sudah drift (replay migrasi dari nol ≠ skema produksi). Terapkan **hanya file migrasi itu** lewat SQL Editor dashboard atau Management API (dengan izin eksplisit).

**Urutan yang diusulkan (belum dijalankan)**

| Fase | Aksi | Verifikasi |
|---|---|---|
| 1 | Snapshot: `cp placeholder/index.html rollback-<ts>-canary-state/index.html.prev` + catat flag & nama bundle | file snapshot ada |
| 2 | Terapkan migrasi (additive) ke produksi | RPC + tabel operasi ada; kolom lama tidak berubah |
| 3 | `pnpm quality:live` | exit 0, 35 marker, export + check:bundle lolos |
| 4 | Deploy bundle baru dengan flag **OFF** | `verify:live-url`, marker di target, readback flag runtime — perilaku user tidak berubah |
| 5 | Flip ON: inject `EXPO_PUBLIC_FEATURE_TRANSACTION_ENTRY_V2="true"` ke 23 index.html di target | flag terbaca `true` di URL live |
| 6 | Uji akun uji di **browser asli** (HP): catat transaksi, mode total vs split, viewer diblokir, tanpa dompet diblokir | baris & saldo di DB sesuai; layar sukses; hapus data uji |
| 7 | Rollback bila perlu: restore `index.html.prev` | flag kembali seperti semula, **tanpa** drop migrasi (additive) |

**Risiko bila memilih ON tanpa host terpisah:** V2 langsung ke semua pengguna. Alternatif aman: tambah host/path preview di nginx-proxy-manager khusus akun uji (1 langkah konfigurasi).

**Keputusan yang dibutuhkan sebelum eksekusi:** (1) mode canary, (2) izin + metode migrasi, (3) strategi branch.

## 21. Ringkasan rilis V2 (DIEKSEKUSI 2026-10-02, izin user)

**Keputusan user:** canary = langsung produksi (deploy OFF dulu → ON); migrasi = saya jalankan via Management API; branch = buat `release/`.

| Fase | Status | Bukti |
|---|---|---|
| 1 Snapshot rollback | ✅ | `rollback-20261002-200746-canary-state/` (sebelum deploy) + `rollback-20261002-201647-canary-state/` (keadaan OFF setelah deploy) |
| 2 Migrasi produksi | ✅ | sebelum: tabel `None`, RPC `[]`, `transactions` 39 kolom → sesudah: tabel `transaction_entry_operations`, RPC `create_transaction_entry_v2(p_request_id uuid, p_fingerprint text, p_context_type text, p_household_id uuid, p_drafts jsonb)`, 4 policy RLS, kolom tetap **39** (murni additive) |
| 3 Gate mutu | ✅ | `quality:live` exit 0 (registry 12 fitur/35 marker, type-check, regresi, export, check:bundle) |
| 4 Deploy flag OFF | ✅ | commit `f51b0d5` di `release/v2-transaction-entry`; bundle `entry-80860722b7a87f32cde0a10d624317a4.js`; 35 marker di target & live; `DEPLOY_EXIT=0` |
| 5 Flag ON | ✅ | 23 `index.html` diubah; readback `https://app.kaswise.com` → `EXPO_PUBLIC_FEATURE_TRANSACTION_ENTRY_V2 = "true"` |
| 6 Verifikasi live | ✅ | login akun uji; flag runtime `true`; layar V2 tampil; geometri capture 12 & manual 9 kontrol → min 44px, 0 kecil/0 dicuri; guard benar (tombol `aria-disabled=true`, pesan spesifik per field); **simpan berhasil → 1 baris "Tagihan • 2 Okt 2026 - Rp 12.000", saldo 250.000 → 238.000 (terdebit tepat sekali)** |
| 7 Rollback | tersedia | `node /tmp/kw-flip-flag.mjs off` (instan) atau `restore <snapshot>`; migrasi dibiarkan (additive) |

**Belum terverifikasi / sisa:**
- Alur berbasis AI (teks & struk → review editable, mode total vs split) **tidak** bisa diuji browser otomatis: Cloudflare menolak signature non-browser (`403 error code 1010`). Harus diuji manusia di HP.
- Safari/iOS: **unverified** (tanpa perangkat).
- 1 transaksi uji (Rp 12.000) masih ada di akun smoke — tombol hapus baris tidak punya testid sehingga tidak bisa diotomatiskan; terisolasi di akun uji disposable.
- Risiko yang diterima user: V2 aktif untuk **semua** pengguna; jalur yang sudah terbukti = input manual, jalur AI belum.

**Rollback tersedia kapan saja** (instan, tanpa build).

## 22. Insiden produksi ditemukan saat verifikasi AI (2026-10-02)

Saat user menguji alur AI di HP, app menampilkan **"Gagal memproses — Terjadi kesalahan sistem"**.

Rantai sebab (dibuktikan berurutan, bukan dugaan):
1. Log `kaswise-backend`: `GET /api/v1/me/entitlements` 200, `OPTIONS /api/v1/ai/chat` 200, tetapi **`POST /api/v1/ai/chat` → 502 Bad Gateway** (dua kali, dari percobaan user).
2. `backend/app/api/v1/ai.py`: handler menangkap `RuntimeError` dari `extract_transaction_from_text()` lalu mengembalikan **502 "Layanan AI sedang tidak tersedia"**.
3. Env container: `ANTHROPIC_API_KEY` **terisi** (108 char), `OPENAI_API_KEY` kosong.
4. Uji langsung dari dalam container ke `api.anthropic.com`:
   - `claude-haiku-4-5` → **HTTP 400 “Your credit balance is too low to access the Anthropic API.”**
   - `claude-3-5-haiku-latest` → pesan identik.

**Kesimpulan:** kredit akun Anthropic habis. Dampaknya **semua fitur AI gagal untuk semua pengguna** (capture teks, OCR struk, insight AI) — dan ini **tidak berhubungan dengan rilis V2**: V1 dan V2 memanggil endpoint yang sama. Tidak ada perubahan backend/deploy yang menyebabkannya (container backend up 2 hari tanpa restart; deploy hanya mengganti berkas statis PWA).

**Tindakan:** isi ulang kredit di console.anthropic.com → Plans & Billing (atau ganti kunci/provider). Setelah itu alur AI bisa diuji dan Task 16 dapat ditutup.

**Keputusan rilis:** dibiarkan V2 ON karena (a) jalur manual sudah terbukti di produksi, (b) mematikan V2 tidak memulihkan AI sama sekali. Rollback tetap tersedia instan bila user memilih lebih hati-hati.

**Catatan pengamatan (belum dikonfirmasi):** pada tangkapan layar user, blok "TUJUAN TRANSAKSI / Simpan ke …" tidak terlihat, padahal pada verifikasi saya tampil. Perlu dicek ulang setelah AI pulih.

## 23. Tindak lanjut pasca-auto-save (2026-10-03)

Tiga pekerjaan yang tersisa setelah auto-save live, semuanya selesai/diuji:

### (a) Folder deploy pindah dari `/tmp` — SELESAI
`git worktree move /tmp/kaswise-finance-editorial-deploy → ~/services/kaswise-finance-editorial-deploy`
(nama folder dipertahankan supaya nama project compose tidak berubah). Bukti aman: `docker compose ps`
di folder baru mengenali container `kaswise-backend` yang sama (Up, healthy), `app.kaswise.com` 200,
tidak ada container dibuat ulang. Isi working tree yang tadinya hanya hidup di sana (compose hardening
+ kode backend live) kini ter-commit di branch `prod/kaswise-backend-live`, dan `.env.production-runtime`
diblokir dari git. Cara rebuild + wajib-restart-proxy terdokumentasi di `README-DEPLOY.md`.

### (b) Penjaga test jalur struk — SELESAI
Harness struk ternyata sudah ada (`receipt-entry-mode.test.tsx`, 4 test) — yang hilang hanya flag-nya.
Flag `aiAutosaveText` dinyalakan di berkas itu + test baru: struk "jelas & satu transaksi" tetap berhenti
di konfirmasi, tidak ada bar auto-save, tidak ada baris alasan terbawa dari jalur teks, `saveEntry` baru
terpanggil setelah konfirmasi. Hasil: 9/9 hijau; suite penuh **88/88, 768 lulus, 0 gagal**; `tsc` bersih.
Catatan: menambahkan `act()` di antara mount layar dan query berikutnya membuat test menggantung —
pakai pola `waitFor` yang sudah ada.

### (c) Scan struk/foto hidup kembali (Gemini) — SELESAI
Claude masih jadi jalur struk padahal kreditnya habis → fitur mati. Sekarang: **Gemini (utama) → Claude (cadangan)**,
karena DeepSeek tidak menerima gambar. Kunci Gemini (gratis, Google AI Studio) disimpan lewat
`bash ~/simpan-kunci-gemini.sh` (input tersembunyi, tidak pernah masuk chat), diteruskan compose.

- **Pelajaran model:** percobaan pertama gagal `HTTP 404 — "gemini-2.5-flash is no longer available to
  new users"` padahal kuncinya valid (terbukti: `GET /v1beta/openai/models` → 200, daftar model tampil).
  Default kini `gemini-3.8-flash` + `GEMINI_FALLBACK_MODEL=gemini-flash-latest`, dan kode otomatis
  mencoba model berikutnya saat model utama ditolak sebagai tidak tersedia.
- **Verifikasi:** 16 test backend hijau (payload gambar sebagai data-URI, fallback provider, peralihan
  model, JSON rusak, code fence); uji HTTP sungguhan ke mock → `path=/v1beta/openai/chat/completions`;
  lalu uji gambar sungguhan di dalam image produksi (`tools/uji-struk.sh`, struk sintetis total Rp 88.000)
  → `provider gemini · gemini-3.8-flash · total 88000 · 4 item · confidence 0.98 · HASIL: LOLOS`.
- **Rilis:** image backend dibangun ulang + container diganti + `nginx-proxy-manager` direstart;
  `app.kaswise.com` 200, container healthy, jalur teks DeepSeek masih benar (`beli kopi 35rb` → 35000).
  Kedua endpoint AI membalas `401 Token tidak ditemukan` dari luar (Cloudflare → nginx → container baru),
  jadi routing benar dan tidak ada lagi trafik nyangkut ke container lama.
- **Sisa:** uji scan struk asli dari HP oleh user (struk/foto tetap wajib konfirmasi sebelum tersimpan).
