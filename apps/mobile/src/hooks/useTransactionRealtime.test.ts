import { renderHook, waitFor } from "@testing-library/react-native";

import {
	transactionChannelName,
	transactionRealtimeFilter,
	useTransactionRealtime,
} from "./useTransactionRealtime";
import type { FinanceContext } from "../services/finance-context-query";

let mockActiveContext: FinanceContext = { type: "personal" };
let mockPendingFetches: Array<(value: { data: unknown }) => void> = [];
const unsubscribe = jest.fn();
type MockChannel = {
	on: jest.Mock<MockChannel, unknown[]>;
	subscribe: jest.Mock<MockChannel, []>;
	unsubscribe: jest.Mock<void, []>;
};
type MockQuery = {
	select: jest.Mock<MockQuery, unknown[]>;
	eq: jest.Mock<MockQuery, unknown[]>;
	is: jest.Mock<MockQuery, unknown[]>;
	maybeSingle: jest.Mock<Promise<{ data: unknown }>, []>;
};
const mockChannel: MockChannel = {
	on: jest.fn(() => mockChannel),
	subscribe: jest.fn(() => mockChannel),
	unsubscribe,
};
const mockMaybeSingle = jest.fn(
	() => new Promise<{ data: unknown }>((resolve) => mockPendingFetches.push(resolve)),
);
const mockQuery: MockQuery = {
	select: jest.fn(() => mockQuery),
	eq: jest.fn(() => mockQuery),
	is: jest.fn(() => mockQuery),
	maybeSingle: mockMaybeSingle,
};

jest.mock("../state/finance-context", () => ({
	useFinanceContext: () => ({ activeContext: mockActiveContext }),
}));

jest.mock("../lib/supabase", () => ({
	supabase: {
		from: jest.fn(() => mockQuery),
		channel: jest.fn(() => mockChannel),
	},
}));

describe("transaction realtime helpers", () => {
	beforeEach(() => {
		mockActiveContext = { type: "personal" };
		mockPendingFetches = [];
		unsubscribe.mockClear();
		mockChannel.on.mockClear();
		mockChannel.subscribe.mockClear();
		mockQuery.select.mockClear();
		mockQuery.eq.mockClear();
		mockQuery.is.mockClear();
		mockMaybeSingle.mockClear();
	});
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

	it("ignores stale initial fetches after switching context", async () => {
		const { result, rerender } = renderHook(() =>
			useTransactionRealtime("tx-1"),
		);
		expect(mockPendingFetches).toHaveLength(1);

		mockActiveContext = { type: "household", householdId: "hh-1", role: "admin" };
		rerender({});
		expect(mockPendingFetches).toHaveLength(2);

		mockPendingFetches[0]({
			data: { id: "tx-1", household_id: null, status: "done" },
		});
		await waitFor(() => expect(result.current.transaction).toBeNull());

		mockPendingFetches[1]({
			data: { id: "tx-1", household_id: "hh-1", status: "done" },
		});
		await waitFor(() =>
			expect(result.current.transaction).toMatchObject({ household_id: "hh-1" }),
		);
	});

	it("unsubscribes and ignores realtime events after unmount", () => {
		const { unmount } = renderHook(() => useTransactionRealtime("tx-1"));
		const handler = mockChannel.on.mock.calls[0][2] as (payload: {
			new?: { id: string; household_id?: string | null };
		}) => void;

		unmount();
		expect(unsubscribe).toHaveBeenCalledTimes(1);
		expect(() =>
			handler({ new: { id: "tx-1", household_id: null } }),
		).not.toThrow();
	});
});
