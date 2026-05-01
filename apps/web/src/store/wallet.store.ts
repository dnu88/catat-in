import { create } from "zustand";
import type { Wallet } from "@catat-in/shared/types";
import {
	addWallet,
	listWallets,
	patchWallet,
	removeWallet,
	requireAuthUid,
} from "@lib/firestore";

const getErrorMessage = (err: unknown, fallback: string) =>
	err instanceof Error ? err.message : fallback;

export interface WalletFormData {
	name: string;
	type: "bank" | "ewallet" | "cash" | "investment";
	balance: number;
	bank_name?: string;
	account_number?: string;
}

interface WalletState {
	wallets: Wallet[];
	isLoading: boolean;
	error: string | null;
	fetchWallets: () => Promise<void>;
	addWallet: (data: WalletFormData) => Promise<void>;
	updateWallet: (id: string, data: Partial<WalletFormData>) => Promise<void>;
	deleteWallet: (id: string) => Promise<void>;
	totalBalance: () => number;
	clearError: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
	wallets: [],
	isLoading: false,
	error: null,

	fetchWallets: async () => {
		set({ isLoading: true, error: null });
		try {
			const uid = requireAuthUid();
			const wallets = await listWallets(uid);
			set({ wallets });
		} catch (err: unknown) {
			set({ error: getErrorMessage(err, "Gagal memuat wallet.") });
		} finally {
			set({ isLoading: false });
		}
	},

	addWallet: async (formData) => {
		const uid = requireAuthUid();
		await addWallet(uid, formData);
		await get().fetchWallets();
	},

	updateWallet: async (id, formData) => {
		const uid = requireAuthUid();
		await patchWallet(uid, id, formData);
		await get().fetchWallets();
	},

	deleteWallet: async (id) => {
		const uid = requireAuthUid();
		await removeWallet(uid, id);
		await get().fetchWallets();
	},

	totalBalance: () =>
		get().wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0),
	clearError: () => set({ error: null }),
}));
