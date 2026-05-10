import {
  createTransaction,
  listTransactions,
  updateTransaction,
  deleteTransaction,
} from './transactions';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase');

describe('Transaction Service', () => {
  test('createTransaction should insert with defaults and return created record', async () => {
    const mockData = {
      id: 'tx-123',
      wallet_id: 'w-1',
      type: 'expense',
      nominal: 50000,
      kategori: 'Food',
      input_type: 'manual',
      status: 'done',
      is_verified: false,
      review_required: false,
    };
    const mockSingle = jest.fn().mockResolvedValue({ data: mockData, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    const result = await createTransaction({
      wallet_id: 'w-1',
      type: 'expense',
      nominal: 50000,
      kategori: 'Food',
    });

    expect(supabase.from).toHaveBeenCalledWith('transactions');
    expect(mockInsert).toHaveBeenCalledWith({
      wallet_id: 'w-1',
      type: 'expense',
      nominal: 50000,
      kategori: 'Food',
      input_type: 'manual',
      status: 'done',
      is_verified: false,
      review_required: false,
    });
    expect(mockSelect).toHaveBeenCalled();
    expect(mockSingle).toHaveBeenCalled();
    expect(result.id).toBe('tx-123');
    expect(result.input_type).toBe('manual');
    expect(result.status).toBe('done');
    expect(result.is_verified).toBe(false);
  });

  test('listTransactions should return all transactions ordered by created_at desc', async () => {
    const mockTxs = [
      { id: 'tx-1', type: 'expense', nominal: 10000 },
      { id: 'tx-2', type: 'income', nominal: 500000 },
    ];
    const mockOrder = jest.fn().mockResolvedValue({ data: mockTxs, error: null });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await listTransactions();

    expect(supabase.from).toHaveBeenCalledWith('transactions');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  test('listTransactions should apply wallet_id filter when provided', async () => {
    const mockTxs = [{ id: 'tx-1', wallet_id: 'w-1' }];
    const mockFinalResolve = jest.fn().mockResolvedValue({ data: mockTxs, error: null });
    const mockEq = jest.fn().mockReturnValue(mockFinalResolve());
    const mockOrderChain = jest.fn().mockReturnValue({ eq: mockEq });
    const mockSelectChain = jest.fn().mockReturnValue({ order: mockOrderChain });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelectChain });

    const result = await listTransactions({ wallet_id: 'w-1' });

    expect(mockEq).toHaveBeenCalledWith('wallet_id', 'w-1');
    expect(Array.isArray(result)).toBe(true);
  });

  test('listTransactions should apply type filter when provided', async () => {
    const mockTxs = [{ id: 'tx-2', type: 'income' }];
    const mockFinalResolve = jest.fn().mockResolvedValue({ data: mockTxs, error: null });
    const mockEq = jest.fn().mockReturnValue(mockFinalResolve());
    const mockOrder = jest.fn().mockReturnValue({ eq: mockEq });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await listTransactions({ type: 'income' });

    expect(mockEq).toHaveBeenCalledWith('type', 'income');
    expect(Array.isArray(result)).toBe(true);
  });

  test('listTransactions should apply category filter when provided', async () => {
    const mockTxs = [{ id: 'tx-3', kategori: 'Food' }];
    const mockFinalResolve = jest.fn().mockResolvedValue({ data: mockTxs, error: null });
    const mockEq = jest.fn().mockReturnValue(mockFinalResolve());
    const mockOrder = jest.fn().mockReturnValue({ eq: mockEq });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await listTransactions({ category: 'Food' });

    expect(mockEq).toHaveBeenCalledWith('kategori', 'Food');
    expect(Array.isArray(result)).toBe(true);
  });

  test('updateTransaction should call update/eq/select/single and return updated record', async () => {
    const updated = { id: 'tx-1', nominal: 75000, type: 'expense' };
    const mockSingle = jest.fn().mockResolvedValue({ data: updated, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

    const result = await updateTransaction('tx-1', { nominal: 75000 });

    expect(supabase.from).toHaveBeenCalledWith('transactions');
    expect(mockUpdate).toHaveBeenCalledWith({ nominal: 75000 });
    expect(mockEq).toHaveBeenCalledWith('id', 'tx-1');
    expect(mockSelect).toHaveBeenCalled();
    expect(mockSingle).toHaveBeenCalled();
    expect(result.id).toBe('tx-1');
  });

  test('deleteTransaction should hard-delete by id', async () => {
    const mockEq = jest.fn().mockResolvedValue({ error: null });
    const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ delete: mockDelete });

    await expect(deleteTransaction('tx-1')).resolves.toBeUndefined();

    expect(supabase.from).toHaveBeenCalledWith('transactions');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'tx-1');
  });

  test('createTransaction should throw when Supabase returns error', async () => {
    const mockError = { message: 'Insert failed', code: '500' };
    const mockSingle = jest.fn().mockResolvedValue({ data: null, error: mockError });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    await expect(
      createTransaction({ wallet_id: 'w-1', type: 'expense', nominal: 100, kategori: 'Food' })
    ).rejects.toEqual(mockError);
  });
});
