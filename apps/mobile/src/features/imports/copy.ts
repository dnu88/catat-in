import type { Language } from '../../i18n/i18n-context';

const copy = {
  id: {
    title: 'Impor rekening koran', disabled: 'Impor belum tersedia. Anda tetap bisa mencatat transaksi dengan teks atau foto struk.', back: 'Kembali ke Catat',
    intro: 'Unggah CSV, XLSX, atau PDF dari bank atau dompet digital. Periksa pratinjau sebelum menyimpan transaksi.',
    wallet: '1. Pilih dompet tujuan', noWallet: 'Belum ada dompet aktif. Buat dompet terlebih dahulu sebelum mengimpor.', bank: '2. Pilih bank atau dompet digital', upload: '3. Unggah file', choose: 'Pilih CSV/XLSX/PDF',
    fileHint: 'Maksimal 5MB. PDF hasil pemindaian mungkin memerlukan waktu lebih lama. Periksa hasil sebelum konfirmasi.', preview: 'Pratinjau impor', previewTitle: 'Pratinjau', confirm: 'Konfirmasi impor',
    totalRows: 'Total baris', newTransactions: 'Transaksi baru', duplicates: 'Duplikat', errors: 'Baris bermasalah', income: 'Pemasukan', expense: 'Pengeluaran', view: 'Lihat transaksi', complete: 'Impor selesai.',
    loadingWallets: 'Memuat dompet', processing: 'Memproses file', saving: 'Menyimpan transaksi',
    unsupported: 'Format belum didukung. Gunakan file CSV, XLSX, atau PDF.', tooLarge: 'File terlalu besar. Maksimal 5MB.', readOnly: 'Akses lihat saja tidak dapat mengimpor transaksi.', selectWallet: 'Pilih dompet tujuan sebelum mengimpor.', selectFile: 'Pilih file rekening koran terlebih dahulu.', noTransactions: 'Tidak ada transaksi baru untuk diimpor.',
    walletsError: 'Daftar dompet belum bisa dimuat. Coba lagi.', fileError: 'File belum bisa dipilih. Coba lagi.', previewError: 'File rekening koran belum bisa diproses. Coba lagi.', confirmError: 'Transaksi belum bisa diimpor. Coba lagi.', readError: 'File rekening koran tidak bisa dibaca.',
    sessionError: 'Sesi login tidak ditemukan. Silakan masuk kembali.', premiumError: 'Fitur ini hanya tersedia untuk pengguna Premium.', quotaError: 'Kuota bulan ini sudah habis. Coba lagi bulan depan atau pilih Premium.', fairUseError: 'Batas pemakaian wajar bulan ini sudah tercapai.', invalidDate: 'Format tanggal tidak valid', emptyDescription: 'Keterangan transaksi kosong', rowError: 'Data baris tidak dapat dibaca. Periksa file sumber.',
    skipped: (n: number) => `${n} baris di luar periode paket gratis dilewati.`, duplicateHint: (n: number) => `${n} duplikat akan dilewati otomatis.`, row: (n: number, reason: string) => `Baris ${n}: ${reason}`, result: (n: number, d: number) => `${n} transaksi diimpor, ${d} duplikat dilewati.`,
  },
  en: {
    title: 'Import bank statement', disabled: 'Imports are not available yet. You can still record transactions with text or receipt photos.', back: 'Back to Add transaction',
    intro: 'Upload CSV, XLSX, or PDF from your bank or digital wallet. Review the preview before saving transactions.',
    wallet: '1. Choose destination wallet', noWallet: 'No active wallets. Create a wallet before importing.', bank: '2. Choose bank or digital wallet', upload: '3. Upload file', choose: 'Choose CSV/XLSX/PDF',
    fileHint: 'Maximum 5MB. Scanned PDFs may take longer. Review the results before confirming.', preview: 'Preview import', previewTitle: 'Preview', confirm: 'Confirm import',
    totalRows: 'Total rows', newTransactions: 'New transactions', duplicates: 'Duplicates', errors: 'Rows with errors', income: 'Income', expense: 'Expense', view: 'View transactions', complete: 'Import complete.',
    loadingWallets: 'Loading wallets', processing: 'Processing file', saving: 'Saving transactions',
    unsupported: 'Unsupported format. Use a CSV, XLSX, or PDF file.', tooLarge: 'File is too large. Maximum 5MB.', readOnly: 'View-only access cannot import transactions.', selectWallet: 'Choose a destination wallet before importing.', selectFile: 'Choose a statement file first.', noTransactions: 'There are no new transactions to import.',
    walletsError: 'Wallets could not be loaded. Try again.', fileError: 'The file could not be selected. Try again.', previewError: 'The statement file could not be processed. Try again.', confirmError: 'Transactions could not be imported. Try again.', readError: 'The statement file could not be read.',
    sessionError: 'Your login session was not found. Sign in again.', premiumError: 'This feature is only available to Premium users.', quotaError: 'Your monthly quota is used up. Try next month or choose Premium.', fairUseError: 'The monthly fair-use limit has been reached.', invalidDate: 'Invalid date format', emptyDescription: 'Transaction description is empty', rowError: 'This row could not be read. Check the source file.',
    skipped: (n: number) => `${n} ${n === 1 ? 'row' : 'rows'} outside the free plan period ${n === 1 ? 'was' : 'were'} skipped.`, duplicateHint: (n: number) => `${n} ${n === 1 ? 'duplicate' : 'duplicates'} will be skipped automatically.`, row: (n: number, reason: string) => `Row ${n}: ${reason}`, result: (n: number, d: number) => `${n} ${n === 1 ? 'transaction' : 'transactions'} imported, ${d} ${d === 1 ? 'duplicate' : 'duplicates'} skipped.`,
  },
};

export function getImportsCopy(language: Language) { return copy[language]; }

/** Translate known service errors without showing untranslated backend internals. */
export function getImportError(language: Language, error: unknown, fallback: string) {
  const c = copy[language];
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/Sesi login|login session|sign in/i.test(message)) return c.sessionError;
  if (/Kuota|quota_exhausted/i.test(message)) return c.quotaError;
  if (/pemakaian wajar|fair_use/i.test(message)) return c.fairUseError;
  if (/hanya tersedia.*Premium|premium_only/i.test(message)) return c.premiumError;
  if (/tidak bisa dibaca/i.test(message)) return c.readError;
  return fallback;
}

export function getImportRowReason(language: Language, reason: string) {
  const c = copy[language];
  if (/Format tanggal tidak valid|invalid date/i.test(reason)) return c.invalidDate;
  if (/Keterangan transaksi kosong|description is empty/i.test(reason)) return c.emptyDescription;
  return c.rowError;
}
