import { getImportError, getImportRowReason, getImportsCopy } from './copy';

describe.each(['id', 'en'] as const)('import service messages in %s', (language) => {
  const c = getImportsCopy(language);
  it.each([
    ['Sesi login tidak ditemukan. Silakan login ulang.', 'sessionError'],
    ['Fitur ini hanya tersedia untuk pengguna Premium.', 'premiumError'],
    ['Kuota bulan ini sudah habis. Upgrade Premium untuk melanjutkan.', 'quotaError'],
    ['Batas pemakaian wajar bulan ini sudah tercapai.', 'fairUseError'],
    ['File rekening koran tidak bisa dibaca.', 'readError'],
  ] as const)('localizes %s', (message, key) => {
    expect(getImportError(language, new Error(message), c.previewError)).toBe(c[key]);
  });
  it('uses a localized fallback for unknown native/server messages', () => {
    expect(getImportError(language, new Error('HTTP database internals'), c.confirmError)).toBe(c.confirmError);
    expect(getImportError(language, undefined, c.fileError)).toBe(c.fileError);
  });
  it('localizes row reasons without modifying source data', () => {
    expect(getImportRowReason(language, 'Format tanggal tidak valid: 32/01')).toBe(c.invalidDate);
    expect(getImportRowReason(language, 'Keterangan transaksi kosong')).toBe(c.emptyDescription);
    expect(getImportRowReason(language, 'untranslated parser internals')).toBe(c.rowError);
  });
  it('has the same copy coverage as the other language', () => {
    expect(Object.keys(c).sort()).toEqual(Object.keys(getImportsCopy(language === 'id' ? 'en' : 'id')).sort());
  });
});
