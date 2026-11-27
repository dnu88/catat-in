import {
	periodStatusLine,
	reportStateCopy,
	resolveReportViewState,
	shouldRenderReportChart,
} from "../report-state";

describe("Reports view state (B2 — G11)", () => {
	it("tells loading apart from an empty report", () => {
		expect(
			resolveReportViewState({
				loading: true,
				error: null,
				scopeTransactionCount: 0,
				periodTransactionCount: 0,
			}),
		).toBe("loading");
	});

	it("keeps a failed load out of the empty states so the user can retry", () => {
		const state = resolveReportViewState({
			loading: false,
			error: "Gagal memuat data transaksi",
			scopeTransactionCount: 12,
			periodTransactionCount: 12,
		});

		expect(state).toBe("error");
		expect(reportStateCopy(state, false)?.action).toBe("retry");
	});

	it("treats an account with no transactions at all as first use", () => {
		const state = resolveReportViewState({
			loading: false,
			error: null,
			scopeTransactionCount: 0,
			periodTransactionCount: 0,
		});

		expect(state).toBe("first-use");
		expect(reportStateCopy(state, true)?.action).toBe("capture");
	});

	it("treats an empty selected period as period-empty, not as first use", () => {
		const state = resolveReportViewState({
			loading: false,
			error: null,
			scopeTransactionCount: 40,
			periodTransactionCount: 0,
		});

		expect(state).toBe("period-empty");
		expect(reportStateCopy(state, false)?.action).toBe("open-period");
		expect(reportStateCopy(state, false)?.title).not.toBe(
			reportStateCopy("first-use", false)?.title,
		);
	});

	it("only reports ready when the period really has figures", () => {
		expect(
			resolveReportViewState({
				loading: false,
				error: null,
				scopeTransactionCount: 40,
				periodTransactionCount: 7,
			}),
		).toBe("ready");
	});

	it("never shows a state card in the ready state", () => {
		expect(reportStateCopy("ready", false)).toBeNull();
		expect(reportStateCopy("ready", true)).toBeNull();
	});

	it("draws the chart only when the state is ready", () => {
		expect(shouldRenderReportChart("ready")).toBe(true);
		for (const state of ["loading", "error", "first-use", "period-empty"] as const) {
			expect(shouldRenderReportChart(state)).toBe(false);
		}
	});

	it("states the period exactly once, with its transaction count", () => {
		expect(periodStatusLine("Bulan ini", 12, false)).toBe(
			"Bulan ini · 12 transaksi",
		);
		expect(periodStatusLine("This month", 1, true)).toBe(
			"This month · 1 transactions",
		);
		expect(periodStatusLine("Bulan ini", 0, false)).toBe(
			"Bulan ini · belum ada transaksi",
		);
		expect(periodStatusLine("Bulan ini", null, false)).toBe("Bulan ini");
	});

	it("keeps every state card copy non-empty and distinct", () => {
		const titles = (["loading", "error", "first-use", "period-empty"] as const).map(
			(state) => reportStateCopy(state, false)?.title ?? "",
		);

		expect(titles.every((title) => title.length > 0)).toBe(true);
		expect(new Set(titles).size).toBe(titles.length);
	});
});
