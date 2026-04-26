export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          plan_type: 'free' | 'premium'
          plan_expires_at: string | null
          group_id: string | null
          fcm_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      wallets: {
        Row: {
          id: string
          user_id: string | null
          group_id: string | null
          name: string
          type: 'bank' | 'ewallet' | 'cash' | 'investment'
          balance: number
          currency: string
          bank_name: string | null
          account_number: string | null
          is_shared: boolean
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['wallets']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['wallets']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          wallet_id: string
          user_id: string
          type: 'income' | 'expense'
          amount: number
          category: string
          note: string | null
          merchant: string | null
          date: string
          receipt_url: string | null
          is_shared: boolean
          visibility: 'private' | 'group' | 'admin_only'
          group_id: string | null
          on_behalf_of: string | null
          created_by: string
          is_disputed: boolean
          dispute_resolved_at: string | null
          ai_extracted: boolean
          ai_confidence: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      budgets: {
        Row: {
          id: string
          user_id: string | null
          group_id: string | null
          category: string
          limit_amount: number
          period: string
          period_start: string
          notify_at_percent: number
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['budgets']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>
      }
      bill_reminders: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          due_day: number
          recurrence: 'once' | 'monthly' | 'yearly'
          next_due_date: string
          icon: string | null
          notify_before_days: number[]
          is_active: boolean
          is_paid: boolean
          paid_at: string | null
          payment_history: Array<Record<string, unknown>>
          auto_record_wallet: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['bill_reminders']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['bill_reminders']['Insert']>
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'income' | 'expense'
          icon: string | null
          is_default: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          invite_code: string
          invite_link: string
          max_members: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['groups']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['groups']['Insert']>
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: 'admin' | 'editor' | 'viewer'
          nickname: string | null
          status: 'pending' | 'active' | 'left' | 'removed'
          invited_by: string | null
          joined_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['group_members']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['group_members']['Insert']>
      }
      import_logs: {
        Row: {
          id: string
          user_id: string
          bank_name: string | null
          file_name: string | null
          total_rows: number
          imported_rows: number
          skipped_rows: number
          duplicate_rows: number
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['import_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['import_logs']['Insert']>
      }
    }
  }
}
