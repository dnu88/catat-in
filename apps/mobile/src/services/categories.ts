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

const defaultCategories: Array<Required<Pick<CategoryCreate, 'name' | 'icon' | 'type'>>> = [
  { name: 'Food & Beverage', icon: 'food', type: 'expense' },
  { name: 'Groceries', icon: 'groceries', type: 'expense' },
  { name: 'Transport', icon: 'transport', type: 'expense' },
  { name: 'Bills', icon: 'bills', type: 'expense' },
  { name: 'Health', icon: 'health', type: 'expense' },
  { name: 'Entertainment', icon: 'recreation', type: 'expense' },
  { name: 'Education', icon: 'file', type: 'expense' },
  { name: 'Other expenses', icon: 'otherExpenses', type: 'expense' },
  { name: 'Salary', icon: 'card', type: 'income' },
  { name: 'Bonus', icon: 'gift', type: 'income' },
  { name: 'Freelance', icon: 'investment', type: 'income' },
];

function isMissingTypeColumn(error: unknown) {
  const anyError = error as { code?: string; message?: string } | null;
  return (
    anyError?.code === '42703' ||
    anyError?.code === 'PGRST204' ||
    /column .*type|type .*does not exist|schema cache/i.test(anyError?.message ?? '')
  );
}

function normalizeCategory(row: any): Category {
  return {
    ...row,
    type: row.type ?? null,
  } as Category;
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

  let response = await supabase
    .from('categories')
    .insert(payload)
    .select()
    .single();

  if (response.error && isMissingTypeColumn(response.error) && 'type' in payload) {
    const { type: _type, ...fallbackPayload } = payload;
    response = await supabase
      .from('categories')
      .insert(fallbackPayload)
      .select()
      .single();
  }

  if (response.error) throw response.error;
  return normalizeCategory(response.data);
}

async function seedDefaultCategories(): Promise<Category[]> {
  const userId = await getCurrentUserId();
  const payloadWithType = defaultCategories.map((category) => ({
    user_id: userId,
    name: category.name,
    icon: category.icon,
    type: category.type,
    is_default: true,
  }));

  let response = await supabase
    .from('categories')
    .insert(payloadWithType)
    .select();

  if (response.error && isMissingTypeColumn(response.error)) {
    const payloadWithoutType = payloadWithType.map(({ type: _type, ...item }) => item);
    response = await supabase
      .from('categories')
      .insert(payloadWithoutType)
      .select();
  }

  if (response.error) throw response.error;
  return (response.data ?? []).map(normalizeCategory);
}

export async function listCategories(): Promise<Category[]> {
  let response = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (response.error && isMissingTypeColumn(response.error)) {
    response = await supabase
      .from('categories')
      .select('id,user_id,name,icon,is_default,created_at')
      .order('name', { ascending: true });
  }

  if (response.error) throw response.error;

  const categories = (response.data ?? []).map(normalizeCategory);
  if (categories.length > 0) return categories;

  return seedDefaultCategories();
}

export async function updateCategory(id: string, updates: Partial<CategoryCreate>): Promise<Category> {
  let response = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (response.error && isMissingTypeColumn(response.error) && 'type' in updates) {
    const { type: _type, ...fallbackUpdates } = updates;
    response = await supabase
      .from('categories')
      .update(fallbackUpdates)
      .eq('id', id)
      .select()
      .single();
  }

  if (response.error) throw response.error;
  return normalizeCategory(response.data);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);

  if (error) throw error;
}
