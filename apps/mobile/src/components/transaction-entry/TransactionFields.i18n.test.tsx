jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// The provider hydrates the stored language on mount, so a mutable value lets
// one file cover both locales without re-importing the module.
let mockStoredLanguage: string | null = null;
jest.mock("@react-native-async-storage/async-storage", () => ({
	getItem: jest.fn(async () => mockStoredLanguage),
	setItem: jest.fn(async () => undefined),
	removeItem: jest.fn(async () => undefined),
}));

import { render, screen } from "@testing-library/react-native";

import {
	createDraft,
	localToday,
	type TransactionDraft,
} from "../../features/transaction-entry/draft";
import { I18nProvider } from "../../i18n/i18n-context";
import { ThemeProvider } from "../../theme/theme-context";
import { entryCopy } from "./copy";
import { TransactionFields } from "./TransactionFields";

/**
 * T13 regression coverage.
 *
 * The layout contract (amount anchor, compact segmented type, picker rows,
 * collapsed details) is already implemented in TransactionFields, so these
 * tests pin the two things the plan calls out that were NOT covered: bilingual
 * labels, and errors being visible without the user opening anything.
 */

const WALLETS = [
	{ id: "w1", name: "BCA" },
	{ id: "w2", name: "Mandiri", is_active: true },
];
const CATEGORIES = [{ name: "Makan" }];

function makeDraft(overrides: Partial<TransactionDraft> = {}): TransactionDraft {
	return createDraft({
		source: "manual",
		amount: 25000,
		category: "Makan",
		walletId: "w1",
		date: localToday(),
		...overrides,
	});
}

function renderFields(
	draft: TransactionDraft,
	errors?: Parameters<typeof TransactionFields>[0]["errors"],
	canCreate = true,
) {
	return render(
		<I18nProvider>
			<ThemeProvider>
				<TransactionFields
					draft={draft}
					onChange={jest.fn()}
					wallets={WALLETS}
					categories={CATEGORIES}
					canCreate={canCreate}
					onOpenPicker={jest.fn()}
					errors={errors}
					testID="tf"
				/>
			</ThemeProvider>
		</I18nProvider>,
	);
}

describe("TransactionFields — errors are visible without interaction", () => {
	beforeEach(() => {
		mockStoredLanguage = null;
	});

	it("reveals every invalid field immediately, with no tap required", async () => {
		renderFields(makeDraft(), {
			amount: "REQUIRED",
			category: "REQUIRED",
			walletId: "REQUIRED",
			date: "INVALID",
		});

		// No expand/tap happened: the invalid rows are already visible.
		expect(await screen.findByTestId("tf-amount-error")).toBeTruthy();
		expect(screen.getByTestId("tf-category-error")).toBeTruthy();
		expect(screen.getByTestId("tf-wallet-error")).toBeTruthy();
		expect(screen.getByTestId("tf-date-error")).toBeTruthy();
	});

	it("reveals the destination wallet error on a transfer", async () => {
		renderFields(
			makeDraft({ transactionType: "transfer", targetWalletId: null }),
			{ targetWalletId: "REQUIRED", walletId: "REQUIRED" },
		);

		expect(await screen.findByTestId("tf-target-wallet-error")).toBeTruthy();
		// Transfers never ask for a category, so no category error can appear.
		expect(screen.queryByTestId("tf-category-error")).toBeNull();
	});

	it("shows the same-wallet rejection copy rather than a generic error", async () => {
		renderFields(
			makeDraft({ transactionType: "transfer", targetWalletId: "w1" }),
			{ targetWalletId: "SAME_WALLET" },
		);

		expect(await screen.findByText(entryCopy("id").sameWalletError)).toBeTruthy();
	});

	it("states why a viewer cannot edit instead of failing silently", async () => {
		renderFields(makeDraft(), undefined, false);

		expect(await screen.findByTestId("tf-permission-error")).toBeTruthy();
		expect(screen.getByTestId("tf-permission-error").props.children).toBe(
			entryCopy("id").viewerNotice,
		);
	});
});

describe("TransactionFields — bilingual labels", () => {
	afterEach(() => {
		mockStoredLanguage = null;
	});

	it("renders Indonesian labels by default", async () => {
		mockStoredLanguage = "id";
		renderFields(makeDraft());

		const copy = entryCopy("id");
		expect(await screen.findByText(copy.amountLabel)).toBeTruthy();
		expect(screen.getByText(copy.typeHint)).toBeTruthy();
		expect(screen.getByText(copy.categoryLabel)).toBeTruthy();
		expect(screen.getByText(copy.walletLabel)).toBeTruthy();
		expect(screen.getByText(copy.dateLabel)).toBeTruthy();
		expect(screen.getByText(copy.addDetail)).toBeTruthy();
	});

	it("renders English labels when English is active", async () => {
		mockStoredLanguage = "en";
		renderFields(makeDraft());

		const copy = entryCopy("en");
		expect(await screen.findByText(copy.amountLabel)).toBeTruthy();
		expect(screen.getByText(copy.typeHint)).toBeTruthy();
		expect(screen.getByText(copy.categoryLabel)).toBeTruthy();
		expect(screen.getByText(copy.walletLabel)).toBeTruthy();
		expect(screen.getByText(copy.dateLabel)).toBeTruthy();
		expect(screen.getByText(copy.addDetail)).toBeTruthy();
	});
});
