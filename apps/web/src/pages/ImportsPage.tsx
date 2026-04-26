import { useEffect, useMemo, useState } from 'react'
import { api, uploadApi } from '@lib/api'
import { useTransactionStore } from '@store/transaction.store'
import { useWalletStore } from '@store/wallet.store'
import { useCategoryStore } from '@store/category.store'
import { buildCategoryOptions } from '@lib/categories'
import type { TransactionCategory, TransactionFormData } from '@catat-in/shared/types'

const IMPORT_SOURCES = [
  { value: 'bca', label: 'BCA' },
  { value: 'mandiri', label: 'Mandiri' },
  { value: 'bni', label: 'BNI' },
  { value: 'bri', label: 'BRI' },
  { value: 'gopay', label: 'GoPay' },
  { value: 'ovo', label: 'OVO' },
] as const

const ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

interface ReceiptItem {
  name: string
  qty: number
  price: number
}

interface ReceiptAnalysisResponse {
  total_amount: number | null
  merchant: string | null
  date: string | null
  category: TransactionCategory | string
  items: ReceiptItem[]
  confidence: number
  readable: boolean
}

interface ReceiptDraft {
  amount: number
  merchant: string
  date: string
  category: TransactionCategory
  wallet_id: string
  note: string
}

interface ImportTransactionDraft {
  date: string
  description: string
  type: 'income' | 'expense'
  amount: number
  category: string
  hash: string
  is_duplicate: boolean
  row_number: number
}

interface ImportPreviewResponse {
  transactions: ImportTransactionDraft[]
  duplicates: ImportTransactionDraft[]
  errors: Array<{ row: number; reason: string }>
  total_rows: number
  imported: number
  skipped_months: number
  bank_name: string
}

interface ConfirmImportResponse {
  success: boolean
  imported: number
  skipped_duplicates: number
  message: string
}

export default function ImportsPage() {
  const { wallets, fetchWallets } = useWalletStore()
  const { addTransaction } = useTransactionStore()
  const { categories, fetchCategories } = useCategoryStore()
  const activeWallets = useMemo(() => wallets.filter((wallet) => wallet.is_active), [wallets])
  const expenseCategoryOptions = useMemo(() => buildCategoryOptions(categories, 'expense'), [categories])
  const selectableExpenseCategories = expenseCategoryOptions.length
    ? expenseCategoryOptions
    : [{ value: 'other', label: '📦 Lainnya' }]

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ReceiptAnalysisResponse | null>(null)
  const [draft, setDraft] = useState<ReceiptDraft>({
    amount: 0,
    merchant: '',
    date: todayInput(),
    category: 'other',
    wallet_id: '',
    note: '',
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [receiptSuccess, setReceiptSuccess] = useState<string | null>(null)

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importBank, setImportBank] = useState<(typeof IMPORT_SOURCES)[number]['value']>('bca')
  const [importWalletId, setImportWalletId] = useState('')
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null)
  const [selectedHashes, setSelectedHashes] = useState<string[]>([])
  const [isPreviewingImport, setIsPreviewingImport] = useState(false)
  const [isConfirmingImport, setIsConfirmingImport] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchWallets()
    fetchCategories('expense')
  }, [fetchWallets, fetchCategories])

  useEffect(() => {
    if (!draft.wallet_id && activeWallets[0]?.id) {
      setDraft((prev) => ({ ...prev, wallet_id: activeWallets[0].id }))
    }
    if (!importWalletId && activeWallets[0]?.id) {
      setImportWalletId(activeWallets[0].id)
    }
  }, [activeWallets, draft.wallet_id, importWalletId])

  useEffect(() => {
    if (!selectedFile || selectedFile.type === 'application/pdf') {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [selectedFile])

  const importRows = useMemo(() => {
    if (!previewData) return []
    return [...previewData.transactions, ...previewData.duplicates]
  }, [previewData])

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file)
    setAnalysis(null)
    setReceiptSuccess(null)
    setReceiptError(null)
    setDraft((prev) => ({
      ...prev,
      amount: 0,
      merchant: '',
      date: todayInput(),
      category: 'other',
      note: '',
    }))
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return

    if (!ALLOWED_RECEIPT_TYPES.includes(selectedFile.type)) {
      setReceiptError('Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.')
      return
    }

    setIsAnalyzing(true)
    setReceiptError(null)
    setReceiptSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const { data } = await uploadApi.post<ReceiptAnalysisResponse>('/ai/receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const normalizedCategory = selectableExpenseCategories.some((item) => item.value === data.category)
        ? (data.category as TransactionCategory)
        : 'other'

      setAnalysis(data)
      setDraft((prev) => ({
        ...prev,
        amount: data.total_amount || 0,
        merchant: data.merchant || '',
        date: data.date || todayInput(),
        category: normalizedCategory,
        note: data.items?.length ? `OCR struk: ${data.items.length} item terbaca` : prev.note,
      }))
    } catch (err: any) {
      setReceiptError(err.message || 'Gagal menganalisis struk.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDraftChange = <K extends keyof ReceiptDraft>(field: K, value: ReceiptDraft[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveReceipt = async () => {
    if (!draft.wallet_id || draft.amount <= 0) {
      setReceiptError('Pastikan nominal dan wallet sudah terisi sebelum menyimpan.')
      return
    }

    setIsSaving(true)
    setReceiptError(null)
    setReceiptSuccess(null)

    const payload: TransactionFormData = {
      type: 'expense',
      amount: Number(draft.amount),
      category: draft.category,
      wallet_id: draft.wallet_id,
      merchant: draft.merchant || undefined,
      note: draft.note || undefined,
      date: draft.date,
    }

    try {
      await addTransaction(payload)
      setReceiptSuccess('Transaksi dari struk berhasil disimpan.')
    } catch (err: any) {
      setReceiptError(err.message || 'Gagal menyimpan transaksi hasil OCR.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleImportFileChange = (file: File | null) => {
    setImportFile(file)
    setPreviewData(null)
    setSelectedHashes([])
    setImportError(null)
    setImportSuccess(null)
  }

  const handlePreviewImport = async () => {
    if (!importFile) return

    setIsPreviewingImport(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('bank_name', importBank)

      const { data } = await uploadApi.post<ImportPreviewResponse>('/imports/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const rows = [...data.transactions, ...data.duplicates]
      setPreviewData(data)
      setSelectedHashes(rows.map((row) => row.hash))
    } catch (err: any) {
      setImportError(err.message || 'Gagal mem-preview file import.')
    } finally {
      setIsPreviewingImport(false)
    }
  }

  const handleToggleRow = (hash: string) => {
    setSelectedHashes((prev) =>
      prev.includes(hash) ? prev.filter((item) => item !== hash) : [...prev, hash]
    )
  }

  const handleConfirmImport = async () => {
    if (!previewData || !importWalletId) {
      setImportError('Pilih wallet dan preview data dulu sebelum konfirmasi import.')
      return
    }

    const chosenRows = importRows.filter((row) => selectedHashes.includes(row.hash))
    if (!chosenRows.length) {
      setImportError('Pilih minimal satu transaksi untuk diimpor.')
      return
    }

    setIsConfirmingImport(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      const { data } = await api.post<ConfirmImportResponse>('/imports/confirm', {
        transactions: chosenRows,
        wallet_id: importWalletId,
        skip_duplicates: skipDuplicates,
      })

      setImportSuccess(data.message)
    } catch (err: any) {
      setImportError(err.message || 'Gagal mengonfirmasi import transaksi.')
    } finally {
      setIsConfirmingImport(false)
    }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Import Mutasi & Struk
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '760px' }}>
          Sekarang lane struk dan import mutasi sama-sama aktif. Upload struk untuk OCR review, atau upload file CSV/Excel bank lalu preview hasil parsing dan duplikat sebelum konfirmasi import.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.05fr) minmax(320px, 0.95fr)',
          gap: '16px',
        }}
      >
        <section className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Upload Struk
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Format didukung: JPG, PNG, WEBP, atau PDF. Backend juga sudah memvalidasi ukuran file.
              </p>
            </div>
            <span className="badge badge-info" style={{ alignSelf: 'flex-start', padding: '6px 12px' }}>
              OCR review flow
            </span>
          </div>

          <label
            style={{
              border: '1.5px dashed var(--border-strong)',
              borderRadius: '16px',
              padding: '20px',
              cursor: 'pointer',
              background: 'linear-gradient(180deg, var(--bg-card2), var(--bg-card))',
              textAlign: 'center',
            }}
          >
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              style={{ display: 'none' }}
              onChange={(event) => handleFileSelect(event.target.files?.[0] || null)}
            />
            <div style={{ fontSize: '30px', marginBottom: '8px' }}>📷</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {selectedFile ? selectedFile.name : 'Pilih file struk'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              Flow ini dipakai untuk foto nota belanja dan fallback review manual jika OCR confidence rendah.
            </div>
          </label>

          {previewUrl ? (
            <div
              style={{
                borderRadius: '14px',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                background: 'var(--bg-card2)',
              }}
            >
              <img src={previewUrl} alt="Preview struk" style={{ width: '100%', display: 'block', maxHeight: '360px', objectFit: 'contain' }} />
            </div>
          ) : selectedFile?.type === 'application/pdf' ? (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '22px',
                textAlign: 'center',
                background: 'var(--bg-card2)',
                color: 'var(--text-secondary)',
              }}
            >
              Preview PDF belum ditampilkan di halaman ini, tapi file tetap bisa dikirim ke OCR backend.
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={!selectedFile || isAnalyzing}>
              {isAnalyzing ? 'Menganalisis...' : 'Analisis dengan AI'}
            </button>
            <button className="btn btn-secondary" onClick={() => handleFileSelect(null)} disabled={!selectedFile || isAnalyzing}>
              Reset file
            </button>
          </div>

          {receiptError ? <StatusBox tone="danger" message={receiptError} /> : null}
          {receiptSuccess ? <StatusBox tone="success" message={receiptSuccess} /> : null}
        </section>

        <section className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Review OCR
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Sesuai PRD, hasil OCR harus selalu bisa diedit manual sebelum jadi transaksi.
            </p>
          </div>

          {!analysis ? (
            <EmptyBox message="Belum ada hasil OCR. Upload file lalu klik Analisis dengan AI." />
          ) : (
            <>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className={`badge ${analysis.readable ? 'badge-ok' : 'badge-danger'}`}>
                  {analysis.readable ? 'Struk terbaca' : 'Perlu review manual'}
                </span>
                <span className={`badge ${analysis.confidence >= 0.7 ? 'badge-ok' : analysis.confidence >= 0.5 ? 'badge-warn' : 'badge-danger'}`}>
                  Confidence {Math.round(analysis.confidence * 100)}%
                </span>
              </div>

              {analysis.confidence < 0.7 || !analysis.readable ? (
                <StatusBox
                  tone="warning"
                  message="OCR belum terlalu yakin. Review nominal, merchant, kategori, dan tanggal sebelum menyimpan."
                />
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="Nominal">
                  <input className="form-input" type="number" min="0" value={draft.amount} onChange={(event) => handleDraftChange('amount', Number(event.target.value))} />
                </Field>
                <Field label="Kategori">
                  <select className="form-input" value={draft.category} onChange={(event) => handleDraftChange('category', event.target.value as TransactionCategory)}>
                    {selectableExpenseCategories.map((category) => (
                      <option key={category.value} value={category.value}>{category.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Merchant">
                  <input className="form-input" value={draft.merchant} onChange={(event) => handleDraftChange('merchant', event.target.value)} placeholder="Contoh: Indomaret" />
                </Field>
                <Field label="Tanggal">
                  <input className="form-input" type="date" value={draft.date} onChange={(event) => handleDraftChange('date', event.target.value)} />
                </Field>
                <Field label="Wallet">
                  <select className="form-input" value={draft.wallet_id} onChange={(event) => handleDraftChange('wallet_id', event.target.value)}>
                    <option value="">Pilih wallet</option>
                    {activeWallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Catatan">
                  <input className="form-input" value={draft.note} onChange={(event) => handleDraftChange('note', event.target.value)} placeholder="Opsional" />
                </Field>
              </div>

              {analysis.items?.length ? (
                <div className="card" style={{ padding: '14px', background: 'var(--bg-card2)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                    Item yang terbaca
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {analysis.items.slice(0, 6).map((item, index) => (
                      <div key={`${item.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span>{item.name || `Item ${index + 1}`}</span>
                        <span>{item.qty} x {formatRupiah(item.price || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <button className="btn btn-primary" onClick={handleSaveReceipt} disabled={isSaving || !draft.wallet_id || draft.amount <= 0}>
                {isSaving ? 'Menyimpan...' : 'Simpan transaksi'}
              </button>
            </>
          )}
        </section>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)',
          gap: '16px',
        }}
      >
        <section className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Import Mutasi Bank
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Upload CSV/Excel, preview hasil parsing, lalu konfirmasi import ke wallet yang dipilih.
              </p>
            </div>
            <span className="badge badge-info" style={{ alignSelf: 'flex-start', padding: '6px 12px' }}>
              Preview + confirm
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="Sumber bank / dompet digital">
              <select className="form-input" value={importBank} onChange={(event) => setImportBank(event.target.value as (typeof IMPORT_SOURCES)[number]['value'])}>
                {IMPORT_SOURCES.map((source) => (
                  <option key={source.value} value={source.value}>{source.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Wallet tujuan">
              <select className="form-input" value={importWalletId} onChange={(event) => setImportWalletId(event.target.value)}>
                <option value="">Pilih wallet</option>
                {activeWallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <label
            style={{
              border: '1.5px dashed var(--border-strong)',
              borderRadius: '16px',
              padding: '18px',
              cursor: 'pointer',
              background: 'linear-gradient(180deg, var(--bg-card2), var(--bg-card))',
              textAlign: 'center',
            }}
          >
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(event) => handleImportFileChange(event.target.files?.[0] || null)}
            />
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📥</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {importFile ? importFile.name : 'Pilih file mutasi'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              Parser backend sudah mendukung BCA, Mandiri, BNI, BRI, GoPay, dan OVO.
            </div>
          </label>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handlePreviewImport} disabled={!importFile || isPreviewingImport}>
              {isPreviewingImport ? 'Memproses preview...' : 'Preview import'}
            </button>
            <button className="btn btn-secondary" onClick={() => handleImportFileChange(null)} disabled={!importFile || isPreviewingImport}>
              Reset file
            </button>
          </div>

          {importError ? <StatusBox tone="danger" message={importError} /> : null}
          {importSuccess ? <StatusBox tone="success" message={importSuccess} /> : null}

          {!previewData ? (
            <EmptyBox message="Belum ada hasil preview import. Pilih sumber bank dan upload file dulu." />
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '10px',
                }}
              >
                <MiniStat label="Total baris" value={String(previewData.total_rows)} />
                <MiniStat label="Valid" value={String(previewData.imported)} />
                <MiniStat label="Duplikat" value={String(previewData.duplicates.length)} />
                <MiniStat label="Error" value={String(previewData.errors.length)} />
              </div>

              {previewData.skipped_months > 0 ? (
                <StatusBox
                  tone="warning"
                  message={`${previewData.skipped_months} baris dilewati karena melewati batas periode plan saat ini.`}
                />
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={skipDuplicates} onChange={(event) => setSkipDuplicates(event.target.checked)} />
                  Skip duplikat saat konfirmasi import
                </label>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {selectedHashes.length} transaksi dipilih
                </div>
              </div>

              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '52px 110px 1fr 110px 110px',
                    gap: '10px',
                    padding: '10px 12px',
                    background: 'var(--bg-card2)',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>Pilih</span>
                  <span>Tanggal</span>
                  <span>Deskripsi</span>
                  <span>Jenis</span>
                  <span>Nominal</span>
                </div>

                <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  {importRows.map((row) => (
                    <label
                      key={row.hash}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '52px 110px 1fr 110px 110px',
                        gap: '10px',
                        padding: '12px',
                        borderBottom: '1px solid var(--border)',
                        alignItems: 'center',
                        background: row.is_duplicate ? 'rgba(245,158,11,0.06)' : 'var(--bg-card)',
                        cursor: 'pointer',
                      }}
                    >
                      <input type="checkbox" checked={selectedHashes.includes(row.hash)} onChange={() => handleToggleRow(row.hash)} />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.date}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.description || '-'}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <span className={`badge ${row.is_duplicate ? 'badge-warn' : 'badge-ok'}`}>
                            {row.is_duplicate ? 'Duplikat' : 'Baru'}
                          </span>
                          <span className="badge badge-info">Baris {row.row_number}</span>
                        </div>
                      </div>
                      <span className={`badge ${row.type === 'income' ? 'badge-ok' : 'badge-danger'}`}>
                        {row.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: row.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                        {formatRupiah(row.amount)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {previewData.errors.length > 0 ? (
                <div className="card" style={{ padding: '14px', background: 'var(--bg-card2)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Baris yang gagal diparse
                  </div>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {previewData.errors.slice(0, 6).map((item, index) => (
                      <div key={`${item.row}-${index}`} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Baris {item.row}: {item.reason}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <button className="btn btn-primary" onClick={handleConfirmImport} disabled={isConfirmingImport || !importWalletId || !selectedHashes.length}>
                {isConfirmingImport ? 'Mengimpor...' : 'Konfirmasi import'}
              </button>
            </>
          )}
        </section>

        <section className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Checklist PRD untuk lane import
          </h3>
          <ChecklistItem text="Preview sebelum simpan sudah ada." done />
          <ChecklistItem text="Deteksi duplikat berdasarkan tanggal + nominal + deskripsi sudah aktif." done />
          <ChecklistItem text="Skip/import pilihan user saat confirm sudah aktif." done />
          <ChecklistItem text="Mapping kolom manual untuk format tidak dikenal belum dibuat." />
          <ChecklistItem text="Background processing file sangat besar belum dibuat." />
          <ChecklistItem text="Auto-categorization pasca import masih bisa kita tambah di langkah berikutnya." />

          <div className="card" style={{ padding: '14px', background: 'var(--bg-card2)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Parser prioritas
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {IMPORT_SOURCES.map((source) => (
                <span key={source.value} className="badge badge-info" style={{ padding: '8px 12px' }}>
                  {source.label}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: '6px' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  )
}

function StatusBox({ tone, message }: { tone: 'danger' | 'success' | 'warning'; message: string }) {
  const tones = {
    danger: {
      color: 'var(--red)',
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.16)',
    },
    success: {
      color: 'var(--green)',
      background: 'rgba(16,185,129,0.08)',
      border: '1px solid rgba(16,185,129,0.16)',
    },
    warning: {
      color: 'var(--amber)',
      background: 'rgba(245,158,11,0.10)',
      border: '1px solid rgba(245,158,11,0.18)',
    },
  } as const

  return (
    <div
      style={{
        ...tones[tone],
        borderRadius: '12px',
        padding: '10px 12px',
        fontSize: '12px',
        lineHeight: 1.7,
      }}
    >
      {message}
    </div>
  )
}

function EmptyBox({ message }: { message: string }) {
  return (
    <div
      style={{
        border: '1px dashed var(--border-strong)',
        borderRadius: '14px',
        padding: '28px 18px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '13px',
        lineHeight: 1.7,
      }}
    >
      {message}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: '12px 14px', background: 'var(--bg-card2)' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

function ChecklistItem({ text, done = false }: { text: string; done?: boolean }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '12px 14px',
        background: 'var(--bg-card2)',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        lineHeight: 1.7,
      }}
    >
      {done ? '✓' : '•'} {text}
    </div>
  )
}

function todayInput(): string {
  return new Date().toISOString().split('T')[0]
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}
