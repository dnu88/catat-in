import { supabase } from '../lib/supabase';
import { getCurrentUserId } from './currentUser';

export type TransactionType = 'income' | 'expense';

export interface TransactionCreate {
  wallet_id?: string | null;
  transaction_type: TransactionType;
  amount: number;
  category: string;
  description: string;
  merchant?: string | null;
  date?: string | null; // ISO date YYYY-MM-DD
  note?: string | null;
  payment_method?: string | null;
  receipt_url?: string | null;
  group_id?: string | null;
  is_shared?: boolean;
  visibility?: string | null;
  ai_confidence?: number | null;
  ai_extracted?: Record<string, unknown> | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string | null;
  transaction_type: TransactionType;
  type?: string | null;
  amount: number;
  category: string;
  description: string;
  merchant: string | null;
  date: string;
  note: string | null;
  payment_method: string | null;
  receipt_url: string | null;
  group_id: string | null;
  is_shared: boolean;
  visibility: string | null;
  ai_confidence: number | null;
  ai_extracted: Record<string, unknown> | null;
  created_by: string | null;
  on_behalf_of: string | null;
  is_disputed: boolean;
  dispute_resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

function buildInsertPayload(tx: TransactionCreate, userId: string) {
  const payload: Record<string, unknown> = {
    user_id: userId,
    wallet_id: tx.wallet_id ?? null,
    transaction_type: tx.transaction_type,
    amount: tx.amount,
    category: tx.category,
    description: tx.description,
    created_by: userId,
  };

  if (tx.merchant != null) payload.merchant = tx.merchant;
  if (tx.date != null) payload.date = tx.date;
  if (tx.note != null) payload.note = tx.note;
  if (tx.payment_method != null) payload.payment_method = tx.payment_method;
  if (tx.receipt_url != null) payload.receipt_url = tx.receipt_url;
  if (tx.group_id != null) payload.group_id = tx.group_id;
  if (tx.is_shared != null) payload.is_shared = tx.is_shared;
  if (tx.visibility != null) payload.visibility = tx.visibility;
  if (tx.ai_confidence != null) payload.ai_confidence = tx.ai_confidence;
  if (tx.ai_extracted != null) payload.ai_extracted = tx.ai_extracted;

  return payload;
}

async function applyWalletDelta(walletId: string | null | undefined, deltaAmount: number) {
  if (!walletId || !Number.isFinite(deltaAmount) || deltaAmount === 0) return;

  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('id', walletId)
      .maybeSingle();

    if (error || !data) return;

    const currentBalance = Number(data.balance ?? 0);
    const nextBalance = currentBalance + deltaAmount;

    await supabase
      .from('wallets')
      .update({ balance: nextBalance })
      .eq('id', walletId);
  } catch {
    // best-effort balance sync; tolerate transient or network failures
  }
}

function signedDelta(tx: Pick<Transaction | TransactionCreate, 'transaction_type' | 'amount'>): number {
  const n = Number(tx.amount ?? 0);
  if (!Number.isFinite(n)) return 0;
  return tx.transaction_type === 'income' ? n : -n;
}

async function getTransactionSafely(id: string): Promise<Transaction | null> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return data as Transaction;
  } catch {
    return null;
  }
}

export async function createTransaction(tx: TransactionCreate): Promise<Transaction> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('transactions')
    .insert(buildInsertPayload(tx, userId))
    .select()
    .single();

  if (error) throw error;

  const created = data as Transaction;
  await applyWalletDelta(created.wallet_id, signedDelta(created));
  return created;
}

export async function listTransactions(filters?: {
  wallet_id?: string;
  transaction_type?: TransactionType;
  category?: string;
}): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  if (filters?.wallet_id) {
    query = query.eq('wallet_id', filters.wallet_id);
  }
  if (filters?.transaction_type) {
    query = query.eq('transaction_type', filters.transaction_type);
  }
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function updateTransaction(
  id: string,
  updates: Partial<TransactionCreate>,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  const next = data as Transaction;

  const previous = await getTransactionSafely(id);
  if (previous) {
    await applyWalletDelta(previous.wallet_id, -signedDelta(previous));
  }
  await applyWalletDelta(next.wallet_id, signedDelta(next));

  return next;
}

export async function deleteTransaction(id: string): Promise<void> {
  const previous = await getTransactionSafely(id);

  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;

  if (previous) {
    await applyWalletDelta(previous.wallet_id, -signedDelta(previous));
  }
}
