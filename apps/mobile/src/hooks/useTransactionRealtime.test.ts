import {
	transactionChannelName,
	transactionRealtimeFilter,
} from "./useTransactionRealtime";
import type { FinanceContext } from "../services/finance-context-query";

describe("transaction realtime helpers", () => {
	it("uses a deterministic personal channel", () => {
		const context: FinanceContext = { type: "personal" };

		expect(transactionChannelName(context)).toBe("transactions:personal");
	});

	it("uses a deterministic household channel", () => {
		const context: FinanceContext = {
			type: "household",
			householdId: "hh-1",
			role: "admin",
		};

		expect(transactionChannelName(context)).toBe("transactions:household:hh-1");
	});

	it("does not apply a personal realtime filter so personal events can refetch safely", () => {
		const context: FinanceContext = { type: "personal" };

		expect(transactionRealtimeFilter(context)).toBeUndefined();
	});

	it("uses a deterministic household realtime filter", () => {
		const context: FinanceContext = {
			type: "household",
			householdId: "hh-1",
			role: "member",
		};

		expect(transactionRealtimeFilter(context)).toBe("household_id=eq.hh-1");
	});
});
