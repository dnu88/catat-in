import React from "react";
import {
	fireEvent,
	render,
	screen,
	within,
	waitFor,
} from "@testing-library/react-native";
import { Alert, Platform, ScrollView, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import WalletsScreen from "../app/(tabs)/wallets";
import { I18nProvider, useI18n, type Language } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";

const mockListWallets = jest.fn();
const mockCreateWallet = jest.fn();
const mockUpdateWallet = jest.fn();
const mockDeleteWallet = jest.fn();
let mockCanCreate = true;
let mockActiveContext:
	| { type: "personal" }
	| { type: "household"; householdId: string; role: "admin" } = {
	type: "personal",
};

jest.mock("expo-router", () => {
	const ReactRuntime = jest.requireActual("react");
	return {
		useFocusEffect: (callback: () => void | (() => void)) =>
			ReactRuntime.useEffect(() => callback(), [callback]),
	};
});

jest.mock("../src/services/wallets", () => ({
	listWallets: (...args: unknown[]) => mockListWallets(...args),
	createWallet: (...args: unknown[]) => mockCreateWallet(...args),
	updateWallet: (...args: unknown[]) => mockUpdateWallet(...args),
	deleteWallet: (...args: unknown[]) => mockDeleteWallet(...args),
}));

jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockActiveContext,
		canCreate: mockCanCreate,
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
		style?:
			| StyleProp<ViewStyle>
			| ((state: {
					pressed: boolean;
					hovered: boolean;
					focused: boolean;
			  }) => StyleProp<ViewStyle>);
	};
};

function getFlattenedStyle(node: StyleHostNode): ViewStyle {
	const style =
		typeof node.props.style === "function"
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

type SimpleNavigationGlobal = typeof globalThis & {
	__KASWISE_FEATURE_FLAGS__?: { simpleNavigation?: boolean };
};

const flagsGlobal = globalThis as SimpleNavigationGlobal;

function enableSimpleNavigation() {
	flagsGlobal.__KASWISE_FEATURE_FLAGS__ = { simpleNavigation: true };
}

function disableSimpleNavigation() {
	flagsGlobal.__KASWISE_FEATURE_FLAGS__ = { simpleNavigation: false };
}

// Walks the rendered tree in document order and returns every testID it finds.
// Used to assert presentation density: what a user sees first vs. later.
function collectTestIds(node: unknown, out: string[] = []): string[] {
	if (Array.isArray(node)) {
		node.forEach((child) => collectTestIds(child, out));
		return out;
	}
	if (!node || typeof node !== "object") return out;

	const element = node as {
		props?: { testID?: unknown };
		children?: unknown;
	};
	if (typeof element.props?.testID === "string") {
		out.push(element.props.testID);
	}
	collectTestIds(element.children, out);
	return out;
}

function renderedTestIds() {
	return collectTestIds(screen.toJSON());
}

function expectBefore(earlier: string, later: string) {
	const ids = renderedTestIds();
	const earlierIndex = ids.indexOf(earlier);
	const laterIndex = ids.indexOf(later);
	expect(earlierIndex).toBeGreaterThanOrEqual(0);
	expect(laterIndex).toBeGreaterThanOrEqual(0);
	expect(earlierIndex).toBeLessThan(laterIndex);
}

describe("WalletsScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockActiveContext = { type: "personal" };
		mockCanCreate = true;
		mockListWallets.mockImplementation(async (context) => {
			if (context.type === "personal") {
				return [
					{
						id: "wallet-personal",
						name: "BCA Pribadi",
						type: "bank",
						balance: 1000000,
						is_active: true,
					},
				];
			}
			return [
				{
					id: "wallet-family",
					name: "Dompet Keluarga",
					type: "cash",
					balance: 2500000,
					is_active: true,
				},
			];
		});
		mockCreateWallet.mockResolvedValue({ id: "wallet-new" });
		mockUpdateWallet.mockResolvedValue({ id: "wallet-personal" });
		mockDeleteWallet.mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
		delete flagsGlobal.__KASWISE_FEATURE_FLAGS__;
	});

	it("uses the reference-led gradient hero and stacked wallet treatment", async () => {
		renderWallets();

		const hero = await screen.findByTestId("wallets-hero");
		const heroStyle = getFlattenedStyle(hero);

		expect(heroStyle.backgroundColor).not.toBe("#A3FF12");
		expect(heroStyle.borderBottomLeftRadius).toBe(42);
		expect(heroStyle.borderBottomRightRadius).toBe(42);
		expect(screen.getByTestId("wallets-card-stack")).toBeTruthy();
	});

	it("loads each wallet scope once on the initial render", async () => {
		renderWallets();

		expect((await screen.findAllByText("BCA Pribadi")).length).toBeGreaterThanOrEqual(2);
		expect(screen.getByText("Dompet Keluarga")).toBeTruthy();

		await waitFor(() => expect(mockListWallets).toHaveBeenCalledTimes(2));
	});

	it("shows personal and family wallets together with scope badges", async () => {
		renderWallets();

		expect((await screen.findAllByText("BCA Pribadi")).length).toBeGreaterThanOrEqual(2);
		expect(screen.getByText("Dompet Keluarga")).toBeTruthy();
		expect(screen.getByText("Pribadi")).toBeTruthy();
		expect(screen.getByText("Keluarga Budi")).toBeTruthy();
		expect(mockListWallets).toHaveBeenCalledWith({ type: "personal" });
		expect(mockListWallets).toHaveBeenCalledWith({
			type: "household",
			householdId: "hh-1",
			role: "admin",
		});
	});

	it("opens create wallet form and creates in the active context", async () => {
		mockActiveContext = {
			type: "household",
			householdId: "hh-1",
			role: "admin",
		};
		renderWallets();

		fireEvent.press(await screen.findByTestId("wallets-create-toggle"));
		fireEvent.changeText(
			screen.getByLabelText("Nama dompet"),
			"Dompet Liburan",
		);
		fireEvent.changeText(screen.getByLabelText("Saldo awal"), "500000");
		fireEvent.press(screen.getByTestId("wallet-type-ewallet"));
		fireEvent.press(screen.getByTestId("wallet-create-submit"));

		await waitFor(() =>
			expect(mockCreateWallet).toHaveBeenCalledWith(
				{ name: "Dompet Liburan", type: "ewallet", balance: 500000 },
				{ type: "household", householdId: "hh-1", role: "admin" },
			),
		);
	});

	it("edits wallets in their own scope", async () => {
		renderWallets();

		fireEvent.press(await screen.findByTestId("wallet-edit-wallet-family"));
		fireEvent.changeText(screen.getByLabelText("Nama dompet"), "Dompet Rumah");
		fireEvent.press(screen.getByTestId("wallet-update-submit"));

		await waitFor(() =>
			expect(mockUpdateWallet).toHaveBeenCalledWith(
				"wallet-family",
				{ name: "Dompet Rumah", type: "cash" },
				{ type: "household", householdId: "hh-1", role: "admin" },
			),
		);
	});

	it("does not delete a wallet when native confirmation is cancelled", async () => {
		const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
		renderWallets();

		fireEvent.press(await screen.findByTestId("wallet-delete-wallet-family"));
		const buttons = alertSpy.mock.calls[0]?.[2];
		expect(alertSpy).toHaveBeenCalledWith(
			"Hapus dompet?",
			"Dompet Keluarga akan dihapus permanen.",
			expect.any(Array),
		);
		expect(buttons).toEqual(expect.arrayContaining([
			expect.objectContaining({ text: "Batal", style: "cancel" }),
			expect.objectContaining({ text: "Hapus", style: "destructive" }),
		]));
		buttons?.[0]?.onPress?.();
		expect(mockDeleteWallet).not.toHaveBeenCalled();
	});

	it("deletes a wallet only after native destructive confirmation", async () => {
		const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
		renderWallets();

		fireEvent.press(await screen.findByTestId("wallet-delete-wallet-family"));
		const destructive = alertSpy.mock.calls[0]?.[2]?.find((button) => button.style === "destructive");
		destructive?.onPress?.();

		await waitFor(() =>
			expect(mockDeleteWallet).toHaveBeenCalledWith("wallet-family", {
				type: "household",
				householdId: "hh-1",
				role: "admin",
			}),
		);
	});

	it("uses browser confirm before deleting on web", async () => {
		Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
		Object.defineProperty(globalThis, "confirm", { configurable: true, value: jest.fn() });
		const confirmSpy = jest.mocked(globalThis.confirm).mockReturnValue(false);
		renderWallets("en");

		fireEvent.press(await screen.findByTestId("wallet-delete-wallet-family"));
		expect(confirmSpy).toHaveBeenCalledWith("Delete wallet?\n\nDompet Keluarga will be permanently deleted.");
		expect(mockDeleteWallet).not.toHaveBeenCalled();

		confirmSpy.mockReturnValue(true);
		fireEvent.press(screen.getByTestId("wallet-delete-wallet-family"));
		await waitFor(() => expect(mockDeleteWallet).toHaveBeenCalledTimes(1));
		Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
	});

	it("uses the selected App language", async () => {
		renderWallets("en");

		expect(await screen.findByText("Wallets")).toBeTruthy();
		expect(screen.getByText("+ New")).toBeTruthy();
		expect(screen.getByText("Personal")).toBeTruthy();
		expect(screen.queryByText("Dompet")).toBeNull();
	});

	it("shows the legacy loading indicator while wallets are loading", async () => {
		disableSimpleNavigation();
		renderWallets();

		expect(screen.getByTestId("wallets-loading")).toBeTruthy();

		await screen.findByTestId("wallet-card-wallet-personal");
	});

	it("shows the legacy load error when loading fails", async () => {
		disableSimpleNavigation();
		mockListWallets.mockRejectedValue(new Error("network down"));
		renderWallets();

		const error = await screen.findByTestId("wallets-error");
		expect(within(error).getByText("Gagal memuat dompet")).toBeTruthy();
	});

	it("shows the legacy empty state when there are no wallets", async () => {
		disableSimpleNavigation();
		mockListWallets.mockResolvedValue([]);
		renderWallets();

		const empty = await screen.findByTestId("wallets-empty");
		expect(within(empty).getByText("Belum ada dompet untuk dikelola.")).toBeTruthy();
	});

	it("locks the legacy order from hero to filter to the wallet list", async () => {
		disableSimpleNavigation();
		renderWallets();

		// The loading block mounts where the list will, i.e. after the filter.
		expectBefore("wallets-filter", "wallets-loading");

		await screen.findByTestId("wallet-card-wallet-personal");
		expectBefore("wallets-hero", "wallets-filter");
		expectBefore("wallets-filter", "wallet-card-wallet-personal");
	});

	it("keeps the legacy load error behind the filter", async () => {
		disableSimpleNavigation();
		mockListWallets.mockRejectedValue(new Error("network down"));
		renderWallets();

		await screen.findByTestId("wallets-error");
		expectBefore("wallets-filter", "wallets-error");
	});

	it("keeps the legacy empty state behind the filter", async () => {
		disableSimpleNavigation();
		mockListWallets.mockResolvedValue([]);
		renderWallets();

		await screen.findByTestId("wallets-empty");
		expectBefore("wallets-filter", "wallets-empty");
	});
});

describe("WalletsScreen simple navigation", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockActiveContext = { type: "personal" };
		mockCanCreate = true;
		enableSimpleNavigation();
		mockListWallets.mockImplementation(async (context) => {
			if (context.type === "personal") {
				return [
					{
						id: "wallet-personal",
						name: "BCA Pribadi",
						type: "bank",
						balance: 1000000,
						is_active: true,
					},
				];
			}
			return [
				{
					id: "wallet-family",
					name: "Dompet Keluarga",
					type: "cash",
					balance: 2500000,
					is_active: true,
				},
			];
		});
		mockCreateWallet.mockResolvedValue({ id: "wallet-new" });
		mockUpdateWallet.mockResolvedValue({ id: "wallet-family" });
		mockDeleteWallet.mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
		delete flagsGlobal.__KASWISE_FEATURE_FLAGS__;
	});

	it("leads with the balance hero, finance context, and active wallet count", async () => {
		renderWallets();

		const hero = await screen.findByTestId("wallets-total-hero");
		expect(within(hero).getByText(/3\.500\.000/)).toBeTruthy();

		const contextLabel = screen.getByTestId("wallets-context-label");
		expect(within(contextLabel).getByText("Konteks: Pribadi")).toBeTruthy();

		const activeCount = screen.getByTestId("wallets-active-count");
		expect(within(activeCount).getByText("2 akun aktif")).toBeTruthy();
	});

	it("labels the active household finance context", async () => {
		mockActiveContext = {
			type: "household",
			householdId: "hh-1",
			role: "admin",
		};
		renderWallets();

		const contextLabel = await screen.findByTestId("wallets-context-label");
		expect(within(contextLabel).getByText("Konteks: Keluarga Budi")).toBeTruthy();
	});

	it("keeps filters behind the wallet list instead of dominating the first viewport", async () => {
		renderWallets();

		await screen.findByTestId("wallet-card-wallet-personal");

		expectBefore("wallets-total-hero", "wallets-context-label");
		expectBefore("wallets-context-label", "wallets-active-count");
		expectBefore("wallets-active-count", "wallet-card-wallet-personal");
		expectBefore("wallet-card-wallet-personal", "wallets-add-cta");
		expectBefore("wallets-add-cta", "wallets-filter");
	});

	it("keeps the legacy filter position ahead of the list when simple navigation is off", async () => {
		disableSimpleNavigation();
		renderWallets();

		await screen.findByTestId("wallet-card-wallet-personal");

		expectBefore("wallets-filter", "wallet-card-wallet-personal");
		expect(screen.queryByTestId("wallets-context-label")).toBeNull();
		expect(screen.queryByTestId("wallets-add-cta")).toBeNull();
	});

	it("creates a wallet from the primary add CTA in the active context", async () => {
		mockActiveContext = {
			type: "household",
			householdId: "hh-1",
			role: "admin",
		};
		renderWallets();

		fireEvent.press(await screen.findByTestId("wallets-add-cta"));
		fireEvent.changeText(screen.getByLabelText("Nama dompet"), "Dompet Liburan");
		fireEvent.changeText(screen.getByLabelText("Saldo awal"), "500000");
		fireEvent.press(screen.getByTestId("wallet-type-ewallet"));
		fireEvent.press(screen.getByTestId("wallet-create-submit"));

		await waitFor(() =>
			expect(mockCreateWallet).toHaveBeenCalledWith(
				{ name: "Dompet Liburan", type: "ewallet", balance: 500000 },
				{ type: "household", householdId: "hh-1", role: "admin" },
			),
		);
	});

	it("edits a wallet without exposing direct balance editing", async () => {
		renderWallets();

		fireEvent.press(await screen.findByTestId("wallet-edit-wallet-family"));
		const editForm = screen.getByTestId("wallet-edit-form");
		expect(within(editForm).queryByLabelText("Saldo")).toBeNull();
		expect(within(editForm).getByText("Rp 2.500.000")).toBeTruthy();

		fireEvent.changeText(screen.getByLabelText("Nama dompet"), "Dompet Rumah");
		fireEvent.press(screen.getByTestId("wallet-update-submit"));

		await waitFor(() =>
			expect(mockUpdateWallet).toHaveBeenCalledWith(
				"wallet-family",
				{ name: "Dompet Rumah", type: "cash" },
				{ type: "household", householdId: "hh-1", role: "admin" },
			),
		);
	});

	it("still deletes wallets after native destructive confirmation", async () => {
		const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
		renderWallets();

		fireEvent.press(await screen.findByTestId("wallet-delete-wallet-family"));
		const destructive = alertSpy.mock.calls[0]?.[2]?.find(
			(button) => button.style === "destructive",
		);
		destructive?.onPress?.();

		await waitFor(() =>
			expect(mockDeleteWallet).toHaveBeenCalledWith("wallet-family", {
				type: "household",
				householdId: "hh-1",
				role: "admin",
			}),
		);
	});

	it("respects viewer restrictions on the add CTA", async () => {
		mockCanCreate = false;
		renderWallets();

		const addCta = await screen.findByTestId("wallets-add-cta");
		expect(addCta.props.accessibilityState).toMatchObject({ disabled: true });

		fireEvent.press(addCta);
		expect(screen.queryByTestId("wallet-create-form")).toBeNull();
		expect(mockCreateWallet).not.toHaveBeenCalled();

		expect(
			screen.getByTestId("wallets-create-toggle").props.accessibilityState,
		).toMatchObject({ disabled: true });
	});

	it("wraps the demoted filters in the secondary filter section", async () => {
		renderWallets();

		await screen.findByTestId("wallet-card-wallet-personal");

		const secondary = screen.getByTestId("wallets-filter-secondary");
		expect(within(secondary).getByTestId("wallets-filter")).toBeTruthy();
		expect(within(secondary).getByText("Filter dompet")).toBeTruthy();
	});

	it("shows the loading indicator while wallets are loading in simple mode", async () => {
		renderWallets();

		expect(screen.getByTestId("wallets-loading")).toBeTruthy();

		await screen.findByTestId("wallet-card-wallet-personal");
	});

	it("shows the load error in simple mode", async () => {
		mockListWallets.mockRejectedValue(new Error("network down"));
		renderWallets();

		const error = await screen.findByTestId("wallets-error");
		expect(within(error).getByText("Gagal memuat dompet")).toBeTruthy();
	});

	it("shows the empty state in simple mode", async () => {
		mockListWallets.mockResolvedValue([]);
		renderWallets();

		const empty = await screen.findByTestId("wallets-empty");
		expect(within(empty).getByText("Belum ada dompet untuk dikelola.")).toBeTruthy();
	});

	it("scrolls the create form into view when it opens in simple mode", async () => {
		const scrollSpy = jest.spyOn(ScrollView.prototype, "scrollToEnd");
		renderWallets();

		await screen.findByTestId("wallet-card-wallet-personal");
		expect(scrollSpy).not.toHaveBeenCalled();

		fireEvent.press(screen.getByTestId("wallets-add-cta"));

		await waitFor(() =>
			expect(scrollSpy).toHaveBeenCalledWith({ animated: true }),
		);
	});

	it("scrolls the edit form into view when a card edit opens in simple mode", async () => {
		const scrollSpy = jest.spyOn(ScrollView.prototype, "scrollToEnd");
		renderWallets();

		await screen.findByTestId("wallet-card-wallet-family");
		expect(scrollSpy).not.toHaveBeenCalled();

		fireEvent.press(screen.getByTestId("wallet-edit-wallet-family"));

		await waitFor(() =>
			expect(scrollSpy).toHaveBeenCalledWith({ animated: true }),
		);
	});

	it("does not scroll when a wallet form opens outside simple mode", async () => {
		disableSimpleNavigation();
		const scrollSpy = jest.spyOn(ScrollView.prototype, "scrollToEnd");
		renderWallets();

		await screen.findByTestId("wallet-card-wallet-personal");
		fireEvent.press(screen.getByTestId("wallets-create-toggle"));
		await screen.findByTestId("wallet-create-form");

		expect(scrollSpy).not.toHaveBeenCalled();
	});
});
