import React from "react";
import { Alert, Platform } from "react-native";
import { act, renderHook } from "@testing-library/react-native";
import { useDraftExitGuard } from "../use-draft-exit-guard";

const mockListeners = new Map<string, (event: any) => void>();
const mockNavigation = {
	addListener: jest.fn((type: string, listener: (event: any) => void) => {
		mockListeners.set(type, listener);
		return () => mockListeners.delete(type);
	}),
	dispatch: jest.fn(),
};
jest.mock("expo-router", () => ({
	useNavigation: () => mockNavigation,
	useFocusEffect: (callback: () => void | (() => void)) => {
		const React = require("react");
		React.useEffect(callback, [callback]);
	},
}));

const originalOS = Platform.OS;
const originalWindow = globalThis.window;
beforeEach(() => { mockListeners.clear(); jest.clearAllMocks(); });
afterEach(() => {
	Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
	globalThis.window = originalWindow;
	jest.restoreAllMocks();
});

it("browser Back cancellation retains draft and repeated Back still asks; discard alone leaves", () => {
	Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
	const browserListeners = new Map<string, (event: { stopImmediatePropagation: () => void }) => void>();
	const confirm = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(true);
	globalThis.window = {
		history: { pushState: jest.fn() }, location: { href: "https://example.test/transaction-new" },
		addEventListener: (type: string, listener: (event: { stopImmediatePropagation: () => void }) => void) => browserListeners.set(type, listener),
		removeEventListener: (type: string) => browserListeners.delete(type),
		confirm, alert: jest.fn(),
	} as unknown as Window & typeof globalThis;
	const discard = jest.fn(); const leave = jest.fn();
	const hook = renderHook(() => useDraftExitGuard({ enabled: true, dirty: true, blocked: false, isEn: true, onDiscard: discard, browserBack: leave }));
	act(() => browserListeners.get("popstate")!({ stopImmediatePropagation: jest.fn() }));
	expect(confirm).toHaveBeenCalledTimes(1); expect(discard).not.toHaveBeenCalled(); expect(leave).not.toHaveBeenCalled();
	act(() => browserListeners.get("popstate")!({ stopImmediatePropagation: jest.fn() }));
	expect(confirm).toHaveBeenCalledTimes(2); expect(discard).not.toHaveBeenCalled(); expect(leave).not.toHaveBeenCalled();
	act(() => browserListeners.get("popstate")!({ stopImmediatePropagation: jest.fn() }));
	expect(confirm).toHaveBeenCalledTimes(3); expect(discard).toHaveBeenCalledTimes(1); expect(leave).toHaveBeenCalledTimes(1);
	hook.unmount();
	act(() => browserListeners.get("popstate")!({ stopImmediatePropagation: jest.fn() }));
	expect(confirm).toHaveBeenCalledTimes(3); expect(leave).toHaveBeenCalledTimes(1);
});

it("uses the route URL rather than the pre-commit browser URL and cancels on unmount", () => {
	jest.useFakeTimers();
	Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
	const pushState = jest.fn();
	const win = {
		history: { state: { id: "capture" }, pushState },
		location: { href: "https://example.test/capture" },
		addEventListener: jest.fn(), removeEventListener: jest.fn(),
	};
	globalThis.window = win as unknown as Window & typeof globalThis;
	const hook = renderHook(() => useDraftExitGuard({ enabled: true, dirty: true,
		blocked: false, isEn: true, onDiscard: jest.fn(), browserBack: jest.fn(),
		browserUrl: "/transaction-new?transactionId=edit-123" }));
	try {
		expect(pushState).not.toHaveBeenCalled();
		win.location.href = "https://example.test/transaction-new?transactionId=edit-123";
		win.history.state = { id: "manual" };
		act(() => jest.advanceTimersByTime(16));
		expect(pushState).toHaveBeenCalledWith({ id: "manual", kaswiseManualBackGuard: true }, "", win.location.href);
	} finally { hook.unmount(); jest.useRealTimers(); }
});

it("saving or unknown outcomes block removal without offering discard or resetting", () => {
	const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
	const discard = jest.fn();
	renderHook(() => useDraftExitGuard({ enabled: true, dirty: true, blocked: true, isEn: true, onDiscard: discard }));
	const event = { preventDefault: jest.fn(), data: { action: { type: "GO_BACK" } } };
	act(() => mockListeners.get("beforeRemove")!(event));
	expect(event.preventDefault).toHaveBeenCalled(); expect(alert).toHaveBeenCalled();
	expect(alert.mock.calls[0][2]).toBeUndefined(); expect(discard).not.toHaveBeenCalled(); expect(mockNavigation.dispatch).not.toHaveBeenCalled();
});

it("flag OFF leaves navigation unchanged and removes listeners on unmount", () => {
	const alert = jest.spyOn(Alert, "alert"); const leave = jest.fn(); const discard = jest.fn();
	const hook = renderHook(() => useDraftExitGuard({ enabled: false, dirty: true, blocked: true, isEn: true, onDiscard: discard }));
	act(() => hook.result.current(leave));
	expect(leave).toHaveBeenCalledTimes(1); expect(alert).not.toHaveBeenCalled(); expect(mockListeners.size).toBe(0); expect(discard).not.toHaveBeenCalled();
	hook.unmount();
});
