import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { ThemeProvider } from "../src/theme/theme-context";
import { I18nProvider } from "../src/i18n/i18n-context";
import DashboardScreen from "../app/(tabs)/index";

const mockPush = jest.fn();
let mockEnvelopes: any[] = [];
let mockAllocations: any[] = [];
let mockWallets: any[] = [];
let mockTransactions: any[] = [];
let mockActiveContext:
	| { type: "personal" }
	| { type: "household"; householdId: string; role: "admin" } = {
	type: "personal",
};

jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush }),
}));

jest.mock("../src/lib/supabase", () => ({
	useSupabase: () => ({
		supabase: {
			auth: {
				getUser: jest.fn(async () => ({ data: { user: { id: "user-1" } } })),
			},
		},
	}),
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
		expect(screen.getByTestId("home-entrance-actions")).toBeTruthy();
		expect(screen.getByTestId("home-entrance-budget")).toBeTruthy();
		expect(screen.getByTestId("home-entrance-recent")).toBeTruthy();

		expect(screen.getByText("Total saldo")).toBeTruthy();
		expect(screen.getByTestId("home-total-balance").props.children).toBe(
			"Rp 0",
		);
		expect(screen.queryByTestId("home-wallet-pill")).toBeNull();
		expect(screen.getByText("Manage")).toBeTruthy();
		expect(screen.queryByText("↗ 15%")).toBeNull();

		expect(screen.getByText("Input AI")).toBeTruthy();
		expect(screen.getByText("Import")).toBeTruthy();

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
			"Import",
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
		];

		const screen = renderDashboard();

		await waitFor(() =>
			expect(screen.getByTestId("home-total-balance").props.children).toBe(
				"Rp 1.200.000",
			),
		);
		expect(screen.queryByText("Family Wallet")).toBeNull();
		expect(screen.getByText("Family Mart")).toBeTruthy();
		expect(listBudgetEnvelopes).toHaveBeenCalledWith(
			expect.anything(),
			"user-1",
			mockActiveContext,
		);
		expect(listWallets).toHaveBeenCalledWith(mockActiveContext);
		expect(listTransactions).toHaveBeenCalledWith(undefined, mockActiveContext);
	});

	it("routes primary Home actions to the expected tabs", async () => {
		const screen = renderDashboard();

		fireEvent.press(screen.getByText("Input AI"));
		expect(mockPush).toHaveBeenLastCalledWith("/(tabs)/capture");

		fireEvent.press(screen.getByText("Import"));
		expect(mockPush).toHaveBeenLastCalledWith("/(tabs)/imports");

		fireEvent.press(screen.getByText("Lihat →"));
		expect(mockPush).toHaveBeenLastCalledWith("/(tabs)/budgets");

		fireEvent.press(screen.getByText("Semua →"));
		expect(mockPush).toHaveBeenLastCalledWith("/(tabs)/transactions");
	});

	it("uses Bottom Tab and FAB green for light theme primary accents", async () => {
		const screen = renderDashboard();

		const avatar = screen.getByTestId("home-avatar");
		const avatarStyle = getFlattenedStyle(avatar);
		expect(avatarStyle.width).toBe(36);
		expect(avatarStyle.height).toBe(36);
		expect(avatarStyle.backgroundColor).toBe("#3F6212");

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
});
