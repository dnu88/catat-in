// ============================================================
// CATAT.IN — Shared TypeScript Types
// Digunakan bersama oleh web, mobile, dan backend (via codegen)
// ============================================================

// ── ENUMS ────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense'

export type TransactionCategory = string | 'food' | 'transport' | 'shopping' | 'health' | 'entertainment' | 'education' | 'housing' | 'salary' | 'freelance' | 'investment' | 'other'

export type WalletType = 'bank' | 'ewallet' | 'cash' | 'investment'

export type TransactionVisibility = 'private' | 'group' | 'admin_only'

export type GroupRole = 'admin' | 'editor' | 'viewer'

export type MemberStatus = 'pending' | 'active' | 'left' | 'removed'

export type PlanType = 'free' | 'premium'

export type BillRecurrence = 'once' | 'monthly' | 'yearly'

// ── CORE ENTITIES ────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  plan_type: PlanType
  plan_expires_at?: string
  group_id?: string
  created_at: string
}

export interface Wallet {
  id: string
  user_id: string
  name: string
  type: WalletType
  balance: number
  currency: string
  bank_name?: string
  account_number?: string
  is_shared: boolean         // Wallet bersama grup
  group_id?: string
  is_active: boolean
  created_at: string
}

export interface Transaction {
  id: string
  wallet_id: string
  user_id: string
  type: TransactionType
  amount: number
  category: TransactionCategory
  note?: string
  merchant?: string
  date: string               // ISO date string
  receipt_url?: string
  is_shared: boolean
  visibility: TransactionVisibility
  group_id?: string
  on_behalf_of?: string      // user_id (input atas nama)
  created_by: string         // user_id yang menginput
  is_disputed: boolean
  dispute_resolved_at?: string
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  group_id?: string          // null = budget pribadi
  category: TransactionCategory
  limit_amount: number
  spent_amount: number       // computed/cached
  period: 'monthly'
  period_start: string       // YYYY-MM-01
  notify_at_percent: number  // default 80
  is_active: boolean
  created_at: string
}

export interface BillReminder {
  id: string
  user_id: string
  name: string
  amount: number
  due_day: number            // 1-31
  recurrence: BillRecurrence
  next_due_date: string
  icon?: string
  is_active: boolean
  is_paid: boolean
  paid_at?: string
  payment_history?: Array<{
    paid_at: string
    amount: number
    next_due_date_before_payment?: string
  }>
  notify_before_days: number[]  // [3, 1] = H-3 dan H-1
  created_at: string
}

export interface Category {
  id: string
  name: string
  label: string
  type: TransactionType
  icon?: string | null
  is_default: boolean
}

export interface Group {
  id: string
  name: string
  description?: string
  owner_id: string
  invite_code: string
  invite_link: string
  max_members: number
  member_count: number       // computed
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: GroupRole
  nickname?: string
  status: MemberStatus
  invited_by: string
  joined_at?: string
  created_at: string
  // Joined fields
  user?: Pick<User, 'id' | 'full_name' | 'avatar_url' | 'email'>
}

// ── AI TYPES ─────────────────────────────────────────────────

export interface AIExtractedTransaction {
  type: TransactionType
  amount: number
  category: TransactionCategory
  merchant?: string
  note?: string
  wallet_hint?: string | null
  date?: string
  wallet_id?: string
  confidence: number         // 0-1
}

export interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
  extracted?: AIExtractedTransaction[]
  timestamp: string
}

// ── API RESPONSE WRAPPERS ────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  has_more: boolean
}

export interface ApiError {
  detail: string
  status_code: number
}

// ── FORM TYPES ───────────────────────────────────────────────

export interface TransactionFormData {
  type: TransactionType
  amount: number
  category: TransactionCategory
  note?: string
  merchant?: string
  date: string
  wallet_id: string
  is_shared?: boolean
  on_behalf_of?: string
}

export interface BudgetFormData {
  category: TransactionCategory
  limit_amount: number
  period: 'monthly'
  period_start?: string
  notify_at_percent?: number
  group_id?: string
}

export interface BillFormData {
  name: string
  amount: number
  due_day: number
  recurrence: BillRecurrence
  icon?: string
  notify_before_days?: number[]
  auto_record?: boolean
}

export interface GroupFormData {
  name: string
  description?: string
}
