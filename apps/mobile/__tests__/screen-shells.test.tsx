import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import {
	OperationalScreen,
	TabScreen,
	resolveScreenInsets,
} from "../src/components/layout/ScreenShell";
import {
	KeyboardFormShell,
	resolveKeyboardAvoidingBehavior,
	resolveKeyboardDismissMode,
} from "../src/components/layout/KeyboardFormShell";

jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
}));

describe("shared iOS screen shells", () => {
	it("derives top and bottom content insets without fixed screen spacers", () => {
		expect(
			resolveScreenInsets({
				topSafeArea: 47,
				bottomSafeArea: 34,
				tabBarHeight: 64,
				bottomSpacing: 16,
			}),
		).toEqual({ paddingTop: 47, paddingBottom: 114 });
	});

	it("keeps operational content inside the device safe area", () => {
		const { getByTestId } = render(
			<OperationalScreen testID="operational">
				<Text>Task</Text>
			</OperationalScreen>,
		);

		expect(getByTestId("operational")).toHaveStyle({
			flex: 1,
			paddingTop: 47,
			paddingBottom: 50,
		});
	});

	it("keeps primary content clear of the floating tab bar", () => {
		const { getByTestId } = render(
			<TabScreen testID="tab-screen">
				<Text>Dashboard</Text>
			</TabScreen>,
		);

		expect(getByTestId("tab-screen")).toHaveStyle({
			flex: 1,
			paddingTop: 47,
			paddingBottom: 114,
		});
	});

	it("selects iOS keyboard behavior for task forms", () => {
		expect(resolveKeyboardAvoidingBehavior("ios")).toBe("padding");
		expect(resolveKeyboardAvoidingBehavior("android")).toBeUndefined();
		expect(resolveKeyboardDismissMode("ios")).toBe("interactive");
		expect(resolveKeyboardDismissMode("android")).toBe("on-drag");
	});

	it("renders an iOS form shell with keyboard avoidance and safe-area insets", () => {
		const { getByTestId } = render(
			<KeyboardFormShell
				testID="form-shell"
				scrollViewTestID="form-scroll"
				platform="ios"
			>
				<Text>Form</Text>
			</KeyboardFormShell>,
		);

		expect(getByTestId("form-scroll").props.automaticallyAdjustKeyboardInsets).toBe(
			true,
		);
		expect(getByTestId("form-scroll").props.keyboardDismissMode).toBe(
			"interactive",
		);
		expect(getByTestId("form-scroll").props.keyboardShouldPersistTaps).toBe(
			"handled",
		);
		expect(getByTestId("form-scroll").props.contentContainerStyle).toContainEqual(
			{ paddingTop: 47, paddingBottom: 50 },
		);
	});
});
