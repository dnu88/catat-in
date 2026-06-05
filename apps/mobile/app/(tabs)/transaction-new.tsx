import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { PageEntrance, StaggeredStack } from "../../src/components/motion";
import * as ExpoRouter from "expo-router";

import { IOSWheelDatePicker } from "../../src/components/date/IOSWheelDatePicker";
import { KaswiseIcon } from "../../src/components/icons/kaswise-icons";
import type { KaswiseIconName } from "../../src/components/icons/kaswise-icons";
import { IconBubble } from "../../src/components/ui";
import { LoadingState } from "../../src/components/ui/LoadingState";
import { useTheme } from "../../src/theme/theme-context";
import { useI18n } from "../../src/i18n/i18n-context";
import { useFinanceContext } from "../../src/state/finance-context";
import {
	createTransaction,
	getTransaction,
	type TransactionType,
	updateTransaction,
} from "../../src/services/transactions";
import { listWallets, type Wallet } from "../../src/services/wallets";
import { listCategories, type Category } from "../../src/services/categories";
import { areCategoryNamesEquivalent, getLocalizedCategoryName } from "../../src/services/category-taxonomy";

type CategoryOption = { name: string; icon: KaswiseIconName };

const categoryIcons: Record<string, KaswiseIconName> = {
	Makan: "food",
	"Makan & Minum": "food",
	"Makanan & Minuman": "food",
	"Food & Beverage": "food",
	Transport: "transport",
	Transportasi: "transport",
	Belanja: "groceries",
	"Belanja Bulanan": "groceries",
	"Belanja Pribadi": "groceries",
	Groceries: "groceries",
	"Rumah & Perawatan": "household",
	"Household & Personal Care": "household",
	"Personal Shopping": "groceries",
	Hiburan: "recreation",
	Entertainment: "recreation",
	Tagihan: "bills",
	Bills: "bills",
	Kesehatan: "sport",
	Health: "sport",
	Pendidikan: "file",
	Education: "file",
	Pendapatan: "card",
	Salary: "card",
	Bonus: "gift",
	Freelance: "investment",
	Lainnya: "otherExpenses",
	"Other expenses": "otherExpenses",
};

function fallbackCategories(isEn: boolean): CategoryOption[] {
	return [
		{ name: isEn ? "Food & Beverage" : "Makan & Minum", icon: "food" },
		{ name: isEn ? "Groceries" : "Belanja Bulanan", icon: "groceries" },
		{ name: isEn ? "Household & Personal Care" : "Rumah & Perawatan", icon: "household" },
		{ name: isEn ? "Personal Shopping" : "Belanja Pribadi", icon: "groceries" },
		{ name: isEn ? "Transport" : "Transportasi", icon: "transport" },
		{ name: isEn ? "Bills" : "Tagihan", icon: "bills" },
		{ name: isEn ? "Entertainment" : "Hiburan", icon: "recreation" },
		{ name: isEn ? "Health" : "Kesehatan", icon: "sport" },
		{ name: isEn ? "Education" : "Pendidikan", icon: "file" },
		{ name: isEn ? "Salary" : "Gaji", icon: "card" },
		{ name: "Bonus", icon: "gift" },
		{ name: "Freelance", icon: "investment" },
		{ name: isEn ? "Other expenses" : "Lainnya", icon: "otherExpenses" },
	];
}

function normalizeCategoryIcon(icon: string | null | undefined, name: string): KaswiseIconName {
	if (categoryIcons[name]) return categoryIcons[name];
	const iconName = (icon ?? "") as KaswiseIconName;
	if (iconName && [
		"food",
		"coffee",
		"transport",
		"bus",
		"sport",
		"recreation",
		"movie",
		"bills",
		"groceries",
		"household",
		"investment",
		"gift",
		"otherExpenses",
		"file",
		"card",
		"chart",
		"wallets",
		"insight",
		"budgets",
		"transactions",
	].includes(iconName)) {
		return iconName;
	}
	return categoryIcons[name] || "otherExpenses";
}

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

function parseAmount(raw: string): number {
	const cleaned = raw.replace(/[^\d]/g, "");
	if (!cleaned) return 0;
	return Number(cleaned);
}

function formatAmount(value: number): string {
	if (!value) return "";
	return value.toLocaleString("id-ID");
}



export default function TransactionNewScreen() {
	const { theme } = useTheme();
	const { language } = useI18n();
	const isEn = language === "en";
	const tx = useMemo(
		() =>
			isEn
				? {
						notFound: "Transaction not found",
						loadError: "Failed to load transaction form",
						readonlyError: "View-only access. You cannot change transactions in this context.",
						incompleteError: "Complete amount, category, and description first",
						dateError: "Date format must be YYYY-MM-DD",
						walletError: "Choose a valid wallet for the active context.",
						updateSuccess: "Transaction changes saved.",
						createSuccess: "Transaction saved.",
						updateFailed: "Failed to update transaction",
						createFailed: "Failed to save transaction",
						loading: "Loading transaction form...",
						editTitle: "Edit Transaction",
						createTitle: "Manual Entry",
						editSubtitle: "Update the details of an existing transaction.",
						createSubtitle: "Input a transaction manually without AI.",
						backLabel: "Back from manual entry",
						readonlyNotice: "View-only mode is active. Transactions cannot be created or changed.",
						expense: "Expense",
						income: "Income",
						pickExpense: "Choose expense",
						pickIncome: "Choose income",
						amount: "Amount",
						amountLabel: "Transaction amount",
						description: "Description",
						descriptionLabel: "Transaction description",
						descriptionPlaceholder: "example: Lunch at warteg",
						wallet: "Wallet",
						noWallet: "No active wallet. Wallet balance will not be updated.",
						pickWallet: (name: string) => `Choose wallet ${name}`,
						category: "Category",
						pickCategory: (name: string) => `Choose category ${name}`,
						customCategory: "Custom",
						pickCustomCategory: "Choose custom category",
						customCategoryLabel: "Custom category name",
						customCategoryPlaceholder: "Category name",
						date: "Date",
						dateLabel: "Transaction date",
						merchant: "Merchant (optional)",
						merchantLabel: "Optional transaction merchant",
						merchantPlaceholder: "example: Indomaret",
						note: "Note (optional)",
						noteLabel: "Optional transaction note",
						notePlaceholder: "example: grab ride from office to home",
						saveEditLabel: "Save transaction changes",
						saveCreateLabel: "Save manual transaction",
						saveEdit: "Save Changes",
						saveCreate: "Save Transaction",
						cancel: "Cancel",
						cancelLabel: "Cancel editing transaction",
					}
				: {
						notFound: "Transaksi tidak ditemukan",
						loadError: "Gagal memuat form transaksi",
						readonlyError: "Akses lihat saja. Kamu tidak bisa mengubah transaksi di konteks ini.",
						incompleteError: "Lengkapi nominal, kategori, dan deskripsi dulu",
						dateError: "Format tanggal harus YYYY-MM-DD",
						walletError: "Pilih dompet yang valid untuk konteks aktif.",
						updateSuccess: "Perubahan transaksi tersimpan.",
						createSuccess: "Transaksi tersimpan.",
						updateFailed: "Gagal memperbarui transaksi",
						createFailed: "Gagal menyimpan transaksi",
						loading: "Memuat form transaksi...",
						editTitle: "Edit Transaksi",
						createTitle: "Catat Manual",
						editSubtitle: "Perbarui detail transaksi yang sudah tercatat.",
						createSubtitle: "Input transaksi secara manual tanpa AI.",
						backLabel: "Kembali dari catat manual",
						readonlyNotice: "Mode lihat saja aktif. Transaksi tidak bisa dibuat atau diubah.",
						expense: "Pengeluaran",
						income: "Pemasukan",
						pickExpense: "Pilih pengeluaran",
						pickIncome: "Pilih pemasukan",
						amount: "Nominal",
						amountLabel: "Nominal transaksi",
						description: "Deskripsi",
						descriptionLabel: "Deskripsi transaksi",
						descriptionPlaceholder: "contoh: Makan siang di warteg",
						wallet: "Dompet",
						noWallet: "Belum ada dompet aktif. Saldo dompet tidak akan terupdate.",
						pickWallet: (name: string) => `Pilih dompet ${name}`,
						category: "Kategori",
						pickCategory: (name: string) => `Pilih kategori ${name}`,
						customCategory: "Kustom",
						pickCustomCategory: "Pilih kategori kustom",
						customCategoryLabel: "Nama kategori kustom",
						customCategoryPlaceholder: "Nama kategori",
						date: "Tanggal",
						dateLabel: "Tanggal transaksi",
						merchant: "Merchant (opsional)",
						merchantLabel: "Merchant transaksi opsional",
						merchantPlaceholder: "contoh: Indomaret",
						note: "Catatan (opsional)",
						noteLabel: "Catatan transaksi opsional",
						notePlaceholder: "contoh: bayar grab dari kantor pulang",
						saveEditLabel: "Simpan perubahan transaksi",
						saveCreateLabel: "Simpan transaksi manual",
						saveEdit: "Simpan Perubahan",
						saveCreate: "Simpan Transaksi",
						cancel: "Batal",
						cancelLabel: "Batal edit transaksi",
					},
		[isEn],
	);
	const { activeContext, canCreate } = useFinanceContext();
	const router = ExpoRouter.useRouter();
	const rawParams = (ExpoRouter as any).useLocalSearchParams?.() ?? {};
	const transactionId = Array.isArray(rawParams.transactionId)
		? rawParams.transactionId[0]
		: rawParams.transactionId;
	const isEditMode =
		typeof transactionId === "string" && transactionId.length > 0;
	const styles = useMemo(() => createStyles(theme), [theme]);
	const activeContextKey =
		activeContext.type === "household"
			? `household:${activeContext.householdId}:${activeContext.role}`
			: "personal";

	const [wallets, setWallets] = useState<Wallet[]>([]);
	const [categories, setCategories] =
		useState<CategoryOption[]>(() => fallbackCategories(isEn));
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const [txType, setTxType] = useState<TransactionType>("expense");
	const [amountInput, setAmountInput] = useState("");
	const [walletId, setWalletId] = useState<string | null>(null);
	const [category, setCategory] = useState<string>("");
	const [customCategory, setCustomCategory] = useState<string>("");
	const [description, setDescription] = useState("");
	const [date, setDate] = useState(todayIso());
	const [merchant, setMerchant] = useState("");
	const [note, setNote] = useState("");

	const loadRequestRef = useRef(0);

	const loadInitialData = useCallback(async () => {
		const requestId = ++loadRequestRef.current;
		const isCurrentRequest = () => loadRequestRef.current === requestId;

		setLoading(true);
		setError(null);
		setSuccessMessage(null);
		try {
			const [walletData, categoryData] = await Promise.all([
				listWallets(activeContext),
				listCategories().catch(() => [] as Category[]),
			]);
			if (!isCurrentRequest()) return;

			const activeWallets = walletData.filter((w) => w.is_active !== false);
			let categoryOptions = fallbackCategories(isEn);
			const defaultCategoryData = categoryData.filter(
				(c) => c.is_default !== false,
			);
			if (defaultCategoryData.length > 0) {
				categoryOptions = defaultCategoryData.map((c) => {
					const localizedName = getLocalizedCategoryName(c.name, isEn ? "en" : "id");
					return {
						name: localizedName,
						icon: normalizeCategoryIcon(c.icon, localizedName),
					};
				});
			}

			let transaction: Awaited<ReturnType<typeof getTransaction>> = null;
			if (isEditMode) {
				transaction = await getTransaction(transactionId);
				if (!isCurrentRequest()) return;
				if (!transaction) {
					setWallets(activeWallets);
					setWalletId(activeWallets[0]?.id ?? null);
					setCategories(categoryOptions);
					setError(tx.notFound);
					return;
				}
			}

			if (!isCurrentRequest()) return;
			setWallets(activeWallets);
			setCategories(categoryOptions);

			if (transaction) {
				const nextCategory = transaction.category || transaction.kategori || "";
				const nextWalletId = activeWallets.some(
					(wallet) => wallet.id === transaction?.wallet_id,
				)
					? (transaction.wallet_id ?? null)
					: (activeWallets[0]?.id ?? null);
				setTxType(
					transaction.transaction_type || transaction.type || "expense",
				);
				setAmountInput(
					formatAmount(Number(transaction.amount ?? transaction.nominal ?? 0)),
				);
				setWalletId(nextWalletId);
				const matchedCategoryOption = categoryOptions.find((option) =>
					areCategoryNamesEquivalent(option.name, nextCategory),
				);
				if (matchedCategoryOption) {
					setCategory(matchedCategoryOption.name);
					setCustomCategory("");
				} else if (nextCategory) {
					setCategory("__custom__");
					setCustomCategory(nextCategory);
				}
				setDescription(transaction.description || transaction.catatan || "");
				setDate(transaction.date || transaction.tanggal || todayIso());
				setMerchant(transaction.merchant || "");
				setNote(transaction.note || "");
			} else {
				// When this route is reused after leaving edit mode, clear any stale
				// transaction values so Manual Entry always starts from a blank form.
				setTxType("expense");
				setAmountInput("");
				setWalletId(activeWallets[0]?.id ?? null);
				setCategory("");
				setCustomCategory("");
				setDescription("");
				setDate(todayIso());
				setMerchant("");
				setNote("");
			}
		} catch (e) {
			if (!isCurrentRequest()) return;
			console.error("Failed to load form data:", e);
			setError(tx.loadError);
		} finally {
			if (isCurrentRequest()) setLoading(false);
		}
	}, [activeContext, activeContextKey, isEditMode, transactionId, isEn, tx]);

	useEffect(() => {
		void loadInitialData();
		return () => {
			loadRequestRef.current += 1;
		};
	}, [loadInitialData]);

	const amountValue = parseAmount(amountInput);
	const resolvedCategory = (
		category === "__custom__" ? customCategory : category
	).trim();
	const resolvedDescription = description.trim();
	const selectedWalletIsValid =
		walletId == null || wallets.some((wallet) => wallet.id === walletId);
	const canSubmit =
		canCreate &&
		amountValue > 0 &&
		resolvedCategory.length > 0 &&
		resolvedDescription.length > 0 &&
		!submitting;


	const resetForm = useCallback(() => {
		setTxType("expense");
		setAmountInput("");
		setWalletId(wallets[0]?.id ?? null);
		setCategory("");
		setCustomCategory("");
		setDescription("");
		setDate(todayIso());
		setMerchant("");
		setNote("");
	}, [wallets]);

	const onSubmit = async () => {
		if (!canCreate) {
			setError(tx.readonlyError);
			return;
		}
		if (!canSubmit) {
			setError(tx.incompleteError);
			return;
		}
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			setError(tx.dateError);
			return;
		}
		if (!selectedWalletIsValid) {
			setError(tx.walletError);
			return;
		}

		setSubmitting(true);
		setError(null);
		setSuccessMessage(null);
		const payload = {
			wallet_id: walletId,
			transaction_type: txType,
			amount: amountValue,
			category: resolvedCategory,
			description: resolvedDescription,
			merchant: merchant.trim() || null,
			date,
			note: note.trim() || null,
		};
		try {
			if (isEditMode) {
				await updateTransaction(transactionId, payload, activeContext);
				resetForm();
				setSuccessMessage(tx.updateSuccess);
				setSubmitting(false);
				return;
			}

			await createTransaction(payload, activeContext);
			resetForm();
			setSuccessMessage(tx.createSuccess);
			setSubmitting(false);
		} catch (e) {
			const message =
				e instanceof Error
					? e.message
					: isEditMode
						? tx.updateFailed
						: tx.createFailed;
			setError(message);
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<View style={styles.screen}>
				<LoadingState label={tx.loading} />
			</View>
		);
	}

	return (
		<PageEntrance testID="transaction-new-page-entrance" style={styles.screen}>
			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<StaggeredStack testIDPrefix="transaction-new-entrance">
				<View key="transaction-form-header" testID="transaction-form-header" style={styles.headerRow}>
					<View>
						<Text style={styles.title}>
							{isEditMode ? tx.editTitle : tx.createTitle}
						</Text>
						<Text style={styles.subtitle}>
							{isEditMode ? tx.editSubtitle : tx.createSubtitle}
						</Text>
					</View>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={tx.backLabel}
						onPress={() => router.back()}
						style={styles.closeBtn}
					>
						<KaswiseIcon
							name="back"
							color={theme.colors.textPrimary}
							size={16}
							weight="bold"
						/>
					</Pressable>
				</View>

				{!canCreate && (
					<View key="transaction-form-readonly" testID="transaction-form-readonly" style={styles.warningCard}>
						<Text style={styles.warningText}>
							{tx.readonlyNotice}
						</Text>
					</View>
				)}

				{/* Type Toggle */}
				<View key="transaction-form-type" testID="transaction-form-type" style={styles.typeRow}>
					{(["expense", "income"] as TransactionType[]).map((t) => (
						<Pressable
							key={t}
							accessibilityRole="button"
							accessibilityLabel={
								t === "expense" ? tx.pickExpense : tx.pickIncome
							}
							accessibilityState={{ selected: txType === t }}
							onPress={() => setTxType(t)}
							style={[
								styles.typeChip,
								txType === t && {
									backgroundColor:
										t === "income" ? theme.colors.success : theme.colors.danger,
									borderColor:
										t === "income" ? theme.colors.success : theme.colors.danger,
								},
							]}
						>
							<Text
								style={[
									styles.typeChipText,
									txType === t && { color: theme.colors.textInverse },
								]}
							>
								{t === "expense" ? tx.expense : tx.income}
							</Text>
						</Pressable>
					))}
				</View>

				{/* Amount */}
				<View key="transaction-form-amount" testID="transaction-form-amount" style={styles.field}>
					<Text style={styles.label}>{tx.amount}</Text>
					<View style={styles.amountRow}>
						<Text style={styles.amountPrefix}>Rp</Text>
						<TextInput
							accessibilityLabel={tx.amountLabel}
							style={styles.amountInput}
							value={formatAmount(amountValue)}
							onChangeText={(text) => setAmountInput(text)}
							placeholder="0"
							placeholderTextColor={theme.colors.textMuted}
							keyboardType="numeric"
						/>
					</View>
				</View>

				{/* Description */}
				<View key="transaction-form-description" testID="transaction-form-description" style={styles.field}>
					<Text style={styles.label}>{tx.description}</Text>
					<TextInput
						accessibilityLabel={tx.descriptionLabel}
						style={styles.textInput}
						value={description}
						onChangeText={setDescription}
						placeholder={tx.descriptionPlaceholder}
						placeholderTextColor={theme.colors.textMuted}
					/>
				</View>

				{/* Wallet */}
				<View key="transaction-form-wallet" testID="transaction-form-wallet" style={styles.field}>
					<Text style={styles.label}>{tx.wallet}</Text>
					{wallets.length === 0 ? (
						<View style={styles.warningCard}>
							<Text style={styles.warningText}>
								{tx.noWallet}
							</Text>
						</View>
					) : (
						<View style={styles.chipRow}>
							{wallets.map((w) => (
								<Pressable
									key={w.id}
									accessibilityRole="button"
									accessibilityLabel={tx.pickWallet(w.name)}
									accessibilityState={{ selected: walletId === w.id }}
									onPress={() => setWalletId(w.id)}
									style={[
										styles.chip,
										walletId === w.id && {
											backgroundColor: theme.colors.brandPrimary,
											borderColor: theme.colors.brandPrimary,
										},
									]}
								>
									<Text
										style={[
											styles.chipText,
											walletId === w.id && { color: theme.colors.textInverse },
										]}
									>
										{w.name}
									</Text>
								</Pressable>
							))}
						</View>
					)}
				</View>

				{/* Category */}
				<View key="transaction-form-category" testID="transaction-form-category" style={styles.field}>
					<Text style={styles.label}>{tx.category}</Text>
					<View style={styles.chipRow}>
						{categories.map((c) => (
							<Pressable
								key={c.name}
								accessibilityRole="button"
								accessibilityLabel={tx.pickCategory(c.name)}
								accessibilityState={{ selected: category === c.name }}
								onPress={() => setCategory(c.name)}
								style={[
									styles.chip,
									category === c.name && {
										backgroundColor: theme.colors.brandPrimary,
										borderColor: theme.colors.brandPrimary,
									},
								]}
							>
								<View style={styles.categoryChipContent}>
									<IconBubble
										name={c.icon}
										tone={category === c.name ? "accent" : "primary"}
										size={22}
									/>
									<Text
										style={[
											styles.chipText,
											category === c.name && {
												color: theme.colors.textInverse,
											},
										]}
									>
										{c.name}
									</Text>
								</View>
							</Pressable>
						))}
						{!isEditMode && (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={tx.pickCustomCategory}
								accessibilityState={{ selected: category === "__custom__" }}
								onPress={() => setCategory("__custom__")}
								style={[
									styles.chip,
									category === "__custom__" && {
										backgroundColor: theme.colors.brandPrimary,
										borderColor: theme.colors.brandPrimary,
									},
								]}
							>
								<Text
									style={[
										styles.chipText,
										category === "__custom__" && {
											color: theme.colors.textInverse,
										},
									]}
								>
									+ {tx.customCategory}
								</Text>
							</Pressable>
						)}
					</View>
					{category === "__custom__" && (
						<TextInput
							accessibilityLabel={tx.customCategoryLabel}
							style={styles.textInput}
							value={customCategory}
							onChangeText={setCustomCategory}
							placeholder={tx.customCategoryPlaceholder}
							placeholderTextColor={theme.colors.textMuted}
						/>
					)}
				</View>

				{/* Date */}
				<View key="transaction-form-date" testID="transaction-form-date" style={styles.field}>
					<Text style={styles.label}>{tx.date}</Text>
					<IOSWheelDatePicker
						value={date}
						onChange={setDate}
						locale={isEn ? "en" : "id"}
						testID="transaction-date-wheel-picker"
					/>
				</View>

				{/* Merchant */}
				<View key="transaction-form-merchant" testID="transaction-form-merchant" style={styles.field}>
					<Text style={styles.label}>{tx.merchant}</Text>
					<TextInput
						accessibilityLabel={tx.merchantLabel}
						style={styles.textInput}
						value={merchant}
						onChangeText={setMerchant}
						placeholder={tx.merchantPlaceholder}
						placeholderTextColor={theme.colors.textMuted}
					/>
				</View>

				{/* Note */}
				<View key="transaction-form-note" testID="transaction-form-note" style={styles.field}>
					<Text style={styles.label}>{tx.note}</Text>
					<TextInput
						accessibilityLabel={tx.noteLabel}
						style={[
							styles.textInput,
							{ minHeight: 70, textAlignVertical: "top" },
						]}
						value={note}
						onChangeText={setNote}
						placeholder={tx.notePlaceholder}
						placeholderTextColor={theme.colors.textMuted}
						multiline
					/>
				</View>

				{error && <Text key="transaction-form-error" testID="transaction-form-error" style={styles.errorText}>{error}</Text>}
				{successMessage && <Text key="transaction-form-success" testID="transaction-form-success" style={styles.successText}>{successMessage}</Text>}

				<View key="transaction-form-actions" style={styles.actionRow}>
					{isEditMode ? (
						<Pressable
							testID="transaction-form-cancel"
							accessibilityRole="button"
							accessibilityLabel={tx.cancelLabel}
							onPress={() => {
								resetForm();
								router.back();
							}}
							style={styles.cancelButton}
						>
							<Text style={styles.cancelText}>{tx.cancel}</Text>
						</Pressable>
					) : null}
					<Pressable
						testID="transaction-form-submit"
						accessibilityRole="button"
						accessibilityLabel={isEditMode ? tx.saveEditLabel : tx.saveCreateLabel}
						accessibilityState={{ disabled: !canSubmit, busy: submitting }}
						onPress={onSubmit}
						disabled={!canSubmit}
						style={[styles.submitButton, styles.actionButton, !canSubmit && { opacity: 0.4 }]}
					>
						{submitting ? (
							<ActivityIndicator color={theme.colors.textInverse} />
						) : (
							<Text style={styles.submitText}>
								{isEditMode ? tx.saveEdit : tx.saveCreate}
							</Text>
						)}
					</Pressable>
				</View>
				</StaggeredStack>


				<View style={{ height: 60 }} />
			</ScrollView>
		</PageEntrance>
	);
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
	return StyleSheet.create({
		screen: { flex: 1, backgroundColor: theme.colors.background },
		content: { padding: 20, gap: 16, paddingBottom: 30 },
		headerRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			gap: 12,
		},
		title: {
			color: theme.colors.textPrimary,
			fontSize: 26,
			fontWeight: "800",
			letterSpacing: -0.4,
		},
		subtitle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
		closeBtn: {
			minWidth: 44,
			minHeight: 44,
			borderRadius: 22,
			backgroundColor: theme.colors.mutedSurface,
			alignItems: "center",
			justifyContent: "center",
		},
		typeRow: { flexDirection: "row", gap: 10 },
		typeChip: {
			flex: 1,
			paddingVertical: 12,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.surface,
			alignItems: "center",
		},
		typeChipText: {
			color: theme.colors.textPrimary,
			fontSize: 14,
			fontWeight: "700",
		},
		field: { gap: 8 },
		label: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "700",
			textTransform: "uppercase",
		},
		amountRow: {
			flexDirection: "row",
			alignItems: "center",
			borderWidth: 1,
			borderColor: theme.colors.borderStrong,
			borderRadius: 12,
			backgroundColor: theme.colors.surface,
			paddingHorizontal: 14,
			paddingVertical: 10,
			gap: 8,
		},
		amountPrefix: {
			color: theme.colors.textSecondary,
			fontSize: 16,
			fontWeight: "700",
		},
		amountInput: {
			flex: 1,
			color: theme.colors.textPrimary,
			fontSize: 20,
			fontWeight: "800",
		},
		chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
		chip: {
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderRadius: 999,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.surface,
		},
		chipText: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "700",
		},
		categoryChipContent: { flexDirection: "row", alignItems: "center", gap: 6 },
		textInput: {
			borderWidth: 1,
			borderColor: theme.colors.borderStrong,
			borderRadius: 12,
			backgroundColor: theme.colors.surface,
			color: theme.colors.textPrimary,
			paddingHorizontal: 14,
			paddingVertical: 12,
			fontSize: 14,
		},
		warningCard: {
			padding: 12,
			borderRadius: 10,
			backgroundColor: `${theme.colors.warning}15`,
			borderWidth: 1,
			borderColor: `${theme.colors.warning}40`,
		},
		warningText: {
			color: theme.colors.warning,
			fontSize: 12,
			fontWeight: "600",
		},
		errorText: {
			color: theme.colors.danger,
			fontSize: 12,
			fontWeight: "600",
			backgroundColor: `${theme.colors.danger}10`,
			padding: 10,
			borderRadius: 10,
		},
		successText: {
			color: theme.colors.success,
			fontSize: 12,
			fontWeight: "700",
			backgroundColor: `${theme.colors.success}12`,
			padding: 10,
			borderRadius: 10,
		},
		actionRow: { flexDirection: "row", gap: 10, alignItems: "center" },
		actionButton: { flex: 1 },
		cancelButton: {
			flex: 1,
			borderRadius: 999,
			paddingVertical: 16,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 1,
			borderColor: theme.colors.borderStrong,
			backgroundColor: theme.colors.surface,
		},
		cancelText: {
			color: theme.colors.textPrimary,
			fontSize: 15,
			fontWeight: "800",
		},
		submitButton: {
			backgroundColor: theme.colors.brandPrimary,
			borderRadius: 999,
			paddingVertical: 16,
			alignItems: "center",
			justifyContent: "center",
			marginTop: 4,
		},
		submitText: {
			color: theme.colors.textInverse,
			fontSize: 15,
			fontWeight: "800",
		},
	});
}
