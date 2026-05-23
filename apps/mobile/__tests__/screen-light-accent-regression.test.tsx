import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { ViewStyle } from "react-native";

import SettingsScreen from "../app/(tabs)/settings";
import TransactionsScreen from "../app/(tabs)/transactions";
import TransactionNewScreen from "../app/(tabs)/transaction-new";
import { I18nProvider } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";

const mockFinanceContext = { type: "personal" as const };

jest.mock("expo-router", () => ({
	router: { replace: jest.fn() },
	useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock("../src/lib/supabase", () => ({
	useSupabase: () => ({
		supabase: {
			auth: {
				signOut: jest.fn(async () => undefined),
				getUser: jest.fn(async () => ({ data: { user: null } })),
			},
		},
	}),
}));

jest.mock("../src/services/transactions", () => ({
	listTransactions: jest.fn(async () => []),
	createTransaction: jest.fn(async () => ({ id: "tx-new" })),
}));

jest.mock("../src/services/wallets", () => ({
	listWallets: jest.fn(async () => []),
}));

jest.mock("../src/services/categories", () => ({
	listCategories: jest.fn(async () => []),
}));

jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockFinanceContext,
		canCreate: true,
	}),
}));

describe("light accent regressions", () => {
	it("does not use neon green for selected settings chips in light theme", () => {
		const screen = render(
			<I18nProvider>
				<ThemeProvider>
					<SettingsScreen />
				</ThemeProvider>
			</I18nProvider>,
		);

		const lightChip = screen.getByTestId("settings-theme-light");

		fireEvent.press(lightChip);

		const flattened = StyleSheet.flatten(
			lightChip.props.style as object,
		) as ViewStyle;
		expect(flattened.backgroundColor).toBe("#3F6212");
		expect(flattened.backgroundColor).not.toBe("#A3FF12");
	});

	it("keeps transaction-new icon controls accessible and at least 44px wide", async () => {
		const screen = render(
			<ThemeProvider>
				<I18nProvider>
					<TransactionNewScreen />
				</I18nProvider>
			</ThemeProvider>,
		);

		const closeButton = await screen.findByLabelText(
			"Kembali dari catat manual",
		);
		const closeStyle = StyleSheet.flatten(
			closeButton.props.style as object,
		) as ViewStyle;
		expect(closeButton.props.accessibilityRole).toBe("button");
		expect(closeStyle.minWidth ?? closeStyle.width).toBeGreaterThanOrEqual(44);
		expect(closeStyle.minHeight ?? closeStyle.height).toBeGreaterThanOrEqual(
			44,
		);
	});

	it("does not use neon green for transactions period chips or fab in light theme", async () => {
		const screen = render(
			<ThemeProvider>
				<I18nProvider>
					<TransactionsScreen />
				</I18nProvider>
			</ThemeProvider>,
		);

		await waitFor(() => expect(screen.getByText("Bulan")).toBeTruthy());

		const monthChip = screen.getByTestId("transactions-period-month");
		fireEvent.press(monthChip);

		const monthStyle = StyleSheet.flatten(
			monthChip.props.style as object,
		) as ViewStyle;
		expect(monthStyle.backgroundColor).toBe("#3F6212");
		expect(monthStyle.backgroundColor).not.toBe("#A3FF12");

		const fab = screen.getByTestId("transactions-fab");
		const fabStyle = StyleSheet.flatten(fab.props.style as object) as ViewStyle;
		expect(fabStyle.backgroundColor).toBe("#3F6212");
		expect(fabStyle.backgroundColor).not.toBe("#A3FF12");
	});
});
