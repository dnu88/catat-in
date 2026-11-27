import { renderHook, waitFor, act } from "@testing-library/react-native";

const channelHandlers = new Map<string, (payload: unknown) => void>();
const subscribeMocks: Array<() => void> = [];
const removedChannels: string[] = [];

// Mock meniru perilaku supabase-js: `channel(topic)` mengembalikan instance
// yang SAMA untuk topik yang sama, dan `.on('postgres_changes')` setelah
// subscribe melempar error. Ini yang membuat Beranda+Laporan crash di
// produksi saat memakai nama channel identik.
const channelRegistry = new Map<string, { subscribed: boolean }>();
const mockSupabase = {
	auth: { getUser: jest.fn(async () => ({ data: { user: { id: "user-1" } } })) },
	channel: jest.fn((topic: string) => {
		const entry = channelRegistry.get(topic) ?? { subscribed: false };
		channelRegistry.set(topic, entry);
		return {
			topic,
			on: (
				event: string,
				_filter: Record<string, unknown>,
				callback: (payload: unknown) => void,
			) => {
				if (entry.subscribed) {
					throw new Error(
						`cannot add postgres_changes callbacks for realtime:${topic} after subscribe().`,
					);
				}
				channelHandlers.set(event, callback);
				return {
					subscribe: () => {
						entry.subscribed = true;
						subscribeMocks.push(() => channelHandlers.delete(event));
					},
				};
			},
			subscribe: () => {
				entry.subscribed = true;
				subscribeMocks.push(() => channelHandlers.clear());
			},
			unsubscribe: () => {},
		};
	}),
	removeChannel: jest.fn(async (channel: { topic?: string } | undefined) => {
		const topic = channel?.topic ?? "unknown";
		removedChannels.push(topic);
		channelRegistry.delete(topic);
	}),
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

	it("dua instance (Beranda + Laporan) tidak berbagi channel yang sama", async () => {
		jest.useRealTimers();
		const first = renderHook(() => useTransactionsChanged(jest.fn(), 400));
		const second = renderHook(() => useTransactionsChanged(jest.fn(), 400));

		await waitFor(() => expect(mockSupabase.channel).toHaveBeenCalledTimes(2));
		const topics = mockSupabase.channel.mock.calls.map(([topic]) => topic as string);
		expect(new Set(topics).size).toBe(2);
		expect(() => first.unmount()).not.toThrow();
		expect(() => second.unmount()).not.toThrow();
	});

	it("realtime filter mengikuti finance context aktif", () => {
		expect(transactionRealtimeFilter({ type: "personal" })).toBeUndefined();
		expect(
			transactionRealtimeFilter({ type: "household", householdId: "hh-1" }),
		).toBe("household_id=eq.hh-1");
	});
});
