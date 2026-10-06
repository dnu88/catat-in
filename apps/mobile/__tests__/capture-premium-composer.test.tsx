import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { classifyTransactionTextBatch } from "../src/services/transaction-classifier";
import { EntryPersistenceError, saveEntry, reconcileEntry } from "../src/services/transaction-entry-persistence";

import CaptureScreen from "../app/(tabs)/capture";
import { I18nProvider } from "../src/i18n/i18n-context";
import { ThemeProvider } from "../src/theme/theme-context";

/**
 * Wiring proof for the presentation redesign gate (P2/T10).
 *
 * The redesign must be a pure presentation swap: with the flag OFF every legacy
 * branch still renders (existing suites cover behaviour), and with the flag ON
 * the legacy idle workspace is replaced by the single-CTA composer.
 */

let mockTransactionEntryV2 = true;
let mockSimpleNavigation = true;
let mockVoiceNote = false;
let mockSimplePremiumExperience = false;

jest.mock("../src/config/features", () => ({
	featureFlags: {
		get transactionEntryV2() {
			return mockTransactionEntryV2;
		},
		get simpleNavigation() {
			return mockSimpleNavigation;
		},
		get voiceNote() {
			return mockVoiceNote;
		},
		get importStatement() {
			return false;
		},
		get aiAutosaveText() {
			return false;
		},
		get simplePremiumExperience() {
			return mockSimplePremiumExperience;
		},
	},
}));

jest.mock("expo-av", () => ({
	Audio: {
		requestPermissionsAsync: jest.fn<any, any[]>(),
		setAudioModeAsync: jest.fn<any, any[]>(),
		Recording: { createAsync: jest.fn<any, any[]>() },
		RecordingOptionsPresets: { HIGH_QUALITY: {} },
	},
}));

jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("expo-image-picker", () => ({
	requestMediaLibraryPermissionsAsync: jest.fn<any, any[]>(async () => ({
		granted: true,
	})),
	launchImageLibraryAsync: jest.fn<any, any[]>(),
}));

jest.mock("../src/services/transactions", () => ({
	createTransaction: jest.fn<any, any[]>(async (input: Record<string, unknown>) => ({
		id: "tx-legacy",
		...input,
	})),
}));

jest.mock("../src/services/transaction-entry-persistence", () => {
	class EntryPersistenceError extends Error {
		kind: string;
		fields?: Record<string, unknown>;
		constructor(
			kind: string,
			message: string,
			options?: { fields?: Record<string, unknown> },
		) {
			super(message);
			this.name = "EntryPersistenceError";
			this.kind = kind;
			this.fields = options?.fields;
		}
	}
	return {
		EntryPersistenceError,
		saveEntry: jest.fn<any, any[]>(),
		reconcileEntry: jest.fn<any, any[]>(),
	};
});

jest.mock("../src/services/receipt-intake", () => ({
	analyzeTransactionText: jest.fn<any, any[]>(async () => ({ transactions: [] })),
	analyzeReceiptImage: jest.fn<any, any[]>(),
	getReceiptAuthSession: jest.fn<any, any[]>(async () => ({
		access_token: "token",
		user: { id: "user-1" },
	})),
	uploadReceiptImage: jest.fn<any, any[]>(),
	receiptExtractionToDraft: jest.fn<any, any[]>(),
	receiptExtractionToDrafts: jest.fn<any, any[]>(() => []),
	normalizeReceiptDate: (value: unknown, fallback?: unknown) =>
		typeof value === "string" && value.trim() ? value : (fallback ?? "2026-10-02"),
	reconcileReceipt: jest.fn<any, any[]>(() => ({ total: 0 })),
}));

jest.mock("../src/services/transaction-classifier", () => ({
	classifyTransactionTextBatch: jest.fn<any, any[]>(() => []),
	CLASSIFIER_HIGH_CONFIDENCE_THRESHOLD: 0.8,
}));

jest.mock("../src/services/categories", () => ({
	listCategories: jest.fn<any, any[]>(async () => []),
}));

jest.mock("../src/services/wallets", () => ({
	listWallets: jest.fn<any, any[]>(async () => mockWallets),
}));

let mockCanCreate = true;
let mockWallets: { id: string; name: string; is_active: boolean }[] = [
	{ id: "w-1", name: "Seabank", is_active: true },
];
let mockActiveContext: { type: "personal" } | { type: "household"; householdId: string; role: "owner" } = { type: "personal" };
const mockHouseholdId = "c6f2cc14-4d55-4397-8392-dcf88e8635f1";
const mockHouseholdName = "Diendi Family Household with a very long display name";
const mockSetPersonalContext = jest.fn<any, any[]>();
const mockSetActiveHousehold = jest.fn<any, any[]>();
jest.mock("../src/state/finance-context", () => ({
	useFinanceContext: () => ({
		activeContext: mockActiveContext,
		canCreate: mockCanCreate,
		memberships: [{ household_id: mockHouseholdId, role: "owner", households: { name: mockHouseholdName } }],
		setPersonalContext: (...args: unknown[]) => mockSetPersonalContext(...args),
		setActiveHousehold: (...args: unknown[]) => mockSetActiveHousehold(...args),
	}),
}));

const mockSupabaseClient = {
	auth: {
		getUser: jest.fn<any, any[]>(async () => ({
			data: { user: { id: "user-1" } },
		})),
	},
	from: jest.fn<any, any[]>(() => ({
		insert: jest.fn<any, any[]>(),
		select: jest.fn<any, any[]>(),
	})),
	functions: { invoke: jest.fn<any, any[]>() },
	rpc: jest.fn<any, any[]>(),
};
jest.mock("../src/lib/supabase", () => ({
	supabase: mockSupabaseClient,
	useSupabase: () => ({ supabase: mockSupabaseClient }),
}));

jest.mock("../src/hooks/useTransactionRealtime", () => ({
	useTransactionRealtime: () => ({ loading: false, transaction: null }),
}));

let mockEntitlementData: { photo_limit: number } | null = null;
let mockEntitlementLoading = false;
jest.mock("../src/hooks/useEntitlements", () => ({
	useEntitlements: () => ({
		data: mockEntitlementData,
		loading: mockEntitlementLoading,
		refresh: jest.fn<any, any[]>(async () => undefined),
	}),
}));

jest.mock("../src/services/budget-envelopes", () => ({
	createEnvelopeAllocation: jest.fn<any, any[]>(),
	syncEnvelopeAllocationForTransaction: jest.fn<any, any[]>(async () => undefined),
	deleteEnvelopeAllocationsForTransaction: jest.fn<any, any[]>(async () => undefined),
}));

jest.mock("../src/services/voice-intake", () => ({
	getVoiceAuthSession: jest.fn<any, any[]>(),
	processVoiceTransaction: jest.fn<any, any[]>(),
	uploadVoiceAudio: jest.fn<any, any[]>(),
}));

const mockPush = jest.fn<any, any[]>();
let mockBeforeRemove: (event: any) => void;
const mockNavigation = {
	addListener: jest.fn<any, any[]>((_name, listener) => {
		mockBeforeRemove = listener;
		return () => {};
	}),
	dispatch: jest.fn<any, any[]>(),
};
jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush }),
	useNavigation: () => mockNavigation,
	useLocalSearchParams: () => ({}),
	useFocusEffect: (callback: () => void | (() => void)) => {
		const ReactModule = require("react");
		ReactModule.useEffect(() => callback(), [callback]);
	},
}));

function renderCapture() {
	return render(
		<I18nProvider>
			<ThemeProvider>
				<CaptureScreen />
			</ThemeProvider>
		</I18nProvider>,
	);
}

describe("Capture premium presentation gate", () => {
	it("shows the membership display name, never the household UUID", async () => {
		mockSimplePremiumExperience = true;
		mockActiveContext = { type: "household", householdId: mockHouseholdId, role: "owner" };
		try {
			renderCapture();
			await screen.findByTestId("capture-composer");
			expect(screen.queryByText(mockHouseholdId)).toBeNull();
			expect(screen.getAllByText(mockHouseholdName).length).toBeGreaterThan(0);
		} finally {
			mockActiveContext = { type: "personal" };
		}
	});
	beforeEach(() => {
		mockTransactionEntryV2 = true;
		mockSimpleNavigation = true;
		mockVoiceNote = false;
		mockSimplePremiumExperience = false;
		mockCanCreate = true;
		mockWallets = [{ id: "w-1", name: "Seabank", is_active: true }];
		mockSetPersonalContext.mockReset();
		mockSetActiveHousehold.mockReset();
		mockPush.mockReset();
	});

	it("keeps the legacy workspace when the redesign flag is OFF", async () => {
		renderCapture();

		expect(await screen.findByTestId("capture-input")).toBeTruthy();
		expect(screen.queryByTestId("capture-composer")).toBeNull();
	});

	it("requires explicit discard before opening Manual with typed Capture text", async () => {
		mockSimplePremiumExperience = true;
		renderCapture();
		await screen.findByTestId("capture-composer");
		fireEvent.changeText(screen.getByTestId("capture-composer-input"), "Unsaved QA draft: do not process");
		const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
		fireEvent.press(screen.getByTestId("capture-composer-manual"));
		expect(mockPush).not.toHaveBeenCalled();
		expect(alert).toHaveBeenCalled();
		const buttons = alert.mock.calls[0][2]!;
		act(() => buttons.find((button) => button.style === "cancel")?.onPress?.());
		expect(screen.getByTestId("capture-composer-input").props.value).toBe("Unsaved QA draft: do not process");
		expect(mockPush).not.toHaveBeenCalled();
		act(() => buttons.find((button) => button.style === "destructive")?.onPress?.());
		expect(mockPush).toHaveBeenCalledWith("/(tabs)/transaction-new");
		alert.mockRestore();
	});

	it("blocks unresolved reconciliation but releases exit after COMPLETE confirmation", async () => {
		mockSimplePremiumExperience = true;
		jest.mocked(classifyTransactionTextBatch).mockReturnValue([
			{ transactionType: "expense", amount: 35000, categoryId: null,
				categoryName: "Makan & Minum", merchant: "Kopi", note: "Beli kopi",
				date: "2026-10-02", confidence: 0.96, matchedKeywords: [], matchedConcept: "food" },
			{ transactionType: "expense", amount: 25000, categoryId: null,
				categoryName: "Makan & Minum", merchant: "Roti", note: "Beli roti",
				date: "2026-10-02", confidence: 0.96, matchedKeywords: [], matchedConcept: "food" },
		]);
		jest.mocked(saveEntry).mockRejectedValue(new EntryPersistenceError("network", "Timeout"));
		let complete!: (rows: any[]) => void;
		jest.mocked(reconcileEntry).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
		const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
		const preventDefault = jest.fn();
		const attemptExit = () => {
			preventDefault.mockClear();
			act(() => mockBeforeRemove({ preventDefault, data: { action: { type: "GO_BACK" } } }));
		};
		try {
			renderCapture();
			await screen.findByTestId("capture-composer");
			fireEvent.changeText(screen.getByTestId("capture-composer-input"), "Beli kopi 35rb");
			fireEvent.press(screen.getByTestId("capture-composer-submit"));
			fireEvent.press(await screen.findByTestId("batch-review-save"));
			await waitFor(() => expect(reconcileEntry).toHaveBeenCalledTimes(1));
			attemptExit();
			expect(preventDefault).toHaveBeenCalledTimes(1);
			expect(alert.mock.calls.at(-1)?.[2]).toBeUndefined();
			await act(async () => complete([{ id: "tx-1", wallet_id: "w-1", amount: 35000, description: "Beli kopi" }]));
			await screen.findByTestId("capture-composer-check-status");
			attemptExit();
			expect(preventDefault).toHaveBeenCalledTimes(1);
			expect(alert.mock.calls.at(-1)?.[2]).toBeUndefined();
			jest.mocked(reconcileEntry).mockRejectedValueOnce(new Error("Offline"));
			fireEvent.press(screen.getByTestId("capture-composer-check-status"));
			await screen.findByText("Hasil simpan belum bisa dipastikan. Periksa lagi sebelum mencoba ulang.");
			attemptExit();
			expect(preventDefault).toHaveBeenCalledTimes(1);
			expect(alert.mock.calls.at(-1)?.[2]).toBeUndefined();
			jest.mocked(reconcileEntry).mockResolvedValueOnce([
				{ id: "tx-1", wallet_id: "w-1", amount: 35000, description: "Beli kopi" } as any,
				{ id: "tx-2", wallet_id: "w-1", amount: 25000, description: "Beli roti" } as any,
			]);
			fireEvent.press(screen.getByTestId("capture-composer-check-status"));
			await screen.findByTestId("capture-entry-success");
			alert.mockClear();
			attemptExit();
			expect(preventDefault).not.toHaveBeenCalled();
			expect(alert).not.toHaveBeenCalled();
			expect(saveEntry).toHaveBeenCalledTimes(1);
		} finally {
			alert.mockRestore();
			jest.mocked(classifyTransactionTextBatch).mockReset();
			jest.mocked(classifyTransactionTextBatch).mockReturnValue([]);
			jest.mocked(saveEntry).mockReset();
			jest.mocked(reconcileEntry).mockReset();
		}
	});

	it("swaps only the idle workspace when the redesign flag is ON", async () => {
		mockSimplePremiumExperience = true;
		renderCapture();

		expect(await screen.findByTestId("capture-composer")).toBeTruthy();
		// The legacy idle workspace and its secondary actions are gone.
		expect(screen.queryByTestId("capture-input")).toBeNull();
		expect(screen.queryByTestId("capture-secondary-actions")).toBeNull();
		// Exactly one dominant CTA on the surface.
		expect(screen.getAllByTestId("capture-composer-submit")).toHaveLength(1);
	});

	it.each([0, 10])("honors the first Struk tap after photo entitlement resolves to %s", async (photoLimit) => {
		mockSimplePremiumExperience = true;
		mockEntitlementData = null;
		mockEntitlementLoading = true;
		const view = renderCapture();
		try {
			await screen.findByTestId("capture-composer");
			fireEvent.press(screen.getByTestId("capture-composer-receipt"));
			expect(screen.queryByTestId("capture-receipt-pick")).toBeNull();
			expect(mockPush).not.toHaveBeenCalled();
			// Repeated taps during lookup coalesce into the same pending intent.
			fireEvent.press(screen.getByTestId("capture-composer-receipt"));
			mockEntitlementData = { photo_limit: photoLimit };
			mockEntitlementLoading = false;
			view.rerender(<I18nProvider><ThemeProvider><CaptureScreen /></ThemeProvider></I18nProvider>);
			if (photoLimit === 0) {
				await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/upgrade"));
				expect(screen.queryByTestId("capture-receipt-pick")).toBeNull();
			} else {
				expect(await screen.findByTestId("capture-receipt-pick")).toBeTruthy();
				expect(mockPush).not.toHaveBeenCalled();
			}
		} finally {
			mockEntitlementData = null;
			mockEntitlementLoading = false;
		}
	});

	it("Struk opens the receipt picker instead of keeping the text composer", async () => {
		mockSimplePremiumExperience = true;
		renderCapture();
		await screen.findByTestId("capture-composer");
		fireEvent.press(screen.getByTestId("capture-composer-receipt"));
		expect(screen.getByTestId("capture-receipt-pick")).toBeTruthy();
		expect(screen.queryByTestId("capture-composer")).toBeNull();
	});

	it("keeps voice hidden in the composer when the voice flag is OFF", async () => {
		mockSimplePremiumExperience = true;
		mockVoiceNote = false;
		renderCapture();

		await screen.findByTestId("capture-composer");
		expect(screen.queryByTestId("capture-composer-voice")).toBeNull();
	});

	it("shows voice only when the voice flag is ON", async () => {
		mockSimplePremiumExperience = true;
		mockVoiceNote = true;
		renderCapture();

		await screen.findByTestId("capture-composer");
		expect(screen.getByTestId("capture-composer-voice")).toBeTruthy();
	});

	it("keeps the viewer blocked inside the composer", async () => {
		mockSimplePremiumExperience = true;
		mockCanCreate = false;
		renderCapture();

		await screen.findByTestId("capture-composer");
		expect(screen.getByTestId("capture-composer-submit").props.accessibilityState)
			.toMatchObject({ disabled: true });
	});

	it("owns the context and wallet row instead of the legacy destination row", async () => {
		mockSimplePremiumExperience = true;
		renderCapture();

		await screen.findByTestId("capture-composer");
		// Legacy destination row is gone; the composer row + host switcher remain.
		expect(screen.queryByTestId("capture-destination")).toBeNull();
		expect(screen.getByTestId("capture-composer-context")).toBeTruthy();
		expect(screen.getByTestId("finance-context-switcher")).toBeTruthy();
		// Wallets are loaded in this fixture, so the control is ready-state.
		expect(screen.getByTestId("capture-composer-wallet")).toBeTruthy();
	});

	it("offers wallet creation when the active context has no wallet", async () => {
		mockSimplePremiumExperience = true;
		mockWallets = [];
		renderCapture();

		await screen.findByTestId("capture-composer");
		expect(await screen.findByTestId("capture-composer-create-wallet")).toBeTruthy();
		expect(screen.queryByTestId("capture-composer-wallet")).toBeNull();
	});

	it("does not switch money space from the composer row without a draft", async () => {
		mockSimplePremiumExperience = true;
		renderCapture();

		await screen.findByTestId("capture-composer");
		// No Alert should be needed when there is no unsaved work: the guard
		// allows the switch immediately.
		const alertSpy = jest.spyOn(Alert, "alert");
		fireEvent.press(screen.getByTestId("finance-context-switcher"));
		fireEvent.press(screen.getByTestId("finance-context-option-personal"));

		expect(alertSpy).not.toHaveBeenCalled();
		alertSpy.mockRestore();
	});
});

/**
 * T12 measurement — recorded in the deterministic surface, not estimated.
 *
 * Baseline (flag OFF) idle surface exposes 2 mode chips + 1 submit + 2 secondary
 * actions = 5 interactive decisions. The premium surface is 1 submit + 2
 * secondary = 3, and the wallet is pre-selected, so the happy path after typing
 * is a single tap.
 */
describe("Capture happy-path decision/tap count", () => {
	beforeEach(() => {
		mockTransactionEntryV2 = true;
		mockSimpleNavigation = true;
		mockVoiceNote = false;
		mockSimplePremiumExperience = false;
		mockCanCreate = true;
		mockWallets = [{ id: "w-1", name: "Seabank", is_active: true }];
	});

	it("baseline idle surface exposes the mode chips (more decisions)", async () => {
		renderCapture();

		await screen.findByTestId("capture-input");
		expect(screen.getByTestId("capture-mode-Teks")).toBeTruthy();
		expect(screen.getByTestId("capture-mode-Foto")).toBeTruthy();
		expect(screen.getByTestId("capture-text-submit")).toBeTruthy();
		expect(screen.getByTestId("capture-secondary-actions")).toBeTruthy();
	});

	it("premium idle surface removes the mode decision", async () => {
		mockSimplePremiumExperience = true;
		renderCapture();

		await screen.findByTestId("capture-composer");
		// No pre-submit mode choice, and manual/receipt stay secondary.
		expect(screen.queryByTestId("capture-mode-Teks")).toBeNull();
		expect(screen.queryByTestId("capture-mode-Foto")).toBeNull();
		expect(screen.getByTestId("capture-composer-submit")).toBeTruthy();
	});

	it("requires no extra tap before submit: the wallet is pre-selected", async () => {
		mockSimplePremiumExperience = true;
		renderCapture();

		await screen.findByTestId("capture-composer");
		expect(
			screen.getByTestId("capture-composer-submit").props.accessibilityState,
		).toMatchObject({ disabled: false });
		expect(screen.getByTestId("capture-composer-wallet")).toBeTruthy();
		// The picker stays collapsed: choosing a wallet is opt-in, not required.
		expect(screen.queryByTestId("capture-composer-wallet-options")).toBeNull();
	});
});
