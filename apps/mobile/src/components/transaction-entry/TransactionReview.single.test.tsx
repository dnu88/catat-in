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
import { TransactionReview } from "./TransactionReview";

/**
 * T14 — single-draft review surface.
 *
 * A single draft gets one calm summary card (amount as anchor) plus exactly one
 * primary save CTA; extraction metadata stays behind a disclosure and
 * unresolved warnings stay visible and acknowledgeable.
 */

const WALLETS = [
	{ id: "w1", name: "BCA" },
	{ id: "w2", name: "Mandiri", is_active: true },
];
const CATEGORIES = [{ name: "Makan" }];

function makeDraft(overrides: Partial<TransactionDraft> = {}) {
	return createDraft({
		source: "manual",
		amount: 35000,
		category: "Makan",
		walletId: "w1",
		date: localToday(),
		...overrides,
	});
}

function renderReview(drafts: TransactionDraft[]) {
	const onSave = jest.fn();
	const onCancel = jest.fn();
	const onAcknowledge = jest.fn();
	render(
		<I18nProvider>
			<ThemeProvider>
				<TransactionReview
					drafts={drafts}
					wallets={WALLETS}
					categories={CATEGORIES}
					canCreate
					onChange={jest.fn()}
					onAcknowledge={onAcknowledge}
					onOpenPicker={jest.fn()}
					onSave={onSave}
					onCancel={onCancel}
					saving={false}
					summary={{
						count: drafts.length,
						total: drafts.reduce((sum, draft) => sum + (draft.amount ?? 0), 0),
					}}
				/>
			</ThemeProvider>
		</I18nProvider>,
	);
	return { onSave, onCancel, onAcknowledge };
}

describe("TransactionReview — single draft", () => {
	it("shows one summary card anchored on the amount", () => {
		renderReview([makeDraft()]);

		expect(screen.getByTestId("review-summary-single")).toBeTruthy();
		expect(screen.getByTestId("review-summary-single-amount").props.children).toBe(
			"Rp 35.000",
		);
		// The multi-transaction summary must not appear for one draft.
		expect(screen.queryByTestId("review-summary")).toBeNull();
	});

	it("keeps exactly one primary save CTA", () => {
		const { onSave } = renderReview([makeDraft()]);

		expect(screen.getAllByTestId("review-save")).toHaveLength(1);
		fireEvent.press(screen.getByTestId("review-save"));

		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it("keeps extraction metadata behind a disclosure", () => {
		renderReview([makeDraft()]);

		// Collapsed by default: no source body in the tree.
		expect(screen.queryByTestId("review-source-body")).toBeNull();

		fireEvent.press(screen.getByTestId("review-source-toggle"));
		expect(screen.getByTestId("review-source-body")).toBeTruthy();
	});

	it("keeps unresolved warnings visible and acknowledgeable", () => {
		const draft = makeDraft({ unresolvedFields: ["amount"] });
		const { onAcknowledge } = renderReview([draft]);

		expect(screen.getByTestId(`review-warnings-${draft.key}`)).toBeTruthy();

		fireEvent.press(screen.getByTestId(`review-ack-${draft.key}-amount`));
		expect(onAcknowledge).toHaveBeenCalledWith(draft.key, "amount");
	});

	it("reports the multi summary instead for several drafts", () => {
		renderReview([
			makeDraft({ amount: 10000 }),
			makeDraft({ amount: 25000 }),
		]);

		expect(screen.getByTestId("review-summary")).toBeTruthy();
		expect(screen.getByTestId("review-summary-total").props.children).toBe(
			"Rp 35.000",
		);
		expect(screen.queryByTestId("review-summary-single")).toBeNull();
	});
});
