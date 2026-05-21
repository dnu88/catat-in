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
      household_id: null,
      wallet_id: 'w-1',
      transaction_type: 'expense',
      amount: 50000,
      category: 'Food',
      description: 'Lunch',
      created_by: 'user-123',
      updated_by: 'user-123',
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
    const mockIs = jest.fn().mockReturnThis();
    const query = {
      order: jest.fn().mockReturnThis(),
      is: mockIs,
      then: (resolve: any) => Promise.resolve({ data: mockTxs, error: null }).then(resolve),
    };
    const mockSelect = jest.fn().mockReturnValue(query);
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await listTransactions();

    expect(supabase.from).toHaveBeenCalledWith('transactions');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(query.order).toHaveBeenCalledWith('date', { ascending: false });
    expect(mockIs).toHaveBeenCalledWith('household_id', null);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  test('lists personal transactions with household_id is null', async () => {
    const mockIs = jest.fn().mockReturnThis();
    const query = {
      order: jest.fn().mockReturnThis(),
      is: mockIs,
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    (supabase.from as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue(query) });

    await listTransactions(undefined, { type: 'personal' });

    expect(mockIs).toHaveBeenCalledWith('household_id', null);
  });

  test('lists household transactions by household_id', async () => {
    const mockEq = jest.fn().mockReturnThis();
    const query = {
      order: jest.fn().mockReturnThis(),
      eq: mockEq,
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    (supabase.from as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue(query) });

    await listTransactions(undefined, {
      type: 'household',
      householdId: 'hh-1',
      role: 'member',
    });

    expect(mockEq).toHaveBeenCalledWith('household_id', 'hh-1');
  });

  test('creates household transaction with audit fields', async () => {
    (supabase as any).auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    const mockData = { id: 'tx-household', wallet_id: null, transaction_type: 'expense', amount: 10000 };
    const mockSingle = jest.fn().mockResolvedValue({ data: mockData, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    await createTransaction(
      {
        transaction_type: 'expense',
        amount: 10000,
        category: 'Makan',
        description: 'Bakso',
      },
      { type: 'household', householdId: 'hh-1', role: 'member' },
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        household_id: 'hh-1',
        created_by: 'user-1',
        updated_by: 'user-1',
      }),
    );
  });

  test('listTransactions should apply wallet_id filter when provided', async () => {
    const mockTxs = [{ id: 'tx-1', wallet_id: 'w-1' }];
    const query = {
      order: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: (resolve: any) => Promise.resolve({ data: mockTxs, error: null }).then(resolve),
    };
    const mockSelectChain = jest.fn().mockReturnValue(query);
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelectChain });

    const result = await listTransactions({ wallet_id: 'w-1' });

    expect(query.eq).toHaveBeenCalledWith('wallet_id', 'w-1');
    expect(Array.isArray(result)).toBe(true);
  });

  test('listTransactions should apply transaction_type filter when provided', async () => {
    const mockTxs = [{ id: 'tx-2', transaction_type: 'income' }];
    const query = {
      order: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: (resolve: any) => Promise.resolve({ data: mockTxs, error: null }).then(resolve),
    };
    const mockSelect = jest.fn().mockReturnValue(query);
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await listTransactions({ transaction_type: 'income' });

    expect(query.eq).toHaveBeenCalledWith('transaction_type', 'income');
    expect(Array.isArray(result)).toBe(true);
  });

  test('listTransactions should apply category filter when provided', async () => {
    const mockTxs = [{ id: 'tx-3', category: 'Food' }];
    const query = {
      order: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: (resolve: any) => Promise.resolve({ data: mockTxs, error: null }).then(resolve),
    };
    const mockSelect = jest.fn().mockReturnValue(query);
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await listTransactions({ category: 'Food' });

    expect(query.eq).toHaveBeenCalledWith('category', 'Food');
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
    expect(mockUpdate).toHaveBeenCalledWith({ amount: 75000, updated_by: 'user-123' });
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
