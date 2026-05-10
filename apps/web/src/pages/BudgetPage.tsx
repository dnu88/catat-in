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

function getBudgetTone(spent: number, limit: number, notifyAt: number) {
  const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0
  const isOver = spent > limit
  const isNear = pct >= notifyAt && !isOver

  if (isOver) return 'over'
  if (isNear) return 'warn'
  return 'ok'
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
    <div className='modal-overlay'>
      <div className='modal-box animate-slide-up' style={{ maxWidth: '460px' }}>
        <h3 style={{ margin: '0 0 16px', color: 'var(--text-primary)' }}>{initialData ? 'Edit Budget' : 'Tambah Budget Bulan Ini'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px' }}>
          <label className='form-label'>Kategori</label>
          <select className='form-input' value={category} onChange={(e) => setCategory(e.target.value)}>
            {selectableCategories.map((item) => (
              <option key={item.id} value={item.name}>
                {item.label}
              </option>
            ))}
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
            <input
              className='form-input'
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder='Tambah kategori kustom'
            />
            <button type='button' onClick={handleCreateCategory} disabled={categorySaving} className='btn btn-secondary'>
              {categorySaving ? 'Menyimpan...' : 'Tambah'}
            </button>
          </div>

          {!selectedCategory?.is_default ? (
            <div style={{ textAlign: 'right', marginTop: '-4px' }}>
              <button
                type='button'
                onClick={handleDeleteCategory}
                className='btn btn-danger'
                style={{ minHeight: '30px', padding: '4px 10px' }}
              >
                Hapus kategori ini
              </button>
            </div>
          ) : null}

          <label className='form-label'>Batas Pengeluaran (Rp)</label>
          <input
            className='form-input'
            type='number'
            min='1000'
            step='1000'
            value={limitAmount}
            onChange={(e) => setLimitAmount(e.target.value)}
            placeholder='500000'
            required
          />

          <label className='form-label'>Notifikasi saat mencapai (%)</label>
          <input className='form-input' type='number' min='1' max='100' value={notifyAt} onChange={(e) => setNotifyAt(e.target.value)} />

          {categoryError ? (
            <p style={errorStyle}>{categoryError}</p>
          ) : null}
          {error ? (
            <p style={errorStyle}>{error}</p>
          ) : null}

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type='button' onClick={onClose} className='btn btn-secondary' style={{ flex: 1 }}>
              Batal
            </button>
            <button type='submit' disabled={saving} className='btn btn-primary' style={{ flex: 1 }}>
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
  const limit = Number(budget.limit_amount) || 0
  const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0
  const tone = getBudgetTone(spent, limit, budget.notify_at_percent || 80)
  const isOver = tone === 'over'

  return (
    <div className='card page-section-card' style={{ padding: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 3px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {CATEGORY_LABEL[budget.category] || budget.category}
          </p>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {formatRupiah(spent)}{' '}
            <span style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: '12px' }}>/ {formatRupiah(limit)}</span>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--r-pill)',
              fontSize: '11px',
              fontWeight: 700,
              border: '1px solid transparent',
              background:
                tone === 'over'
                  ? 'color-mix(in srgb, var(--red) 16%, transparent)'
                  : tone === 'warn'
                    ? 'color-mix(in srgb, var(--amber) 16%, transparent)'
                    : 'color-mix(in srgb, var(--accent) 14%, transparent)',
              color: tone === 'over' ? 'var(--red)' : tone === 'warn' ? 'var(--amber)' : 'var(--accent)',
              borderColor:
                tone === 'over'
                  ? 'color-mix(in srgb, var(--red) 28%, transparent)'
                  : tone === 'warn'
                    ? 'color-mix(in srgb, var(--amber) 30%, transparent)'
                    : 'color-mix(in srgb, var(--accent) 30%, transparent)',
            }}
          >
            {pct}%
          </span>
          <button onClick={() => onEdit(budget)} className='btn btn-secondary' style={{ minHeight: '30px', padding: '5px 8px' }} title='Edit'>
            ✏️
          </button>
          <button onClick={() => onDelete(budget.id)} className='btn btn-danger' style={{ minHeight: '30px', padding: '5px 8px' }} title='Hapus'>
            ✕
          </button>
        </div>
      </div>

      <div className='progress-track' style={{ marginTop: '10px', marginBottom: isOver ? '8px' : 0 }}>
        <div className={`progress-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>

      {isOver ? (
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--red)', fontWeight: 600 }}>
          Budget terlampaui sebesar {formatRupiah(spent - limit)}
        </p>
      ) : null}
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
    () =>
      buildCategoryOptions(categories, 'expense').map((item) => {
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
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <h2 className='page-title'>{language === 'id' ? 'Anggaran' : 'Budgets'}</h2>
          <p className='page-subtitle'>Periode: {periodLabel}</p>
        </div>
        <button
          onClick={() => {
            setEditingBudget(null)
            setShowModal(true)
          }}
          className='btn btn-primary'
        >
          + {language === 'id' ? 'Tambah Budget' : 'Add Budget'}
        </button>
      </div>

      {isLoading ? (
        <div className='card page-section-card' style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{language === 'id' ? 'Memuat...' : 'Loading...'}</p>
        </div>
      ) : null}

      {error ? (
        <div className='page-section-card' style={errorPanelStyle}>
          <p style={{ margin: 0, color: 'var(--red)', fontWeight: 600 }}>{error}</p>
        </div>
      ) : null}

      {categoryError ? (
        <div className='page-section-card' style={errorPanelStyle}>
          <p style={{ margin: 0, color: 'var(--red)', fontWeight: 600 }}>{categoryError}</p>
        </div>
      ) : null}

      {!isLoading && budgets.length === 0 ? (
        <div className='card page-section-card' style={{ textAlign: 'center', padding: '30px 18px' }}>
          <p style={{ fontSize: '36px', margin: '0 0 8px' }}>📊</p>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {language === 'id'
              ? 'Belum ada anggaran bulan ini. Buat budget untuk mulai memantau pengeluaran!'
              : 'No budget for this month yet. Create one to track your spending.'}
          </p>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        {budgets.map((budget) => (
          <BudgetCard
            key={budget.id}
            budget={budget}
            onEdit={(item) => {
              setEditingBudget(item)
              setShowModal(true)
            }}
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

const errorStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '12px',
  color: 'var(--red)',
  background: 'color-mix(in srgb, var(--red) 16%, transparent)',
  border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
  padding: '8px 10px',
  borderRadius: 'var(--r-sm)',
}

const errorPanelStyle: React.CSSProperties = {
  background: 'color-mix(in srgb, var(--red) 12%, var(--bg-card))',
  border: '1px solid color-mix(in srgb, var(--red) 28%, transparent)',
}
