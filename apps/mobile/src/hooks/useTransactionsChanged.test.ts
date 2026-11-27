import { renderHook, waitFor, act } from "@testing-library/react-native";

const channelHandlers = new Map<string, (payload: unknown) => void>();
const subscribeMocks: Array<() => void> = [];
const removedChannels: string[] = [];

const mockSupabase = {
	auth: { getUser: jest.fn(async () => ({ data: { user: { id: "user-1" } } })) },
	channel: jest.fn(() => mockChannel),
	removeChannel: jest.fn(async (channel: { topic: string }) => {
		removedChannels.push(channel.topic);
	}),
};

type MockChannel = {
	topic: string;
	on: (
		event: string,
		filter: Record<string, unknown>,
		callback: (payload: unknown) => void,
	) => MockChannel;
	subscribe: (cb?: (status: string) => void) => MockChannel;
	unsubscribe: () => void;
};

const mockChannel: MockChannel = {
	topic: "transactions-changed:test",
	on: (_event, _filter, callback) => {
		channelHandlers.set(_event, callback);
		return mockChannel;
	},
	subscribe: (cb) => {
		cb?.("SUBSCRIBED");
		subscribeMocks.push(() => channelHandlers.delete("postgres_changes"));
		return mockChannel;
	},
	unsubscribe: jest.fn(),
};

// factory jest.mock di-hoist — kirim instance lewat globalThis agar tidak TDZ.
jest.mock("../lib/supabase", () => ({
	get supabase() {
		return (globalThis as { __MOCK_SUPABASE__?: unknown }).__MOCK_SUPABASE__;
	},
}));

const mockActiveContext = { type: "personal" } as const;
jest.mock("../state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockActiveContext,
		memberships: [],
		setPersonalContext: jest.fn(),
		setActiveHousehold: jest.fn(),
	}),
}));

import {
	notifyTransactionsChanged,
	subscribeTransactionsChanges,
} from "../services/wallet-events";
import {
	transactionRealtimeFilter,
	// Sudah diekspor untuk hook lain; dipakai di sini untuk verifikasi filter.
} from "./useTransactionRealtime";
import { useTransactionsChanged } from "./useTransactionsChanged";

(globalThis as { __MOCK_SUPABASE__?: unknown }).__MOCK_SUPABASE__ = mockSupabase;

describe("useTransactionsChanged", () => {
	const unsubscribes: Array<() => void> = [];

	beforeEach(() => {
		jest.clearAllMocks();
		channelHandlers.clear();
		removedChannels.length = 0;
		jest.useFakeTimers();
	});

	afterEach(() => {
		while (unsubscribes.length) {
			unsubscribes.pop()?.();
		}
		jest.useRealTimers();
	});

	it("memanggil onChanged (debounce) saat event bus lokal dipicu", async () => {
		const onChanged = jest.fn();
		const { unmount } = renderHook(() => useTransactionsChanged(onChanged, 400));
		unsubscribes.push(unmount);

		await waitFor(() => expect(subscribeMocks.length).toBeGreaterThan(0));

		act(() => {
			notifyTransactionsChanged();
			notifyTransactionsChanged(); // burst — debounce harus menggabungkan
		});
		expect(onChanged).not.toHaveBeenCalled();

		act(() => {
			jest.advanceTimersByTime(400);
		});
		expect(onChanged).toHaveBeenCalledTimes(1);
	});

	it("memanggil onChanged saat event realtime postgres_changes masuk", async () => {
		const onChanged = jest.fn();
		const { unmount } = renderHook(() => useTransactionsChanged(onChanged, 400));
		unsubscribes.push(unmount);

		await waitFor(() => expect(channelHandlers.has("postgres_changes")).toBe(true));

		act(() => {
			channelHandlers.get("postgres_changes")?.({
				new: { id: "tx-1" },
				old: {},
			});
		});
		act(() => {
			jest.advanceTimersByTime(400);
		});
		expect(onChanged).toHaveBeenCalledTimes(1);
	});

	it("unmount: unsubscribe bus + removeChannel realtime, timer tidak menembak", async () => {
		const onChanged = jest.fn();
		const busUnsubscribe = jest.fn();
		const spy = jest
			.spyOn(require("../services/wallet-events"), "subscribeTransactionsChanges")
			.mockImplementation((fn: () => void) => {
				void fn;
				return busUnsubscribe;
			});

		const { unmount } = renderHook(() => useTransactionsChanged(onChanged, 400));
		await waitFor(() => expect(mockSupabase.channel).toHaveBeenCalled());

		unmount();

		expect(busUnsubscribe).toHaveBeenCalledTimes(1);
		expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(1);

		act(() => {
			notifyTransactionsChanged();
			jest.advanceTimersByTime(400);
		});
		expect(onChanged).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it("realtime filter mengikuti finance context aktif", () => {
		expect(transactionRealtimeFilter({ type: "personal" })).toBeUndefined();
		expect(
			transactionRealtimeFilter({ type: "household", householdId: "hh-1" }),
		).toBe("household_id=eq.hh-1");
	});
});
