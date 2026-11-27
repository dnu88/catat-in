import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { SettingsNavigationRow } from "./SettingsNavigationRow";
import { ThemeProvider } from "../../theme/theme-context";

function renderRow(onPress = jest.fn()) {
	const screen = render(
		<ThemeProvider>
			<SettingsNavigationRow
				testID="settings-wallets-command"
				icon="wallets"
				title="Dompet & akun"
				description="Kelola rekening, e-wallet, dan kas rumah tangga."
				badge="Utama"
				onPress={onPress}
			/>
		</ThemeProvider>,
	);
	return { screen, onPress };
}

describe("SettingsNavigationRow", () => {
	it("renders command copy with an accessible button target", () => {
		const { screen } = renderRow();

		expect(screen.getByText("Dompet & akun")).toBeTruthy();
		expect(screen.getByText("Kelola rekening, e-wallet, dan kas rumah tangga.")).toBeTruthy();
		expect(screen.getByText("Utama")).toBeTruthy();
		expect(screen.getByRole("button", {
			name: "Dompet & akun, Kelola rekening, e-wallet, dan kas rumah tangga.",
		})).toBeTruthy();
		expect(screen.getByLabelText("Dompet & akun, Kelola rekening, e-wallet, dan kas rumah tangga.")).toBeTruthy();
		expect(screen.getByText("Dompet & akun").props.numberOfLines).toBe(1);
		expect(screen.getByText("Kelola rekening, e-wallet, dan kas rumah tangga.").props.numberOfLines).toBe(2);
	});

	it("fires onPress and keeps a comfortable touch target", () => {
		const onPress = jest.fn();
		const { screen } = renderRow(onPress);
		const row = screen.getByTestId("settings-wallets-command");

		fireEvent.press(row);

		expect(onPress).toHaveBeenCalledTimes(1);
		expect(StyleSheet.flatten(row.props.style).minHeight).toBeGreaterThanOrEqual(56);
	});
});
