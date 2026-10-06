import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockListWallets = jest.fn();
const mockPreviewImportStatement = jest.fn();
const mockConfirmImportStatement = jest.fn();
const mockGetDocumentAsync = jest.fn();
let mockActiveContext: any = { type: "personal" };
let mockCanCreate = true;
let mockLanguage: 'id' | 'en' = 'id';
jest.mock('../src/i18n/i18n-context', () => ({ useI18n: () => ({ language: mockLanguage }) }));

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
        mockLanguage = 'id';
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

		expect(screen.getByText("Impor rekening koran")).toBeTruthy();
		expect(screen.getByText(/Impor belum tersedia/i)).toBeTruthy();
		expect(screen.queryByTestId("imports-choose-file")).toBeNull();

		fireEvent.press(screen.getByTestId("imports-back-to-capture"));
		expect(mockPush).toHaveBeenCalledWith("/(tabs)/capture");
	});

	it("loads wallets and lets canary users choose CSV/XLSX/PDF files", async () => {
		(globalThis as any).__KASWISE_FEATURE_FLAGS__.importStatement = true;
		mockGetDocumentAsync.mockResolvedValue({
			canceled: false,
			assets: [{ uri: "file://statement.pdf", name: "statement.pdf", mimeType: "application/pdf", size: 100 }],
		});
		renderImports();

		await waitFor(() => expect(mockListWallets).toHaveBeenCalledWith({ type: "personal" }));
		expect(screen.getByTestId("imports-wallet-wallet-1")).toBeTruthy();

		fireEvent.press(screen.getByTestId("imports-bank-mandiri"));
		fireEvent.press(screen.getByTestId("imports-choose-file"));

		await waitFor(() => expect(screen.getByText("statement.pdf")).toBeTruthy());
		expect(mockGetDocumentAsync).toHaveBeenCalledWith(expect.objectContaining({
			type: expect.arrayContaining(["application/pdf"]),
		}));
	});

	it("rejects unsupported file extensions before preview", async () => {
		(globalThis as any).__KASWISE_FEATURE_FLAGS__.importStatement = true;
		mockGetDocumentAsync.mockResolvedValue({
			canceled: false,
			assets: [{ uri: "file://statement.txt", name: "statement.txt", mimeType: "text/plain", size: 100 }],
		});

		renderImports();
		await waitFor(() => expect(screen.getByTestId("imports-wallet-wallet-1")).toBeTruthy());
		fireEvent.press(screen.getByTestId("imports-choose-file"));

		await waitFor(() => expect(screen.getByText(/Gunakan file CSV, XLSX, atau PDF/i)).toBeTruthy());
		expect(mockPreviewImportStatement).not.toHaveBeenCalled();
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
  it.each(['id', 'en'] as const)('localizes disabled and active labels in %s', async (language) => {
    mockLanguage = language;
    const view = renderImports();
    expect(screen.getByText(language === 'id' ? 'Kembali ke Catat' : 'Back to Add transaction')).toBeTruthy();
    expect(screen.queryByText(/live|bertahap|rollout/i)).toBeNull();
    view.unmount();
    (globalThis as any).__KASWISE_FEATURE_FLAGS__.importStatement = true;
    renderImports();
    await screen.findByTestId('imports-wallet-wallet-1');
    expect(screen.getByText(language === 'id' ? '1. Pilih dompet tujuan' : '1. Choose destination wallet')).toBeTruthy();
    expect(screen.getByText(language === 'id' ? 'Pratinjau impor' : 'Preview import')).toBeTruthy();
    fireEvent.press(screen.getByTestId('imports-preview-submit'));
    expect(screen.getByText(language === 'id' ? 'Pilih file rekening koran terlebih dahulu.' : 'Choose a statement file first.')).toBeTruthy();
  });
  it('localizes preview, server row errors, and confirmation without changing the payload', async () => {
    mockLanguage = 'en';
    (globalThis as any).__KASWISE_FEATURE_FLAGS__.importStatement = true;
    mockGetDocumentAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file://statement.csv', name: 'statement.csv', size: 100 }] });
    const transactions = [{ date: '2026-07-01', description: 'Lunch', type: 'expense', amount: 35000, hash: 'abc' }];
    mockPreviewImportStatement.mockResolvedValue({ transactions, duplicates: [{}], errors: [{ row: 3, reason: 'Format tanggal tidak valid' }], total_rows: 3, skipped_months: 2, bank_name: 'BCA' });
    mockConfirmImportStatement.mockResolvedValue({ success: true, imported: 1, skipped_duplicates: 1, message: 'Berhasil mengimpor 1 transaksi.' });
    renderImports();
    await screen.findByTestId('imports-wallet-wallet-1');
    fireEvent.press(screen.getByTestId('imports-choose-file'));
    await screen.findByText('statement.csv');
    fireEvent.press(screen.getByTestId('imports-preview-submit'));
    await screen.findByTestId('imports-preview-result');
    expect(screen.getByText('Total rows')).toBeTruthy();
    expect(screen.getByText(/Expense/)).toBeTruthy();
    expect(screen.getByText('Row 3: Invalid date format')).toBeTruthy();
    expect(screen.getByText('2 rows outside the free plan period were skipped.')).toBeTruthy();
    fireEvent.press(screen.getByText('Confirm import'));
    await screen.findByText('Import complete.');
    expect(screen.getByText('1 transaction imported, 1 duplicate skipped.')).toBeTruthy();
    expect(screen.queryByText(/Berhasil mengimpor/)).toBeNull();
    expect(mockConfirmImportStatement).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ transactions, skip_duplicates: true, wallet_id: 'wallet-1', context_type: 'personal', household_id: null }));
  });

  it.each(['id', 'en'] as const)('localizes loading, picker failure, and file validation in %s', async (language) => {
    mockLanguage = language;
    (globalThis as any).__KASWISE_FEATURE_FLAGS__.importStatement = true;
    let finish!: (rows: unknown[]) => void;
    mockListWallets.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    renderImports();
    expect(screen.getByLabelText(language === 'id' ? 'Memuat dompet' : 'Loading wallets')).toBeTruthy();
    const { act } = require('@testing-library/react-native');
    await act(async () => finish([]));
    expect(screen.getByText(language === 'id' ? 'Belum ada dompet aktif. Buat dompet terlebih dahulu sebelum mengimpor.' : 'No active wallets. Create a wallet before importing.')).toBeTruthy();
    mockGetDocumentAsync.mockRejectedValueOnce(new Error('native picker internal'));
    fireEvent.press(screen.getByTestId('imports-choose-file'));
    await screen.findByText(language === 'id' ? 'File belum bisa dipilih. Coba lagi.' : 'The file could not be selected. Try again.');
    expect(screen.queryByText('native picker internal')).toBeNull();
    mockGetDocumentAsync.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file://large.csv', name: 'large.csv', size: 6000000 }] });
    fireEvent.press(screen.getByTestId('imports-choose-file'));
    await screen.findByText(language === 'id' ? 'File terlalu besar. Maksimal 5MB.' : 'File is too large. Maximum 5MB.');
    expect(mockPreviewImportStatement).not.toHaveBeenCalled();
  });

});
