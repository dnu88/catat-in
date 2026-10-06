/**
 * T21 follow-up (finding #1) — Home recent-list empty state copy.
 *
 * The legacy empty state points at the "+" tab button. The premium Home adds a
 * prominent primary CTA ("Catat transaksi" / "Record a transaction"), so the
 * empty state must point at that CTA instead of at a button that is no longer
 * the obvious next step. Presentation-only string selection — no data impact.
 */
export type HomeEmptyStateCopyInput = {
	isEn: boolean;
	premium: boolean;
};

export function recentEmptyStateCopy({ isEn, premium }: HomeEmptyStateCopyInput): string {
	if (premium) {
		return isEn
			? 'Tap "Record a transaction" above to add your first one.'
			: 'Ketuk "Catat transaksi" di atas untuk menambah yang pertama.';
	}
	return isEn
		? "Use the + button to record the first one."
		: "Gunakan tombol + untuk mencatat transaksi pertama.";
}
