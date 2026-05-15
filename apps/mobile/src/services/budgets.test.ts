import { createBudget, listBudgets, updateBudget, deleteBudget } from './budgets';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase');

describe('Budget Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase as any).auth = {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
    };
  });

  test('createBudget should insert with defaults and return budget', async () => {
    const mockBudget = {
      id: 'b-1',
      category_id: 'cat-1',
      limit_amount: 500000,
      period: 'monthly',
      notify_at_percent: 80,
      is_active: true,
    };
    const mockSingle = jest.fn().mockResolvedValue({ data: mockBudget, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    const result = await createBudget({
      category_id: 'cat-1',
      limit_amount: 500000,
      start_date: '2026-05-01',
    });

    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-123',
      category_id: 'cat-1',
      limit_amount: 500000,
      start_date: '2026-05-01',
      period: 'monthly',
      notify_at_percent: 80,
      is_active: true,
    });
    expect(result.id).toBe('b-1');
    expect(result.is_active).toBe(true);
  });

  test('createBudget should respect custom period and notify_at_percent', async () => {
    const mockBudget = { id: 'b-2', period: 'yearly', notify_at_percent: 70 };
    const mockSingle = jest.fn().mockResolvedValue({ data: mockBudget, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    await createBudget({
      category_id: 'cat-9',
      limit_amount: 2000000,
      start_date: '2026-01-01',
      period: 'yearly',
      notify_at_percent: 70,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        period: 'yearly',
        notify_at_percent: 70,
      }),
    );
  });

  test('listBudgets should return array ordered by start_date desc', async () => {
    const mockBudgets = [
      { id: 'b-1', start_date: '2026-05-01' },
      { id: 'b-2', start_date: '2026-04-01' },
    ];
    const mockOrder = jest.fn().mockResolvedValue({ data: mockBudgets, error: null });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await listBudgets();

    expect(supabase.from).toHaveBeenCalledWith('budgets');
    expect(mockSelect).toHaveBeenCalledWith('*, category:categories(id, name, icon)');
    expect(mockOrder).toHaveBeenCalledWith('start_date', { ascending: false });
    expect(result).toHaveLength(2);
  });

  test('updateBudget should call update/eq/select/single and return updated record', async () => {
    const updated = { id: 'b-1', limit_amount: 800000 };
    const mockSingle = jest.fn().mockResolvedValue({ data: updated, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

    const result = await updateBudget('b-1', { limit_amount: 800000 });

    expect(supabase.from).toHaveBeenCalledWith('budgets');
    expect(mockUpdate).toHaveBeenCalledWith({ limit_amount: 800000 });
    expect(mockEq).toHaveBeenCalledWith('id', 'b-1');
    expect(result.id).toBe('b-1');
  });

  test('deleteBudget should soft-delete by setting is_active false', async () => {
    const mockEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

    await expect(deleteBudget('b-1')).resolves.toBeUndefined();

    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
    expect(mockEq).toHaveBeenCalledWith('id', 'b-1');
  });

  test('listBudgets should throw when Supabase returns error', async () => {
    const mockError = { message: 'Network error', code: '503' };
    const mockOrder = jest.fn().mockResolvedValue({ data: null, error: mockError });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    await expect(listBudgets()).rejects.toEqual(mockError);
  });
});
