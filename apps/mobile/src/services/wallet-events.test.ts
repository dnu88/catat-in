import {
	getTransactionsVersion,
	notifyTransactionsChanged,
	subscribeTransactionsChanges,
} from "./wallet-events";

describe("wallet-events — transaction change topic", () => {
	const unsubscribes: Array<() => void> = [];

	afterEach(() => {
		while (unsubscribes.length) {
			unsubscribes.pop()?.();
		}
	});

	it("menaikkan versi dan memanggil semua listener saat notifyTransactionsChanged", () => {
		const before = getTransactionsVersion();
		const seen: number[] = [];
		unsubscribes.push(
			subscribeTransactionsChanges(() => seen.push(getTransactionsVersion())),
			subscribeTransactionsChanges(() => seen.push(getTransactionsVersion())),
		);

		notifyTransactionsChanged();

		expect(seen.length).toBe(2);
		expect(seen[0]).toBe(before + 1);
		expect(seen[1]).toBe(before + 1);
	});

	it("berhenti memanggil listener yang sudah unsubscribe", () => {
		let calls = 0;
		const unsubscribe = subscribeTransactionsChanges(() => {
			calls += 1;
		});

		unsubscribe();
		notifyTransactionsChanged();

		expect(calls).toBe(0);
	});

	it("listener yang error tidak memutus listener lain", () => {
		const good = jest.fn();
		unsubscribes.push(
			subscribeTransactionsChanges(() => {
				throw new Error("boom");
			}),
			subscribeTransactionsChanges(good),
		);

		expect(() => notifyTransactionsChanged()).not.toThrow();
		expect(good).toHaveBeenCalledTimes(1);
	});
});
