import { createWallet, listWallets, updateWallet, deleteWallet } from './wallets';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase');

describe('Wallet Service', () => {
  test('createWallet should insert wallet into Supabase', async () => {
    const mockSingle = jest.fn().mockResolvedValue({ data: { id: 'wallet-123' }, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    const result = await createWallet({
      name: 'My Wallet',
      type: 'cash',
      balance: 100000,
    });

    expect(mockInsert).toHaveBeenCalledWith({
      name: 'My Wallet',
      type: 'cash',
      balance: 100000,
      currency: 'IDR',
      is_active: true,
    });
    expect(mockSelect).toHaveBeenCalled();
    expect(mockSingle).toHaveBeenCalled();
    expect(result.id).toBe('wallet-123');
  });

  test('listWallets should call select and order and return array', async () => {
    const mockWallets = [
      { id: 'w-1', name: 'Cash', type: 'cash' },
      { id: 'w-2', name: 'Bank BCA', type: 'bank' },
    ];
    const mockOrder = jest.fn().mockResolvedValue({ data: mockWallets, error: null });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await listWallets();

    expect(supabase.from).toHaveBeenCalledWith('wallets');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('w-1');
  });

  test('updateWallet should call update/eq/select/single and return updated record', async () => {
    const updatedWallet = { id: 'w-1', name: 'Updated Cash', type: 'cash' };
    const mockSingle = jest.fn().mockResolvedValue({ data: updatedWallet, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

    const result = await updateWallet('w-1', { name: 'Updated Cash' });

    expect(supabase.from).toHaveBeenCalledWith('wallets');
    expect(mockUpdate).toHaveBeenCalledWith({ name: 'Updated Cash' });
    expect(mockEq).toHaveBeenCalledWith('id', 'w-1');
    expect(mockSelect).toHaveBeenCalled();
    expect(mockSingle).toHaveBeenCalled();
    expect(result.id).toBe('w-1');
    expect(result.name).toBe('Updated Cash');
  });

  test('deleteWallet should soft-delete by setting is_active false', async () => {
    const mockEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ update: mockUpdate });

    await expect(deleteWallet('w-1')).resolves.toBeUndefined();

    expect(supabase.from).toHaveBeenCalledWith('wallets');
    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
    expect(mockEq).toHaveBeenCalledWith('id', 'w-1');
  });

  test('listWallets should throw when Supabase returns error', async () => {
    const mockError = { message: 'DB connection failed', code: '500' };
    const mockOrder = jest.fn().mockResolvedValue({ data: null, error: mockError });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    await expect(listWallets()).rejects.toEqual(mockError);
  });
});
