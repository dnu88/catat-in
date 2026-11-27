/** Web-only, screen-local Back interception for Manual entry. */
export const MANUAL_BACK_RETURN_URL = "/(tabs)/capture";

type BackEvent = { stopImmediatePropagation: () => void };
export type ManualBackGuardWindow = {
	history: { state?: unknown; pushState: (state: unknown, title: string, url?: string) => void };
	location: { href: string };
	addEventListener: (type: string, listener: (event: BackEvent) => void, capture?: boolean) => void;
	removeEventListener: (type: string, listener: (event: BackEvent) => void, capture?: boolean) => void;
};

// popstate targets Window itself: capture=true does NOT outrank an earlier
// Window listener. Install during route-module evaluation, before useLinking's
// effect subscribes, rather than waiting for Manual's focus effect.
const dispatchers = new WeakMap<ManualBackGuardWindow, { active?: (event: BackEvent) => void }>();
function prepareDispatcher(target: ManualBackGuardWindow) {
	let dispatcher = dispatchers.get(target);
	if (!dispatcher) {
		dispatcher = {};
		const current = dispatcher;
		target.addEventListener("popstate", (event) => current.active?.(event), true);
		dispatchers.set(target, dispatcher);
	}
	return dispatcher;
}
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
	prepareDispatcher(window as unknown as ManualBackGuardWindow);
}

export type ManualBackGuardDeps = {
	isWeb: boolean;
	/** Intended URL from Expo route state, which can lead window.location on focus. */
	url?: string;
	onBack: () => void;
	win?: ManualBackGuardWindow;
};

/**
 * Own a same-URL sentinel while Manual is focused. Expo Router's
 * createMemoryHistory identifies entries by history.state.id; retain that id
 * (and other router metadata), not just our marker.
 *
 * Expo useLinking listens in the bubble phase and may resetRoot immediately.
 * The early dispatcher must stop that listener BEFORE asking whether to discard.
 * popstate is not cancelable: restore the saved Manual URL/state with pushState
 * before asking, replenishing the sentinel for cancellation or a blocked save.
 * Only onBack may explicitly navigate. Cleanup releases interception on blur.
 */
export function armManualBackGuard({ isWeb, url: intendedUrl, onBack, win }: ManualBackGuardDeps): () => void {
	const target =
		win ?? (typeof window !== "undefined" ? (window as unknown as ManualBackGuardWindow) : undefined);
	if (
		!isWeb || !target || !target.history ||
		typeof target.history.pushState !== "function" || !target.location ||
		typeof target.addEventListener !== "function" ||
		typeof target.removeEventListener !== "function"
	) return () => {};

	const dispatcher = prepareDispatcher(target);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let onPopState: ((event: BackEvent) => void) | undefined;
	let cancelled = false;
	const expected = intendedUrl ? new URL(intendedUrl, target.location.href) : undefined;
	const searchKey = (url: URL) => {
		// React Native's URLSearchParams polyfill may expose a no-op sort().
		// Sort decoded keys ourselves; stable ordering retains duplicate values.
		const pairs: Array<[string, string]> = [];
		new URLSearchParams(url.search).forEach((value, key) => pairs.push([key, value]));
		return JSON.stringify(pairs.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0));
	};
	const arm = () => {
		if (cancelled) return;
		const current = expected ? new URL(target.location.href) : undefined;
		if (expected && current && (current.origin !== expected.origin ||
			current.pathname !== expected.pathname || searchKey(current) !== searchKey(expected))) {
			// Focus precedes useLinking's history commit. Do not write a sentinel or
			// snapshot an id belonging to Capture; push may allocate a new Manual id.
			timer = setTimeout(arm, 16);
			return;
		}
		const url = target.location.href;
		const state = { ...(target.history.state as object), kaswiseManualBackGuard: true };
		const restore = () => target.history.pushState(state, "", url);
		onPopState = (event: BackEvent) => {
			event.stopImmediatePropagation();
			restore();
			onBack();
		};
		dispatcher.active = onPopState;
		restore();
	};
	arm();
	return () => {
		cancelled = true;
		if (timer !== undefined) clearTimeout(timer);
		if (onPopState && dispatcher.active === onPopState) dispatcher.active = undefined;
	};
}
