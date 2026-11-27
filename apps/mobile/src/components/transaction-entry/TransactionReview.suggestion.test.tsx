jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { fireEvent, render, screen } from "@testing-library/react-native";

import {
	createDraft,
	localToday,
	type TransactionDraft,
} from "../../features/transaction-entry/draft";
import { I18nProvider } from "../../i18n/i18n-context";
import { ThemeProvider } from "../../theme/theme-context";
import {
	suggestedCategoryFor,
	TransactionReview,
} from "./TransactionReview";

/**
 * Discipline mode chip (prinsip 2): saran kategori baru dari AI menunggu
 * keputusan user. Chip hanya ada saat flag ON + props handler dipasang.
 */

const WALLETS = [{ id: "w1", name: "BCA" }];
const CATEGORIES = [{ name: "Other expenses" }];

function makeDraft(overrides: Partial<TransactionDraft> = {}) {
	return createDraft({
		source: "text",
		amount: 120000,
		category: "Other expenses",
		walletId: "w1",
		date: localToday(),
		extraction: { suggestedCategory: "Kursus Online" },
		...overrides,
	});
}

function renderReview(
	drafts: TransactionDraft[],
	handlers: {
		onAdd?: (key: string, name: string) => void;
		onDismiss?: (key: string) => void;
	} = {},
) {
	render(
		<I18nProvider>
			<ThemeProvider>
				<TransactionReview
					drafts={drafts}
					wallets={WALLETS}
					categories={CATEGORIES}
					canCreate
					onChange={jest.fn()}
					onAcknowledge={jest.fn()}
					onOpenPicker={jest.fn()}
					onSave={jest.fn()}
					onCancel={jest.fn()}
					saving={false}
					summary={{
						count: drafts.length,
						total: drafts.reduce((sum, draft) => sum + (draft.amount ?? 0), 0),
					}}
					onAddSuggestedCategory={handlers.onAdd}
					onDismissSuggestedCategory={handlers.onDismiss}
				/>
			</ThemeProvider>
		</I18nProvider>,
	);
}

describe("TransactionReview — chip saran kategori baru (discipline)", () => {
	const enableFlag = () => {
		(globalThis as { __KASWISE_FEATURE_FLAGS__?: unknown }).__KASWISE_FEATURE_FLAGS__ = {
			categoryAiDiscipline: true,
		};
	};
	const disableFlag = () => {
		delete (globalThis as { __KASWISE_FEATURE_FLAGS__?: unknown }).__KASWISE_FEATURE_FLAGS__;
	};

	afterEach(disableFlag);

	it("menampilkan chip dengan saran + aksi Buat / Masukkan ke Lainnya", () => {
		enableFlag();
		const onAdd = jest.fn();
		const onDismiss = jest.fn();
		const draft = makeDraft();
		renderReview([draft], { onAdd, onDismiss });

		const text = screen.getByTestId(`review-suggestion-text-${draft.key}`);
		expect(text.props.children).toBe("Kategori baru: Kursus Online?");

		fireEvent.press(screen.getByTestId(`review-suggestion-create-${draft.key}`));
		expect(onAdd).toHaveBeenCalledWith(draft.key, "Kursus Online");

		fireEvent.press(screen.getByTestId(`review-suggestion-dismiss-${draft.key}`));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("flag OFF: chip tidak dirender dan helper helper return null", () => {
		disableFlag();
		const draft = makeDraft();
		expect(suggestedCategoryFor(draft)).toBeNull();

		renderReview([draft], { onAdd: jest.fn(), onDismiss: jest.fn() });
		expect(screen.queryByTestId(/review-suggestion-/)).toBeNull();
	});

	it("saran dibersihkan dari metadata: draf dengan suggestedCategory null tidak menampilkan chip", () => {
		enableFlag();
		renderReview(
			[makeDraft({ extraction: { suggestedCategory: null } })],
			{ onAdd: jest.fn(), onDismiss: jest.fn() },
		);
		expect(screen.queryByTestId(/review-suggestion-/)).toBeNull();
	});

	it("kategori draf sudah spesifik → saran tidak ditampilkan", () => {
		enableFlag();
		renderReview(
			[makeDraft({ category: "Food & Beverage" })],
			{ onAdd: jest.fn(), onDismiss: jest.fn() },
		);
		expect(screen.queryByTestId(/review-suggestion-/)).toBeNull();
	});
});
