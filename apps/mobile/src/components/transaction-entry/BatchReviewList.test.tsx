jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { I18nProvider } from "../../i18n/i18n-context";
import { ThemeProvider } from "../../theme/theme-context";
import {
	BatchReviewList,
	batchReviewCopy,
	initialExpandedKeys,
	type BatchReviewRow,
} from "./BatchReviewList";

const ROWS: BatchReviewRow[] = [
	{
		key: "k1",
		description: "Kopi Kenangan",
		amount: 35000,
		category: "Makan & Minum",
		walletName: "BCA",
		hasWarning: false,
		invalid: false,
	},
	{
		key: "k2",
		description: "Indomaret",
		amount: 92500,
		category: "Belanja",
		walletName: "BCA",
		hasWarning: true,
		invalid: false,
	},
	{
		key: "k3",
		description: "Gojek",
		amount: 60000,
		category: "Transportasi",
		walletName: "BCA",
		hasWarning: false,
		invalid: true,
	},
];

type Overrides = Partial<Parameters<typeof BatchReviewList>[0]>;

function renderList(overrides: Overrides = {}) {
	const props = {
		rows: ROWS,
		count: ROWS.length,
		total: 187500,
		canCreate: true,
		saving: false,
		expandedKeys: [] as string[],
		onToggleRow: jest.fn(),
		onEditRow: jest.fn(),
		onSave: jest.fn(),
		copy: batchReviewCopy("id"),
		renderRowEditor: (row: BatchReviewRow) => (
			<Text testID={`row-editor-${row.key}`}>editor</Text>
		),
		...overrides,
	};
	const utils = render(
		<I18nProvider>
			<ThemeProvider>
				<BatchReviewList {...(props as any)} />
			</ThemeProvider>
		</I18nProvider>,
	);
	return { ...utils, props };
}

describe("BatchReviewList", () => {
	it("summarises the batch as N transactions with a total", () => {
		const { getByTestId } = renderList();

		expect(getByTestId("batch-review-count").props.children).toBe("3 transaksi");
		expect(getByTestId("batch-review-total").props.children).toBe("Rp 187.500");
	});

	it("keeps every row collapsed until it is opened", () => {
		const { queryByTestId } = renderList({ expandedKeys: [] });

		expect(queryByTestId("row-editor-k1")).toBeNull();
		expect(queryByTestId("row-editor-k2")).toBeNull();
		expect(queryByTestId("row-editor-k3")).toBeNull();
	});

	it("expands only the rows the controller marked as expanded", () => {
		const { getByTestId, queryByTestId } = renderList({
			expandedKeys: ["k1"],
		});

		expect(getByTestId("row-editor-k1")).toBeTruthy();
		expect(queryByTestId("row-editor-k2")).toBeNull();
	});

	it("asks the controller to open a row when its toggle is pressed", () => {
		const onToggleRow = jest.fn();
		const { getByTestId } = renderList({ onToggleRow });

		fireEvent.press(getByTestId("batch-review-toggle-k1"));
		expect(onToggleRow).toHaveBeenCalledWith("k1");
	});

	it("keeps a problem badge visible even while the row is collapsed", () => {
		const { getByTestId, queryByTestId } = renderList({ expandedKeys: [] });

		// Warning row and invalid row both advertise their problem collapsed.
		expect(getByTestId("batch-review-badge-k2")).toBeTruthy();
		expect(getByTestId("batch-review-badge-k3")).toBeTruthy();
		// A healthy row shows no badge and stays collapsed.
		expect(queryByTestId("batch-review-badge-k1")).toBeNull();
		expect(queryByTestId("row-editor-k2")).toBeNull();
	});

	it("offers exactly one save CTA labelled with the row count", () => {
		const onSave = jest.fn();
		const { getByTestId, getAllByTestId, queryAllByTestId } = renderList({ onSave });

		expect(getAllByTestId("batch-review-save")).toHaveLength(1);
		expect(queryAllByTestId("batch-review-save")[0].props.accessibilityLabel).toBe(
			"Simpan 3 transaksi",
		);

		fireEvent.press(getByTestId("batch-review-save"));
		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it("locks the batch CTA while a save is in flight", () => {
		const onSave = jest.fn();
		const { getByTestId } = renderList({ saving: true, onSave });

		const cta = getByTestId("batch-review-save");
		expect(cta.props.accessibilityState).toMatchObject({
			disabled: true,
			busy: true,
		});

		fireEvent.press(cta);
		expect(onSave).not.toHaveBeenCalled();
	});

	it("blocks a viewer from saving the batch", () => {
		const onSave = jest.fn();
		const { getByTestId, getByText } = renderList({
			canCreate: false,
			onSave,
		});

		expect(getByText(batchReviewCopy("id").viewerNotice)).toBeTruthy();
		expect(getByTestId("batch-review-save").props.accessibilityState).toMatchObject(
			{ disabled: true },
		);
		fireEvent.press(getByTestId("batch-review-save"));
		expect(onSave).not.toHaveBeenCalled();
	});

	it("localizes the save CTA and summary unit", () => {
		expect(batchReviewCopy("id")).toMatchObject({ countUnit: "transaksi" });
		expect(batchReviewCopy("en")).toMatchObject({ countUnit: "transactions" });
		expect(batchReviewCopy("en").saveN(2)).toBe("Save 2 transactions");
		expect(batchReviewCopy("id").saveN(2)).toBe("Simpan 2 transaksi");
	});

	it("starts with problem rows open and healthy rows folded", () => {
		expect(initialExpandedKeys(ROWS)).toEqual(["k2", "k3"]);
	});
});
