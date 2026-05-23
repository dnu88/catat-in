import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Alert,
	Animated,
	FlatList,
	PanResponder,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useRouter } from "expo-router";

import { KaswiseIcon } from "../../src/components/icons/kaswise-icons";
import {
	EmptyState,
	FilterChip,
	IconBubble,
	ScreenHeader,
	StatCard,
	StateMessage,
} from "../../src/components/ui";
import { LoadingState } from "../../src/components/ui/LoadingState";
import { useTheme } from "../../src/theme/theme-context";
import { useI18n } from "../../src/i18n/i18n-context";
import {
	deleteTransaction,
	listTransactions,
	type Transaction,
} from "../../src/services/transactions";

type Filter = "all" | "income" | "expense";
type Period = "week" | "month" | "year";

const SWIPE_ACTION_WIDTH = 82;
const SWIPE_REVEAL_WIDTH = SWIPE_ACTION_WIDTH * 2;
const SWIPE_TRIGGER_DISTANCE = 58;

function formatCompactRupiah(value: number) {
	const amount = Math.abs(value);
	if (amount >= 1_000_000) {
		return `Rp ${(amount / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
	}
	if (amount >= 1_000) {
		return `Rp ${(amount / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} rb`;
	}
	return `Rp ${amount.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

type TransactionListItem = {
	item: Transaction;
	index: number;
	total: number;
	isEn: boolean;
	theme: ReturnType<typeof useTheme>["theme"];
	styles: ReturnType<typeof createStyles>;
	onEdit: (item: Transaction) => void;
	onDelete: (item: Transaction) => void;
};

function TransactionRow({
	item,
	index,
	total,
	isEn,
	theme,
	styles,
	onEdit,
	onDelete,
}: TransactionListItem) {
	const formattedDate = new Date(
		item.date || item.created_at || Date.now(),
	).toLocaleDateString(isEn ? "en-US" : "id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
	const amount = Number(item.amount ?? 0);
	const title =
		item.description ||
		item.merchant ||
		item.category ||
		(isEn ? "Transaction" : "Transaksi");

	const translateX = useRef(new Animated.Value(0)).current;
	const snapTo = useCallback(
		(toValue: number, after?: () => void) => {
			Animated.spring(translateX, {
				toValue,
				useNativeDriver: true,
				speed: 22,
				bounciness: 0,
				restDisplacementThreshold: 0.5,
				restSpeedThreshold: 0.5,
			}).start(({ finished }) => {
				if (finished) after?.();
			});
		},
		[translateX],
	);
	const resetSwipe = useCallback(() => snapTo(0), [snapTo]);
	const panResponder = useMemo(
		() =>
			PanResponder.create({
				onMoveShouldSetPanResponder: (_, gestureState) =>
					Math.abs(gestureState.dx) > 8 &&
					Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.15,
				onPanResponderMove: (_, gestureState) => {
					const easedDrag =
						gestureState.dx > 0 ? gestureState.dx * 0.18 : gestureState.dx;
					translateX.setValue(
						Math.max(-SWIPE_REVEAL_WIDTH, Math.min(0, easedDrag)),
					);
				},
				onPanResponderRelease: (_, gestureState) => {
					const shouldOpen =
						gestureState.dx < -SWIPE_TRIGGER_DISTANCE ||
						gestureState.vx < -0.45;
					snapTo(shouldOpen ? -SWIPE_REVEAL_WIDTH : 0);
				},
				onPanResponderTerminate: () => snapTo(0),
			}),
		[snapTo, translateX],
	);

	return (
		<View
			testID={`transaction-swipe-shell-${item.id}`}
			style={styles.swipeShell}
		>
			<View
				testID={`transaction-swipe-actions-${item.id}`}
				style={styles.swipeActions}
			>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`${isEn ? "Edit transaction" : "Edit transaksi"} ${title}`}
					style={[styles.swipeActionButton, styles.swipeEditButton]}
					onPress={() => {
						resetSwipe();
						onEdit(item);
					}}
				>
					<Text style={styles.swipeActionText}>Edit</Text>
				</Pressable>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`${isEn ? "Delete transaction" : "Hapus transaksi"} ${title}`}
					style={[styles.swipeActionButton, styles.swipeDeleteButton]}
					onPress={() => {
						resetSwipe();
						onDelete(item);
					}}
				>
					<Text style={styles.swipeActionText}>
						{isEn ? "Delete" : "Hapus"}
					</Text>
				</Pressable>
			</View>
			<Animated.View
				{...panResponder.panHandlers}
				style={[styles.rowCard, { transform: [{ translateX }] }]}
			>
				<View
					style={[
						styles.row,
						index < total - 1 && {
							borderBottomWidth: 1,
							borderBottomColor: theme.colors.borderSoft,
						},
					]}
				>
					<View style={styles.rowIcon}>
						<IconBubble
							name={
								item.transaction_type === "income" ? "chart" : "transactions"
							}
							tone={item.transaction_type === "income" ? "success" : "danger"}
							size={40}
						/>
					</View>
					<View style={styles.rowInfo}>
						<Text
							style={styles.rowTitle}
							numberOfLines={1}
							ellipsizeMode="tail"
						>
							{title}
						</Text>
						{item.merchant && item.merchant !== title && (
							<Text style={styles.rowMerchant}>{item.merchant}</Text>
						)}
						<Text style={styles.rowSub}>
							{item.category || "-"} • {formattedDate}
						</Text>
					</View>
					<Text
						style={[
							styles.rowAmount,
							item.transaction_type === "income"
								? { color: theme.colors.success }
								: { color: theme.colors.textPrimary },
						]}
					>
						{item.transaction_type === "income" ? "+" : "-"} Rp{" "}
						{amount.toLocaleString("id-ID")}
					</Text>
				</View>
			</Animated.View>
		</View>
	);
}

export default function TransactionsScreen() {
	const { theme } = useTheme();
	const { language } = useI18n();
	const router = useRouter();
	const styles = useMemo(() => createStyles(theme), [theme]);

	const isEn = language === "en";
	const [activeFilter, setActiveFilter] = useState<Filter>("all");
	const [activePeriod, setActivePeriod] = useState<Period>("month");
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		loadTransactions();
	}, []);

	const loadTransactions = async () => {
		try {
			setLoadError(null);
			const data = await listTransactions();
			setTransactions(data);
		} catch (error) {
			console.error("Error loading transactions:", error);
			setLoadError(
				isEn
					? "Failed to load transactions. Please try again."
					: "Gagal memuat transaksi. Coba lagi sebentar.",
			);
		} finally {
			setLoading(false);
		}
	};

	const list = useMemo(
		() =>
			activeFilter === "all"
				? transactions
				: transactions.filter((item) => item.transaction_type === activeFilter),
		[activeFilter, transactions],
	);

	const totalIncome = useMemo(
		() =>
			transactions
				.filter((t) => t.transaction_type === "income")
				.reduce((acc, t) => acc + Number(t.amount ?? 0), 0),
		[transactions],
	);

	const totalExpense = useMemo(
		() =>
			transactions
				.filter((t) => t.transaction_type === "expense")
				.reduce((acc, t) => acc + Number(t.amount ?? 0), 0),
		[transactions],
	);

	const handleEditTransaction = (item: Transaction) => {
		router.push(
			`/(tabs)/transaction-new?transactionId=${encodeURIComponent(item.id)}`,
		);
	};

	const handleDeleteTransaction = (item: Transaction) => {
		const title =
			item.description ||
			item.merchant ||
			item.category ||
			(isEn ? "transaction" : "transaksi");
		Alert.alert(
			isEn ? "Delete transaction?" : "Hapus transaksi?",
			isEn
				? `Transaction ${title} will be permanently deleted.`
				: `Transaksi ${title} akan dihapus permanen.`,
			[
				{ text: isEn ? "Cancel" : "Batal", style: "cancel" },
				{
					text: isEn ? "Delete" : "Hapus",
					style: "destructive",
					onPress: async () => {
						try {
							await deleteTransaction(item.id);
							await loadTransactions();
						} catch (error) {
							console.error("Error deleting transaction:", error);
							setLoadError(
								isEn
									? "Failed to delete transaction. Please try again."
									: "Gagal menghapus transaksi. Coba lagi sebentar.",
							);
						}
					},
				},
			],
		);
	};

	if (loading) {
		return (
			<View style={styles.screen}>
				<LoadingState
					label={isEn ? "Loading transactions..." : "Memuat transaksi..."}
				/>
			</View>
		);
	}

	const renderTransaction = ({
		item,
		index,
	}: {
		item: Transaction;
		index: number;
	}) => (
		<TransactionRow
			item={item}
			index={index}
			total={list.length}
			isEn={isEn}
			theme={theme}
			styles={styles}
			onEdit={handleEditTransaction}
			onDelete={handleDeleteTransaction}
		/>
	);

	const keyExtractor = (item: Transaction) => item.id;

	const ListHeader = () => (
		<>
			<ScreenHeader
				title={isEn ? "Transactions" : "Transaksi"}
				subtitle={
					isEn
						? "Track your daily cash flow in detail."
						: "Pantau arus kas harianmu dengan detail."
				}
				action={
					<View style={styles.summaryBadge}>
						<Text style={styles.summaryBadgeText}>{list.length} item</Text>
					</View>
				}
			/>

			{loadError ? <StateMessage message={loadError} tone="error" /> : null}

			<View style={styles.periodRow}>
				{(["week", "month", "year"] as Period[]).map((period) => (
					<Pressable
						key={period}
						testID={`transactions-period-${period}`}
						accessibilityRole="button"
						accessibilityLabel={`${isEn ? "Choose period" : "Pilih periode"} ${
							isEn
								? period === "week"
									? "Week"
									: period === "month"
										? "Month"
										: "Year"
								: period === "week"
									? "Minggu"
									: period === "month"
										? "Bulan"
										: "Tahun"
						}`}
						accessibilityState={{ selected: activePeriod === period }}
						onPress={() => setActivePeriod(period)}
						style={[
							styles.periodChip,
							activePeriod === period && {
								backgroundColor:
									theme.mode === "light"
										? theme.colors.brandPrimaryDeep
										: theme.colors.brandPrimary,
								borderColor:
									theme.mode === "light"
										? theme.colors.brandPrimaryDeep
										: theme.colors.brandPrimary,
							},
						]}
					>
						<Text
							style={[
								styles.periodChipText,
								activePeriod === period && { color: theme.colors.textInverse },
							]}
						>
							{isEn
								? period === "week"
									? "Week"
									: period === "month"
										? "Month"
										: "Year"
								: period === "week"
									? "Minggu"
									: period === "month"
										? "Bulan"
										: "Tahun"}
						</Text>
					</Pressable>
				))}
			</View>

			<View style={styles.statRow}>
				<StatCard
					label={isEn ? "Income" : "Pemasukan"}
					value={formatCompactRupiah(totalIncome)}
					icon="chart"
					tone="success"
				/>
				<StatCard
					label={isEn ? "Expense" : "Pengeluaran"}
					value={formatCompactRupiah(totalExpense)}
					icon="transactions"
					tone="danger"
				/>
			</View>

			<View style={styles.filterRow}>
				{(["all", "income", "expense"] as Filter[]).map((filter) => (
					<FilterChip
						key={filter}
						label={
							isEn
								? filter === "all"
									? "All"
									: filter === "income"
										? "Income"
										: "Expense"
								: filter === "all"
									? "Semua"
									: filter === "income"
										? "Pemasukan"
										: "Pengeluaran"
						}
						selected={activeFilter === filter}
						onPress={() => setActiveFilter(filter)}
					/>
				))}
			</View>
		</>
	);

	const ListEmpty = () => (
		<EmptyState
			icon="transactions"
			tone="accent"
			title={isEn ? "No transactions yet" : "Belum ada transaksi"}
			description={
				isEn
					? "Try changing the filter or add a new transaction from the Capture tab."
					: "Coba ubah filter atau tambahkan transaksi baru dari tab Capture."
			}
		/>
	);

	return (
		<View style={styles.screen}>
			<FlatList
				data={list}
				renderItem={renderTransaction}
				keyExtractor={keyExtractor}
				ListHeaderComponent={ListHeader}
				ListEmptyComponent={ListEmpty}
				ListFooterComponent={<View style={{ height: 100 }} />}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				initialNumToRender={10}
				maxToRenderPerBatch={10}
				windowSize={5}
				removeClippedSubviews
			/>

			<Pressable
				testID="transactions-fab"
				accessibilityRole="button"
				accessibilityLabel={
					isEn ? "Add manual transaction" : "Tambah transaksi manual"
				}
				style={styles.fab}
				onPress={() => router.push("/(tabs)/transaction-new")}
			>
				<KaswiseIcon
					name="capture"
					color={theme.colors.textInverse}
					size={26}
					weight="bold"
				/>
			</Pressable>
		</View>
	);
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
	const lightBrand =
		theme.mode === "light"
			? theme.colors.brandPrimaryDeep
			: theme.colors.brandPrimary;

	return StyleSheet.create({
		screen: { flex: 1, backgroundColor: theme.colors.background },
		content: {
			padding: theme.spacing.xl,
			gap: theme.spacing.sm + theme.spacing.xs - 2,
			paddingBottom: 26,
		},
		summaryBadge: {
			backgroundColor: theme.colors.mutedSurface,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			borderRadius: theme.radius.pill,
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.sm - 2,
		},
		summaryBadgeText: {
			color: theme.colors.textSecondary,
			fontSize: theme.typography.fontSize.sm,
			fontWeight: theme.typography.fontWeight.bold,
		},
		periodRow: { flexDirection: "row", gap: theme.spacing.sm },
		periodChip: {
			flex: 1,
			paddingVertical: theme.spacing.sm + 2,
			minHeight: 44,
			borderRadius: theme.radius.sm + 2,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.surface,
			alignItems: "center",
			justifyContent: "center",
		},
		periodChipText: {
			color: theme.colors.textSecondary,
			fontSize: 13,
			fontWeight: theme.typography.fontWeight.bold,
		},
		statRow: {
			flexDirection: "row",
			gap: theme.spacing.sm + theme.spacing.xs - 2,
		},
		filterRow: {
			flexDirection: "row",
			gap: theme.spacing.sm,
			flexWrap: "wrap",
		},
		swipeShell: {
			position: "relative",
			overflow: "hidden",
			borderRadius: theme.radius.lg,
			backgroundColor: theme.colors.surface,
		},
		swipeActions: {
			position: "absolute",
			top: 0,
			right: 0,
			bottom: 0,
			width: SWIPE_REVEAL_WIDTH,
			flexDirection: "row",
			justifyContent: "flex-end",
		},
		swipeActionButton: {
			width: SWIPE_ACTION_WIDTH,
			minHeight: 44,
			alignItems: "center",
			justifyContent: "center",
		},
		swipeEditButton: {
			backgroundColor:
				theme.mode === "light"
					? theme.colors.brandPrimaryDeep
					: theme.colors.brandPrimary,
		},
		swipeDeleteButton: {
			backgroundColor: theme.colors.danger,
		},
		swipeActionText: {
			color: theme.colors.textInverse,
			fontSize: 12,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		rowCard: {
			backgroundColor: theme.colors.background,
			borderRadius: theme.radius.lg,
		},
		row: {
			flexDirection: "row",
			alignItems: "center",
			gap: theme.spacing.md,
			paddingVertical: theme.spacing.md,
			minHeight: 44,
		},
		rowIcon: {
			width: 44,
			height: 44,
			borderRadius: theme.radius.sm + 2,
			alignItems: "center",
			justifyContent: "center",
		},
		rowInfo: { flex: 1 },
		rowTitle: {
			color: theme.colors.textPrimary,
			fontSize: theme.typography.fontSize.md,
			fontWeight: theme.typography.fontWeight.bold,
		},
		rowMerchant: {
			color: theme.colors.textSecondary,
			fontSize: theme.typography.fontSize.sm,
			marginTop: 1,
		},
		rowSub: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
		rowAmount: {
			fontSize: theme.typography.fontSize.md,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		fab: {
			position: "absolute",
			right: 22,
			bottom: 108,
			width: 56,
			height: 56,
			borderRadius: 28,
			backgroundColor: lightBrand,
			alignItems: "center",
			justifyContent: "center",
			...theme.shadow.lg,
		},
		fabIcon: {
			color: theme.colors.textInverse,
			fontSize: 26,
			fontWeight: theme.typography.fontWeight.extrabold,
			lineHeight: 28,
		},
	});
}
