import { useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
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
import { listCategories, type Category } from "../../src/services/categories";
import {
	classifyTransactionText,
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
					}
				: {
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
					},
		[isEn],
	);
	const styles = useMemo(() => createStyles(theme), [theme]);

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
			setCategoryOptions(
				categories.filter((category) => category.type !== "income"),
			);
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
				setError("Sesi login tidak ditemukan. Silakan login ulang.");
				setSubmitting(false);
				return;
			}

			const categoriesForClassification =
				categoryOptions.length > 0
					? categoryOptions
					: await listCategories().catch(() => [] as Category[]);
			const quickDraft = classifyTransactionText(
				value,
				categoriesForClassification,
			);

			if (!quickDraft) {
				setError(tx.amountRequired);
				setSubmitting(false);
				return;
			}

			const createdTransaction = await createTransaction(
				{
					wallet_id: walletId,
					transaction_type: quickDraft.transactionType,
					amount: quickDraft.amount,
					category: quickDraft.categoryName,
					description: quickDraft.note,
					date: quickDraft.date,
					note: quickDraft.note,
					merchant: quickDraft.merchant,
					input_type: "text",
					status: "done",
					raw_input: value,
					review_required: quickDraft.confidence < CLASSIFIER_HIGH_CONFIDENCE_THRESHOLD,
					confidence: quickDraft.confidence,
					ai_confidence: quickDraft.confidence,
					ai_extracted: {
						category_id: quickDraft.categoryId,
						category_name: quickDraft.categoryName,
						matched_keywords: quickDraft.matchedKeywords,
						matched_concept: quickDraft.matchedConcept,
					},
				},
				activeContext,
			);

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
			setQueuedMessage(tx.queued);
			setTextInput("");
			setSubmitting(false);
		} catch (e) {
			setError("Terjadi kesalahan sistem. Silakan coba lagi.");
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
		if (clearText) setTextInput("");
	};

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
						<Text style={styles.title}>Capture AI</Text>
						<Text style={styles.subtitle}>
							Catat otomatis dengan kecerdasan buatan.
						</Text>
					</View>
				</View>

				<View key="capture-input" testID="capture-input" style={styles.inputArea}>
					<View style={styles.inputHeader}>
						<Text style={styles.inputTitle}>Mode Teks</Text>
						<Text style={styles.inputHelper}>
							Ketik transaksi dengan bahasa natural
						</Text>
					</View>

					<View style={styles.textContainer}>
						<TextInput
							style={styles.textArea}
							value={textInput}
							onChangeText={setTextInput}
							multiline
							accessibilityLabel={
								isEn ? "Transaction text input" : "Input teks transaksi"
							}
							placeholder="Contoh: Beli kopi 35rb di Kopi Kenangan pakai QRIS"
							placeholderTextColor={theme.colors.textMuted}
						/>

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

						<Pressable
							accessibilityRole="button"
							accessibilityLabel={
								isEn
									? "Process transaction with AI"
									: "Proses transaksi dengan AI"
							}
							accessibilityState={{ disabled: submitting, busy: submitting }}
							style={[styles.submitButton, submitting && { opacity: 0.7 }]}
							onPress={submitText}
							disabled={submitting}
						>
							{submitting ? (
								<ActivityIndicator color={theme.colors.textInverse} />
							) : (
								<Text style={styles.submitButtonText}>Proses dengan AI</Text>
							)}
						</Pressable>

						<Text style={styles.comingSoonText}>
							Mode lain segera hadir: Foto · Suara · Import
						</Text>
					</View>
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
								isEn
									? "View and review transaction"
									: "Lihat dan review transaksi"
							}
							style={styles.secondaryButton}
							onPress={() => router.push("/(tabs)/transactions")}
						>
							<Text style={styles.secondaryButtonText}>Lihat & Review</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={
								isEn
									? "Save transaction immediately"
									: "Langsung simpan transaksi"
							}
							style={styles.textLinkButton}
							onPress={() => resetCapture(true)}
						>
							<Text style={styles.textLink}>Langsung simpan</Text>
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
						<Text style={styles.feedbackTitle}>Gagal memproses</Text>
						<Text style={styles.feedbackSub}>
							{error ||
								"Transaksi belum berhasil diproses. Coba lagi sebentar."}
						</Text>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={
								isEn ? "Try processing again" : "Coba proses lagi"
							}
							style={styles.secondaryButton}
							onPress={() => resetCapture(false)}
						>
							<Text style={styles.secondaryButtonText}>Coba Lagi</Text>
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
		textContainer: { gap: 12 },
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
