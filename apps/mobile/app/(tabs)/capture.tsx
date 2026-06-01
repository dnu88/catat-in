import { useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Image,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { PageEntrance, StaggeredStack } from "../../src/components/motion";
import { useRouter } from "expo-router";

import { useTransactionRealtime } from "../../src/hooks/useTransactionRealtime";
import { useI18n } from "../../src/i18n/i18n-context";
import { useSupabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/theme/theme-context";
import { IconBubble } from "../../src/components/ui";
import {
	KaswiseIcon,
	type KaswiseIconName,
} from "../../src/components/icons/kaswise-icons";
import { createEnvelopeAllocation } from "../../src/services/budget-envelopes";
import { createTransaction } from "../../src/services/transactions";
import {
	analyzeReceiptImage,
	receiptExtractionToDraft,
	uploadReceiptImage,
	type ReceiptExtraction,
	type ReceiptImageAsset,
	type ReceiptTransactionDraft,
} from "../../src/services/receipt-intake";
import { listCategories, type Category } from "../../src/services/categories";
import { getLocalizedCategoryName } from "../../src/services/category-taxonomy";
import {
	classifyTransactionTextBatch,
	CLASSIFIER_HIGH_CONFIDENCE_THRESHOLD,
} from "../../src/services/transaction-classifier";
import { listWallets, type Wallet } from "../../src/services/wallets";
import { useFinanceContext } from "../../src/state/finance-context";

const modes = [
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
	{
		id: "Rekam",
		label: "Suara",
		icon: "notification" as KaswiseIconName,
		helper: "Rekam suara transaksi (Whisper)",
	},
	{
		id: "Import",
		label: "Import",
		icon: "imports" as KaswiseIconName,
		helper: "Import mutasi bank & e-wallet",
	},
] as const;

type ModeId = (typeof modes)[number]["id"];
const enabledModes = modes.filter(
	(mode) => mode.id === "Teks" || mode.id === "Foto",
);

export default function CaptureScreen() {
	const { supabase } = useSupabase();
	const { theme } = useTheme();
	const { language } = useI18n();
	const router = useRouter();
	const { activeContext } = useFinanceContext();
	const isEn = language === "en";
	const tx = useMemo(
		() =>
			isEn
				? {
						title: "Capture AI",
						subtitle: "Track automatically with artificial intelligence.",
						modePrefix: "Mode",
						modeLabels: {
							Teks: "Text",
							Foto: "Photo",
							Rekam: "Voice",
							Import: "Import",
						},
						modeHelpers: {
							Teks: "Type a transaction in natural language",
							Foto: "Scan shopping receipts with OCR",
							Rekam: "Record transaction voice notes",
							Import: "Import bank and e-wallet statements",
						},
						textPlaceholder: "Example: Bought coffee 35k at Kopi Kenangan with QRIS",
						textInputLabel: "Transaction text input",
						processTextLabel: "Process transaction with AI",
						processTextButton: "Process with AI",
						walletLabel: "Wallet for sync",
						noWallet: "No active wallet. Saved transaction will not change wallet balance.",
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
					}
				: {
						title: "Capture AI",
						subtitle: "Catat otomatis dengan kecerdasan buatan.",
						modePrefix: "Mode",
						modeLabels: {
							Teks: "Teks",
							Foto: "Foto",
							Rekam: "Suara",
							Import: "Impor",
						},
						modeHelpers: {
							Teks: "Ketik transaksi dengan bahasa natural",
							Foto: "Scan struk belanja dengan OCR",
							Rekam: "Rekam suara transaksi",
							Import: "Impor mutasi bank dan e-wallet",
						},
						textPlaceholder: "Contoh: Beli kopi 35rb di Kopi Kenangan pakai QRIS",
						textInputLabel: "Input teks transaksi",
						processTextLabel: "Proses transaksi dengan AI",
						processTextButton: "Proses dengan AI",
						walletLabel: "Akun untuk sinkronisasi",
						noWallet: "Belum ada akun aktif. Transaksi tersimpan tanpa mengubah saldo akun.",
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
					},
		[isEn],
	);
	const styles = useMemo(() => createStyles(theme), [theme]);

	const [activeMode, setActiveMode] = useState<ModeId>("Teks");
	const [textInput, setTextInput] = useState("");
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
	const [receiptDraft, setReceiptDraft] = useState<ReceiptTransactionDraft | null>(null);
	const [receiptPath, setReceiptPath] = useState<string | null>(null);
	const [receiptExtraction, setReceiptExtraction] = useState<ReceiptExtraction | null>(null);
	const persistedSuggestionKeyRef = useRef<string | null>(null);

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
			setWallets([]);
			setCategoryOptions([]);
			setWalletId(null);
		} finally {
			setWalletLoading(false);
		}
	};

	useEffect(() => {
		void loadWalletOptions();
	}, [activeContext]);

	const submitText = async () => {
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

			const categoriesForClassification =
				categoryOptions.length > 0
					? categoryOptions
					: await listCategories().catch(() => [] as Category[]);
			const localizedCategoriesForClassification = categoriesForClassification.map((category) => ({
				...category,
				name: getLocalizedCategoryName(category.name, isEn ? "en" : "id"),
			}));
			const quickDrafts = classifyTransactionTextBatch(
				value,
				localizedCategoriesForClassification,
			);
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
			setQueuedMessage(
				quickDrafts.length > 1
					? tx.multiSaved(quickDrafts.length)
					: tx.queued,
			);
			setTextInput("");
			setSubmitting(false);
		} catch (e) {
			setError(tx.systemError);
			setSubmitting(false);
		}
	};


	const pickReceiptImage = async () => {
		setError(null);
		setQueuedMessage(null);
		setReceiptDraft(null);
		setReceiptPath(null);
		setReceiptExtraction(null);

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
		setReceiptAsset({
			uri: asset.uri,
			fileName: asset.fileName,
			mimeType: asset.mimeType,
		});
	};

	const submitReceiptPhoto = async () => {
		if (!receiptAsset || submitting) return;
		setSubmitting(true);
		setError(null);
		setQueuedMessage(null);

		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				throw new Error(tx.sessionMissing);
			}

			const [uploadedPath, extraction] = await Promise.all([
				uploadReceiptImage(supabase, user.id, receiptAsset),
				analyzeReceiptImage(supabase, receiptAsset),
			]);
			const draft = receiptExtractionToDraft(extraction);
			if (!draft) {
				throw new Error(
					tx.receiptAmountMissing,
				);
			}
			setReceiptPath(uploadedPath);
			setReceiptExtraction(extraction);
			setReceiptDraft(draft);
			setQueuedMessage(
				tx.receiptReadSuccess,
			);
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: tx.receiptProcessFallback,
			);
		} finally {
			setSubmitting(false);
		}
	};

	const confirmReceiptDraft = async () => {
		if (!receiptDraft || submitting) return;
		setSubmitting(true);
		setError(null);

		try {
			const createdTransaction = await createTransaction(
				{
					wallet_id: walletId,
					transaction_type: receiptDraft.transactionType,
					amount: receiptDraft.amount,
					category: receiptDraft.category,
					description: receiptDraft.description,
					date: receiptDraft.date,
					note: receiptDraft.description,
					merchant: receiptDraft.merchant,
					input_type: "image",
					status: "done",
					receipt_url: receiptPath,
					raw_input: receiptAsset?.fileName ?? "receipt_photo",
					ai_extracted: receiptExtraction,
					ai_confidence: receiptDraft.confidence,
					review_required: receiptDraft.reviewRequired,
					confidence: receiptDraft.confidence,
				},
				activeContext,
			);

			setOptimisticTransaction({
				id: createdTransaction.id,
				status: "done",
				confidence: receiptDraft.confidence,
				transaction_type: receiptDraft.transactionType,
				type: receiptDraft.transactionType,
				amount: receiptDraft.amount,
				nominal: receiptDraft.amount,
				category: receiptDraft.category,
				kategori: receiptDraft.category,
				description: receiptDraft.description,
				catatan: receiptDraft.description,
				merchant: receiptDraft.merchant,
				date: receiptDraft.date,
				tanggal: receiptDraft.date,
			});
			setTransactionId(createdTransaction.id);
			setQueuedMessage(
				tx.receiptSaved,
			);
		} catch (error) {
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
		(displayedTransaction?.confidence ?? 0) >= 0.85;
	const isError = Boolean(error) || displayedTransaction?.status === "error";
	const isProcessing = Boolean(transactionId) && !isSuccess && !isError;
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
		});
	}, [displayedTransaction, envelopeSuggestion, isSuccess, supabase]);

	const resetCapture = (clearText = true) => {
		setTransactionId(null);
		setOptimisticTransaction(null);
		setSubmitting(false);
		setQueuedMessage(null);
		setError(null);
		if (clearText) {
			setTextInput("");
			setReceiptAsset(null);
			setReceiptDraft(null);
			setReceiptPath(null);
			setReceiptExtraction(null);
		}
	};

	const renderWalletSelector = () => (
		<View style={styles.walletSelector}>
			<Text style={styles.walletSelectorLabel}>{tx.walletLabel}</Text>
			{wallets.length > 0 ? (
				<ScrollView horizontal showsHorizontalScrollIndicator={false}>
					<View style={styles.walletChipRow}>
						{wallets.map((wallet) => (
							<Pressable
								key={wallet.id}
								accessibilityRole="button"
								accessibilityLabel={`${tx.walletLabel}: ${wallet.name}`}
								accessibilityState={{ selected: walletId === wallet.id }}
								style={[
									styles.walletChip,
									walletId === wallet.id && styles.walletChipActive,
								]}
								onPress={() => setWalletId(wallet.id)}
							>
								<Text
									style={[
										styles.walletChipText,
										walletId === wallet.id && styles.walletChipTextActive,
									]}
								>
									{wallet.name}
								</Text>
							</Pressable>
						))}
					</View>
				</ScrollView>
			) : (
				<Text style={styles.walletEmptyText}>{tx.noWallet}</Text>
			)}
		</View>
	);

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
				<View key="capture-header" testID="capture-header" style={styles.headerRow}>
					<View>
						<Text style={styles.title}>{tx.title}</Text>
						<Text style={styles.subtitle}>{tx.subtitle}</Text>
					</View>
				</View>

				<View key="capture-input" testID="capture-input" style={styles.inputArea}>
					<View style={styles.modeGrid}>
						{enabledModes.map((mode) => (
							<Pressable
								key={mode.id}
								testID={`capture-mode-${mode.id}`}
								accessibilityRole="button"
								accessibilityState={{ selected: activeMode === mode.id }}
								style={[styles.modeChip, activeMode === mode.id && styles.modeChipActive]}
								onPress={() => setActiveMode(mode.id)}
							>
								<KaswiseIcon
									name={mode.icon}
									size={14}
									weight="bold"
									color={activeMode === mode.id ? theme.colors.textInverse : theme.colors.textSecondary}
								/>
								<Text style={[styles.modeChipText, activeMode === mode.id && styles.modeChipTextActive]}>{tx.modeLabels[mode.id]}</Text>
							</Pressable>
						))}
					</View>

					<View style={styles.inputHeader}>
						<Text style={styles.inputTitle}>{tx.modePrefix} {tx.modeLabels[activeMode]}</Text>
						<Text style={styles.inputHelper}>{tx.modeHelpers[activeMode]}</Text>
					</View>

					{activeMode === "Teks" ? (
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
							{renderWalletSelector()}
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={tx.processTextLabel}
								accessibilityState={{ disabled: submitting, busy: submitting }}
								style={[styles.submitButton, submitting && { opacity: 0.7 }]}
								onPress={submitText}
								disabled={submitting}
							>
								{submitting ? <ActivityIndicator color={theme.colors.textInverse} /> : <Text style={styles.submitButtonText}>{tx.processTextButton}</Text>}
							</Pressable>
						</View>
					) : null}

					{activeMode === "Foto" ? (
						<View style={styles.textContainer}>
							<View style={styles.receiptPickerCard}>
								{receiptAsset ? <Image source={{ uri: receiptAsset.uri }} style={styles.receiptPreviewImage} /> : <Text style={styles.receiptPlaceholderText}>{tx.receiptPlaceholder}</Text>}
							</View>
							{renderWalletSelector()}
							<Pressable testID="capture-receipt-pick" accessibilityRole="button" style={styles.secondaryButton} onPress={pickReceiptImage}>
								<Text style={styles.secondaryButtonText}>{receiptAsset ? tx.changeReceiptPhoto : tx.chooseReceiptPhoto}</Text>
							</Pressable>
							<Pressable testID="capture-receipt-process" accessibilityRole="button" accessibilityState={{ disabled: !receiptAsset || submitting, busy: submitting }} style={[styles.submitButton, (!receiptAsset || submitting) && { opacity: 0.7 }]} onPress={submitReceiptPhoto} disabled={!receiptAsset || submitting}>
								{submitting ? <ActivityIndicator color={theme.colors.textInverse} /> : <Text style={styles.submitButtonText}>{tx.processReceipt}</Text>}
							</Pressable>
							{receiptDraft ? (
								<View testID="capture-receipt-preview" style={styles.receiptDraftCard}>
									<Text style={styles.suggestionLabel}>{tx.receiptPreviewTitle}</Text>
									<Text style={styles.suggestionTitle}>{receiptDraft.description}</Text>
									<Text style={styles.suggestionMeta}>Rp {receiptDraft.amount.toLocaleString("id-ID")} · {receiptDraft.category} · {receiptDraft.date}</Text>
									{receiptDraft.reviewRequired ? <Text style={styles.suggestionWarning}>{tx.needsReview}</Text> : null}
									<Pressable testID="capture-receipt-confirm" accessibilityRole="button" style={styles.submitButton} onPress={confirmReceiptDraft} disabled={submitting}>
										<Text style={styles.submitButtonText}>{tx.saveReceiptTransaction}</Text>
									</Pressable>
								</View>
							) : null}
						</View>
					) : null}
				</View>

				{isProcessing && (
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

				{isSuccess && (
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
							{tx.successSub}
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
							accessibilityRole="button"
							accessibilityLabel={
								tx.keepSavedLabel
							}
							style={styles.textLinkButton}
							onPress={() => resetCapture(true)}
						>
							<Text style={styles.textLink}>{tx.keepSaved}</Text>
						</Pressable>
					</View>
				)}

				{isError && (
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
							accessibilityRole="button"
							accessibilityLabel={
								tx.tryAgainLabel
							}
							style={styles.secondaryButton}
							onPress={() => resetCapture(false)}
						>
							<Text style={styles.secondaryButtonText}>{tx.tryAgain}</Text>
						</Pressable>
					</View>
				)}
				</StaggeredStack>


				<View style={{ height: 100 }} />
			</ScrollView>
		</PageEntrance>
	);
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
	return StyleSheet.create({
		screen: { flex: 1, backgroundColor: theme.colors.background },
		content: { padding: 20, gap: 12, paddingBottom: 26 },
		headerRow: { marginBottom: 4 },
		title: {
			color: theme.colors.textPrimary,
			fontSize: theme.typography.fontSize["4xl"],
			fontWeight: theme.typography.fontWeight.extrabold,
			letterSpacing: theme.typography.letterSpacing.tight,
		},
		subtitle: {
			color: theme.colors.textSecondary,
			fontSize: theme.typography.fontSize.sm,
			marginTop: 2,
		},
		inputArea: {
			backgroundColor: theme.colors.surface,
			borderRadius: 20,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 16,
			gap: 16,
		},
		inputHeader: { gap: 2 },
		inputTitle: {
			color: theme.colors.textPrimary,
			fontSize: 16,
			fontWeight: "800",
		},
		inputHelper: { color: theme.colors.textSecondary, fontSize: 12 },
		modeGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		modeChip: {
			minHeight: 40,
			borderRadius: 999,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.mutedSurface,
			paddingHorizontal: 12,
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},
		modeChipActive: {
			backgroundColor: theme.colors.brandPrimary,
			borderColor: theme.colors.brandPrimary,
		},
		modeChipText: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: theme.typography.fontWeight.bold,
		},
		modeChipTextActive: { color: theme.colors.textInverse },
		textContainer: { gap: 12 },
		receiptPickerCard: {
			minHeight: 180,
			borderRadius: 16,
			borderWidth: 1,
			borderColor: theme.colors.borderStrong,
			backgroundColor: theme.colors.mutedSurface,
			alignItems: "center",
			justifyContent: "center",
			overflow: "hidden",
			padding: 12,
		},
		receiptPreviewImage: {
			width: "100%",
			height: 220,
			borderRadius: 12,
		},
		receiptPlaceholderText: {
			color: theme.colors.textMuted,
			fontSize: 13,
			textAlign: "center",
			lineHeight: 20,
		},
		receiptDraftCard: {
			backgroundColor: theme.colors.card,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 12,
			gap: 8,
		},
		textArea: {
			minHeight: 120,
			borderWidth: 1,
			borderColor: theme.colors.borderStrong,
			borderRadius: 14,
			color: theme.colors.textPrimary,
			backgroundColor: theme.colors.mutedSurface,
			padding: 14,
			fontSize: 14,
			textAlignVertical: "top",
		},
		submitButton: {
			backgroundColor: theme.colors.brandPrimary,
			borderRadius: theme.radius.pill,
			paddingVertical: 14,
			alignItems: "center",
			justifyContent: "center",
		},
		submitButtonText: {
			color: theme.colors.textInverse,
			fontSize: theme.typography.fontSize.lg,
			fontWeight: theme.typography.fontWeight.bold,
		},
		walletSelector: { gap: 8 },
		walletSelectorLabel: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "700",
		},
		walletChipRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
		walletChip: {
			minHeight: 40,
			justifyContent: "center",
			borderRadius: 999,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.mutedSurface,
			paddingHorizontal: 12,
		},
		walletChipActive: {
			backgroundColor: theme.colors.brandPrimary,
			borderColor: theme.colors.brandPrimary,
		},
		walletChipText: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "800",
		},
		walletChipTextActive: { color: theme.colors.textInverse },
		walletEmptyText: {
			color: theme.colors.warning,
			fontSize: 12,
			lineHeight: 18,
		},
		comingSoonText: {
			color: theme.colors.textMuted,
			fontSize: 12,
			textAlign: "center",
			marginTop: 8,
		},
		feedbackCard: {
			backgroundColor: theme.colors.card,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 20,
			gap: 10,
			alignItems: "center",
		},
		feedbackIconWrap: {
			width: 48,
			height: 48,
			borderRadius: 24,
			backgroundColor: theme.colors.mutedSurface,
			alignItems: "center",
			justifyContent: "center",
		},
		feedbackTitle: {
			color: theme.colors.textPrimary,
			fontSize: 16,
			fontWeight: "800",
			textAlign: "center",
		},
		feedbackSub: {
			color: theme.colors.textSecondary,
			fontSize: 13,
			textAlign: "center",
			lineHeight: 20,
		},
		suggestionCard: {
			alignSelf: "stretch",
			backgroundColor: theme.colors.card,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 12,
			gap: 4,
		},
		suggestionLabel: {
			color: theme.colors.textSecondary,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.bold,
			textTransform: "uppercase",
			letterSpacing: 0.4,
		},
		suggestionTitle: {
			color: theme.colors.brandPrimary,
			fontSize: 15,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		suggestionMeta: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			lineHeight: 18,
		},
		suggestionWarning: {
			color: theme.colors.warning,
			fontSize: 12,
			fontWeight: theme.typography.fontWeight.bold,
		},
		secondaryButton: {
			backgroundColor: theme.iconBubbles.primary.background,
			borderRadius: 999,
			paddingVertical: 10,
			minHeight: 44,
			justifyContent: "center",
			alignItems: "center",
			marginTop: 4,
		},
		secondaryButtonText: {
			color: theme.colors.brandPrimary,
			fontSize: 13,
			fontWeight: "700",
		},
		textLinkButton: {
			minHeight: 44,
			justifyContent: "center",
			alignItems: "center",
		},
		textLink: {
			color: theme.colors.textMuted,
			fontSize: 13,
			fontWeight: "700",
			textAlign: "center",
		},
	});
}
