import { armManualBackGuard, MANUAL_BACK_RETURN_URL, type ManualBackGuardWindow } from "../manual-back-guard";

function fakeWindow() {
	const listeners: Record<string, Array<(event: { stopImmediatePropagation: () => void }) => void>> = {};
	const pushes: Array<{ state: unknown; url: string }> = [];
	const win: ManualBackGuardWindow = {
		history: {
			state: { id: "manual-router-id", otherMetadata: "preserve" },
			pushState: (state, _title, url) => {
				pushes.push({ state, url: url ?? "" });
			},
		},
		location: { href: "http://preview.local/capture" },
		addEventListener: (type, listener) => {
			(listeners[type] ??= []).push(listener);
		},
		removeEventListener: (type, listener) => {
			listeners[type] = (listeners[type] ?? []).filter((entry) => entry !== listener);
		},
	};
	return { win, pushes, listeners, fire: (type: string) => (listeners[type] ?? []).forEach((l) => l({ stopImmediatePropagation: jest.fn() })) };
}

describe("armManualBackGuard (finding #2 / T12-F1)", () => {
	it("waits for the intended edit URL and snapshots the committed Manual router id", () => {
		jest.useFakeTimers();
		const { win, pushes, fire } = fakeWindow();
		win.history.state = { id: "capture-router-id" };
		const onBack = jest.fn();
		const cleanup = armManualBackGuard({ isWeb: true,
			url: "/transaction-new?transactionId=edit%2F123&scope=household", onBack, win });
		try {
			expect(pushes).toHaveLength(0);
			// Neither a wrong screen nor a different edit scope is sufficient.
			win.location.href = "http://preview.local/transaction-new?transactionId=other&scope=household";
			jest.advanceTimersByTime(16);
			expect(pushes).toHaveLength(0);
			win.location.href = "http://preview.local/transaction-new?scope=household&transactionId=edit%2F123#note";
			win.history.state = { id: "committed-manual-id", otherMetadata: "preserve" };
			jest.advanceTimersByTime(16);
			expect(pushes).toHaveLength(1);
			fire("popstate");
			expect(onBack).toHaveBeenCalledTimes(1);
			expect(pushes[1]).toEqual(pushes[0]);
			expect(pushes[1].url).toBe(win.location.href);
			expect(pushes[1].state).toEqual({ id: "committed-manual-id", otherMetadata: "preserve", kaswiseManualBackGuard: true });
		} finally { cleanup(); jest.useRealTimers(); }
	});

	it("blur before the URL commit cancels pending arming without stealing the next guard", () => {
		jest.useFakeTimers();
		const { win, pushes, fire } = fakeWindow();
		const oldBack = jest.fn(); const nextBack = jest.fn();
		const cleanup = armManualBackGuard({ isWeb: true, url: "/transaction-new", onBack: oldBack, win });
		cleanup();
		win.location.href = "http://preview.local/transaction-new";
		const nextCleanup = armManualBackGuard({ isWeb: true, url: "/transaction-new", onBack: nextBack, win });
		try {
			jest.runOnlyPendingTimers();
			cleanup();
			expect(pushes).toHaveLength(1);
			fire("popstate");
			expect(oldBack).not.toHaveBeenCalled();
			expect(nextBack).toHaveBeenCalledTimes(1);
		} finally { nextCleanup(); jest.useRealTimers(); }
	});
	it("pushes exactly one sentinel history entry on web", () => {
		const { win, pushes } = fakeWindow();
		armManualBackGuard({ isWeb: true, onBack: () => {}, win });

		expect(pushes).toHaveLength(1);
		expect(pushes[0].url).toBe("http://preview.local/capture");
		expect(pushes[0].state).toEqual({ id: "manual-router-id", otherMetadata: "preserve", kaswiseManualBackGuard: true });
	});

	it("returns to the capture tab when Back is pressed, instead of leaving the app", () => {
		const { win, fire } = fakeWindow();
		const onBack = jest.fn();
		armManualBackGuard({ isWeb: true, onBack, win });

		fire("popstate");

		expect(onBack).toHaveBeenCalledTimes(1);
		expect(MANUAL_BACK_RETURN_URL).toBe("/(tabs)/capture");
	});

	it("replenishes the sentinel on repeated Back until cleanup", () => {
		const { win, fire, pushes } = fakeWindow();
		const onBack = jest.fn();
		armManualBackGuard({ isWeb: true, onBack, win });

		fire("popstate");
		fire("popstate");

		expect(onBack).toHaveBeenCalledTimes(2);
		expect(pushes).toHaveLength(3);
	});

	it("cleanup disables interception and is safe to call twice", () => {
		const { win, fire, listeners } = fakeWindow();
		const onBack = jest.fn();
		const cleanup = armManualBackGuard({ isWeb: true, onBack, win });

		cleanup();
		cleanup();
		fire("popstate");

		expect(listeners.popstate ?? []).toHaveLength(1); // inert bootstrap dispatcher
		expect(onBack).not.toHaveBeenCalled();
	});

	it("is a no-op off web (native) and never throws on a partial window", () => {
		const { win, pushes, fire } = fakeWindow();
		const onBack = jest.fn();
		armManualBackGuard({ isWeb: false, onBack, win });
		fire("popstate");

		expect(pushes).toHaveLength(0);
		expect(onBack).not.toHaveBeenCalled();

		// no window at all
		expect(() => armManualBackGuard({ isWeb: true, onBack, win: undefined })()).not.toThrow();
		// window exists but has no usable history (this is the real jsdom/SSR case)
		const partial = { location: { href: "x" } } as unknown as ManualBackGuardWindow;
		expect(() => armManualBackGuard({ isWeb: true, onBack, win: partial })()).not.toThrow();
		// history present, addEventListener missing
		const halfWindow = {
			history: { pushState: () => {} },
			location: { href: "x" },
		} as unknown as ManualBackGuardWindow;
		expect(() => armManualBackGuard({ isWeb: true, onBack, win: halfWindow })()).not.toThrow();
	});
});
