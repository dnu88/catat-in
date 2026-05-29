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

import { KaswiseIcon } from "../../src/components/icons/kaswise-icons";
import type { KaswiseIconName } from "../../src/components/icons/kaswise-icons";
import { IconBubble } from "../../src/components/ui";
import { LoadingState } from "../../src/components/ui/LoadingState";
import { useTheme } from "../../src/theme/theme-context";
import { useFinanceContext } from "../../src/state/finance-context";
import {
	createTransaction,
	getTransaction,
	type TransactionType,
	updateTransaction,
} from "../../src/services/transactions";
import { listWallets, type Wallet } from "../../src/services/wallets";
import { listCategories, type Category } from "../../src/services/categories";

type CategoryOption = { name: string; icon: KaswiseIconName };

const categoryIcons: Record<string, KaswiseIconName> = {
	Makan: "chart",
	Transport: "transactions",
	Belanja: "wallets",
	Hiburan: "insight",
	Tagihan: "bills",
	Kesehatan: "budgets",
	Pendidikan: "file",
	Pendapatan: "card",
	Lainnya: "card",
};

const fallbackCategories: CategoryOption[] = [
	{ name: "Makan", icon: "chart" },
	{ name: "Transport", icon: "transactions" },
	{ name: "Belanja", icon: "wallets" },
	{ name: "Hiburan", icon: "insight" },
	{ name: "Tagihan", icon: "bills" },
	{ name: "Kesehatan", icon: "budgets" },
	{ name: "Pendidikan", icon: "file" },
	{ name: "Pendapatan", icon: "card" },
	{ name: "Lainnya", icon: "card" },
];

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
		useState<CategoryOption[]>(fallbackCategories);
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
			let categoryOptions = fallbackCategories;
			if (categoryData.length > 0) {
				const merged = categoryData.map((c) => ({
					name: c.name,
					icon: categoryIcons[c.name] || "card",
				}));
				const merger = [...merged];
				for (const fc of fallbackCategories) {
					if (
						!merger.some((m) => m.name.toLowerCase() === fc.name.toLowerCase())
					) {
						merger.push(fc);
					}
				}
				categoryOptions = merger;
			}

			let transaction: Awaited<ReturnType<typeof getTransaction>> = null;
			if (isEditMode) {
				transaction = await getTransaction(transactionId);
				if (!isCurrentRequest()) return;
				if (!transaction) {
					setWallets(activeWallets);
					setWalletId(activeWallets[0]?.id ?? null);
					setCategories(categoryOptions);
					setError("Transaksi tidak ditemukan");
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
				if (categoryOptions.some((option) => option.name === nextCategory)) {
					setCategory(nextCategory);
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
				setWalletId((currentWalletId) =>
					activeWallets.some((wallet) => wallet.id === currentWalletId)
						? currentWalletId
						: (activeWallets[0]?.id ?? null),
				);
			}
		} catch (e) {
			if (!isCurrentRequest()) return;
			console.error("Failed to load form data:", e);
			setError("Gagal memuat form transaksi");
		} finally {
			if (isCurrentRequest()) setLoading(false);
		}
	}, [activeContext, activeContextKey, isEditMode, transactionId]);

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

	const onSubmit = async () => {
		if (!canCreate) {
			setError("Akses lihat saja. Kamu tidak bisa mengubah transaksi di konteks ini.");
			return;
		}
		if (!canSubmit) {
			setError("Lengkapi nominal, kategori, dan deskripsi dulu");
			return;
		}
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			setError("Format tanggal harus YYYY-MM-DD");
			return;
		}
		if (!selectedWalletIsValid) {
			setError("Pilih dompet yang valid untuk konteks aktif.");
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
				setSuccessMessage("Perubahan transaksi tersimpan.");
				setSubmitting(false);
				return;
			}

			await createTransaction(payload, activeContext);
			router.replace("/(tabs)/transactions");
		} catch (e) {
			const message =
				e instanceof Error
					? e.message
					: isEditMode
						? "Gagal memperbarui transaksi"
						: "Gagal menyimpan transaksi";
			setError(message);
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<View style={styles.screen}>
				<LoadingState label="Memuat form transaksi..." />
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
							{isEditMode ? "Edit Transaksi" : "Catat Manual"}
						</Text>
						<Text style={styles.subtitle}>
							{isEditMode
								? "Perbarui detail transaksi yang sudah tercatat."
								: "Input transaksi secara manual tanpa AI."}
						</Text>
					</View>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Kembali dari catat manual"
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
							Mode lihat saja aktif. Transaksi tidak bisa dibuat atau diubah.
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
								t === "expense" ? "Pilih pengeluaran" : "Pilih pemasukan"
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
								{t === "expense" ? "Pengeluaran" : "Pemasukan"}
							</Text>
						</Pressable>
					))}
				</View>

				{/* Amount */}
				<View key="transaction-form-amount" testID="transaction-form-amount" style={styles.field}>
					<Text style={styles.label}>Nominal</Text>
					<View style={styles.amountRow}>
						<Text style={styles.amountPrefix}>Rp</Text>
						<TextInput
							accessibilityLabel="Nominal transaksi"
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
					<Text style={styles.label}>Deskripsi</Text>
					<TextInput
						accessibilityLabel="Deskripsi transaksi"
						style={styles.textInput}
						value={description}
						onChangeText={setDescription}
						placeholder="contoh: Makan siang di warteg"
						placeholderTextColor={theme.colors.textMuted}
					/>
				</View>

				{/* Wallet */}
				<View key="transaction-form-wallet" testID="transaction-form-wallet" style={styles.field}>
					<Text style={styles.label}>Dompet</Text>
					{wallets.length === 0 ? (
						<View style={styles.warningCard}>
							<Text style={styles.warningText}>
								Belum ada dompet aktif. Saldo dompet tidak akan terupdate.
							</Text>
						</View>
					) : (
						<View style={styles.chipRow}>
							{wallets.map((w) => (
								<Pressable
									key={w.id}
									accessibilityRole="button"
									accessibilityLabel={`Pilih dompet ${w.name}`}
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
					<Text style={styles.label}>Kategori</Text>
					<View style={styles.chipRow}>
						{categories.map((c) => (
							<Pressable
								key={c.name}
								accessibilityRole="button"
								accessibilityLabel={`Pilih kategori ${c.name}`}
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
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Pilih kategori kustom"
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
								+ Kustom
							</Text>
						</Pressable>
					</View>
					{category === "__custom__" && (
						<TextInput
							accessibilityLabel="Nama kategori kustom"
							style={styles.textInput}
							value={customCategory}
							onChangeText={setCustomCategory}
							placeholder="Nama kategori"
							placeholderTextColor={theme.colors.textMuted}
						/>
					)}
				</View>

				{/* Date */}
				<View key="transaction-form-date" testID="transaction-form-date" style={styles.field}>
					<Text style={styles.label}>Tanggal</Text>
					<TextInput
						accessibilityLabel="Tanggal transaksi"
						style={styles.textInput}
						value={date}
						onChangeText={setDate}
						placeholder="YYYY-MM-DD"
						placeholderTextColor={theme.colors.textMuted}
						autoCapitalize="none"
					/>
				</View>

				{/* Merchant */}
				<View key="transaction-form-merchant" testID="transaction-form-merchant" style={styles.field}>
					<Text style={styles.label}>Merchant (opsional)</Text>
					<TextInput
						accessibilityLabel="Merchant transaksi opsional"
						style={styles.textInput}
						value={merchant}
						onChangeText={setMerchant}
						placeholder="contoh: Indomaret"
						placeholderTextColor={theme.colors.textMuted}
					/>
				</View>

				{/* Note */}
				<View key="transaction-form-note" testID="transaction-form-note" style={styles.field}>
					<Text style={styles.label}>Catatan (opsional)</Text>
					<TextInput
						accessibilityLabel="Catatan transaksi opsional"
						style={[
							styles.textInput,
							{ minHeight: 70, textAlignVertical: "top" },
						]}
						value={note}
						onChangeText={setNote}
						placeholder="contoh: bayar grab dari kantor pulang"
						placeholderTextColor={theme.colors.textMuted}
						multiline
					/>
				</View>

				{error && <Text key="transaction-form-error" testID="transaction-form-error" style={styles.errorText}>{error}</Text>}
				{successMessage && <Text key="transaction-form-success" testID="transaction-form-success" style={styles.successText}>{successMessage}</Text>}

				<Pressable
					key="transaction-form-submit"
					testID="transaction-form-submit"
					accessibilityRole="button"
					accessibilityLabel={
						isEditMode
							? "Simpan perubahan transaksi"
							: "Simpan transaksi manual"
					}
					accessibilityState={{ disabled: !canSubmit, busy: submitting }}
					onPress={onSubmit}
					disabled={!canSubmit}
					style={[styles.submitButton, !canSubmit && { opacity: 0.4 }]}
				>
					{submitting ? (
						<ActivityIndicator color={theme.colors.textInverse} />
					) : (
						<Text style={styles.submitText}>
							{isEditMode ? "Simpan Perubahan" : "Simpan Transaksi"}
						</Text>
					)}
				</Pressable>
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
