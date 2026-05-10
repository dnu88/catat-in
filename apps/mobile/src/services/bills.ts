import { supabase } from '../lib/supabase';

export interface BillCreate {
  name: string;
  amount: number;
  due_day: number;
  recurrence: 'monthly' | 'yearly' | 'once';
  next_due_date: string; // ISO date string
  notify_before_days?: number;
}

export interface Bill extends BillCreate {
  id: string;
  user_id: string;
  notify_before_days: number;
  is_paid: boolean;
  payment_history: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

export async function createBill(bill: BillCreate): Promise<Bill> {
  const { data, error } = await supabase
    .from('bill_reminders')
    .insert({
      ...bill,
      notify_before_days: bill.notify_before_days ?? 3,
      is_paid: false,
      payment_history: [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as Bill;
}

export async function listBills(): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('bill_reminders')
    .select('*')
    .order('next_due_date', { ascending: true });

  if (error) throw error;
  return data as Bill[];
}

export async function updateBill(id: string, updates: Partial<BillCreate & { is_paid?: boolean }>): Promise<Bill> {
  const { data, error } = await supabase
    .from('bill_reminders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Bill;
}

export async function deleteBill(id: string): Promise<void> {
  const { error } = await supabase.from('bill_reminders').delete().eq('id', id);

  if (error) throw error;
}
