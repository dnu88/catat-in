import { supabase } from '../lib/supabase';

export interface TransactionCreate {
  wallet_id: string;
  type: 'income' | 'expense';
  nominal: number;
  kategori: string;
  catatan?: string;
  merchant?: string;
  tanggal?: string; // ISO date string
}

export interface Transaction extends TransactionCreate {
  id: string;
  user_id: string;
  input_type: 'text' | 'image' | 'voice' | 'import' | 'manual';
  status: 'processing' | 'done' | 'error';
  is_verified: boolean;
  review_required: boolean;
  confidence?: number;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

export async function createTransaction(tx: TransactionCreate): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      ...tx,
      input_type: 'manual',
      status: 'done',
      is_verified: false,
      review_required: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Transaction;
}

export async function listTransactions(filters?: {
  wallet_id?: string;
  type?: 'income' | 'expense';
  category?: string;
}): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.wallet_id) {
    query = query.eq('wallet_id', filters.wallet_id);
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.category) {
    query = query.eq('kategori', filters.category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Transaction[];
}

export async function updateTransaction(
  id: string,
  updates: Partial<TransactionCreate>
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);

  if (error) throw error;
}
