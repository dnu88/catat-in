import { render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import DashboardScreen from "../app/(tabs)/index";
import { I18nProvider } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";
import { experienceIcon, experienceType } from "../src/theme/experience-tokens";

jest.setTimeout(15000);

const mockPush = jest.fn();

// Stable references: these are effect dependencies inside the screen, so a new
// object every render would restart the loader forever (see the transactions
// suite for the same trap).
const mockActiveContext = { type: "personal" } as const;
const mockWallets = [
	{
		id: "w-1",
		user_id: "user-1",
		name: "BCA",
		type: "bank",
		balance: 1500000,
		currency: "IDR",
		is_active: true,
		household_id: null,
	},
];
const mockTransactions = [
	{
		id: "tx-home-1",
		user_id: "user-1",
		wallet_id: "w-1",
		transaction_type: "expense",
		type: "expense",
		nominal: 35000,
		amount: 35000,
		kategori: "Food & Beverage",
		category: "Food & Beverage",
		catatan: "Kopi susu pagi",
		description: "Kopi susu pagi",
		merchant: "Kopi Kenangan",
		tanggal: new Date().toISOString().slice(0, 10),
		date: new Date().toISOString().slice(0, 10),
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
		created_at: `${new Date().toISOString().slice(0, 10)}T02:00:00Z`,
		updated_at: `${new Date().toISOString().slice(0, 10)}T02:00:00Z`,
	},
];

const mockSupabase = {
	auth: {
		getUser: jest.fn(async () => ({ data: { user: { id: "user-1" } } })),
	},
};

jest.mock("expo-router", () => ({
	useFocusEffect: (callback: () => void | (() => void)) => {
		const React = require("react");
		React.useEffect(() => callback(), [callback]);
	},
	useRouter: () => ({ push: mockPush }),
}));

jest.mock("../src/lib/supabase", () => ({
	useSupabase: () => ({ supabase: mockSupabase }),
}));

jest.mock("../src/services/budget-envelopes", () => {
	const actual = jest.requireActual("../src/services/budget-envelopes");
	return {
		...actual,
		listBudgetEnvelopes: jest.fn(async () => []),
		listEnvelopeAllocations: jest.fn(async () => []),
	};
});

jest.mock("../src/services/wallets", () => ({
	listWallets: jest.fn(async () => mockWallets),
}));

jest.mock("../src/services/transactions", () => ({
	listTransactions: jest.fn(async () => mockTransactions),
}));

jest.mock("../src/services/transaction-review", () => ({
	getTransactionReviewSummary: jest.fn(async () => null),
}));

jest.mock("../src/services/categories", () => ({
	listCategories: jest.fn(async () => []),
}));

jest.mock("../src/services/notifications", () => ({
	getUnreadNotificationCount: jest.fn(async () => 0),
}));

jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockActiveContext,
		memberships: [],
		setPersonalContext: jest.fn(),
		setActiveHousehold: jest.fn(),
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

function setPremiumFlag(enabled: boolean) {
	(globalThis as { __KASWISE_FEATURE_FLAGS__?: unknown })
		.__KASWISE_FEATURE_FLAGS__ = { simplePremiumExperience: enabled };
}

function flatten(node: { props: { style?: unknown } }) {
	return StyleSheet.flatten(node.props.style) as Record<string, unknown>;
}

async function renderHome() {
	const screen = render(
		<ThemeProvider>
			<I18nProvider>
				<DashboardScreen />
			</I18nProvider>
		</ThemeProvider>,
	);
	await waitFor(() => expect(screen.getByTestId("home-total-balance")).toBeTruthy());
	return screen;
}

// B1 — visual foundation on Home (token-only; the wallet stack stays decorative
// and structurally untouched).
describe("home screen — B1 visual foundation", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		setPremiumFlag(true);
	});

	it("renders the hero balance with tabular digits from the type ramp", async () => {
		const screen = await renderHome();
		const balance = flatten(screen.getByTestId("home-total-balance"));

		expect(balance.fontVariant).toEqual(["tabular-nums"]);
		expect(balance.fontSize).toBe(experienceType.hero);
	});

	it("renders hero metrics and recent amounts tabular as well", async () => {
		const screen = await renderHome();
		const metric = flatten(screen.getByTestId("home-monthly-expense"));

		expect(metric.fontVariant).toEqual(["tabular-nums"]);
		expect(metric.fontSize).toBe(experienceType.metric);

		await waitFor(() =>
			expect(screen.getByTestId("home-recent-amount-tx-home-1")).toBeTruthy(),
		);
		const recent = flatten(screen.getByTestId("home-recent-amount-tx-home-1"));

		expect(recent.fontVariant).toEqual(["tabular-nums"]);
		expect(recent.fontSize).toBe(experienceType.body);
	});

	it("keeps the legacy (flag OFF) figures proportional — baseline parity", async () => {
		setPremiumFlag(false);
		const screen = await renderHome();

		expect(
			flatten(screen.getByTestId("home-total-balance")).fontVariant,
		).toBeUndefined();
		expect(
			flatten(screen.getByTestId("home-monthly-expense")).fontVariant,
		).toBeUndefined();
		// Sizes stay exactly as shipped before B1.
		expect(flatten(screen.getByTestId("home-total-balance")).fontSize).toBe(38);
		expect(flatten(screen.getByTestId("home-monthly-expense")).fontSize).toBe(15);
	});

	it("keeps the decorative wallet stack intact (no structural change)", async () => {
		const screen = await renderHome();

		expect(screen.getByText("KASWISE")).toBeTruthy();
	});

	it("drives the recent-row icon tile from the shared icon token", async () => {
		const screen = await renderHome();

		// The tile is decorative geometry: it must stay square and half-radius.
		expect(experienceIcon.tile.section).toBeGreaterThan(0);
		expect(Math.round(experienceIcon.tile.section * experienceIcon.glyphRatio)).toBe(
			experienceIcon.tile.section / 2,
		);
		expect(screen.getByTestId("home-recent-amount-tx-home-1")).toBeTruthy();
	});
});
