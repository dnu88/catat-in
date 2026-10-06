jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, Modal, Platform, StyleSheet, Text } from "react-native";

import { I18nProvider } from "../../i18n/i18n-context";
import { ThemeProvider } from "../../theme/theme-context";
import { EntrySheet } from "./EntrySheet";

function renderSheet(visible = true, onClose = jest.fn(), premium = false, title = "Pilih kategori") {
	const sheet = (premium: boolean) => (
		<I18nProvider>
			<ThemeProvider>
				<EntrySheet visible={visible} title={title} onClose={onClose} testID="sheet" premium={premium}>
					<Text testID="sheet-content">Isi</Text>
				</EntrySheet>
			</ThemeProvider>
		</I18nProvider>
	);
	const screen = render(sheet(premium));
	return { screen, onClose, rerenderPremium: (enabled: boolean) => screen.rerender(sheet(enabled)) };
}

function deferredPreference() {
	let resolve!: (enabled: boolean) => void;
	const promise = new Promise<boolean>((resolvePromise) => {
		resolve = resolvePromise;
	});
	return { promise, resolve };
}

describe("EntrySheet", () => {
	beforeEach(() => jest.clearAllMocks());
	afterEach(() => jest.restoreAllMocks());

	it("respects reduced motion only in premium, including live preference changes", async () => {
		jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
		let changePreference: (enabled: boolean) => void = () => {};
		const remove = jest.fn();
		jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation((_event, listener) => {
			changePreference = listener;
			return { remove };
		});
		const legacy = renderSheet();
		expect(legacy.screen.UNSAFE_getByType(Modal).props.animationType).toBe("slide");
		expect(AccessibilityInfo.isReduceMotionEnabled).not.toHaveBeenCalled();
		expect(AccessibilityInfo.addEventListener).not.toHaveBeenCalled();
		legacy.screen.unmount();

		const { screen } = renderSheet(true, jest.fn(), true);
		await waitFor(() => expect(screen.UNSAFE_getByType(Modal).props.animationType).toBe("none"));
		act(() => changePreference(false));
		expect(screen.UNSAFE_getByType(Modal).props.animationType).toBe("slide");
		act(() => changePreference(true));
		expect(screen.UNSAFE_getByType(Modal).props.animationType).toBe("none");
		screen.unmount();
		expect(remove).toHaveBeenCalledTimes(1);
	});
	it.each([
		{ livePreference: false, latePreference: true, animation: "slide" },
		{ livePreference: true, latePreference: false, animation: "none" },
	])("keeps live reduced motion $livePreference when the initial query resolves late", async ({ livePreference, latePreference, animation }) => {
		const initial = deferredPreference();
		jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(initial.promise);
		let changePreference!: (enabled: boolean) => void;
		const remove = jest.fn();
		const subscribe = jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation((_event, listener) => {
			changePreference = listener;
			return { remove };
		});
		const { screen } = renderSheet(true, jest.fn(), true);
		expect(screen.UNSAFE_getByType(Modal).props.animationType).toBe("none");
		expect(subscribe).toHaveBeenCalledWith("reduceMotionChanged", expect.any(Function));

		act(() => changePreference(livePreference));
		expect(screen.UNSAFE_getByType(Modal).props.animationType).toBe(animation);
		await act(async () => {
			initial.resolve(latePreference);
			await initial.promise;
		});
		expect(screen.UNSAFE_getByType(Modal).props.animationType).toBe(animation);
		act(() => changePreference(!livePreference));
		expect(screen.UNSAFE_getByType(Modal).props.animationType).toBe(livePreference ? "slide" : "none");
		screen.unmount();
		expect(remove).toHaveBeenCalledTimes(1);
	});

	it("isolates reduced-motion subscriptions across premium OFF→ON→OFF→ON", async () => {
		const oldInitial = deferredPreference();
		const newInitial = deferredPreference();
		const query = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled")
			.mockReturnValueOnce(oldInitial.promise)
			.mockReturnValueOnce(newInitial.promise);
		const listeners: Array<(enabled: boolean) => void> = [];
		const oldRemove = jest.fn();
		const newRemove = jest.fn();
		const subscribe = jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation((_event, listener) => {
			listeners.push(listener);
			return { remove: listeners.length === 1 ? oldRemove : newRemove };
		});
		const { screen, rerenderPremium } = renderSheet();
		const animation = () => screen.UNSAFE_getByType(Modal).props.animationType;
		expect(animation()).toBe("slide");
		expect(query).not.toHaveBeenCalled();
		expect(subscribe).not.toHaveBeenCalled();

		rerenderPremium(true);
		expect(animation()).toBe("none");
		expect(query).toHaveBeenCalledTimes(1);
		expect(subscribe).toHaveBeenCalledTimes(1);

		rerenderPremium(false);
		expect(animation()).toBe("slide");
		expect(oldRemove).toHaveBeenCalledTimes(1);
		expect(query).toHaveBeenCalledTimes(1);
		expect(subscribe).toHaveBeenCalledTimes(1);

		rerenderPremium(true);
		expect(animation()).toBe("none");
		expect(query).toHaveBeenCalledTimes(2);
		expect(subscribe).toHaveBeenCalledTimes(2);
		expect(newRemove).not.toHaveBeenCalled();
		await act(async () => {
			newInitial.resolve(false);
			await newInitial.promise;
		});
		expect(animation()).toBe("slide");

		// The old query and old listener must also leave the new resolved preference alone.
		await act(async () => {
			oldInitial.resolve(true);
			await oldInitial.promise;
		});
		expect(animation()).toBe("slide");
		act(() => listeners[0](true));
		expect(animation()).toBe("slide");
		act(() => listeners[1](true));
		expect(animation()).toBe("none");
		act(() => listeners[0](false));
		expect(animation()).toBe("none");
		act(() => listeners[1](false));
		expect(animation()).toBe("slide");

		screen.unmount();
		expect(oldRemove).toHaveBeenCalledTimes(1);
		expect(newRemove).toHaveBeenCalledTimes(1);
	});

	it("lets long premium titles wrap fully while preserving the legacy single-line title", () => {
		const title = "Pilih kategori transaksi keluarga untuk kebutuhan rumah tangga bersama";
		const legacy = renderSheet(true, jest.fn(), false, title);
		expect(legacy.screen.getByText(title).props.numberOfLines).toBe(1);
		legacy.screen.unmount();
		const { screen } = renderSheet(true, jest.fn(), true, title);
		expect(screen.getByText(title).props.numberOfLines).toBeUndefined();
		expect(screen.getByText(title).props.accessibilityRole).toBe("header");
		expect(StyleSheet.flatten(screen.getByTestId("sheet-close").props.style).minWidth).toBeGreaterThanOrEqual(44);
	});

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

	it("dismisses premium web sheets on Escape from a focused child without relying on modal activation", () => {
		jest.replaceProperty(Platform, "OS", "web");
		const legacy = renderSheet();
		expect(legacy.screen.getByTestId("sheet").props.onKeyUpCapture).toBeUndefined();
		legacy.screen.unmount();
		const { screen, onClose } = renderSheet(true, jest.fn(), true);
		const stopPropagation = jest.fn();
		fireEvent(screen.getByTestId("sheet-close"), "keyUpCapture", { key: "Enter", stopPropagation });
		expect(onClose).not.toHaveBeenCalled();
		fireEvent(screen.getByTestId("sheet-close"), "keyUpCapture", { key: "Escape", stopPropagation });
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(stopPropagation).toHaveBeenCalledTimes(1);
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
