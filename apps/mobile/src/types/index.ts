export type TransactionType = 'income' | 'expense'

export type TransactionCategory = string

export type InputType = 'manual' | 'text' | 'image' | 'voice' | 'import'

export type TransactionStatus = 'processing' | 'done' | 'error'

export type TransactionVisibility = 'private' | 'group' | 'admin_only'

export interface Transaction {
  id: string
  wallet_id: string
  user_id: string
  group_id?: string
  input_type?: InputType
  raw_input?: string
  status?: TransactionStatus
  error_message?: string
  type: TransactionType
  amount: number
  category: TransactionCategory
  note?: string
  merchant?: string
  date: string // ISO date string
  receipt_url?: string
  is_shared: boolean
  visibility: TransactionVisibility
  on_behalf_of?: string // user_id (input atas nama)
  created_by: string // user_id yang menginput
  is_verified?: boolean
  review_required?: boolean
  confidence?: number // 0-1 untuk AI extraction
  is_disputed?: boolean
  dispute_resolved_at?: string
  created_at: string
  updated_at?: string
}
