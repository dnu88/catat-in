import { describe, expect, it } from "vitest";
import type { BillReminder, Transaction } from "@kaswise/shared/types";
import {
	computeBudgetSpentForPeriod,
	computeWalletBalancesFromTransactions,
	mergeAndDeduplicateTransactions,
	shouldIncludeBillInList,
} from "./firestore";

describe("firestore helpers", () => {
	it("mergeAndDeduplicateTransactions deduplicates own+shared by user_id:id", () => {
		const ownTx: Transaction = {
			id: "tx-1",
			wallet_id: "w1",
			user_id: "u1",
			type: "expense",
			amount: 100,
			category: "food",
			date: "2026-05-01",
			is_shared: true,
			visibility: "group",
			created_by: "u1",
			is_disputed: false,
			created_at: "2026-05-01T09:00:00.000Z",
		};
		const sharedDuplicate: Transaction = {
			...ownTx,
			created_at: "2026-05-01T08:00:00.000Z",
		};
		const sharedOther: Transaction = {
			...ownTx,
			id: "tx-2",
			user_id: "u2",
			amount: 50,
			created_at: "2026-05-02T10:00:00.000Z",
		};

		const merged = mergeAndDeduplicateTransactions(
			[ownTx],
			[sharedDuplicate, sharedOther],
		);

		expect(merged).toHaveLength(2);
		expect(merged[0].id).toBe("tx-2");
		expect(merged[1].id).toBe("tx-1");
	});

	it("computeBudgetSpentForPeriod sums matching expenses in month window", () => {
		const spent = computeBudgetSpentForPeriod(
			{ category: "food", period_start: "2026-05-01" },
			[
				{ type: "expense", category: "food", date: "2026-05-03", amount: 100 },
				{ type: "expense", category: "food", date: "2026-05-20", amount: 250 },
				{
					type: "expense",
					category: "transport",
					date: "2026-05-20",
					amount: 999,
				},
				{ type: "income", category: "food", date: "2026-05-20", amount: 999 },
				{ type: "expense", category: "food", date: "2026-06-01", amount: 700 },
			],
		);

		expect(spent).toBe(350);
	});

	it("computeWalletBalancesFromTransactions returns running totals per wallet", () => {
		const rows: Array<Pick<Transaction, "wallet_id" | "type" | "amount">> = [
			{ wallet_id: "w1", type: "income", amount: 1000 },
			{ wallet_id: "w1", type: "expense", amount: 250 },
			{ wallet_id: "w2", type: "expense", amount: 300 },
			{ wallet_id: "w2", type: "income", amount: 50 },
		];

		const result = computeWalletBalancesFromTransactions(rows);

		expect(result).toEqual({
			w1: 750,
			w2: -250,
		});
	});

	it("shouldIncludeBillInList keeps active bills and paid one-time history", () => {
		const activeBill: BillReminder = {
			id: "b1",
			user_id: "u1",
			name: "Listrik",
			amount: 500000,
			due_day: 10,
			recurrence: "monthly",
			next_due_date: "2026-05-10",
			is_active: true,
			is_paid: false,
			notify_before_days: [3, 1],
			created_at: "2026-05-01T00:00:00.000Z",
		};
		const oncePaidBill: BillReminder = {
			...activeBill,
			id: "b2",
			recurrence: "once",
			is_active: false,
			is_paid: true,
		};
		const inactiveRecurring: BillReminder = {
			...activeBill,
			id: "b3",
			is_active: false,
			is_paid: true,
		};

		expect(shouldIncludeBillInList(activeBill)).toBe(true);
		expect(shouldIncludeBillInList(oncePaidBill)).toBe(true);
		expect(shouldIncludeBillInList(inactiveRecurring)).toBe(false);
	});
});
