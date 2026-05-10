import { create } from "zustand";
import type { Transaction, TransactionFormData } from "@kaswise/shared/types";
import {
	createTransaction,
	listTransactions,
	patchTransaction,
	removeTransaction,
	requireAuthUid,
	type TransactionFilters,
} from "@lib/firestore";

const getErrorMessage = (err: unknown, fallback: string) =>
	err instanceof Error ? err.message : fallback;

interface TransactionState {
	transactions: Transaction[];
	total: number;
	isLoading: boolean;
	error: string | null;
	filters: TransactionFilters;
	fetchTransactions: (filters?: TransactionFilters) => Promise<void>;
	addTransaction: (data: TransactionFormData) => Promise<Transaction>;
	updateTransaction: (
		id: string,
		data: Partial<TransactionFormData>,
	) => Promise<void>;
	deleteTransaction: (id: string) => Promise<void>;
	setFilters: (filters: TransactionFilters) => void;
	clearError: () => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
	transactions: [],
	total: 0,
	isLoading: false,
	error: null,
	filters: { page: 1, per_page: 20 },

	fetchTransactions: async (filters) => {
		const activeFilters = { ...get().filters, ...filters };
		set({ isLoading: true, error: null, filters: activeFilters });
		try {
			const uid = requireAuthUid();
			const result = await listTransactions(uid, activeFilters);
			set({ transactions: result.data, total: result.total });
		} catch (err: unknown) {
			set({ error: getErrorMessage(err, "Gagal memuat transaksi.") });
		} finally {
			set({ isLoading: false });
		}
	},

	addTransaction: async (formData) => {
		const uid = requireAuthUid();
		const tx = await createTransaction(uid, formData);
		await get().fetchTransactions();
		return tx;
	},

	updateTransaction: async (id, formData) => {
		const uid = requireAuthUid();
		await patchTransaction(uid, id, formData);
		await get().fetchTransactions();
	},

	deleteTransaction: async (id) => {
		const uid = requireAuthUid();
		await removeTransaction(uid, id);
		await get().fetchTransactions();
	},

	setFilters: (filters) =>
		set((state) => ({ filters: { ...state.filters, ...filters } })),
	clearError: () => set({ error: null }),
}));
