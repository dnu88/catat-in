import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockListWallets = jest.fn();
const mockPreviewImportStatement = jest.fn();
const mockConfirmImportStatement = jest.fn();
const mockGetDocumentAsync = jest.fn();
let mockActiveContext: any = { type: "personal" };
let mockCanCreate = true;

jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush, back: jest.fn() }),
	useFocusEffect: (callback: () => void) => {
		const React = require("react");
		React.useEffect(() => callback(), [callback]);
	},
}));

jest.mock("expo-document-picker", () => ({
	getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

jest.mock("../src/lib/supabase", () => ({
	useSupabase: () => ({ supabase: { auth: {} } }),
}));

jest.mock("../src/theme/theme-context", () => ({
	useTheme: () => ({
		theme: {
			mode: "light",
			colors: {
				background: "#fff",
				surface: "#f8f8f8",
				textPrimary: "#111",
				textSecondary: "#555",
				textMuted: "#777",
				textInverse: "#fff",
				brandPrimary: "#3f6212",
				borderSoft: "#ddd",
				danger: "#991b1b",
				success: "#166534",
			},
		},
	}),
}));

jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockActiveContext,
		canCreate: mockCanCreate,
	}),
}));

jest.mock("../src/services/wallets", () => ({
	listWallets: (...args: unknown[]) => mockListWallets(...args),
}));

jest.mock("../src/services/import-statements", () => {
	const actual = jest.requireActual("../src/services/import-statements");
	return {
		...actual,
		previewImportStatement: (...args: unknown[]) => mockPreviewImportStatement(...args),
		confirmImportStatement: (...args: unknown[]) => mockConfirmImportStatement(...args),
	};
});

import ImportsScreen from "../app/(tabs)/imports";

function renderImports() {
	return render(<ImportsScreen />);
}

describe("imports screen", () => {
	beforeEach(() => {
		(globalThis as any).__KASWISE_FEATURE_FLAGS__ = { importStatement: false };
		mockPush.mockClear();
		mockListWallets.mockReset();
		mockPreviewImportStatement.mockReset();
		mockConfirmImportStatement.mockReset();
		mockGetDocumentAsync.mockReset();
		mockActiveContext = { type: "personal" };
		mockCanCreate = true;
		(globalThis as any).fetch = jest.fn(async () => ({ ok: true, blob: async () => new Blob(["csv"], { type: "text/csv" }) }));
		mockListWallets.mockResolvedValue([
			{
				id: "wallet-1",
				name: "BCA Payroll",
				type: "bank",
				balance: 0,
				currency: "IDR",
				user_id: "user-1",
				household_id: null,
				created_by: null,
				updated_by: null,
				is_active: true,
				created_at: "2026-07-01",
				updated_at: "2026-07-01",
			},
		]);
	});

	it("renders a safe disabled state when the feature flag is off", () => {
		renderImports();

		expect(screen.getByText("Import Rekening Koran")).toBeTruthy();
		expect(screen.getByText(/Fitur sedang disiapkan/i)).toBeTruthy();
		expect(screen.queryByTestId("imports-choose-file")).toBeNull();

		fireEvent.press(screen.getByTestId("imports-back-to-capture"));
		expect(mockPush).toHaveBeenCalledWith("/(tabs)/capture");
	});

	it("loads wallets and lets canary users choose bank and file", async () => {
		(globalThis as any).__KASWISE_FEATURE_FLAGS__.importStatement = true;
		mockGetDocumentAsync.mockResolvedValue({
			canceled: false,
			assets: [{ uri: "file://statement.csv", name: "statement.csv", mimeType: "text/csv", size: 100 }],
		});
		renderImports();

		await waitFor(() => expect(mockListWallets).toHaveBeenCalledWith({ type: "personal" }));
		expect(screen.getByTestId("imports-wallet-wallet-1")).toBeTruthy();

		fireEvent.press(screen.getByTestId("imports-bank-mandiri"));
		fireEvent.press(screen.getByTestId("imports-choose-file"));

		await waitFor(() => expect(screen.getByText("statement.csv")).toBeTruthy());
	});

	it("previews transactions and confirms only new rows", async () => {
		(globalThis as any).__KASWISE_FEATURE_FLAGS__.importStatement = true;
		mockGetDocumentAsync.mockResolvedValue({
			canceled: false,
			assets: [{ uri: "file://statement.csv", name: "statement.csv", mimeType: "text/csv", size: 100 }],
		});
		mockPreviewImportStatement.mockResolvedValue({
			transactions: [
				{
					date: "2026-07-01",
					description: "Transfer Gaji",
					type: "income",
					amount: 5000000,
					category: "other",
					hash: "0123456789abcdef0123456789abcdef",
					is_duplicate: false,
					row_number: 1,
				},
			],
			duplicates: [
				{
					date: "2026-07-02",
					description: "Kopi",
					type: "expense",
					amount: 35000,
					category: "other",
					hash: "fedcba9876543210fedcba9876543210",
					is_duplicate: true,
					row_number: 2,
				},
			],
			errors: [{ row: 3, reason: "Format tanggal tidak valid" }],
			total_rows: 3,
			imported: 1,
			skipped_months: 0,
			bank_name: "BCA",
		});
		mockConfirmImportStatement.mockResolvedValue({
			success: true,
			imported: 1,
			skipped_duplicates: 1,
			message: "Berhasil mengimpor 1 transaksi.",
		});

		renderImports();
		await waitFor(() => expect(screen.getByTestId("imports-wallet-wallet-1")).toBeTruthy());
		fireEvent.press(screen.getByTestId("imports-choose-file"));
		await waitFor(() => expect(screen.getByText("statement.csv")).toBeTruthy());
		fireEvent.press(screen.getByTestId("imports-preview-submit"));

		await waitFor(() => expect(screen.getByTestId("imports-preview-result")).toBeTruthy());
		expect(screen.getByText("Transfer Gaji")).toBeTruthy();
		expect(screen.getByText(/1 duplikat akan dilewati/i)).toBeTruthy();
		expect(screen.getByText(/Baris 3/i)).toBeTruthy();

		fireEvent.press(screen.getByTestId("imports-confirm-submit"));
		await waitFor(() => expect(screen.getByTestId("imports-confirm-result")).toBeTruthy());
		expect(mockConfirmImportStatement).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
			wallet_id: "wallet-1",
			transactions: [expect.objectContaining({ description: "Transfer Gaji" })],
			context_type: "personal",
			household_id: null,
		}));
	});

	it("sends household context when confirming in household mode", async () => {
		(globalThis as any).__KASWISE_FEATURE_FLAGS__.importStatement = true;
		mockActiveContext = { type: "household", householdId: "household-1", role: "admin" };
		mockGetDocumentAsync.mockResolvedValue({
			canceled: false,
			assets: [{ uri: "file://statement.csv", name: "statement.csv", mimeType: "text/csv", size: 100 }],
		});
		mockPreviewImportStatement.mockResolvedValue({
			transactions: [{ date: "2026-07-01", description: "Belanja", type: "expense", amount: 100000, category: "other", hash: "0123456789abcdef0123456789abcdef", is_duplicate: false, row_number: 1 }],
			duplicates: [],
			errors: [],
			total_rows: 1,
			imported: 1,
			skipped_months: 0,
			bank_name: "BCA",
		});
		mockConfirmImportStatement.mockResolvedValue({ success: true, imported: 1, skipped_duplicates: 0, message: "OK" });

		renderImports();
		fireEvent.press(await screen.findByTestId("imports-choose-file"));
		await waitFor(() => expect(screen.getByText("statement.csv")).toBeTruthy());
		fireEvent.press(screen.getByTestId("imports-preview-submit"));
		await waitFor(() => expect(screen.getByTestId("imports-preview-result")).toBeTruthy());
		fireEvent.press(screen.getByTestId("imports-confirm-submit"));

		await waitFor(() => expect(mockConfirmImportStatement).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
			context_type: "household",
			household_id: "household-1",
		})));
	});
});
