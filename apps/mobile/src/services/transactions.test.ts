import {
  createTransaction,
  listTransactions,
  updateTransaction,
  deleteTransaction,
} from './transactions';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase');

describe('Transaction Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase as any).auth = {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
    };
  });

  test('createTransaction should insert with required fields and return created record', async () => {
    const mockData = {
      id: 'tx-123',
      wallet_id: 'w-1',
      transaction_type: 'expense',
      amount: 50000,
      category: 'Food',
      description: 'Lunch',
    };
    const mockSingle = jest.fn().mockResolvedValue({ data: mockData, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    const result = await createTransaction({
      wallet_id: 'w-1',
      transaction_type: 'expense',
      amount: 50000,
      category: 'Food',
      description: 'Lunch',
    });

    expect(supabase.from).toHaveBeenCalledWith('transactions');
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-123',
      wallet_id: 'w-1',
      transaction_type: 'expense',
      amount: 50000,
      category: 'Food',
      description: 'Lunch',
      created_by: 'user-123',
    });
    expect(mockSelect).toHaveBeenCalled();
    expect(mockSingle).toHaveBeenCalled();
    expect(result.id).toBe('tx-123');
    expect(result.transaction_type).toBe('expense');
  });

  test('createTransaction should include optional fields when provided', async () => {
    const mockData = { id: 'tx-2' };
    const mockSingle = jest.fn().mockResolvedValue({ data: mockData, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    await createTransaction({
      wallet_id: 'w-2',
      transaction_type: 'income',
      amount: 1_000_000,
      category: 'Salary',
      description: 'Gaji April',
      merchant: 'PT Acme',
      date: '2026-05-10',
      note: 'gaji bulanan',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        merchant: 'PT Acme',
        date: '2026-05-10',
        note: 'gaji bulanan',
      }),
    );
  });

  test('listTransactions should return all transactions ordered by date desc', async () => {
    const mockTxs = [
      { id: 'tx-1', transaction_type: 'expense', amount: 10000 },
      { id: 'tx-2', transaction_type: 'income', amount: 500000 },
    ];
    const mockOrder = jest.fn().mockResolvedValue({ data: mockTxs, error: null });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await listTransactions();

    expect(supabase.from).toHaveBeenCalledWith('transactions');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockOrder).toHaveBeenCalledWith('date', { ascending: false });
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

  test('listTransactions should apply transaction_type filter when provided', async () => {
    const mockTxs = [{ id: 'tx-2', transaction_type: 'income' }];
    const mockFinalResolve = jest.fn().mockResolvedValue({ data: mockTxs, error: null });
    const mockEq = jest.fn().mockReturnValue(mockFinalResolve());
    const mockOrder = jest.fn().mockReturnValue({ eq: mockEq });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await listTransactions({ transaction_type: 'income' });

    expect(mockEq).toHaveBeenCalledWith('transaction_type', 'income');
    expect(Array.isArray(result)).toBe(true);
  });

  test('listTransactions should apply category filter when provided', async () => {
    const mockTxs = [{ id: 'tx-3', category: 'Food' }];
    const mockFinalResolve = jest.fn().mockResolvedValue({ data: mockTxs, error: null });
    const mockEq = jest.fn().mockReturnValue(mockFinalResolve());
    const mockOrder = jest.fn().mockReturnValue({ eq: mockEq });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await listTransactions({ category: 'Food' });

    expect(mockEq).toHaveBeenCalledWith('category', 'Food');
    expect(Array.isArray(result)).toBe(true);
  });

  test('updateTransaction should call update/eq/select/single and return updated record', async () => {
    const updated = { id: 'tx-1', amount: 75000, transaction_type: 'expense' };
    const mockSingle = jest.fn().mockResolvedValue({ data: updated, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

    const result = await updateTransaction('tx-1', { amount: 75000 });

    expect(supabase.from).toHaveBeenCalledWith('transactions');
    expect(mockUpdate).toHaveBeenCalledWith({ amount: 75000 });
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
      createTransaction({
        wallet_id: 'w-1',
        transaction_type: 'expense',
        amount: 100,
        category: 'Food',
        description: 'Test',
      }),
    ).rejects.toEqual(mockError);
  });
});
