import { useEffect, useMemo, useState } from 'react'
import { useBudgetStore } from '@store/budget.store'
import { useCategoryStore } from '@store/category.store'
import { CATEGORY_LABEL, buildCategoryOptions } from '@lib/categories'
import { useI18nStore } from '@store/i18n.store'

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function currentPeriodStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function BudgetModal({
  initialData,
  categories,
  categoryError,
  onCreateCategory,
  onDeleteCategory,
  onClose,
  onSave,
}: {
  initialData?: any
  categories: Array<{ id: string; name: string; label: string; is_default: boolean }>
  categoryError: string | null
  onCreateCategory: (name: string) => Promise<string>
  onDeleteCategory: (id: string) => Promise<void>
  onClose: () => void
  onSave: (d: any) => Promise<void>
}) {
  const [category, setCategory] = useState<string>(initialData?.category || categories[0]?.name || 'food')
  const [customName, setCustomName] = useState('')
  const [limitAmount, setLimitAmount] = useState(initialData?.limit_amount?.toString() || '')
  const [notifyAt, setNotifyAt] = useState(initialData?.notify_at_percent?.toString() || '80')
  const [saving, setSaving] = useState(false)
  const [categorySaving, setCategorySaving] = useState(false)
  const [error, setError] = useState('')

  const selectedCategory = categories.find((item) => item.name === category)
  const selectableCategories = categories.length
    ? categories
    : [{ id: 'default-food', name: 'food', label: 'Makan & Minum', is_default: true }]

  const handleCreateCategory = async () => {
    const trimmed = customName.trim()
    if (!trimmed) {
      setError('Nama kategori kustom tidak boleh kosong.')
      return
    }

    setCategorySaving(true)
    setError('')
    try {
      const createdName = await onCreateCategory(trimmed)
      setCategory(createdName)
      setCustomName('')
    } catch (err: any) {
      setError(err.message || 'Gagal membuat kategori kustom.')
    } finally {
      setCategorySaving(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!selectedCategory || selectedCategory.is_default) return
    if (!window.confirm(`Hapus kategori kustom '${selectedCategory.label}'?`)) return

    setError('')
    try {
      await onDeleteCategory(selectedCategory.id)
      setCategory(categories.find((item) => item.is_default)?.name || 'food')
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus kategori.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const limit = parseFloat(limitAmount)
    if (!limit || limit <= 0) return setError('Nominal harus lebih dari 0')
    if (!category.trim()) return setError('Kategori tidak boleh kosong')

    setSaving(true)
    try {
      await onSave({
        category: category.trim(),
        limit_amount: limit,
        period: 'monthly',
        period_start: currentPeriodStart(),
        notify_at_percent: parseInt(notifyAt, 10) || 80,
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan budget')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.box}>
        <h3 style={modalStyles.title}>{initialData ? 'Edit Budget' : 'Tambah Budget Bulan Ini'}</h3>
        <form onSubmit={handleSubmit} style={modalStyles.form}>
          <label style={modalStyles.label}>Kategori</label>
          <select style={modalStyles.input} value={category} onChange={(e) => setCategory(e.target.value)}>
            {selectableCategories.map((item) => (
              <option key={item.id} value={item.name}>
                {item.label}
              </option>
            ))}
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
            <input
              style={modalStyles.input}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Tambah kategori kustom"
            />
            <button type="button" onClick={handleCreateCategory} disabled={categorySaving} style={modalStyles.secondaryBtn}>
              {categorySaving ? 'Menyimpan...' : 'Tambah'}
            </button>
          </div>

          {!selectedCategory?.is_default ? (
            <div style={{ textAlign: 'right', marginTop: '-4px' }}>
              <button type="button" onClick={handleDeleteCategory} style={modalStyles.linkDanger}>
                Hapus kategori ini
              </button>
            </div>
          ) : null}

          <label style={modalStyles.label}>Batas Pengeluaran (Rp)</label>
          <input
            style={modalStyles.input}
            type="number"
            min="1000"
            step="1000"
            value={limitAmount}
            onChange={(e) => setLimitAmount(e.target.value)}
            placeholder="500000"
            required
          />

          <label style={modalStyles.label}>Notifikasi saat mencapai (%)</label>
          <input
            style={modalStyles.input}
            type="number"
            min="1"
            max="100"
            value={notifyAt}
            onChange={(e) => setNotifyAt(e.target.value)}
          />

          {categoryError ? <p style={modalStyles.error}>{categoryError}</p> : null}
          {error ? <p style={modalStyles.error}>{error}</p> : null}

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

function BudgetCard({ budget, onEdit, onDelete }: { budget: any; onEdit: (b: any) => void; onDelete: (id: string) => void }) {
  const spent = Number(budget.spent_amount) || 0
  const limit = Number(budget.limit_amount)
  const pct = Math.min(Math.round((spent / limit) * 100), 100)
  const isOver = spent > limit
  const isNear = pct >= budget.notify_at_percent && !isOver
  const barColor = isOver ? '#dc2626' : isNear ? '#f59e0b' : '#2563eb'

  return (
    <div style={cardStyles.card}>
      <div style={cardStyles.header}>
        <div>
          <p style={cardStyles.category}>{CATEGORY_LABEL[budget.category] || budget.category}</p>
          <p style={cardStyles.amounts}>
            {formatRupiah(spent)} <span style={cardStyles.limit}>/ {formatRupiah(limit)}</span>
          </p>
        </div>
        <div style={cardStyles.right}>
          <span style={{ ...cardStyles.badge, backgroundColor: isOver ? '#fee2e2' : isNear ? '#fef3c7' : '#eff6ff', color: isOver ? '#dc2626' : isNear ? '#92400e' : '#1d4ed8' }}>
            {pct}%
          </span>
          <button onClick={() => onEdit(budget)} style={cardStyles.iconBtn} title="Edit">✏️</button>
          <button onClick={() => onDelete(budget.id)} style={cardStyles.iconBtn} title="Hapus">✕</button>
        </div>
      </div>
      <div style={cardStyles.barBg}>
        <div style={{ ...cardStyles.barFill, width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      {isOver ? <p style={cardStyles.warning}>Budget terlampaui sebesar {formatRupiah(spent - limit)}</p> : null}
    </div>
  )
}

export default function BudgetPage() {
  const { language } = useI18nStore()
  const { budgets, isLoading, error, fetchBudgets, addBudget, updateBudget, deleteBudget } = useBudgetStore()
  const {
    categories,
    error: categoryError,
    fetchCategories,
    createCategory,
    deleteCategory,
  } = useCategoryStore()
  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState<any>(null)

  useEffect(() => {
    fetchBudgets(currentPeriodStart())
    fetchCategories('expense')
  }, [fetchBudgets, fetchCategories])

  const expenseCategories = useMemo(
    () => buildCategoryOptions(categories, 'expense').map((item) => {
      const match = categories.find((category) => category.name === item.value)
      return {
        id: match?.id || item.value,
        name: item.value,
        label: item.label.replace(/^[^\s]+\s/, ''),
        is_default: Boolean(match?.is_default),
      }
    }),
    [categories],
  )

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus budget ini?')) return
    try {
      await deleteBudget(id)
    } catch {
      alert('Gagal menghapus budget')
    }
  }

  const handleSave = async (data: any) => {
    if (editingBudget) {
      await updateBudget(editingBudget.id, data)
      return
    }
    await addBudget(data)
  }

  const handleCreateCategory = async (name: string) => {
    const created = await createCategory({ name, type: 'expense' })
    return created.name
  }

  const now = new Date()
  const periodLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{language === 'id' ? 'Anggaran' : 'Budgets'}</h2>
          <p style={styles.period}>Periode: {periodLabel}</p>
        </div>
        <button onClick={() => { setEditingBudget(null); setShowModal(true) }} style={styles.addBtn}>
          + {language === 'id' ? 'Tambah Budget' : 'Add Budget'}
        </button>
      </div>

      {isLoading ? <p style={styles.info}>{language === 'id' ? 'Memuat...' : 'Loading...'}</p> : null}
      {error ? <p style={styles.errorText}>{error}</p> : null}
      {categoryError ? <p style={styles.errorText}>{categoryError}</p> : null}

      {!isLoading && budgets.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyIcon}>📊</p>
          <p>{language === 'id' ? 'Belum ada anggaran bulan ini. Buat budget untuk mulai memantau pengeluaran!' : 'No budget for this month yet. Create one to track your spending.'}</p>
        </div>
      ) : null}

      <div style={styles.grid}>
        {budgets.map((budget) => (
          <BudgetCard
            key={budget.id}
            budget={budget}
            onEdit={(item) => { setEditingBudget(item); setShowModal(true) }}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {showModal ? (
        <BudgetModal
          initialData={editingBudget}
          categories={expenseCategories}
          categoryError={categoryError}
          onCreateCategory={handleCreateCategory}
          onDeleteCategory={deleteCategory}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '1.5rem', maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  title: { margin: '0 0 0.2rem', fontSize: '1.5rem', color: '#1a1a1a' },
  period: { margin: 0, fontSize: '0.85rem', color: '#9ca3af' },
  addBtn: { padding: '0.6rem 1.2rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' },
  info: { color: '#666', textAlign: 'center' },
  errorText: { color: '#dc2626', backgroundColor: '#fee2e2', padding: '0.75rem', borderRadius: '8px' },
  empty: { textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' },
  emptyIcon: { fontSize: '3rem', margin: '0 0 0.5rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' },
}

const cardStyles: Record<string, React.CSSProperties> = {
  card: { backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' },
  category: { margin: '0 0 0.2rem', fontSize: '0.9rem', fontWeight: 700, color: '#1a1a1a' },
  amounts: { margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1a1a1a' },
  limit: { fontWeight: 400, color: '#9ca3af', fontSize: '0.85rem' },
  right: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  badge: { padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.9rem', padding: '0.2rem' },
  barBg: { height: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' },
  barFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' },
  warning: { margin: 0, fontSize: '0.8rem', color: '#dc2626' },
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' },
  box: { backgroundColor: 'white', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '460px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' },
  title: { margin: '0 0 1.25rem', fontSize: '1.2rem', color: '#1a1a1a' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  label: { fontSize: '0.85rem', fontWeight: 600, color: '#374151' },
  input: { padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem', width: '100%', boxSizing: 'border-box' },
  error: { color: '#dc2626', fontSize: '0.85rem', margin: 0 },
  actions: { display: 'flex', gap: '0.75rem', marginTop: '0.5rem' },
  cancelBtn: { flex: 1, padding: '0.65rem', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
  saveBtn: { flex: 1, padding: '0.65rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
  secondaryBtn: { padding: '0.65rem 1rem', backgroundColor: '#1d4ed8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
  linkDanger: { background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer', padding: 0 },
}
