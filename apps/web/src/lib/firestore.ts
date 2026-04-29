import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore'
import type { User as FirebaseUser } from 'firebase/auth'
import {
  type BillFormData,
  type BillReminder,
  type Budget,
  type BudgetFormData,
  type Category,
  type PlanType,
  type Transaction,
  type TransactionFormData,
  type TransactionType,
  type User,
  type Wallet,
} from '@catat-in/shared/types'
import { auth, db } from './firebase'

type BillRecurrence = BillReminder['recurrence']

export interface TransactionFilters {
  type?: 'income' | 'expense'
  category?: string
  wallet_id?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

const DEFAULT_CATEGORIES: Array<Omit<Category, 'id'>> = [
  { name: 'food', label: 'Makan & Minum', type: 'expense', icon: '🍔', is_default: true },
  { name: 'transport', label: 'Transportasi', type: 'expense', icon: '🚗', is_default: true },
  { name: 'shopping', label: 'Belanja', type: 'expense', icon: '🛒', is_default: true },
  { name: 'health', label: 'Kesehatan', type: 'expense', icon: '💊', is_default: true },
  { name: 'entertainment', label: 'Hiburan', type: 'expense', icon: '🎬', is_default: true },
  { name: 'education', label: 'Pendidikan', type: 'expense', icon: '📚', is_default: true },
  { name: 'housing', label: 'Rumah', type: 'expense', icon: '🏠', is_default: true },
  { name: 'other', label: 'Lainnya', type: 'expense', icon: '📦', is_default: true },
  { name: 'salary', label: 'Gaji', type: 'income', icon: '💼', is_default: true },
  { name: 'freelance', label: 'Freelance', type: 'income', icon: '💻', is_default: true },
  { name: 'investment', label: 'Investasi', type: 'income', icon: '📈', is_default: true },
  { name: 'other', label: 'Lainnya', type: 'income', icon: '📦', is_default: true },
]

function isoNow() {
  return new Date().toISOString()
}

function startOfMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function slugifyCategoryName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function usersDoc(uid: string) {
  return doc(db, 'users', uid)
}

function usersCollection(uid: string, name: 'wallets' | 'transactions' | 'budgets' | 'bills' | 'categories') {
  return collection(db, 'users', uid, name)
}

export function requireAuthUid() {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.')
  return uid
}

export async function ensureUserProfileFromAuth(firebaseUser: FirebaseUser): Promise<User> {
  const uid = firebaseUser.uid
  const profileRef = usersDoc(uid)
  const snapshot = await getDoc(profileRef)
  const existing = snapshot.exists() ? (snapshot.data() as Partial<User>) : null

  const fullName =
    firebaseUser.displayName?.trim()
    || existing?.full_name
    || firebaseUser.email?.split('@')[0]
    || 'Pengguna'

  const profile: User = {
    id: uid,
    email: firebaseUser.email || existing?.email || '',
    full_name: fullName,
    avatar_url: firebaseUser.photoURL || existing?.avatar_url,
    plan_type: (existing?.plan_type as PlanType) || 'free',
    plan_expires_at: existing?.plan_expires_at,
    group_id: existing?.group_id,
    created_at: existing?.created_at || isoNow(),
  }

  await setDoc(profileRef, profile, { merge: true })
  await ensureDefaultCategories(uid)
  return profile
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const snapshot = await getDoc(usersDoc(uid))
  if (!snapshot.exists()) return null
  return snapshot.data() as User
}

export async function ensureDefaultCategories(uid: string) {
  const categoryRef = usersCollection(uid, 'categories')
  const existing = await getDocs(query(categoryRef))
  if (!existing.empty) return

  await Promise.all(
    DEFAULT_CATEGORIES.map((item) => {
      const id = `${item.type}-${item.name}`
      return setDoc(doc(db, 'users', uid, 'categories', id), { ...item, id })
    }),
  )
}

export async function listCategories(uid: string, type?: TransactionType): Promise<Category[]> {
  await ensureDefaultCategories(uid)
  const constraints: QueryConstraint[] = []
  if (type) constraints.push(where('type', '==', type))
  constraints.push(orderBy('label'))

  const snapshot = await getDocs(query(usersCollection(uid, 'categories'), ...constraints))
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Category, 'id'>) }))
}

export async function createCategory(
  uid: string,
  payload: { name: string; type: TransactionType; icon?: string | null },
): Promise<Category> {
  const normalized = slugifyCategoryName(payload.name)
  if (!normalized) throw new Error('Nama kategori tidak valid.')

  const existing = await getDocs(
    query(
      usersCollection(uid, 'categories'),
      where('type', '==', payload.type),
      where('name', '==', normalized),
    ),
  )

  if (!existing.empty) throw new Error('Kategori dengan nama ini sudah ada.')

  const label = payload.name.trim().replace(/\s+/g, ' ')
  const docRef = await addDoc(usersCollection(uid, 'categories'), {
    name: normalized,
    label,
    type: payload.type,
    icon: payload.icon || null,
    is_default: false,
  })

  return {
    id: docRef.id,
    name: normalized,
    label,
    type: payload.type,
    icon: payload.icon || null,
    is_default: false,
  }
}

export async function removeCategory(uid: string, categoryId: string): Promise<void> {
  const ref = doc(db, 'users', uid, 'categories', categoryId)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return
  const category = snapshot.data() as Category
  if (category.is_default) throw new Error('Kategori bawaan tidak dapat dihapus.')
  await deleteDoc(ref)
}

export async function listWallets(uid: string): Promise<Wallet[]> {
  const snapshot = await getDocs(query(usersCollection(uid, 'wallets'), orderBy('created_at', 'desc')))
  return snapshot.docs.map((item) => {
    const value = item.data() as Omit<Wallet, 'id'>
    return {
      id: item.id,
      ...value,
      balance: Number(value.balance || 0),
      currency: value.currency || 'IDR',
      is_shared: Boolean(value.is_shared),
      is_active: value.is_active ?? true,
    }
  })
}

export async function addWallet(
  uid: string,
  payload: {
    name: string
    type: 'bank' | 'ewallet' | 'cash' | 'investment'
    balance: number
    bank_name?: string
    account_number?: string
  },
): Promise<Wallet> {
  const record: Omit<Wallet, 'id'> = {
    user_id: uid,
    name: payload.name.trim(),
    type: payload.type,
    balance: Number(payload.balance || 0),
    currency: 'IDR',
    bank_name: payload.bank_name?.trim() || undefined,
    account_number: payload.account_number?.trim() || undefined,
    is_shared: false,
    group_id: undefined,
    is_active: true,
    created_at: isoNow(),
  }
  const docRef = await addDoc(usersCollection(uid, 'wallets'), record)
  return { id: docRef.id, ...record }
}

export async function patchWallet(
  uid: string,
  walletId: string,
  patch: Partial<{
    name: string
    type: 'bank' | 'ewallet' | 'cash' | 'investment'
    balance: number
    bank_name?: string
    account_number?: string
  }>,
) {
  const payload: Record<string, unknown> = {}
  if (typeof patch.name === 'string') payload.name = patch.name.trim()
  if (patch.type) payload.type = patch.type
  if (typeof patch.balance === 'number') payload.balance = patch.balance
  if (typeof patch.bank_name === 'string') payload.bank_name = patch.bank_name.trim()
  if (typeof patch.account_number === 'string') payload.account_number = patch.account_number.trim()
  await updateDoc(doc(db, 'users', uid, 'wallets', walletId), payload)
}

export async function removeWallet(uid: string, walletId: string) {
  await deleteDoc(doc(db, 'users', uid, 'wallets', walletId))
}

function applyTransactionFilters(items: Transaction[], filters: TransactionFilters) {
  return items.filter((item) => {
    if (filters.type && item.type !== filters.type) return false
    if (filters.category && item.category !== filters.category) return false
    if (filters.wallet_id && item.wallet_id !== filters.wallet_id) return false
    if (filters.date_from && item.date < filters.date_from) return false
    if (filters.date_to && item.date > filters.date_to) return false
    return true
  })
}

function toTransaction(item: { id: string; data: Record<string, any> }): Transaction {
  return {
    id: item.id,
    wallet_id: item.data.wallet_id,
    user_id: item.data.user_id,
    type: item.data.type,
    amount: Number(item.data.amount || 0),
    category: item.data.category,
    note: item.data.note,
    merchant: item.data.merchant,
    date: item.data.date,
    receipt_url: item.data.receipt_url,
    is_shared: Boolean(item.data.is_shared),
    visibility: item.data.visibility || 'private',
    group_id: item.data.group_id,
    on_behalf_of: item.data.on_behalf_of,
    created_by: item.data.created_by || item.data.user_id,
    is_disputed: Boolean(item.data.is_disputed),
    dispute_resolved_at: item.data.dispute_resolved_at,
    created_at: item.data.created_at || isoNow(),
  }
}

function signedAmount(type: TransactionType, amount: number) {
  return type === 'income' ? amount : -amount
}

async function applyWalletDelta(uid: string, walletId: string, delta: number) {
  if (!walletId || delta === 0) return
  const walletRef = doc(db, 'users', uid, 'wallets', walletId)
  await runTransaction(db, async (transaction) => {
    const walletSnap = await transaction.get(walletRef)
    if (!walletSnap.exists()) throw new Error('Wallet tidak ditemukan.')
    transaction.update(walletRef, { balance: increment(delta) })
  })
}

export async function listTransactions(
  uid: string,
  filters: TransactionFilters,
): Promise<{ data: Transaction[]; total: number }> {
  const snapshot = await getDocs(query(usersCollection(uid, 'transactions'), orderBy('date', 'desc')))
  const all = snapshot.docs.map((item) => toTransaction({ id: item.id, data: item.data() as Record<string, any> }))
  const filtered = applyTransactionFilters(all, filters)
  const page = filters.page || 1
  const perPage = filters.per_page || 20
  const start = (page - 1) * perPage
  return {
    data: filtered.slice(start, start + perPage),
    total: filtered.length,
  }
}

export async function createTransaction(uid: string, payload: TransactionFormData): Promise<Transaction> {
  const amount = Number(payload.amount || 0)
  const record: Omit<Transaction, 'id'> = {
    wallet_id: payload.wallet_id,
    user_id: uid,
    type: payload.type,
    amount,
    category: payload.category,
    note: payload.note,
    merchant: payload.merchant,
    date: payload.date,
    receipt_url: undefined,
    is_shared: Boolean(payload.is_shared),
    visibility: 'private',
    group_id: undefined,
    on_behalf_of: payload.on_behalf_of,
    created_by: uid,
    is_disputed: false,
    dispute_resolved_at: undefined,
    created_at: isoNow(),
  }

  const docRef = await addDoc(usersCollection(uid, 'transactions'), record)
  await applyWalletDelta(uid, payload.wallet_id, signedAmount(payload.type, amount))
  return { id: docRef.id, ...record }
}

export async function patchTransaction(
  uid: string,
  transactionId: string,
  patch: Partial<TransactionFormData>,
): Promise<Transaction> {
  const txRef = doc(db, 'users', uid, 'transactions', transactionId)
  const snap = await getDoc(txRef)
  if (!snap.exists()) throw new Error('Transaksi tidak ditemukan.')
  const previous = toTransaction({ id: snap.id, data: snap.data() as Record<string, any> })

  const next: Transaction = {
    ...previous,
    ...patch,
    amount: patch.amount !== undefined ? Number(patch.amount) : previous.amount,
  }

  await setDoc(txRef, next, { merge: true })

  const previousSigned = signedAmount(previous.type, previous.amount)
  const nextSigned = signedAmount(next.type, next.amount)

  if (previous.wallet_id === next.wallet_id) {
    await applyWalletDelta(uid, next.wallet_id, nextSigned - previousSigned)
  } else {
    await applyWalletDelta(uid, previous.wallet_id, -previousSigned)
    await applyWalletDelta(uid, next.wallet_id, nextSigned)
  }

  return next
}

export async function removeTransaction(uid: string, transactionId: string) {
  const txRef = doc(db, 'users', uid, 'transactions', transactionId)
  const snap = await getDoc(txRef)
  if (snap.exists()) {
    const existing = toTransaction({ id: snap.id, data: snap.data() as Record<string, any> })
    await applyWalletDelta(uid, existing.wallet_id, -signedAmount(existing.type, existing.amount))
  }
  await deleteDoc(txRef)
}

function toBudget(item: { id: string; data: Record<string, any> }): Budget {
  return {
    id: item.id,
    user_id: item.data.user_id,
    group_id: item.data.group_id,
    category: item.data.category,
    limit_amount: Number(item.data.limit_amount || 0),
    spent_amount: Number(item.data.spent_amount || 0),
    period: 'monthly',
    period_start: item.data.period_start || startOfMonth(),
    notify_at_percent: Number(item.data.notify_at_percent || 80),
    is_active: item.data.is_active ?? true,
    created_at: item.data.created_at || isoNow(),
  }
}

export async function listBudgets(uid: string, periodStart?: string): Promise<Array<Budget & { spent_amount: number }>> {
  const constraints: QueryConstraint[] = [orderBy('created_at', 'desc')]
  if (periodStart) constraints.unshift(where('period_start', '==', periodStart))
  const snapshot = await getDocs(query(usersCollection(uid, 'budgets'), ...constraints))
  return snapshot.docs.map((item) => toBudget({ id: item.id, data: item.data() as Record<string, any> }))
}

export async function createBudget(uid: string, payload: BudgetFormData): Promise<Budget> {
  const record: Omit<Budget, 'id'> = {
    user_id: uid,
    group_id: payload.group_id,
    category: payload.category,
    limit_amount: Number(payload.limit_amount || 0),
    spent_amount: 0,
    period: 'monthly',
    period_start: payload.period_start || startOfMonth(),
    notify_at_percent: Number(payload.notify_at_percent || 80),
    is_active: true,
    created_at: isoNow(),
  }
  const docRef = await addDoc(usersCollection(uid, 'budgets'), record)
  return { id: docRef.id, ...record }
}

export async function patchBudget(uid: string, budgetId: string, patch: Partial<BudgetFormData>) {
  const payload: Record<string, unknown> = {}
  if (patch.category) payload.category = patch.category
  if (typeof patch.limit_amount === 'number') payload.limit_amount = patch.limit_amount
  if (patch.period_start) payload.period_start = patch.period_start
  if (typeof patch.notify_at_percent === 'number') payload.notify_at_percent = patch.notify_at_percent
  await updateDoc(doc(db, 'users', uid, 'budgets', budgetId), payload)
}

export async function removeBudget(uid: string, budgetId: string) {
  await deleteDoc(doc(db, 'users', uid, 'budgets', budgetId))
}

function computeNextDueDate(dueDay: number, recurrence: BillRecurrence, from = new Date()) {
  const safeDay = Math.min(Math.max(dueDay, 1), 31)
  const year = from.getFullYear()
  const month = from.getMonth()

  const candidate = new Date(year, month, safeDay)
  candidate.setHours(0, 0, 0, 0)

  const base = new Date(from)
  base.setHours(0, 0, 0, 0)

  if (candidate < base) {
    if (recurrence === 'yearly') {
      candidate.setFullYear(candidate.getFullYear() + 1)
    } else {
      candidate.setMonth(candidate.getMonth() + 1)
    }
  }

  return candidate.toISOString().split('T')[0]
}

function toBill(item: { id: string; data: Record<string, any> }): BillReminder {
  return {
    id: item.id,
    user_id: item.data.user_id,
    name: item.data.name,
    amount: Number(item.data.amount || 0),
    due_day: Number(item.data.due_day || 1),
    recurrence: item.data.recurrence,
    next_due_date: item.data.next_due_date,
    icon: item.data.icon,
    is_active: item.data.is_active ?? true,
    is_paid: Boolean(item.data.is_paid),
    paid_at: item.data.paid_at,
    payment_history: item.data.payment_history || [],
    notify_before_days: item.data.notify_before_days || [3, 1],
    created_at: item.data.created_at || isoNow(),
  }
}

export async function listBills(uid: string): Promise<BillReminder[]> {
  const snapshot = await getDocs(query(usersCollection(uid, 'bills'), orderBy('next_due_date', 'asc')))
  return snapshot.docs
    .map((item) => toBill({ id: item.id, data: item.data() as Record<string, any> }))
    .filter((item) => item.is_active)
}

export async function createBill(uid: string, payload: BillFormData): Promise<BillReminder> {
  const record: Omit<BillReminder, 'id'> = {
    user_id: uid,
    name: payload.name.trim(),
    amount: Number(payload.amount || 0),
    due_day: payload.due_day,
    recurrence: payload.recurrence,
    next_due_date: computeNextDueDate(payload.due_day, payload.recurrence),
    icon: payload.icon || '📄',
    is_active: true,
    is_paid: false,
    paid_at: undefined,
    payment_history: [],
    notify_before_days: payload.notify_before_days || [3, 1],
    created_at: isoNow(),
  }
  const docRef = await addDoc(usersCollection(uid, 'bills'), record)
  return { id: docRef.id, ...record }
}

export async function markBillPaid(uid: string, billId: string): Promise<BillReminder> {
  const ref = doc(db, 'users', uid, 'bills', billId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Tagihan tidak ditemukan.')
  const existing = toBill({ id: snap.id, data: snap.data() as Record<string, any> })

  const paidAt = isoNow()
  const historyEntry = {
    paid_at: paidAt,
    amount: existing.amount,
    next_due_date_before_payment: existing.next_due_date,
  }

  if (existing.recurrence === 'once') {
    const nextState: BillReminder = {
      ...existing,
      is_active: false,
      is_paid: true,
      paid_at: paidAt,
      payment_history: [...(existing.payment_history || []), historyEntry],
    }
    await setDoc(ref, nextState, { merge: true })
    return nextState
  }

  const nextDue = computeNextDueDate(existing.due_day, existing.recurrence, new Date(Date.now() + 86_400_000))
  const nextState: BillReminder = {
    ...existing,
    is_active: true,
    is_paid: false,
    paid_at: paidAt,
    next_due_date: nextDue,
    payment_history: [...(existing.payment_history || []), historyEntry],
  }
  await setDoc(ref, nextState, { merge: true })
  return nextState
}

export async function removeBill(uid: string, billId: string) {
  await deleteDoc(doc(db, 'users', uid, 'bills', billId))
}

export async function buildMonthlyReport(uid: string, year: number, month: number, walletId?: string) {
  const snapshot = await getDocs(query(usersCollection(uid, 'transactions'), orderBy('date', 'desc')))
  const rows = snapshot.docs.map((item) => toTransaction({ id: item.id, data: item.data() as Record<string, any> }))

  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
  const monthly = rows.filter((tx) => {
    if (!tx.date.startsWith(monthPrefix)) return false
    if (walletId && tx.wallet_id !== walletId) return false
    return true
  })

  const totalIncome = monthly.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const totalExpense = monthly.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)

  const byCategoryMap = new Map<string, number>()
  monthly
    .filter((item) => item.type === 'expense')
    .forEach((item) => byCategoryMap.set(item.category, (byCategoryMap.get(item.category) || 0) + item.amount))

  const expenseByCategory = [...byCategoryMap.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  const monthlyBucket = new Map<string, { income: number; expense: number }>()
  rows.forEach((item) => {
    const key = item.date.slice(0, 7)
    const current = monthlyBucket.get(key) || { income: 0, expense: 0 }
    if (item.type === 'income') current.income += item.amount
    if (item.type === 'expense') current.expense += item.amount
    monthlyBucket.set(key, current)
  })

  const trends = [...monthlyBucket.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, value]) => {
      const [yy, mm] = key.split('-').map(Number)
      return {
        year: yy,
        month: mm,
        income: value.income,
        expense: value.expense,
        net: value.income - value.expense,
      }
    })

  return {
    period: {
      year,
      month,
      start: `${monthPrefix}-01`,
      end: `${monthPrefix}-31`,
    },
    total_income: totalIncome,
    total_expense: totalExpense,
    net: totalIncome - totalExpense,
    transaction_count: monthly.length,
    expense_by_category: expenseByCategory,
    trends,
    transactions: monthly,
  }
}
