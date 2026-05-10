import { supabase } from '../lib/supabase';

export interface BudgetCreate {
  category: string;
  limit_amount: number;
  period_start: string; // ISO date string
  period?: string;
  notify_at_percent?: number;
}

export interface Budget extends BudgetCreate {
  id: string;
  user_id: string;
  spent_amount: number;
  period: string;
  notify_at_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function createBudget(budget: BudgetCreate): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .insert({
      ...budget,
      period: budget.period ?? 'monthly',
      notify_at_percent: budget.notify_at_percent ?? 80,
      spent_amount: 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Budget;
}

export async function listBudgets(): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .order('period_start', { ascending: false });

  if (error) throw error;
  return data as Budget[];
}

export async function updateBudget(id: string, updates: Partial<BudgetCreate>): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Budget;
}

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from('budgets').update({ is_active: false }).eq('id', id);

  if (error) throw error;
}
