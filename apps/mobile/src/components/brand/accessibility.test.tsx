import { render } from "@testing-library/react-native";

import { I18nProvider, useI18n } from "../../i18n/i18n-context";
import { ThemeProvider } from "../../theme/theme-context";
import { KaswiseLogoMark } from "./KaswiseLogoMark";

jest.mock("expo-router", () => ({
	useRouter: () => ({ push: jest.fn() }),
}));

describe("brand accessibility", () => {
	it("keeps only the parent logo accessible and hides decorative polygons", () => {
		const screen = render(
			<ThemeProvider>
				<KaswiseLogoMark />
			</ThemeProvider>,
		);

		const svg = screen.getByTestId("kaswise-logo-mark");
		expect(svg.props.accessibilityRole).toBe("image");
		expect(svg.props.accessibilityLabel).toBe("Kaswise logo");

		for (const id of ["1", "2", "3", "4"]) {
			const polygon = screen.getByTestId(`kaswise-logo-polygon-${id}`, {
				includeHiddenElements: true,
			});
			expect(polygon.props.accessibilityLabel).toBeUndefined();
		}
	});
});

describe("i18n accessibility", () => {
	it("fills the capture tab label in both supported languages", () => {
		const { Text } = require("react-native");

		function Probe() {
			const { t } = useI18n();
			return <Text>{t("tabCapture")}</Text>;
		}

		const idScreen = render(
			<I18nProvider>
				<Probe />
			</I18nProvider>,
		);
		expect(idScreen.getByText("Catat")).toBeTruthy();
		expect(idScreen.queryByText("")).toBeNull();
	});
});
