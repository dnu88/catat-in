import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Image,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { PageEntrance, StaggeredStack } from "../../src/components/motion";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { useTransactionRealtime } from "../../src/hooks/useTransactionRealtime";
import { useI18n } from "../../src/i18n/i18n-context";
import { useSupabase } from "../../src/lib/supabase";
import { Sentry } from "../../src/lib/sentry";
import { useTheme } from "../../src/theme/theme-context";
import { financeEditorial as fe } from "../../src/theme/finance-editorial";
import { IconBubble } from "../../src/components/ui";
import {
	FinanceContextSwitcher,
	type FinanceContextChoice,
} from "../../src/components/FinanceContextSwitcher";
import {
	KaswiseIcon,
	type KaswiseIconName,
} from "../../src/components/icons/kaswise-icons";
import { createEnvelopeAllocation } from "../../src/services/budget-envelopes";
import { createTransaction } from "../../src/services/transactions";
import {
	analyzeReceiptImage,
	analyzeTransactionText,
	getReceiptAuthSession,
	normalizeReceiptDate,
	receiptExtractionToDrafts,
	reconcileReceipt,
	uploadReceiptImage,
	type ReceiptExtraction,
	type ReceiptImageAsset,
	type ReceiptTransactionDraft,
} from "../../src/services/receipt-intake";
import { listCategories, type Category } from "../../src/services/categories";
import {
	getCategoryCanonicalId,
	getLocalizedCategoryName,
} from "../../src/services/category-taxonomy";
import {
	classifyTransactionTextBatch,
	CLASSIFIER_HIGH_CONFIDENCE_THRESHOLD,
	type ClassifiedTransaction,
} from "../../src/services/transaction-classifier";
import { listWallets, type Wallet } from "../../src/services/wallets";
import { useFinanceContext } from "../../src/state/finance-context";
import { financeContextLabel } from "../../src/components/finance-context-label";
import { useEntitlements } from "../../src/hooks/useEntitlements";
import { featureFlags } from "../../src/config/features";
import { useDraftExitGuard } from "../../src/features/capture/use-draft-exit-guard";
import {
	getVoiceAuthSession,
	processVoiceTransaction,
	uploadVoiceAudio,
	type VoiceAudioAsset,
	type VoiceExtraction,
} from "../../src/services/voice-intake";
import {
	createInitialEntryState,
	createSubmitLock,
	entryReducer,
	hasUnsavedWork,
	withSubmitLock,
	type ContextSnapshot,
} from "../../src/features/transaction-entry/state";
import {
	allDraftsValid,
	validateDraft,
	localToday,
	summariseDrafts,
	unacknowledgedWarnings,
	type DraftFieldErrors,
	type TransactionDraft,
} from "../../src/features/transaction-entry/draft";
import {
	draftFingerprint,
	draftsMatchConfirmedTotal,
	receiptDraftMode,
	receiptDraftsForMode,
	textDraftsToDrafts,
	voiceExtractionToDraft,
} from "../../src/features/transaction-entry/adapters";
import { AutoSaveToast } from "../../src/components/transaction-entry/AutoSaveToast";
import {
	CaptureComposer,
	captureComposerCopy,
} from "../../src/components/transaction-entry/CaptureComposer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DraftWarnings, TransactionReview } from "../../src/components/transaction-entry/TransactionReview";
import {
	BatchReviewList,
	batchReviewCopy,
	initialExpandedKeys,
	type BatchReviewRow,
} from "../../src/components/transaction-entry/BatchReviewList";
import {
	shouldAutoSaveEntry,
	type AutoSaveBlockReason,
} from "../../src/features/transaction-entry/auto-save";
import { recordAutoSaveOutcome } from "../../src/services/auto-save-metrics";
import { deleteTransaction } from "../../src/services/transactions";
import { TransactionSuccess } from "../../src/components/transaction-entry/TransactionSuccess";
import { EntrySheet } from "../../src/components/transaction-entry/EntrySheet";
import { TransactionDatePickerSheet } from "../../src/components/transaction-entry/TransactionDatePickerSheet";
import { entryCopy, formatRupiah } from "../../src/components/transaction-entry/copy";
import type { EntryPickerKind } from "../../src/components/transaction-entry/TransactionFields";
import { TransactionFields } from "../../src/components/transaction-entry/TransactionFields";
import {
	EntryPersistenceError,
	reconcileEntry,
	saveEntry,
	type SaveEntryResult,
} from "../../src/services/transaction-entry-persistence";
import type { Transaction } from "../../src/services/transactions";

/**
 * Fresh RFC4122 v4 request id, minted once per user-initiated save attempt and
 * reused verbatim only for a retry of the same payload. Never derived from the
 * payload itself, so a replayed request cannot silently duplicate rows.
 */
export function newEntryRequestId(): string {
	const cryptoApi = (
		globalThis as { crypto?: { randomUUID?: () => string } }
	).crypto;
	if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
		const random = (Math.random() * 16) | 0;
		const value = char === "x" ? random : (random & 0x3) | 0x8;
		return value.toString(16);
	});
}

export function photoLocked(ent: { photo_limit: number } | null): boolean {
	return !!ent && ent.photo_limit === 0;
}
export function quotaLabel(ent: { chat_used: number; chat_limit: number } | null): string {
	return ent ? `Chat AI: ${ent.chat_used}/${ent.chat_limit}` : "";
}

const enabledModes = [
	{
		id: "Teks",
		label: "Teks",
		icon: "file" as KaswiseIconName,
		helper: "Ketik transaksi dengan bahasa natural",
	},
	{
		id: "Foto",
		label: "Foto",
		icon: "upload" as KaswiseIconName,
		helper: "Scan struk belanja dengan OCR",
	},
] as const;

const voiceMode = {
	id: "Suara",
	label: "Suara",
	icon: "notification" as KaswiseIconName,
	helper: "Ucapkan transaksi, Kaswise jadikan catatan",
} as const;

type ModeId = (typeof enabledModes)[number]["id"] | typeof voiceMode.id;

export function getDefaultCaptureMode(voiceEnabled: boolean): ModeId {
	return voiceEnabled ? "Suara" : "Teks";
}

export function getCaptureSubtitle(voiceEnabled: boolean, isEn: boolean): string {
	if (voiceEnabled) {
		return isEn
			? "Voice, text, or receipt—choose the fastest input."
			: "Suara, teks, atau struk—pilih input tercepat.";
	}
	return isEn
		? "Text or receipt—choose the fastest input."
		: "Teks atau struk—pilih input tercepat.";
}

export function getCaptureModes(voiceEnabled: boolean) {
	return voiceEnabled ? [voiceMode, ...enabledModes] : enabledModes;
}

// Optional `?mode=` entry param for quick actions. Unknown values fall back to
// the same default the screen would pick on its own. The photo entry is gated by
// entitlements exactly like the visible Foto action, so a locked photo quota
// falls back to the default mode instead of opening the receipt panel.
export function resolveCaptureModeParam(
	value: unknown,
	voiceEnabled: boolean,
	photoEntryLocked = false,
): ModeId {
	const raw = Array.isArray(value) ? value[0] : value;
	if (raw === "text") return "Teks";
	if (raw === "photo") {
		return photoEntryLocked ? getDefaultCaptureMode(voiceEnabled) : "Foto";
	}
	if (raw === "voice" && voiceEnabled) return "Suara";
	return getDefaultCaptureMode(voiceEnabled);
}

type AiTextTransaction = {
	type?: unknown;
	amount?: unknown;
	category?: unknown;
	merchant?: unknown;
	note?: unknown;
	date?: unknown;
	confidence?: unknown;
};

function normalizeAiDate(value: unknown) {
	return normalizeReceiptDate(value);
}

function resolveAiCategoryName(
	category: unknown,
	categories: Category[],
	language: "id" | "en",
) {
	const rawName = typeof category === "string" && category.trim() ? category.trim() : "other";
	const canonicalId = getCategoryCanonicalId(rawName);
	const existing = categories.find(
		(option) => getCategoryCanonicalId(option.name) === canonicalId,
	);
	if (existing) return getLocalizedCategoryName(existing.name, language);
	return getLocalizedCategoryName(rawName, language) || (language === "en" ? "Other expenses" : "Lainnya");
}

function extractionUnclearOf(extraction: unknown): string | null {
	if (!extraction || typeof extraction !== "object") return null;
	const unclear = (extraction as { unclear?: unknown }).unclear;
	return typeof unclear === "string" && unclear.trim() ? unclear : null;
}

/** Short, actionable reason shown above review when auto-save is refused. */
function autoSaveReasonText(reason: AutoSaveBlockReason, isEn: boolean) {
	const id: Record<AutoSaveBlockReason, string> = {
		no_drafts: "Tidak ada transaksi yang terbaca. Coba tulis ulang.",
		source_not_text: "Struk dan foto selalu perlu dikonfirmasi dulu.",
		multi_transaction: "Ada lebih dari satu transaksi. Periksa dulu.",
		missing_amount: "Nominal belum disebutkan. Isi dulu.",
		low_confidence: "AI kurang yakin. Periksa dulu.",
		generic_category: "Kategori belum jelas. Pilih kategorinya.",
		transfer_requires_target: "Transfer perlu dompet tujuan.",
		extractor_unsure: "Ada bagian yang belum jelas. Periksa dulu.",
		unresolved_fields: "Ada isian yang belum pasti. Periksa dulu.",
		invalid_draft: "Ada isian yang belum lengkap. Periksa dulu.",
	};
	const en: Record<AutoSaveBlockReason, string> = {
		no_drafts: "No transaction could be read. Try wording it again.",
		source_not_text: "Receipts and photos always need confirmation.",
		multi_transaction: "More than one transaction. Check them first.",
		missing_amount: "No amount was mentioned. Fill it in.",
		low_confidence: "The AI is not sure. Check this first.",
		generic_category: "The category is unclear. Pick one.",
		transfer_requires_target: "A transfer needs a destination wallet.",
		extractor_unsure: "Something was unclear. Check this first.",
		unresolved_fields: "Some fields are uncertain. Check this first.",
		invalid_draft: "Some fields are incomplete. Check this first.",
	};
	return isEn ? en[reason] : id[reason];
}

function aiExtractionToDrafts(
	extraction: { transactions?: unknown[] } | null | undefined,
	categories: Category[],
	language: "id" | "en",
	fallbackInput: string,
): ClassifiedTransaction[] {
	const transactions = Array.isArray(extraction?.transactions)
		? extraction.transactions
		: [];

	return transactions
		.map((raw): ClassifiedTransaction | null => {
			const item = raw as AiTextTransaction;
			const amount = Number(item.amount ?? 0);
			if (!Number.isFinite(amount) || amount <= 0) return null;

			const transactionType = item.type === "income" ? "income" : "expense";
			const categoryName = resolveAiCategoryName(item.category, categories, language);
			const note = typeof item.note === "string" && item.note.trim()
				? item.note.trim()
				: fallbackInput;
			const confidence = Number(item.confidence ?? 0.82);

			return {
				transactionType,
				amount,
				categoryId: null,
				categoryName,
				merchant: typeof item.merchant === "string" && item.merchant.trim()
					? item.merchant.trim()
					: null,
				note,
				date: normalizeAiDate(item.date),
				confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(confidence, 1)) : 0.82,
				matchedKeywords: [],
				matchedConcept: getCategoryCanonicalId(categoryName) || "unknown",
			};
		})
		.filter((draft): draft is ClassifiedTransaction => Boolean(draft));
}

export default function CaptureScreen() {
	const safeAreaInsets = useSafeAreaInsets();
	const { supabase } = useSupabase();
	const { theme } = useTheme();
	const { language } = useI18n();
	const router = useRouter();
	const { activeContext, memberships, canCreate, setPersonalContext, setActiveHousehold } =
		useFinanceContext();
	const { data: ent, loading: entitlementsLoading, refresh: refreshEntitlements } = useEntitlements();
	const isEn = language === "en";
	const tx = useMemo(
		() =>
			isEn
				? {
						title: "Record a transaction",
						subtitle: getCaptureSubtitle(featureFlags.voiceNote, true),
						simpleTitle: "Add transaction",
						simplePromise: "Pick the fastest route. Kaswise tidies up the rest.",
						destinationLabel: "Destination",
						manualDetail: "Enter details manually",
						importAction: "Import statement",
						captureAnother: "Record another transaction",
						modeLabels: {
							Teks: "Text",
							Foto: "Photo",
							Suara: "Voice",
						},
						modeHelpers: {
							Teks: "Type a transaction in natural language",
							Foto: "Scan shopping receipts with OCR",
							Suara: "Say the transaction and let Kaswise structure it",
						},
						textPlaceholder: "Example: Bought coffee 35k at Kopi Kenangan with QRIS",
						textInputLabel: "Transaction text input",
						processTextLabel: "Save transaction",
						processTextButton: "Save transaction",
						walletLabel: "Save to",
						noWallet: "No wallet yet. The transaction can still be saved.",
						processingTitle: "Processing...",
						processingSub: "Kaswise AI is reading your transaction. You can leave this page.",
						successTitle: "Transaction saved!",
						successSub: "Wallet balance and budget rules are synced automatically when a wallet is selected.",
						queued: "Transaction saved. Kaswise prepared a quick reading instantly.",
						amountRequired: "Add an amount so Kaswise can save the transaction instantly.",
						budgetWallet: "Budget Wallet",
						remainingAfter: (amount: number) =>
							`Rp${amount.toLocaleString("id-ID")} left after this transaction`,
						needsReview: "Needs review in Reports",
						multiSaved: (count: number) => `${count} transactions were saved from one note.`,
						sessionMissing: "Login session not found. Please sign in again.",
						systemError: "System error. Please try again.",
						photoPermission: "Photo library permission is needed to scan receipts.",
						receiptAmountMissing: "Amount was not detected. Try a clearer photo.",
						receiptReadSuccess: "Receipt read successfully. Review before saving.",
						receiptProcessFallback: "Receipt could not be processed. Try again.",
						receiptSaveFallback: "Receipt could not be saved. Try again.",
						receiptSaved: "Receipt transaction saved.",
						receiptPlaceholder: "Choose a clear receipt photo.",
						chooseReceiptPhoto: "Choose Receipt Photo",
						changeReceiptPhoto: "Change Receipt Photo",
						processReceipt: "Process Receipt",
						receiptPreviewTitle: "Receipt Preview",
						saveReceiptTransaction: "Save Receipt Transaction",
						viewReview: "View & Review",
						keepSaved: "Keep saved",
						viewReviewLabel: "View and review transaction",
						keepSavedLabel: "Keep saved transaction",
						errorTitle: "Processing failed",
						errorFallback: "Transaction could not be processed. Try again shortly.",
						tryAgain: "Try Again",
						tryAgainLabel: "Try processing again",
						voicePermission: "Microphone permission is needed to record voice notes.",
						voiceReady: "Voice note ready. Process it to save the transaction.",
						voiceRecord: "Start recording",
						voiceStop: "Stop recording",
						voiceProcess: "Process voice note",
						voiceReset: "Record again",
						voiceRecording: "Listening... say it naturally, for example: bought coffee 35k.",
						voiceEmpty: "No voice note recorded yet.",
						voiceSaved: "Voice transaction saved.",
						voiceFeatureDisabled: "Voice capture is being prepared.",
						reviewAction: "Review",
						savingSub: "Saving your reviewed transaction. Do not close this page.",
						viewerNoticeV2: "You have view-only access in this money space, so you cannot record transactions.",
						reconcileChecking: "The save result is unclear. Checking whether it was actually recorded…",
						reconcileFound: "The transaction was actually recorded. Nothing was duplicated.",
						reconcileUnconfirmed: "The complete save cannot be confirmed yet. Returning to review does not mean nothing was saved.",
						reconcileFailed: "We could not confirm the save result yet. Check again before retrying.",
						reconcileRetry: "Back to review",
						reconcileAgain: "Check again",
						receiptModeLabel: "How to record",
						receiptModeTotal: "One total transaction",
						receiptModeItems: "Split per item",
						receiptDiscrepancyBody: (difference: string) =>
							`Items do not add up to the receipt total (off by ${difference}). Review or accept the difference before saving.`,
						receiptDiscrepancyAck: "Accept difference",
						receiptDiscrepancyBlocked: "Items do not add up to the receipt total. Confirm or correct it first.",
					}
				: {
						title: "Catat transaksi",
						subtitle: getCaptureSubtitle(featureFlags.voiceNote, false),
						simpleTitle: "Catat transaksi",
						simplePromise: "Pilih cara tercepat. Kaswise rapikan sisanya.",
						destinationLabel: "Tujuan transaksi",
						manualDetail: "Isi detail manual",
						importAction: "Impor rekening",
						captureAnother: "Catat transaksi lain",
						modeLabels: {
							Teks: "Teks",
							Foto: "Foto",
							Suara: "Suara",
						},
						modeHelpers: {
							Teks: "Ketik transaksi dengan bahasa natural",
							Foto: "Scan struk belanja dengan OCR",
							Suara: "Ucapkan transaksi, Kaswise jadikan catatan",
						},
						textPlaceholder: "Contoh: Beli kopi 35rb di Kopi Kenangan pakai QRIS",
						textInputLabel: "Input teks transaksi",
						processTextLabel: "Simpan transaksi",
						processTextButton: "Simpan transaksi",
						walletLabel: "Simpan ke",
						noWallet: "Belum ada dompet. Transaksi tetap bisa disimpan.",
						processingTitle: "Sedang memproses...",
						processingSub: "AI Kaswise sedang membaca transaksimu. Kamu bisa meninggalkan halaman ini.",
						successTitle: "Transaksi tercatat! Berhasil disimpan.",
						successSub: "Saldo akun dan aturan budget otomatis tersinkron saat akun dipilih.",
						queued: "Transaksi langsung disimpan. Kaswise membaca catatanmu secara instan.",
						amountRequired: "Tambahkan nominal agar transaksi bisa langsung disimpan.",
						budgetWallet: "Dompet",
						remainingAfter: (amount: number) =>
							`Rp${amount.toLocaleString("id-ID")} tersisa setelah transaksi ini`,
						needsReview: "Perlu cek di Reports",
						multiSaved: (count: number) => `${count} transaksi langsung disimpan dari satu catatan.`,
						sessionMissing: "Sesi login tidak ditemukan. Silakan login ulang.",
						systemError: "Terjadi kesalahan sistem. Silakan coba lagi.",
						photoPermission: "Izin galeri diperlukan untuk scan struk.",
						receiptAmountMissing: "Nominal belum terbaca. Coba foto yang lebih jelas.",
						receiptReadSuccess: "Struk berhasil dibaca. Review dulu sebelum disimpan.",
						receiptProcessFallback: "Struk belum bisa diproses. Coba lagi.",
						receiptSaveFallback: "Struk belum bisa disimpan. Coba lagi.",
						receiptSaved: "Transaksi struk tersimpan.",
						receiptPlaceholder: "Pilih foto struk yang jelas.",
						chooseReceiptPhoto: "Pilih Foto Struk",
						changeReceiptPhoto: "Ganti Foto Struk",
						processReceipt: "Proses Struk",
						receiptPreviewTitle: "Preview Struk",
						saveReceiptTransaction: "Simpan Transaksi Struk",
						viewReview: "Lihat & Review",
						keepSaved: "Langsung simpan",
						viewReviewLabel: "Lihat dan review transaksi",
						keepSavedLabel: "Langsung simpan transaksi",
						errorTitle: "Gagal memproses",
						errorFallback: "Transaksi belum berhasil diproses. Coba lagi sebentar.",
						tryAgain: "Coba Lagi",
						tryAgainLabel: "Coba proses lagi",
						voicePermission: "Izin mikrofon diperlukan untuk mencatat dengan suara.",
						voiceReady: "Catatan suara siap. Proses untuk menyimpan transaksi.",
						voiceRecord: "Mulai rekam",
						voiceStop: "Stop rekam",
						voiceProcess: "Proses suara",
						voiceReset: "Rekam ulang",
						voiceRecording: "Mendengarkan... ucapkan natural, misalnya: beli kopi 35rb.",
						voiceEmpty: "Belum ada rekaman suara.",
						voiceSaved: "Transaksi suara tersimpan.",
						voiceFeatureDisabled: "Capture suara sedang disiapkan.",
						reviewAction: "Cek transaksi",
						savingSub: "Menyimpan transaksi yang sudah kamu periksa. Jangan tutup halaman ini.",
						viewerNoticeV2: "Kamu hanya punya akses lihat di ruang uang ini, jadi belum bisa mencatat transaksi.",
						reconcileChecking: "Hasil simpan belum jelas. Memeriksa apakah transaksi benar-benar tersimpan…",
						reconcileFound: "Transaksi ternyata sudah tersimpan. Tidak ada duplikasi.",
						reconcileUnconfirmed: "Hasil simpan lengkap belum bisa dipastikan. Kembali ke review bukan berarti transaksi belum tersimpan.",
						reconcileFailed: "Hasil simpan belum bisa dipastikan. Periksa lagi sebelum mencoba ulang.",
						reconcileRetry: "Kembali ke review",
						reconcileAgain: "Periksa lagi",
						receiptModeLabel: "Cara mencatat",
						receiptModeTotal: "Satu transaksi total",
						receiptModeItems: "Pisah per item",
						receiptDiscrepancyBody: (selisih: string) =>
							`Item tidak cocok dengan total struk (selisih ${selisih}). Periksa atau konfirmasi selisihnya sebelum menyimpan.`,
						receiptDiscrepancyAck: "Konfirmasi selisih",
						receiptDiscrepancyBlocked: "Item tidak cocok dengan total struk. Konfirmasi atau perbaiki dulu.",
					},
		[isEn],
	);
	const styles = useMemo(() => createStyles(theme), [theme]);

	const simple = featureFlags.simpleNavigation;
	// Review-first entry flow. Off by default so every legacy branch below stays
	// exactly as it was until the flag is rolled forward.
	const entryV2 = featureFlags.transactionEntryV2;
	const aiAutosaveText = featureFlags.aiAutosaveText;
	// Presentation redesign. OFF by default: when OFF every legacy branch below
	// renders exactly as before, so this only ever swaps the idle workspace.
	const premium = featureFlags.simplePremiumExperience;
	const searchParams = useLocalSearchParams() as Record<
		string,
		string | string[] | undefined
	>;
	const captureModes = useMemo(
		() => getCaptureModes(featureFlags.voiceNote),
		[],
	);
	const [activeMode, setActiveMode] = useState<ModeId>(() =>
		resolveCaptureModeParam(
			searchParams.mode ?? (premium ? "text" : undefined),
			featureFlags.voiceNote,
			photoLocked(ent),
		),
	);
	const [pendingReceiptOpen, setPendingReceiptOpen] = useState(false);
	// Preserve a premium Struk tap made during entitlement lookup. Selecting Foto
	// optimistically would be silently undone by the locked-photo effect below.
	useEffect(() => {
		if (!pendingReceiptOpen || entitlementsLoading) return;
		setPendingReceiptOpen(false);
		if (photoLocked(ent)) {
			router.push("/upgrade");
		} else {
			setActiveMode("Foto");
		}
	}, [pendingReceiptOpen, entitlementsLoading, ent, router]);
	const receiptReturnMode = useRef<ModeId>("Teks");
	useEffect(() => {
		if (activeMode !== "Foto") receiptReturnMode.current = activeMode;
	}, [activeMode]);
	const [textInput, setTextInput] = useState("");
	const [voiceRecording, setVoiceRecording] = useState<Audio.Recording | null>(null);
	const [voiceAsset, setVoiceAsset] = useState<VoiceAudioAsset | null>(null);
	const [voiceDraft, setVoiceDraft] = useState<VoiceExtraction | null>(null);
	const [transactionId, setTransactionId] = useState<string | null>(null);
	const [wallets, setWallets] = useState<Wallet[]>([]);
	const [categoryOptions, setCategoryOptions] = useState<Category[]>([]);
	const [walletId, setWalletId] = useState<string | null>(null);
	const [walletLoading, setWalletLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [optimisticTransaction, setOptimisticTransaction] = useState<any | null>(null);
	const [receiptAsset, setReceiptAsset] = useState<ReceiptImageAsset | null>(null);
	const [receiptDrafts, setReceiptDrafts] = useState<ReceiptTransactionDraft[]>([]);
	const receiptDraft = receiptDrafts[0] ?? null;
	// Entitlements resolve asynchronously, so a locked photo quota can arrive after
	// the first render. Never keep the receipt panel selected while photo is locked,
	// no matter how the mode was chosen (entry param or visible Foto action). Guard
	// the demotion to the idle workspace: a mid-session plan change must not pull a
	// receipt review out from under the user (the review container renders nothing
	// for other modes, and the idle workspace is hidden while a review is active).
	useEffect(() => {
		if (receiptDrafts.length > 0) return;
		if (activeMode === "Foto" && photoLocked(ent)) {
			setActiveMode(getDefaultCaptureMode(featureFlags.voiceNote));
		}
	}, [activeMode, ent, receiptDrafts.length]);
	const autoProcessReceiptRef = useRef<string | null>(null);
	const openManualEntry = () => requestCaptureExit(() => router.push("/(tabs)/transaction-new"));
	const [receiptPath, setReceiptPath] = useState<string | null>(null);
	const [receiptExtraction, setReceiptExtraction] = useState<ReceiptExtraction | null>(null);
	// Explicit receipt recording mode: ONE total transaction by default, or one
	// transaction per printed item. Only these two are user-selectable.
	const [receiptMode, setReceiptMode] = useState<"total" | "items">("total");
	// The user has explicitly accepted a printed-items vs total discrepancy.
	const [receiptDiscrepancyAcked, setReceiptDiscrepancyAcked] = useState(false);
	const persistedSuggestionKeyRef = useRef<string | null>(null);
	// Persist success state across focus changes & mode switches.
	const completedRef = useRef(false);
	const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// ---- Review-first entry flow (featureFlags.transactionEntryV2) ----
	// The legacy state above is untouched: everything below only runs when the
	// flag is on. Drafts are pure; the reducer owns the lifecycle and a
	// synchronous ref lock owns single-flight.
	const entryContext = useMemo<ContextSnapshot>(
		() => ({
			id:
				activeContext.type === "personal"
					? "personal"
					: activeContext.householdId,
			label: financeContextLabel(activeContext, memberships, language),
			canCreate,
		}),
		[activeContext, memberships, canCreate, language],
	);
	const [entryState, entryDispatch] = useReducer(
		entryReducer,
		entryContext,
		createInitialEntryState,
	);
	const entrySubmitLockRef = useRef(createSubmitLock());
	const entryRequestIdRef = useRef<string | null>(null);
	const entryFingerprintRef = useRef<string | null>(null);
	const entrySaveContextRef = useRef<ContextSnapshot | null>(null);
	const entryOutcomeUnknownRef = useRef(false);
	const [entryErrors, setEntryErrors] = useState<
		Record<string, DraftFieldErrors>
	>({});
	const [entrySaved, setEntrySaved] = useState<SaveEntryResult | null>(null);
	// Auto-save (text only): the decision, the reason shown when it is refused,
	// and the undo window that follows a successful automatic write.
	const [autoSavePending, setAutoSavePending] = useState(false);
	const [autoSaveReason, setAutoSaveReason] =
		useState<AutoSaveBlockReason | null>(null);
	const [autoSaveToastVisible, setAutoSaveToastVisible] = useState(false);
	// Undo is a delete over the network. When it fails the entry is still stored,
	// so the screen must say so and offer a retry instead of silently implying
	// the cancellation worked.
	const [undoFailureIds, setUndoFailureIds] = useState<string[] | null>(null);
	const [undoRetrying, setUndoRetrying] = useState(false);
	const autoSavePendingRef = useRef(false);
	const [entryPicker, setEntryPicker] = useState<{
		key: string;
		kind: EntryPickerKind;
	} | null>(null);
	const [reconcileState, setReconcileState] = useState<
		"idle" | "checking" | "found" | "unconfirmed" | "failed"
	>("idle");
	const entryPickerDraft =
		entryPicker && entryState.drafts.find((draft) => draft.key === entryPicker.key);
	const closeEntryPicker = () => setEntryPicker(null);

	useEffect(() => {
		if (!entryV2) return;
		entryDispatch({ type: "context-changed", context: entryContext });
		// The snapshot identity is fully described by these two fields.
	}, [entryV2, entryContext.id, entryContext.canCreate]);

	// Default destination for reviewed drafts. AI analysis can finish before the
	// scoped wallet list resolves, so attach the context's default wallet as soon
	// as both the review and the wallet list are available. This never invents a
	// wallet outside the active context and never saves without one — it only
	// fills the destination the user would have picked anyway. `wallets` already
	// holds active wallets only.
	useEffect(() => {
		if (!entryV2) return;
		if (entryState.phase !== "review") return;
		const fallbackWalletId = walletId ?? wallets[0]?.id ?? null;
		if (!fallbackWalletId) return;
		for (const draft of entryState.drafts) {
			if (draft.walletId) continue;
			entryDispatch({
				type: "draft-updated",
				key: draft.key,
				patch: {
					walletId: fallbackWalletId,
					unresolvedFields: draft.unresolvedFields.filter(
						(field) => field !== "wallet",
					),
				},
			});
		}
	}, [entryV2, entryState.phase, entryState.drafts, walletId, wallets]);

	const { transaction, loading } = useTransactionRealtime(transactionId);
	const displayedTransaction = transaction ?? optimisticTransaction;

	const loadWalletOptions = async () => {
		setWalletLoading(true);
		try {
			const [walletData, categories] = await Promise.all([
				listWallets(activeContext),
				listCategories().catch(() => [] as Category[]),
			]);
			const activeWallets = walletData.filter((wallet) => wallet.is_active !== false);
			setWallets(activeWallets);
			setCategoryOptions(categories);
			setWalletId((current) =>
				current && activeWallets.some((wallet) => wallet.id === current)
					? current
					: (activeWallets[0]?.id ?? null),
			);
		} catch (error) {
			console.error("Failed to load capture options:", error);
			Sentry.captureException(error);
			setWallets([]);
			setCategoryOptions([]);
			setWalletId(null);
		} finally {
			setWalletLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			let mounted = true;
			void loadWalletOptions();
			return () => {
				mounted = false;
				void voiceRecording?.stopAndUnloadAsync().catch(() => undefined);
				// Auto-dismiss success state when user switches to another tab.
				if (completedRef.current) resetCapture(true);
			};
		}, [activeContext]),
	);

	const submitText = async () => {
		if (entryV2 && !canCreate) {
			setError(tx.viewerNoticeV2);
			return;
		}
		const value = textInput.trim();
		if (!value || submitting) return;

		setSubmitting(true);
		setQueuedMessage(null);
		setError(null);
		setOptimisticTransaction(null);

		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				setError(tx.sessionMissing);
				setSubmitting(false);
				return;
			}

			const aiExtraction = await analyzeTransactionText(supabase, value);
			void refreshEntitlements();

			const categoriesForClassification =
				categoryOptions.length > 0
					? categoryOptions
					: await listCategories().catch(() => [] as Category[]);
			const localizedCategoriesForClassification = categoriesForClassification.map((category) => ({
				...category,
				name: getLocalizedCategoryName(category.name, isEn ? "en" : "id"),
			}));
			const localDrafts = classifyTransactionTextBatch(
				value,
				localizedCategoriesForClassification,
			);
			const aiDrafts = aiExtractionToDrafts(
				aiExtraction,
				categoriesForClassification,
				isEn ? "en" : "id",
				value,
			);
			const quickDrafts = localDrafts.length >= aiDrafts.length ? localDrafts : aiDrafts;
			const quickDraft = quickDrafts[0] ?? null;

			if (!quickDraft) {
				setError(tx.amountRequired);
				setSubmitting(false);
				return;
			}

			const createdTransactions = await Promise.all(
				quickDrafts.map((draft) =>
					createTransaction(
						{
							wallet_id: walletId,
							transaction_type: draft.transactionType,
							amount: draft.amount,
							category: draft.categoryName,
							description: draft.note,
							date: draft.date,
							note: draft.note,
							merchant: draft.merchant,
							input_type: "text",
							status: "done",
							raw_input: value,
							review_required:
								draft.confidence < CLASSIFIER_HIGH_CONFIDENCE_THRESHOLD,
							is_verified:
								draft.confidence >= CLASSIFIER_HIGH_CONFIDENCE_THRESHOLD,
							confidence: draft.confidence,
						},
						activeContext,
					),
				),
			);
			const createdTransaction = createdTransactions[0];

			setOptimisticTransaction({
				id: createdTransaction.id,
				status: "done",
				confidence: quickDraft.confidence,
				transaction_type: quickDraft.transactionType,
				type: quickDraft.transactionType,
				amount: quickDraft.amount,
				nominal: quickDraft.amount,
				category: quickDraft.categoryName,
				kategori: quickDraft.categoryName,
				category_id: quickDraft.categoryId,
				description: quickDraft.note,
				catatan: quickDraft.note,
				merchant: quickDraft.merchant,
				date: quickDraft.date,
				tanggal: quickDraft.date,
			});
			setTransactionId(createdTransaction.id);
			completedRef.current = true;
			setQueuedMessage(
				quickDrafts.length > 1
					? tx.multiSaved(quickDrafts.length)
					: tx.queued,
			);
			setTextInput("");
			setSubmitting(false);

			// Refresh wallet list so balance stays current after transaction.
			void loadWalletOptions();
		} catch (e) {
			Sentry.captureException(e);
			setError(tx.systemError);
			setSubmitting(false);
		}
	};


	const startVoiceRecording = async () => {
		if (!featureFlags.voiceNote || submitting || voiceRecording) return;
		setError(null);
		setQueuedMessage(null);
		setVoiceAsset(null);
		setVoiceDraft(null);
		try {
			const permission = await Audio.requestPermissionsAsync();
			if (!permission.granted) {
				setError(tx.voicePermission);
				return;
			}

			await Audio.setAudioModeAsync({
				allowsRecordingIOS: true,
				playsInSilentModeIOS: true,
			});
			const { recording } = await Audio.Recording.createAsync(
				Audio.RecordingOptionsPresets.HIGH_QUALITY,
			);
			setVoiceRecording(recording);
			setQueuedMessage(tx.voiceRecording);
		} catch (error) {
			Sentry.captureException(error);
			setError(tx.systemError);
		}
	};

	const stopVoiceRecording = async () => {
		if (!voiceRecording) return;
		try {
			const status = await voiceRecording.getStatusAsync();
			await voiceRecording.stopAndUnloadAsync();
			const uri = voiceRecording.getURI();
			setVoiceRecording(null);
			if (status.durationMillis > 60_000) {
				setError(isEn ? "Voice notes are limited to 60 seconds." : "Rekaman maksimal 60 detik.");
				return;
			}
			if (!uri) {
				setError(tx.systemError);
				return;
			}
			setVoiceAsset({
				uri,
				fileName: `kaswise-voice-${Date.now()}.m4a`,
				mimeType: "audio/m4a",
			});
			setQueuedMessage(tx.voiceReady);
		} catch (error) {
			Sentry.captureException(error);
			setVoiceRecording(null);
			setError(tx.systemError);
		}
	};

	const submitVoiceNote = async () => {
		if (entryV2 && !canCreate) {
			setError(tx.viewerNoticeV2);
			return;
		}
		if (!voiceAsset || submitting) return;
		setSubmitting(true);
		setError(null);
		setQueuedMessage(null);
		setVoiceDraft(null);

		try {
			const session = await getVoiceAuthSession(supabase);
			if (!session?.access_token || !session.user?.id) {
				throw new Error(tx.sessionMissing);
			}

			const audioPath = await uploadVoiceAudio(supabase, session.user.id, voiceAsset);
			const extraction = await processVoiceTransaction(supabase, audioPath);
			void refreshEntitlements();
			if (entryV2) {
				// Voice now lands in the same editable review as text/receipt.
				const draft = voiceExtractionToDraft(extraction, resolveEntryWalletId());
				if (!draft) throw new Error(tx.voiceEmpty);
				setVoiceAsset(null);
				startEntryReview([attachWallet(draft)], "voice");
				return;
			}
			setVoiceDraft(extraction);
			setVoiceAsset(null);
		} catch (error) {
			Sentry.captureException(error);
			setError(error instanceof Error ? error.message : tx.systemError);
		} finally {
			setSubmitting(false);
		}
	};

	const confirmVoiceDraft = async () => {
		if (entryV2 && !canCreate) {
			setError(tx.viewerNoticeV2);
			return;
		}
		if (!voiceDraft || submitting) return;
		const amount = voiceDraft.fields.nominal ?? 0;
		if (!Number.isFinite(amount) || amount <= 0) {
			setError(isEn ? "The amount was not recognized. Record the voice note again." : "Nominal belum terbaca. Rekam ulang catatan suara.");
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			const transactionType = voiceDraft.fields.type ?? "expense";
			const category = voiceDraft.fields.kategori ?? (isEn ? "Other expenses" : "Lainnya");
			const description = voiceDraft.fields.catatan ?? (isEn ? "Voice transaction" : "Transaksi suara");
			const date = voiceDraft.fields.tanggal ?? new Date().toISOString().slice(0, 10);
			const createdTransaction = await createTransaction({
				wallet_id: walletId,
				transaction_type: transactionType,
				amount,
				category,
				description,
				merchant: voiceDraft.fields.merchant,
				date,
				input_type: "voice",
				status: "done",
				review_required: voiceDraft.review_required,
				is_verified: false,
				confidence: voiceDraft.confidence,
			}, activeContext);

			setTransactionId(createdTransaction.id);
			setOptimisticTransaction({
				...createdTransaction,
				transaction_type: transactionType,
				type: transactionType,
				amount,
				nominal: amount,
				category,
				kategori: category,
				description,
				catatan: description,
				merchant: voiceDraft.fields.merchant,
				date,
				tanggal: date,
			});
			completedRef.current = true;
			setVoiceDraft(null);
			setQueuedMessage(tx.voiceSaved);
			void loadWalletOptions();
		} catch (error) {
			Sentry.captureException(error);
			setError(error instanceof Error ? error.message : tx.systemError);
		} finally {
			setSubmitting(false);
		}
	};

	const pickReceiptImage = async () => {
		if (completedRef.current) return;
		setError(null);
		setQueuedMessage(null);
		setReceiptDrafts([]);
		setReceiptPath(null);
		setReceiptExtraction(null);
		setReceiptMode("total");
		setReceiptDiscrepancyAcked(false);

		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) {
			setError(
				tx.photoPermission,
			);
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			quality: 0.82,
			allowsEditing: false,
		});

		if (result.canceled || !result.assets[0]) return;
		const asset = result.assets[0];
		autoProcessReceiptRef.current = null;
		setReceiptAsset({
			uri: asset.uri,
			fileName: asset.fileName,
			mimeType: asset.mimeType,
		});
	};


	const isRowLevelSecurityError = (error: unknown) =>
		error instanceof Error &&
		error.message.toLowerCase().includes("row-level security");

	const uploadReceiptImageBestEffort = async (
		userId: string,
		asset: ReceiptImageAsset,
	) => {
		try {
			return await uploadReceiptImage(supabase, userId, asset);
		} catch (uploadError) {
			console.error("Receipt image upload skipped:", uploadError);
			return null;
		}
	};

	const submitReceiptPhoto = async () => {
		if (entryV2 && !canCreate) {
			setError(tx.viewerNoticeV2);
			return;
		}
		if (!receiptAsset || submitting) return;
		setSubmitting(true);
		setError(null);
		setQueuedMessage(null);

		try {
			const session = await getReceiptAuthSession(supabase);
			if (!session?.access_token) {
				throw new Error(tx.sessionMissing);
			}

			const userId = session.user?.id;
			if (!userId) {
				throw new Error(tx.sessionMissing);
			}

			const extraction = await analyzeReceiptImage(supabase, receiptAsset);
			void refreshEntitlements();
			if (entryV2) {
				// Receipt defaults to ONE total transaction; the per-item split
				// is an explicit user choice in the review. Both modes are built
				// by the same pure adapter and the choice is enforced again
				// before saving, so a batch that does not add up is never written.
				const uploadedPath = await uploadReceiptImageBestEffort(
					userId,
					receiptAsset,
				);
				const mode = receiptDraftMode(extraction);
				const imageDrafts = receiptDraftsForMode(
					extraction,
					mode,
					resolveEntryWalletId(),
				);
				if (imageDrafts.length === 0) {
					throw new Error(tx.receiptAmountMissing);
				}
				setReceiptPath(uploadedPath);
				setReceiptExtraction(extraction);
				setReceiptMode(mode === "items" ? "items" : "total");
				setReceiptDiscrepancyAcked(false);
				startEntryReview(
					imageDrafts.map((draft) => ({
						...attachWallet(draft),
						receiptUrl: uploadedPath,
					})),
					"image",
				);
				return;
			}
			const uploadedPath = await uploadReceiptImageBestEffort(userId, receiptAsset);
			const drafts = receiptExtractionToDrafts(extraction);
			if (drafts.length === 0) {
				throw new Error(
					tx.receiptAmountMissing,
				);
			}
			setReceiptPath(uploadedPath);
			setReceiptExtraction(extraction);
			setReceiptDrafts(drafts);
			setQueuedMessage(
				tx.receiptReadSuccess,
			);
		} catch (error) {
			Sentry.captureException(error);
			setError(
				error instanceof Error
					? error.message
					: tx.receiptProcessFallback,
			);
		} finally {
			setSubmitting(false);
		}
	};

	useEffect(() => {
		if (!receiptAsset || submitting || receiptDrafts.length > 0) return;
		if (autoProcessReceiptRef.current === receiptAsset.uri) return;
		autoProcessReceiptRef.current = receiptAsset.uri;
		void submitReceiptPhoto();
	}, [receiptAsset, receiptDrafts.length, submitting]);

	const confirmReceiptDraft = async () => {
		if (entryV2 && !canCreate) {
			setError(tx.viewerNoticeV2);
			return;
		}
		if (receiptDrafts.length === 0 || submitting) return;
		setSubmitting(true);
		setError(null);

		let receiptFellBackToNoWallet = false;

		try {
			const createReceiptItemTransaction = async (draft: ReceiptTransactionDraft) => {
				const receiptPayload = {
					wallet_id: walletId,
					transaction_type: draft.transactionType,
					amount: draft.amount,
					category: draft.category,
					description: draft.description,
					date: draft.date,
					note: draft.quantity && draft.quantity > 1
						? `${draft.description} x${draft.quantity}`
						: draft.description,
					merchant: draft.merchant,
					input_type: "image",
					status: "done",
					receipt_url: receiptPath,
					raw_input: receiptAsset?.fileName ?? "receipt_photo",
					ai_confidence: draft.confidence,
					review_required: draft.reviewRequired,
					is_verified: !draft.reviewRequired,
					confidence: draft.confidence,
				};

				try {
					return await createTransaction(receiptPayload, activeContext);
				} catch (createError) {
					if (!walletId || !isRowLevelSecurityError(createError)) {
						throw createError;
					}
					console.error("Receipt transaction wallet scope failed; retrying without wallet:", createError);
					receiptFellBackToNoWallet = true;
					return createTransaction(
						{ ...receiptPayload, wallet_id: null },
						activeContext,
					);
				}
			};

			const createdTransactions = await Promise.all(
				receiptDrafts.map((draft) => createReceiptItemTransaction(draft)),
			);
			const createdTransaction = createdTransactions[0];
			const firstDraft = receiptDrafts[0];

			setOptimisticTransaction({
				id: createdTransaction.id,
				status: "done",
				confidence: firstDraft.confidence,
				transaction_type: firstDraft.transactionType,
				type: firstDraft.transactionType,
				amount: firstDraft.amount,
				nominal: firstDraft.amount,
				category: firstDraft.category,
				kategori: firstDraft.category,
				description: firstDraft.description,
				catatan: firstDraft.description,
				merchant: firstDraft.merchant,
				date: firstDraft.date,
				tanggal: firstDraft.date,
			});
			setTransactionId(createdTransaction.id);
			completedRef.current = true;

			let receiptMessage = receiptDrafts.length > 1
				? `${receiptDrafts.length} transaksi item struk tersimpan.`
				: tx.receiptSaved;

			if (receiptFellBackToNoWallet) {
				receiptMessage += isEn
					? " (saved without wallet sync)"
					: " (tersimpan tanpa sinkronisasi dompet)";
			}

			setQueuedMessage(receiptMessage);

			// Refresh wallet list so balance stays current after receipt save.
			void loadWalletOptions();
		} catch (error) {
			Sentry.captureException(error);
			setError(
				error instanceof Error
					? error.message
					: tx.receiptSaveFallback,
			);
		} finally {
			setSubmitting(false);
		}
	};

	const isSuccess =
		displayedTransaction?.status === "done" ||
		(displayedTransaction?.confidence ?? 0) >= 0.85 ||
		completedRef.current;
	const isError = Boolean(error) || displayedTransaction?.status === "error";
	const isProcessing = Boolean(transactionId) && !isSuccess && !isError;
	// Simple mode renders exactly one workspace state at a time.
	const isReview =
		!isSuccess &&
		!isError &&
		!submitting &&
		(Boolean(voiceDraft) || receiptDrafts.length > 0);
	const workspace: "idle" | "processing" | "review" | "success" | "error" =
		isError
			? "error"
			: isSuccess
				? "success"
				: submitting || isProcessing
					? "processing"
					: isReview
						? "review"
						: "idle";
	const showWorkspaceIdle = entryV2
		? entryState.phase === "idle"
		: !simple || workspace === "idle";

	// Auto-dismiss success state after 10 seconds so user can immediately record another transaction.
	useEffect(() => {
		if (isSuccess && !successTimerRef.current) {
			successTimerRef.current = setTimeout(() => resetCapture(true), 10000);
		}
		return () => {
			if (successTimerRef.current) {
				clearTimeout(successTimerRef.current);
				successTimerRef.current = null;
			}
		};
	}, [isSuccess]);
	const envelopeSuggestion = (displayedTransaction as any)
		?.envelope_suggestion as null | {
		id?: string;
		envelope_id?: string;
		name: string;
		amount?: number;
		confidence?: number;
		remaining_after_transaction?: number;
		needs_review?: boolean;
	};

	useEffect(() => {
		const currentTransactionId = (transaction as any)?.id as string | undefined;
		const suggestion = envelopeSuggestion;
		const envelopeId = suggestion?.envelope_id ?? suggestion?.id;
		if (!isSuccess || !currentTransactionId || !envelopeId || !suggestion)
			return;

		const persistKey = `${currentTransactionId}:${envelopeId}`;
		if (persistedSuggestionKeyRef.current === persistKey) return;
		persistedSuggestionKeyRef.current = persistKey;

		createEnvelopeAllocation(supabase, {
			transaction_id: currentTransactionId,
			envelope_id: envelopeId,
			amount: Number(suggestion.amount ?? (displayedTransaction as any)?.amount ?? 0),
			confidence:
				typeof suggestion.confidence === "number"
					? suggestion.confidence
					: null,
			needs_review: Boolean(suggestion.needs_review),
		}).catch((error) => {
			console.error("Failed to persist envelope allocation:", error);
			Sentry.captureException(error);
		});
	}, [displayedTransaction, envelopeSuggestion, isSuccess, supabase]);

	const resetCapture = (clearText = true) => {
		if (successTimerRef.current) {
			clearTimeout(successTimerRef.current);
			successTimerRef.current = null;
		}
		setTransactionId(null);
		setOptimisticTransaction(null);
		setSubmitting(false);
		setQueuedMessage(null);
		setError(null);
		autoProcessReceiptRef.current = null;
		completedRef.current = false;
		if (clearText) {
			setTextInput("");
			setVoiceAsset(null);
			setVoiceDraft(null);
			setReceiptAsset(null);
			setReceiptDrafts([]);
			setReceiptPath(null);
			setReceiptExtraction(null);
		}
	};

	// The dedicated receipt process action is retired in simple mode, so the
	// error-state retry has to actually resume processing: resetting state alone
	// cannot re-fire the auto-process effect (its deps are unchanged), which used
	// to leave the user stuck with a picked photo and no way to continue.
	const retryCapture = () => {
		const shouldReprocessReceipt =
			simple && Boolean(receiptAsset) && receiptDrafts.length === 0;
		resetCapture(false);
		if (shouldReprocessReceipt) {
			// Claim the auto-process ref before the manual retry, exactly like the
			// auto-process flow does: if this retry fails too, its submitting
			// transition must not hand a second unattended attempt (and an extra
			// photo-quota unit) back to the auto-process effect.
			autoProcessReceiptRef.current = receiptAsset?.uri ?? null;
			void submitReceiptPhoto();
		}
	};

	const renderReceiptReview = () =>
		receiptDraft ? (
								<View testID="capture-receipt-preview" style={styles.receiptDraftCard}>
									<Text style={styles.suggestionLabel}>{tx.receiptPreviewTitle}</Text>
									{receiptDrafts.map((draft, index) => (
										<View key={`${draft.description}-${index}`} style={styles.receiptItemRow}>
											<Text style={styles.suggestionTitle}>{draft.description}</Text>
											<Text style={styles.suggestionMeta}>
												Rp {draft.amount.toLocaleString("id-ID")} · {draft.category} · {draft.date}
												{draft.quantity && draft.quantity > 1 ? ` · Qty ${draft.quantity}` : ""}
											</Text>
											{draft.reviewRequired ? <Text style={styles.suggestionWarning}>{tx.needsReview}</Text> : null}
										</View>
									))}
									<Pressable testID="capture-receipt-confirm" accessibilityRole="button" style={styles.submitButton} onPress={confirmReceiptDraft} disabled={submitting}>
										<Text style={styles.submitButtonText}>{tx.saveReceiptTransaction}</Text>
									</Pressable>
								</View>
		) : null;

	const renderVoiceReview = () =>
		voiceDraft ? (
								<View testID="capture-voice-preview" style={styles.receiptDraftCard}>
									<Text style={styles.suggestionLabel}>{isEn ? "Voice transcript" : "Transkrip suara"}</Text>
									<Text style={styles.suggestionMeta}>{voiceDraft.transcript}</Text>
									<Text style={styles.suggestionTitle}>
										{voiceDraft.fields.catatan ?? (isEn ? "Voice transaction" : "Transaksi suara")}
									</Text>
									<Text style={styles.suggestionMeta}>
										Rp {(voiceDraft.fields.nominal ?? 0).toLocaleString("id-ID")} · {voiceDraft.fields.kategori ?? (isEn ? "Other expenses" : "Lainnya")}
									</Text>
									{voiceDraft.review_required ? <Text style={styles.suggestionWarning}>{tx.needsReview}</Text> : null}
									<Pressable testID="capture-voice-confirm" accessibilityRole="button" style={styles.submitButton} onPress={confirmVoiceDraft} disabled={submitting}>
										{submitting ? <ActivityIndicator color={fe.white} /> : <Text style={styles.submitButtonText}>{isEn ? "Save transaction" : "Simpan transaksi"}</Text>}
									</Pressable>
									<Pressable testID="capture-voice-preview-reset" accessibilityRole="button" style={styles.secondaryButton} onPress={() => setVoiceDraft(null)} disabled={submitting}>
										<Text style={styles.secondaryButtonText}>{tx.voiceReset}</Text>
									</Pressable>
								</View>
		) : null;

	const renderWalletSelector = () => (
		<View testID="capture-wallet-selector" style={styles.walletSelector}>
			<Text style={styles.walletSelectorLabel}>{tx.walletLabel}</Text>
			{wallets.length > 0 ? (
				<ScrollView horizontal showsHorizontalScrollIndicator={false}>
					<View style={styles.walletChipRow}>
						{wallets.map((wallet) => (
							<Pressable
								key={wallet.id}
								testID={`capture-wallet-${wallet.id}`}
								accessibilityRole="button"
								accessibilityLabel={`${tx.walletLabel}: ${wallet.name}`}
								accessibilityState={{ selected: walletId === wallet.id }}
								style={styles.walletChipTouch}
								onPress={() => setWalletId(wallet.id)}
							>
								<View
									style={[
										styles.walletChip,
										walletId === wallet.id && styles.walletChipActive,
									]}
								>
									<Text
										style={[
											styles.walletChipText,
											walletId === wallet.id && styles.walletChipTextActive,
										]}
									>
										{wallet.name}
									</Text>
								</View>
							</Pressable>
						))}
					</View>
				</ScrollView>
			) : (
				<Text style={styles.walletEmptyText}>{tx.noWallet}</Text>
			)}
		</View>
	);

	const entryWalletRef = useRef<{ walletId: string | null; wallets: Wallet[] }>({
		walletId: null,
		wallets: [],
	});
	entryWalletRef.current = { walletId, wallets };
	// Read the latest wallet selection at call time: AI extraction can finish
	// after a re-render, so a render-closure value would miss a freshly loaded
	// wallet list and leave the draft without a destination.
	const resolveEntryWalletId = () =>
		entryWalletRef.current.walletId ??
		entryWalletRef.current.wallets[0]?.id ??
		null;

	const attachWallet = (draft: TransactionDraft): TransactionDraft => {
		const targetWalletId = resolveEntryWalletId();
		if (!targetWalletId) return draft;
		return {
			...draft,
			walletId: targetWalletId,
			unresolvedFields: draft.unresolvedFields.filter(
				(field) => field !== "wallet",
			),
		};
	};

	const startEntryReview = (
		drafts: TransactionDraft[],
		source: TransactionDraft["source"],
	) => {
		if (drafts.length === 0) return;
		// The reducer bumps generation on processing-started; mirror it so the
		// drafts-ready guard accepts this exact request.
		const generation = entryState.generation + 1;
		entryDispatch({ type: "processing-started" });
		entryDispatch({ type: "drafts-ready", generation, source, drafts });
	};

	// Rebuilds the review drafts for the chosen receipt mode. The receipt source
	// (receipt_url) is preserved and the confirmed total never changes: the mode
	// only decides whether it is recorded as one transaction or one per item.
	const switchReceiptMode = (mode: "total" | "items") => {
		if (!receiptExtraction || entryState.phase !== "review") return;
		if (mode === receiptMode) return;
		const drafts = receiptDraftsForMode(
			receiptExtraction,
			mode,
			resolveEntryWalletId(),
		);
		if (drafts.length === 0) return;
		setReceiptMode(mode);
		setReceiptDiscrepancyAcked(false);
		startEntryReview(
			drafts.map((draft) => ({
				...attachWallet(draft),
				receiptUrl: receiptPath,
			})),
			"image",
		);
	};

	const resetEntryFlow = () => {
		entryRequestIdRef.current = null;
		entryFingerprintRef.current = null;
		entrySaveContextRef.current = null;
		entryOutcomeUnknownRef.current = false;
		entrySubmitLockRef.current.release();
		setEntryErrors({});
		setEntrySaved(null);
		setReconcileState("idle");
		entryDispatch({ type: "reset" });
	};

	const runEntryReconcile = async (drafts: TransactionDraft[]) => {
		setReconcileState("checking");
		try {
			const requestId = entryRequestIdRef.current;
			const fingerprint = entryFingerprintRef.current;
			const context = entrySaveContextRef.current;
			if (!requestId || !fingerprint || !context) {
				setReconcileState("failed");
				return;
			}
			const matches = await reconcileEntry({ requestId, fingerprint, context, drafts });
			if (drafts.length > 0 && matches.length === drafts.length) {
				setEntrySaved({ transactions: matches, budgetSyncWarning: false });
				setReconcileState("found");
			} else {
				setReconcileState("unconfirmed");
			}
		} catch (reconcileError) {
			Sentry.captureException(reconcileError);
			setReconcileState("failed");
		}
	};

	// Text input: classify/analyze as before, but stop at review instead of
	// writing. The same adapter builds editable drafts for every source.
	const submitTextReview = async () => {
		if (!canCreate) {
			setError(tx.viewerNoticeV2);
			return;
		}
		const value = textInput.trim();
		if (!value) return;
		if (entryState.phase === "processing" || entryState.phase === "saving") {
			return;
		}
		setError(null);
		entryDispatch({ type: "processing-started" });
		const generation = entryState.generation + 1;
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error(tx.sessionMissing);

			const aiExtraction = await analyzeTransactionText(supabase, value);
			void refreshEntitlements();

			const categoriesForClassification =
				categoryOptions.length > 0
					? categoryOptions
					: await listCategories().catch(() => [] as Category[]);
			const localizedCategoriesForClassification =
				categoriesForClassification.map((category) => ({
					...category,
					name: getLocalizedCategoryName(category.name, isEn ? "en" : "id"),
				}));
			const localDrafts = classifyTransactionTextBatch(
				value,
				localizedCategoriesForClassification,
			);
			const aiDrafts = aiExtractionToDrafts(
				aiExtraction,
				categoriesForClassification,
				isEn ? "en" : "id",
				value,
			);
			const quickDrafts =
				localDrafts.length >= aiDrafts.length ? localDrafts : aiDrafts;
			if (quickDrafts.length === 0) throw new Error(tx.amountRequired);

			const readyDrafts = textDraftsToDrafts({
				classified: quickDrafts,
				fallbackInput: value,
			}).map(attachWallet);
			// One clear sentence may be written without asking; anything else
			// stops at review with a reason the user can act on.
			const autoSaveDecision = shouldAutoSaveEntry({
				source: "text",
				drafts: readyDrafts,
				extractionUnclear: extractionUnclearOf(aiExtraction),
				validation: {
					wallets: wallets.map((wallet) => ({
						id: wallet.id,
						name: wallet.name,
						is_active: wallet.is_active,
					})),
					categories: categoryOptions.map((category) => ({
						name: category.name,
					})),
					canCreate,
				},
			});
			setAutoSaveReason(autoSaveDecision.reason);

			entryDispatch({
				type: "drafts-ready",
				generation,
				source: "text",
				drafts: readyDrafts,
			});

			if (autoSaveDecision.auto && aiAutosaveText) {
				autoSavePendingRef.current = true;
				setAutoSavePending(true);
			}
		} catch (submitError) {
			Sentry.captureException(submitError);
			entryDispatch({ type: "processing-cancelled" });
			setError(
				submitError instanceof Error
					? submitError.message
					: tx.systemError,
			);
		}
	};

	// Single save path for every reviewed source. requestId is minted once per
	// attempt and only reused for a retry of the identical payload;
	// draftFingerprint is the payload identity the server checks for conflicts.
	const saveReviewedDrafts = async (options?: { auto?: boolean }) => {
		if (!canCreate) {
			setError(tx.viewerNoticeV2);
			return;
		}
		if (entryState.phase !== "review") return;
		// A per-item split may only be written when it adds up to the confirmed
		// total, or the user has explicitly accepted the difference.
		if (entryState.source === "image" && receiptMode === "items" && receiptExtraction) {
			const confirmedTotal = reconcileReceipt(receiptExtraction).total;
			if (
				confirmedTotal !== null &&
				!draftsMatchConfirmedTotal(entryState.drafts, confirmedTotal) &&
				!receiptDiscrepancyAcked
			) {
				setError(tx.receiptDiscrepancyBlocked);
				return;
			}
		}
		await withSubmitLock(entrySubmitLockRef.current, async () => {
			const drafts = entryState.drafts;
			if (drafts.length === 0) return;

			const fingerprint = draftFingerprint(drafts);
			if (entryOutcomeUnknownRef.current && entryFingerprintRef.current !== fingerprint) {
				setError(isEn
					? "The original save is still unconfirmed. Restore the original fields before retrying; do not submit a new transaction."
					: "Hasil simpan sebelumnya belum pasti. Pulihkan isian semula sebelum mencoba ulang; jangan kirim transaksi baru.");
				return;
			}
			let requestId = entryRequestIdRef.current;
			if (!requestId || entryFingerprintRef.current !== fingerprint) {
				requestId = newEntryRequestId();
				entryRequestIdRef.current = requestId;
				entryFingerprintRef.current = fingerprint;
			}
			entrySaveContextRef.current = entryContext;
			setEntryErrors({});
			setReconcileState("idle");
			entryDispatch({ type: "save-started" });
			const generation = entryState.generation;

			try {
				const result = await saveEntry({
					requestId,
					fingerprint,
					context: entryContext,
					drafts,
					wallets: wallets.map((wallet) => ({
						id: wallet.id,
						name: wallet.name,
						is_active: wallet.is_active,
					})),
					categories: categoryOptions.map((category) => ({
						name: category.name,
					})),
				});
				setEntrySaved(result);
				entryOutcomeUnknownRef.current = false;
				entryRequestIdRef.current = null;
				entryFingerprintRef.current = null;
				entryDispatch({
					type: "save-succeeded",
					generation,
					savedKeys: drafts.map((draft) => draft.key),
				});
				void loadWalletOptions();
				if (options?.auto) {
					// Identical guarded write as a manual save; the notice only opens
					// the 10s window in which the user can undo or edit it.
					setAutoSaveToastVisible(true);
					void recordAutoSaveOutcome("saved");
				}
			} catch (saveError) {
				Sentry.captureException(saveError);
				const persistenceError =
					saveError instanceof EntryPersistenceError
						? saveError
						: null;
				const kind = persistenceError?.kind ?? "unknown";
				const message = persistenceError?.message ?? tx.systemError;

				if (kind === "validation" && persistenceError?.fields) {
					setEntryErrors(persistenceError.fields);
				}

				if (kind === "permission") {
					// Wallet/role problem: re-fetch scoped wallets and ask the user
					// to choose again. The draft stays intact; we never retry the
					// insert with wallet_id: null.
					void loadWalletOptions();
					entryDispatch({
						type: "save-failed",
						generation,
						kind: "known",
						message,
					});
					return;
				}

				if (kind === "network" || kind === "unknown") {
					entryOutcomeUnknownRef.current = true;
					// The request may have committed. Reconcile instead of a blind
					// retry that could duplicate rows.
					entryDispatch({
						type: "save-failed",
						generation,
						kind: "unknown",
						message,
					});
					await runEntryReconcile(drafts);
					return;
				}

				entryDispatch({
					type: "save-failed",
					generation,
					kind: "known",
					message,
				});
			}
		});
	};

	// Auto-save goes through the same review gate as a manual save: the drafts
	// must land in the reducer first, so the guarded path sees a real phase.
	useEffect(() => {
		if (!entryV2) return;
		if (!autoSavePendingRef.current) return;
		if (entryState.phase !== "review") return;
		autoSavePendingRef.current = false;
		setAutoSavePending(false);
		void saveReviewedDrafts({ auto: true });
		// saveReviewedDrafts is recreated every render; the phase is the trigger.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [entryV2, entryState.phase]);

	const undoAutoSavedEntry = async () => {
		const savedForUndo = entrySaved?.transactions ?? [];
		setAutoSaveToastVisible(false);
		void recordAutoSaveOutcome("undone");
		entryDispatch({ type: "reset" });
		const failedIds: string[] = [];
		for (const savedTransaction of savedForUndo) {
			try {
				await deleteTransaction(savedTransaction.id, activeContext);
			} catch (undoError) {
				Sentry.captureException(undoError);
				failedIds.push(savedTransaction.id);
			}
		}
		setUndoFailureIds(failedIds.length ? failedIds : null);
		void loadWalletOptions();
	};

	const retryUndoAutoSavedEntry = async () => {
		const pendingIds = undoFailureIds ?? [];
		if (!pendingIds.length || undoRetrying) return;
		setUndoRetrying(true);
		const stillFailing: string[] = [];
		for (const id of pendingIds) {
			try {
				await deleteTransaction(id, activeContext);
			} catch (retryError) {
				Sentry.captureException(retryError);
				stillFailing.push(id);
			}
		}
		setUndoFailureIds(stillFailing.length ? stillFailing : null);
		setUndoRetrying(false);
		void loadWalletOptions();
	};

	const editAutoSavedEntry = () => {
		const transactionId = entrySaved?.transactions[0]?.id;
		if (!transactionId) return;
		setAutoSaveToastVisible(false);
		void recordAutoSaveOutcome("edited");
		router.push({ pathname: "/(tabs)/transaction-new", params: { transactionId } });
	};

	const entryReviewVisible =
		entryV2 && entryState.phase === "review" && !autoSavePending;
	const entryBusy =
		entryV2 &&
		(entryState.phase === "processing" ||
			entryState.phase === "saving" ||
			autoSavePending);
	const entrySuccessVisible =
		entryV2 && (entryState.phase === "success" || reconcileState === "found");
	const entryErrorVisible =
		entryV2 && entryState.phase === "error" && reconcileState !== "found";

	// ---- Explicit receipt recording mode (image source only) ----
	// Honest reconciliation: the printed items are summed as-is, never adjusted.
	// Switching mode must never change the confirmed total, only how it is split.
	const receiptReconciliation =
		entryState.source === "image" && receiptExtraction
			? reconcileReceipt(receiptExtraction)
			: null;
	const receiptHasItems = receiptReconciliation?.hasItems === true;
	const receiptModeItems =
		entryState.source === "image" && receiptMode === "items";
	const receiptConfirmedTotal = receiptReconciliation?.total ?? null;
	const receiptItemsMatchTotal =
		receiptConfirmedTotal === null
			? true
			: draftsMatchConfirmedTotal(entryState.drafts, receiptConfirmedTotal);
	const receiptDiscrepancyVisible = receiptModeItems && !receiptItemsMatchTotal;
	const receiptDiscrepancyBlocked =
		receiptDiscrepancyVisible && !receiptDiscrepancyAcked;
	const receiptRecordedTotal = summariseDrafts(entryState.drafts).total;

	const savedTransactions: Transaction[] = entrySaved?.transactions ?? [];
	const firstSavedTransaction = savedTransactions[0];
	const successDrafts = entryState.drafts;
	const destinationWalletLabel = (() => {
		const destinationId =
			firstSavedTransaction?.wallet_id ?? successDrafts[0]?.walletId;
		return (
			wallets.find((wallet) => wallet.id === destinationId)?.name ??
			entryContext.label
		);
	})();
	const successAmount =
		firstSavedTransaction?.amount ?? successDrafts[0]?.amount ?? 0;
	const successDescription =
		firstSavedTransaction?.description ?? successDrafts[0]?.description ?? "";
	const successCount = savedTransactions.length || successDrafts.length;

	const reconcileMessage =
		reconcileState === "unconfirmed"
			? tx.reconcileUnconfirmed
			: reconcileState === "failed"
				? tx.reconcileFailed
				: tx.reconcileChecking;

	// Premium presentation only. An unknown save outcome must never look like a
	// certain failure or a certain success, so the composer surfaces it with a
	// status check that re-runs the EXISTING request-scoped reconciliation —
	// never a new write from an edited payload.
	const premiumUnknownActive =
		premium &&
		entryV2 &&
		Boolean(entryState.outcomeUnknown) &&
		(reconcileState === "unconfirmed" ||
			reconcileState === "failed" ||
			reconcileState === "checking");
	const premiumProcessing =
		submitting || entryBusy || reconcileState === "checking";
	const premiumUnknownOutcome = premiumUnknownActive
		? {
				message:
					reconcileState === "failed"
						? tx.reconcileFailed
						: reconcileState === "checking"
							? tx.reconcileChecking
							: tx.reconcileUnconfirmed,
				onCheckStatus: () => {
					const drafts =
						entryState.frozenDrafts.length > 0
							? entryState.frozenDrafts
							: entryState.drafts;
					void runEntryReconcile(drafts);
				},
			}
		: null;

	// Context switching with a live draft must be confirmed: the reducer clears
	// work on `context-changed`, so an unconfirmed switch would silently discard
	// the draft. Stale async results are already fenced by the generation bump.
	// Complete reconciliation resolves the displayed outcome without mutating
	// the persistence retry identity or its conservative unknown-outcome flags.
	const captureOutcomeResolved = entrySuccessVisible;
	const captureExitBlocked = submitting || Boolean(voiceRecording) || entryState.phase === "saving" || entryState.phase === "processing" || (!captureOutcomeResolved && (entryState.outcomeUnknown || entryOutcomeUnknownRef.current)) || autoSavePending;
	const captureExitDirty = !captureOutcomeResolved && (Boolean(textInput.trim() || receiptAsset || voiceAsset || voiceDraft || receiptDrafts.length) || hasUnsavedWork(entryState));
	const requestCaptureExit = useDraftExitGuard({
		enabled: premium, scopeKey: entryContext.id, dirty: captureExitDirty, blocked: captureExitBlocked, isEn,
		onDiscard: () => { resetEntryFlow(); resetCapture(true); },
	});
	const guardContextSwitch = (next: FinanceContextChoice) => {
		if (premium) {
			requestCaptureExit(() => {
				if (next.type === "personal") setPersonalContext();
				else setActiveHousehold(next.householdId);
			});
			return false;
		}
		if (!hasUnsavedWork(entryState)) return true;
		Alert.alert(
			isEn ? "Discard this draft?" : "Buang draf ini?",
			isEn
				? "Switching money space discards what you have typed."
				: "Ganti ruang uang akan membuang yang sudah kamu ketik.",
			[
				{ text: isEn ? "Keep editing" : "Lanjut mengedit", style: "cancel" },
				{
					text: isEn ? "Switch" : "Ganti",
					style: "destructive",
					onPress: () => {
						if (next.type === "personal") setPersonalContext();
						else setActiveHousehold(next.householdId);
					},
				},
			],
		);
		return false;
	};

	// Honest wallet readiness: a control must not look ready while the scoped
	// list is still resolving, and an empty context must offer to create one.
	const premiumWalletState: "loading" | "empty" | "ready" = walletLoading
		? "loading"
		: wallets.length === 0
			? "empty"
			: "ready";
	const premiumWalletLabel =
		wallets.find((wallet) => wallet.id === walletId)?.name ?? null;

	// ---- Premium batch review (P4) ----
	// Presentation only: the rows are a read-only projection of the same drafts
	// the atomic save already uses. Nothing here mints a request, re-orders the
	// batch, or touches the requestId/fingerprint.
	const premiumBatchActive =
		premium && entryV2 && entryState.drafts.length > 1;
	const premiumBatchRows: BatchReviewRow[] = useMemo(
		() =>
			entryState.drafts.map((draft) => {
				const draftErrors = { ...validateDraft(draft, { wallets, categories: categoryOptions, canCreate }), ...entryErrors[draft.key] };
				return {
					key: draft.key,
					description:
						draft.description || draft.merchant || tx.modeLabels.Teks,
					amount: draft.amount,
					category: draft.category || "—",
					walletName:
						wallets.find((wallet) => wallet.id === draft.walletId)?.name ?? "—",
					hasWarning: unacknowledgedWarnings(draft).length > 0,
					invalid: Boolean(
						draftErrors &&
							Object.values(draftErrors).some((value) => Boolean(value)),
					),
				};
			}),
		[entryState.drafts, entryErrors, wallets, categoryOptions, canCreate, tx.modeLabels.Teks],
	);
	const premiumBatchSignature = premiumBatchRows
		.map((row) => `${row.key}:${row.hasWarning ? 1 : 0}${row.invalid ? 1 : 0}`)
		.join("|");
	const [premiumBatchExpanded, setPremiumBatchExpanded] = useState<string[]>([]);
	// Problem rows open themselves; healthy rows stay folded. Keyed on a stable
	// signature so re-renders do not fight the user's manual toggles.
	useEffect(() => {
		if (!premiumBatchActive) {
			setPremiumBatchExpanded([]);
			return;
		}
		setPremiumBatchExpanded(initialExpandedKeys(premiumBatchRows));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [premiumBatchActive, premiumBatchSignature]);

	return (
		<PageEntrance testID="capture-page-entrance" style={styles.screen}>
			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={walletLoading || loading}
						onRefresh={loadWalletOptions}
						tintColor={theme.colors.brandPrimary}
					/>
				}
			>
				<StaggeredStack testIDPrefix="capture-entrance">
				<LinearGradient
					key="capture-header"
					testID="capture-header"
					colors={[fe.navySurface, fe.blueDeep, fe.blueBright]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.headerRow}
				>
					<View>
						<Text style={styles.title}>{simple ? tx.simpleTitle : tx.title}</Text>
						<Text style={styles.subtitle}>{simple ? tx.simplePromise : tx.subtitle}</Text>
						{quotaLabel(ent) ? <Text testID="capture-quota-label" style={styles.heroHelper}>{quotaLabel(ent)}</Text> : null}
					</View>
				</LinearGradient>

				{simple && !premium && workspace !== "success" && workspace !== "error" ? (
					<View key="capture-destination" testID="capture-destination" style={styles.destinationRow}>
						<Text style={styles.destinationLabel}>{tx.destinationLabel}</Text>
						<View style={styles.destinationControls}>
							<FinanceContextSwitcher />
							{renderWalletSelector()}
						</View>
					</View>
				) : null}

				{showWorkspaceIdle && (!premium || activeMode !== "Teks") ? (
				<View key="capture-input" testID="capture-input" style={styles.inputArea}>

					{!premium ? (
					<View testID={simple ? "capture-workspace-idle" : undefined} style={styles.modeGrid}>
						{captureModes.map((mode) => (
							<Pressable
								key={mode.id}
								testID={`capture-mode-${mode.id}`}
								accessibilityRole="button"
								accessibilityState={{ selected: activeMode === mode.id }}
								style={[styles.modeChip, activeMode === mode.id && styles.modeChipActive]}
								onPress={() => {
									if (mode.id === "Foto" && photoLocked(ent)) { router.push("/upgrade"); return; }
									setActiveMode(mode.id);
								}}
							>
								<KaswiseIcon
									name={mode.icon}
									size={14}
									weight="bold"
									color={activeMode === mode.id ? fe.ink : fe.slate}
								/>
								<Text style={[styles.modeChipText, activeMode === mode.id && styles.modeChipTextActive]}>{tx.modeLabels[mode.id]}</Text>
							</Pressable>
						))}
					</View>
					) : null}

					{!premium ? (
					<Text style={styles.inputHelper}>{tx.modeHelpers[activeMode]}</Text>
					) : null}

					{activeMode === "Teks" && !premium ? (
						<View style={styles.textContainer}>
							<TextInput
								style={styles.textArea}
								value={textInput}
								onChangeText={setTextInput}
								multiline
								accessibilityLabel={tx.textInputLabel}
								placeholder={tx.textPlaceholder}
								placeholderTextColor={theme.colors.textMuted}
							/>
							{simple ? null : renderWalletSelector()}
							<Pressable
								testID="capture-text-submit"
								accessibilityRole="button"
								accessibilityLabel={entryV2 ? tx.reviewAction : tx.processTextLabel}
								accessibilityState={{ disabled: submitting || entryBusy, busy: submitting || entryBusy }}
								style={[styles.submitButton, (submitting || entryBusy) && { opacity: 0.7 }]}
								onPress={entryV2 ? submitTextReview : submitText}
								disabled={submitting || entryBusy}
							>
								{submitting || entryBusy ? <ActivityIndicator color={fe.white} /> : <Text style={styles.submitButtonText}>{entryV2 ? tx.reviewAction : tx.processTextButton}</Text>}
							</Pressable>
						</View>
					) : null}

					{activeMode === "Foto" ? (
						<View style={styles.textContainer}>
							<Pressable
								testID="capture-receipt-back"
								accessibilityRole="button"
								accessibilityLabel={isEn ? "Back to entry menu" : "Kembali ke menu pencatatan"}
								accessibilityState={{ disabled: premiumProcessing || premiumUnknownActive }}
								disabled={premiumProcessing || premiumUnknownActive}
								style={[styles.receiptBackButton, (premiumProcessing || premiumUnknownActive) && { opacity: 0.5 }]}
								onPress={() => {
									if (premiumProcessing || premiumUnknownActive) return;
									setActiveMode(receiptReturnMode.current);
								}}
							>
								<Text style={styles.receiptBackText}>{isEn ? "← Back" : "← Kembali"}</Text>
							</Pressable>
							<View style={styles.receiptPickerCard}>
								{receiptAsset ? <Image source={{ uri: receiptAsset.uri }} style={styles.receiptPreviewImage} /> : <Text style={styles.receiptPlaceholderText}>{tx.receiptPlaceholder}</Text>}
							</View>
							{simple ? null : renderWalletSelector()}
							<Pressable testID="capture-receipt-pick" accessibilityRole="button" style={styles.secondaryButton} onPress={pickReceiptImage}>
								<Text style={styles.secondaryButtonText}>{receiptAsset ? tx.changeReceiptPhoto : tx.chooseReceiptPhoto}</Text>
							</Pressable>
							{simple ? null : (
								<Pressable testID="capture-receipt-process" accessibilityRole="button" accessibilityState={{ disabled: !receiptAsset || submitting, busy: submitting }} style={[styles.submitButton, (!receiptAsset || submitting) && { opacity: 0.7 }]} onPress={submitReceiptPhoto} disabled={!receiptAsset || submitting}>
									{submitting ? <ActivityIndicator color={fe.white} /> : <Text style={styles.submitButtonText}>{tx.processReceipt}</Text>}
								</Pressable>
							)}
							{receiptDraft ? renderReceiptReview() : null}
						</View>
					) : null}

					{activeMode === "Suara" ? (
						<View style={styles.textContainer}>
							<View testID="capture-voice-card" style={styles.voiceCard}>
								<KaswiseIcon
									name="notification"
									size={28}
									weight="bold"
									color={voiceRecording ? theme.colors.danger : theme.colors.brandPrimary}
								/>
								<Text style={styles.voiceTitle}>
									{voiceRecording
										? tx.voiceRecording
										: voiceDraft
											? (isEn ? "Review the extracted transaction before saving." : "Periksa hasil transaksi sebelum disimpan.")
											: voiceAsset ? tx.voiceReady : tx.voiceEmpty}
								</Text>
							</View>
							{simple ? null : renderWalletSelector()}
							<Pressable
								testID="capture-voice-record"
								accessibilityRole="button"
								style={voiceRecording ? styles.secondaryButton : styles.submitButton}
								onPress={voiceRecording ? stopVoiceRecording : startVoiceRecording}
								disabled={submitting}
							>
								<Text style={voiceRecording ? styles.secondaryButtonText : styles.submitButtonText}>
									{voiceRecording ? tx.voiceStop : tx.voiceRecord}
								</Text>
							</Pressable>
							{voiceAsset ? (
								<>
									<Pressable
										testID="capture-voice-process"
										accessibilityRole="button"
										accessibilityState={{ disabled: submitting, busy: submitting }}
										style={[styles.submitButton, submitting && { opacity: 0.7 }]}
										onPress={submitVoiceNote}
										disabled={submitting}
									>
										{submitting ? <ActivityIndicator color={fe.white} /> : <Text style={styles.submitButtonText}>{tx.voiceProcess}</Text>}
									</Pressable>
									<Pressable testID="capture-voice-reset" accessibilityRole="button" style={styles.secondaryButton} onPress={() => setVoiceAsset(null)} disabled={submitting}>
										<Text style={styles.secondaryButtonText}>{tx.voiceReset}</Text>
									</Pressable>
								</>
							) : null}
							{voiceDraft ? renderVoiceReview() : null}
						</View>
					) : null}
				</View>
				) : null}

				{premium && ((showWorkspaceIdle && activeMode === "Teks") || premiumUnknownActive) ? (
					<View
						key="capture-premium-composer"
						testID="capture-premium-composer"
						style={styles.inputArea}
					>
						<CaptureComposer
							value={textInput}
							onTextChange={setTextInput}
							onSubmitText={() => {
								void (entryV2 ? submitTextReview() : submitText());
							}}
							onOpenManual={openManualEntry}
							onOpenReceipt={() => {
								if (entitlementsLoading) {
									setPendingReceiptOpen(true);
									return;
								}
								if (photoLocked(ent)) {
									router.push("/upgrade");
									return;
								}
								setActiveMode("Foto");
							}}
							processing={premiumProcessing}
							canCreate={canCreate}
							voiceAvailable={featureFlags.voiceNote}
							onOpenVoice={() => setActiveMode("Suara")}
							showHero={false}
							helperText={tx.modeHelpers.Teks}
							unknownOutcome={premiumUnknownOutcome}
							contextLabel={entryContext.label}
							walletState={premiumWalletState}
							selectedWalletLabel={premiumWalletLabel ?? undefined}
							walletOptions={wallets.map((wallet) => ({
								id: wallet.id,
								name: wallet.name,
							}))}
							onSelectWallet={setWalletId}
							onCreateWallet={() => router.push("/(tabs)/wallets")}
							contextAccessory={
								<FinanceContextSwitcher
									presentation="sheet"
									beforeChange={guardContextSwitch}
								/>
							}
							copy={captureComposerCopy(language)}
						/>
					</View>
				) : null}

				{simple && workspace === "review" ? (
					<View key="capture-workspace-review" testID="capture-workspace-review" style={styles.inputArea}>
						{activeMode === "Foto" ? renderReceiptReview() : null}
						{activeMode === "Suara" ? renderVoiceReview() : null}
					</View>
				) : null}

				{entryV2 && !canCreate ? (
					<View key="capture-viewer-notice" testID="capture-viewer-notice" style={styles.feedbackCard}>
						<Text style={styles.feedbackTitle}>{isEn ? "View only" : "Hanya lihat"}</Text>
						<Text style={styles.feedbackSub}>{tx.viewerNoticeV2}</Text>
					</View>
				) : null}

				{entryV2 && error && (entryState.phase === "idle" || entryState.phase === "review") && canCreate ? (
					<View key="capture-entry-notice" testID="capture-entry-notice" style={styles.feedbackCard}>
						<Text style={styles.feedbackSub}>{error}</Text>
					</View>
				) : null}

				{entryReviewVisible ? (
					<View key="capture-entry-review" testID="capture-entry-review" style={styles.inputArea}>
						{autoSaveReason && entryState.source === "text" ? (
							<Text testID="auto-save-reason" style={styles.feedbackSub}>
								{autoSaveReasonText(autoSaveReason, isEn)}
							</Text>
						) : null}
						{entryState.source === "image" ? (
							<View testID="capture-receipt-preview" style={styles.receiptDraftCard}>
								<Text style={styles.suggestionLabel}>{tx.receiptPreviewTitle}</Text>
								{entryState.drafts.map((draft) => (
									<View key={draft.key} style={styles.receiptItemRow}>
										<Text style={styles.suggestionTitle}>{draft.description}</Text>
										<Text style={styles.suggestionMeta}>
											Rp {(draft.amount ?? 0).toLocaleString("id-ID")} · {draft.category} · {draft.date}
										</Text>
									</View>
								))}
								<Text style={styles.suggestionMeta} testID="capture-receipt-recorded-total">
									{`${entryState.drafts.length} ${entryCopy(language).countUnit} · ${formatRupiah(receiptRecordedTotal)}`}
								</Text>
								{receiptHasItems ? (
									<View style={styles.receiptModeBlock} testID="capture-receipt-mode">
										<Text style={styles.suggestionLabel}>{tx.receiptModeLabel}</Text>
										<View style={styles.receiptModeRow}>
											<Pressable
												testID="capture-receipt-total-mode"
												accessibilityRole="button"
												accessibilityLabel={tx.receiptModeTotal}
												accessibilityState={{ selected: receiptMode === "total" }}
												style={[
													styles.receiptModeChip,
													receiptMode === "total" && styles.receiptModeChipActive,
												]}
												onPress={() => switchReceiptMode("total")}
												disabled={entryState.phase === "saving"}
											>
												<Text
													style={[
														styles.receiptModeChipText,
														receiptMode === "total" && styles.receiptModeChipTextActive,
													]}
												>
													{tx.receiptModeTotal}
												</Text>
											</Pressable>
											<Pressable
												testID="capture-receipt-split"
												accessibilityRole="button"
												accessibilityLabel={tx.receiptModeItems}
												accessibilityState={{ selected: receiptMode === "items" }}
												style={[
													styles.receiptModeChip,
													receiptMode === "items" && styles.receiptModeChipActive,
												]}
												onPress={() => switchReceiptMode("items")}
												disabled={entryState.phase === "saving"}
											>
												<Text
													style={[
														styles.receiptModeChipText,
														receiptMode === "items" && styles.receiptModeChipTextActive,
													]}
												>
													{tx.receiptModeItems}
												</Text>
											</Pressable>
										</View>
									</View>
								) : null}
								{receiptDiscrepancyVisible ? (
									<View style={styles.receiptDiscrepancy} testID="capture-receipt-discrepancy">
										<Text style={styles.receiptDiscrepancyText} accessibilityRole="alert">
											{tx.receiptDiscrepancyBody(
												formatRupiah(Math.abs(receiptReconciliation?.discrepancy ?? 0)),
											)}
										</Text>
										{!receiptDiscrepancyAcked ? (
											<Pressable
												testID="capture-receipt-discrepancy-ack"
												accessibilityRole="button"
												accessibilityLabel={tx.receiptDiscrepancyAck}
												style={styles.receiptDiscrepancyAck}
												onPress={() => setReceiptDiscrepancyAcked(true)}
												disabled={entryState.phase === "saving"}
											>
												<Text style={styles.receiptDiscrepancyAckText}>
													{tx.receiptDiscrepancyAck}
												</Text>
											</Pressable>
										) : null}
									</View>
								) : null}
							</View>
						) : null}
						{premiumBatchActive ? (
							<BatchReviewList
								rows={premiumBatchRows}
								saveBlocked={receiptDiscrepancyBlocked || !allDraftsValid(entryState.drafts, { wallets, categories: categoryOptions, canCreate })}
								count={summariseDrafts(entryState.drafts).count}
								total={summariseDrafts(entryState.drafts).total}
								canCreate={canCreate}
								saving={entryState.phase === "saving"}
								expandedKeys={premiumBatchExpanded}
								onToggleRow={(key) =>
									setPremiumBatchExpanded((current) =>
										current.includes(key)
											? current.filter((candidate) => candidate !== key)
											: [...current, key],
									)
								}
								onEditRow={(key) =>
									setEntryPicker({ key, kind: "category" })
								}
								onSave={saveReviewedDrafts}
								copy={batchReviewCopy(language)}
								renderRowEditor={(row) => {
									const draft = entryState.drafts.find(
										(candidate) => candidate.key === row.key,
									);
									if (!draft) return null;
									return (
										<View>
										<DraftWarnings draft={draft} onAcknowledge={(key, field) => entryDispatch({ type: "draft-acknowledged", key, field })} />
										<TransactionFields
											draft={draft}
											onChange={(patch) =>
												entryDispatch({
													type: "draft-updated",
													key: row.key,
													patch,
												})
											}
											wallets={wallets.map((wallet) => ({
												id: wallet.id,
												name: wallet.name,
												is_active: wallet.is_active,
											}))}
											categories={categoryOptions.map((category) => ({
												name: category.name,
											}))}
											canCreate={canCreate}
											onOpenPicker={(kind) =>
												setEntryPicker({ key: row.key, kind })
											}
											errors={entryErrors[row.key]}
											testID={`draft-${row.key}`}
										/>
										</View>
									);
								}}
							/>
						) : (
						<TransactionReview
							saveBlocked={premium && receiptDiscrepancyBlocked}
							drafts={entryState.drafts}
							wallets={wallets.map((wallet) => ({
								id: wallet.id,
								name: wallet.name,
								is_active: wallet.is_active,
							}))}
							categories={categoryOptions.map((category) => ({
								name: category.name,
							}))}
							canCreate={canCreate}
							onChange={(key, patch) => entryDispatch({ type: "draft-updated", key, patch })}
							onAcknowledge={(key, field) => entryDispatch({ type: "draft-acknowledged", key, field })}
							onOpenPicker={(key, kind) => setEntryPicker({ key, kind })}
							onSave={saveReviewedDrafts}
							onCancel={resetEntryFlow}
							saving={entryState.phase === "saving"}
							errors={entryErrors}
							summary={summariseDrafts(entryState.drafts)}
						/>
						)}
						{entryState.source === "image" && !premium ? (
							<Pressable
								testID="capture-receipt-confirm"
								accessibilityRole="button"
								accessibilityState={{
									disabled: entryState.phase === "saving" || receiptDiscrepancyBlocked,
									busy: entryState.phase === "saving",
								}}
								style={[
									styles.submitButton,
									(entryState.phase === "saving" || receiptDiscrepancyBlocked) && { opacity: 0.7 },
								]}
								onPress={() => void saveReviewedDrafts()}
								disabled={entryState.phase === "saving" || receiptDiscrepancyBlocked}
							>
								<Text style={styles.submitButtonText}>{tx.saveReceiptTransaction}</Text>
							</Pressable>
						) : null}
					</View>
				) : null}

				{entryBusy ? (
					<View key="capture-entry-processing" testID="capture-entry-processing" style={styles.feedbackCard}>
						<ActivityIndicator color={theme.colors.brandPrimary} />
						<Text style={styles.feedbackTitle}>{tx.processingTitle}</Text>
						<Text style={styles.feedbackSub}>
							{entryState.phase === "saving" ? tx.savingSub : tx.processingSub}
						</Text>
					</View>
				) : null}

				{entryV2 && entryErrorVisible && !premiumUnknownActive ? (
					<View key="capture-entry-error" testID="capture-entry-error" style={styles.feedbackCard}>
						<Text style={styles.feedbackTitle}>{tx.errorTitle}</Text>
						<Text style={styles.feedbackSub}>{entryState.error ?? tx.errorFallback}</Text>
						{entryState.outcomeUnknown ? (
							<>
								<Text style={styles.suggestionMeta} testID="capture-reconcile">{reconcileMessage}</Text>
								{reconcileState === "checking" ? (
									<ActivityIndicator testID="capture-reconciling" color={theme.colors.brandPrimary} />
								) : null}
								{reconcileState === "unconfirmed" || reconcileState === "failed" ? (
									<Pressable
										testID="capture-reconcile-retry"
										accessibilityRole="button"
										style={styles.secondaryButton}
										onPress={() => {
											const drafts = entryState.frozenDrafts.length > 0 ? entryState.frozenDrafts : entryState.drafts;
											if (reconcileState === "failed") {
												void runEntryReconcile(drafts);
												return;
											}
											const generation = entryState.generation + 1;
											entryDispatch({ type: "processing-started" });
											entryDispatch({ type: "drafts-ready", generation, source: entryState.source ?? "text", drafts });
										}}
									>
										<Text style={styles.secondaryButtonText}>
											{reconcileState === "failed" ? tx.reconcileAgain : tx.reconcileRetry}
										</Text>
									</Pressable>
								) : null}
							</>
						) : (
							<Pressable
								testID="capture-entry-retry"
								accessibilityRole="button"
								style={styles.secondaryButton}
								onPress={() => entryDispatch({ type: "retry" })}
							>
								<Text style={styles.secondaryButtonText}>{tx.tryAgain}</Text>
							</Pressable>
						)}
					</View>
				) : null}

				{entrySuccessVisible ? (
					<View key="capture-entry-success" testID="capture-entry-success">
						<TransactionSuccess
							destinationLabel={destinationWalletLabel}
							description={successDescription}
							amount={successAmount}
							count={successCount}
							category={
								firstSavedTransaction?.category ??
								successDrafts[0]?.category ??
								null
							}
							onCaptureAnother={() => {
								resetEntryFlow();
								resetCapture(true);
							}}
							onViewTransactions={() => router.push("/(tabs)/transactions")}
						/>
					</View>
				) : null}

				{entryV2 ? (
					<View key="capture-entry-sheets" testID="capture-entry-sheets">
						<EntrySheet
							visible={entryPicker?.kind === "category"}
							title={entryCopy(language).categoryLabel}
							onClose={closeEntryPicker}
							testID="entry-category-sheet"
						>
							{categoryOptions.map((category) => (
								<Pressable
									key={category.id}
									testID={`entry-category-${category.id}`}
									accessibilityRole="button"
									style={styles.secondaryButton}
									onPress={() => {
										if (entryPicker) {
											entryDispatch({ type: "draft-updated", key: entryPicker.key, patch: { category: category.name } });
										}
										closeEntryPicker();
									}}
								>
									<Text style={styles.secondaryButtonText}>{category.name}</Text>
								</Pressable>
							))}
						</EntrySheet>
						<EntrySheet
							visible={entryPicker?.kind === "wallet"}
							title={entryCopy(language).walletLabel}
							onClose={closeEntryPicker}
							testID="entry-wallet-sheet"
						>
							{wallets.map((wallet) => (
								<Pressable
									key={wallet.id}
									testID={`entry-wallet-${wallet.id}`}
									accessibilityRole="button"
									style={styles.secondaryButton}
									onPress={() => {
										if (entryPicker) {
											entryDispatch({ type: "draft-updated", key: entryPicker.key, patch: { walletId: wallet.id } });
										}
										closeEntryPicker();
									}}
								>
									<Text style={styles.secondaryButtonText}>{wallet.name}</Text>
								</Pressable>
							))}
						</EntrySheet>
						<TransactionDatePickerSheet
							visible={entryPicker?.kind === "date"}
							value={entryPickerDraft?.date ?? localToday()}
							onChange={(next) => {
								if (entryPicker) {
									entryDispatch({ type: "draft-updated", key: entryPicker.key, patch: { date: next } });
								}
							}}
							onClose={closeEntryPicker}
						/>
					</View>
				) : null}

				{simple && !premium && workspace === "idle" ? (
					<View key="capture-secondary-actions" testID="capture-secondary-actions" style={styles.secondaryActions}>
						<Pressable
							testID="capture-secondary-manual"
							accessibilityRole="button"
							accessibilityLabel={tx.manualDetail}
							style={styles.secondaryButton}
							onPress={openManualEntry}
						>
							<Text style={styles.secondaryButtonText}>{tx.manualDetail}</Text>
						</Pressable>
						{featureFlags.importStatement ? (
							<Pressable
								testID="capture-secondary-import"
								accessibilityRole="button"
								accessibilityLabel={tx.importAction}
								style={styles.secondaryButton}
								onPress={() => router.push("/(tabs)/imports")}
							>
								<Text style={styles.secondaryButtonText}>{tx.importAction}</Text>
							</Pressable>
						) : null}
					</View>
				) : null}

				{!entryV2 && (isProcessing || (simple && submitting && !isSuccess && !isError)) && (
					<View key="capture-processing" testID="capture-processing" style={styles.feedbackCard}>
						<View style={styles.feedbackIconWrap}>
							<KaswiseIcon
								name="notification"
								color={theme.colors.textMuted}
								size={28}
								weight="bold"
							/>
						</View>
						<Text style={styles.feedbackTitle}>{tx.processingTitle}</Text>
						<Text style={styles.feedbackSub}>
							{queuedMessage ?? tx.processingSub}
						</Text>
						{loading && (
							<ActivityIndicator
								size="small"
								color={theme.colors.brandPrimary}
							/>
						)}
					</View>
				)}

				{!entryV2 && isSuccess && (
					<View key="capture-success" testID="capture-success" style={styles.feedbackCard}>
						<View style={styles.feedbackIconWrap}>
							<KaswiseIcon
								name="capture"
								color={theme.colors.success}
								size={30}
								weight="bold"
							/>
						</View>
						<Text style={styles.feedbackTitle}>{tx.successTitle}</Text>
						<Text style={styles.feedbackSub}>
							{queuedMessage ?? tx.successSub}
						</Text>
						{envelopeSuggestion ? (
							<View
								testID="capture-envelope-suggestion"
								style={styles.suggestionCard}
							>
								<Text style={styles.suggestionLabel}>{tx.budgetWallet}</Text>
								<Text style={styles.suggestionTitle}>
									{envelopeSuggestion.name}
								</Text>
								{typeof envelopeSuggestion.remaining_after_transaction ===
								"number" ? (
									<Text style={styles.suggestionMeta}>
										{tx.remainingAfter(
											Math.max(
												envelopeSuggestion.remaining_after_transaction,
												0,
											),
										)}
									</Text>
								) : null}
								{envelopeSuggestion.needs_review ? (
									<Text style={styles.suggestionWarning}>{tx.needsReview}</Text>
								) : null}
							</View>
						) : null}
						<Pressable
							testID="capture-success-review"
							accessibilityRole="button"
							accessibilityLabel={
								tx.viewReviewLabel
							}
							style={styles.secondaryButton}
							onPress={() => router.push("/(tabs)/transactions")}
						>
							<Text style={styles.secondaryButtonText}>{tx.viewReview}</Text>
						</Pressable>
						<Pressable
							testID={simple ? "capture-success-new" : undefined}
							accessibilityRole="button"
							accessibilityLabel={
								simple ? tx.captureAnother : tx.keepSavedLabel
							}
							style={styles.textLinkButton}
							onPress={() => resetCapture(true)}
						>
							<Text style={styles.textLink}>{simple ? tx.captureAnother : tx.keepSaved}</Text>
						</Pressable>
					</View>
				)}

				{!entryV2 && isError && (
					<View key="capture-error" testID="capture-error" style={styles.feedbackCard}>
						<View style={styles.feedbackIconWrap}>
							<KaswiseIcon
								name="notification"
								color={theme.colors.danger}
								size={28}
								weight="bold"
							/>
						</View>
						<Text style={styles.feedbackTitle}>{tx.errorTitle}</Text>
						<Text style={styles.feedbackSub}>
							{error || tx.errorFallback}
						</Text>
						<Pressable
							testID="capture-error-retry"
							accessibilityRole="button"
							accessibilityLabel={
								tx.tryAgainLabel
							}
							style={styles.secondaryButton}
							onPress={retryCapture}
						>
							<Text style={styles.secondaryButtonText}>{tx.tryAgain}</Text>
						</Pressable>
					</View>
				)}
				</StaggeredStack>


				<View style={{ height: 100 }} />
			</ScrollView>
			{entryV2 && autoSaveToastVisible && entryState.phase === "success" ? (
				<AutoSaveToast
					bottomOffset={premium ? Math.max(10, safeAreaInsets.bottom) + 64 + 16 : 16}
					title={`${isEn ? "Saved" : "Tersimpan"}: ${successDrafts[0]?.category ?? ""} · Rp${(successAmount ?? 0).toLocaleString("id-ID")}`}
					actionLabel={isEn ? "Undo" : "Batalkan"}
					editLabel={isEn ? "Edit" : "Ubah"}
					onUndo={() => void undoAutoSavedEntry()}
					onEdit={editAutoSavedEntry}
					onExpire={() => setAutoSaveToastVisible(false)}
				/>
			) : null}
			{undoFailureIds?.length ? (
				<View
					testID="capture-undo-error"
					accessibilityRole="alert"
					style={[
						styles.undoErrorBar,
						{ bottom: premium ? Math.max(10, safeAreaInsets.bottom) + 64 + 16 : 16 },
					]}
				>
					<Text style={styles.undoErrorText}>
						{isEn
							? "Undo failed — the entry is still saved."
							: "Batalkan gagal — transaksi masih tersimpan."}
					</Text>
					<Pressable
						testID="capture-undo-retry"
						accessibilityRole="button"
						disabled={undoRetrying}
						onPress={() => void retryUndoAutoSavedEntry()}
						style={styles.undoRetryButton}
					>
						<Text style={styles.undoRetryText}>
							{undoRetrying ? (isEn ? "Retrying…" : "Mencoba…") : isEn ? "Retry" : "Coba lagi"}
						</Text>
					</Pressable>
				</View>
			) : null}
		</PageEntrance>
	);
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
	return StyleSheet.create({
		screen: { flex: 1, backgroundColor: fe.paper },
		undoErrorBar: {
			position: "absolute",
			left: 16,
			right: 16,
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			paddingVertical: 12,
			paddingHorizontal: 16,
			borderRadius: 16,
			borderWidth: 1,
			borderColor: fe.danger,
			backgroundColor: fe.white,
		},
		undoErrorText: { flex: 1, color: fe.danger, fontSize: 13, lineHeight: 18 },
		undoRetryButton: { minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center" },
		undoRetryText: { color: fe.blue, fontWeight: "700", fontSize: 14 },
		content: { padding: 20, gap: 14, paddingBottom: 130 },
		headerRow: {
			minHeight: 132, borderRadius: 28, padding: 20, marginBottom: 4,
			overflow: "hidden", shadowColor: fe.navy, shadowOpacity: 0.18,
			shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8,
		},
		title: { color: fe.white, fontSize: 28, fontWeight: theme.typography.fontWeight.semibold, letterSpacing: -0.6 },
		subtitle: { color: "rgba(255,255,255,0.72)", fontSize: 13, marginTop: 4 },
		inputArea: {
			backgroundColor: "transparent",
			borderRadius: 0,
			borderWidth: 0,
			padding: 0,
			gap: 16,
		},
		inputHeader: { gap: 2 },
		inputTitle: {
			color: theme.colors.textPrimary,
			fontSize: 16,
			fontWeight: "800",
		},
		heroHelper: { color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 8 },
		inputHelper: { color: fe.muted, fontSize: 12 },
		modeGrid: {
			flexDirection: "row", gap: 0, padding: 4, borderRadius: 16, backgroundColor: fe.white,
		},
		modeChip: {
			flex: 1, minHeight: 44, borderRadius: 13, borderWidth: 0, backgroundColor: "transparent",
			paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
		},
		modeChipActive: { backgroundColor: fe.paper },
		modeChipText: { color: fe.slate, fontSize: 13, fontWeight: "500" },
		modeChipTextActive: { color: fe.ink, fontWeight: "600" },
		textContainer: { gap: 12 },
		receiptBackButton: {
			minHeight: 44,
			minWidth: 44,
			paddingHorizontal: 12,
			justifyContent: "center",
			alignSelf: "flex-start",
			borderRadius: 12,
		},
		receiptBackText: { color: fe.blue, fontSize: 14, fontWeight: "600" },
		receiptPickerCard: {
			minHeight: 190, borderRadius: 20, borderWidth: 0, backgroundColor: fe.white,
			alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 12,
		},
		receiptPreviewImage: {
			width: "100%",
			height: 220,
			borderRadius: 12,
		},
		receiptPlaceholderText: { color: fe.muted, fontSize: 13, textAlign: "center", lineHeight: 20 },
		voiceCard: {
			minHeight: 190, borderRadius: 20, borderWidth: 0, backgroundColor: fe.white,
			alignItems: "center", justifyContent: "center", padding: 20, gap: 14,
		},
		voiceTitle: { color: fe.slate, fontSize: 13, fontWeight: "500", textAlign: "center", lineHeight: 20 },
		receiptDraftCard: {
			backgroundColor: fe.white, borderRadius: 18, borderWidth: 0, padding: 14, gap: 10,
		},
		receiptItemRow: { gap: 2 },
		receiptModeBlock: { gap: 8, marginTop: 4 },
		receiptModeRow: { flexDirection: "row", gap: 8 },
		receiptModeChip: {
			flex: 1,
			minHeight: 44,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 1,
			borderColor: fe.line,
			borderRadius: 14,
			backgroundColor: fe.paper,
			paddingHorizontal: 12,
		},
		receiptModeChipActive: {
			borderColor: fe.blueDeep,
			backgroundColor: fe.navySurface,
		},
		receiptModeChipText: {
			color: fe.ink,
			fontSize: 12,
			fontWeight: "800",
		},
		receiptModeChipTextActive: { color: fe.white },
		receiptDiscrepancy: {
			gap: 10,
			backgroundColor: "rgba(138, 75, 8, 0.08)",
			borderWidth: 1,
			borderColor: "rgba(138, 75, 8, 0.24)",
			borderRadius: 14,
			padding: 12,
		},
		receiptDiscrepancyText: {
			color: fe.warning,
			fontSize: 12,
			fontWeight: "700",
			lineHeight: 18,
		},
		receiptDiscrepancyAck: {
			minHeight: 44,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 1,
			borderColor: fe.blueDeep,
			borderRadius: 999,
			paddingHorizontal: 16,
			alignSelf: "flex-start",
		},
		receiptDiscrepancyAckText: {
			color: fe.blueDeep,
			fontSize: 13,
			fontWeight: "800",
		},
		textArea: {
			minHeight: 130, borderWidth: 0, borderRadius: 18, color: fe.ink,
			backgroundColor: fe.white, padding: 16, fontSize: 15, textAlignVertical: "top",
		},
		submitButton: {
			backgroundColor: fe.ink, borderRadius: 16, paddingVertical: 15,
			alignItems: "center", justifyContent: "center",
		},
		submitButtonText: { color: fe.white, fontSize: 15, fontWeight: "600" },
		walletSelector: { gap: 8 },
		walletSelectorLabel: { color: fe.muted, fontSize: 12, fontWeight: "600" },
		walletChipRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
		walletChipTouch: {
			minHeight: 44,
			minWidth: 44,
			alignItems: "center",
			justifyContent: "center",
		},
		walletChip: {
			minHeight: 42, justifyContent: "center", borderRadius: 14, borderWidth: 0,
			backgroundColor: fe.white, paddingHorizontal: 14,
		},
		walletChipActive: { backgroundColor: fe.ink },
		walletChipText: { color: fe.slate, fontSize: 13, fontWeight: "500" },
		walletChipTextActive: { color: fe.white },
		walletEmptyText: { color: fe.muted, fontSize: 12, lineHeight: 18 },
		destinationRow: {
			backgroundColor: fe.white, borderRadius: 18, padding: 12, gap: 8,
		},
		destinationLabel: {
			color: fe.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4,
		},
		destinationControls: { gap: 8 },
		secondaryActions: { gap: 8 },
		comingSoonText: { color: fe.muted, fontSize: 12, textAlign: "center", marginTop: 8 },
		feedbackCard: {
			backgroundColor: fe.white, borderRadius: 18, borderWidth: 0, padding: 20,
			gap: 10, alignItems: "center",
		},
		feedbackIconWrap: {
			width: 48, height: 48, borderRadius: 24, backgroundColor: fe.paper,
			alignItems: "center", justifyContent: "center",
		},
		feedbackTitle: { color: fe.ink, fontSize: 16, fontWeight: "600", textAlign: "center" },
		feedbackSub: { color: fe.slate, fontSize: 13, textAlign: "center", lineHeight: 20 },
		suggestionCard: {
			alignSelf: "stretch", backgroundColor: fe.paper, borderRadius: 14, borderWidth: 0, padding: 14, gap: 4,
		},
		suggestionLabel: {
			color: fe.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4,
		},
		suggestionTitle: { color: fe.ink, fontSize: 15, fontWeight: "600" },
		suggestionMeta: { color: fe.slate, fontSize: 12, lineHeight: 18 },
		suggestionWarning: {
			color: theme.colors.warning,
			fontSize: 12,
			fontWeight: theme.typography.fontWeight.bold,
		},
		secondaryButton: {
			backgroundColor: fe.white, borderRadius: 14, paddingVertical: 12, minHeight: 46,
			justifyContent: "center", alignItems: "center", marginTop: 4,
		},
		secondaryButtonText: { color: fe.ink, fontSize: 13, fontWeight: "600" },
		textLinkButton: {
			minHeight: 44,
			justifyContent: "center",
			alignItems: "center",
		},
		textLink: { color: fe.muted, fontSize: 13, fontWeight: "500", textAlign: "center" },
	});
}
