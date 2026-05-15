export type TransactionType = 'income' | 'expense'

export type TransactionCategory = string

export type TransactionVisibility = 'private' | 'group' | 'admin_only'

export interface Transaction {
  id: string
  wallet_id: string | null
  user_id: string
  group_id?: string | null
  transaction_type: TransactionType
  type?: string | null
  amount: number
  category: TransactionCategory
  description: string
  merchant?: string | null
  date: string
  note?: string | null
  payment_method?: string | null
  receipt_url?: string | null
  is_shared?: boolean
  visibility?: TransactionVisibility | null
  on_behalf_of?: string | null
  created_by?: string | null
  ai_confidence?: number | null
  ai_extracted?: Record<string, unknown> | null
  is_disputed?: boolean
  dispute_resolved_at?: string | null
  created_at: string
  updated_at?: string
  // Speculative fields written by edge functions but not present in deployed schema.
  // Marked optional so consumers can degrade gracefully when missing.
  status?: 'processing' | 'done' | 'error'
  confidence?: number | null
}
