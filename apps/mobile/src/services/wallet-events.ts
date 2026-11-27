/**
 * Lightweight change notification bus.
 *
 * Dua topik di satu bus sederhana:
 * - wallet changes: dompet tambah/edit/hapus (didengar layar Dompet).
 * - transaction changes: transaksi dibuat/diedit/dihapus (AI teks/suara/struk,
 *   manual, edit, undo auto-save) — didengar Beranda & Laporan supaya angka
 *   refetch tanpa pindah tab atau pull-to-refresh (bug 27 Nov).
 */

type Listener = () => void;

let _walletVersion = 0;
const _walletListeners = new Set<Listener>();

export function getWalletVersion(): number {
	return _walletVersion;
}

export function notifyWalletChanged(): void {
	_walletVersion++;
	_walletListeners.forEach((fn) => {
		try {
			fn();
		} catch {
			// Swallow — one bad listener must not break the others.
		}
	});
}

export function subscribeWalletChanges(fn: Listener): () => void {
	_walletListeners.add(fn);
	return () => {
		_walletListeners.delete(fn);
	};
}

let _transactionsVersion = 0;
const _transactionsListeners = new Set<Listener>();

export function getTransactionsVersion(): number {
	return _transactionsVersion;
}

export function notifyTransactionsChanged(): void {
	_transactionsVersion++;
	_transactionsListeners.forEach((fn) => {
		try {
			fn();
		} catch {
			// Swallow — one bad listener must not break the others.
		}
	});
}

export function subscribeTransactionsChanges(fn: Listener): () => void {
	_transactionsListeners.add(fn);
	return () => {
		_transactionsListeners.delete(fn);
	};
}
