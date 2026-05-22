import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import WalletsScreen from "../app/(tabs)/wallets";
import { I18nProvider, useI18n, type Language } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";

const mockListWallets = jest.fn();
const mockCreateWallet = jest.fn();
let mockActiveContext: { type: "personal" } | { type: "household"; householdId: string; role: "admin" } = { type: "personal" };

jest.mock("../src/services/wallets", () => ({
	listWallets: (...args: unknown[]) => mockListWallets(...args),
	createWallet: (...args: unknown[]) => mockCreateWallet(...args),
}));

jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockActiveContext,
		canCreate: true,
		memberships: [
			{
				household_id: "hh-1",
				role: "admin",
				households: { name: "Keluarga Budi" },
			},
		],
	}),
}));

type StyleHostNode = {
	props: {
		style?: StyleProp<ViewStyle> | ((state: { pressed: boolean; hovered: boolean; focused: boolean }) => StyleProp<ViewStyle>);
	};
};

function getFlattenedStyle(node: StyleHostNode): ViewStyle {
	const style = typeof node.props.style === "function"
		? node.props.style({ pressed: false, hovered: false, focused: false })
		: node.props.style;

	return StyleSheet.flatten(style) ?? {};
}

function LanguageSetter({ language }: { language: Language }) {
	const { setLanguage } = useI18n();
	React.useEffect(() => setLanguage(language), [language, setLanguage]);
	return null;
}

function renderWallets(language: Language = "id") {
	return render(
		<I18nProvider>
			<LanguageSetter language={language} />
			<ThemeProvider>
				<WalletsScreen />
			</ThemeProvider>
		</I18nProvider>,
	);
}

describe("WalletsScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockActiveContext = { type: "personal" };
		mockListWallets.mockImplementation(async (context) => {
			if (context.type === "personal") {
				return [
					{ id: "wallet-personal", name: "BCA Pribadi", type: "bank", balance: 1000000, is_active: true },
				];
			}
			return [
				{ id: "wallet-family", name: "Dompet Keluarga", type: "cash", balance: 2500000, is_active: true },
			];
		});
		mockCreateWallet.mockResolvedValue({ id: "wallet-new" });
	});

	it("uses the same card-based hero treatment as Home instead of a solid neon hero", async () => {
		renderWallets();

		const hero = await screen.findByTestId("wallets-total-hero");
		const heroStyle = getFlattenedStyle(hero);

		expect(heroStyle.backgroundColor).not.toBe("#A3FF12");
		expect(heroStyle.borderRadius).toBe(24);
		expect(heroStyle.padding).toBe(18);
		expect(heroStyle.borderWidth).toBe(1);
		expect([
			"rgba(255, 255, 255, 0.06)",
			"rgba(10, 10, 10, 0.06)",
		]).toContain(heroStyle.borderColor);
	});

	it("shows personal and family wallets together with scope badges", async () => {
		renderWallets();

		expect(await screen.findByText("BCA Pribadi")).toBeTruthy();
		expect(screen.getByText("Dompet Keluarga")).toBeTruthy();
		expect(screen.getByText("Pribadi")).toBeTruthy();
		expect(screen.getByText("Keluarga Budi")).toBeTruthy();
		expect(mockListWallets).toHaveBeenCalledWith({ type: "personal" });
		expect(mockListWallets).toHaveBeenCalledWith({ type: "household", householdId: "hh-1", role: "admin" });
	});

	it("opens create wallet form and creates in the active context", async () => {
		mockActiveContext = { type: "household", householdId: "hh-1", role: "admin" };
		renderWallets();

		fireEvent.press(await screen.findByTestId("wallets-create-toggle"));
		fireEvent.changeText(screen.getByLabelText("Nama dompet"), "Dompet Liburan");
		fireEvent.changeText(screen.getByLabelText("Saldo awal"), "500000");
		fireEvent.press(screen.getByTestId("wallet-type-ewallet"));
		fireEvent.press(screen.getByTestId("wallet-create-submit"));

		await waitFor(() => expect(mockCreateWallet).toHaveBeenCalledWith(
			{ name: "Dompet Liburan", type: "ewallet", balance: 500000 },
			{ type: "household", householdId: "hh-1", role: "admin" },
		));
	});

	it("uses the selected App language", async () => {
		renderWallets("en");

		expect(await screen.findByText("Wallets")).toBeTruthy();
		expect(screen.getByText("+ New")).toBeTruthy();
		expect(screen.getByText("Personal")).toBeTruthy();
		expect(screen.queryByText("Dompet")).toBeNull();
	});
});
