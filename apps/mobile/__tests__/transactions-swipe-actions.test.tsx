import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, StyleSheet } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

import TransactionsScreen, {
	SWIPE_GESTURE_CONFIG,
	SWIPE_SNAP_SPRING_CONFIG,
	filterTransactionsByPeriod,
	getSwipeTranslateX,
	getTransactionDateValue,
	shouldOpenSwipe,
} from "../app/(tabs)/transactions";
import { I18nProvider } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";

declare const process: { env: Record<string, string | undefined> };

const mockPush = jest.fn();
const mockListTransactions = jest.fn();
const mockDeleteTransaction = jest.fn();
let mockActiveContext:
	| { type: "personal" }
	| {
			type: "household";
			householdId: string;
			role: "admin" | "member" | "viewer";
	  } = {
	type: "personal",
};
let mockCanCreate = true;
let latestFocusCallback: null | (() => void | (() => void)) = null;

function isoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function currentIsoDate(): string {
	return isoDate(new Date());
}

function sameYearOutsideCurrentMonthIsoDate(): string {
	const now = new Date();
	const date = new Date(now);
	date.setMonth(now.getMonth() === 0 ? 1 : now.getMonth() - 1, 15);
	return isoDate(date);
}


function createDeferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function renderTransactionsTree() {
	return (
		<ThemeProvider>
			<I18nProvider>
				<TransactionsScreen />
			</I18nProvider>
		</ThemeProvider>
	);
}

jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush }),
	useFocusEffect: (callback: () => void | (() => void)) => {
		const React = require("react");
		latestFocusCallback = callback;
		React.useEffect(() => callback(), [callback]);
	},
}));

jest.mock("../src/services/transactions", () => ({
	listTransactions: (...args: unknown[]) => mockListTransactions(...args),
	deleteTransaction: (...args: unknown[]) => mockDeleteTransaction(...args),
}));

jest.mock("../src/services/categories", () => ({
	listCategories: jest.fn(async () => [
		{
			id: "cat-food",
			name: "Makan",
			icon: "food",
			color: "#4A80F0",
			type: "expense",
			visual_locked_by_user: true,
		},
	]),
}));

jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockActiveContext,
		canCreate: mockCanCreate,
	}),
}));

const mockTransactions = [
	{
		id: "tx-1",
		user_id: "user-1",
		wallet_id: "wallet-1",
		transaction_type: "expense",
		type: "expense",
		nominal: 35000,
		amount: 35000,
		kategori: "Makan",
		category: "Makan",
		catatan: "Kopi sore",
		description: "Kopi sore",
		merchant: "Kopi Kenangan",
		tanggal: currentIsoDate(),
		date: currentIsoDate(),
		note: null,
		payment_method: null,
		receipt_url: null,
		group_id: null,
		is_shared: false,
		visibility: null,
		ai_confidence: null,
		ai_extracted: null,
		household_id: null,
		created_by: "user-1",
		on_behalf_of: null,
		is_disputed: false,
		dispute_resolved_at: null,
		created_at: `${currentIsoDate()}T10:00:00Z`,
		updated_at: `${currentIsoDate()}T10:00:00Z`,
	},
];

function renderScreen() {
	return render(renderTransactionsTree());
}

describe("transaction swipe actions", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockActiveContext = { type: "personal" };
		mockCanCreate = true;
		latestFocusCallback = null;
		mockListTransactions.mockResolvedValue(mockTransactions);
		mockDeleteTransaction.mockResolvedValue(undefined);
	});

	it("keeps the floating add button above the roomier bottom tab", async () => {
		const screen = renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());

		const fabStyle = StyleSheet.flatten(
			screen.getByTestId("transactions-fab").props.style as object,
		) as ViewStyle;
		expect(fabStyle.bottom).toBeGreaterThanOrEqual(104);
	});

	it("shows edit and delete actions for each transaction row", async () => {
		const screen = renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());

		expect(screen.getByLabelText("Edit transaksi Kopi sore")).toBeTruthy();
		expect(screen.getByLabelText("Hapus transaksi Kopi sore")).toBeTruthy();
	});

	it("refreshes the list when returning from an edited transaction", async () => {
		const screen = renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());
		mockListTransactions.mockResolvedValueOnce([
			{
				...mockTransactions[0],
				description: "Kopi pagi",
				catatan: "Kopi pagi",
				amount: 42000,
				nominal: 42000,
			},
		]);

		await act(async () => {
			latestFocusCallback?.();
		});

		await waitFor(() => expect(screen.getByText("Kopi pagi")).toBeTruthy());
		expect(screen.queryByText("Kopi sore")).toBeNull();
		expect(
			screen.getByTestId("transaction-amount-tx-1").props.children.join(""),
		).toBe("- Rp 42.000");
	});

	it("opens row actions with a lighter, less rigid swipe threshold", () => {
		expect(SWIPE_GESTURE_CONFIG.openThresholdRatio).toBeLessThanOrEqual(0.35);
		expect(SWIPE_GESTURE_CONFIG.openThreshold).toBe(56);
		expect(SWIPE_GESTURE_CONFIG.activationDistance).toBeLessThanOrEqual(2);
		expect(SWIPE_GESTURE_CONFIG.verticalIntentRatio).toBeLessThanOrEqual(1);
		expect(shouldOpenSwipe(-55)).toBe(false);
		expect(shouldOpenSwipe(-56)).toBe(true);
		expect(shouldOpenSwipe(-80)).toBe(true);
		expect(shouldOpenSwipe(120)).toBe(false);
	});

	it("uses a horizontal scroll container for category filters", async () => {
		const screen = renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());

		const filterScroller = screen.getByTestId("transactions-filter-scroller");
		expect(filterScroller.props.horizontal).toBe(true);
		expect(filterScroller.props.showsHorizontalScrollIndicator).toBe(false);
		expect(filterScroller.props.contentContainerStyle).toEqual(
			expect.objectContaining({ paddingRight: expect.any(Number) }),
		);

		const allFilterStyle = StyleSheet.flatten(
			screen.getByLabelText("Semua").props.style as object,
		) as ViewStyle;
		const allFilterTextStyle = StyleSheet.flatten(
			screen.getByText("Semua").props.style as object,
		) as TextStyle;
		expect(allFilterStyle.alignItems).toBe("center");
		expect(allFilterStyle.justifyContent).toBe("center");
		expect(allFilterTextStyle.textAlign).toBe("center");
	});

	it("keeps top layout spacing and metric cards roomy", async () => {
		const screen = renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());

		const headerStyle = StyleSheet.flatten(
			screen.getByTestId("transactions-header-block").props.style as object,
		) as ViewStyle;
		const periodRowStyle = StyleSheet.flatten(
			screen.getByTestId("transactions-period-row").props.style as object,
		) as ViewStyle;
		const statRowStyle = StyleSheet.flatten(
			screen.getByTestId("transactions-stat-row").props.style as object,
		) as ViewStyle;
		const filterScrollerStyle = StyleSheet.flatten(
			screen.getByTestId("transactions-filter-scroller").props.style as object,
		) as ViewStyle;
		const incomeCardStyle = StyleSheet.flatten(
			screen.getByTestId("transactions-stat-income").props.style as object,
		) as ViewStyle;
		const expenseCardStyle = StyleSheet.flatten(
			screen.getByTestId("transactions-stat-expense").props.style as object,
		) as ViewStyle;

		expect(headerStyle.marginBottom).toBeGreaterThanOrEqual(12);
		expect(periodRowStyle.marginBottom).toBeGreaterThanOrEqual(16);
		expect(statRowStyle.marginTop).toBeGreaterThanOrEqual(4);
		expect(statRowStyle.marginBottom).toBeGreaterThanOrEqual(20);
		expect(filterScrollerStyle.marginTop).toBeGreaterThanOrEqual(4);
		expect(filterScrollerStyle.marginBottom).toBeGreaterThanOrEqual(16);
		expect(incomeCardStyle.flex).toBe(1);
		expect(expenseCardStyle.flex).toBe(1);
		expect(incomeCardStyle.minHeight).toBeGreaterThanOrEqual(136);
		expect(expenseCardStyle.minHeight).toBeGreaterThanOrEqual(136);
	});

	it("adds right-side breathing room to transaction amounts", async () => {
		const screen = renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());

		const amountStyle = StyleSheet.flatten(
			screen.getByTestId("transaction-amount-tx-1").props.style as object,
		) as TextStyle;

		expect(amountStyle.marginRight).toBeGreaterThanOrEqual(8);
		expect(amountStyle.textAlign).toBe("right");
	});

	it("uses spring physics and resisted overdrag for organic row swipes", () => {
		expect(SWIPE_GESTURE_CONFIG.maxRevealWidth).toBe(160);
		expect(SWIPE_GESTURE_CONFIG.overdragResistance).toBeCloseTo(0.4);
		expect(SWIPE_SNAP_SPRING_CONFIG.damping).toBeGreaterThanOrEqual(16);
		expect(SWIPE_SNAP_SPRING_CONFIG.damping).toBeLessThanOrEqual(20);
		expect(SWIPE_SNAP_SPRING_CONFIG.stiffness).toBeGreaterThanOrEqual(150);
		expect(SWIPE_SNAP_SPRING_CONFIG.stiffness).toBeLessThanOrEqual(180);
		expect(SWIPE_SNAP_SPRING_CONFIG.overshootClamping).toBe(false);
		expect(getSwipeTranslateX(24)).toBe(0);
		expect(getSwipeTranslateX(-48)).toBe(-48);
		expect(getSwipeTranslateX(-160)).toBe(-160);
		expect(getSwipeTranslateX(-200)).toBeCloseTo(-176);
		expect(getSwipeTranslateX(-300)).toBeCloseTo(-216);
	});

	it("keeps swipe actions smooth, rounded, and finger-friendly", async () => {
		const screen = renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());

		const shellStyle = StyleSheet.flatten(
			screen.getByTestId("transaction-swipe-shell-tx-1").props.style as object,
		) as ViewStyle;
		const actionRailStyle = StyleSheet.flatten(
			screen.getByTestId("transaction-swipe-actions-tx-1").props
				.style as object,
		) as ViewStyle;
		const editButtonStyle = StyleSheet.flatten(
			screen.getByLabelText("Edit transaksi Kopi sore").props.style as object,
		) as ViewStyle;

		expect(shellStyle.overflow).toBe("hidden");
		expect(shellStyle.borderRadius).toBeGreaterThanOrEqual(14);
		expect(actionRailStyle.width).toBeGreaterThanOrEqual(160);
		expect(actionRailStyle.position).toBe("absolute");
		expect(actionRailStyle.right).toBe(0);
		expect(actionRailStyle.bottom).toBe(0);
		expect(
			editButtonStyle.minHeight ?? editButtonStyle.height,
		).toBeGreaterThanOrEqual(44);
	});

	it("opens transaction-new in edit mode from the row action", async () => {
		const screen = renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());
		fireEvent.press(screen.getByLabelText("Edit transaksi Kopi sore"));

		expect(mockPush).toHaveBeenCalledWith(
			"/(tabs)/transaction-new?transactionId=tx-1",
		);
	});

	it("confirms and deletes the selected transaction", async () => {
		const alertSpy = jest.spyOn(Alert, "alert");
		const screen = renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());
		fireEvent.press(screen.getByLabelText("Hapus transaksi Kopi sore"));

		expect(alertSpy).toHaveBeenCalledWith(
			"Hapus transaksi?",
			"Transaksi Kopi sore akan dihapus permanen.",
			expect.any(Array),
		);

		const buttons = alertSpy.mock.calls[0][2] as Array<{
			text: string;
			onPress?: () => void;
		}>;
		buttons.find((button) => button.text === "Hapus")?.onPress?.();

		await waitFor(() =>
			expect(mockDeleteTransaction).toHaveBeenCalledWith("tx-1", {
				type: "personal",
			}),
		);
		expect(mockListTransactions).toHaveBeenCalledTimes(2);
	});

	it("loads and deletes transactions in the active finance context", async () => {
		mockActiveContext = {
			type: "household",
			householdId: "hh-1",
			role: "admin",
		};
		const alertSpy = jest.spyOn(Alert, "alert");
		const screen = renderScreen();

		await waitFor(() =>
			expect(mockListTransactions).toHaveBeenCalledWith(
				undefined,
				mockActiveContext,
			),
		);
		fireEvent.press(screen.getByLabelText("Hapus transaksi Kopi sore"));
		const buttons = alertSpy.mock.calls[0][2] as Array<{
			text: string;
			onPress?: () => void;
		}>;
		buttons.find((button) => button.text === "Hapus")?.onPress?.();

		await waitFor(() =>
			expect(mockDeleteTransaction).toHaveBeenCalledWith(
				"tx-1",
				mockActiveContext,
			),
		);
	});


	it("ignores stale transaction loads after switching finance context", async () => {
		const personalLoad = createDeferred<typeof mockTransactions>();
		const householdLoad = createDeferred<typeof mockTransactions>();
		const householdContext = {
			type: "household" as const,
			householdId: "hh-1",
			role: "admin" as const,
		};
		mockListTransactions.mockImplementation((_filters, context) =>
			context?.type === "household"
				? householdLoad.promise
				: personalLoad.promise,
		);

		const screen = renderScreen();
		await waitFor(() =>
			expect(mockListTransactions).toHaveBeenCalledWith(undefined, {
				type: "personal",
			}),
		);

		mockActiveContext = householdContext;
		screen.rerender(renderTransactionsTree());
		await waitFor(() =>
			expect(mockListTransactions).toHaveBeenCalledWith(
				undefined,
				householdContext,
			),
		);

		await act(async () => {
			householdLoad.resolve([
				{
					...mockTransactions[0],
					id: "tx-household",
					description: "Belanja rumah",
					catatan: "Belanja rumah",
				},
			]);
			await householdLoad.promise;
		});
		await waitFor(() => expect(screen.getByText("Belanja rumah")).toBeTruthy());

		await act(async () => {
			personalLoad.resolve([
				{
					...mockTransactions[0],
					id: "tx-stale-personal",
					description: "Personal stale",
					catatan: "Personal stale",
				},
			]);
			await personalLoad.promise;
			await Promise.resolve();
		});
		expect(screen.queryByText("Personal stale")).toBeNull();
	});

	it("includes date-only boundary transactions in the local month period", () => {
		const previousTZ = process.env.TZ;
		process.env.TZ = "America/Los_Angeles";
		jest.useFakeTimers();
		jest.setSystemTime(new Date(2026, 5, 15, 12));

		try {
			const boundaryTransaction = {
				...mockTransactions[0],
				id: "tx-month-boundary",
				tanggal: "2026-06-01",
				date: "2026-06-01",
			};
			const transaction =
				boundaryTransaction as Parameters<typeof getTransactionDateValue>[0];
			const parsedDate = new Date(getTransactionDateValue(transaction) ?? 0);

			expect(parsedDate.getFullYear()).toBe(2026);
			expect(parsedDate.getMonth()).toBe(5);
			expect(parsedDate.getDate()).toBe(1);
			expect(filterTransactionsByPeriod([transaction], "month")).toHaveLength(1);
		} finally {
			jest.useRealTimers();
			if (previousTZ === undefined) {
				delete process.env.TZ;
			} else {
				process.env.TZ = previousTZ;
			}
		}
	});

	it("filters the visible list by the selected period", async () => {
		mockListTransactions.mockResolvedValue([
			...mockTransactions,
			{
				...mockTransactions[0],
				id: "tx-year",
				transaction_type: "income",
				type: "income",
				nominal: 500000,
				amount: 500000,
				description: "Bonus tahunan",
				catatan: "Bonus tahunan",
				merchant: null,
				tanggal: sameYearOutsideCurrentMonthIsoDate(),
				date: sameYearOutsideCurrentMonthIsoDate(),
			},
		]);
		const screen = renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());
		expect(screen.queryByText("Bonus tahunan")).toBeNull();

		fireEvent.press(screen.getByTestId("transactions-period-year"));

		await waitFor(() =>
			expect(screen.getByText("Bonus tahunan")).toBeTruthy(),
		);
	});
});
