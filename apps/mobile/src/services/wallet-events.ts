/**
 * Lightweight wallet change notification system.
 * Bumps a version counter whenever a wallet-affecting operation completes.
 * The Wallets screen subscribes to trigger a re-fetch via useFocusEffect.
 */

type Listener = () => void;

let _version = 0;
const _listeners = new Set<Listener>();

export function getWalletVersion(): number {
	return _version;
}

export function notifyWalletChanged(): void {
	_version++;
	_listeners.forEach((fn) => {
		try {
			fn();
		} catch {
			// Swallow — one bad listener must not break the others.
		}
	});
}

export function subscribeWalletChanges(fn: Listener): () => void {
	_listeners.add(fn);
	return () => {
		_listeners.delete(fn);
	};
}
