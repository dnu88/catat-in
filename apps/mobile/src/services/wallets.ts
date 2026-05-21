import { supabase } from '../lib/supabase';
import { getCurrentUserId } from './currentUser';
import {
  applyFinanceContextFilter,
  buildFinanceInsertAudit,
  buildFinanceUpdateAudit,
  canCreateInContext,
  type FinanceContext,
} from './finance-context-query';

const defaultContext: FinanceContext = { type: 'personal' };

export interface WalletCreate {
  name: string;
  type: 'cash' | 'bank' | 'ewallet' | 'investment';
  balance?: number;
  currency?: string;
  bank_name?: string;
  account_number?: string;
}

export interface Wallet extends WalletCreate {
  id: string;
  user_id: string;
  household_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function createWallet(
  wallet: WalletCreate,
  context: FinanceContext = defaultContext,
): Promise<Wallet> {
  if (!canCreateInContext(context)) throw new Error('Akses lihat saja');

  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('wallets')
    .insert({
      ...wallet,
      ...buildFinanceInsertAudit(context, userId),
      balance: wallet.balance ?? 0,
      currency: wallet.currency || 'IDR',
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Wallet;
}

export async function listWallets(
  context: FinanceContext = defaultContext,
): Promise<Wallet[]> {
  let query: any = supabase
    .from('wallets')
    .select('*')
    .order('created_at', { ascending: false });

  query = applyFinanceContextFilter(query, context);

  const { data, error } = await query;

  if (error) throw error;
  return data as Wallet[];
}

export async function updateWallet(
  id: string,
  updates: Partial<WalletCreate>,
  context: FinanceContext = defaultContext,
): Promise<Wallet> {
  if (context.type === 'household' && context.role === 'viewer') throw new Error('Akses lihat saja');

  const userId = await getCurrentUserId();
  const payload = { ...updates, ...buildFinanceUpdateAudit(userId) };

  const { data, error } = await supabase
    .from('wallets')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Wallet;
}

export async function deleteWallet(
  id: string,
  context: FinanceContext = defaultContext,
): Promise<void> {
  if (context.type === 'household' && context.role === 'viewer') throw new Error('Akses lihat saja');

  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('wallets')
    .update({ is_active: false, ...buildFinanceUpdateAudit(userId) })
    .eq('id', id);

  if (error) throw error;
}
