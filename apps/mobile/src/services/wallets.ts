import { supabase } from '../lib/supabase';
import { getCurrentUserId } from './currentUser';

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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function createWallet(wallet: WalletCreate): Promise<Wallet> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('wallets')
    .insert({
      ...wallet,
      user_id: userId,
      balance: wallet.balance ?? 0,
      currency: wallet.currency || 'IDR',
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Wallet;
}

export async function listWallets(): Promise<Wallet[]> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Wallet[];
}

export async function updateWallet(id: string, updates: Partial<WalletCreate>): Promise<Wallet> {
  const { data, error } = await supabase
    .from('wallets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Wallet;
}

export async function deleteWallet(id: string): Promise<void> {
  const { error } = await supabase.from('wallets').update({ is_active: false }).eq('id', id);

  if (error) throw error;
}
