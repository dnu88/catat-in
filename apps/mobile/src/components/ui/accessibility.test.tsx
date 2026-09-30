import { createRef } from "react";
import { render } from "@testing-library/react-native";
import { TextInput } from "react-native";

import { ThemeProvider } from "../../theme/theme-context";
import { InputField } from "./InputField";
import { StateMessage } from "./StateMessage";

function renderWithTheme(node: React.ReactElement) {
	return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("shared UI accessibility", () => {
	it("announces urgent state messages as alerts and live regions", () => {
		const screen = renderWithTheme(<StateMessage message="Could not save" tone="error" />);
		const message = screen.getByText("Could not save");

		expect(message.props.accessibilityRole).toBe("alert");
		expect(message.props.accessibilityLiveRegion).toBe("assertive");
	});

	it("marks invalid inputs, announces errors, and forwards keyboard props and refs", () => {
		const ref = createRef<TextInput>();
		const screen = renderWithTheme(
			<InputField
				ref={ref}
				label="Email"
				value="bad"
				onChangeText={jest.fn()}
				error="Enter a valid email"
				returnKeyType="next"
				testID="email-input"
			/>,
		);
		const input = screen.getByTestId("email-input");
		const error = screen.getByText("Enter a valid email");

		expect(input.props["aria-invalid"]).toBe(true);
		expect(input.props.accessibilityHint).toBe("Enter a valid email");
		expect(input.props.returnKeyType).toBe("next");
		expect(error.props.accessibilityRole).toBe("alert");
		expect(error.props.accessibilityLiveRegion).toBe("polite");
		expect(ref.current).toBeTruthy();
	});
});
