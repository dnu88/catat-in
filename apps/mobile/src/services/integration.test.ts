/**
 * Integration test: wallet + transaction flow
 * Validates service-layer orchestration with mocked Supabase.
 * No real network calls.
 */

import { createWallet } from "./wallets";
import { createTransaction } from "./transactions";
import { supabase } from "../lib/supabase";

jest.mock("../lib/supabase");

describe("Wallet + Transaction Integration Flow", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(supabase as any).auth = {
			getUser: jest
				.fn()
				.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
		};
	});

	test("wallet creation returns id and passes correct payload", async () => {
		const mockWallet = {
			id: "wallet-abc",
			name: "Main Wallet",
			type: "cash",
			balance: 0,
			currency: "IDR",
			is_active: true,
		};

		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: mockWallet, error: null });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		const wallet = await createWallet({ name: "Main Wallet", type: "cash" });

		expect(mockInsert).toHaveBeenCalledWith({
			user_id: "user-123",
			household_id: null,
			created_by: "user-123",
			updated_by: "user-123",
			name: "Main Wallet",
			type: "cash",
			balance: 0,
			currency: "IDR",
			is_active: true,
		});
		expect(wallet.id).toBe("wallet-abc");
	});

	test("chained flow: create wallet then transaction with wallet id", async () => {
		const mockWallet = {
			id: "wallet-chain",
			name: "Chained Wallet",
			type: "cash",
			balance: 50000,
			currency: "IDR",
			is_active: true,
		};

		const mockTx = {
			id: "tx-chain",
			wallet_id: mockWallet.id,
			transaction_type: "expense",
			amount: 15000,
			category: "Food",
			description: "Lunch",
		};

		// Mock wallet creation
		const walletSingle = jest
			.fn()
			.mockResolvedValue({ data: mockWallet, error: null });
		const walletSelect = jest.fn().mockReturnValue({ single: walletSingle });
		const walletInsert = jest.fn().mockReturnValue({ select: walletSelect });

		// Mock transaction creation
		const txSingle = jest.fn().mockResolvedValue({ data: mockTx, error: null });
		const txSelect = jest.fn().mockReturnValue({ single: txSingle });
		const txInsert = jest.fn().mockReturnValue({ select: txSelect });

		(supabase.from as jest.Mock)
			.mockReturnValueOnce({ insert: walletInsert })
			.mockReturnValueOnce({ insert: txInsert });

		const wallet = await createWallet({
			name: "Chained Wallet",
			type: "cash",
			balance: 50000,
		});
		const tx = await createTransaction({
			wallet_id: wallet.id,
			transaction_type: "expense",
			amount: 15000,
			category: "Food",
			description: "Lunch",
		});

		expect(wallet.id).toBe("wallet-chain");
		expect(tx.wallet_id).toBe(wallet.id);
		expect(tx.id).toBe("tx-chain");
	});

	test("transaction creation returns id and references wallet_id", async () => {
		const walletId = "wallet-abc";
		const mockTx = {
			id: "tx-xyz",
			wallet_id: walletId,
			transaction_type: "expense",
			amount: 25000,
			category: "Food",
			description: "Lunch",
		};

		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: mockTx, error: null });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		const tx = await createTransaction({
			wallet_id: walletId,
			transaction_type: "expense",
			amount: 25000,
			category: "Food",
			description: "Lunch",
		});

		expect(tx.id).toBe("tx-xyz");
		expect(tx.wallet_id).toBe(walletId);
	});

	test("wallet creation failure propagates error", async () => {
		const mockError = { message: "insert failed", code: "23505" };

		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: null, error: mockError });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		await expect(
			createWallet({ name: "Dupe Wallet", type: "bank" }),
		).rejects.toEqual(mockError);
	});

	test("transaction creation failure propagates error", async () => {
		const mockError = { message: "foreign key violation", code: "23503" };

		const mockSingle = jest
			.fn()
			.mockResolvedValue({ data: null, error: mockError });
		const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
		(supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

		await expect(
			createTransaction({
				wallet_id: "nonexistent-wallet",
				transaction_type: "expense",
				amount: 5000,
				category: "Transport",
				description: "Grab",
			}),
		).rejects.toEqual(mockError);
	});
});
