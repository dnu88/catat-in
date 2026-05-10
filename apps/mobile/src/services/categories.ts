import { supabase } from '../lib/supabase';

export interface CategoryCreate {
  name: string;
  icon?: string;
  budget_limit?: number;
}

export interface Category extends CategoryCreate {
  id: string;
  user_id: string;
  icon: string;
  is_default: boolean;
  budget_limit: number;
  created_at: string;
  updated_at: string;
}

export async function createCategory(category: CategoryCreate): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      ...category,
      icon: category.icon ?? '📦',
      budget_limit: category.budget_limit ?? 0,
      is_default: false,
    })
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
  return data as Category[];
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
