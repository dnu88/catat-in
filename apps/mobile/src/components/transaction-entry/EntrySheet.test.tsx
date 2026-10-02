jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { act, fireEvent, render } from "@testing-library/react-native";
import { Modal, StyleSheet, Text } from "react-native";

import { I18nProvider } from "../../i18n/i18n-context";
import { ThemeProvider } from "../../theme/theme-context";
import { EntrySheet } from "./EntrySheet";

function renderSheet(visible = true, onClose = jest.fn()) {
	const screen = render(
		<I18nProvider>
			<ThemeProvider>
				<EntrySheet visible={visible} title="Pilih kategori" onClose={onClose} testID="sheet">
					<Text testID="sheet-content">Isi</Text>
				</EntrySheet>
			</ThemeProvider>
		</I18nProvider>,
	);
	return { screen, onClose };
}

describe("EntrySheet", () => {
	it("renders nothing while hidden and the titled panel while visible", () => {
		const hidden = renderSheet(false);
		expect(hidden.screen.queryByTestId("sheet")).toBeNull();
	});

	it("traps assistive focus on the sheet panel and scrolls tall content", () => {
		const { screen } = renderSheet();

		expect(screen.getByTestId("sheet-panel").props.accessibilityViewIsModal).toBe(true);
		expect(screen.getByTestId("sheet-body").props.children).toBeTruthy();
		expect(screen.getByText("Pilih kategori").props.accessibilityRole).toBe("header");
	});

	it("closes from the labelled close control (>= 44pt) and from the backdrop", () => {
		const { screen, onClose } = renderSheet();
		const close = screen.getByTestId("sheet-close");

		expect(close.props.accessibilityRole).toBe("button");
		expect(close.props.accessibilityLabel).toBe("Tutup");
		expect(StyleSheet.flatten(close.props.style).minHeight).toBeGreaterThanOrEqual(44);
		expect(StyleSheet.flatten(close.props.style).minWidth).toBeGreaterThanOrEqual(44);

		fireEvent.press(close);
		expect(onClose).toHaveBeenCalledTimes(1);

		fireEvent.press(screen.getByTestId("sheet-backdrop", { includeHiddenElements: true }));
		expect(onClose).toHaveBeenCalledTimes(2);
	});

	it("closes on Escape or Android back through the modal request", () => {
		const { screen, onClose } = renderSheet();
		const modal = screen.UNSAFE_getByType(Modal);

		expect(typeof modal.props.onRequestClose).toBe("function");
		act(() => {
			modal.props.onRequestClose();
		});
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
