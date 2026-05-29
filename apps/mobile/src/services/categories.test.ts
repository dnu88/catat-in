import {
  createCategory,
  listCategories,
  updateCategory,
  updateCategoryVisual,
  deleteCategory,
} from './categories';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase');

describe('Category Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase as any).auth = {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
    };
  });

  test('createCategory should insert with defaults and return category', async () => {
    const mockCategory = { id: 'cat-1', name: 'Food', icon: '📦', is_default: false };
    const mockSingle = jest.fn().mockResolvedValue({ data: mockCategory, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    const result = await createCategory({ name: 'Food' });

    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-123',
      name: 'Food',
      icon: '📦',
      is_default: false,
    });
    expect(result.id).toBe('cat-1');
    expect(result.is_default).toBe(false);
  });

  test('createCategory should use provided icon and type', async () => {
    const mockCategory = { id: 'cat-2', name: 'Transport', icon: '🚗', type: 'expense' };
    const mockSingle = jest.fn().mockResolvedValue({ data: mockCategory, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    await createCategory({ name: 'Transport', icon: '🚗', type: 'expense' });

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      icon: '🚗',
      type: 'expense',
    }));
  });

  test('createCategory should include category-first visual fields when provided', async () => {
    const mockCategory = {
      id: 'cat-visual',
      name: 'Food & Beverage',
      icon: 'food',
      color: '#4A80F0',
      visual_locked_by_user: true,
      type: 'expense',
    };
    const mockSingle = jest.fn().mockResolvedValue({ data: mockCategory, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    await createCategory({
      name: 'Food & Beverage',
      icon: 'food',
      type: 'expense',
      color: '#4A80F0',
      visual_locked_by_user: true,
    });

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      icon: 'food',
      color: '#4A80F0',
      visual_locked_by_user: true,
    }));
  });

  test('listCategories should return array ordered by name asc', async () => {
    const mockCategories = [
      { id: 'cat-1', name: 'Food' },
      { id: 'cat-2', name: 'Transport' },
    ];
    const mockOrder = jest.fn().mockResolvedValue({ data: mockCategories, error: null });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await listCategories();

    expect(supabase.from).toHaveBeenCalledWith('categories');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockOrder).toHaveBeenCalledWith('name', { ascending: true });
    expect(result).toHaveLength(2);
  });

  test('updateCategory should call update/eq/select/single and return updated record', async () => {
    const updated = { id: 'cat-1', name: 'Grocery' };
    const mockSingle = jest.fn().mockResolvedValue({ data: updated, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

    const result = await updateCategory('cat-1', { name: 'Grocery' });

    expect(supabase.from).toHaveBeenCalledWith('categories');
    expect(mockUpdate).toHaveBeenCalledWith({ name: 'Grocery' });
    expect(mockEq).toHaveBeenCalledWith('id', 'cat-1');
    expect(result.id).toBe('cat-1');
  });

  test('updateCategoryVisual should lock icon and color at category level', async () => {
    const updated = {
      id: 'cat-1',
      name: 'Food & Beverage',
      icon: 'food',
      color: '#4A80F0',
      visual_locked_by_user: true,
    };
    const mockSingle = jest.fn().mockResolvedValue({ data: updated, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

    const result = await updateCategoryVisual('cat-1', {
      icon: 'food',
      color: '#4A80F0',
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      icon: 'food',
      color: '#4A80F0',
      visual_locked_by_user: true,
    });
    expect(result.color).toBe('#4A80F0');
  });

  test('deleteCategory should hard-delete the record', async () => {
    const mockEq = jest.fn().mockResolvedValue({ error: null });
    const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

    await expect(deleteCategory('cat-1')).resolves.toBeUndefined();

    expect(supabase.from).toHaveBeenCalledWith('categories');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'cat-1');
  });

  test('listCategories should throw when Supabase returns error', async () => {
    const mockError = { message: 'Unauthorized', code: '401' };
    const mockOrder = jest.fn().mockResolvedValue({ data: null, error: mockError });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    await expect(listCategories()).rejects.toEqual(mockError);
  });
});
