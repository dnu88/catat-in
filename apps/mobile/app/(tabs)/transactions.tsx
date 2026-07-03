import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Alert,
	Animated,
	Platform,
	FlatList,
	RefreshControl,
	PanResponder,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { PageEntrance, StaggeredStack } from "../../src/components/motion";
import * as ExpoRouter from "expo-router";

const { useLocalSearchParams } = ExpoRouter as { useLocalSearchParams?: any };

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
import { resolveCategoryVisual } from "../../src/theme/category-visuals";
import { useI18n } from "../../src/i18n/i18n-context";
import { useFinanceContext } from "../../src/state/finance-context";
import {
	formatReportPeriodLabel,
	isDateInReportPeriod,
	useReportPeriod,
} from "../../src/state/report-period";
import {
	deleteTransaction,
	listTransactions,
	type Transaction,
} from "../../src/services/transactions";
import { listCategories, type Category } from "../../src/services/categories";
import { getLocalizedCategoryName } from "../../src/services/category-taxonomy";

type Filter = "all" | "income" | "expense" | "review";
type Period = "week" | "month" | "year";
type TransactionPeriod = "report" | Period;

const OTHER_CATEGORY_NAMES = ["Lainnya", "Other", "Other expenses"];

function isReviewable(tx: Transaction): boolean {
	if (tx.is_verified === true) return false;
	if (tx.review_required === true) return true;
	if (typeof tx.confidence === "number" && tx.confidence < 0.5) return true;
	if (OTHER_CATEGORY_NAMES.includes(tx.category ?? "")) return true;
	if (tx.amount == null || tx.amount <= 0) return true;
	if (!tx.category?.trim()) return true;
	if (!tx.date || tx.date.trim() === "") return true;
	return false;
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const SWIPE_GESTURE_CONFIG = {
	actionWidth: 80,
	maxRevealWidth: 160,
	activationDistance: 2,
	verticalIntentRatio: 0.9,
	openThresholdRatio: 0.35,
	openThreshold: 56,
	overdragResistance: 0.4,
} as const;

export const SWIPE_SNAP_SPRING_CONFIG = {
	damping: 18,
	stiffness: 165,
	mass: 0.95,
	overshootClamping: false,
	restDisplacementThreshold: 0.7,
	restSpeedThreshold: 0.7,
} as const;

const SWIPE_ACTION_WIDTH = SWIPE_GESTURE_CONFIG.actionWidth;
const SWIPE_REVEAL_WIDTH = SWIPE_GESTURE_CONFIG.maxRevealWidth;

export function getSwipeTranslateX(dx: number): number {
	if (dx >= 0) return 0;

	const leftDistance = Math.abs(dx);
	if (leftDistance <= SWIPE_GESTURE_CONFIG.maxRevealWidth) {
		return -leftDistance;
	}

	const overdragDistance = leftDistance - SWIPE_GESTURE_CONFIG.maxRevealWidth;
	return -(
		SWIPE_GESTURE_CONFIG.maxRevealWidth +
		overdragDistance * SWIPE_GESTURE_CONFIG.overdragResistance
	);
}

export function shouldOpenSwipe(dx: number): boolean {
	return dx <= -SWIPE_GESTURE_CONFIG.openThreshold;
}

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

export function getTransactionDateValue(item: Transaction): number | null {
	const rawDate = item.date || item.tanggal || item.created_at;
	if (!rawDate) return null;

	const dateText = String(rawDate);
	const dateOnlyMatch = DATE_ONLY_PATTERN.exec(dateText);
	if (dateOnlyMatch) {
		const [, year, month, day] = dateOnlyMatch;
		const localDateValue = new Date(
			Number(year),
			Number(month) - 1,
			Number(day),
		).getTime();
		return Number.isNaN(localDateValue) ? null : localDateValue;
	}

	const value = new Date(dateText).getTime();
	return Number.isNaN(value) ? null : value;
}

function getPeriodBounds(period: Period) {
	const start = new Date();
	start.setHours(0, 0, 0, 0);

	if (period === "week") {
		const dayFromMonday = (start.getDay() + 6) % 7;
		start.setDate(start.getDate() - dayFromMonday);
		const end = new Date(start);
		end.setDate(start.getDate() + 7);
		return { start: start.getTime(), end: end.getTime() };
	}

	if (period === "month") {
		start.setDate(1);
		const end = new Date(start);
		end.setMonth(start.getMonth() + 1);
		return { start: start.getTime(), end: end.getTime() };
	}

	start.setMonth(0, 1);
	const end = new Date(start);
	end.setFullYear(start.getFullYear() + 1);
	return { start: start.getTime(), end: end.getTime() };
}

export function filterTransactionsByPeriod(
	items: Transaction[],
	period: Period,
): Transaction[] {
	const { start, end } = getPeriodBounds(period);
	return items.filter((item) => {
		const value = getTransactionDateValue(item);
		return value !== null && value >= start && value < end;
	});
}

type TransactionListItem = {
	item: Transaction;
	index: number;
	total: number;
	isEn: boolean;
	theme: ReturnType<typeof useTheme>["theme"];
	styles: ReturnType<typeof createStyles>;
	categories: Category[];
	onEdit: (item: Transaction) => void;
	onDelete: (item: Transaction) => void;
	onToggleSelect: (id: string) => void;
	selectionMode: boolean;
	selected: boolean;
};

function TransactionRow({
	item,
	index,
	total,
	isEn,
	theme,
	styles,
	categories,
	onEdit,
	onDelete,
	onToggleSelect,
	selectionMode,
	selected,
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
	const localizedCategoryName = item.category
		? getLocalizedCategoryName(item.category, isEn ? "en" : "id")
		: "";
	const categoryVisual = resolveCategoryVisual({
		categoryName: item.category,
		categories,
		mode: theme.mode,
	});
	const rowIconName =
		item.transaction_type === "income" ? "chart" : categoryVisual.icon;
	const rowIconTone =
		item.transaction_type === "income" ? "success" : categoryVisual.tone;
	const rowIconColor =
		item.transaction_type === "income" ? theme.colors.success : categoryVisual.color;

	const translateX = useRef(new Animated.Value(0)).current;
	const snapTo = useCallback(
		(toValue: number, after?: () => void) => {
			Animated.spring(translateX, {
				toValue,
				useNativeDriver: true,
				...SWIPE_SNAP_SPRING_CONFIG,
			}).start(({ finished }) => {
				if (finished) after?.();
			});
		},
		[translateX],
	);
	const rowLongPressHandledRef = useRef(false);
	const rowLongPressResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (rowLongPressResetRef.current) {
				clearTimeout(rowLongPressResetRef.current);
			}
		},
		[],
	);
	const handleRowLongPress = useCallback(() => {
		rowLongPressHandledRef.current = true;
		if (rowLongPressResetRef.current) {
			clearTimeout(rowLongPressResetRef.current);
		}
		rowLongPressResetRef.current = setTimeout(() => {
			rowLongPressHandledRef.current = false;
			rowLongPressResetRef.current = null;
		}, 0);
		onToggleSelect(item.id);
	}, [item.id, onToggleSelect]);
	const handleRowPress = useCallback(() => {
		if (rowLongPressHandledRef.current) {
			return;
		}
		if (!selectionMode) return;
		onToggleSelect(item.id);
	}, [item.id, onToggleSelect, selectionMode]);
	const resetSwipe = useCallback(() => snapTo(0), [snapTo]);
	useEffect(() => {
		if (selectionMode) {
			resetSwipe();
		}
	}, [resetSwipe, selectionMode]);
	const panResponder = useMemo(
		() =>
			PanResponder.create({
				onMoveShouldSetPanResponder: (_, gestureState) => {
					if (selectionMode) {
						return false;
					}
					const horizontalDistance = Math.abs(gestureState.dx);
					const verticalDistance = Math.abs(gestureState.dy);
					return (
						horizontalDistance > SWIPE_GESTURE_CONFIG.activationDistance &&
						horizontalDistance >
							verticalDistance * SWIPE_GESTURE_CONFIG.verticalIntentRatio
					);
				},
				onPanResponderMove: (_, gestureState) => {
					translateX.setValue(getSwipeTranslateX(gestureState.dx));
				},
				onPanResponderRelease: (_, gestureState) => {
					snapTo(shouldOpenSwipe(gestureState.dx) ? -SWIPE_REVEAL_WIDTH : 0);
				},
				onPanResponderTerminate: () => snapTo(0),
			}),
		[selectionMode, snapTo, translateX],
	);

	return (
		<View
			testID={`transaction-swipe-shell-${item.id}`}
			style={styles.swipeShell}
		>
			{selectionMode ? null : (
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
			)}
			<Animated.View
				{...panResponder.panHandlers}
				style={[
					styles.rowCard,
					selected && styles.rowCardSelected,
					{ transform: [{ translateX }] },
				]}
			>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={
						selected
							? `${isEn ? "Deselect transaction" : "Batalkan pilihan transaksi"} ${title}`
							: `${isEn ? "Select transaction" : "Pilih transaksi"} ${title}`
					}
					accessibilityHint={selectionMode ? (selected ? (isEn ? "Tap to deselect this transaction." : "Ketuk untuk membatalkan pilihan transaksi ini.") : (isEn ? "Tap to select this transaction." : "Ketuk untuk memilih transaksi ini.")) : (isEn ? "Long press to start selecting transactions." : "Tekan lama untuk mulai memilih transaksi.")}
					onPress={handleRowPress}
					onLongPress={handleRowLongPress}
					delayLongPress={220}
					style={[
						styles.row,
						index < total - 1 && {
							borderBottomWidth: 1,
							borderBottomColor: theme.colors.borderSoft,
						},
					]}
				>
					<View style={styles.rowIconPressable}>
						<View style={[styles.rowIcon, selected && styles.rowIconSelected]}>
							<IconBubble
								name={rowIconName}
								tone={rowIconTone}
								color={rowIconColor}
								size={40}
							/>
						</View>
						{selected ? (
							<View style={styles.rowSelectionBadge}>
								<Text style={styles.rowSelectionBadgeText}>✓</Text>
							</View>
						) : null}
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
							{localizedCategoryName || "-"} • {formattedDate}
						</Text>
					</View>
					<Text
						testID={`transaction-amount-${item.id}`}
						style={[
							styles.rowAmount,
							item.transaction_type === "income"
								? { color: theme.colors.success }
								: { color: theme.colors.danger },
						]}
					>
						{item.transaction_type === "income" ? "+" : "-"} Rp{" "}
						{amount.toLocaleString("id-ID")}
					</Text>
				</Pressable>
			</Animated.View>
		</View>
	);
}

export default function TransactionsScreen() {
	const { theme } = useTheme();
	const { language } = useI18n();
	const { activeContext, canCreate } = useFinanceContext();
	const { activePeriod: reportPeriod } = useReportPeriod();
	const router = ExpoRouter.useRouter();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const activeContextKey =
		activeContext.type === "household"
			? `household:${activeContext.householdId}:${activeContext.role}`
			: "personal";

	const isEn = language === "en";
	const searchParams = useLocalSearchParams?.() ?? {};
	const initialReview = searchParams.review === "1";
	const [activeFilter, setActiveFilter] = useState<Filter>(
		initialReview ? "review" : "all",
	);
	const [activePeriod, setActivePeriod] = useState<TransactionPeriod>("report");
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [categoryOptions, setCategoryOptions] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
	const loadRequestRef = useRef(0);

	const useOptionalFocusEffect = (ExpoRouter as {
		useFocusEffect?: typeof useEffect;
	}).useFocusEffect;
	const hasFocusedOnceRef = useRef(false);

	const loadTransactions = useCallback(async () => {
		const requestId = ++loadRequestRef.current;
		setLoading(true);
		try {
			setLoadError(null);
			const [data, categories] = await Promise.all([
				listTransactions(undefined, activeContext),
				listCategories().catch(() => [] as Category[]),
			]);
			if (loadRequestRef.current !== requestId) return;
			setTransactions(data);
			setCategoryOptions(categories);
			setSelectedTransactionIds((current) =>
				current.filter((id) => data.some((item) => item.id === id)),
			);
		} catch (error) {
			if (loadRequestRef.current !== requestId) return;
			console.error("Error loading transactions:", error);
			setLoadError(
				isEn
					? "Failed to load transactions. Please try again."
					: "Gagal memuat transaksi. Coba lagi sebentar.",
			);
		} finally {
			if (loadRequestRef.current === requestId) setLoading(false);
		}
	}, [activeContext, activeContextKey, isEn]);

	useEffect(() => {
		void loadTransactions();
		return () => {
			loadRequestRef.current += 1;
		};
	}, [loadTransactions]);

	useOptionalFocusEffect?.(
		useCallback(() => {
			if (!hasFocusedOnceRef.current) {
				hasFocusedOnceRef.current = true;
				return undefined;
			}

			void loadTransactions();
			return undefined;
		}, [loadTransactions]),
	);

	const toggleTransactionSelection = useCallback((id: string) => {
		setSelectedTransactionIds((current) =>
			current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
		);
	}, []);

	const clearTransactionSelection = useCallback(() => {
		setSelectedTransactionIds([]);
	}, []);

	const reportPeriodLabel = formatReportPeriodLabel(reportPeriod, isEn ? "en" : "id");
	const periodTransactions = useMemo(
		() =>
			activePeriod === "report"
				? transactions.filter((item) =>
					isDateInReportPeriod(item.date || item.tanggal || item.created_at, reportPeriod),
				)
				: filterTransactionsByPeriod(transactions, activePeriod),
		[activePeriod, reportPeriod, transactions],
	);

	const list = useMemo(
		() => {
			if (activeFilter === "review") {
				return periodTransactions.filter(isReviewable);
			}
			if (activeFilter === "all") {
				return periodTransactions;
			}
			return periodTransactions.filter(
				(item) => item.transaction_type === activeFilter,
			);
		},
		[activeFilter, periodTransactions],
	);

	const totalIncome = useMemo(
		() =>
			periodTransactions
				.filter((t) => t.transaction_type === "income")
				.reduce((acc, t) => acc + Number(t.amount ?? 0), 0),
		[periodTransactions],
	);

	const totalExpense = useMemo(
		() =>
			periodTransactions
				.filter((t) => t.transaction_type === "expense")
				.reduce((acc, t) => acc + Number(t.amount ?? 0), 0),
		[periodTransactions],
	);

	const handleEditTransaction = (item: Transaction) => {
		router.push(
			`/(tabs)/transaction-new?transactionId=${encodeURIComponent(item.id)}`,
		);
	};

	const deleteTransactionById = useCallback(
		async (id: string) => {
			await deleteTransaction(id, activeContext);
		},
		[activeContext],
	);

	const deleteSelectedTransaction = useCallback(
		async (id: string) => {
			try {
				await deleteTransactionById(id);
				await loadTransactions();
				clearTransactionSelection();
			} catch (error) {
				console.error("Error deleting transaction:", error);
				setLoadError(
					isEn
						? "Failed to delete transaction. Please try again."
						: "Gagal menghapus transaksi. Coba lagi sebentar.",
				);
			}
		},
		[clearTransactionSelection, deleteTransactionById, isEn, loadTransactions],
	);

	const handleDeleteSelectedTransactions = useCallback(async () => {
		if (selectedTransactionIds.length === 0) return;
		const count = selectedTransactionIds.length;
		const title = isEn ? "Delete selected transactions?" : "Hapus transaksi terpilih?";
		const message = isEn
			? `${count} transaction${count > 1 ? "s" : ""} will be permanently deleted.`
			: `${count} transaksi akan dihapus permanen.`;

		const performDelete = async () => {
			try {
				await Promise.all(selectedTransactionIds.map((id) => deleteTransactionById(id)));
				clearTransactionSelection();
				await loadTransactions();
			} catch (error) {
				console.error("Error deleting selected transactions:", error);
				setLoadError(
					isEn
						? "Failed to delete selected transactions. Please try again."
						: "Gagal menghapus transaksi terpilih. Coba lagi sebentar.",
				);
			}
		};

		if (Platform.OS === "web") {
			const confirm = (globalThis as {
				confirm?: (message?: string) => boolean;
			}).confirm;
			if (confirm?.(`${title}\n\n${message}`)) {
				void performDelete();
			}
			return;
		}

		Alert.alert(title, message, [
			{ text: isEn ? "Cancel" : "Batal", style: "cancel" },
			{
				text: isEn ? "Delete" : "Hapus",
				style: "destructive",
				onPress: () => {
					void performDelete();
				},
			},
		]);
	}, [clearTransactionSelection, deleteTransactionById, isEn, loadTransactions, selectedTransactionIds]);

	const handleDeleteTransaction = (item: Transaction) => {
		const title =
			item.description ||
			item.merchant ||
			item.category ||
			(isEn ? "transaction" : "transaksi");
		const confirmTitle = isEn ? "Delete transaction?" : "Hapus transaksi?";
		const confirmMessage = isEn
			? `Transaction ${title} will be permanently deleted.`
			: `Transaksi ${title} akan dihapus permanen.`;

		if (Platform.OS === "web") {
			const confirm = (globalThis as {
				confirm?: (message?: string) => boolean;
			}).confirm;
			if (confirm?.(`${confirmTitle}\n\n${confirmMessage}`)) {
				void deleteSelectedTransaction(item.id);
			}
			return;
		}

		Alert.alert(confirmTitle, confirmMessage, [
			{ text: isEn ? "Cancel" : "Batal", style: "cancel" },
			{
				text: isEn ? "Delete" : "Hapus",
				style: "destructive",
				onPress: () => {
					void deleteSelectedTransaction(item.id);
				},
			},
		]);
	};


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
			categories={categoryOptions}
			onEdit={handleEditTransaction}
			onDelete={handleDeleteTransaction}
			onToggleSelect={toggleTransactionSelection}
			selectionMode={selectedTransactionIds.length > 0}
			selected={selectedTransactionIds.includes(item.id)}
		/>
	);

	const keyExtractor = (item: Transaction) => item.id;

	const listHeader = useMemo(() => (
		<StaggeredStack testIDPrefix="transactions-entrance">
			<View testID="transactions-header-block" style={styles.headerBlock}>
				<ScreenHeader
					title={isEn ? "Transactions" : "Transaksi"}
					subtitle={
						isEn
							? "Track your daily cash flow in detail."
							: "Pantau arus kas harianmu dengan detail."
					}
					action={
						<View style={styles.headerActionRow}>
							{selectedTransactionIds.length === 0 ? (
								<View style={styles.summaryBadge}>
									<Text style={styles.summaryBadgeText}>{list.length} item</Text>
								</View>
							) : null}
						</View>
					}
				/>
				{selectedTransactionIds.length > 0 ? (
					<View testID="transactions-selection-toolbar" style={styles.selectionToolbar}>
						<View style={styles.selectionCountBlock}>
							<Text style={styles.selectionCountText}>
								{selectedTransactionIds.length} {isEn ? "selected" : "dipilih"}
							</Text>
							<Text style={styles.selectionHintText}>
								{isEn
									? "Tap another row to keep selecting."
									: "Ketuk transaksi lain untuk menambah pilihan."}
							</Text>
						</View>
						<View style={styles.selectionToolbarActions}>
							<Pressable
								testID="transactions-selection-clear-action"
								accessibilityRole="button"
								accessibilityLabel={
									isEn ? "Clear selected transactions" : "Batal pilih transaksi"
								}
								style={styles.selectionIconButton}
								onPress={clearTransactionSelection}
							>
								<KaswiseIcon
									name="close"
									color={theme.colors.textPrimary}
									size={18}
									weight="bold"
								/>
							</Pressable>
							<Pressable
								testID="transactions-selection-delete-action"
								accessibilityRole="button"
								accessibilityLabel={
									isEn
										? `Delete ${selectedTransactionIds.length} selected transactions`
										: `Hapus ${selectedTransactionIds.length} transaksi terpilih`
								}
								style={[styles.selectionIconButton, styles.selectionDeleteIconButton]}
								onPress={() => {
									void handleDeleteSelectedTransactions();
								}}
							>
								<KaswiseIcon
									name="trash"
									color={theme.colors.danger}
									size={18}
									weight="bold"
								/>
								<View testID="transactions-selection-delete-count-badge" style={styles.selectionDeleteCountBadge}>
									<Text testID="transactions-selection-delete-count-text" style={styles.selectionDeleteCountText}>{selectedTransactionIds.length}</Text>
								</View>
							</Pressable>
						</View>
					</View>
				) : null}
			</View>

			{loadError ? <StateMessage key="transactions-error" message={loadError} tone="error" /> : null}

			<View testID="transactions-report-period-card" style={styles.reportPeriodCard}>
				<Text style={styles.reportPeriodTitle}>
					{isEn ? "Report period" : "Periode laporan"}
				</Text>
				<Text testID="transactions-report-period-label" style={styles.reportPeriodLabel}>
					{reportPeriod.ruleName ? `${reportPeriod.ruleName} · ${reportPeriodLabel}` : reportPeriodLabel}
				</Text>
			</View>

			<View testID="transactions-period-row" style={styles.periodRow}>
				{(["report", "week", "month", "year"] as TransactionPeriod[]).map((period) => (
					<Pressable
						key={period}
						testID={`transactions-period-${period}`}
						accessibilityRole="button"
						accessibilityLabel={`${isEn ? "Choose period" : "Pilih periode"} ${
							isEn
								? period === "report"
									? "Report"
									: period === "week"
										? "Week"
										: period === "month"
											? "Month"
											: "Year"
								: period === "report"
									? "Laporan"
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
								? period === "report"
									? "Report"
									: period === "week"
										? "Week"
										: period === "month"
											? "Month"
											: "Year"
								: period === "report"
									? "Laporan"
									: period === "week"
										? "Minggu"
										: period === "month"
											? "Bulan"
											: "Tahun"}
						</Text>
					</Pressable>
				))}
			</View>

			<View testID="transactions-stat-row" style={styles.statRow}>
				<View testID="transactions-stat-income" style={styles.statCardShell}>
					<StatCard
						label={isEn ? "Income" : "Pemasukan"}
						value={formatCompactRupiah(totalIncome)}
						icon="chart"
						tone="success"
						style={styles.statCard}
						contentStyle={styles.statCardContent}
						valueTextStyle={styles.statValueText}
					/>
				</View>
				<View testID="transactions-stat-expense" style={styles.statCardShell}>
					<StatCard
						label={isEn ? "Expense" : "Pengeluaran"}
						value={formatCompactRupiah(totalExpense)}
						icon="transactions"
						tone="danger"
						style={styles.statCard}
						contentStyle={styles.statCardContent}
						valueTextStyle={styles.statValueText}
					/>
				</View>
			</View>

			<ScrollView
				testID="transactions-filter-scroller"
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.filterScroller}
				contentContainerStyle={styles.filterContent}
			>
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
				<View testID="transactions-review-chip">
				  <FilterChip
				    key="review"
				    label={isEn ? "Needs review" : "Perlu dicek"}
				    selected={activeFilter === "review"}
				    onPress={() => setActiveFilter("review")}
				  />
				</View>
				{/* Navigation chip ke Bills */}
				<View testID="transactions-bills-chip">
				  <FilterChip
				    key="bills"
				    label={isEn ? "Bills" : "Tagihan"}
				    selected={false}
				    onPress={() => router.push("/(tabs)/bills" as never)}
				  />
				</View>
				</ScrollView>
		</StaggeredStack>
	), [
		activeFilter,
		activePeriod,
		clearTransactionSelection,
		isEn,
		handleDeleteSelectedTransactions,
		reportPeriod.ruleName,
		reportPeriodLabel,
		list.length,
		loadError,
		selectedTransactionIds.length,
		styles,
		theme.colors.brandPrimary,
		theme.colors.brandPrimaryDeep,
		theme.colors.textInverse,
		theme.mode,
		totalExpense,
		totalIncome,
	]);

	const ListEmpty = () => (
		<EmptyState
			icon="transactions"
			tone="accent"
			title={
				activeFilter === "review"
					? isEn
						? "No transactions need review"
						: "Tidak ada transaksi yang perlu dicek"
					: isEn
						? "No transactions yet"
						: "Belum ada transaksi"
			}
			description={
				activeFilter === "review"
					? isEn
						? "All transactions are clean. Great job!"
						: "Semua transaksi sudah rapi. Kerja bagus!"
					: isEn
						? "Try changing the filter or period, or add a new transaction from the Capture tab."
						: "Coba ubah filter atau periode, atau tambahkan transaksi baru dari tab Capture."
			}
		/>
	);

	if (loading) {
		return (
			<View style={styles.screen}>
				<LoadingState
					label={isEn ? "Loading transactions..." : "Memuat transaksi..."}
				/>
			</View>
		);
	}

	return (
		<PageEntrance testID="transactions-page-entrance" style={styles.screen}>
			<FlatList
				data={list}
				renderItem={renderTransaction}
				keyExtractor={keyExtractor}
				ListHeaderComponent={listHeader}
				ListEmptyComponent={ListEmpty}
				ListFooterComponent={<View style={{ height: 100 }} />}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				initialNumToRender={10}
				maxToRenderPerBatch={10}
				windowSize={5}
				removeClippedSubviews
				refreshing={loading}
				onRefresh={loadTransactions}
				refreshControl={
					<RefreshControl
						refreshing={loading}
						onRefresh={loadTransactions}
						tintColor={theme.colors.brandPrimary}
					/>
				}
			/>

			<Pressable
				testID="transactions-fab"
				accessibilityRole="button"
				accessibilityLabel={
					isEn ? "Add manual transaction" : "Tambah transaksi manual"
				}
				accessibilityState={{ disabled: !canCreate }}
				disabled={!canCreate}
				style={[styles.fab, !canCreate && styles.fabDisabled]}
				onPress={() => router.push("/(tabs)/transaction-new")}
			>
				<KaswiseIcon
					name="capture"
					color={theme.colors.textInverse}
					size={26}
					weight="bold"
				/>
			</Pressable>
		</PageEntrance>
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
		headerBlock: {
			marginBottom: theme.spacing.lg,
			paddingBottom: theme.spacing.xs,
		},
		headerActionRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: theme.spacing.xs,
			justifyContent: "flex-end",
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
		selectionToolbar: {
			marginTop: theme.spacing.md,
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.md,
			borderRadius: theme.radius.lg,
			borderWidth: 1,
			borderColor:
				theme.mode === "light" ? "rgba(101, 163, 13, 0.18)" : "rgba(163, 255, 18, 0.16)",
			backgroundColor:
				theme.mode === "light" ? "rgba(101, 163, 13, 0.08)" : "rgba(163, 255, 18, 0.08)",
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: theme.spacing.md,
			flexWrap: "wrap",
		},
		selectionCountBlock: {
			flex: 1,
			minWidth: 0,
		},
		selectionCountText: {
			color: lightBrand,
			fontSize: theme.typography.fontSize.md,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		selectionHintText: {
			color: theme.colors.textSecondary,
			fontSize: theme.typography.fontSize.sm,
			marginTop: 2,
		},
		selectionToolbarActions: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "flex-end",
			gap: theme.spacing.xs,
			flexShrink: 0,
		},
		selectionIconButton: {
			width: 42,
			height: 42,
			borderRadius: 21,
			backgroundColor: theme.colors.surface,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			alignItems: "center",
			justifyContent: "center",
			position: "relative",
		},
		selectionDeleteIconButton: {
			backgroundColor: theme.mode === "light" ? "rgba(220, 38, 38, 0.08)" : "rgba(248, 113, 113, 0.14)",
			borderColor: theme.colors.danger,
		},
		selectionDeleteCountBadge: {
			position: "absolute",
			right: -4,
			top: -4,
			minWidth: 18,
			height: 18,
			paddingHorizontal: 4,
			borderRadius: 9,
			backgroundColor: theme.colors.danger,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 2,
			borderColor: theme.colors.surface,
		},
		selectionDeleteCountText: {
			color: theme.colors.textInverse,
			fontSize: 10,
			fontWeight: theme.typography.fontWeight.extrabold,
			lineHeight: 10,
		},
		reportPeriodCard: {
			backgroundColor: theme.colors.surface,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			borderRadius: theme.radius.md,
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.sm + 2,
			marginBottom: theme.spacing.sm,
		},
		reportPeriodTitle: {
			color: theme.colors.textMuted,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.bold,
			marginBottom: 2,
		},
		reportPeriodLabel: {
			color: lightBrand,
			fontSize: 13,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		periodRow: {
			flexDirection: "row",
			gap: theme.spacing.sm,
			marginBottom: theme.spacing.lg,
		},
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
			marginTop: theme.spacing.xs,
			marginBottom: theme.spacing.xl,
		},
		statCardShell: {
			flex: 1,
			minWidth: 0,
			minHeight: 140,
		},
		statCard: {
			flex: 1,
			minHeight: 140,
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.lg,
		},
		statCardContent: {
			flex: 1,
			justifyContent: "space-between",
		},
		statValueText: {
			lineHeight: 28,
		},
		filterScroller: {
			marginTop: theme.spacing.xs,
			marginRight: -theme.spacing.xl,
			marginBottom: theme.spacing.lg,
		},
		filterContent: {
			gap: theme.spacing.sm,
			paddingRight: theme.spacing.xl,
			paddingBottom: theme.spacing.xs,
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
		rowCardSelected: {
			backgroundColor:
				theme.mode === "light" ? "rgba(101, 163, 13, 0.08)" : "rgba(163, 255, 18, 0.08)",
		},
		rowIconPressable: {
			position: "relative",
		},
		rowIconSelected: {
			borderWidth: 1,
			borderColor: lightBrand,
		},
		rowSelectionBadge: {
			position: "absolute",
			right: -2,
			top: -2,
			width: 18,
			height: 18,
			borderRadius: 9,
			backgroundColor: lightBrand,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 2,
			borderColor: theme.colors.background,
		},
		rowSelectionBadgeText: {
			color: theme.colors.textInverse,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.extrabold,
			lineHeight: 11,
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
			marginRight: theme.spacing.sm,
			textAlign: "right",
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
		fabDisabled: { opacity: 0.45 },
		fabIcon: {
			color: theme.colors.textInverse,
			fontSize: 26,
			fontWeight: theme.typography.fontWeight.extrabold,
			lineHeight: 28,
		},
	});
}
