import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { IOSWheelDatePicker } from "../src/components/date/IOSWheelDatePicker";
import { ThemeProvider } from "../src/theme/theme-context";

const ITEM_HEIGHT = 42;

function renderPicker(value: string, onChange = jest.fn()) {
	return {
		onChange,
		...render(
			<ThemeProvider>
				<IOSWheelDatePicker value={value} onChange={onChange} testID="date-picker" />
			</ThemeProvider>,
		),
	};
}

describe("IOSWheelDatePicker", () => {
	it("limits the year wheel to last year, this year, and next year", () => {
		const currentYear = new Date().getFullYear();
		const screen = renderPicker(`${currentYear}-06-15`);

		expect(screen.getByTestId(`date-picker-year-item-${currentYear - 1}`)).toBeTruthy();
		expect(screen.getByTestId(`date-picker-year-item-${currentYear}`)).toBeTruthy();
		expect(screen.getByTestId(`date-picker-year-item-${currentYear + 1}`)).toBeTruthy();
		expect(screen.queryByTestId(`date-picker-year-item-${currentYear - 2}`)).toBeNull();
		expect(screen.queryByTestId(`date-picker-year-item-${currentYear + 2}`)).toBeNull();
	});

	it("auto-selects on wheel snap and clamps February days dynamically", async () => {
		const currentYear = new Date().getFullYear();
		const expectedLastFebruaryDay = new Date(currentYear, 2, 0).getDate();
		const { getByTestId, onChange } = renderPicker(`${currentYear}-01-31`);

		fireEvent(getByTestId("date-picker-month-scroll"), "scrollEndDrag", {
			nativeEvent: { contentOffset: { y: ITEM_HEIGHT } },
		});

		await waitFor(() => {
			expect(onChange).toHaveBeenCalledWith(
				`${currentYear}-02-${String(expectedLastFebruaryDay).padStart(2, "0")}`,
			);
		});
	});
	it("shows the 31st day for months that have 31 days", () => {
		const currentYear = new Date().getFullYear();
		const march = renderPicker(`${currentYear}-03-31`);

		expect(march.getByTestId("date-picker-date-item-31")).toBeTruthy();

		march.unmount();
		const april = renderPicker(`${currentYear}-04-30`);
		expect(april.queryByTestId("date-picker-date-item-31")).toBeNull();
	});

});
