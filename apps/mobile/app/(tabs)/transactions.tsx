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
import { LinearGradient } from "expo-linear-gradient";
import * as ExpoRouter from "expo-router";

const { useLocalSearchParams } = ExpoRouter as { useLocalSearchParams?: any };

import { KaswiseIcon } from "../../src/components/icons/kaswise-icons";
import {
	EmptyState,
	FilterChip,
	IconBubble,
	StateMessage,
} from "../../src/components/ui";
import { LoadingState } from "../../src/components/ui/LoadingState";
import { useTheme } from "../../src/theme/theme-context";
import { financeEditorial as fe, resolveFinancialIconPalette } from "../../src/theme/finance-editorial";
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

export function getTransactionIconPalette(
	categoryName: string | null | undefined,
	type: Transaction["transaction_type"],
) {
	return resolveFinancialIconPalette(categoryName, type);
}

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
	const rowIconPalette = getTransactionIconPalette(item.category, item.transaction_type);

	const translateX = useRef(new Animated.Value(0)).current;
	const [actionsVisible, setActionsVisible] = useState(false);
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
	const resetSwipe = useCallback(() => {
		setActionsVisible(false);
		snapTo(0);
	}, [snapTo]);
	useEffect(() => {
		if (selectionMode) {
			setActionsVisible(false);
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
					setActionsVisible(gestureState.dx < -2);
					translateX.setValue(getSwipeTranslateX(gestureState.dx));
				},
				onPanResponderRelease: (_, gestureState) => {
					const shouldOpen = shouldOpenSwipe(gestureState.dx);
					setActionsVisible(shouldOpen);
					snapTo(shouldOpen ? -SWIPE_REVEAL_WIDTH : 0);
				},
				onPanResponderTerminate: () => {
					setActionsVisible(false);
					snapTo(0);
				},
			}),
		[selectionMode, snapTo, translateX],
	);

	return (
		<View
			testID={`transaction-swipe-shell-${item.id}`}
			style={styles.swipeShell}
		>
			{selectionMode ? null : (
				<Animated.View
					testID={`transaction-swipe-actions-${item.id}`}
					style={[styles.swipeActions, { opacity: actionsVisible ? 1 : 0 }]}
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
				</Animated.View>
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
							borderBottomColor: fe.line,
						},
					]}
				>
					<View style={styles.rowIconPressable}>
						<View style={[styles.rowIcon, selected && styles.rowIconSelected]}>
							<IconBubble
								testID={`transaction-icon-${item.id}`}
								name={rowIconName}
								tone={item.transaction_type === "income" ? "success" : "navy"}
								color={rowIconPalette.color}
								backgroundColor={rowIconPalette.background}
								borderColor={rowIconPalette.border}
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
								? { color: fe.financialIncome }
								: { color: fe.financialExpense },
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
			<LinearGradient testID="transactions-hero" colors={[fe.navySurface, fe.blueDeep, fe.blueBright]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.txHero}>
		<View testID="transactions-header-block" style={styles.headerBlock}>
				<View style={styles.headerRow}>
					<View style={styles.headerCopy}>
						<Text accessibilityRole="header" style={styles.headerTitle}>
							{isEn ? "Transactions" : "Transaksi"}
						</Text>
						<Text style={styles.headerSubtitle}>
							{isEn
								? "Track your daily cash flow in detail."
								: "Pantau arus kas harianmu dengan detail."}
						</Text>
					</View>
					{selectedTransactionIds.length === 0 ? (
						<View style={styles.summaryBadge}>
							<Text style={styles.summaryBadgeText}>{list.length} item</Text>
						</View>
					) : null}
				</View>
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
									color={fe.ink}
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

				<View testID="transactions-stat-row" style={styles.statRow}>
				<View testID="transactions-stat-income" style={styles.statCardShell}>
					<View style={styles.statCard}>
						<IconBubble name="chart" tone="success" color={fe.financialIncome} backgroundColor="rgba(22,143,168,0.12)" borderColor="rgba(22,143,168,0.24)" size={36} />
						<View style={styles.statCardContent}>
							<Text style={styles.statLabel}>{isEn ? "Income" : "Pemasukan"}</Text>
							<Text style={styles.statValueText}>{formatCompactRupiah(totalIncome)}</Text>
						</View>
					</View>
				</View>
				<View testID="transactions-stat-expense" style={styles.statCardShell}>
					<View style={styles.statCard}>
						<IconBubble name="transactions" tone="navy" color={fe.blue} backgroundColor="rgba(12,78,145,0.12)" borderColor="rgba(12,78,145,0.24)" size={36} />
						<View style={styles.statCardContent}>
							<Text style={styles.statLabel}>{isEn ? "Expense" : "Pengeluaran"}</Text>
							<Text style={styles.statValueText}>{formatCompactRupiah(totalExpense)}</Text>
						</View>
					</View>
				</View>
				</View>
				</LinearGradient>

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
							activePeriod === period && styles.periodChipActive,
						]}
					>
						<Text
							style={[
								styles.periodChipText,
								activePeriod === period && styles.periodChipTextActive,
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
						tintColor={fe.ink}
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
					color={fe.white}
					size={26}
					weight="bold"
				/>
			</Pressable>
		</PageEntrance>
	);
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
	const lightBrand = fe.ink;

	return StyleSheet.create({
		screen: { flex: 1, backgroundColor: fe.paper },
		content: { padding: 20, gap: 12, paddingBottom: 130 },
		txHero: { marginHorizontal: -20, marginTop: -20, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: 42, borderBottomRightRadius: 42, overflow: "hidden", gap: 14 },
		headerBlock: { marginBottom: 0, paddingTop: 0, paddingBottom: 0 },
		headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
		headerCopy: { flex: 1 },
		headerTitle: { color: fe.white, fontSize: 28, fontWeight: "600", letterSpacing: -0.6 },
		headerSubtitle: { color: "rgba(255,255,255,0.64)", fontSize: 13, marginTop: 3, lineHeight: 19 },
		headerActionRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: theme.spacing.xs,
			justifyContent: "flex-end",
		},
		summaryBadge: { backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
		summaryBadgeText: { color: fe.white, fontSize: 12, fontWeight: "600" },
		selectionToolbar: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 0, backgroundColor: fe.white, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
		selectionCountBlock: {
			flex: 1,
			minWidth: 0,
		},
		selectionCountText: { color: fe.ink, fontSize: 14, fontWeight: "700" },
		selectionHintText: { color: fe.slate, fontSize: 12, marginTop: 2 },
		selectionToolbarActions: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "flex-end",
			gap: theme.spacing.xs,
			flexShrink: 0,
		},
		selectionIconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: fe.paper, borderWidth: 0, alignItems: "center", justifyContent: "center", position: "relative" },
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
			borderColor: fe.white,
		},
		selectionDeleteCountText: {
			color: fe.white,
			fontSize: 10,
			fontWeight: theme.typography.fontWeight.extrabold,
			lineHeight: 10,
		},
		reportPeriodCard: { backgroundColor: fe.white, borderWidth: 0, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 4 },
		reportPeriodTitle: { color: fe.muted, fontSize: 11, fontWeight: "600", marginBottom: 3 },
		reportPeriodLabel: { color: fe.ink, fontSize: 14, fontWeight: "700" },
		periodRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
		periodChip: { flex: 1, paddingVertical: 10, minHeight: 44, borderRadius: 14, borderWidth: 0, backgroundColor: fe.white, alignItems: "center", justifyContent: "center" },
		periodChipActive: { backgroundColor: fe.ink },
		periodChipText: { color: fe.slate, fontSize: 13, fontWeight: "600" },
		periodChipTextActive: { color: fe.white },
		statRow: { flexDirection: "row", gap: 12, marginTop: 2, marginBottom: 0 },
		statCardShell: { flex: 1, minWidth: 0, minHeight: 132 },
		statCard: { flex: 1, minHeight: 132, padding: 16, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", justifyContent: "space-between" },
		statCardContent: { gap: 4 },
		statLabel: { color: "rgba(255,255,255,0.70)", fontSize: 12, fontWeight: "600" },
		statValueText: { color: fe.white, fontSize: 22, fontWeight: "700", lineHeight: 28 },
		filterScroller: { marginTop: 4, marginRight: -20, marginBottom: 16 },
		filterContent: { gap: 8, paddingRight: 20, paddingBottom: 4 },
		swipeShell: { position: "relative", overflow: "hidden", borderRadius: 18, backgroundColor: fe.white },
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
		swipeEditButton: { backgroundColor: fe.blue },
		swipeDeleteButton: {
			backgroundColor: theme.colors.danger,
		},
		swipeActionText: { color: fe.white, fontSize: 12, fontWeight: "700" },
		rowCard: { backgroundColor: fe.white, borderRadius: 18 },
		rowCardSelected: { backgroundColor: "rgba(38,81,150,0.08)" },
		rowIconPressable: {
			position: "relative",
		},
		rowIconSelected: { borderWidth: 1, borderColor: fe.blue },
		rowSelectionBadge: { position: "absolute", right: -2, top: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: fe.blue, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: fe.paper },
		rowSelectionBadgeText: { color: fe.white, fontSize: 11, fontWeight: "700", lineHeight: 11 },
		row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, minHeight: 58 },
		rowIcon: {
			width: 44,
			height: 44,
			borderRadius: theme.radius.sm + 2,
			alignItems: "center",
			justifyContent: "center",
		},
		rowInfo: { flex: 1 },
		rowTitle: { color: fe.ink, fontSize: 14, fontWeight: "600" },
		rowMerchant: { color: fe.slate, fontSize: 12, marginTop: 1 },
		rowSub: { color: fe.muted, fontSize: 11, marginTop: 2 },
		rowAmount: { fontSize: 14, fontWeight: "700", marginRight: 8, textAlign: "right" },
		fab: { position: "absolute", right: 22, bottom: 104, width: 56, height: 56, borderRadius: 28, backgroundColor: fe.ink, alignItems: "center", justifyContent: "center", shadowColor: fe.navy, shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
		fabDisabled: { opacity: 0.45 },
		fabIcon: { color: fe.white, fontSize: 26, fontWeight: "700", lineHeight: 28 },
	});
}
