import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ThemeProvider } from "../../theme/theme-context";
import { IOSWheelDatePicker } from "./IOSWheelDatePicker";

function renderPicker(value = "2026-05-15", onChange = jest.fn()) {
	return {
		onChange,
		...render(
			<ThemeProvider>
				<IOSWheelDatePicker
					value={value}
					onChange={onChange}
					locale="en"
					testID="date-picker"
				/>
			</ThemeProvider>,
		),
	};
}

describe("IOSWheelDatePicker accessibility", () => {
	it("exposes each wheel as adjustable and changes the selected value with accessibility actions", () => {
		const { getByTestId, onChange } = renderPicker();
		const monthWheel = getByTestId("date-picker-month-scroll");

		expect(monthWheel.props.accessibilityRole).toBe("adjustable");
		expect(monthWheel.props.accessibilityLabel).toBe("Month");
		expect(monthWheel.props.accessibilityValue).toEqual(
			expect.objectContaining({ now: 4, min: 0, max: 11, text: "May" }),
		);
		expect(monthWheel.props.accessibilityActions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "increment" }),
				expect.objectContaining({ name: "decrement" }),
			]),
		);

		fireEvent(monthWheel, "accessibilityAction", {
			nativeEvent: { actionName: "increment" },
		});
		expect(onChange).toHaveBeenLastCalledWith("2026-06-15");

		fireEvent(monthWheel, "accessibilityAction", {
			nativeEvent: { actionName: "decrement" },
		});
		expect(onChange).toHaveBeenLastCalledWith("2026-04-15");
	});

	it("hides visual item cells from assistive technology and uses 44-point geometry", () => {
		const { getByTestId } = renderPicker();
		const item = getByTestId("date-picker-month-item-5", { includeHiddenElements: true });

		expect(item.props.accessible).toBe(false);
		expect(item.props.importantForAccessibility).toBe("no-hide-descendants");
		expect(StyleSheet.flatten(item.props.style).height).toBeGreaterThanOrEqual(44);
	});
});
