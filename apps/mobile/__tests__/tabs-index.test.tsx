import { fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StyleSheet, Text } from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { ThemeProvider } from "../src/theme/theme-context";
import { I18nProvider } from "../src/i18n/i18n-context";
import DashboardScreen from "../app/(tabs)/index";

jest.setTimeout(15000);

const mockPush = jest.fn();
let mockEnvelopes: any[] = [];
let mockAllocations: any[] = [];
let mockWallets: any[] = [];
let mockTransactions: any[] = [];
let mockAuthUser: any = { id: "user-1" };
let mockActiveContext:
	| { type: "personal" }
	| { type: "household"; householdId: string; role: "admin" } = {
	type: "personal",
};
const mockSupabase = {
	auth: {
		getUser: jest.fn(async () => ({ data: { user: mockAuthUser } })),
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
		listBudgetEnvelopes: jest.fn(async () => mockEnvelopes),
		listEnvelopeAllocations: jest.fn(async () => mockAllocations),
	};
});

jest.mock("../src/services/wallets", () => ({
	listWallets: jest.fn(async () => mockWallets),
}));

jest.mock("../src/services/transactions", () => ({
	listTransactions: jest.fn(async () => mockTransactions),
}));

let mockReviewSummary: { summary: { count: number; reasons: any } } | null = null;
jest.mock("../src/services/transaction-review", () => ({
	getTransactionReviewSummary: jest.fn(async () => mockReviewSummary),
}));

jest.mock("../src/services/categories", () => ({
	listCategories: jest.fn(async () => [
		{
			id: "cat-groceries",
			name: "Groceries",
			icon: "groceries",
			color: "#4A80F0",
			type: "expense",
			visual_locked_by_user: true,
		},
	]),
}));

jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockActiveContext,
		memberships:
			mockActiveContext.type === "household"
				? [
						{
							household_id: "hh-1",
							role: "admin",
							households: { name: "Smith Family" },
						},
					]
				: [],
		setPersonalContext: jest.fn(),
		setActiveHousehold: jest.fn(),
	}),
}));

jest.mock("../src/state/report-period", () => {
	const actual = jest.requireActual("../src/state/report-period");
	const activePeriod = actual.buildReportPeriod("month");
	return {
		...actual,
		useReportPeriod: () => ({
			activePeriod,
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

function renderDashboard() {
	return render(
		<ThemeProvider>
			<I18nProvider>
				<DashboardScreen />
			</I18nProvider>
		</ThemeProvider>,
	);
}

function getTextContent(value: unknown): string {
	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}

	if (Array.isArray(value)) {
		return value.map(getTextContent).join("");
	}

	if (value && typeof value === "object" && "props" in value) {
		return getTextContent(
			(value as { props?: { children?: unknown } }).props?.children,
		);
	}

	return "";
}

function getRenderedTextNodes(screen: ReturnType<typeof renderDashboard>) {
	return screen
		.UNSAFE_getAllByType(Text)
		.map((node) => getTextContent(node.props.children).trim())
		.filter(Boolean);
}

function expectTextOrder(texts: string[], expectedTexts: string[]) {
	let lastIndex = -1;

	expectedTexts.forEach((label) => {
		const index = texts.findIndex(
			(text, textIndex) => textIndex > lastIndex && text === label,
		);

		expect(index).not.toBe(-1);
		expect(index).toBeGreaterThan(lastIndex);
		lastIndex = index;
	});
}

type StyleHostNode = {
	props: {
		style?:
			| StyleProp<ViewStyle>
			| ((state: {
					pressed: boolean;
					hovered: boolean;
					focused: boolean;
			  }) => StyleProp<ViewStyle>);
	};
};

function getFlattenedStyle(node: StyleHostNode): ViewStyle {
	const style =
		typeof node.props.style === "function"
			? node.props.style({ pressed: false, hovered: false, focused: false })
			: node.props.style;

	return StyleSheet.flatten(style) ?? {};
}

const SOFT_GREEN_BACKGROUNDS = [
	"rgba(163, 255, 18, 0.08)",
	"rgba(163, 255, 18, 0.09)",
	"rgba(163, 255, 18, 0.10)",
	"rgba(163, 255, 18, 0.11)",
	"rgba(163, 255, 18, 0.12)",
	"rgba(163, 255, 18, 0.13)",
	"rgba(163, 255, 18, 0.14)",
	"rgba(101, 163, 13, 0.16)",
];

const SOFT_GREEN_BORDERS = [
	"rgba(163, 255, 18, 0.18)",
	"rgba(163, 255, 18, 0.19)",
	"rgba(163, 255, 18, 0.20)",
	"rgba(163, 255, 18, 0.21)",
	"rgba(163, 255, 18, 0.22)",
	"rgba(163, 255, 18, 0.23)",
	"rgba(163, 255, 18, 0.24)",
	"rgba(163, 255, 18, 0.25)",
	"rgba(101, 163, 13, 0.28)",
];

describe("DashboardScreen dark luxury Home parity", () => {
	beforeEach(() => {
		mockPush.mockClear();
		jest.mocked(AsyncStorage.getItem).mockReset();
		jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
		jest.mocked(AsyncStorage.setItem).mockClear();
		mockAuthUser = { id: "user-1" };
		mockActiveContext = { type: "personal" };
		mockWallets = [];
		mockTransactions = [];
		mockEnvelopes = [
			{
				id: "env-kopi",
				user_id: "user-1",
				name: "Kopi",
				parent_category_id: null,
				parent_category_name: "Makan & Minum",
				limit_amount: 250000,
				start_date: "2026-05-10",
				end_date: "2099-05-25",
				icon: "coffee",
				color: "#4A80F0",
				notes: "Kopi Kenangan",
				status: "active",
				created_at: "",
				updated_at: "",
			},
		];
		mockAllocations = [
			{
				id: "alloc-1",
				transaction_id: "tx-1",
				envelope_id: "env-kopi",
				amount: 208000,
				confidence: 0.9,
				needs_review: false,
				transaction_date: "2026-05-15",
				transaction_description: "Kopi Kenangan",
				created_at: "",
				updated_at: "",
			},
		];
	});


	it("uses the saved Settings profile avatar instead of initials", async () => {
		mockAuthUser = {
			id: "user-1",
			email: "dania@kaswise.com",
			user_metadata: {
				full_name: "Dania Bestari",
				picture: "https://accounts.google.com/default-picture.png",
				avatar_key: "sari-hijab",
				avatar_url: null,
				profile_visual_mode: "avatar",
			},
		};

		const screen = renderDashboard();

		await waitFor(() => {
			expect(screen.getByText("Halo, Dania")).toBeTruthy();
		});
		expect(screen.getByLabelText("Sari berhijab")).toBeTruthy();
		const avatarStyle = getFlattenedStyle(screen.getByTestId("home-avatar"));
		expect(avatarStyle.width).toBe(40);
		expect(avatarStyle.borderWidth).toBe(2);
		expect(avatarStyle.backgroundColor).not.toBe("#A3FF12");
		expect(screen.queryByText("DB")).toBeNull();
	});

	it("uses the saved Settings profile photo on the dashboard avatar", async () => {
		mockAuthUser = {
			id: "user-1",
			email: "dania@kaswise.com",
			user_metadata: {
				full_name: "Dania Bestari",
				avatar_url: "https://kaswise.com/avatar.png",
				profile_visual_mode: "photo",
			},
		};

		const screen = renderDashboard();

		await waitFor(() => {
			expect(screen.getByTestId("home-avatar-image").props.source).toEqual({
				uri: "https://kaswise.com/avatar.png",
			});
		});
		expect(screen.queryByText("DB")).toBeNull();
	});

	it("renders the honest Home section order and labels", async () => {
		const screen = renderDashboard();

		await waitFor(() => {
			expect(screen.getByText("Halo")).toBeTruthy();
		});

		const expectedDate = new Date().toLocaleDateString("id-ID", {
			month: "long",
			year: "numeric",
		});
		expect(screen.getByText(expectedDate)).toBeTruthy();
		expect(
			screen
				.getByTestId("home-hero-card")
				.findByProps({ testID: "finance-context-switcher" }),
		).toBeTruthy();

		expect(screen.getByTestId("home-entrance-hero")).toBeTruthy();
		expect(screen.getByTestId("home-theme-toggle")).toBeTruthy();
		expect(screen.getByTestId("home-amount-visibility-toggle")).toBeTruthy();
		expect(screen.getByTestId("home-monthly-remaining")).toBeTruthy();
		expect(screen.getByTestId("home-active-period-label")).toBeTruthy();
		expect(screen.getByTestId("home-monthly-expense")).toBeTruthy();
		expect(screen.getByTestId("home-entrance-actions")).toBeTruthy();
		expect(screen.getByTestId("home-entrance-budget")).toBeTruthy();
		expect(screen.getByTestId("home-entrance-recent")).toBeTruthy();

		expect(screen.getByText("Total saldo")).toBeTruthy();
		expect(screen.getByTestId("home-total-balance").props.children).toBe(
			"Rp 0",
		);
		expect(screen.queryByTestId("home-wallet-pill")).toBeNull();
		expect(screen.getByText("Kelola")).toBeTruthy();
		expect(screen.queryByText("↗ 15%")).toBeNull();

		expect(screen.getByText("Input AI")).toBeTruthy();
		expect(screen.queryByText("Import")).toBeNull();

		expect(screen.getByText("Anggaran")).toBeTruthy();
		expect(screen.getByText("Lihat →")).toBeTruthy();
		await waitFor(() =>
			expect(screen.getByText("Kopi hampir habis")).toBeTruthy(),
		);
		expect(screen.getByText("83%")).toBeTruthy();
		expect(screen.getByText(/Rp42\.000 tersisa/)).toBeTruthy();
		expect(screen.getByText("Dompet aktif yang perlu perhatian")).toBeTruthy();

		expect(screen.getByText("Terakhir")).toBeTruthy();
		expect(screen.getByText("Semua →")).toBeTruthy();
		expect(screen.getByText("Belum ada transaksi")).toBeTruthy();
		expect(screen.queryByText("Indomaret")).toBeNull();
		expect(screen.queryByText("Insight harian")).toBeNull();

		expectTextOrder(getRenderedTextNodes(screen), [
			"Halo",
			expectedDate,
			"Total saldo",
			"Rp 0",
			"Input AI",
			"Anggaran",
			"Terakhir",
			"Belum ada transaksi",
		]);
	});

	it("shows actionable envelope alerts without low-confidence review noise", async () => {
		const screen = renderDashboard();

		await waitFor(() =>
			expect(screen.getByText(/Kopi hampir habis|Kopi/i)).toBeTruthy(),
		);
		expect(screen.getByText(/Rp42\.000 tersisa/)).toBeTruthy();
		expect(screen.getByText("83%")).toBeTruthy();
		expect(screen.queryByText(/perlu cek/i)).toBeNull();
	});

	it("does not show an envelope alert when no active envelope needs attention", async () => {
		mockAllocations = [
			{
				id: "alloc-safe",
				transaction_id: "tx-safe",
				envelope_id: "env-kopi",
				amount: 50000,
				confidence: 0.5,
				needs_review: true,
				transaction_date: "2026-05-15",
				transaction_description: "Cafe dekat kampus",
				created_at: "",
				updated_at: "",
			},
		];

		const screen = renderDashboard();

		await waitFor(() =>
			expect(screen.queryByTestId("home-envelope-alert")).toBeNull(),
		);
		expect(screen.queryByText(/perlu cek/i)).toBeNull();
		expect(screen.queryByText(/Kopi hampir habis/i)).toBeNull();
	});

	it("guides a new user to create the first wallet and persists guide progress", async () => {
		const screen = renderDashboard();

		await waitFor(() =>
			expect(screen.getByTestId("home-first-use-card")).toBeTruthy(),
		);
		expect(screen.getAllByText("Buat dompet pertama").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Buka Dompet").length).toBeGreaterThan(0);

		fireEvent.press(screen.getByTestId("home-first-use-primary"));
		expect(mockPush).toHaveBeenLastCalledWith("/(tabs)/wallets");

		fireEvent.press(screen.getByTestId("home-first-use-next"));
		await waitFor(() =>
			expect(AsyncStorage.setItem).toHaveBeenCalledWith(
				"first-use-guide:v1:user-1",
				expect.stringContaining('"lastStep":1'),
			),
		);
		expect(screen.getAllByText("Catat satu transaksi nyata").length).toBeGreaterThan(0);
	});

	it("uses persisted report visit state before completing the Reports setup step", async () => {
		mockWallets = [{ id: "wallet-1", name: "Cash", balance: 100000, is_active: true }];
		mockTransactions = [
			{
				id: "tx-1",
				merchant: "Kopi",
				description: "Kopi",
				category: "Groceries",
				amount: 25000,
				transaction_type: "expense",
				date: "2026-05-20",
			},
		];

		const screen = renderDashboard();

		await waitFor(() =>
			expect(screen.getAllByText("Cek laporan pertama").length).toBeGreaterThan(0),
		);
		expect(screen.getAllByText("Buka Laporan").length).toBeGreaterThan(0);
		expect(screen.getByTestId("home-first-use-card")).toBeTruthy();
	});

	it("hides the first-use guide after dismissal and persists the choice", async () => {
		const screen = renderDashboard();

		await waitFor(() =>
			expect(screen.getByTestId("home-first-use-card")).toBeTruthy(),
		);
		fireEvent.press(screen.getByTestId("home-first-use-dismiss"));

		await waitFor(() =>
			expect(screen.queryByTestId("home-first-use-card")).toBeNull(),
		);
		expect(AsyncStorage.setItem).toHaveBeenCalledWith(
			"first-use-guide:v1:user-1",
			expect.stringContaining('"dismissed":true'),
		);
	});

	it("loads dashboard wallet, transactions, and budget alerts for the active finance context", async () => {
		const { listBudgetEnvelopes } = require("../src/services/budget-envelopes");
		const { listWallets } = require("../src/services/wallets");
		const { listTransactions } = require("../src/services/transactions");
		mockActiveContext = {
			type: "household",
			householdId: "hh-1",
			role: "admin",
		};
		mockWallets = [
			{
				id: "wallet-family",
				name: "Family Wallet",
				balance: 1200000,
				is_active: true,
			},
		];
		mockTransactions = [
			{
				id: "tx-family",
				merchant: "Family Mart",
				description: "Groceries",
				category: "Groceries",
				amount: 75000,
				transaction_type: "expense",
				date: "2026-05-20",
			},
			{
				id: "tx-income",
				merchant: "Payroll",
				description: "Gaji",
				category: "Salary",
				amount: 1200000,
				transaction_type: "income",
				date: "2026-05-20",
			},
		];

		const screen = renderDashboard();

		await waitFor(() =>
			expect(screen.getByTestId("home-total-balance").props.children).toBe(
				"Rp 1.200.000",
			),
		);
		expect(screen.queryByText("Family Wallet")).toBeNull();
		expect(screen.getByText("Family Mart")).toBeTruthy();
		expect(screen.getByText("Payroll")).toBeTruthy();
		const expenseAmountStyle = StyleSheet.flatten(
			screen.getByTestId("home-recent-amount-tx-family").props.style,
		) as TextStyle;
		const incomeAmountStyle = StyleSheet.flatten(
			screen.getByTestId("home-recent-amount-tx-income").props.style,
		) as TextStyle;
		expect(expenseAmountStyle.color).toBe("#DC2626");
		expect(incomeAmountStyle.color).toBe("#65A30D");
		expect(listBudgetEnvelopes).toHaveBeenCalledWith(
			expect.anything(),
			"user-1",
			mockActiveContext,
		);
		expect(listWallets).toHaveBeenCalledWith(mockActiveContext);
		expect(listTransactions).toHaveBeenCalledWith(undefined, mockActiveContext);
	});

	it("routes visible Home actions to the expected tabs", async () => {
		const screen = renderDashboard();

		expect(screen.queryByText("Import")).toBeNull();

		fireEvent.press(screen.getByText("Input AI"));
		expect(mockPush).toHaveBeenLastCalledWith("/(tabs)/capture");

		fireEvent.press(screen.getByText("Lihat →"));
		expect(mockPush).toHaveBeenLastCalledWith("/(tabs)/budgets");

		fireEvent.press(screen.getByText("Semua →"));
		expect(mockPush).toHaveBeenLastCalledWith("/(tabs)/transactions");
	});

	it("uses Bottom Tab and FAB green for light theme primary accents", async () => {
		const screen = renderDashboard();

		const avatar = screen.getByTestId("home-avatar");
		const avatarStyle = getFlattenedStyle(avatar);
		expect(avatarStyle.width).toBe(40);
		expect(avatarStyle.height).toBe(40);
		expect(avatarStyle.borderWidth).toBe(2);
		expect(avatarStyle.backgroundColor).toBe("#FFFFFF");
		expect(avatarStyle.backgroundColor).not.toBe("#3F6212");

		const hero = screen.getByTestId("home-hero-card");
		const heroStyle = getFlattenedStyle(hero);
		expect(heroStyle.borderRadius).toBe(24);
		expect(heroStyle.padding).toBe(18);
		expect(heroStyle.shadowOpacity).toBeUndefined();

		expect(screen.getAllByTestId("finance-context-switcher")).toHaveLength(1);
		expect(screen.queryByTestId("home-wallet-pill")).toBeNull();

		const quickAction = screen.getByTestId("home-quick-action-manual");
		expect(quickAction.props.accessibilityRole).toBe("button");
		expect(quickAction.props.accessibilityLabel).toBe("Aksi cepat Input AI");
		const quickActionStyle = getFlattenedStyle(quickAction);
		expect(quickActionStyle.borderRadius).toBe(16);
		expect(quickActionStyle.paddingVertical).toBe(12);
		expect(quickActionStyle.paddingHorizontal).toBe(8);

		const sectionCard = screen.getByTestId("home-budget-section");
		const sectionCardStyle = getFlattenedStyle(sectionCard);
		expect(sectionCardStyle.borderRadius).toBe(18);
		expect(sectionCardStyle.padding).toBe(14);

		const cta = screen.getByTestId("home-budget-action");
		expect(cta.props.accessibilityRole).toBe("button");
		expect(cta.props.accessibilityLabel).toBe("Lihat semua budget");
		expect(getFlattenedStyle(cta).backgroundColor).toBeUndefined();

		const primaryBubble = screen.getByTestId("home-quick-bubble-manual");
		const primaryBubbleStyle = getFlattenedStyle(primaryBubble);
		expect(primaryBubbleStyle.width).toBe(32);
		expect(primaryBubbleStyle.height).toBe(32);
		expect(
			SOFT_GREEN_BACKGROUNDS.includes(
				primaryBubbleStyle.backgroundColor as string,
			) ||
				SOFT_GREEN_BORDERS.includes(primaryBubbleStyle.borderColor as string),
		).toBe(true);
	});

	it("shows transaction review CTA when review count > 0", async () => {
		mockReviewSummary = {
			summary: {
				count: 3,
				reasons: {
					review_required: 1,
					low_confidence: 1,
					other_category: 1,
					missing_fields: 0,
				},
			},
		};

		const screen = renderDashboard();

		await waitFor(() =>
			expect(screen.getByTestId("home-transaction-review-card")).toBeTruthy(),
		);
		expect(screen.getByText("3 transaksi perlu dicek")).toBeTruthy();
		expect(
			screen.getByText(
				"Rapikan kategori agar laporan dan Insight AI lebih akurat.",
			),
		).toBeTruthy();
		expect(screen.getByText("Cek sekarang")).toBeTruthy();
		expect(screen.getByTestId("home-review-action")).toBeTruthy();

		fireEvent.press(screen.getByTestId("home-review-action"));
		expect(mockPush).toHaveBeenLastCalledWith("/(tabs)/transactions?review=1");
	});

	it("hides transaction review card when count is 0", async () => {
		mockReviewSummary = {
			summary: {
				count: 0,
				reasons: {
					review_required: 0,
					low_confidence: 0,
					other_category: 0,
					missing_fields: 0,
				},
			},
		};

		const screen = renderDashboard();

		await waitFor(() =>
			expect(screen.getByText("Halo")).toBeTruthy(),
		);
		expect(screen.queryByTestId("home-transaction-review-card")).toBeNull();
		expect(screen.queryByText("Cek sekarang")).toBeNull();
	});

	it("hides transaction review card when summary is null", async () => {
		mockReviewSummary = null;

		const screen = renderDashboard();

		await waitFor(() =>
			expect(screen.getByText("Halo")).toBeTruthy(),
		);
		expect(screen.queryByTestId("home-transaction-review-card")).toBeNull();
	});
});
