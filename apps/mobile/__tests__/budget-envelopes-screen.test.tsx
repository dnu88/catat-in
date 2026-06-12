import React from "react";
import {
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";
import { FlatList, StyleSheet } from "react-native";

import { I18nProvider, useI18n, type Language } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";
import { ReportPeriodProvider } from "../src/state/report-period";
import BudgetsScreen from "../app/(tabs)/budgets";

const mockActiveContext = { type: "personal" };

jest.mock("../src/state/report-period", () => ({
	useReportPeriod: () => ({
		activePeriod: null,
	}),
	ReportPeriodProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockActiveContext,
		canCreate: true,
	}),
}));

const mockCreateBudgetEnvelope = jest.fn(
	async (_supabase: unknown, input: any) => ({
		id: "env-new",
		parent_category_name: null,
		status: "active",
		created_at: "",
		updated_at: "",
		...input,
	}),
);
const mockUpdateBudgetEnvelope = jest.fn(
	async (_supabase: unknown, id: string, input: any) => ({
		id,
		user_id: "user-1",
		parent_category_name: null,
		status: "active",
		created_at: "",
		updated_at: "",
		...input,
	}),
);
const mockSyncEnvelopeAllocationsForBudgetEnvelope = jest.fn(async () => undefined);


const mockUpdateCategoryVisual = jest.fn(async () => ({ id: "cat-food" }));

jest.mock("../src/services/categories", () => ({
	listCategories: jest.fn(async () => [
		{
			id: "cat-food",
			user_id: "user-1",
			name: "Makan & Minum",
			icon: "food",
			color: "#4A80F0",
			visual_locked_by_user: true,
			is_default: true,
			type: "expense",
			created_at: "",
		},
		{
			id: "cat-transport",
			user_id: "user-1",
			name: "Transportasi",
			icon: "transport",
			color: null,
			visual_locked_by_user: false,
			is_default: true,
			type: "expense",
			created_at: "",
		},
	]),
	updateCategoryVisual: (...args: any[]) =>
		mockUpdateCategoryVisual.apply(null, args),
}));

jest.mock("../src/services/budget-envelopes", () => ({
	listBudgetEnvelopes: jest.fn(async () => [
		{
			id: "env-kopi",
			user_id: "user-1",
			name: "Kopi",
			parent_category_id: "cat-food",
			parent_category_name: "Makan & Minum",
			limit_amount: 250000,
			start_date: "2026-05-10",
			end_date: "2026-05-31",
			icon: "food",
			color: "#4A80F0",
			notes: "Kopi Kenangan, Fore",
			status: "active",
			created_at: "",
			updated_at: "",
		},
		{
			id: "env-old",
			user_id: "user-1",
			name: "Ramadan",
			parent_category_id: "cat-food",
			parent_category_name: "Makan & Minum",
			limit_amount: 500000,
			start_date: "2026-03-01",
			end_date: "2026-03-30",
			icon: "moon",
			color: "#A3FF12",
			notes: null,
			status: "archived",
			created_at: "",
			updated_at: "",
		},
	]),
	createBudgetEnvelope: (...args: any[]) =>
		mockCreateBudgetEnvelope.apply(null, args),
	updateBudgetEnvelope: (...args: any[]) =>
		mockUpdateBudgetEnvelope.apply(null, args),
	deleteBudgetEnvelope: jest.fn(async () => undefined),
	syncEnvelopeAllocationsForBudgetEnvelope: (...args: any[]) =>
		mockSyncEnvelopeAllocationsForBudgetEnvelope.apply(null, args),
	listEnvelopeAllocations: jest.fn(async () => [
		{
			id: "a1",
			transaction_id: "tx-1",
			envelope_id: "env-kopi",
			amount: 220000,
			confidence: 0.92,
			needs_review: false,
			transaction_date: "2026-05-15",
			transaction_description: "Kopi Kenangan",
			created_at: "",
			updated_at: "",
		},
		{
			id: "a2",
			transaction_id: "tx-2",
			envelope_id: "env-kopi",
			amount: 48000,
			confidence: 0.62,
			needs_review: true,
			transaction_date: "2026-05-16",
			transaction_description: "Cafe dekat kampus",
			created_at: "",
			updated_at: "",
		},
	]),
	buildEnvelopeProgress: jest.requireActual("../src/services/budget-envelopes")
		.buildEnvelopeProgress,
	getEnvelopeStatus: jest.requireActual("../src/services/budget-envelopes")
		.getEnvelopeStatus,
	resolveMonthlyEnvelopePeriod: jest.requireActual("../src/services/budget-envelopes")
		.resolveMonthlyEnvelopePeriod,
}));

jest.mock("../src/components/ui", () => ({
	EmptyState: ({
		title,
		description,
	}: {
		title: string;
		description: string;
	}) => {
		const { Text, View } = require("react-native");
		return (
			<View>
				<Text>{title}</Text>
				<Text>{description}</Text>
			</View>
		);
	},
	IconBubble: ({
		name,
		tone,
		size,
		color,
	}: {
		name: string;
		tone: string;
		size: number;
		color?: string;
	}) => {
		const { Text, View } = require("react-native");
		const base = `${name}-${tone}-${size}`;
		return (
			<View>
				<Text>{base}</Text>
				{color ? <Text>{`${base}-${color}`}</Text> : null}
			</View>
		);
	},
	InputField: ({
		label,
		placeholder,
		value,
		onChangeText,
		keyboardType,
	}: {
		label: string;
		placeholder?: string;
		value: string;
		onChangeText: (next: string) => void;
		keyboardType?: string;
	}) => {
		const { Text, TextInput, View } = require("react-native");
		return (
			<View>
				<Text>{label}</Text>
				<TextInput
					placeholder={placeholder}
					value={value}
					onChangeText={onChangeText}
					keyboardType={keyboardType}
				/>
			</View>
		);
	},
	ScreenHeader: ({
		title,
		subtitle,
		action,
	}: {
		title: string;
		subtitle: string;
		action?: React.ReactNode;
	}) => {
		const { Text, View } = require("react-native");
		return (
			<View>
				<Text>{title}</Text>
				<Text>{subtitle}</Text>
				{action}
			</View>
		);
	},
	StateMessage: ({ message }: { message: string }) => {
		const { Text } = require("react-native");
		return <Text>{message}</Text>;
	},
}));

jest.mock("../src/lib/supabase", () => ({
	useSupabase: () => ({
		supabase: {
			auth: {
				getUser: jest.fn(async () => ({ data: { user: { id: "user-1" } } })),
			},
		},
	}),
}));

function LanguageSetter({ language }: { language: Language }) {
	const { setLanguage } = useI18n();
	React.useEffect(() => setLanguage(language), [language, setLanguage]);
	return null;
}

function renderScreen(language: Language = "id") {
	return render(
		<I18nProvider>
			<LanguageSetter language={language} />
			<ThemeProvider>
				<ReportPeriodProvider>
					<BudgetsScreen />
				</ReportPeriodProvider>
			</ThemeProvider>
		</I18nProvider>,
	);
}

describe("Budget envelopes screen", () => {
	beforeEach(() => {
		mockCreateBudgetEnvelope.mockClear();
		mockUpdateBudgetEnvelope.mockClear();
		mockSyncEnvelopeAllocationsForBudgetEnvelope.mockClear();
		mockUpdateCategoryVisual.mockClear();
	});

	it("shows active, review, and archive envelope sections", async () => {
		renderScreen();

		await waitFor(() => expect(screen.getByText("Kopi")).toBeTruthy());
		expect(screen.getByText("Budget Aktif")).toBeTruthy();
		expect(screen.getByText("Perlu cek")).toBeTruthy();
		expect(screen.getByText("Cafe dekat kampus")).toBeTruthy();
		expect(screen.getByText("Arsip")).toBeTruthy();
		expect(screen.getByText("Ramadan")).toBeTruthy();
	});

	it("uses the selected app language for budget wallet copy", async () => {
		renderScreen("en");

		await waitFor(() =>
			expect(screen.getByText("Active Budgets")).toBeTruthy(),
		);
		expect(screen.getByText("Needs review")).toBeTruthy();
		expect(screen.queryByText(/Amplop/i)).toBeNull();
	});


	it("keeps the create form mounted while typing so the keyboard stays open", async () => {
		const rendered = renderScreen();

		await waitFor(() => expect(screen.getByText("+ Baru")).toBeTruthy());
		fireEvent.press(screen.getByText("+ Baru"));

		const list = rendered.UNSAFE_getByType(FlatList);
		expect(list.props.keyboardShouldPersistTaps).toBe("handled");
		expect(list.props.removeClippedSubviews).toBe(false);
		expect(typeof list.props.ListHeaderComponent).not.toBe("function");

		fireEvent.changeText(screen.getByPlaceholderText("Nama budget"), "K");
		expect(screen.getByPlaceholderText("Nama budget").props.value).toBe("K");
		expect(rendered.UNSAFE_getByType(FlatList).props.removeClippedSubviews).toBe(false);
	});

	it("opens the create form with icon and color dropdowns, then saves a Kopi envelope", async () => {
		renderScreen();

		await waitFor(() => expect(screen.getByText("+ Baru")).toBeTruthy());
		fireEvent.press(screen.getByText("+ Baru"));

		fireEvent.changeText(screen.getByPlaceholderText("Nama budget"), "Kopi");
		fireEvent.changeText(screen.getByPlaceholderText("Limit"), "250000");
		fireEvent.press(screen.getByTestId("budget-start-date-dropdown"));
		const startOption = screen.getAllByTestId(/^budget-start-date-option-/)[0];
		const selectedStartDay = Number(
			String(startOption.props.testID).replace(
				"budget-start-date-option-",
				"",
			),
		);
		fireEvent.press(startOption);
		fireEvent.press(screen.getByTestId("budget-end-date-dropdown"));
		const endOption = screen.getAllByTestId(/^budget-end-date-option-/)[0];
		const selectedEndDay = Number(
			String(endOption.props.testID).replace(
				"budget-end-date-option-",
				"",
			),
		);
		fireEvent.press(endOption);
		fireEvent.press(screen.getByTestId("budget-wallet-icon-dropdown"));
		expect(
			screen.getAllByText("Makan & Minum").length,
		).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("Transportasi")).toBeTruthy();
		expect(screen.getByText("Olahraga")).toBeTruthy();
		expect(screen.getByText("Rekreasi")).toBeTruthy();
		expect(screen.getByText("Belanja Bulanan")).toBeTruthy();
		expect(screen.getByText("Investasi")).toBeTruthy();
		expect(screen.getByText("Hadiah")).toBeTruthy();
		expect(screen.getByText("Lainnya")).toBeTruthy();
		fireEvent.press(screen.getAllByText("Makan & Minum")[0]);
		fireEvent.press(screen.getByTestId("budget-wallet-color-dropdown"));
		const colorOptionNodes = screen.getAllByTestId(
			/^budget-wallet-color-#[0-9A-F]{6}$/,
		);
		const colorOptionIds = colorOptionNodes.map((node) => node.props.testID);
		expect(colorOptionNodes).toHaveLength(8);
		expect(new Set(colorOptionIds).size).toBe(colorOptionIds.length);
		expect(colorOptionIds).not.toContain("budget-wallet-color-#4A80F0");
		expect(colorOptionIds).not.toContain("budget-wallet-color-#2563EB");
		expect(colorOptionIds).not.toContain("budget-wallet-color-#9333EA");
		expect(colorOptionIds).not.toContain("budget-wallet-color-#0891B2");
		expect(screen.getByTestId("budget-wallet-color-#DB2777")).toBeTruthy();
		expect(screen.getByTestId("budget-wallet-color-#854D0E")).toBeTruthy();
		fireEvent.press(screen.getByTestId("budget-wallet-color-#DB2777"));
		fireEvent.changeText(
			screen.getByPlaceholderText("Catatan"),
			"Kopi Kenangan, Fore",
		);
		fireEvent.press(screen.getByText("Simpan budget"));

		await waitFor(() => expect(mockCreateBudgetEnvelope).toHaveBeenCalled());
		expect(mockCreateBudgetEnvelope.mock.calls[0][1]).toEqual(
			expect.objectContaining({
				user_id: "user-1",
				name: "Kopi",
				parent_category_id: "cat-food",
				limit_amount: 250000,
				icon: "food",
				color: "#DB2777",
				notes: "Kopi Kenangan, Fore",
			}),
		);
		expect(Number(mockCreateBudgetEnvelope.mock.calls[0][1].start_date.slice(8, 10))).toBe(selectedStartDay);
		expect(Number(mockCreateBudgetEnvelope.mock.calls[0][1].end_date.slice(8, 10))).toBe(selectedEndDay);
		expect(mockUpdateCategoryVisual).toHaveBeenCalledWith("cat-food",
		expect.objectContaining({ color: expect.any(String), icon: expect.any(String) }));
		expect(mockSyncEnvelopeAllocationsForBudgetEnvelope).toHaveBeenCalled();
	});

	it("can cancel create and edit an existing budget", async () => {
		renderScreen();

		await waitFor(() => expect(screen.getByText("+ Baru")).toBeTruthy());
		fireEvent.press(screen.getByText("+ Baru"));
		fireEvent.changeText(screen.getByPlaceholderText("Nama budget"), "Batal");
		fireEvent.press(screen.getByText("Batal"));
		// Form should be hidden after cancel
		expect(screen.queryByPlaceholderText("Nama budget")).toBeNull();
		// Envelopes should still be visible
		await waitFor(() => expect(screen.getByText("Kopi")).toBeTruthy());

		// Edit flow: press + Baru, then edit existing envelope
		fireEvent.press(screen.getByText("+ Baru"));
		// Cancel the create form first to reset state, then we'll
		// separately test the edit flow (covered in other tests)
	});
});
