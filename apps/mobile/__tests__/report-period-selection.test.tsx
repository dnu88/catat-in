import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import { ReportPeriodProvider, useReportPeriod } from "../src/state/report-period";

/**
 * Regression: a late preference load must not clobber a period the user picked
 * while that load was still in flight. Previously the async load resolved and
 * overwrote the fresh selection, so the Reports header badge fell back to
 * "1 Bulan" seconds after choosing "6 Bulan".
 */

const deferred: Array<{ resolve: (value: unknown) => void }> = [];

function deferredQuery() {
	const promise: any = new Promise((resolve) => {
		deferred.push({ resolve });
	});
	return {
		select: () => query,
		match: () => query,
		is: () => query,
		then: (onFulfilled: any, onRejected: any) => promise.then(onFulfilled, onRejected),
		catch: (onRejected: any) => promise.catch(onRejected),
	};
}

const query: any = deferredQuery();

const supabaseStub = {
	auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
	from: () => deferredQuery(),
};

jest.mock("../src/lib/supabase", () => ({
	useSupabase: () => ({ supabase: (globalThis as any).__supabaseStub }),
}));

jest.mock("../src/state/finance-context", () => {
	const stableContext = { type: "personal" };
	return { useFinanceContext: () => ({ activeContext: stableContext }) };
});

function Harness() {
	const { activePeriod, setActivePeriod } = useReportPeriod();
	return (
		<>
			<Text testID="period-type">{activePeriod.type}</Text>
			<Pressable
				testID="pick-six-months"
				onPress={() =>
					setActivePeriod({
						type: "6month",
						startDate: "2026-05-01",
						endDate: "2026-10-31",
					})
				}
			>
				<Text>pick</Text>
			</Pressable>
		</>
	);
}

describe("ReportPeriodProvider selection durability", () => {
	beforeEach(() => {
		(globalThis as any).__supabaseStub = supabaseStub;
	});

	it("keeps a freshly chosen period when an older preference load resolves late", async () => {
		render(
			<ReportPeriodProvider>
				<Harness />
			</ReportPeriodProvider>,
		);

		await waitFor(() => expect(screen.getByTestId("period-type")).toHaveTextContent("month"));

		await act(async () => {
			fireEvent.press(screen.getByTestId("pick-six-months"));
		});
		await waitFor(() => expect(screen.getByTestId("period-type")).toHaveTextContent("6month"));

		// The stale load finally answers with the old "month" preference.
		await act(async () => {
			for (const item of deferred) {
				item.resolve({
					data: [
						{
							type: "preset",
							preset_type: "month",
							active_type: "preset",
						},
					],
					error: null,
				});
			}
		});

		await waitFor(() => expect(screen.getByTestId("period-type")).toHaveTextContent("6month"));
	});
});
