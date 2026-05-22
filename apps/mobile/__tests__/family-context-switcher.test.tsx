import { fireEvent, render, screen } from "@testing-library/react-native";

import { FinanceContextSwitcher } from "../src/components/FinanceContextSwitcher";
import { I18nProvider } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";

const mockSetPersonalContext = jest.fn();
const mockSetActiveHousehold = jest.fn();

jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: { type: "personal" },
		memberships: [
			{
				household_id: "hh-1",
				role: "admin",
				households: { name: "Keluarga Budi" },
			},
		],
		setPersonalContext: mockSetPersonalContext,
		setActiveHousehold: mockSetActiveHousehold,
	}),
}));

describe("FinanceContextSwitcher", () => {
	beforeEach(() => {
		mockSetPersonalContext.mockClear();
		mockSetActiveHousehold.mockClear();
	});

	it("shows personal and household choices", () => {
		render(
			<I18nProvider>
				<ThemeProvider>
					<FinanceContextSwitcher />
				</ThemeProvider>
			</I18nProvider>,
		);

		expect(screen.getByText("Pribadi")).toBeTruthy();
		expect(screen.getByTestId("finance-context-switcher").props.style).toEqual(
			expect.objectContaining({ minHeight: 44, maxWidth: 150 }),
		);
		fireEvent.press(screen.getByTestId("finance-context-switcher"));
		expect(screen.getByTestId("finance-context-option-personal")).toBeTruthy();
		expect(
			screen.getByTestId("finance-context-option-personal").props
				.accessibilityState,
		).toEqual({ selected: true });
		expect(screen.getByText("Keluarga Budi")).toBeTruthy();
		expect(
			screen.getByTestId("finance-context-option-hh-1").props
				.accessibilityState,
		).toEqual({ selected: false });
		fireEvent.press(screen.getByTestId("finance-context-option-hh-1"));
		expect(mockSetActiveHousehold).toHaveBeenCalledWith("hh-1");
	});
});
