jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));
import React from "react";
import { Modal, StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { I18nProvider } from "../i18n/i18n-context";
import { ThemeProvider } from "../theme/theme-context";
import { FinanceContextSwitcher } from "./FinanceContextSwitcher";

const mockSetPersonalContext = jest.fn<any, any[]>();
const mockSetActiveHousehold = jest.fn<any, any[]>();
const mockActiveContext: { type: "personal" } = { type: "personal" };

jest.mock("../state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockActiveContext,
		memberships: [
			{
				household_id: "h-1",
				role: "owner",
				households: { name: "Keluarga Danu" },
			},
		],
		canCreate: true,
		setPersonalContext: (...args: unknown[]) => mockSetPersonalContext(...args),
		setActiveHousehold: (...args: unknown[]) => mockSetActiveHousehold(...args),
	}),
}));

function renderSwitcher(
	beforeChange?: (next: any) => boolean,
	presentation: "sheet" | "dropdown" = "dropdown",
) {
	return render(
		<I18nProvider>
			<ThemeProvider>
				<FinanceContextSwitcher beforeChange={beforeChange} presentation={presentation} />
			</ThemeProvider>
		</I18nProvider>,
	);
}

describe("FinanceContextSwitcher context-switch guard", () => {
	it.each(["personal", "h-1"])("sheet selection %s still asks the host guard and closes without applying", (id) => {
		const guard = jest.fn(() => false);
		const view = renderSwitcher(guard, "sheet");
		fireEvent.press(view.getByTestId("finance-context-switcher"));
		expect(view.UNSAFE_getByType(Modal).props.visible).toBe(true);
		expect(StyleSheet.flatten(view.getByTestId("finance-context-sheet-panel").props.style)).toMatchObject({ maxHeight: "88%", paddingBottom: 34 });
		expect(StyleSheet.flatten(view.getByTestId("finance-context-switcher").props.style)).toMatchObject({ width: "100%", maxWidth: "100%", minWidth: 0 });
		fireEvent.press(view.getByTestId(`finance-context-option-${id}`));
		expect(guard).toHaveBeenCalledWith(id === "personal" ? { type: "personal" } : { type: "household", householdId: "h-1" });
		expect(mockSetPersonalContext).not.toHaveBeenCalled();
		expect(mockSetActiveHousehold).not.toHaveBeenCalled();
		expect(view.queryByTestId("finance-context-sheet")).toBeNull();
	});
	it("dismisses the sheet without changing context", () => {
		const view = renderSwitcher(undefined, "sheet");
		fireEvent.press(view.getByTestId("finance-context-switcher"));
		fireEvent.press(view.getByTestId("finance-context-sheet-close"));
		expect(view.queryByTestId("finance-context-sheet")).toBeNull();
		expect(mockSetPersonalContext).not.toHaveBeenCalled();
		expect(mockSetActiveHousehold).not.toHaveBeenCalled();
	});
	beforeEach(() => {
		mockSetPersonalContext.mockReset();
		mockSetActiveHousehold.mockReset();
	});

	it("switches immediately when no guard is supplied (legacy behaviour)", () => {
		const { getByTestId } = renderSwitcher();

		fireEvent.press(getByTestId("finance-context-switcher"));
		fireEvent.press(getByTestId("finance-context-option-h-1"));

		expect(mockSetActiveHousehold).toHaveBeenCalledWith("h-1");
	});

	it("blocks the switch when the host guard refuses", () => {
		const beforeChange = jest.fn(() => false);
		const { getByTestId } = renderSwitcher(beforeChange);

		fireEvent.press(getByTestId("finance-context-switcher"));
		fireEvent.press(getByTestId("finance-context-option-personal"));

		expect(beforeChange).toHaveBeenCalledWith({ type: "personal" });
		expect(mockSetPersonalContext).not.toHaveBeenCalled();
	});

	it("passes the household id to the guard and applies on approval", () => {
		const beforeChange = jest.fn(() => true);
		const { getByTestId } = renderSwitcher(beforeChange);

		fireEvent.press(getByTestId("finance-context-switcher"));
		fireEvent.press(getByTestId("finance-context-option-h-1"));

		expect(beforeChange).toHaveBeenCalledWith({
			type: "household",
			householdId: "h-1",
		});
		expect(mockSetActiveHousehold).toHaveBeenCalledWith("h-1");
	});

	it("closes the menu even when the switch is blocked", () => {
		const beforeChange = jest.fn(() => false);
		const { getByTestId, queryByTestId } = renderSwitcher(beforeChange);

		fireEvent.press(getByTestId("finance-context-switcher"));
		fireEvent.press(getByTestId("finance-context-option-personal"));

		expect(queryByTestId("finance-context-option-personal")).toBeNull();
	});
});
