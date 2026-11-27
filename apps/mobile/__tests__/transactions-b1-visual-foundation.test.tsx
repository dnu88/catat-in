import { render, waitFor, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { TextStyle } from "react-native";

import TransactionsScreen from "../app/(tabs)/transactions";
import { I18nProvider } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";
import { financeEditorial as fe } from "../src/theme/finance-editorial";
import { experienceIcon, experienceTokens } from "../src/theme/experience-tokens";

jest.setTimeout(15000);

const mockPush = jest.fn();
const mockListTransactions = jest.fn();

function isoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function currentIsoDate(): string {
	return isoDate(new Date());
}

jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush }),
	useFocusEffect: (callback: () => void | (() => void)) => {
		const React = require("react");
		React.useEffect(() => callback(), [callback]);
	},
	useLocalSearchParams: () => ({}),
}));

jest.mock("../src/services/transactions", () => ({
	listTransactions: (...args: unknown[]) => mockListTransactions(...args),
	deleteTransaction: jest.fn(async () => undefined),
}));

// Stable references: `activeContext` and the category list are effect
// dependencies inside the screen, so a fresh object each render would restart
// the loader on every pass (and never settle).
const mockCategories: unknown[] = [];
const mockPersonalContext = { type: "personal" } as const;

jest.mock("../src/services/categories", () => ({
	listCategories: jest.fn(async () => mockCategories),
}));

jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockPersonalContext,
		canCreate: true,
	}),
}));

jest.mock("../src/state/report-period", () => {
	const actual = jest.requireActual("../src/state/report-period");
	return {
		...actual,
		useReportPeriod: () => ({
			activePeriod: actual.buildReportPeriod("month"),
			savedRules: [],
			setActivePeriod: jest.fn(),
			resetToCurrentMonth: jest.fn(),
			saveMonthlyCycleRule: jest.fn(),
			updateSavedRule: jest.fn(),
			deleteSavedRule: jest.fn(),
			selectSavedRule: jest.fn(),
		}),
	};
});

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

function setPremiumFlag(enabled: boolean) {
	(globalThis as { __KASWISE_FEATURE_FLAGS__?: unknown })
		.__KASWISE_FEATURE_FLAGS__ = { simplePremiumExperience: enabled };
}

function renderScreen() {
	return render(
		<ThemeProvider>
			<I18nProvider>
				<TransactionsScreen />
			</I18nProvider>
		</ThemeProvider>,
	);
}

async function renderWithRows() {
	mockListTransactions.mockResolvedValue(mockTransactions);
	const screen = renderScreen();
	await waitFor(() => expect(screen.getByText("Kopi sore")).toBeTruthy());
	return screen;
}

function flatten(node: { props: { style?: unknown } }) {
	return StyleSheet.flatten(node.props.style) as Record<string, unknown>;
}

/** Pressable accepts a style function; flatten it with a neutral state. */
function flattenPressable(style: unknown) {
	const resolved =
		typeof style === "function"
			? (style as (state: { pressed: boolean }) => unknown)({ pressed: false })
			: style;
	return StyleSheet.flatten(resolved as never) as Record<string, unknown>;
}

/** Text nodes may hold a string or an array of segments (legacy inline string). */
function textOf(node: { props: { children?: unknown } }) {
	const children = node.props.children;
	return Array.isArray(children) ? children.join("") : String(children ?? "");
}

// B1 — visual foundation (G03/G04/G06/G07) on the pilot screen.
describe("transactions screen — B1 visual foundation", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		setPremiumFlag(true);
	});

	it("renders every figure with tabular digits when the premium flag is ON", async () => {
		const screen = await renderWithRows();
		const amount = flatten(screen.getByTestId("transaction-amount-tx-1"));

		expect(amount.fontVariant).toEqual(["tabular-nums"]);
		expect(amount.color).toBe(fe.financialExpense);
	});

	it("keeps the same figure text and semantic color in both modes", async () => {
		const premium = await renderWithRows();
		const premiumText = textOf(premium.getByTestId("transaction-amount-tx-1"));
		premium.unmount();

		setPremiumFlag(false);
		const legacy = await renderWithRows();
		const legacyText = textOf(legacy.getByTestId("transaction-amount-tx-1"));

		expect(premiumText).toBe("- Rp 35.000");
		expect(legacyText).toBe(premiumText);
		expect(flatten(legacy.getByTestId("transaction-amount-tx-1")).color).toBe(
			fe.financialExpense,
		);
	});

	it("leaves the legacy (flag OFF) figure free of tabular digits — baseline parity", async () => {
		setPremiumFlag(false);
		const screen = await renderWithRows();

		expect(
			flatten(screen.getByTestId("transaction-amount-tx-1")).fontVariant,
		).toBeUndefined();
	});

	it("keeps the hero summary figures tabular on the premium surface only", async () => {
		const premium = await renderWithRows();
		const premiumStat = within(premium.getByTestId("transactions-stat-expense"))
			.getByText(/Rp/);
		expect(flatten(premiumStat).fontVariant).toEqual(["tabular-nums"]);
		premium.unmount();

		setPremiumFlag(false);
		const legacy = await renderWithRows();
		const legacyStat = within(legacy.getByTestId("transactions-stat-expense"))
			.getByText(/Rp/);
		expect(flatten(legacyStat).fontVariant).toBeUndefined();
	});

	it("uses the token row rhythm on premium and the legacy height when OFF", async () => {
		const premium = await renderWithRows();
		const premiumRow = flatten(premium.getByTestId("transaction-row-tx-1"));
		expect(premiumRow.minHeight).toBe(experienceTokens.target.rowMinHeight);
		premium.unmount();

		setPremiumFlag(false);
		const legacy = await renderWithRows();
		expect(
			flatten(legacy.getByTestId("transaction-row-tx-1")).minHeight,
		).toBe(58);
	});

	it("aligns the row icon tile with the token instead of a one-off 40px", async () => {
		const premium = await renderWithRows();
		const premiumIcon = flatten(premium.getByTestId("transaction-icon-tx-1"));
		expect(premiumIcon.width).toBe(experienceIcon.tile.row);
		expect(premiumIcon.height).toBe(experienceIcon.tile.row);
		premium.unmount();

		setPremiumFlag(false);
		const legacy = await renderWithRows();
		expect(flatten(legacy.getByTestId("transaction-icon-tx-1")).width).toBe(40);
	});

	it("gives the period chips a visible idle border and the token height on premium", async () => {
		const premium = await renderWithRows();
		const chip = flattenPressable(
			premium.getByTestId("transactions-period-month").props.style,
		);

		expect(chip.minHeight).toBe(experienceTokens.target.chipMinHeight);
		expect(chip.borderWidth).toBe(1);
		expect(chip.borderColor).toBe(fe.line);
	});

	it("keeps the selected period chip clearly inverted in both modes", async () => {
		const premium = await renderWithRows();
		const active = flattenPressable(
			premium.getByTestId("transactions-period-report").props.style,
		);

		expect(active.backgroundColor).toBe(fe.ink);
		expect(flatten(premium.getByText("Laporan")).color).toBe(fe.white);

		// The idle chip stays readable instead of looking selected.
		const idle = flatten(premium.getByText("Bulan"));
		expect(idle.color).toBe(fe.slate);
	});

	it("does not add decoration that would compete with the one primary action", async () => {
		const screen = await renderWithRows();
		const fab = flatten(screen.getByTestId("transactions-fab"));

		expect(fab.backgroundColor).toBe(fe.ink);
	});
});
