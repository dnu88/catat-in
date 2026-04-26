import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@lib/api'
import { CATEGORY_LABEL, buildCategoryOptions } from '@lib/categories'
import { useCategoryStore } from '@store/category.store'
import { useTransactionStore } from '@store/transaction.store'
import { useWalletStore } from '@store/wallet.store'
import type {
  AIChatMessage,
  AIExtractedTransaction,
  TransactionFormData,
  TransactionType,
} from '@catat-in/shared/types'

const ENTRY_POINTS = [
  {
    title: 'Manual',
    icon: '✏️',
    description: 'Input pemasukan atau pengeluaran dengan form singkat dan cepat.',
    action: 'Buka form manual',
    href: '/transactions',
    tone: 'var(--accent-light)',
  },
  {
    title: 'Upload Struk',
    icon: '📷',
    description: 'Unggah foto nota atau struk, lalu review hasil OCR sebelum simpan.',
    action: 'Upload struk',
    href: '/imports',
    tone: 'rgba(16,185,129,0.10)',
  },
  {
    title: 'Import Mutasi',
    icon: '📥',
    description: 'Import CSV atau Excel dari bank dan dompet digital dengan review duplikat.',
    action: 'Buka import',
    href: '/imports',
    tone: 'rgba(245,158,11,0.12)',
  },
] as const

const EXAMPLE_PROMPTS = [
  'habis makan siang 45rb di warteg pakai BCA',
  'bayar listrik 285rb hari ini lewat GoPay',
  'gaji april 8 juta masuk ke BCA payroll',
]

const AUTO_SAVE_THRESHOLD = 0.85
const UNDO_WINDOW_MS = 5000

type ReviewTransaction = AIExtractedTransaction & {
  localId: string
  wallet_id: string
  date: string
}

type UndoEntry = {
  localId: string
  transactionId: string
  summary: string
  expiresAt: number
}

interface AIChatResponse {
  transactions: AIExtractedTransaction[]
  unclear: string | null
}

export default function CapturePage() {
  const navigate = useNavigate()
  const { wallets, fetchWallets } = useWalletStore()
  const { categories, fetchCategories } = useCategoryStore()
  const { addTransaction, deleteTransaction } = useTransactionStore()
  const activeWallets = useMemo(() => wallets.filter((wallet) => wallet.is_active), [wallets])
  const expenseOptions = useMemo(() => buildCategoryOptions(categories, 'expense'), [categories])
  const incomeOptions = useMemo(() => buildCategoryOptions(categories, 'income'), [categories])

  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: 'assistant',
      content: 'Tulis transaksi dengan bahasa sehari-hari. Jika AI yakin dan wallet berhasil dikenali, transaksi akan langsung tersimpan otomatis.',
      timestamp: new Date().toISOString(),
    },
  ])
  const [reviewItems, setReviewItems] = useState<ReviewTransaction[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving'>>({})
  const [undoEntries, setUndoEntries] = useState<UndoEntry[]>([])
  const [nowTick, setNowTick] = useState(Date.now())
  const undoTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    fetchWallets()
    fetchCategories()
  }, [fetchWallets, fetchCategories])

  useEffect(() => {
    if (undoEntries.length === 0) return
    const interval = setInterval(() => setNowTick(Date.now()), 250)
    return () => clearInterval(interval)
  }, [undoEntries.length])

  useEffect(() => () => {
    Object.values(undoTimersRef.current).forEach((timer) => clearTimeout(timer))
  }, [])

  const handleExampleClick = (value: string) => {
    setPrompt(value)
  }

  const handleSend = async () => {
    const text = prompt.trim()
    if (isSubmitting) return

    if (text.length < 2 || text.length > 500) {
      setSubmitError('Teks harus diisi 2 sampai 500 karakter sebelum dikirim ke AI.')
      return
    }

    const userMessage: AIChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setPrompt('')
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const conversationHistory = [...messages, userMessage].map((message) => ({
        role: message.role,
        content: message.content,
      }))

      const { data } = await api.post<AIChatResponse>('/ai/chat', {
        text,
        conversation_history: conversationHistory,
      })

      const extractedItems = (data.transactions || []).map((transaction, index) =>
        toReviewTransaction(transaction, activeWallets, index),
      )

      const autoSaveCandidates = extractedItems.filter((item) => canAutoSave(item))
      const manualReviewCandidates = extractedItems.filter((item) => !canAutoSave(item))

      let autoSavedCount = 0
      const failedAutoSave: ReviewTransaction[] = []

      for (const item of autoSaveCandidates) {
        const payload: TransactionFormData & { ai_extracted?: boolean; ai_confidence?: number } = {
          type: item.type,
          amount: Number(item.amount),
          category: item.category,
          merchant: item.merchant || undefined,
          note: item.note || undefined,
          wallet_id: item.wallet_id,
          date: normalizeReviewDate(item.date),
          ai_extracted: true,
          ai_confidence: item.confidence,
        }

        try {
          const saved = await addTransaction(payload)
          autoSavedCount += 1
          registerUndo(item.localId, saved.id, buildUndoSummary(item))
        } catch {
          failedAutoSave.push(item)
        }
      }

      const finalReviewItems = [...manualReviewCandidates, ...failedAutoSave]
      setReviewItems(finalReviewItems)

      const assistantMessage: AIChatMessage = {
        role: 'assistant',
        content: buildAssistantReply({
          autoSavedCount,
          reviewCount: finalReviewItems.length,
          unclear: data.unclear,
        }),
        extracted: data.transactions,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      const message = error.message || 'Gagal memproses AI chat.'
      setSubmitError(message)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Aku belum bisa memproses pesan itu. ${message}`,
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReviewChange = <K extends keyof ReviewTransaction>(
    localId: string,
    field: K,
    value: ReviewTransaction[K],
  ) => {
    setReviewItems((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, [field]: value } : item)),
    )
  }

  const handleSaveTransaction = async (item: ReviewTransaction) => {
    if (!item.wallet_id || Number(item.amount) <= 0) return

    setSaveStatus((prev) => ({ ...prev, [item.localId]: 'saving' }))
    setSubmitError(null)

    const payload: TransactionFormData & { ai_extracted?: boolean; ai_confidence?: number } = {
      type: item.type,
      amount: Number(item.amount),
      category: item.category,
      merchant: item.merchant || undefined,
      note: item.note || undefined,
      wallet_id: item.wallet_id,
      date: normalizeReviewDate(item.date),
      ai_extracted: true,
      ai_confidence: item.confidence,
    }

    try {
      await addTransaction(payload)
      setReviewItems((prev) => prev.filter((review) => review.localId !== item.localId))
      setSaveStatus((prev) => {
        const next = { ...prev }
        delete next[item.localId]
        return next
      })
    } catch {
      setSaveStatus((prev) => ({ ...prev, [item.localId]: 'idle' }))
      setSubmitError('Gagal menyimpan transaksi hasil AI. Coba cek field review lalu simpan lagi.')
    }
  }

  const handleCancelReview = (localId: string) => {
    setReviewItems((prev) => prev.filter((item) => item.localId !== localId))
    setSaveStatus((prev) => {
      const next = { ...prev }
      delete next[localId]
      return next
    })
  }

  const handleUndo = async (entry: UndoEntry) => {
    clearUndoTimer(entry.localId)
    try {
      await deleteTransaction(entry.transactionId)
      setUndoEntries((prev) => prev.filter((item) => item.localId !== entry.localId))
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Transaksi "${entry.summary}" dibatalkan.`,
          timestamp: new Date().toISOString(),
        },
      ])
    } catch {
      setSubmitError('Belum bisa membatalkan transaksi otomatis. Coba cek daftar transaksi.')
    }
  }

  const canSend = prompt.trim().length >= 2 && prompt.trim().length <= 500 && !isSubmitting

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Tambah Transaksi
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '720px' }}>
          AI chat input transaksi dengan flow confidence-based saving: auto-save jika yakin, review dulu jika masih ambigu.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 0.95fr)', gap: '16px' }}>
        <section className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                AI Chat
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Contoh: "beli kopi 25rb pakai GoPay", "gaji 8 juta masuk BCA", atau "bayar listrik 285rb kemarin".
              </p>
            </div>
            <span className="badge badge-info" style={{ padding: '6px 12px', alignSelf: 'flex-start' }}>
              Threshold {Math.round(AUTO_SAVE_THRESHOLD * 100)}%
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                className="badge badge-info"
                style={{ border: 'none', padding: '8px 12px', cursor: 'pointer' }}
                onClick={() => handleExampleClick(example)}
              >
                {example}
              </button>
            ))}
          </div>

          <div
            style={{
              minHeight: '320px',
              maxHeight: '420px',
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '14px',
              background: 'linear-gradient(180deg, var(--bg-card2), var(--bg-card))',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {messages.map((message, index) => (
              <div
                key={`${message.timestamp}-${index}`}
                style={{
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: message.role === 'user' ? 'var(--accent)' : 'var(--bg-card)',
                  color: message.role === 'user' ? '#fff' : 'var(--text-primary)',
                  border: message.role === 'user' ? 'none' : '1px solid var(--border)',
                  boxShadow: message.role === 'user' ? 'var(--shadow-accent)' : 'none',
                }}
              >
                <div style={{ fontSize: '13px', lineHeight: 1.7 }}>{message.content}</div>
              </div>
            ))}

            {isSubmitting ? (
              <div
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '85%',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  AI sedang membaca transaksi kamu...
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            <textarea
              className="form-input"
              rows={4}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Contoh: habis makan malam 52rb di Bakmi GM pakai GoPay"
              style={{ resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Input harus 2-500 karakter. Jika AI belum yakin, hasil akan masuk ke review card.
              </span>
              <button className="btn btn-primary" onClick={handleSend} disabled={!canSend}>
                {isSubmitting ? 'Memproses...' : 'Kirim ke AI'}
              </button>
            </div>
            {submitError ? (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--red)',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                }}
              >
                {submitError}
              </div>
            ) : null}
          </div>
        </section>

        <section className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Hasil AI
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Auto-save akan muncul dengan opsi batalkan 5 detik. Sisanya tetap perlu review manual.
            </p>
          </div>

          {undoEntries.length > 0 ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              {undoEntries.map((entry) => (
                <div
                  key={entry.localId}
                  style={{
                    borderRadius: '12px',
                    border: '1px solid rgba(16,185,129,0.16)',
                    background: 'rgba(16,185,129,0.08)',
                    padding: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Transaksi otomatis tersimpan
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {entry.summary}
                      </div>
                    </div>
                    <button className="btn btn-secondary" onClick={() => handleUndo(entry)}>
                      Batalkan ({Math.max(1, Math.ceil((entry.expiresAt - nowTick) / 1000))})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {activeWallets.length === 0 ? (
            <div
              style={{
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid rgba(245,158,11,0.25)',
                background: 'rgba(245,158,11,0.10)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                lineHeight: 1.7,
              }}
            >
              Kamu belum punya wallet aktif. Tambahkan wallet dulu agar hasil AI bisa disimpan.
            </div>
          ) : null}

          {reviewItems.length === 0 ? (
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
              Belum ada hasil yang perlu direview.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {reviewItems.map((item) => (
                <ReviewCard
                  key={item.localId}
                  item={item}
                  wallets={activeWallets.map((wallet) => ({ id: wallet.id, name: wallet.name }))}
                  expenseOptions={expenseOptions}
                  incomeOptions={incomeOptions}
                  status={saveStatus[item.localId] || 'idle'}
                  onChange={handleReviewChange}
                  onSave={handleSaveTransaction}
                  onCancel={handleCancelReview}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {ENTRY_POINTS.map((item) => (
          <button
            key={item.title}
            type="button"
            className="card"
            onClick={() => navigate(item.href)}
            style={{ padding: '18px', textAlign: 'left', cursor: 'pointer', background: `linear-gradient(180deg, ${item.tone}, var(--bg-card))` }}
          >
            <div style={{ fontSize: '26px', marginBottom: '10px' }}>{item.icon}</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              {item.title}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '14px' }}>
              {item.description}
            </p>
            <span className="badge badge-info" style={{ padding: '6px 10px' }}>
              {item.action}
            </span>
          </button>
        ))}
      </div>

      <style>{`
        @media (max-width: 980px) {
          .animate-fade-in > div:nth-child(2) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )

  function registerUndo(localId: string, transactionId: string, summary: string) {
    clearUndoTimer(localId)

    const entry: UndoEntry = {
      localId,
      transactionId,
      summary,
      expiresAt: Date.now() + UNDO_WINDOW_MS,
    }

    setUndoEntries((prev) => [entry, ...prev.filter((item) => item.localId !== localId)])
    undoTimersRef.current[localId] = setTimeout(() => {
      setUndoEntries((prev) => prev.filter((item) => item.localId !== localId))
      clearUndoTimer(localId)
    }, UNDO_WINDOW_MS)
  }

  function clearUndoTimer(localId: string) {
    const timer = undoTimersRef.current[localId]
    if (timer) {
      clearTimeout(timer)
      delete undoTimersRef.current[localId]
    }
  }
}

function ReviewCard({
  item,
  wallets,
  expenseOptions,
  incomeOptions,
  status,
  onChange,
  onSave,
  onCancel,
}: {
  item: ReviewTransaction
  wallets: Array<{ id: string; name: string }>
  expenseOptions: Array<{ value: string; label: string }>
  incomeOptions: Array<{ value: string; label: string }>
  status: 'idle' | 'saving'
  onChange: <K extends keyof ReviewTransaction>(localId: string, field: K, value: ReviewTransaction[K]) => void
  onSave: (item: ReviewTransaction) => Promise<void>
  onCancel: (localId: string) => void
}) {
  const categoryOptions = (item.type === 'income' ? incomeOptions : expenseOptions)
    .length
    ? (item.type === 'income' ? incomeOptions : expenseOptions)
    : [{ value: item.category, label: item.category }]
  const needsWallet = !item.wallet_id
  const needsAmount = Number(item.amount) <= 0
  const isLowConfidence = item.confidence < AUTO_SAVE_THRESHOLD || needsWallet || needsAmount
  const disabled = needsWallet || needsAmount || status === 'saving'

  return (
    <div style={{ border: `1px solid ${isLowConfidence ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`, borderRadius: '14px', padding: '14px', background: 'var(--bg-card2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Review transaksi AI
        </div>
        <span className={`badge ${isLowConfidence ? 'badge-warn' : 'badge-ok'}`}>
          Confidence {Math.round(item.confidence * 100)}%
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <Field label="Tipe">
          <select className="form-input" value={item.type} onChange={(event) => onChange(item.localId, 'type', event.target.value as TransactionType)}>
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>
        </Field>

        <Field label="Nominal" highlight={needsAmount}>
          <input className="form-input" type="number" min="0" value={item.amount} onChange={(event) => onChange(item.localId, 'amount', Number(event.target.value))} />
        </Field>

        <Field label="Kategori">
          <select className="form-input" value={item.category} onChange={(event) => onChange(item.localId, 'category', event.target.value)}>
            {categoryOptions.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Wallet" highlight={needsWallet}>
          <select className="form-input" value={item.wallet_id} onChange={(event) => onChange(item.localId, 'wallet_id', event.target.value)}>
            <option value="">Pilih wallet</option>
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Merchant / tempat">
          <input className="form-input" value={item.merchant || ''} onChange={(event) => onChange(item.localId, 'merchant', event.target.value)} placeholder="Opsional" />
        </Field>

        <Field label="Tanggal">
          <input className="form-input" type="date" value={normalizeReviewDate(item.date)} onChange={(event) => onChange(item.localId, 'date', event.target.value)} />
        </Field>
      </div>

      <div style={{ marginTop: '10px' }}>
        <Field label="Catatan">
          <input className="form-input" value={item.note || ''} onChange={(event) => onChange(item.localId, 'note', event.target.value)} placeholder="Tambahkan konteks jika perlu" />
        </Field>
      </div>

      {isLowConfidence ? (
        <div
          style={{
            marginTop: '10px',
            fontSize: '12px',
            color: 'var(--amber)',
            background: 'rgba(245,158,11,0.10)',
            border: '1px solid rgba(245,158,11,0.20)',
            borderRadius: '12px',
            padding: '10px 12px',
            lineHeight: 1.7,
          }}
        >
          AI belum cukup yakin. Pastikan nominal, kategori, dan wallet sudah benar sebelum menyimpan.
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary" onClick={() => onCancel(item.localId)}>
          Batal
        </button>
        <button className="btn btn-primary" disabled={disabled} onClick={() => onSave(item)}>
          {status === 'saving' ? 'Menyimpan...' : 'Simpan transaksi'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children, highlight = false }: { label: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <label style={{ display: 'grid', gap: '6px' }}>
      <span style={{ fontSize: '12px', color: highlight ? 'var(--amber)' : 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  )
}

function toReviewTransaction(
  transaction: AIExtractedTransaction,
  wallets: Array<{ id: string; name: string; bank_name?: string | null }>,
  index: number,
): ReviewTransaction {
  return {
    ...transaction,
    localId: `${Date.now()}-${index}`,
    wallet_id: matchWalletId(transaction.wallet_hint, wallets),
    merchant: transaction.merchant || '',
    note: transaction.note || '',
    date: normalizeReviewDate(transaction.date),
  }
}

function matchWalletId(
  walletHint: string | null | undefined,
  wallets: Array<{ id: string; name: string; bank_name?: string | null }>,
): string {
  if (!walletHint) return ''
  const normalizedHint = normalizeText(walletHint)
  const matched = wallets.find((wallet) => {
    const candidates = [wallet.name, wallet.bank_name || '']
      .map((value) => normalizeText(value))
      .filter(Boolean)
    return candidates.some((candidate) => candidate.includes(normalizedHint) || normalizedHint.includes(candidate))
  })
  return matched?.id || ''
}

function normalizeText(value?: string | null): string {
  return (value || '').trim().toLowerCase()
}

function canAutoSave(item: ReviewTransaction): boolean {
  return item.confidence >= AUTO_SAVE_THRESHOLD && Number(item.amount) > 0 && Boolean(item.wallet_id)
}

function buildUndoSummary(item: ReviewTransaction): string {
  const label = CATEGORY_LABEL[item.category] || item.category
  return `${label} · Rp${Math.round(item.amount).toLocaleString('id-ID')}`
}

function buildAssistantReply({
  autoSavedCount,
  reviewCount,
  unclear,
}: {
  autoSavedCount: number
  reviewCount: number
  unclear: string | null
}): string {
  if (autoSavedCount === 0 && reviewCount === 0) {
    return unclear || 'Aku belum menemukan transaksi yang bisa dicatat. Coba tulis lebih spesifik.'
  }

  const parts: string[] = []
  if (autoSavedCount > 0) parts.push(`${autoSavedCount} transaksi langsung tersimpan otomatis.`)
  if (reviewCount > 0) parts.push(`${reviewCount} transaksi perlu kamu review dulu.`)
  if (unclear) parts.push(`Catatan: ${unclear}`)
  return parts.join(' ')
}

function normalizeReviewDate(value?: string | null): string {
  const today = new Date()

  if (!value || value === 'today') {
    return formatDateInput(today)
  }

  if (value === 'yesterday') {
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    return formatDateInput(yesterday)
  }

  return value
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0]
}
