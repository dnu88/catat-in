import { Platform } from "react-native";
import { act, renderHook } from "@testing-library/react-native";
import { useDraftExitGuard } from "../use-draft-exit-guard";

jest.mock("expo-router", () => ({
	useNavigation: () => null,
	useFocusEffect: (callback: () => void | (() => void)) => {
		const React = require("react");
		React.useEffect(callback, [callback]);
	},
}));

it("browser Back repeatedly blocks saving/unknown outcomes; flag OFF never arms history", () => {
	const originalOS = Platform.OS;
	const originalWindow = globalThis.window;
	const listeners = new Map<string, (event: { stopImmediatePropagation: () => void }) => void>();
	const pushState = jest.fn(); const confirm = jest.fn(); const alert = jest.fn();
	Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
	globalThis.window = {
		history: { state: { id: "manual" }, pushState }, location: { href: "https://example.test/transaction-new" },
		addEventListener: (type: string, listener: (event: { stopImmediatePropagation: () => void }) => void) => listeners.set(type, listener),
		removeEventListener: (type: string) => listeners.delete(type), confirm, alert,
	} as unknown as Window & typeof globalThis;
	const leave = jest.fn(); const discard = jest.fn();
	try {
		const hook = renderHook(({ enabled }) => useDraftExitGuard({ enabled, dirty: true, blocked: true, isEn: true, onDiscard: discard, browserBack: leave }), { initialProps: { enabled: false } });
		expect(pushState).not.toHaveBeenCalled(); expect(listeners.size).toBe(0);
		hook.unmount();
		const guarded = renderHook(() => useDraftExitGuard({ enabled: true, dirty: true, blocked: true, isEn: true, onDiscard: discard, browserBack: leave }));
		for (let i = 0; i < 2; i++) {
			const stop = jest.fn();
			act(() => listeners.get("popstate")!({ stopImmediatePropagation: stop }));
			expect(stop).toHaveBeenCalledTimes(1);
		}
		expect(alert).toHaveBeenCalledTimes(2); expect(confirm).not.toHaveBeenCalled();
		expect(leave).not.toHaveBeenCalled(); expect(discard).not.toHaveBeenCalled();
		expect(pushState).toHaveBeenCalledTimes(3);
		guarded.unmount();
	} finally {
		Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
		globalThis.window = originalWindow;
	}
});
