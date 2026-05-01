import { create } from "zustand";
import type { Budget, BudgetFormData } from "@catat-in/shared/types";
import {
	createBudget,
	listBudgets,
	patchBudget,
	removeBudget,
	requireAuthUid,
} from "@lib/firestore";

const getErrorMessage = (err: unknown, fallback: string) =>
	err instanceof Error ? err.message : fallback;

interface BudgetWithSpent extends Budget {
	spent_amount: number;
}

interface BudgetState {
	budgets: BudgetWithSpent[];
	isLoading: boolean;
	error: string | null;
	fetchBudgets: (periodStart?: string) => Promise<void>;
	addBudget: (data: BudgetFormData) => Promise<void>;
	updateBudget: (id: string, data: Partial<BudgetFormData>) => Promise<void>;
	deleteBudget: (id: string) => Promise<void>;
	clearError: () => void;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
	budgets: [],
	isLoading: false,
	error: null,

	fetchBudgets: async (periodStart) => {
		set({ isLoading: true, error: null });
		try {
			const uid = requireAuthUid();
			const budgets = await listBudgets(uid, periodStart);
			set({ budgets });
		} catch (err: unknown) {
			set({ error: getErrorMessage(err, "Gagal memuat budget.") });
		} finally {
			set({ isLoading: false });
		}
	},

	addBudget: async (formData) => {
		const uid = requireAuthUid();
		await createBudget(uid, formData);
		await get().fetchBudgets(formData.period_start);
	},

	updateBudget: async (id, formData) => {
		const uid = requireAuthUid();
		await patchBudget(uid, id, formData);
		await get().fetchBudgets(formData.period_start);
	},

	deleteBudget: async (id) => {
		const uid = requireAuthUid();
		await removeBudget(uid, id);
		await get().fetchBudgets();
	},

	clearError: () => set({ error: null }),
}));
