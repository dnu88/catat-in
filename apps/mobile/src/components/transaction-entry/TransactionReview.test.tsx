jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { fireEvent, render } from "@testing-library/react-native";

import type {
	DraftFieldErrors,
	TransactionDraft,
} from "../../features/transaction-entry/draft";
import { createDraft, localToday } from "../../features/transaction-entry/draft";
import { I18nProvider } from "../../i18n/i18n-context";
import { ThemeProvider } from "../../theme/theme-context";
import { TransactionReview } from "./TransactionReview";

const WALLETS = [
	{ id: "w1", name: "BCA" },
	{ id: "w2", name: "Mandiri", is_active: true },
];

const CATEGORIES = [{ name: "Makan" }];

type Harness = {
	onChange: jest.Mock;
	onAcknowledge: jest.Mock;
	onOpenPicker: jest.Mock;
	onSave: jest.Mock;
	onCancel: jest.Mock;
};

type ReviewOptions = {
	drafts: TransactionDraft[];
	saving?: boolean;
	errors?: Record<string, DraftFieldErrors>;
	summary?: { count: number; total: number };
};

function makeHarness(): Harness {
	return {
		onChange: jest.fn(),
		onAcknowledge: jest.fn(),
		onOpenPicker: jest.fn(),
		onSave: jest.fn(),
		onCancel: jest.fn(),
	};
}

function makeDraft(key: string, overrides: Partial<TransactionDraft> = {}): TransactionDraft {
	return createDraft({
		source: "text",
		key,
		amount: 10000,
		category: "Makan",
		walletId: "w1",
		date: localToday(),
		...overrides,
	});
}

function reviewElement(options: ReviewOptions, harness: Harness) {
	const { drafts, saving = false, errors, summary } = options;
	return (
		<TransactionReview
			drafts={drafts}
			wallets={WALLETS}
			categories={CATEGORIES}
			canCreate={true}
			onChange={harness.onChange}
			onAcknowledge={harness.onAcknowledge}
			onOpenPicker={harness.onOpenPicker}
			onSave={harness.onSave}
			onCancel={harness.onCancel}
			saving={saving}
			errors={errors}
			summary={summary ?? { count: drafts.length, total: 0 }}
		/>
	);
}

function renderReview(options: ReviewOptions, harness: Harness = makeHarness()) {
	const screen = render(
		<I18nProvider>
			<ThemeProvider>{reviewElement(options, harness)}</ThemeProvider>
		</I18nProvider>,
	);
	const rerenderWith = (next: ReviewOptions) =>
		screen.rerender(
			<I18nProvider>
				<ThemeProvider>{reviewElement(next, harness)}</ThemeProvider>
			</I18nProvider>,
		);
	return { screen, harness, rerenderWith };
}

describe("TransactionReview", () => {
	it("shows the batch summary count and total only when there is more than one draft", () => {
		const two = renderReview({
			drafts: [makeDraft("d1", { amount: 10000 }), makeDraft("d2", { amount: 25000 })],
			summary: { count: 2, total: 35000 },
		});

		expect(two.screen.getByTestId("review-summary-count").props.children).toBe("2 transaksi");
		expect(two.screen.getByTestId("review-summary-total").props.children).toBe("Rp 35.000");
		two.screen.unmount();

		const one = renderReview({
			drafts: [makeDraft("d1", { amount: 10000 })],
			summary: { count: 1, total: 10000 },
		});
		expect(one.screen.queryByTestId("review-summary")).toBeNull();
	});

	it("routes a field edit to onChange with the right draft key", () => {
		const { screen, harness } = renderReview({
			drafts: [makeDraft("d1"), makeDraft("d2")],
		});

		fireEvent.changeText(screen.getByTestId("draft-d2-amount"), "5000");

		expect(harness.onChange).toHaveBeenCalledWith("d2", { amount: 5000 });
	});

	it("routes a picker request to onOpenPicker with the right draft key", () => {
		const { screen, harness } = renderReview({ drafts: [makeDraft("d2")] });

		fireEvent.press(screen.getByTestId("draft-d2-category"));

		expect(harness.onOpenPicker).toHaveBeenCalledWith("d2", "category");
	});

	it("disables the save CTA while a draft is invalid and while saving", () => {
		const invalid = renderReview({ drafts: [makeDraft("d1", { amount: null })] });
		expect(invalid.screen.getByTestId("review-save").props.accessibilityState).toEqual(
			expect.objectContaining({ disabled: true }),
		);

		const saving = renderReview({ drafts: [makeDraft("d1")], saving: true });
		expect(saving.screen.getByTestId("review-save").props.accessibilityState).toEqual(
			expect.objectContaining({ disabled: true, busy: true }),
		);

		const ready = renderReview({ drafts: [makeDraft("d1")] });
		expect(ready.screen.getByTestId("review-save").props.accessibilityState).toEqual(
			expect.objectContaining({ disabled: false, busy: false }),
		);
	});

	it("enables the save CTA once an uncertain field is acknowledged", () => {
		const warned = makeDraft("d1", { unresolvedFields: ["amount"] });
		const { screen, harness, rerenderWith } = renderReview({ drafts: [warned] });

		expect(screen.getByText("Nominal belum pasti. Periksa dulu.")).toBeTruthy();
		expect(screen.getByTestId("review-save").props.accessibilityState).toEqual(
			expect.objectContaining({ disabled: true }),
		);

		fireEvent.press(screen.getByTestId("review-ack-d1-amount"));

		expect(harness.onAcknowledge).toHaveBeenCalledWith("d1", "amount");
		expect(harness.onSave).not.toHaveBeenCalled();

		rerenderWith({
			drafts: [
				makeDraft("d1", {
					unresolvedFields: ["amount"],
					acknowledgedFields: ["amount"],
				}),
			],
			summary: { count: 1, total: 10000 },
		});

		expect(screen.getByTestId("review-save").props.accessibilityState).toEqual(
			expect.objectContaining({ disabled: false }),
		);
	});

	it("keeps the source section collapsed by default and expands it on press", () => {
		const { screen } = renderReview({ drafts: [makeDraft("d1")] });

		expect(screen.queryByTestId("review-source-body")).toBeNull();
		const toggle = screen.getByTestId("review-source-toggle");
		expect(toggle.props.accessibilityState).toEqual(
			expect.objectContaining({ expanded: false }),
		);

		fireEvent.press(toggle);

		expect(screen.getByTestId("review-source-body")).toBeTruthy();
		expect(screen.getByTestId("review-source-toggle").props.accessibilityState).toEqual(
			expect.objectContaining({ expanded: true }),
		);
	});

	it("calls onSave from the enabled CTA", () => {
		const { screen, harness } = renderReview({ drafts: [makeDraft("d1")] });

		fireEvent.press(screen.getByTestId("review-save"));

		expect(harness.onSave).toHaveBeenCalledTimes(1);
	});
});
