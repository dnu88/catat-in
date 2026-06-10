import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
	Share,
	KeyboardAvoidingView,
	Modal,
	Platform,
	RefreshControl,
	TextInput,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "../../src/theme/theme-context";
import { useSupabase } from "../../src/lib/supabase";
import { IOSWheelDatePicker } from "../../src/components/date/IOSWheelDatePicker";
import { IconBubble } from "../../src/components/ui";
import { PageEntrance, StaggeredEntrance } from "../../src/components/motion";
import { KaswiseIcon, type KaswiseIconName } from "../../src/components/icons/kaswise-icons";
import {
	resolveCategoryVisual,
	type CategoryTone,
} from "../../src/theme/category-visuals";
import { useI18n } from "../../src/i18n/i18n-context";
import { useFinanceContext } from "../../src/state/finance-context";
import {
	buildCustomReportPeriod,
	buildReportPeriod,
	formatReportPeriodLabel,
	formatSavedRuleSummary,
	isCurrentMonthPeriod,
	parseDateKey,
	type ReportPeriodPreset,
	useReportPeriod,
} from "../../src/state/report-period";
import { applyFinanceContextFilter } from "../../src/services/finance-context-query";
import { listCategories, type Category } from "../../src/services/categories";
import { markFirstUseReportsVisited } from "../../src/services/first-use-guide";
import { getCategoryCanonicalId, getLocalizedCategoryName } from "../../src/services/category-taxonomy";
import {
	reportCategoryPalette,
	reportCategoryRoleColors,
	reportDefaultCategoryColors,
} from "../../src/theme/report-palettes";
import { AiInsightCard } from "../../src/components/ai/AiInsightCard";
import type { AiInsight } from "../../src/services/ai-insights";
import { getAiInsight, AiInsightPremiumRequiredError } from "../../src/services/ai-insights";
import { useEntitlements } from "../../src/hooks/useEntitlements";

const categories = [
	{
		id: "food",
		label: "Makanan & Minuman",
		percent: 32,
		value: 2_050_000,
		amount: "Rp 2.050.000",
		icon: "food" as KaswiseIconName,
		color: reportDefaultCategoryColors.food,
		tone: "success" as const,
	},
	{
		id: "transport",
		label: "Transportasi",
		percent: 22,
		value: 1_408_000,
		amount: "Rp 1.408.000",
		icon: "transport" as KaswiseIconName,
		color: reportDefaultCategoryColors.transport,
		tone: "navy" as const,
	},
	{
		id: "shopping",
		label: "Belanja",
		percent: 18,
		value: 1_152_000,
		amount: "Rp 1.152.000",
		icon: "groceries" as KaswiseIconName,
		color: reportDefaultCategoryColors.shopping,
		tone: "warning" as const,
	},
	{
		id: "bills",
		label: "Tagihan",
		percent: 15,
		value: 960_000,
		amount: "Rp 960.000",
		icon: "bills" as KaswiseIconName,
		color: reportDefaultCategoryColors.bills,
		tone: "danger" as const,
	},
	{
		id: "entertainment",
		label: "Hiburan",
		percent: 8,
		value: 512_000,
		amount: "Rp 512.000",
		icon: "recreation" as KaswiseIconName,
		color: reportDefaultCategoryColors.entertainment,
		tone: "info" as const,
	},
	{
		id: "other",
		label: "Lainnya",
		percent: 5,
		value: 320_000,
		amount: "Rp 320.000",
		icon: "otherExpenses" as KaswiseIconName,
		color: reportDefaultCategoryColors.other,
		tone: "neutral" as const,
	},
];

type Tab = "overview" | "category" | "compare";
type PeriodFilter = ReportPeriodPreset | "custom" | "saved_rule";
type ReportTransaction = {
	amount: number;
	transaction_type: "income" | "expense";
	category: string | null;
	date: string | null;
	description?: string | null;
	merchant?: string | null;
	note?: string | null;
};

type ReportTransactionRow = {
	amount?: number | string | null;
	nominal?: number | string | null;
	transaction_type?: "income" | "expense" | null;
	type?: "income" | "expense" | null;
	category?: string | null;
	kategori?: string | null;
	date?: string | null;
	tanggal?: string | null;
	created_at?: string | null;
	description?: string | null;
	catatan?: string | null;
	note?: string | null;
	merchant?: string | null;
};

function toReportDateKey(value: string | null | undefined) {
	return value ? String(value).slice(0, 10) : null;
}

function normalizeReportTransaction(
	row: ReportTransactionRow,
): ReportTransaction {
	const date = toReportDateKey(row.date ?? row.tanggal ?? row.created_at);
	const transactionType = row.transaction_type ?? row.type;
	const description = row.description ?? row.catatan ?? row.note ?? row.merchant;

	return {
		amount: Number(row.amount ?? row.nominal ?? 0),
		transaction_type: transactionType === "income" ? "income" : "expense",
		category: row.category ?? row.kategori ?? null,
		date,
		description: description ?? null,
		merchant: row.merchant ?? null,
		note: row.note ?? row.catatan ?? null,
	};
}

function filterReportTransactionsByDateRange(
	transactions: ReportTransaction[],
	startDateString: string,
	endDateString: string,
) {
	return transactions.filter((transaction) => {
		const value = toReportDateKey(transaction.date);
		return Boolean(value && value >= startDateString && value <= endDateString);
	});
}

const fallbackCategoryColors = reportCategoryPalette;

function stableCategoryIndex(categoryName: string, paletteLength: number) {
	const normalized = categoryName.trim().toLowerCase() || "other";
	let hash = 0;
	for (let index = 0; index < normalized.length; index += 1) {
		hash = (hash * 31 + normalized.charCodeAt(index)) % paletteLength;
	}
	return hash;
}

const periodLabelsId: Record<Exclude<PeriodFilter, "saved_rule">, string> = {
	month: "1 Bulan",
	"3month": "3 Bulan",
	"6month": "6 Bulan",
	year: "1 Tahun",
	custom: "Kustom",
};
const periodLabelsEn: Record<Exclude<PeriodFilter, "saved_rule">, string> = {
	month: "1 Month",
	"3month": "3 Months",
	"6month": "6 Months",
	year: "1 Year",
	custom: "Custom",
};

export default function ReportsScreen() {
	const { theme } = useTheme();
	const router = useRouter();
	const { supabase } = useSupabase();
	const { activeContext } = useFinanceContext();
	const { data: entitlements } = useEntitlements();
	const isPremium = entitlements?.plan === "premium";
	const {
		activePeriod,
		savedRules,
		setActivePeriod,
		resetToCurrentMonth,
		saveMonthlyCycleRule,
		updateSavedRule,
		deleteSavedRule,
		selectSavedRule,
	} = useReportPeriod();
	const { language } = useI18n();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const [activeTab, setActiveTab] = useState<Tab>("overview");
	const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month");
	const [selectedBar, setSelectedBar] = useState<number | null>(null);
	const [dataLoading, setDataLoading] = useState(false);
	const [refreshTick, setRefreshTick] = useState(0);
	const hasFocusedOnceRef = useRef(false);
	const [dataError, setDataError] = useState<string | null>(null);
	const [realTransactionCount, setRealTransactionCount] = useState<
		number | null
	>(null);
	const [showDateModal, setShowDateModal] = useState(false);
	const [showSaveRuleModal, setShowSaveRuleModal] = useState(false);
	const [managedRuleId, setManagedRuleId] = useState<string | null>(null);
	const [renameRuleId, setRenameRuleId] = useState<string | null>(null);
	const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
	const [ruleName, setRuleName] = useState("");
	const [editingRuleName, setEditingRuleName] = useState("");
	const [customStartYear, setCustomStartYear] = useState(
		new Date().getFullYear(),
	);
	const [customStartMonth, setCustomStartMonth] = useState(
		new Date().getMonth() + 1,
	);
	const [customStartDay, setCustomStartDay] = useState(1);
	const [customEndYear, setCustomEndYear] = useState(new Date().getFullYear());
	const [customEndMonth, setCustomEndMonth] = useState(
		new Date().getMonth() + 1,
	);
	const [customEndDay, setCustomEndDay] = useState(new Date().getDate());
	const [compareData, setCompareData] = useState<{
		current: {
			income: number;
			expense: number;
			net: number;
			count: number;
		} | null;
		previous: {
			income: number;
			expense: number;
			net: number;
			count: number;
		} | null;
	} | null>(null);
	const [dynamicCategories, setDynamicCategories] =
		useState<
			Array<{
				id: string;
				label: string;
				percent: number;
				value: number;
				amount: string;
				icon: KaswiseIconName;
				color: string;
				tone: CategoryTone;
			}>
		>([]);
	const [reportTransactions, setReportTransactions] = useState<
		ReportTransaction[]
	>([]);
	const [categoryOptions, setCategoryOptions] = useState<Category[]>([]);
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
		null,
	);
	const [aiInsight, setAiInsight] = useState<AiInsight | null>(null);
	const [aiInsightLoading, setAiInsightLoading] = useState(false);
	const [aiInsightError, setAiInsightError] = useState<string | null>(null);

	const handleGenerateAiInsight = useCallback(async () => {
		if (!isPremium) {
			router.push("/upgrade" as never);
			return;
		}
		setAiInsightLoading(true);
		setAiInsightError(null);
		try {
			const result = await getAiInsight(
				supabase,
				activePeriod.type,
				activePeriod.startDate,
				activePeriod.endDate,
			);
			setAiInsight(result);
		} catch (err) {
			if (err instanceof AiInsightPremiumRequiredError) {
				setAiInsightError("Fitur ini hanya tersedia untuk pengguna Premium.");
			} else {
				setAiInsightError(err instanceof Error ? err.message : "Gagal memuat insight AI.");
			}
		} finally {
			setAiInsightLoading(false);
		}
	}, [isPremium, router, supabase, activePeriod]);

	const otherCategoryPercent = dynamicCategories.find(
		(category) => category.id === "other_expenses" || getCategoryCanonicalId(category.label) === "other_expenses",
	)?.percent ?? 0;
	const shouldShowOtherCategoryInsight = otherCategoryPercent >= 10;

	const categoryRoleColors = reportCategoryRoleColors[theme.mode];

	const colorForCategoryIndex = (categoryName: string, offset: number) => {
		const palette = fallbackCategoryColors[theme.mode];
		const baseIndex = stableCategoryIndex(categoryName, palette.length);
		return palette[(baseIndex + offset) % palette.length];
	};

	const withUniqueCategoryColors = <
		T extends { id: string; color: string; visualLocked?: boolean },
	>(items: T[]) => {
		const usedColors = new Set<string>();
		return items.map((item) => {
			if (item.visualLocked || !usedColors.has(item.color)) {
				usedColors.add(item.color);
				return item;
			}

			let offset = 1;
			let nextColor = colorForCategoryIndex(item.id, offset);
			while (
				usedColors.has(nextColor) &&
				offset < fallbackCategoryColors[theme.mode].length
			) {
				offset += 1;
				nextColor = colorForCategoryIndex(item.id, offset);
			}
			usedColors.add(nextColor);
			return { ...item, color: nextColor };
		});
	};

	const isEn = language === "en";
	const periodLabels = isEn ? periodLabelsEn : periodLabelsId;

	const tx = isEn
		? {
				title: "Reports",
				subtitle: "Monthly financial performance summary.",
				share: "Share",
				overview: "Overview",
				category: "Category",
				compare: "Comparison",
				monthBadge: `${new Date().toLocaleString("en-US", { month: "short" })} ${new Date().getFullYear()}`,
				loading: "Loading transaction data...",
				loadingCompare: "Loading comparison data...",
				errorLogin: "Not logged in",
				errorLoad: "Failed to load transaction data",
				txFound: (n: number) => `${n} transaction${n !== 1 ? "s" : ""} found`,
				trendTitle: "Cashflow Pulse",
				trendSub: "Rhythm of income, spend, and net flow per selected period",
				income: "Income",
				expense: "Expense",
				savings: "Savings",
				transactions: "Transactions",
				thisMonth: "this month",
				tooltipIncome: "Income",
				tooltipExpense: "Expense",
				breakdownTitle: "Expense Breakdown",
				breakdownSub: "By category",
				ringLabel: "Total",
				compareTitle: "Last Month Comparison",
				compareSub: "Compare with previous period",
				compareIncome: "Income",
				compareExpense: "Expense",
				compareSavings: "Savings",
				compareTxCount: "Transactions",
				noCompareData: "No data from the previous period to compare.",
				errorDateRange: "Invalid date range",
				modalTitle: "Select Date Range",
				modalStart: "Start",
				modalEnd: "End",
				modalDay: "Day",
				modalCancel: "Cancel",
				modalApply: "Apply",
				modalDone: "Done",
				savedRulesTitle: "Saved periods",
				savedRulesEmpty: "Save a custom range to reuse it here.",
				savedRulesCount: (count: number) => `${count} saved`,
				saveRuleCta: "Save as rule",
				saveRuleTitle: "Save period rule",
				saveRuleName: "Rule name",
				saveRuleHint: (startDay: number, endDay: number) => `Repeats every month from day ${startDay} to ${endDay}.`,
				saveRuleConfirm: "Save rule",
				savedRuleAccessibility: (name: string) => `Choose saved period ${name}`,
				manageRuleAccessibility: (name: string) => `Manage saved period ${name}`,
				activePeriodTitle: "Active period",
				resetToThisMonth: "This month",
				manageRuleTitle: "Manage period rule",
				renameRule: "Rename rule",
				saveRuleNameAction: "Save name",
				defaultRuleActive: "Default active",
				deleteRule: "Delete",
				deleteRuleConfirmTitle: "Delete period rule?",
				deleteRuleConfirmBody: (name: string) => `Delete ${name}? This saved period will be removed from Reports.`,
				deleteRuleConfirmAction: "Delete rule",
				detailTitle: "Transactions",
				noCategoryTransactions: "No transactions in this category.",
				otherCategoryInsight: (percent: number) =>
					`Other expenses are ${percent}% of spending. Review these transactions so reports stay accurate.`,
				shareTitle: "Financial Report",
				shareIncome: "Income",
				shareExpense: "Expense",
				shareSavings: "Savings",
				shareTxCount: "Transactions",
				contextPersonal: "Personal",
				contextHousehold: "Family",
				shareA11y: "Share report",
				manageBudgetA11y: "Manage budget wallets",
				choosePeriodA11y: (label: string) => `Choose period ${label}`,
				showOverviewA11y: "Show report overview",
				showCategoryA11y: "Show report category",
				showCompareA11y: "Show report comparison",
				editCustomRangeA11y: "Edit custom date range",
				chartColumnA11y: (label: string, year: number) => `View cashflow rhythm ${label} ${year}`,
				donutA11y: "Expense composition by category",
				openCategoryA11y: (label: string) => `Open category detail ${label}`,
				closeDateRangeA11y: "Close date range",
				closeCategoryDetailA11y: "Close category detail",
				topExpenses: "Top 5 Expenses",
				budgetWalletTitle: "Budget Wallets",
				budgetWalletMeta:
					"Personal budgets like Coffee, Ride-hailing, and Hangout.",
				budgetWalletManage: "Manage",
			}
		: {
				title: "Laporan",
				subtitle: "Ringkasan performa finansial bulanan.",
				share: "Bagikan",
				overview: "Ringkasan",
				category: "Kategori",
				compare: "Perbandingan",
				monthBadge: `${new Date().toLocaleString("id-ID", { month: "short" })} ${new Date().getFullYear()}`,
				loading: "Memuat data transaksi...",
				loadingCompare: "Memuat data perbandingan...",
				errorLogin: "Belum login",
				errorLoad: "Gagal memuat data transaksi",
				txFound: (n: number) => `${n} transaksi ditemukan`,
				trendTitle: "Ritme Kas",
				trendSub: "Irama pemasukan, pengeluaran, dan sisa per periode",
				income: "Pemasukan",
				expense: "Pengeluaran",
				savings: "Tabungan",
				transactions: "Transaksi",
				thisMonth: "bulan ini",
				tooltipIncome: "Pemasukan",
				tooltipExpense: "Pengeluaran",
				breakdownTitle: "Rincian Pengeluaran",
				breakdownSub: "Per kategori",
				ringLabel: "Total",
				compareTitle: "Perbandingan Bulan Lalu",
				compareSub: "Bandingkan dengan periode sebelumnya",
				compareIncome: "Pemasukan",
				compareExpense: "Pengeluaran",
				compareSavings: "Tabungan",
				compareTxCount: "Jumlah Transaksi",
				noCompareData: "Tidak ada data periode sebelumnya untuk dibandingkan.",
				errorDateRange: "Rentang tanggal tidak valid",
				modalTitle: "Pilih Rentang Tanggal",
				modalStart: "Mulai",
				modalEnd: "Selesai",
				modalDay: "Tanggal",
				modalCancel: "Batal",
				modalApply: "Terapkan",
				modalDone: "Selesai",
				savedRulesTitle: "Aturan periode",
				savedRulesEmpty: "Simpan rentang kustom agar bisa dipakai lagi di sini.",
				savedRulesCount: (count: number) => `${count} tersimpan`,
				saveRuleCta: "Simpan sebagai aturan",
				saveRuleTitle: "Simpan aturan periode",
				saveRuleName: "Nama aturan",
				saveRuleHint: (startDay: number, endDay: number) => `Berulang tiap bulan dari tanggal ${startDay} sampai ${endDay}.`,
				saveRuleConfirm: "Simpan aturan",
				savedRuleAccessibility: (name: string) => `Pilih aturan periode ${name}`,
				manageRuleAccessibility: (name: string) => `Kelola aturan periode ${name}`,
				activePeriodTitle: "Periode aktif",
				resetToThisMonth: "Bulan ini",
				manageRuleTitle: "Kelola aturan periode",
				renameRule: "Ubah nama aturan",
				saveRuleNameAction: "Simpan nama",
				defaultRuleActive: "Default aktif",
				deleteRule: "Hapus",
				deleteRuleConfirmTitle: "Hapus aturan periode?",
				deleteRuleConfirmBody: (name: string) => `Hapus ${name}? Aturan periode ini akan hilang dari Laporan.`,
				deleteRuleConfirmAction: "Hapus aturan",
				detailTitle: "Transaksi",
				noCategoryTransactions: "Belum ada transaksi di kategori ini.",
				otherCategoryInsight: (percent: number) =>
					`Lainnya mencapai ${percent}% pengeluaran. Rapikan kategori agar laporan lebih akurat.`,
				shareTitle: "Laporan Keuangan",
				shareIncome: "Pemasukan",
				shareExpense: "Pengeluaran",
				shareSavings: "Tabungan",
				shareTxCount: "Jumlah transaksi",
				contextPersonal: "Pribadi",
				contextHousehold: "Keluarga",
				shareA11y: "Bagikan laporan",
				manageBudgetA11y: "Kelola dompet budget",
				choosePeriodA11y: (label: string) => `Pilih periode ${label}`,
				showOverviewA11y: "Tampilkan ringkasan laporan",
				showCategoryA11y: "Tampilkan kategori laporan",
				showCompareA11y: "Tampilkan perbandingan laporan",
				editCustomRangeA11y: "Ubah rentang tanggal kustom",
				chartColumnA11y: (label: string, year: number) => `Lihat ritme kas ${label} ${year}`,
				donutA11y: "Komposisi pengeluaran berdasarkan kategori",
				openCategoryA11y: (label: string) => `Buka detail kategori ${label}`,
				closeDateRangeA11y: "Tutup rentang tanggal",
				closeCategoryDetailA11y: "Tutup detail kategori",
				topExpenses: "5 Pengeluaran Terbanyak",
				budgetWalletTitle: "Dompet",
				budgetWalletMeta: "Budget personal seperti Kopi, Ojol, dan Nongkrong.",
				budgetWalletManage: "Kelola",
			};

	const monthName = (month: number) =>
		(language === "en"
			? [
					"Jan",
					"Feb",
					"Mar",
					"Apr",
					"May",
					"Jun",
					"Jul",
					"Aug",
					"Sep",
					"Oct",
					"Nov",
					"Dec",
				]
			: [
					"Jan",
					"Feb",
					"Mar",
					"Apr",
					"Mei",
					"Jun",
					"Jul",
					"Agu",
					"Sep",
					"Okt",
					"Nov",
					"Des",
				])[month - 1];

	const pad2 = (value: number) => String(value).padStart(2, "0");
	const dateKey = (year: number, month: number, day: number) =>
		`${year}-${pad2(month)}-${pad2(day)}`;
	const daysInMonth = (year: number, month: number) =>
		new Date(year, month, 0).getDate();
	const customStartIso = dateKey(customStartYear, customStartMonth, customStartDay);
	const customEndIso = dateKey(customEndYear, customEndMonth, customEndDay);
	const customRangeLabel = `${customStartDay} ${monthName(customStartMonth)} ${customStartYear} - ${customEndDay} ${monthName(customEndMonth)} ${customEndYear}`;

	useEffect(() => {
		setPeriodFilter(activePeriod.type);
		if (activePeriod.type === "custom" || activePeriod.type === "saved_rule") {
			const start = parseDateKey(activePeriod.startDate);
			const end = parseDateKey(activePeriod.endDate);
			setCustomStartYear(start.year);
			setCustomStartMonth(start.month);
			setCustomStartDay(start.day);
			setCustomEndYear(end.year);
			setCustomEndMonth(end.month);
			setCustomEndDay(end.day);
		}
	}, [activePeriod]);

	const activePeriodRangeLabel = formatReportPeriodLabel(activePeriod, isEn ? "en" : "id");
	const periodDisplayLabel =
		periodFilter === "custom"
			? customRangeLabel
			: periodFilter === "saved_rule"
				? `${activePeriod.ruleName ?? tx.savedRulesTitle} · ${activePeriodRangeLabel}`
				: periodFilter === "month"
					? `${monthName(new Date().getMonth() + 1)} ${new Date().getFullYear()}`
					: periodLabels[periodFilter];
	const managedSavedRule = managedRuleId
		? savedRules.find((rule) => rule.id === managedRuleId) ?? null
		: null;
	const renameSavedRule = renameRuleId
		? savedRules.find((rule) => rule.id === renameRuleId) ?? null
		: null;
	const deleteConfirmRule = deleteRuleId
		? savedRules.find((rule) => rule.id === deleteRuleId) ?? null
		: null;
	const activePeriodNameLabel = activePeriod.ruleName ?? activePeriodRangeLabel;
	const shouldShowActivePeriodRange = Boolean(activePeriod.ruleName);
	const isCurrentMonthActive = isCurrentMonthPeriod(activePeriod);

	useEffect(() => {
		setEditingRuleName(renameSavedRule?.name ?? "");
	}, [renameSavedRule?.id, renameSavedRule?.name]);

	const formatRupiah = (valueInJuta: number) =>
		`Rp ${(valueInJuta * 1_000_000).toLocaleString("id-ID")}`;
	const formatCompactRupiah = (value: number) => {
		if (value >= 1_000_000) {
			return `Rp ${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
		}
		if (value >= 1_000) {
			return `Rp ${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
		}
		return `Rp ${value.toLocaleString("id-ID")}`;
	};
	const summaryIncome = useMemo(
		() =>
			reportTransactions
				.filter((transaction) => transaction.transaction_type === "income")
				.reduce((sum, transaction) => sum + (transaction.amount || 0), 0),
		[reportTransactions],
	);
	const summaryExpense = useMemo(
		() =>
			reportTransactions
				.filter((transaction) => transaction.transaction_type === "expense")
				.reduce((sum, transaction) => sum + (transaction.amount || 0), 0),
		[reportTransactions],
	);
	const summaryNet = summaryIncome - summaryExpense;
	const savingRate =
		summaryIncome > 0
			? `${((summaryNet / summaryIncome) * 100).toLocaleString(isEn ? "en-US" : "id-ID", { maximumFractionDigits: 1 })}% ${isEn ? "saving rate" : "rasio tabungan"}`
			: `0% ${isEn ? "saving rate" : "rasio tabungan"}`;
	const chartData = useMemo(() => {
		const parseLocalDate = (value: string | null) => {
			if (!value) return null;
			const [year, month, day] = value.slice(0, 10).split("-").map(Number);
			if (!year || !month || !day) return null;
			return new Date(year, month - 1, day);
		};
		const sameDayOrAfter = (left: Date, right: Date) =>
			dateKey(left.getFullYear(), left.getMonth() + 1, left.getDate()) >=
			dateKey(right.getFullYear(), right.getMonth() + 1, right.getDate());
		const sameDayOrBefore = (left: Date, right: Date) =>
			dateKey(left.getFullYear(), left.getMonth() + 1, left.getDate()) <=
			dateKey(right.getFullYear(), right.getMonth() + 1, right.getDate());
		const now = new Date();
		const monthLabel = (date: Date) => monthName(date.getMonth() + 1);
		const buckets: Array<{
			key: string;
			label: string;
			year: number;
			start: Date;
			end: Date;
			income: number;
			expense: number;
		}> = [];

		if (periodFilter === "month") {
			const year = now.getFullYear();
			const month = now.getMonth();
			const lastDay = new Date(year, month + 1, 0).getDate();
			for (let day = 1; day <= lastDay; day += 7) {
				const endDay = Math.min(day + 6, lastDay);
				buckets.push({
					key: `${year}-${pad2(month + 1)}-${pad2(day)}`,
					label: `${day}–${endDay}`,
					year,
					start: new Date(year, month, day),
					end: new Date(year, month, endDay),
					income: 0,
					expense: 0,
				});
			}
		} else if (periodFilter === "custom" || periodFilter === "saved_rule") {
			const start = new Date(customStartYear, customStartMonth - 1, customStartDay);
			const end = new Date(customEndYear, customEndMonth - 1, customEndDay);
			const daySpan = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
			if (daySpan <= 31) {
				const step = Math.max(1, Math.ceil(daySpan / 7));
				for (let offset = 0; offset < daySpan; offset += step) {
					const bucketStart = new Date(start);
					bucketStart.setDate(start.getDate() + offset);
					const bucketEnd = new Date(start);
					bucketEnd.setDate(start.getDate() + Math.min(offset + step - 1, daySpan - 1));
					buckets.push({
						key: dateKey(bucketStart.getFullYear(), bucketStart.getMonth() + 1, bucketStart.getDate()),
						label: step === 1 ? String(bucketStart.getDate()) : `${bucketStart.getDate()}–${bucketEnd.getDate()}`,
						year: bucketStart.getFullYear(),
						start: bucketStart,
						end: bucketEnd,
						income: 0,
						expense: 0,
					});
				}
			} else {
				const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
				while (cursor <= end && buckets.length < 18) {
					const bucketStart = new Date(cursor);
					const bucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
					buckets.push({
						key: `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}`,
						label: monthLabel(cursor),
						year: cursor.getFullYear(),
						start: bucketStart,
						end: bucketEnd,
						income: 0,
						expense: 0,
					});
					cursor.setMonth(cursor.getMonth() + 1);
				}
			}
		} else {
			const monthsBack = periodFilter === "3month" ? 3 : periodFilter === "6month" ? 6 : 12;
			for (let index = monthsBack - 1; index >= 0; index -= 1) {
				const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
				buckets.push({
					key: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`,
					label: monthLabel(date),
					year: date.getFullYear(),
					start: date,
					end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
					income: 0,
					expense: 0,
				});
			}
		}

		for (const transaction of reportTransactions) {
			const txDate = parseLocalDate(transaction.date);
			if (!txDate) continue;
			const bucket = buckets.find(
				(item) => sameDayOrAfter(txDate, item.start) && sameDayOrBefore(txDate, item.end),
			);
			if (!bucket) continue;
			if (transaction.transaction_type === "income") bucket.income += transaction.amount || 0;
			else bucket.expense += transaction.amount || 0;
		}

		return {
			keys: buckets.map((bucket) => bucket.key),
			labels: buckets.map((bucket) => bucket.label),
			years: buckets.map((bucket) => bucket.year),
			income: buckets.map((bucket) => bucket.income / 1_000_000),
			expense: buckets.map((bucket) => bucket.expense / 1_000_000),
		};
	}, [
		customEndDay,
		customEndMonth,
		customEndYear,
		customStartDay,
		customStartMonth,
		customStartYear,
		periodFilter,
		reportTransactions,
	]);

	useEffect(() => {
		setSelectedBar(null);
	}, [
		customEndDay,
		customEndMonth,
		customEndYear,
		customStartDay,
		customStartMonth,
		customStartYear,
		periodFilter,
	]);
	const top5Expenses = useMemo(() => {
		const grouped = new Map<string, { amount: number; sourceName: string }>();
		for (const transaction of reportTransactions) {
			if (transaction.transaction_type !== "expense") continue;
			const sourceName =
				(transaction.category || "").toString().trim() ||
				(isEn ? "Other expenses" : "Lainnya");
			const key = getCategoryCanonicalId(sourceName) || "other_expenses";
			const current = grouped.get(key);
			grouped.set(key, {
				amount: (current?.amount || 0) + (transaction.amount || 0),
				sourceName: current?.sourceName ?? sourceName,
			});
		}
		return Array.from(grouped.entries())
			.map(([_, group]) => ({
				category: getLocalizedCategoryName(group.sourceName, isEn ? "en" : "id"),
				amount: group.amount,
			}))
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 5);
	}, [isEn, reportTransactions]);
	const maxVal = Math.max(1, ...chartData.income, ...chartData.expense);
	const pulseMaxHeight = 58;
	const pulseHeightFor = (value: number) => {
		if (value <= 0) return 2;
		return Math.max(8, Math.round((value / maxVal) * pulseMaxHeight));
	};
	const netValueFor = (idx: number) =>
		(chartData.income[idx] ?? 0) - (chartData.expense[idx] ?? 0);
	const pulseAccessibilityLabel = `${tx.trendTitle}: ${periodDisplayLabel}`;
	const donutSize = 180;
	const donutCenter = donutSize / 2;
	const donutRadius = 64;
	const donutStrokeWidth = 18;
	const donutGlowStrokeWidth = 21;
	const donutCircumference = 2 * Math.PI * donutRadius;
	const donutSegmentGap = 6;
	const incomeAccent = categoryRoleColors.success;
	const expenseAccent =
		theme.mode === "light"
			? theme.colors.textPrimary
			: categoryRoleColors.danger;
	const totalIncomeJuta = summaryIncome / 1_000_000;
	const totalExpenseJuta = summaryExpense / 1_000_000;
	const netJuta = summaryNet / 1_000_000;
	const donutTotalLabel = formatCompactRupiah(summaryExpense);
	const categoryValueTotal = dynamicCategories.reduce(
		(sum, cat) => sum + Math.max(0, cat.value ?? 0),
		0,
	);
	const categoryPercentTotal =
		dynamicCategories.reduce((sum, cat) => sum + Math.max(0, cat.percent), 0) ||
		100;
	const donutSegments = dynamicCategories
		.map((cat) => {
			const normalizedRatio =
				categoryValueTotal > 0
					? Math.max(0, cat.value ?? 0) / categoryValueTotal
					: Math.max(0, cat.percent) / categoryPercentTotal;
			const rawDashLength = normalizedRatio * donutCircumference;
			const segmentGap = Math.min(donutSegmentGap, rawDashLength * 0.32);
			return {
				...cat,
				dashLength: Math.max(0, rawDashLength - segmentGap),
				gapLength: donutCircumference - Math.max(0, rawDashLength - segmentGap),
				sweepLength: rawDashLength,
				offsetLength: 0,
			};
		})
		.map((cat, index, items) => {
			const previousLength = items
				.slice(0, index)
				.reduce((sum, item) => sum + item.sweepLength, 0);
			return { ...cat, offsetLength: previousLength };
		});

	const selectedCategory =
		dynamicCategories.find((cat) => cat.id === selectedCategoryId) ?? null;
	const selectedCategoryTransactions = selectedCategoryId
		? reportTransactions
				.filter((transaction) => transaction.transaction_type === "expense")
				.filter(
					(transaction) =>
						(getCategoryCanonicalId(transaction.category || "other") || "other_expenses") ===
						selectedCategoryId,
				)
				.sort((a, b) => (b.date || "").localeCompare(a.date || ""))
		: [];

	const defaultRuleName = `${isEn ? "Cycle" : "Siklus"} ${customStartDay}–${customEndDay}`;

	const openCustomDateModal = () => {
		setShowDateModal(true);
	};

	const openSaveRuleModal = () => {
		setRuleName(defaultRuleName);
		setShowSaveRuleModal(true);
	};

	const handleSaveRule = () => {
		saveMonthlyCycleRule({
			name: ruleName.trim() || defaultRuleName,
			startDay: customStartDay,
			endDay: customEndDay,
		});
		setShowSaveRuleModal(false);
		setShowDateModal(false);
	};

	const openRuleManageModal = (ruleId: string) => {
		setManagedRuleId(ruleId);
	};

	const closeRuleManageModal = () => {
		setManagedRuleId(null);
	};

	const openRenameRuleModal = () => {
		if (!managedSavedRule) return;
		setRenameRuleId(managedSavedRule.id);
		setEditingRuleName(managedSavedRule.name);
		closeRuleManageModal();
	};

	const closeRenameRuleModal = () => {
		setRenameRuleId(null);
	};

	const handleSaveRenamedRule = () => {
		if (!renameSavedRule) return;
		updateSavedRule(renameSavedRule.id, { name: editingRuleName });
		closeRenameRuleModal();
	};

	const handleActivateManagedRule = () => {
		if (!managedSavedRule) return;
		selectSavedRule(managedSavedRule.id);
		closeRuleManageModal();
	};

	const openDeleteRuleConfirm = () => {
		if (!managedSavedRule) return;
		setDeleteRuleId(managedSavedRule.id);
		closeRuleManageModal();
	};

	const closeDeleteRuleConfirm = () => {
		setDeleteRuleId(null);
	};

	const handleConfirmDeleteRule = () => {
		if (!deleteConfirmRule) return;
		deleteSavedRule(deleteConfirmRule.id);
		closeDeleteRuleConfirm();
	};

	const applyStartDate = (nextValue: string) => {
		const [nextYear, nextMonth, nextDay] = nextValue.split("-").map(Number);
		if (!nextYear || !nextMonth || !nextDay) return;
		const nextStart = new Date(nextYear, nextMonth - 1, nextDay);
		const currentEnd = new Date(customEndYear, customEndMonth - 1, customEndDay);
		let endYear = customEndYear;
		let endMonth = customEndMonth;
		let endDay = customEndDay;

		setCustomStartYear(nextYear);
		setCustomStartMonth(nextMonth);
		setCustomStartDay(nextDay);
		if (nextStart > currentEnd) {
			endYear = nextYear;
			endMonth = nextMonth;
			endDay = nextDay;
			setCustomEndYear(endYear);
			setCustomEndMonth(endMonth);
			setCustomEndDay(endDay);
		}
		setPeriodFilter("custom");
		setActivePeriod(buildCustomReportPeriod(
			dateKey(nextYear, nextMonth, nextDay),
			dateKey(endYear, endMonth, endDay),
		));
		setDataError(null);
	};

	const applyEndDate = (nextValue: string) => {
		const [nextYear, nextMonth, nextDay] = nextValue.split("-").map(Number);
		if (!nextYear || !nextMonth || !nextDay) return;
		const currentStart = new Date(customStartYear, customStartMonth - 1, customStartDay);
		const nextEnd = new Date(nextYear, nextMonth - 1, nextDay);
		let startYear = customStartYear;
		let startMonth = customStartMonth;
		let startDay = customStartDay;

		setCustomEndYear(nextYear);
		setCustomEndMonth(nextMonth);
		setCustomEndDay(nextDay);
		if (nextEnd < currentStart) {
			startYear = nextYear;
			startMonth = nextMonth;
			startDay = nextDay;
			setCustomStartYear(startYear);
			setCustomStartMonth(startMonth);
			setCustomStartDay(startDay);
		}
		setPeriodFilter("custom");
		setActivePeriod(buildCustomReportPeriod(
			dateKey(startYear, startMonth, startDay),
			dateKey(nextYear, nextMonth, nextDay),
		));
		setDataError(null);
	};

	useFocusEffect(
		useCallback(() => {
			let active = true;
			void supabase.auth
				.getUser()
				.then(({ data: { user } }) => {
					if (active && user?.id) {
						void markFirstUseReportsVisited(user.id);
					}
				})
				.catch(() => undefined);

			if (!hasFocusedOnceRef.current) {
				hasFocusedOnceRef.current = true;
				return () => {
					active = false;
				};
			}

			setRefreshTick((value) => value + 1);
			return () => {
				active = false;
			};
		}, []),
	);

	const handleShare = async () => {
		const periodText =
			periodFilter === "custom" || periodFilter === "saved_rule" ? periodDisplayLabel : periodLabels[periodFilter];
		const shareText = [
			`${tx.shareTitle} (${periodText})`,
			`${tx.shareIncome}: ${formatRupiah(totalIncomeJuta)}`,
			`${tx.shareExpense}: ${formatRupiah(totalExpenseJuta)}`,
			`${tx.shareSavings}: ${formatRupiah(netJuta)}`,
			realTransactionCount !== null
				? `${tx.shareTxCount}: ${realTransactionCount}`
				: null,
		]
			.filter(Boolean)
			.join("\n");

		await Share.share({
			title: tx.shareTitle,
			message: shareText,
		});
	};

	useEffect(() => {
		const loadTransactionData = async () => {
			setDataLoading(true);
			setDataError(null);
			try {
				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (!user) {
					setDataError(tx.errorLogin);
					return;
				}

				let startDate: Date;
				let endDate: Date;
				let startDateString: string;
				let endDateString: string;

				if (periodFilter === "custom" || periodFilter === "saved_rule") {
					startDate = new Date(
						customStartYear,
						customStartMonth - 1,
						customStartDay,
					);
					endDate = new Date(customEndYear, customEndMonth - 1, customEndDay);
					startDateString = dateKey(
						customStartYear,
						customStartMonth,
						customStartDay,
					);
					endDateString = dateKey(customEndYear, customEndMonth, customEndDay);
				} else {
					const now = new Date();
					const monthsBack =
						periodFilter === "month"
							? 1
							: periodFilter === "3month"
								? 3
								: periodFilter === "6month"
									? 6
									: 12;
					startDate = new Date(
						now.getFullYear(),
						now.getMonth() - monthsBack + 1,
						1,
					);
					endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
					startDateString = dateKey(
						startDate.getFullYear(),
						startDate.getMonth() + 1,
						startDate.getDate(),
					);
					endDateString = dateKey(
						endDate.getFullYear(),
						endDate.getMonth() + 1,
						endDate.getDate(),
					);
				}

				const loadedCategories = await listCategories().catch(
					() => [] as Category[],
				);
				setCategoryOptions(loadedCategories);

				let query = supabase.from("transactions").select("*");
				query = applyFinanceContextFilter(
					query as any,
					activeContext,
				) as typeof query;
				if (activeContext.type === "personal") {
					query = query.eq("user_id", user.id) as typeof query;
				}
				const { data: transactions, error } = await query;

				if (error) throw error;

				const allTransactions = (
					(transactions || []) as ReportTransactionRow[]
				).map(normalizeReportTransaction);
				const loadedTransactions = filterReportTransactionsByDateRange(
					allTransactions,
					startDateString,
					endDateString,
				);
				setReportTransactions(loadedTransactions);
				setRealTransactionCount(loadedTransactions.length);

				const expenseTx = loadedTransactions.filter(
					(t) => t.transaction_type === "expense",
				);
				const totalExpense = expenseTx.reduce(
					(sum, t) => sum + (t.amount || 0),
					0,
				);
				if (expenseTx.length > 0 && totalExpense > 0) {
					const grouped = new Map<string, { amount: number; sourceName: string }>();
					for (const t of expenseTx) {
						const sourceName = (t.category || "other").toString().trim() || "other";
						const key = getCategoryCanonicalId(sourceName) || "other_expenses";
						const current = grouped.get(key);
						grouped.set(key, {
							amount: (current?.amount || 0) + (t.amount || 0),
							sourceName: current?.sourceName ?? sourceName,
						});
					}
					const generated = Array.from(grouped.entries())
						.map(([key, group]) => {
							const amount = group.amount;
							const percent = Math.max(
								1,
								Math.round((amount / totalExpense) * 100),
							);
							const categorySource = loadedCategories.find(
								(category) => getCategoryCanonicalId(category.name) === key,
							);
							const categoryName = categorySource?.name ?? group.sourceName;
							const categoryMeta = resolveCategoryVisual({
								categoryName,
								categories: loadedCategories,
								mode: theme.mode,
							});
							return {
								id: key,
								label: getLocalizedCategoryName(categoryName, isEn ? "en" : "id"),
								percent,
								value: amount,
								amount: `Rp ${amount.toLocaleString("id-ID")}`,
								icon: categoryMeta.icon,
								color: categoryMeta.color,
								tone: categoryMeta.tone,
								visualLocked: Boolean(categorySource?.color),
							};
						})
						.sort((a, b) => b.percent - a.percent);
					setDynamicCategories(withUniqueCategoryColors(generated));
				} else {
					setDynamicCategories([]);
				}

				// Load compare data if activeTab is 'compare'
				if (activeTab === "compare") {
					const prevStartDate = new Date(startDate);
					prevStartDate.setMonth(prevStartDate.getMonth() - 1);
					const prevEndDate = new Date(endDate);
					prevEndDate.setMonth(prevEndDate.getMonth() - 1);

					const prevStartDateString = dateKey(
						prevStartDate.getFullYear(),
						prevStartDate.getMonth() + 1,
						prevStartDate.getDate(),
					);
					const prevEndDateString = dateKey(
						prevEndDate.getFullYear(),
						prevEndDate.getMonth() + 1,
						prevEndDate.getDate(),
					);

					const currentIncome =
						loadedTransactions
							.filter((t) => t.transaction_type === "income")
							.reduce((sum, t) => sum + t.amount, 0) || 0;
					const currentExpense =
						loadedTransactions
							.filter((t) => t.transaction_type === "expense")
							.reduce((sum, t) => sum + t.amount, 0) || 0;
					const currentNet = currentIncome - currentExpense;

					const prevTransactions = filterReportTransactionsByDateRange(
						allTransactions,
						prevStartDateString,
						prevEndDateString,
					);
					const prevIncome =
						prevTransactions
							.filter((t) => t.transaction_type === "income")
							.reduce((sum, t) => sum + t.amount, 0) || 0;
					const prevExpense =
						prevTransactions
							.filter((t) => t.transaction_type === "expense")
							.reduce((sum, t) => sum + t.amount, 0) || 0;
					const prevNet = prevIncome - prevExpense;

					setCompareData({
						current: {
							income: currentIncome,
							expense: currentExpense,
							net: currentNet,
							count: loadedTransactions.length,
						},
						previous: {
							income: prevIncome,
							expense: prevExpense,
							net: prevNet,
							count: prevTransactions?.length || 0,
						},
					});
				} else {
					setCompareData(null);
				}
			} catch (err: any) {
				console.error("Failed to load transaction data:", err);
				setDataError(tx.errorLoad);
			} finally {
				setDataLoading(false);
			}
		};

		loadTransactionData();
	}, [
		activeTab,
		periodFilter,
		customStartYear,
		customStartMonth,
		customStartDay,
		customEndYear,
		customEndMonth,
		customEndDay,
		supabase,
		activeContext,
		refreshTick,
	]);

	return (
		<View style={styles.screen}>
			<PageEntrance testID="reports-page-entrance" style={styles.pageEntrance}>
				<ScrollView
					contentContainerStyle={styles.content}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={dataLoading}
							onRefresh={() => setRefreshTick((value) => value + 1)}
							tintColor={theme.colors.brandPrimary}
						/>
					}
				>
				{/* Header */}
				<View style={styles.headerRow}>
					<View>
						<Text style={styles.title}>{tx.title}</Text>
						<Text style={styles.subtitle}>{tx.subtitle}</Text>
					</View>
					<View style={styles.headerRight}>
						<View testID="finance-context-badge" style={styles.contextBadge}>
							<Text style={styles.contextBadgeText}>
								{activeContext.type === "household" ? tx.contextHousehold : tx.contextPersonal}
							</Text>
						</View>
						<View testID="reports-month-badge" style={styles.monthBadge}>
							<Text style={styles.monthBadgeText}>{tx.monthBadge}</Text>
						</View>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={tx.shareA11y}
							style={({ pressed }) => [
								styles.shareButton,
								pressed && { opacity: 0.7 },
							]}
							onPress={handleShare}
						>
							<Text style={styles.shareButtonText}>{tx.share}</Text>
						</Pressable>
					</View>
				</View>

				{/* Summary Row — shown before controls */}
				<StaggeredEntrance index={0} testID="reports-entrance-summary">
					<View testID="reports-summary-card" style={styles.summaryCard}>
					<View style={styles.summaryTopRow}>
						<View style={styles.summaryHalf}>
							<Text style={styles.summaryLabel}>{tx.income}</Text>
							<Text
								testID="reports-summary-income-value"
								style={[styles.summaryValue, { color: incomeAccent }]}
							>
								{formatCompactRupiah(summaryIncome)}
							</Text>
						</View>
						<View style={styles.summaryDivider} />
						<View style={styles.summaryHalf}>
							<Text style={styles.summaryLabel}>{tx.expense}</Text>
							<Text
								testID="reports-summary-expense-value"
								style={[styles.summaryValue, { color: expenseAccent }]}
							>
								{formatCompactRupiah(summaryExpense)}
							</Text>
						</View>
					</View>
					<View style={styles.summarySavingsRow}>
						<Text style={styles.summaryLabel}>{tx.savings}</Text>
						<Text
							testID="reports-summary-savings-value"
							style={[styles.summaryValue, { color: theme.colors.textPrimary }]}
						>
							{formatCompactRupiah(summaryNet)}
						</Text>
						<Text style={styles.summarySavingRate}>{savingRate}</Text>
					</View>
					</View>
				</StaggeredEntrance>

				<StaggeredEntrance index={1} testID="reports-entrance-ai-insight">
					<AiInsightCard
						insight={aiInsight}
						loading={aiInsightLoading}
						error={aiInsightError}
						isPremium={isPremium}
						onGenerate={handleGenerateAiInsight}
						onUpgrade={() => router.push("/upgrade" as never)}
					/>
				</StaggeredEntrance>

				<StaggeredEntrance index={2} testID="reports-entrance-recommendation">
					<View testID="reports-envelope-entry" style={styles.envelopeEntryCard}>
					<View style={styles.envelopeEntryTopRow}>
						<View style={styles.envelopeEntryTitleRow}>
							<IconBubble name="budgets" tone="primary" size={36} />
							<View
								testID="reports-envelope-copy"
								style={styles.envelopeEntryCopy}
							>
								<Text style={styles.envelopeEntryTitle}>
									{tx.budgetWalletTitle}
								</Text>
								<Text
									style={styles.envelopeEntryMeta}
									numberOfLines={2}
									ellipsizeMode="tail"
								>
									{tx.budgetWalletMeta}
								</Text>
							</View>
						</View>
						<Pressable
							testID="reports-envelope-manage"
							accessibilityRole="button"
							accessibilityLabel={tx.manageBudgetA11y}
							style={styles.envelopeManageButton}
							onPress={() => router.push("/(tabs)/budgets" as never)}
						>
							<Text style={styles.envelopeManageText}>
								{tx.budgetWalletManage}
							</Text>
						</Pressable>
					</View>
					</View>
				</StaggeredEntrance>

				{/* Tab Selector */}
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.tabScrollView}
					contentContainerStyle={styles.tabRow}
				>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={tx.showOverviewA11y}
						accessibilityState={{ selected: activeTab === "overview" }}
						style={[
							styles.tabChip,
							activeTab === "overview" && styles.tabChipActive,
						]}
						onPress={() => setActiveTab("overview")}
					>
						<Text
							style={[
								styles.tabChipText,
								activeTab === "overview" && styles.tabChipTextActive,
							]}
						>
							{tx.overview}
						</Text>
					</Pressable>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={tx.showCategoryA11y}
						accessibilityState={{ selected: activeTab === "category" }}
						style={[
							styles.tabChip,
							activeTab === "category" && styles.tabChipActive,
						]}
						onPress={() => setActiveTab("category")}
					>
						<Text
							style={[
								styles.tabChipText,
								activeTab === "category" && styles.tabChipTextActive,
							]}
						>
							{tx.category}
						</Text>
					</Pressable>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={tx.showCompareA11y}
						accessibilityState={{ selected: activeTab === "compare" }}
						style={[
							styles.tabChip,
							activeTab === "compare" && styles.tabChipActive,
						]}
						onPress={() => setActiveTab("compare")}
					>
						<Text
							style={[
								styles.tabChipText,
								activeTab === "compare" && styles.tabChipTextActive,
							]}
						>
							{tx.compare}
						</Text>
					</Pressable>
				</ScrollView>

				{/* Period Selector */}
				<View style={styles.periodWrap}>
					{(Object.keys(periodLabels) as Exclude<PeriodFilter, "saved_rule">[]).map((key) => (
						<Pressable
							key={key}
							accessibilityRole="button"
							accessibilityLabel={tx.choosePeriodA11y(periodLabels[key])}
							accessibilityState={{ selected: periodFilter === key }}
							style={[
								styles.periodChip,
								periodFilter === key && styles.periodChipActive,
							]}
							onPress={() => {
								setPeriodFilter(key);
								if (key === "custom") {
									setActivePeriod(buildCustomReportPeriod(customStartIso, customEndIso));
									openCustomDateModal();
								} else {
									setActivePeriod(buildReportPeriod(key));
								}
							}}
						>
							<Text
								style={[
									styles.periodChipText,
									periodFilter === key && styles.periodChipTextActive,
								]}
							>
								{periodLabels[key]}
							</Text>
						</Pressable>
					))}
				</View>

				<View testID="reports-active-period-card" style={styles.periodControlsCard}>
					<View style={styles.activePeriodRow}>
						<View style={styles.activePeriodCopy}>
							<Text style={styles.activePeriodTitle}>{tx.activePeriodTitle}</Text>
							<Text numberOfLines={1} style={styles.activePeriodValue}>{activePeriodNameLabel}</Text>
							{shouldShowActivePeriodRange ? (
								<Text numberOfLines={1} style={styles.activePeriodDate}>{activePeriodRangeLabel}</Text>
							) : null}
						</View>
						{!isCurrentMonthActive ? (
							<Pressable
								testID="reports-reset-current-month"
								accessibilityRole="button"
								accessibilityLabel={tx.resetToThisMonth}
								style={styles.activePeriodResetButton}
								onPress={resetToCurrentMonth}
							>
								<Text style={styles.activePeriodResetText}>{tx.resetToThisMonth}</Text>
							</Pressable>
						) : null}
					</View>

					{savedRules.length > 0 ? (
						<View testID="reports-saved-rules-card" style={styles.savedRulesInline}>
							<Text style={styles.savedRulesInlineTitle}>{tx.savedRulesTitle}</Text>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.savedRuleRow}
							>
								{savedRules.map((rule) => {
									const selected = activePeriod.type === "saved_rule" && activePeriod.ruleId === rule.id;
									return (
										<View
											key={rule.id}
											style={[styles.savedRuleChipShell, selected && styles.savedRuleChipShellActive]}
										>
											<Pressable
												testID={`reports-saved-rule-${rule.id}`}
												accessibilityRole="button"
												accessibilityLabel={tx.savedRuleAccessibility(rule.name)}
												accessibilityState={{ selected }}
												style={styles.savedRuleChip}
												onPress={() => selectSavedRule(rule.id)}
											>
												<Text numberOfLines={1} style={[styles.savedRuleName, selected && styles.savedRuleNameActive]}>{rule.name}</Text>
												<Text style={[styles.savedRuleSummary, selected && styles.savedRuleSummaryActive]}>
													{rule.startDay}–{rule.endDay}
												</Text>
											</Pressable>
											<Pressable
												testID={`reports-manage-saved-rule-${rule.id}`}
												accessibilityRole="button"
												accessibilityLabel={tx.manageRuleAccessibility(rule.name)}
												style={[styles.savedRuleManageButton, selected && styles.savedRuleManageButtonActive]}
												onPress={() => openRuleManageModal(rule.id)}
											>
												<KaswiseIcon
													name="more"
													size={18}
													color={selected ? (theme.mode === "light" ? theme.colors.brandPrimaryDeep : theme.colors.brandPrimary) : theme.colors.textMuted}
													weight="bold"
												/>
											</Pressable>
										</View>
									);
								})}
							</ScrollView>
						</View>
					) : null}
				</View>
				{periodFilter === "custom" && (
					<View style={styles.customRulePrompt}>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={tx.editCustomRangeA11y}
							style={styles.customRangeBadge}
							onPress={openCustomDateModal}
						>
							<Text style={styles.customRangeBadgeText}>{customRangeLabel}</Text>
						</Pressable>
						<Pressable
							testID="reports-save-period-rule"
							accessibilityRole="button"
							accessibilityLabel={tx.saveRuleCta}
							style={styles.saveRuleButton}
							onPress={openSaveRuleModal}
						>
							<Text style={styles.saveRuleButtonText}>{tx.saveRuleCta}</Text>
						</Pressable>
					</View>
				)}

				{/* Loading/Error State */}
				{dataLoading && (
					<View style={styles.loadingCard}>
						<Text style={styles.loadingText}>{tx.loading}</Text>
					</View>
				)}
				{dataError && !dataLoading && (
					<View style={styles.errorCard}>
						<Text style={styles.errorText}>{dataError}</Text>
					</View>
				)}
				{realTransactionCount !== null && !dataLoading && (
					<StaggeredEntrance index={3} testID="reports-entrance-info">
						<View testID="reports-info-card" style={styles.infoCard}>
						<Text style={styles.infoText}>
							{tx.txFound(realTransactionCount)}
						</Text>
						</View>
					</StaggeredEntrance>
				)}

				{activeTab === "overview" && (
					<>
						{/* Chart */}
						<StaggeredEntrance index={1} testID="reports-entrance-chart">
							<View style={styles.chartCard}>
							<Text style={styles.chartTitle}>{tx.trendTitle}</Text>
							<Text style={styles.chartSub}>{tx.trendSub}</Text>

							<View
								testID="reports-pulse-chart"
								style={styles.lineChartArea}
							>
								<View style={styles.lineGrid}>
									<View testID="reports-line-guide-0" style={styles.gridLine} />
									<View testID="reports-line-guide-1" style={styles.gridLine} />
									<View testID="reports-line-guide-2" style={styles.gridLine} />
								</View>
								<View
									testID="reports-line-chart-svg"
									accessibilityRole="image"
									accessibilityLabel={pulseAccessibilityLabel}
									style={styles.lineGraphLayer}
								>
									{chartData.labels.map((label, idx) => {
										const incomeHeight = pulseHeightFor(chartData.income[idx] ?? 0);
										const expenseHeight = pulseHeightFor(chartData.expense[idx] ?? 0);
										const netValue = netValueFor(idx);
										return (
											<Pressable
												key={chartData.keys[idx] ?? `${label}-${chartData.years[idx]}`}
												testID={`reports-pulse-column-${idx}`}
												accessibilityRole="button"
												accessibilityLabel={tx.chartColumnA11y(label, chartData.years[idx] ?? new Date().getFullYear())}
												accessibilityState={{ selected: selectedBar === idx }}
												style={styles.lineColumn}
												onPress={() =>
													setSelectedBar(selectedBar === idx ? null : idx)
												}
											>
												<View style={styles.pulseStack}>
													<View style={styles.pulseUpper}>
														<View
															testID={`reports-line-dot-income-${idx}`}
															style={[
																styles.pulseBar,
																styles.incomePulse,
																{ height: incomeHeight },
															]}
														/>
													</View>
													<View style={styles.pulseAxis}>
														<View
															testID={`reports-pulse-net-${idx}`}
															style={[
																styles.netDot,
																netValue >= 0 ? styles.netDotPositive : styles.netDotNegative,
															]}
														/>
													</View>
													<View style={styles.pulseLower}>
														<View
															testID={`reports-line-dot-expense-${idx}`}
															style={[
																styles.pulseBar,
																styles.expensePulse,
																{ height: expenseHeight },
															]}
														/>
													</View>
												</View>
												<Text style={styles.chartLabel}>{label}</Text>

												{selectedBar === idx && (
													<View style={styles.chartTooltip}>
														<Text style={styles.tooltipTitle}>
															{label} {chartData.years[idx]}
														</Text>
														<Text
															style={[
																styles.tooltipValue,
																{ color: theme.colors.success },
															]}
														>
															{tx.tooltipIncome}: {" "}
															{formatCompactRupiah((chartData.income[idx] ?? 0) * 1_000_000)}
														</Text>
														<Text
															style={[
																styles.tooltipValue,
																{ color: theme.colors.danger },
															]}
														>
															{tx.tooltipExpense}: {" "}
															{formatCompactRupiah((chartData.expense[idx] ?? 0) * 1_000_000)}
														</Text>
													</View>
												)}
											</Pressable>
										);
									})}
								</View>
							</View>

							<View style={styles.chartLegend}>
								<View style={styles.legendItem}>
									<View
										style={[
											styles.legendDot,
											{ backgroundColor: theme.colors.success },
										]}
									/>
									<Text style={styles.legendText}>{tx.income}</Text>
								</View>
								<View style={styles.legendItem}>
									<View
										style={[
											styles.legendDot,
											{ backgroundColor: theme.colors.danger },
										]}
									/>
									<Text style={styles.legendText}>{tx.expense}</Text>
								</View>
							</View>
							</View>
						</StaggeredEntrance>
						<StaggeredEntrance index={3} testID="reports-entrance-history">
							<View style={styles.top5Card}>
							<Text style={styles.top5Title}>{tx.topExpenses}</Text>
							<Text style={styles.top5Sub}>{periodDisplayLabel}</Text>
							{top5Expenses.length === 0 ? (
								<Text style={styles.infoText}>{tx.noCategoryTransactions}</Text>
							) : (
								top5Expenses.map((item, index) => (
									<View
										key={`${item.category}-${index}`}
										style={styles.top5Row}
									>
										<View style={styles.top5Left}>
											<View style={styles.top5Rank}>
												<Text style={styles.top5RankText}>{index + 1}</Text>
											</View>
											<Text style={styles.top5Label}>{item.category}</Text>
										</View>
										<Text style={styles.top5Amount}>
											{formatCompactRupiah(item.amount)}
										</Text>
									</View>
								))
							)}
							</View>
						</StaggeredEntrance>
					</>
				)}
				{activeTab === "category" && (
					<>
						{/* Category Breakdown */}
						<View style={styles.categoryCard}>
							<Text style={styles.categoryCardTitle}>{tx.breakdownTitle}</Text>
							<Text
								style={styles.categoryCardSub}
							>{`${tx.breakdownSub} ${periodDisplayLabel}`}</Text>
							{shouldShowOtherCategoryInsight ? (
								<View testID="reports-other-category-insight" style={styles.otherInsightCard}>
									<Text style={styles.otherInsightText}>{tx.otherCategoryInsight(otherCategoryPercent)}</Text>
								</View>
							) : null}

							<View style={styles.ringArea}>
								<View style={styles.donutChart}>
									<Svg
										testID="reports-donut-svg"
										width={donutSize}
										height={donutSize}
										viewBox={`0 0 ${donutSize} ${donutSize}`}
										accessibilityRole="image"
										accessibilityLabel={tx.donutA11y}
										style={styles.donutSvg}
									>
										<Circle
											cx={donutCenter}
											cy={donutCenter}
											r={donutRadius + 4}
											fill="none"
											stroke={theme.colors.borderSoft}
											strokeWidth={1}
											opacity={theme.mode === "dark" ? 0.55 : 0.72}
										/>
										<Circle
											cx={donutCenter}
											cy={donutCenter}
											r={donutRadius}
											fill="none"
											stroke={theme.colors.borderSoft}
											strokeWidth={donutStrokeWidth}
											opacity={theme.mode === "dark" ? 0.18 : 0.28}
										/>
										<Circle
											cx={donutCenter}
											cy={donutCenter}
											r={donutRadius - 14}
											fill="none"
											stroke={
												theme.mode === "dark"
													? "rgba(255,255,255,0.08)"
													: "rgba(15,23,42,0.06)"
											}
											strokeWidth={1}
										/>
										{donutSegments.map((cat) => (
											<Circle
												key={`glow-${cat.id}`}
												testID={`reports-donut-glow-${cat.id}`}
												cx={donutCenter}
												cy={donutCenter}
												r={donutRadius}
												fill="none"
												stroke={cat.color}
												strokeWidth={donutGlowStrokeWidth}
												strokeDasharray={`${cat.dashLength} ${cat.gapLength}`}
												strokeDashoffset={-cat.offsetLength}
												strokeLinecap="butt"
												opacity={theme.mode === "dark" ? 0.09 : 0.045}
												transform={`rotate(-90 ${donutCenter} ${donutCenter})`}
											/>
										))}
										{donutSegments.map((cat) => (
											<Circle
												key={cat.id}
												testID={`reports-donut-segment-${cat.id}`}
												cx={donutCenter}
												cy={donutCenter}
												r={donutRadius}
												fill="none"
												stroke={cat.color}
												strokeWidth={donutStrokeWidth}
												strokeDasharray={`${cat.dashLength} ${cat.gapLength}`}
												strokeDashoffset={-cat.offsetLength}
												strokeLinecap="butt"
												opacity={theme.mode === "dark" ? 0.9 : 0.86}
												transform={`rotate(-90 ${donutCenter} ${donutCenter})`}
											/>
										))}
									</Svg>
									<View style={styles.ringInner}>
										<Text style={styles.ringValue}>{donutTotalLabel}</Text>
										<Text style={styles.ringLabel}>{tx.ringLabel}</Text>
									</View>
								</View>
							</View>

							{dynamicCategories.map((cat, idx) => (
								<Pressable
									key={cat.label}
									testID={`reports-category-row-${cat.id}`}
									accessibilityRole="button"
									accessibilityLabel={tx.openCategoryA11y(cat.label)}
									style={({ pressed }) => [
										styles.catRow,
										idx === 0 && { borderTopWidth: 0 },
										pressed && { opacity: 0.72 },
									]}
									onPress={() => setSelectedCategoryId(cat.id)}
								>
									<View style={styles.catLeft}>
										<IconBubble name={cat.icon} tone={cat.tone} color={cat.color} size={36} />
										<View>
											<Text style={styles.catName}>{cat.label}</Text>
											<Text style={styles.catAmount}>{cat.amount}</Text>
										</View>
									</View>
									<View style={styles.catRight}>
										<Text style={[styles.catPct, { color: cat.color }]}>
											{cat.percent}%
										</Text>
										<View style={styles.catBar}>
											<View
												testID={`reports-category-fill-${cat.id}`}
												style={[
													styles.catBarFill,
													{
														width: `${cat.percent}%`,
														backgroundColor: cat.color,
													},
												]}
											/>
										</View>
									</View>
								</Pressable>
							))}
						</View>
					</>
				)}
				{activeTab === "compare" && (
					<>
						{/* Comparison Panel */}
						<View style={styles.categoryCard}>
							<Text style={styles.categoryCardTitle}>{tx.compareTitle}</Text>
							<Text style={styles.categoryCardSub}>{tx.compareSub}</Text>

							{dataLoading && (
								<View style={styles.loadingCard}>
									<Text style={styles.loadingText}>{tx.loadingCompare}</Text>
								</View>
							)}

							{compareData && compareData.current && compareData.previous && (
								<>
									<View style={styles.compareRow}>
										<Text style={styles.compareLabel}>{tx.compareIncome}</Text>
										<View style={styles.compareValues}>
											<Text style={styles.compareCurrent}>
												{formatRupiah(compareData.current.income / 1_000_000)}
											</Text>
											<Text
												style={[
													styles.compareDelta,
													compareData.current.income >=
													compareData.previous.income
														? styles.compareDeltaPositive
														: styles.compareDeltaNegative,
												]}
											>
												{compareData.current.income >=
												compareData.previous.income
													? "▲"
													: "▼"}{" "}
												{formatRupiah(
													Math.abs(
														compareData.current.income -
															compareData.previous.income,
													) / 1_000_000,
												)}
											</Text>
										</View>
									</View>
									<View style={styles.compareRow}>
										<Text style={styles.compareLabel}>{tx.compareExpense}</Text>
										<View style={styles.compareValues}>
											<Text style={styles.compareCurrent}>
												{formatRupiah(compareData.current.expense / 1_000_000)}
											</Text>
											<Text
												style={[
													styles.compareDelta,
													compareData.current.expense <=
													compareData.previous.expense
														? styles.compareDeltaPositive
														: styles.compareDeltaNegative,
												]}
											>
												{compareData.current.expense <=
												compareData.previous.expense
													? "▼"
													: "▲"}{" "}
												{formatRupiah(
													Math.abs(
														compareData.current.expense -
															compareData.previous.expense,
													) / 1_000_000,
												)}
											</Text>
										</View>
									</View>
									<View style={styles.compareRow}>
										<Text style={styles.compareLabel}>{tx.compareSavings}</Text>
										<View style={styles.compareValues}>
											<Text style={styles.compareCurrent}>
												{formatRupiah(compareData.current.net / 1_000_000)}
											</Text>
											<Text
												style={[
													styles.compareDelta,
													compareData.current.net >= compareData.previous.net
														? styles.compareDeltaPositive
														: styles.compareDeltaNegative,
												]}
											>
												{compareData.current.net >= compareData.previous.net
													? "▲"
													: "▼"}{" "}
												{formatRupiah(
													Math.abs(
														compareData.current.net - compareData.previous.net,
													) / 1_000_000,
												)}
											</Text>
										</View>
									</View>
									<View style={styles.compareRow}>
										<Text style={styles.compareLabel}>{tx.compareTxCount}</Text>
										<View style={styles.compareValues}>
											<Text style={styles.compareCurrent}>
												{compareData.current.count}
											</Text>
											<Text
												style={[
													styles.compareDelta,
													compareData.current.count >=
													compareData.previous.count
														? styles.compareDeltaPositive
														: styles.compareDeltaNegative,
												]}
											>
												{compareData.current.count >= compareData.previous.count
													? "▲"
													: "▼"}{" "}
												{Math.abs(
													compareData.current.count -
														compareData.previous.count,
												)}
											</Text>
										</View>
									</View>
								</>
							)}

							{compareData &&
								(!compareData.current || !compareData.previous) && (
									<View style={styles.infoCard}>
										<Text style={styles.infoText}>{tx.noCompareData}</Text>
									</View>
								)}
						</View>
					</>
				)}

				<View style={{ height: 100 }} />
				</ScrollView>
			</PageEntrance>

			{/* Date Range Modal */}
			<Modal
				visible={showDateModal}
				transparent
				animationType="slide"
				onRequestClose={() => setShowDateModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.dateRangeModalContent}>
						<Text style={styles.modalTitle}>{tx.modalTitle}</Text>

						<ScrollView
							style={styles.dateRangePickerScroll}
							contentContainerStyle={styles.dateRangePickerBody}
						>
							<View style={styles.modalSection}>
								<Text style={styles.modalSectionTitle}>{tx.modalStart}</Text>
								<IOSWheelDatePicker
									value={customStartIso}
									onChange={applyStartDate}
									locale={isEn ? "en" : "id"}
									testID="reports-start-date-wheel-picker"
								/>
							</View>

							<View style={styles.modalSection}>
								<Text style={styles.modalSectionTitle}>{tx.modalEnd}</Text>
								<IOSWheelDatePicker
									value={customEndIso}
									onChange={applyEndDate}
									locale={isEn ? "en" : "id"}
									testID="reports-end-date-wheel-picker"
								/>
							</View>
						</ScrollView>

						<View style={styles.dateRangeActions}>
							<Pressable
								testID="reports-save-period-rule-from-date-modal"
								accessibilityRole="button"
								accessibilityLabel={tx.saveRuleCta}
								style={[styles.modalActionButton, styles.modalActionConfirm]}
								onPress={() => {
									setShowDateModal(false);
									openSaveRuleModal();
								}}
							>
								<Text style={styles.modalActionConfirmText}>{tx.saveRuleCta}</Text>
							</Pressable>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={tx.modalCancel}
								style={[styles.modalActionButton, styles.modalActionCancel]}
								onPress={() => setShowDateModal(false)}
							>
								<Text style={styles.modalActionCancelText}>{tx.modalCancel}</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>

			<Modal
				visible={showSaveRuleModal}
				transparent
				animationType="slide"
				onRequestClose={() => setShowSaveRuleModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>{tx.saveRuleTitle}</Text>
						<Text style={styles.saveRuleHint}>{tx.saveRuleHint(customStartDay, customEndDay)}</Text>
						<Text style={styles.modalSectionTitle}>{tx.saveRuleName}</Text>
						<TextInput
							testID="reports-period-rule-name-input"
							value={ruleName}
							onChangeText={setRuleName}
							placeholder={defaultRuleName}
							placeholderTextColor={theme.colors.textMuted}
							style={styles.ruleNameInput}
						/>
						<View style={styles.modalActions}>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={tx.modalCancel}
								style={[styles.modalActionButton, styles.modalActionCancel]}
								onPress={() => setShowSaveRuleModal(false)}
							>
								<Text style={styles.modalActionCancelText}>{tx.modalCancel}</Text>
							</Pressable>
							<Pressable
								testID="reports-confirm-save-period-rule"
								accessibilityRole="button"
								accessibilityLabel={tx.saveRuleConfirm}
								style={[styles.modalActionButton, styles.modalActionConfirm]}
								onPress={handleSaveRule}
							>
								<Text style={styles.modalActionConfirmText}>{tx.saveRuleConfirm}</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>

			<Modal
				visible={!!managedSavedRule}
				transparent
				animationType="slide"
				onRequestClose={closeRuleManageModal}
			>
				<View style={styles.modalOverlay}>
					<View testID="reports-saved-rule-manage-modal" style={styles.ruleManageSheet}>
						<View style={styles.ruleManageHandle} />
						<Text style={styles.modalTitle}>{tx.manageRuleTitle}</Text>
						{managedSavedRule ? (
							<>
								<Text style={styles.ruleManageName}>{managedSavedRule.name}</Text>
								<Text style={styles.ruleManageSummary}>
									{formatSavedRuleSummary(managedSavedRule, isEn ? "en" : "id")}
								</Text>
								<View style={styles.ruleManageMenu}>
									<Pressable
										testID="reports-open-rename-rule"
										accessibilityRole="button"
										style={styles.ruleManageMenuButton}
										onPress={openRenameRuleModal}
									>
										<Text style={styles.ruleManageMenuText}>{tx.renameRule}</Text>
									</Pressable>
									<Pressable
										testID="reports-set-selected-rule-default"
										accessibilityRole="button"
										style={styles.ruleManageMenuButton}
										onPress={handleActivateManagedRule}
									>
										<Text style={styles.ruleManageMenuText}>{tx.defaultRuleActive}</Text>
									</Pressable>
									<Pressable
										testID="reports-delete-selected-rule"
										accessibilityRole="button"
										style={[styles.ruleManageMenuButton, styles.ruleManageMenuDangerButton]}
										onPress={openDeleteRuleConfirm}
									>
										<Text style={styles.ruleManageMenuDangerText}>{tx.deleteRule}</Text>
									</Pressable>
								</View>
								<Pressable
									accessibilityRole="button"
									accessibilityLabel={tx.modalCancel}
									style={styles.ruleManageCancelButton}
									onPress={closeRuleManageModal}
								>
									<Text style={styles.ruleManageCancelText}>{tx.modalCancel}</Text>
								</Pressable>
							</>
						) : null}
					</View>
				</View>
			</Modal>

			<Modal
				visible={!!renameSavedRule}
				transparent
				animationType="fade"
				onRequestClose={closeRenameRuleModal}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={styles.renameModalKeyboardWrap}
				>
					<View style={styles.modalCenterOverlay}>
						<View testID="reports-rename-rule-modal" style={styles.renameRuleCard}>
							<Text style={styles.renameRuleTitle}>{tx.renameRule}</Text>
							{renameSavedRule ? (
								<>
									<Text style={styles.renameRuleSummary}>
										{formatSavedRuleSummary(renameSavedRule, isEn ? "en" : "id")}
									</Text>
									<TextInput
										testID="reports-selected-rule-name-input"
										value={editingRuleName}
										onChangeText={setEditingRuleName}
										placeholder={renameSavedRule.name}
										placeholderTextColor={theme.colors.textMuted}
										style={styles.ruleNameInput}
										autoFocus
										selectTextOnFocus
										returnKeyType="done"
										onSubmitEditing={handleSaveRenamedRule}
									/>
									<View style={styles.renameRuleActions}>
										<Pressable
											accessibilityRole="button"
											accessibilityLabel={tx.modalCancel}
											style={[styles.modalActionButton, styles.modalActionCancel]}
											onPress={closeRenameRuleModal}
										>
											<Text style={styles.modalActionCancelText}>{tx.modalCancel}</Text>
										</Pressable>
										<Pressable
											testID="reports-save-selected-rule-name"
											accessibilityRole="button"
											style={[styles.modalActionButton, styles.modalActionConfirm]}
											onPress={handleSaveRenamedRule}
										>
											<Text style={styles.modalActionConfirmText}>{tx.saveRuleNameAction}</Text>
										</Pressable>
									</View>
								</>
							) : null}
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>

			<Modal
				visible={!!deleteConfirmRule}
				transparent
				animationType="fade"
				onRequestClose={closeDeleteRuleConfirm}
			>
				<View style={styles.modalCenterOverlay}>
					<View testID="reports-delete-rule-confirm-modal" style={styles.deleteRuleCard}>
						<Text style={styles.renameRuleTitle}>{tx.deleteRuleConfirmTitle}</Text>
						{deleteConfirmRule ? (
							<Text style={styles.deleteRuleBody}>
								{tx.deleteRuleConfirmBody(deleteConfirmRule.name)}
							</Text>
						) : null}
						<View style={styles.renameRuleActions}>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={tx.modalCancel}
								style={[styles.modalActionButton, styles.modalActionCancel]}
								onPress={closeDeleteRuleConfirm}
							>
								<Text style={styles.modalActionCancelText}>{tx.modalCancel}</Text>
							</Pressable>
							<Pressable
								testID="reports-confirm-delete-rule"
								accessibilityRole="button"
								accessibilityLabel={tx.deleteRuleConfirmAction}
								style={[styles.modalActionButton, styles.deleteRuleConfirmButton]}
								onPress={handleConfirmDeleteRule}
							>
								<Text style={styles.deleteRuleConfirmText}>{tx.deleteRuleConfirmAction}</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>

			<Modal
				visible={!!selectedCategory}
				transparent
				animationType="slide"
				onRequestClose={() => setSelectedCategoryId(null)}
			>
				<View style={styles.modalOverlay}>
					<View
						testID="reports-category-detail-modal"
						style={styles.modalContent}
					>
						<View style={styles.detailHeaderRow}>
							<Pressable
								testID="reports-category-detail-back"
								accessibilityRole="button"
								accessibilityLabel={tx.closeCategoryDetailA11y}
								style={({ pressed }) => [
									styles.detailBackButton,
									pressed && { opacity: 0.72 },
								]}
								onPress={() => setSelectedCategoryId(null)}
							>
								<Text style={styles.detailBackText}>‹</Text>
								<Text style={styles.detailBackLabel}>{tx.modalCancel}</Text>
							</Pressable>
							<View style={styles.detailHeaderTitleWrap}>
								<Text style={styles.modalTitle}>{selectedCategory?.label}</Text>
							</View>
						</View>
						<Text style={styles.detailSubtitle}>
							{tx.detailTitle} · {selectedCategory?.amount} ·{" "}
							{selectedCategory?.percent}%
						</Text>

						{selectedCategoryTransactions.length === 0 ? (
							<View style={styles.infoCard}>
								<Text style={styles.infoText}>{tx.noCategoryTransactions}</Text>
							</View>
						) : (
							selectedCategoryTransactions.map((transaction, index) => {
								const title =
									transaction.description ||
									transaction.merchant ||
									transaction.note ||
									selectedCategory?.label ||
									"-";
								return (
									<View
										key={`${transaction.date}-${transaction.amount}-${index}`}
										style={styles.detailTxRow}
									>
										<View style={styles.detailTxInfo}>
											<Text style={styles.detailTxTitle}>{title}</Text>
											{transaction.merchant ? (
												<Text style={styles.detailTxMeta}>
													{transaction.merchant}
												</Text>
											) : null}
											<Text style={styles.detailTxMeta}>
												{transaction.date || "-"}
											</Text>
										</View>
										<Text style={styles.detailTxAmount}>
											Rp{" "}
											{Number(transaction.amount || 0).toLocaleString("id-ID")}
										</Text>
									</View>
								);
							})
						)}
					</View>
				</View>
			</Modal>
		</View>
	);
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
	const brandText =
		theme.mode === "light"
			? theme.colors.brandPrimaryDeep
			: theme.colors.brandPrimary;
	const brandSoftBg =
		theme.mode === "light"
			? "rgba(101, 163, 13, 0.14)"
			: "rgba(163, 255, 18, 0.10)";
	const brandSoftBorder =
		theme.mode === "light"
			? "rgba(101, 163, 13, 0.28)"
			: "rgba(163, 255, 18, 0.35)";

	return StyleSheet.create({
		screen: { flex: 1, backgroundColor: theme.colors.background },
		pageEntrance: { flex: 1 },
		content: { padding: 20, gap: 10, paddingBottom: 26 },
		headerRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			gap: 12,
		},
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
		monthBadge: {
			backgroundColor: brandSoftBg,
			borderWidth: 1,
			borderColor: brandSoftBorder,
			borderRadius: theme.radius.pill,
			paddingHorizontal: 12,
			paddingVertical: 6,
		},
		monthBadgeText: {
			color: brandText,
			fontSize: theme.typography.fontSize.sm,
			fontWeight: theme.typography.fontWeight.bold,
		},
		contextBadge: {
			backgroundColor: theme.colors.mutedSurface,
			borderColor: theme.colors.borderSoft,
			borderRadius: theme.radius.pill,
			borderWidth: 1,
			paddingHorizontal: 12,
			paddingVertical: 6,
		},
		contextBadgeText: {
			color: theme.colors.textSecondary,
			fontSize: theme.typography.fontSize.sm,
			fontWeight: theme.typography.fontWeight.bold,
		},
		headerRight: { alignItems: "flex-end", gap: 8 },
		shareButton: {
			backgroundColor:
				theme.mode === "light"
					? theme.colors.brandPrimaryDeep
					: theme.colors.brandPrimary,
			borderRadius: theme.radius.pill,
			paddingHorizontal: 12,
			paddingVertical: 6,
		},
		shareButtonText: {
			color: theme.colors.textInverse,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.bold,
		},
		periodWrap: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
			marginBottom: 8,
		},
		periodScrollView: {
			marginHorizontal: -20,
		},
		periodRow: {
			flexDirection: "row",
			gap: 8,
			marginBottom: 8,
			paddingHorizontal: 20,
			paddingRight: 36,
		},
		periodChip: {
			paddingVertical: 6,
			paddingHorizontal: 12,
			borderRadius: 999,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.surface,
		},
		periodChipActive: {
			backgroundColor: brandSoftBg,
			borderColor: brandSoftBorder,
		},
		periodChipText: {
			fontSize: 11,
			fontWeight: "600",
			color: theme.colors.textSecondary,
		},
		periodChipTextActive: {
			color: brandText,
		},
		periodControlsCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 16,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 10,
			gap: 8,
		},
		activePeriodRow: {
			flexDirection: "row",
			alignItems: "flex-start",
			justifyContent: "space-between",
			gap: 10,
			flexWrap: "wrap",
		},
		activePeriodCopy: {
			flex: 1,
			minWidth: 180,
		},
		activePeriodTitle: {
			color: theme.colors.textMuted,
			fontSize: 10,
			fontWeight: "800",
			textTransform: "uppercase",
			letterSpacing: 0.35,
		},
		activePeriodValue: {
			color: theme.colors.textPrimary,
			fontSize: 13,
			fontWeight: "800",
			lineHeight: 17,
			marginTop: 1,
		},
		activePeriodDate: {
			color: theme.colors.textMuted,
			fontSize: 11,
			fontWeight: "700",
			lineHeight: 15,
			marginTop: 1,
		},
		activePeriodResetButton: {
			minHeight: 32,
			flexShrink: 0,
			borderRadius: 999,
			borderWidth: 1,
			borderColor: brandSoftBorder,
			backgroundColor: brandSoftBg,
			paddingHorizontal: 10,
			alignItems: "center",
			justifyContent: "center",
		},
		activePeriodResetText: {
			color: brandText,
			fontSize: 11,
			fontWeight: "800",
		},
		savedRulesInline: {
			borderTopWidth: 1,
			borderTopColor: theme.colors.borderSoft,
			paddingTop: 8,
			gap: 6,
		},
		savedRulesInlineTitle: {
			color: theme.colors.textMuted,
			fontSize: 10,
			fontWeight: "800",
			textTransform: "uppercase",
			letterSpacing: 0.35,
		},
		savedRuleRow: {
			gap: 6,
			paddingRight: 2,
		},
		savedRuleChipShell: {
			minWidth: 126,
			maxWidth: 164,
			minHeight: 46,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.mutedSurface,
			flexDirection: "row",
			alignItems: "stretch",
			overflow: "hidden",
		},
		savedRuleChipShellActive: {
			backgroundColor: brandSoftBg,
			borderColor: brandSoftBorder,
		},
		savedRuleChip: {
			flex: 1,
			minHeight: 44,
			justifyContent: "center",
			paddingLeft: 10,
			paddingRight: 6,
			paddingVertical: 7,
			gap: 1,
		},
		savedRuleManageButton: {
			width: 34,
			alignItems: "center",
			justifyContent: "center",
			borderLeftWidth: 1,
			borderLeftColor: theme.colors.borderSoft,
		},
		savedRuleManageButtonActive: {
			borderLeftColor: brandSoftBorder,
			backgroundColor: `${theme.colors.surface}66`,
		},
		savedRuleName: {
			color: theme.colors.textPrimary,
			fontSize: 12,
			fontWeight: "800",
		},
		savedRuleNameActive: { color: brandText },
		savedRuleSummary: {
			color: theme.colors.textMuted,
			fontSize: 10,
			fontWeight: "700",
		},
		savedRuleSummaryActive: { color: brandText },
		customRulePrompt: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			flexWrap: "wrap",
		},
		saveRuleButton: {
			minHeight: 44,
			justifyContent: "center",
			borderRadius: 999,
			borderWidth: 1,
			borderColor: brandSoftBorder,
			backgroundColor: brandSoftBg,
			paddingHorizontal: 12,
			paddingVertical: 8,
		},
		saveRuleButtonText: {
			color: brandText,
			fontSize: 12,
			fontWeight: "800",
		},
		saveRuleHint: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "600",
			marginBottom: 8,
		},
		ruleNameInput: {
			minHeight: 46,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.mutedSurface,
			color: theme.colors.textPrimary,
			fontSize: 14,
			fontWeight: "700",
			paddingHorizontal: 12,
			marginBottom: 12,
		},
		ruleManageSheet: {
			backgroundColor: theme.colors.surface,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			paddingHorizontal: 20,
			paddingTop: 10,
			paddingBottom: 34,
			borderTopWidth: 1,
			borderColor: theme.colors.borderSoft,
		},
		ruleManageHandle: {
			alignSelf: "center",
			width: 42,
			height: 4,
			borderRadius: 999,
			backgroundColor: theme.colors.borderSoft,
			marginBottom: 14,
		},
		ruleManageName: {
			color: theme.colors.textPrimary,
			fontSize: 15,
			fontWeight: "800",
			textAlign: "center",
		},
		ruleManageSummary: {
			color: theme.colors.textMuted,
			fontSize: 12,
			fontWeight: "700",
			textAlign: "center",
			marginTop: 3,
			marginBottom: 16,
		},
		ruleManageMenu: {
			gap: 8,
		},
		ruleManageMenuButton: {
			minHeight: 46,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.mutedSurface,
			paddingHorizontal: 14,
			justifyContent: "center",
		},
		ruleManageMenuText: {
			color: theme.colors.textPrimary,
			fontSize: 14,
			fontWeight: "800",
		},
		ruleManageMenuDangerButton: {
			borderColor: `${theme.colors.danger}35`,
			backgroundColor: `${theme.colors.danger}10`,
		},
		ruleManageMenuDangerText: {
			color: theme.colors.danger,
			fontSize: 14,
			fontWeight: "800",
		},
		renameModalKeyboardWrap: {
			flex: 1,
		},
		modalCenterOverlay: {
			flex: 1,
			backgroundColor: `${theme.colors.background}${theme.opacity[50] * 100}`,
			alignItems: "center",
			justifyContent: "center",
			padding: 20,
		},
		renameRuleCard: {
			width: "100%",
			maxWidth: 360,
			borderRadius: 22,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.surface,
			padding: 18,
		},
		deleteRuleCard: {
			width: "100%",
			maxWidth: 360,
			borderRadius: 22,
			borderWidth: 1,
			borderColor: `${theme.colors.danger}30`,
			backgroundColor: theme.colors.surface,
			padding: 18,
		},
		renameRuleTitle: {
			color: theme.colors.textPrimary,
			fontSize: 17,
			fontWeight: "800",
			textAlign: "center",
		},
		renameRuleSummary: {
			color: theme.colors.textMuted,
			fontSize: 12,
			fontWeight: "700",
			textAlign: "center",
			marginTop: 4,
			marginBottom: 16,
		},
		renameRuleActions: {
			flexDirection: "row",
			gap: 10,
		},
		deleteRuleBody: {
			color: theme.colors.textSecondary,
			fontSize: 13,
			fontWeight: "600",
			lineHeight: 18,
			textAlign: "center",
			marginTop: 8,
			marginBottom: 16,
		},
		deleteRuleConfirmButton: {
			backgroundColor: `${theme.colors.danger}18`,
			borderWidth: 1,
			borderColor: `${theme.colors.danger}45`,
		},
		deleteRuleConfirmText: {
			color: theme.colors.danger,
			fontSize: 14,
			fontWeight: "800",
		},
		ruleManageCancelButton: {
			minHeight: 44,
			borderRadius: 999,
			alignItems: "center",
			justifyContent: "center",
			marginTop: 12,
			backgroundColor: theme.colors.mutedSurface,
		},
		ruleManageCancelText: {
			color: theme.colors.textSecondary,
			fontSize: 13,
			fontWeight: "800",
		},
		loadingCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			paddingVertical: 10,
			paddingHorizontal: 12,
		},
		loadingText: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "600",
		},
		errorCard: {
			backgroundColor: `${theme.colors.danger}12`,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: `${theme.colors.danger}40`,
			paddingVertical: 10,
			paddingHorizontal: 12,
		},
		errorText: {
			color: theme.colors.danger,
			fontSize: 12,
			fontWeight: "600",
		},
		infoCard: {
			backgroundColor: brandSoftBg,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: brandSoftBorder,
			paddingVertical: 10,
			paddingHorizontal: 12,
		},
		infoText: {
			color: brandText,
			fontSize: 12,
			fontWeight: "600",
		},
		envelopeEntryCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 18,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 14,
		},
		envelopeEntryTopRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 12,
		},
		envelopeEntryTitleRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			flex: 1,
			minWidth: 0,
		},
		envelopeEntryCopy: {
			flex: 1,
			flexShrink: 1,
			minWidth: 0,
			paddingRight: 8,
		},
		envelopeEntryTitle: {
			color: theme.colors.textPrimary,
			fontSize: 15,
			fontWeight: "800",
		},
		envelopeEntryMeta: {
			color: theme.colors.textMuted,
			fontSize: 12,
			lineHeight: 16,
			marginTop: 2,
		},
		envelopeManageButton: {
			borderRadius: 999,
			borderWidth: 1,
			borderColor: brandSoftBorder,
			backgroundColor: brandSoftBg,
			paddingHorizontal: 12,
			paddingVertical: 7,
			flexShrink: 0,
			minHeight: 44,
			justifyContent: "center",
		},
		envelopeManageText: {
			color: brandText,
			fontSize: 12,
			fontWeight: "800",
		},
		tabScrollView: {
			marginHorizontal: -20,
		},
		tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20 },
		tabChip: {
			minWidth: 96,
			paddingVertical: 10,
			paddingHorizontal: 16,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.surface,
			alignItems: "center",
		},
		tabChipActive: {
			backgroundColor: brandSoftBg,
			borderColor: brandSoftBorder,
		},
		tabChipText: {
			color: theme.colors.textSecondary,
			fontSize: 13,
			fontWeight: "700",
		},
		tabChipTextActive: { color: brandText },
		summaryCard: {
			backgroundColor: theme.colors.card,
			borderRadius: 24,
			padding: 18,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			gap: 14,
			overflow: "hidden",
		},
		summaryTopRow: {
			flexDirection: "row",
			alignItems: "stretch",
			gap: 12,
		},
		summaryHalf: {
			flex: 1,
			gap: 4,
		},
		summaryDivider: {
			width: 1,
			backgroundColor: theme.colors.borderSoft,
		},
		summarySavingsRow: {
			borderTopWidth: 1,
			borderTopColor: theme.colors.borderSoft,
			paddingTop: 12,
			gap: 4,
		},
		summaryLabel: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "600",
		},
		summaryValue: { fontSize: 18, fontWeight: "800", marginTop: 2 },
		summarySavingRate: {
			color: theme.colors.textMuted,
			fontSize: 11,
			marginTop: 2,
		},
		chartCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 20,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 16,
			gap: 10,
		},
		chartTitle: {
			color: theme.colors.textPrimary,
			fontSize: 16,
			fontWeight: "800",
		},
		chartSub: { color: theme.colors.textSecondary, fontSize: 12 },
		lineChartArea: {
			height: 190,
			marginTop: 8,
			position: "relative",
		},
		lineGrid: {
			position: "absolute",
			left: 0,
			right: 0,
			top: 18,
			bottom: 36,
			justifyContent: "space-between",
		},
		gridLine: {
			height: 1,
			backgroundColor: theme.colors.borderSoft,
		},
		lineGraphLayer: {
			flex: 1,
			flexDirection: "row",
			justifyContent: "space-between",
			paddingTop: 18,
			paddingBottom: 32,
			position: "relative",
		},
		lineSvgLayer: {
			position: "absolute",
			left: 0,
			right: 0,
			top: 0,
		},
		lineColumn: {
			flex: 1,
			alignItems: "center",
			height: "100%",
			position: "relative",
		},
		pulseStack: {
			width: "100%",
			minHeight: 124,
			alignItems: "center",
			justifyContent: "center",
		},
		pulseUpper: {
			height: 58,
			justifyContent: "flex-end",
			alignItems: "center",
		},
		pulseAxis: {
			height: 18,
			alignItems: "center",
			justifyContent: "center",
		},
		pulseLower: {
			height: 58,
			justifyContent: "flex-start",
			alignItems: "center",
		},
		pulseBar: {
			width: 12,
			borderRadius: 999,
			borderWidth: 1,
			borderColor:
				theme.mode === "light"
					? "rgba(255,255,255,0.78)"
					: "rgba(10,10,10,0.45)",
		},
		incomePulse: {
			backgroundColor: theme.colors.success,
			shadowColor: theme.colors.success,
			shadowOpacity: theme.mode === "light" ? 0.18 : 0.28,
			shadowRadius: 8,
			shadowOffset: { width: 0, height: 4 },
		},
		expensePulse: {
			backgroundColor: theme.colors.danger,
			shadowColor: theme.colors.danger,
			shadowOpacity: theme.mode === "light" ? 0.12 : 0.26,
			shadowRadius: 8,
			shadowOffset: { width: 0, height: 4 },
		},
		netDot: {
			width: 10,
			height: 10,
			borderRadius: 5,
			borderWidth: 2,
			borderColor: theme.colors.surface,
		},
		netDotPositive: {
			backgroundColor: theme.colors.brandPrimary,
		},
		netDotNegative: {
			backgroundColor: theme.colors.textPrimary,
		},
		lineDot: {
			position: "absolute",
			width: 10,
			height: 10,
			borderRadius: 5,
			borderWidth: 2,
			borderColor: theme.colors.surface,
			zIndex: 3,
		},
		incomeDot: {
			backgroundColor: theme.colors.success,
		},
		expenseDot: {
			backgroundColor: theme.colors.danger,
		},
		lineSegment: {
			position: "absolute",
			left: "50%",
			width: "100%",
			height: 3,
			borderRadius: 999,
			opacity: 0.72,
			zIndex: 1,
		},
		incomeSegment: {
			backgroundColor: theme.colors.success,
		},
		expenseSegment: {
			backgroundColor: theme.colors.danger,
		},
		chartTooltip: {
			position: "absolute",
			top: 8,
			left: "50%",
			marginLeft: -62,
			width: 124,
			backgroundColor: theme.colors.surface,
			borderRadius: theme.radius.md,
			padding: 8,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			...theme.shadow.md,
			zIndex: 12,
		},
		tooltipTitle: {
			fontSize: 11,
			fontWeight: "700",
			color: theme.colors.textPrimary,
			marginBottom: 4,
		},
		tooltipValue: { fontSize: 10, fontWeight: "600", marginBottom: 2 },
		chartLabel: {
			color: theme.colors.textMuted,
			fontSize: 10,
			fontWeight: "700",
			marginTop: 6,
		},
		chartLegend: { flexDirection: "row", gap: 16, marginTop: 4 },
		legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
		legendDot: { width: 8, height: 8, borderRadius: 999 },
		legendText: {
			color: theme.colors.textMuted,
			fontSize: 11,
			fontWeight: "600",
		},
		categoryCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 20,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 16,
			gap: 10,
		},
		categoryCardTitle: {
			color: theme.colors.textPrimary,
			fontSize: 16,
			fontWeight: "800",
		},
		categoryCardSub: { color: theme.colors.textSecondary, fontSize: 12 },
		otherInsightCard: {
			backgroundColor: theme.colors.mutedSurface,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			borderRadius: 14,
			padding: 12,
		},
		otherInsightText: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "700",
			lineHeight: 17,
		},
		top5Card: {
			backgroundColor: theme.colors.surface,
			borderRadius: 20,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 16,
			gap: 12,
		},
		top5Title: {
			color: theme.colors.textPrimary,
			fontSize: 16,
			fontWeight: "800",
		},
		top5Sub: { color: theme.colors.textSecondary, fontSize: 12 },
		top5Row: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: theme.colors.borderSoft,
		},
		top5Left: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			flex: 1,
		},
		top5Rank: {
			width: 28,
			height: 28,
			borderRadius: 14,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: brandSoftBg,
			borderWidth: 1,
			borderColor: brandSoftBorder,
		},
		top5RankText: { color: brandText, fontSize: 12, fontWeight: "800" },
		top5Label: {
			color: theme.colors.textPrimary,
			fontSize: 14,
			fontWeight: "700",
			flexShrink: 1,
		},
		top5Amount: {
			color: theme.colors.textSecondary,
			fontSize: 13,
			fontWeight: "700",
		},
		ringArea: {
			alignItems: "center",
			paddingTop: 24,
			paddingBottom: 20,
		},
		donutChart: {
			width: 180,
			height: 180,
			borderRadius: 90,
			alignItems: "center",
			justifyContent: "center",
			overflow: "visible",
			position: "relative",
			backgroundColor:
				theme.mode === "light"
					? theme.colors.mutedSurface
					: theme.colors.surface,
			borderWidth: 1,
			borderColor:
				theme.mode === "light"
					? "rgba(15,23,42,0.08)"
					: "rgba(255,255,255,0.09)",
			shadowColor: theme.colors.textPrimary,
			shadowOpacity: theme.mode === "light" ? 0.09 : 0.32,
			shadowRadius: 28,
			shadowOffset: { width: 0, height: 16 },
			elevation: 7,
		},
		donutSvg: {
			position: "absolute",
			top: 0,
			left: 0,
			width: 180,
			height: 180,
		},
		donutSegment: {
			height: 150,
			opacity: 0.92,
		},
		ringInner: {
			position: "absolute",
			top: 41,
			left: 41,
			width: 98,
			height: 98,
			borderRadius: 49,
			backgroundColor: theme.colors.card,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 1,
			borderColor:
				theme.mode === "light"
					? "rgba(15,23,42,0.07)"
					: theme.colors.borderSoft,
			shadowColor: theme.colors.textPrimary,
			shadowOpacity: theme.mode === "light" ? 0.06 : 0.24,
			shadowRadius: 18,
			shadowOffset: { width: 0, height: 10 },
			elevation: 4,
		},
		ringValue: {
			color: theme.colors.textPrimary,
			fontSize: 17,
			fontWeight: "900",
			letterSpacing: -0.4,
		},
		ringLabel: {
			color: theme.colors.textMuted,
			fontSize: 10,
			fontWeight: "700",
			letterSpacing: 0.5,
			marginTop: 3,
			textTransform: "uppercase",
		},
		catRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 10,
			borderTopWidth: 1,
			borderTopColor: theme.colors.borderSoft,
		},
		catLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
		catEmoji: { fontSize: 18 },
		catName: {
			color: theme.colors.textPrimary,
			fontSize: 13,
			fontWeight: "700",
		},
		catAmount: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },
		catRight: { alignItems: "flex-end", gap: 4 },
		catPct: {
			color: theme.colors.brandPrimary,
			fontSize: 13,
			fontWeight: "800",
		},
		catBar: {
			width: 60,
			height: 4,
			borderRadius: 999,
			backgroundColor: theme.colors.mutedSurface,
		},
		catBarFill: { height: "100%", borderRadius: 999 },
		customRangeBadge: {
			minHeight: 44,
			justifyContent: "center",
			backgroundColor: brandSoftBg,
			borderWidth: 1,
			borderColor: brandSoftBorder,
			borderRadius: 12,
			paddingHorizontal: 12,
			paddingVertical: 8,
		},
		customRangeBadgeText: {
			color: brandText,
			fontSize: 12,
			fontWeight: "700",
		},
		modalOverlay: {
			flex: 1,
			backgroundColor: `${theme.colors.background}${theme.opacity[50] * 100}`,
			justifyContent: "flex-end",
		},
		modalContent: {
			backgroundColor: theme.colors.surface,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			padding: 20,
			paddingBottom: 40,
			maxHeight: "80%",
		},
		dateRangeModalContent: {
			backgroundColor: theme.colors.surface,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			padding: 18,
			paddingBottom: 18,
			maxHeight: "92%",
		},
		dateRangePickerScroll: {
			flexShrink: 1,
		},
		dateRangePickerBody: {
			paddingBottom: 2,
		},
		modalTitle: {
			color: theme.colors.textPrimary,
			fontSize: 18,
			fontWeight: "800",
			textAlign: "center",
			marginBottom: 20,
		},
		modalSection: {
			marginBottom: 16,
		},
		modalSectionTitle: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "600",
			marginBottom: 8,
		},
		modalRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 16,
			marginBottom: 12,
		},
		modalButton: {
			width: 44,
			height: 44,
			borderRadius: 22,
			backgroundColor: theme.colors.mutedSurface,
			alignItems: "center",
			justifyContent: "center",
		},
		modalButtonText: {
			color: theme.colors.textPrimary,
			fontSize: 20,
			fontWeight: "700",
		},
		modalValue: {
			color: theme.colors.textPrimary,
			fontSize: 20,
			fontWeight: "800",
			minWidth: 60,
			textAlign: "center",
		},
		monthScroll: {
			marginHorizontal: -20,
			paddingHorizontal: 20,
		},
		monthChip: {
			paddingVertical: 8,
			paddingHorizontal: 14,
			borderRadius: 999,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.background,
			marginRight: 8,
		},
		dayChip: {
			minWidth: 38,
			paddingVertical: 8,
			paddingHorizontal: 10,
			borderRadius: 999,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.background,
			marginRight: 8,
			alignItems: "center",
		},
		monthChipActive: {
			backgroundColor: brandSoftBg,
			borderColor: brandSoftBorder,
		},
		monthChipText: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "600",
		},
		monthChipTextActive: {
			color: brandText,
		},
		modalActions: {
			flexDirection: "row",
			gap: 12,
			marginTop: 8,
		},
		dateRangeActions: {
			flexDirection: "row",
			gap: 12,
			marginTop: 10,
			paddingTop: 10,
			borderTopWidth: 1,
			borderTopColor: theme.colors.borderSoft,
		},
		modalActionButton: {
			flex: 1,
			paddingVertical: 14,
			minHeight: 44,
			borderRadius: 12,
			alignItems: "center",
		},
		modalActionCancel: {
			backgroundColor: theme.colors.mutedSurface,
		},
		modalActionConfirm: {
			backgroundColor:
				theme.mode === "light"
					? theme.colors.brandPrimaryDeep
					: theme.colors.brandPrimary,
		},
		modalActionCancelText: {
			color: theme.colors.textSecondary,
			fontSize: 14,
			fontWeight: "700",
		},
		modalActionConfirmText: {
			color: theme.colors.textInverse,
			fontSize: 14,
			fontWeight: "700",
		},
		compareRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.borderSoft,
		},
		compareLabel: {
			color: theme.colors.textSecondary,
			fontSize: 13,
			fontWeight: "600",
		},
		compareValues: {
			alignItems: "flex-end",
			gap: 4,
		},
		compareCurrent: {
			color: theme.colors.textPrimary,
			fontSize: 14,
			fontWeight: "800",
		},
		compareDelta: {
			fontSize: 11,
			fontWeight: "700",
		},
		compareDeltaPositive: {
			color: theme.colors.success,
		},
		compareDeltaNegative: {
			color: theme.colors.danger,
		},
		detailHeaderRow: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 8,
		},
		detailBackButton: {
			minHeight: 44,
			flexDirection: "row",
			alignItems: "center",
			gap: 4,
			paddingRight: 12,
		},
		detailBackText: {
			color: brandText,
			fontSize: 28,
			fontWeight: "800",
			lineHeight: 30,
		},
		detailBackLabel: {
			color: brandText,
			fontSize: 13,
			fontWeight: "800",
		},
		detailHeaderTitleWrap: {
			flex: 1,
			paddingRight: 54,
		},
		detailSubtitle: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "600",
			textAlign: "center",
			marginTop: -4,
			marginBottom: 12,
		},
		detailTxRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			gap: 12,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.borderSoft,
		},
		detailTxInfo: {
			flex: 1,
		},
		detailTxTitle: {
			color: theme.colors.textPrimary,
			fontSize: 13,
			fontWeight: "800",
		},
		detailTxMeta: {
			color: theme.colors.textMuted,
			fontSize: 11,
			marginTop: 3,
		},
		detailTxAmount: {
			color: theme.colors.danger,
			fontSize: 13,
			fontWeight: "800",
		},
	});
}
