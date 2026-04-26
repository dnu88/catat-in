import { useEffect, useState } from 'react'
import { useWalletStore } from '@store/wallet.store'
import type { Wallet, WalletType } from '@catat-in/shared/types'
import type { WalletFormData } from '@store/wallet.store'

const WALLET_TYPE_LABEL: Record<string, string> = {
  bank: 'Bank',
  ewallet: 'E-Wallet',
  cash: 'Tunai',
  investment: 'Investasi',
}

const WALLET_TYPE_COLOR: Record<string, string> = {
  bank: '#2563eb',
  ewallet: '#7c3aed',
  cash: '#16a34a',
  investment: '#d97706',
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

// ── ADD WALLET MODAL ─────────────────────────────────────────

interface AddWalletModalProps {
  onClose: () => void
  onSave: (data: WalletFormData) => Promise<void>
}

function AddWalletModal({ onClose, onSave }: AddWalletModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<WalletType>('bank')
  const [balance, setBalance] = useState('')
  const [bankName, setBankName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Nama wallet wajib diisi')
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        type,
        balance: parseFloat(balance) || 0,
        bank_name: bankName.trim() || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan wallet')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.box}>
        <h3 style={modalStyles.title}>Tambah Wallet Baru</h3>
        <form onSubmit={handleSubmit} style={modalStyles.form}>
          <label style={modalStyles.label}>Nama Wallet</label>
          <input
            style={modalStyles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="cth: BCA Utama"
            required
          />

          <label style={modalStyles.label}>Jenis</label>
          <select style={modalStyles.input} value={type} onChange={(e) => setType(e.target.value as WalletType)}>
            <option value="bank">Bank</option>
            <option value="ewallet">E-Wallet</option>
            <option value="cash">Tunai</option>
            <option value="investment">Investasi</option>
          </select>

          <label style={modalStyles.label}>Nama Bank / Platform (opsional)</label>
          <input
            style={modalStyles.input}
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="cth: BCA, GoPay, OVO"
          />

          <label style={modalStyles.label}>Saldo Awal (Rp)</label>
          <input
            style={modalStyles.input}
            type="number"
            min="0"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0"
          />

          {error && <p style={modalStyles.error}>{error}</p>}

          <div style={modalStyles.actions}>
            <button type="button" onClick={onClose} style={modalStyles.cancelBtn}>Batal</button>
            <button type="submit" disabled={saving} style={modalStyles.saveBtn}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── WALLET CARD ──────────────────────────────────────────────

interface WalletCardProps {
  wallet: Wallet
  onDelete: (id: string) => void
}

function WalletCard({ wallet, onDelete }: WalletCardProps) {
  const color = WALLET_TYPE_COLOR[wallet.type] || '#6b7280'
  return (
    <div style={{ ...cardStyles.card, borderTop: `4px solid ${color}` }}>
      <div style={cardStyles.header}>
        <div>
          <p style={cardStyles.type}>{WALLET_TYPE_LABEL[wallet.type] || wallet.type}</p>
          <h4 style={cardStyles.name}>{wallet.name}</h4>
          {wallet.bank_name && <p style={cardStyles.bank}>{wallet.bank_name}</p>}
        </div>
        <button
          onClick={() => onDelete(wallet.id)}
          style={cardStyles.deleteBtn}
          title="Hapus wallet"
        >
          ✕
        </button>
      </div>
      <p style={cardStyles.balance}>{formatRupiah(Number(wallet.balance))}</p>
    </div>
  )
}

// ── WALLET PAGE ──────────────────────────────────────────────

export default function WalletPage() {
  const { wallets, isLoading, error, fetchWallets, addWallet, deleteWallet, totalBalance } = useWalletStore()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchWallets()
  }, [])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus wallet ini?')) return
    try {
      await deleteWallet(id)
    } catch {
      alert('Gagal menghapus wallet')
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Dompet & Rekening</h2>
          <p style={styles.totalLabel}>
            Total Saldo: <span style={styles.totalAmount}>{formatRupiah(totalBalance())}</span>
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={styles.addBtn}>+ Tambah Wallet</button>
      </div>

      {isLoading && <p style={styles.info}>Memuat...</p>}
      {error && <p style={styles.errorText}>{error}</p>}

      {!isLoading && wallets.length === 0 && (
        <div style={styles.empty}>
          <p style={styles.emptyIcon}>💳</p>
          <p style={styles.emptyText}>Belum ada wallet. Tambahkan rekening atau dompet pertama kamu!</p>
        </div>
      )}

      <div style={styles.grid}>
        {wallets.map((w) => (
          <WalletCard key={w.id} wallet={w} onDelete={handleDelete} />
        ))}
      </div>

      {showModal && (
        <AddWalletModal onClose={() => setShowModal(false)} onSave={addWallet} />
      )}
    </div>
  )
}

// ── STYLES ───────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '1.5rem', maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  title: { margin: '0 0 0.25rem', fontSize: '1.5rem', color: '#1a1a1a' },
  totalLabel: { margin: 0, fontSize: '0.9rem', color: '#666' },
  totalAmount: { fontWeight: 700, color: '#2563eb' },
  addBtn: { padding: '0.6rem 1.2rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' },
  info: { color: '#666', textAlign: 'center' },
  errorText: { color: '#dc2626', backgroundColor: '#fee2e2', padding: '0.75rem', borderRadius: '8px' },
  empty: { textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' },
  emptyIcon: { fontSize: '3rem', margin: '0 0 0.5rem' },
  emptyText: { margin: 0, fontSize: '0.95rem' },
}

const cardStyles: Record<string, React.CSSProperties> = {
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' },
  type: { margin: '0 0 0.2rem', fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' },
  name: { margin: '0 0 0.2rem', fontSize: '1rem', color: '#1a1a1a' },
  bank: { margin: 0, fontSize: '0.8rem', color: '#6b7280' },
  balance: { margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1a1a1a' },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '1rem', padding: '0.25rem', lineHeight: 1 },
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  box: { backgroundColor: 'white', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' },
  title: { margin: '0 0 1.5rem', fontSize: '1.2rem', color: '#1a1a1a' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  label: { fontSize: '0.85rem', fontWeight: 600, color: '#374151' },
  input: { padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem', width: '100%', boxSizing: 'border-box' },
  error: { color: '#dc2626', fontSize: '0.85rem', margin: 0 },
  actions: { display: 'flex', gap: '0.75rem', marginTop: '0.5rem' },
  cancelBtn: { flex: 1, padding: '0.65rem', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
  saveBtn: { flex: 1, padding: '0.65rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
}
