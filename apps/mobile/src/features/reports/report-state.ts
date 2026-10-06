/**
 * Paket B2 — Reports presentation states.
 *
 * Pure presentation logic for the Reports screen: it decides WHICH state the
 * page is in and what the user reads, and nothing else. No query, no
 * aggregation, no AI call, no entitlement check lives here.
 *
 * The point (gap G11) is that four different situations used to look the same:
 *  - the report is still loading,
 *  - the request failed (and the user can retry),
 *  - the account has no transactions at all (first use),
 *  - the account has transactions, just none inside the selected period.
 */

export type ReportViewState =
	| "loading"
	| "error"
	| "first-use"
	| "period-empty"
	| "no-expenses"
	| "ready";

export type ReportStateAction = "retry" | "capture" | "open-period";

export type ReportStateInput = {
	loading: boolean;
	error: string | null;
	/** Transactions in the active finance scope, BEFORE the period filter. */
	scopeTransactionCount: number | null;
	/** Transactions inside the selected period. */
	periodTransactionCount: number | null;
};

export function resolveReportViewState({
	loading,
	error,
	scopeTransactionCount,
	periodTransactionCount,
}: ReportStateInput): ReportViewState {
	if (loading) return "loading";
	if (error) return "error";
	if (scopeTransactionCount === null) return "loading";
	if (scopeTransactionCount === 0) return "first-use";
	if ((periodTransactionCount ?? 0) === 0) return "period-empty";
	return "ready";
}

export type ReportTabStateInput = ReportStateInput & {
	tab: "overview" | "category" | "compare";
	previousTransactionCount?: number;
	expenseCategoryCount?: number;
};

/** Tab-specific visibility only; the existing loader owns all figures. */
export function resolveReportTabState(input: ReportTabStateInput): ReportViewState {
	const state = resolveReportViewState(input);
	if (state === "loading" || state === "error" || state === "first-use") return state;
	if (input.tab === "compare" && (input.previousTransactionCount ?? 0) > 0) return "ready";
	if (state === "ready" && input.tab === "category" && (input.expenseCategoryCount ?? 0) === 0) return "no-expenses";
	return state;
}

export type ReportStateCopy = {
	title: string;
	body: string;
	action?: ReportStateAction;
	actionLabel?: string;
};

/** `ready` returns null: the page shows its normal content, not a state card. */
export function reportStateCopy(
	state: ReportViewState,
	isEn: boolean,
): ReportStateCopy | null {
	switch (state) {
		case "loading":
			return {
				title: isEn ? "Loading report…" : "Memuat laporan…",
				body: isEn
					? "Your figures appear as soon as the data arrives."
					: "Angka akan muncul begitu data selesai dimuat.",
			};
		case "error":
			return {
				title: isEn ? "Report failed to load" : "Laporan gagal dimuat",
				body: isEn
					? "Nothing was saved or changed. Retry to fetch it again."
					: "Tidak ada yang tersimpan atau berubah. Coba muat ulang.",
				action: "retry",
				actionLabel: isEn ? "Try again" : "Coba lagi",
			};
		case "first-use":
			return {
				title: isEn ? "No transactions yet" : "Belum ada transaksi",
				body: isEn
					? "Record your first transaction and this report fills itself in."
					: "Catat transaksi pertama, laporan ini akan terisi sendiri.",
				action: "capture",
				actionLabel: isEn ? "Record a transaction" : "Catat transaksi",
			};
		case "no-expenses":
			return {
				title: isEn ? "No expenses in this period" : "Belum ada pengeluaran di periode ini",
				body: isEn
					? "Transactions are recorded, but there are no expenses to break down by category."
					: "Transaksi sudah tercatat, tetapi belum ada pengeluaran untuk dirinci menurut kategori.",
				action: "open-period",
				actionLabel: isEn ? "Change period" : "Ubah periode",
			};
		case "period-empty":
			return {
				title: isEn
					? "Nothing in this period"
					: "Periode ini belum ada transaksi",
				body: isEn
					? "Nothing is lost: pick another period or a different date range."
					: "Tidak ada yang hilang: pilih periode lain atau rentang tanggal lain.",
				action: "open-period",
				actionLabel: isEn ? "Change period" : "Ubah periode",
			};
		default:
			return null;
	}
}

/**
 * One-line period status for the premium period control, so the period is
 * stated once (the toggle itself) instead of a second "report" card that read
 * like a duplicate filter.
 */
export function periodStatusLine(
	periodLabel: string,
	periodTransactionCount: number | null,
	isEn: boolean,
): string {
	if (periodTransactionCount === null) {
		return periodLabel;
	}
	if (periodTransactionCount === 0) {
		return isEn
			? `${periodLabel} · no transactions`
			: `${periodLabel} · belum ada transaksi`;
	}
	return isEn
		? `${periodLabel} · ${periodTransactionCount} transactions`
		: `${periodLabel} · ${periodTransactionCount} transaksi`;
}

/** The chart is only drawn when the selected period actually has figures. */
export function shouldRenderReportChart(state: ReportViewState): boolean {
	return state === "ready";
}
