import { useEffect, useState } from 'react'
import { useTransactionStore } from '@store/transaction.store'
import { useWalletStore } from '@store/wallet.store'
import { useCategoryStore } from '@store/category.store'
import { CATEGORY_EMOJI, CATEGORY_LABEL, buildCategoryOptions } from '@lib/categories'
import type { Transaction, TransactionFormData } from '@catat-in/shared/types'

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function AddTxModal({
  onClose,
  onSave,
  walletOptions,
}: {
  onClose: () => void
  onSave: (data: TransactionFormData) => Promise<Transaction>
  walletOptions: { id: string; name: string }[]
}) {
  const { categories, fetchCategories } = useCategoryStore()
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('food')
  const [walletId, setWalletId] = useState(walletOptions[0]?.id || '')
  const [note, setNote] = useState('')
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCategories(type)
  }, [fetchCategories, type])

  const categoryOptions = buildCategoryOptions(categories, type)
  const selectableCategories = categoryOptions.length
    ? categoryOptions
    : [{ value: type === 'income' ? 'salary' : 'food', label: type === 'income' ? '💼 Gaji' : '🍔 Makan & Minum' }]

  useEffect(() => {
    if (!selectableCategories.some((item) => item.value === category)) {
      setCategory(selectableCategories[0]?.value || (type === 'income' ? 'salary' : 'food'))
    }
  }, [category, selectableCategories, type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) return setError('Nominal harus lebih dari 0')
    if (!walletId) return setError('Pilih wallet terlebih dahulu')
    setSaving(true)
    try {
      await onSave({ type, amount: parsedAmount, category, wallet_id: walletId, note: note || undefined, merchant: merchant || undefined, date })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan transaksi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box animate-slide-up">
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>
          Tambah Transaksi
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`btn ${type === 'expense' ? '' : 'btn-secondary'}`}
              style={{ flex: 1, ...(type === 'expense' ? { background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#fff', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' } : {}) }}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`btn ${type === 'income' ? '' : 'btn-secondary'}`}
              style={{ flex: 1, ...(type === 'income' ? { background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' } : {}) }}
            >
              Pemasukan
            </button>
          </div>

          <div>
            <label className="form-label">Nominal (Rp)</label>
            <input className="form-input" type="number" min="1000" step="1000" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" required />
          </div>

          <div>
            <label className="form-label">Kategori</label>
            <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {selectableCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Wallet</label>
            <select className="form-input" value={walletId} onChange={(e) => setWalletId(e.target.value)} required>
              {walletOptions.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Merchant / Tempat (opsional)</label>
            <input className="form-input" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Contoh: Indomaret" />
          </div>

          <div>
            <label className="form-label">Catatan (opsional)</label>
            <input className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: makan siang bersama tim" />
          </div>

          <div>
            <label className="form-label">Tanggal</label>
            <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          {error ? <p style={{ fontSize: '13px', color: 'var(--red)', background: 'rgba(239,68,68,0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.15)', margin: 0 }}>{error}</p> : null}

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Batal</button>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TxRow({ tx, onDelete }: { tx: Transaction; onDelete: (id: string) => void }) {
  const isIncome = tx.type === 'income'
  return (
    <div
      className="card"
      style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.15s', cursor: 'default' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: isIncome ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${isIncome ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            flexShrink: 0,
          }}
        >
          {CATEGORY_EMOJI[tx.category] || '📦'}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {CATEGORY_LABEL[tx.category] || tx.category}
          </p>
          {tx.merchant ? <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>{tx.merchant}</p> : null}
          {tx.note ? <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{tx.note}</p> : null}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: isIncome ? 'var(--green)' : 'var(--red)' }}>
            {isIncome ? '+' : '-'}{formatRupiah(Number(tx.amount))}
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(tx.date)}</p>
        </div>
        <button onClick={() => onDelete(tx.id)} className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '11px' }} title="Hapus">✕</button>
      </div>
    </div>
  )
}

export default function TransactionPage() {
  const { transactions, total, isLoading, error, fetchTransactions, addTransaction, deleteTransaction, filters, setFilters } = useTransactionStore()
  const { wallets, fetchWallets } = useWalletStore()
  const { fetchCategories } = useCategoryStore()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchTransactions()
    fetchWallets()
    fetchCategories()
  }, [fetchTransactions, fetchWallets, fetchCategories])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus transaksi ini?')) return
    try {
      await deleteTransaction(id)
    } catch {
      alert('Gagal menghapus transaksi')
    }
  }

  const handleFilterType = (type: string) => {
    const newType = filters.type === type ? undefined : type as 'income' | 'expense'
    setFilters({ type: newType, page: 1 })
    fetchTransactions({ type: newType, page: 1 })
  }

  const walletOptions = wallets.filter((wallet) => wallet.is_active)

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Transaksi</h2>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" disabled={walletOptions.length === 0}>
          ＋ Tambah
        </button>
      </div>

      {walletOptions.length === 0 ? (
        <div className="card" style={{ padding: '14px 16px', marginBottom: '12px', borderLeft: '3px solid var(--amber)' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--amber)' }}>Buat wallet dulu sebelum menambah transaksi.</p>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        {(['income', 'expense'] as const).map((type) => (
          <button
            key={type}
            onClick={() => handleFilterType(type)}
            className={`badge ${filters.type === type ? (type === 'income' ? 'badge-ok' : 'badge-danger') : 'badge-info'}`}
            style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px', border: 'none', fontWeight: 600 }}
          >
            {type === 'income' ? '↗ Pemasukan' : '↘ Pengeluaran'}
          </button>
        ))}
        {filters.type ? (
          <button
            onClick={() => { setFilters({ type: undefined, page: 1 }); fetchTransactions({ type: undefined, page: 1 }) }}
            className="badge"
            style={{ cursor: 'pointer', padding: '6px 14px', fontSize: '12px', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-muted)' }}
          >
            Semua
          </button>
        ) : null}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>{total} transaksi</span>
      </div>

      {isLoading ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>Memuat...</p> : null}
      {error ? (
        <div className="card" style={{ padding: '14px 16px', marginBottom: '12px', borderLeft: '3px solid var(--red)' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--red)' }}>{error}</p>
        </div>
      ) : null}

      {!isLoading && transactions.length === 0 ? (
        <div className="card" style={{ padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '36px', margin: '0 0 8px' }}>📝</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Belum ada transaksi. Tambahkan transaksi pertama kamu.</p>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {transactions.map((tx) => <TxRow key={tx.id} tx={tx} onDelete={handleDelete} />)}
      </div>

      {total > (filters.per_page || 20) ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
          <button
            disabled={(filters.page || 1) <= 1}
            className="btn btn-secondary"
            onClick={() => { const page = (filters.page || 1) - 1; setFilters({ page }); fetchTransactions({ page }) }}
          >
            ← Sebelumnya
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Hal. {filters.page || 1}</span>
          <button
            disabled={((filters.page || 1) * (filters.per_page || 20)) >= total}
            className="btn btn-secondary"
            onClick={() => { const page = (filters.page || 1) + 1; setFilters({ page }); fetchTransactions({ page }) }}
          >
            Berikutnya →
          </button>
        </div>
      ) : null}

      {showModal ? (
        <AddTxModal onClose={() => setShowModal(false)} onSave={addTransaction} walletOptions={walletOptions} />
      ) : null}
    </div>
  )
}
