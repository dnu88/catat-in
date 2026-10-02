import { act, fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import { AutoSaveToast } from "./AutoSaveToast";

function renderToast(overrides: Partial<React.ComponentProps<typeof AutoSaveToast>> = {}) {
	const props = {
		title: "Tersimpan: Makan & Minum · Rp35.000",
		actionLabel: "Batalkan",
		editLabel: "Ubah",
		onUndo: jest.fn(),
		onEdit: jest.fn(),
		onExpire: jest.fn(),
		...overrides,
	};
	return { props, ...render(<AutoSaveToast {...props} />) };
}

describe("AutoSaveToast", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("shows the saved summary with both actions", () => {
		renderToast();
		expect(screen.getByTestId("auto-save-toast")).toBeTruthy();
		expect(screen.getByTestId("auto-save-undo")).toBeTruthy();
		expect(screen.getByTestId("auto-save-edit")).toBeTruthy();
		expect(screen.getByText(/Rp35\.000/)).toBeTruthy();
	});

	it("calls onUndo when the undo action is pressed", () => {
		const { props } = renderToast();
		fireEvent.press(screen.getByTestId("auto-save-undo"));
		expect(props.onUndo).toHaveBeenCalledTimes(1);
		expect(props.onEdit).not.toHaveBeenCalled();
	});

	it("calls onEdit when the edit action is pressed", () => {
		const { props } = renderToast();
		fireEvent.press(screen.getByTestId("auto-save-edit"));
		expect(props.onEdit).toHaveBeenCalledTimes(1);
		expect(props.onUndo).not.toHaveBeenCalled();
	});

	it("expires exactly after the ten second window", () => {
		const { props } = renderToast();
		act(() => {
			jest.advanceTimersByTime(9_999);
		});
		expect(props.onExpire).not.toHaveBeenCalled();
		act(() => {
			jest.advanceTimersByTime(1);
		});
		expect(props.onExpire).toHaveBeenCalledTimes(1);
	});

	it("does not expire after unmount", () => {
		const { props, unmount } = renderToast();
		unmount();
		act(() => {
			jest.advanceTimersByTime(30_000);
		});
		expect(props.onExpire).not.toHaveBeenCalled();
	});

	it("honours a custom window", () => {
		const { props } = renderToast({ timeoutMs: 3_000 });
		act(() => {
			jest.advanceTimersByTime(3_000);
		});
		expect(props.onExpire).toHaveBeenCalledTimes(1);
	});
});
