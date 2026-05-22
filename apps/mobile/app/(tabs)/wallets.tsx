import { useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

import { useI18n } from "../../src/i18n/i18n-context";
import { createWallet, listWallets, type Wallet } from "../../src/services/wallets";
import { useFinanceContext } from "../../src/state/finance-context";
import { useTheme } from "../../src/theme/theme-context";

type WalletType = "bank" | "ewallet" | "cash" | "investment";
type FilterType = "all" | WalletType;
type ScopedWallet = Wallet & { scopeLabel: string; scopeType: "personal" | "household" };

const walletTypes: WalletType[] = ["bank", "ewallet", "cash", "investment"];

const copy = {
	id: {
		title: "Dompet",
		subtitle: "Kelola saldo pribadi dan keluarga.",
		new: "+ Baru",
		cancel: "Batal",
		formTitle: "Dompet baru",
		name: "Nama dompet",
		balance: "Saldo awal",
		save: "Simpan dompet",
		total: "Total Saldo Semua Akun",
		active: "akun aktif",
		all: "Semua",
		personal: "Pribadi",
		family: "Keluarga",
		loading: "Memuat dompet...",
		empty: "Belum ada dompet untuk dikelola.",
		error: "Gagal memuat dompet",
		createError: "Gagal membuat dompet",
		types: { bank: "Bank", ewallet: "E-Wallet", cash: "Tunai", investment: "Investasi" },
	},
	en: {
		title: "Wallets",
		subtitle: "Manage personal and family balances.",
		new: "+ New",
		cancel: "Cancel",
		formTitle: "New wallet",
		name: "Wallet name",
		balance: "Starting balance",
		save: "Save wallet",
		total: "Total Balance Across Accounts",
		active: "active accounts",
		all: "All",
		personal: "Personal",
		family: "Family",
		loading: "Loading wallets...",
		empty: "No wallets to manage yet.",
		error: "Failed to load wallets",
		createError: "Failed to create wallet",
		types: { bank: "Bank", ewallet: "E-Wallet", cash: "Cash", investment: "Investment" },
	},
} as const;

const typeIcons: Record<WalletType, string> = {
	bank: "🏦",
	ewallet: "💳",
	cash: "💵",
	investment: "📈",
};

function getTypeColor(type: WalletType, theme: ReturnType<typeof useTheme>["theme"]): string {
	const colorMap: Record<WalletType, string> = {
		bank: theme.colors.info,
		ewallet: theme.colors.brandPrimary,
		cash: theme.colors.success,
		investment: theme.colors.warning,
	};
	return colorMap[type];
}

function formatCurrency(value: number) {
	return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

export default function WalletsScreen() {
	const { theme } = useTheme();
	const { language } = useI18n();
	const { activeContext, memberships, canCreate } = useFinanceContext();
	const tx = copy[language];
	const styles = useMemo(() => createStyles(theme), [theme]);
	const [filter, setFilter] = useState<FilterType>("all");
	const [wallets, setWallets] = useState<ScopedWallet[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showCreate, setShowCreate] = useState(false);
	const [name, setName] = useState("");
	const [type, setType] = useState<WalletType>("bank");
	const [balance, setBalance] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const activeScopeLabel =
		activeContext.type === "household"
			? memberships.find((membership) => membership.household_id === activeContext.householdId)?.households?.name ?? tx.family
			: tx.personal;

	const loadWallets = async () => {
		setLoading(true);
		setError(null);
		try {
			const personalRows = await listWallets({ type: "personal" });
			const householdRows = await Promise.all(
				memberships.map(async (membership) => {
					const rows = await listWallets({
						type: "household",
						householdId: membership.household_id,
						role: membership.role,
					});
					return rows.map((wallet) => ({
						...wallet,
						scopeLabel: membership.households?.name ?? tx.family,
						scopeType: "household" as const,
					}));
				}),
			);
			setWallets([
				...personalRows.map((wallet) => ({ ...wallet, scopeLabel: tx.personal, scopeType: "personal" as const })),
				...householdRows.flat(),
			].filter((wallet) => wallet.is_active !== false));
		} catch (err) {
			console.error("Error loading wallets:", err);
			setError(tx.error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadWallets();
	}, [memberships, tx.error, tx.family, tx.personal]);

	const handleCreate = async () => {
		if (!name.trim() || !canCreate) return;
		setSubmitting(true);
		setError(null);
		try {
			await createWallet(
				{
					name: name.trim(),
					type,
					balance: Number(balance || 0),
				},
				activeContext,
			);
			setName("");
			setBalance("");
			setType("bank");
			setShowCreate(false);
			await loadWallets();
		} catch (err) {
			console.error("Error creating wallet:", err);
			setError(tx.createError);
		} finally {
			setSubmitting(false);
		}
	};

	const filtered = filter === "all" ? wallets : wallets.filter((wallet) => wallet.type === filter);
	const totalBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance ?? 0), 0);

	return (
		<View style={styles.screen}>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.headerRow}>
					<View style={styles.headerCopy}>
						<Text style={styles.title}>{tx.title}</Text>
						<Text style={styles.subtitle}>{tx.subtitle}</Text>
					</View>
					<Pressable
						testID="wallets-create-toggle"
						accessibilityRole="button"
						accessibilityLabel={showCreate ? tx.cancel : tx.new}
						style={[styles.addButton, !canCreate && styles.disabledButton]}
						onPress={() => canCreate && setShowCreate((value) => !value)}
						disabled={!canCreate}
					>
						<Text style={styles.addButtonText}>{showCreate ? tx.cancel : tx.new}</Text>
					</Pressable>
				</View>

				{showCreate ? (
					<View testID="wallet-create-form" style={styles.formCard}>
						<Text style={styles.formTitle}>{tx.formTitle} · {activeScopeLabel}</Text>
						<TextInput
							accessibilityLabel={tx.name}
							placeholder={tx.name}
							placeholderTextColor={theme.colors.textMuted}
							value={name}
							onChangeText={setName}
							style={styles.input}
						/>
						<TextInput
							accessibilityLabel={tx.balance}
							placeholder={tx.balance}
							placeholderTextColor={theme.colors.textMuted}
							value={balance}
							onChangeText={setBalance}
							keyboardType="numeric"
							style={styles.input}
						/>
						<View style={styles.typeGrid}>
							{walletTypes.map((walletType) => (
								<Pressable
									key={walletType}
									testID={`wallet-type-${walletType}`}
									accessibilityRole="button"
									accessibilityState={{ selected: type === walletType }}
									style={[styles.typeChoice, type === walletType && styles.typeChoiceActive]}
									onPress={() => setType(walletType)}
								>
									<Text style={[styles.typeChoiceText, type === walletType && styles.typeChoiceTextActive]}>{tx.types[walletType]}</Text>
								</Pressable>
							))}
						</View>
						<Pressable
							testID="wallet-create-submit"
							accessibilityRole="button"
							accessibilityLabel={tx.save}
							style={[styles.submitButton, submitting && styles.disabledButton]}
							onPress={handleCreate}
							disabled={submitting}
						>
							<Text style={styles.submitButtonText}>{tx.save}</Text>
						</Pressable>
					</View>
				) : null}

				<View testID="wallets-total-hero" style={styles.totalCard}>
					<View style={styles.heroBloomOne} />
					<View style={styles.heroBloomTwo} />
					<Text style={styles.totalLabel}>{tx.total}</Text>
					<Text style={styles.totalValue}>{formatCurrency(totalBalance)}</Text>
					<View style={styles.totalRow}>
						<View style={styles.totalChip}>
							<Text style={styles.totalChipText}>{wallets.length} {tx.active}</Text>
						</View>
					</View>
				</View>

				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
					{(["all", ...walletTypes] as FilterType[]).map((filterValue) => (
						<Pressable
							key={filterValue}
							onPress={() => setFilter(filterValue)}
							style={[styles.filterChip, filter === filterValue && styles.filterChipActive]}
						>
							<Text style={[styles.filterChipText, filter === filterValue && styles.filterChipTextActive]}>
								{filterValue === "all" ? tx.all : tx.types[filterValue]}
							</Text>
						</Pressable>
					))}
				</ScrollView>

				{loading ? <ActivityIndicator color={theme.colors.brandPrimary} /> : null}
				{error ? <Text style={styles.errorText}>{error}</Text> : null}
				{!loading && filtered.length === 0 ? <Text style={styles.emptyText}>{tx.empty}</Text> : null}

				{filtered.map((wallet) => (
					<Pressable key={wallet.id} testID={`wallet-card-${wallet.id}`} accessibilityRole="button" style={styles.walletCard}>
						<View style={styles.walletTop}>
							<View style={[styles.walletIcon, { backgroundColor: `${getTypeColor(wallet.type as WalletType, theme)}26` }]}>
								<Text style={styles.walletIconText}>{typeIcons[wallet.type as WalletType]}</Text>
							</View>
							<View style={styles.walletInfo}>
								<Text style={styles.walletName}>{wallet.name}</Text>
								<View style={styles.walletMeta}>
									<View style={[styles.typeBadge, { backgroundColor: `${getTypeColor(wallet.type as WalletType, theme)}26` }]}>
										<Text style={[styles.typeBadgeText, { color: getTypeColor(wallet.type as WalletType, theme) }]}>{tx.types[wallet.type as WalletType]}</Text>
									</View>
									<View style={[styles.scopeBadge, wallet.scopeType === "household" && styles.scopeBadgeHousehold]}>
										<Text style={[styles.scopeBadgeText, wallet.scopeType === "household" && styles.scopeBadgeTextHousehold]}>{wallet.scopeLabel}</Text>
									</View>
								</View>
							</View>
						</View>
						<View style={styles.walletBottom}>
							<Text style={styles.walletBalance}>{formatCurrency(Number(wallet.balance ?? 0))}</Text>
						</View>
					</Pressable>
				))}

				<View style={{ height: 100 }} />
			</ScrollView>
		</View>
	);
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
	return StyleSheet.create({
		screen: { flex: 1, backgroundColor: theme.colors.background },
		content: { padding: 20, gap: 10, paddingBottom: 26 },
		headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
		headerCopy: { flex: 1 },
		title: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize["4xl"], fontWeight: theme.typography.fontWeight.extrabold, letterSpacing: theme.typography.letterSpacing.tight },
		subtitle: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, marginTop: 2 },
		addButton: { backgroundColor: theme.colors.brandPrimary, borderRadius: theme.radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
		disabledButton: { opacity: 0.5 },
		addButtonText: { color: theme.colors.textInverse, fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.bold },
		formCard: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderSoft, borderRadius: 18, padding: 14, gap: 10 },
		formTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: "800" },
		input: { backgroundColor: theme.colors.card, borderColor: theme.colors.borderSoft, borderRadius: theme.radius.md, borderWidth: 1, color: theme.colors.textPrimary, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10 },
		typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
		typeChoice: { borderWidth: 1, borderColor: theme.colors.borderSoft, backgroundColor: theme.colors.mutedSurface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
		typeChoiceActive: { backgroundColor: theme.colors.brandPrimary, borderColor: theme.colors.brandPrimary },
		typeChoiceText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: "700" },
		typeChoiceTextActive: { color: theme.colors.textInverse },
		submitButton: { minHeight: 44, borderRadius: theme.radius.pill, backgroundColor: theme.colors.brandPrimary, alignItems: "center", justifyContent: "center" },
		submitButtonText: { color: theme.colors.textInverse, fontSize: 14, fontWeight: "800" },
		totalCard: { backgroundColor: theme.colors.card, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.borderSoft, padding: 18, gap: 6, overflow: "hidden", ...(theme.mode === "light" ? theme.shadow.lg : {}) },
		heroBloomOne: { position: "absolute", top: -60, right: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: theme.mode === "light" ? "rgba(163, 255, 18, 0.22)" : "rgba(163, 255, 18, 0.14)", opacity: 0.55 },
		heroBloomTwo: { position: "absolute", bottom: -80, left: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: theme.mode === "light" ? "rgba(74, 128, 240, 0.08)" : "rgba(74, 128, 240, 0.10)", opacity: 0.6 },
		totalLabel: { color: theme.colors.textMuted, fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold },
		totalValue: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize["4xl"], fontWeight: theme.typography.fontWeight.extrabold, letterSpacing: theme.typography.letterSpacing.tight },
		totalRow: { marginTop: 6 },
		totalChip: { backgroundColor: theme.colors.glass.background, borderWidth: 1, borderColor: theme.colors.glass.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, alignSelf: "flex-start" },
		totalChipText: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.semibold },
		filterRow: { gap: 8, paddingVertical: 2 },
		filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.borderSoft, backgroundColor: theme.colors.surface },
		filterChipActive: { backgroundColor: theme.colors.brandPrimary, borderColor: theme.colors.brandPrimary },
		filterChipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: "700" },
		filterChipTextActive: { color: theme.colors.textInverse },
		walletCard: { backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.borderSoft, padding: 14, gap: 12 },
		walletTop: { flexDirection: "row", alignItems: "center", gap: 12 },
		walletIcon: { width: 46, height: 46, borderRadius: theme.radius.md, alignItems: "center", justifyContent: "center" },
		walletIconText: { fontSize: 22 },
		walletInfo: { flex: 1, gap: 4 },
		walletName: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold },
		walletMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
		typeBadge: { borderRadius: theme.radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
		typeBadgeText: { fontSize: 11, fontWeight: theme.typography.fontWeight.bold },
		scopeBadge: { borderRadius: theme.radius.pill, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: theme.colors.mutedSurface, borderWidth: 1, borderColor: theme.colors.borderSoft },
		scopeBadgeHousehold: { backgroundColor: `${theme.colors.info}18`, borderColor: `${theme.colors.info}40` },
		scopeBadgeText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "800" },
		scopeBadgeTextHousehold: { color: theme.colors.info },
		walletBottom: { borderTopWidth: 1, borderTopColor: theme.colors.borderSoft, paddingTop: 10 },
		walletBalance: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: "800" },
		errorText: { color: theme.colors.danger, fontSize: 12, fontWeight: "700" },
		emptyText: { color: theme.colors.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 20 },
	});
}
