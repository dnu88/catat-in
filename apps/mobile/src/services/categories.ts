import { supabase } from '../lib/supabase';
import { getCurrentUserId } from './currentUser';

export interface CategoryCreate {
  name: string;
  icon?: string;
  type?: 'income' | 'expense' | null;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  is_default: boolean;
  type: 'income' | 'expense' | null;
  created_at: string;
}

export async function createCategory(category: CategoryCreate): Promise<Category> {
  const userId = await getCurrentUserId();

  const payload: Record<string, unknown> = {
    user_id: userId,
    name: category.name,
    icon: category.icon ?? '📦',
    is_default: false,
  };
  if (category.type) payload.type = category.type;

  const { data, error } = await supabase
    .from('categories')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function updateCategory(id: string, updates: Partial<CategoryCreate>): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);

  if (error) throw error;
}
