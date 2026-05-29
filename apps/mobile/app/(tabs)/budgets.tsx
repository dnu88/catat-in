import { useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Platform,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { PageEntrance, StaggeredStack } from "../../src/components/motion";

import {
	KaswiseIcon,
	type KaswiseIconName,
} from "../../src/components/icons/kaswise-icons";
import {
	EmptyState,
	IconBubble,
	InputField,
	ScreenHeader,
	StateMessage,
} from "../../src/components/ui";
import { useSupabase } from "../../src/lib/supabase";
import {
	buildEnvelopeProgress,
	createBudgetEnvelope,
	deleteBudgetEnvelope,
	updateBudgetEnvelope,
	getEnvelopeStatus,
	listBudgetEnvelopes,
	listEnvelopeAllocations,
	resolveMonthlyEnvelopePeriod,
	type BudgetEnvelope,
	type EnvelopeAllocation,
	type EnvelopeProgress,
} from "../../src/services/budget-envelopes";
import { useI18n } from "../../src/i18n/i18n-context";
import { useFinanceContext } from "../../src/state/finance-context";
import { listCategories, type Category } from "../../src/services/categories";
import { useTheme } from "../../src/theme/theme-context";
import { budgetEnvelopePalette } from "../../src/theme/report-palettes";

type EnvelopeSummary = {
	envelope: BudgetEnvelope;
	progress: EnvelopeProgress;
};

type EnvelopeRowProps = {
	item: EnvelopeSummary;
	theme: ReturnType<typeof useTheme>["theme"];
	styles: ReturnType<typeof createStyles>;
	noCategoryLabel: string;
	overLabel: string;
	remainingLabel: string;
	deleteLabel: string;
	editLabel: string;
	onDelete: (envelope: BudgetEnvelope) => void;
	onEdit: (envelope: BudgetEnvelope) => void;
};

const iconOptions: {
	value: KaswiseIconName;
	labelId: string;
	labelEn: string;
}[] = [
	{ value: "food", labelId: "Makanan & Minuman", labelEn: "Food & Beverage" },
	{ value: "transport", labelId: "Transportasi", labelEn: "Transport" },
	{ value: "sport", labelId: "Olahraga", labelEn: "Sport" },
	{ value: "recreation", labelId: "Rekreasi", labelEn: "Recreation" },
	{ value: "bills", labelId: "Tagihan", labelEn: "Bills" },
	{ value: "groceries", labelId: "Groceries", labelEn: "Groceries" },
	{ value: "investment", labelId: "Investasi", labelEn: "Investment" },
	{ value: "gift", labelId: "Hadiah", labelEn: "Gift" },
	{
		value: "otherExpenses",
		labelId: "Other expenses",
		labelEn: "Other expenses",
	},
];

const lightColorOptions = budgetEnvelopePalette.light;
const darkColorOptions = budgetEnvelopePalette.dark;

function formatRupiah(value: number) {
	return `Rp ${Math.abs(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

function formatLocalDate(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function normalizeLabel(value: string | null | undefined) {
	return (value ?? "").trim().toLowerCase();
}

function dayFromDate(value: string | null | undefined, fallback: number) {
	const day = Number((value ?? "").slice(8, 10));
	return Number.isFinite(day) && day >= 1 && day <= 31 ? day : fallback;
}

function formatDayLabel(day: number, isEn: boolean) {
	return isEn ? `Day ${day}` : `Tanggal ${day}`;
}

function EnvelopeRow({
	item,
	theme,
	styles,
	noCategoryLabel,
	overLabel,
	remainingLabel,
	deleteLabel,
	editLabel,
	onDelete,
	onEdit,
}: EnvelopeRowProps) {
	const { envelope, progress } = item;
	const toneColor = progress.is_over_budget
		? theme.colors.danger
		: progress.is_near_limit
			? theme.colors.warning
			: theme.colors.brandPrimary;

	return (
		<View testID={`envelope-card-${envelope.id}`} style={styles.budgetCard}>
			<View style={styles.budgetTop}>
				<View style={styles.budgetLeft}>
					<IconBubble
						name="budgets"
						tone={
							progress.is_over_budget
								? "danger"
								: progress.is_near_limit
									? "warning"
									: "primary"
						}
						size={44}
					/>
					<View style={styles.budgetTextWrap}>
						<Text
							style={styles.budgetCategory}
							numberOfLines={1}
							ellipsizeMode="tail"
						>
							{envelope.name}
						</Text>
						<Text style={styles.budgetMeta}>
							{envelope.parent_category_name ?? noCategoryLabel} ·{" "}
							{envelope.start_date}–{envelope.end_date}
						</Text>
					</View>
				</View>
				<View
					style={[
						styles.budgetBadge,
						{
							backgroundColor: `${toneColor}15`,
							borderColor: `${toneColor}40`,
						},
					]}
				>
					<Text style={[styles.budgetBadgeText, { color: toneColor }]}>
						{progress.used_percentage}%
					</Text>
				</View>
			</View>

			<View style={styles.budgetBar}>
				<View
					style={[
						styles.budgetBarFill,
						{
							width: `${Math.min(progress.used_percentage, 100)}%`,
							backgroundColor: toneColor,
						},
					]}
				/>
			</View>

			<View style={styles.budgetFooterRow}>
				<Text style={styles.budgetFooter}>
					{progress.is_over_budget
						? `${overLabel} ${formatRupiah(progress.over_budget_amount)}`
						: `${remainingLabel} ${formatRupiah(Math.max(progress.remaining_amount, 0))}`}
				</Text>
				<View style={styles.budgetActionRow}>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={`${editLabel} ${envelope.name}`}
						style={styles.editButton}
						onPress={() => onEdit(envelope)}
					>
						<Text style={styles.editButtonText}>{editLabel}</Text>
					</Pressable>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={`${deleteLabel} ${envelope.name}`}
						style={styles.deleteButton}
						onPress={() => onDelete(envelope)}
					>
						<Text style={styles.deleteButtonText}>{deleteLabel}</Text>
					</Pressable>
				</View>
			</View>
		</View>
	);
}

export default function BudgetsScreen() {
	const { supabase } = useSupabase();
	const { theme } = useTheme();
	const { activeContext, canCreate } = useFinanceContext();
	const { language } = useI18n();
	const isEn = language === "en";
	const tx = useMemo(
		() =>
			isEn
				? {
						title: "Budgets",
						subtitle: "Manage personal budget wallets under report categories.",
						add: "+ New",
						createTitle: "Create budget wallet",
						editTitle: "Edit budget wallet",
						nameLabel: "Wallet name",
						namePlaceholder: "Wallet name",
						limitLabel: "Limit",
						limitPlaceholder: "Limit",
						categoryLabel: "Expense category",
						categoryPlaceholder: "Select category",
						categoryDropdownLabel: "Select budget category",
						startLabel: "Start day",
						startPlaceholder: "Start day",
						endLabel: "End day",
						endPlaceholder: "End day",
						iconLabel: "Icon",
						colorLabel: "Color",
						notesLabel: "Notes",
						notesPlaceholder: "Notes",
						iconDropdownLabel: "Select wallet icon",
						colorDropdownLabel: "Select wallet color",
						iconOptionLabel: "Choose icon",
						colorOptionLabel: "Choose color",
						over: "Over",
						remaining: "Remaining",
						contextHousehold: "Family",
						contextPersonal: "Personal",
						saving: "Saving...",
						save: "Save budget wallet",
						update: "Update budget wallet",
						edit: "Edit",
						dateDropdownLabel: "Choose date",
						dateOptionHint: "Pick day of month; Kaswise detects this month automatically.",
						delete: "Delete",
						deleteConfirmTitle: "Delete budget wallet?",
						deleteConfirmMessage: (name: string) =>
							`${name} will be removed from active budgets and moved to archive.`,
						cancel: "Cancel",
						activeLabel: "Active wallets",
						reviewMeta: "needs review",
						reviewScope: "Review only in Reports/Wallets",
						overviewHelper:
							"Budgets never block transactions. Wallets help monitor remaining and over-budget spending.",
						activeSection: "Active Wallets",
						emptyTitle: "No active budget wallets yet",
						emptyDescription:
							"Create wallets like Coffee, Ride-hailing, or Hangout to monitor personal budgets.",
						reviewSection: "Needs review",
						transactionFallback: "Transaction",
						lowConfidence: "Low confidence · check this transaction wallet",
						noReview: "No transactions need review.",
						archiveSection: "Archive",
						noArchive: "No completed budget wallets yet.",
						noCategory: "No category",
						loadLogin: "Login session not found. Please sign in again.",
						loadError: "Failed to load budget wallets. Try again shortly.",
						validationError: "Fill name, category, limit, start day, and end day.",
						saveError: "Failed to save budget wallet. Try again shortly.",
					}
				: {
						title: "Anggaran",
						subtitle:
							"Kelola dompet budget personal di bawah kategori laporan.",
						add: "+ Baru",
						createTitle: "Buat dompet budget",
						editTitle: "Edit dompet budget",
						nameLabel: "Nama dompet",
						namePlaceholder: "Nama dompet",
						limitLabel: "Limit",
						limitPlaceholder: "Limit",
						categoryLabel: "Kategori pengeluaran",
						categoryPlaceholder: "Pilih kategori",
						categoryDropdownLabel: "Pilih kategori budget",
						startLabel: "Tanggal mulai",
						startPlaceholder: "Pilih tanggal",
						endLabel: "Tanggal akhir",
						endPlaceholder: "Pilih tanggal",
						iconLabel: "Ikon",
						colorLabel: "Warna",
						notesLabel: "Catatan",
						notesPlaceholder: "Catatan",
						iconDropdownLabel: "Pilih ikon dompet",
						colorDropdownLabel: "Pilih warna dompet",
						iconOptionLabel: "Pilih ikon",
						colorOptionLabel: "Pilih warna",
						over: "Lewat",
						remaining: "Sisa",
						contextHousehold: "Keluarga",
						contextPersonal: "Pribadi",
						saving: "Menyimpan...",
						save: "Simpan dompet",
						update: "Perbarui dompet",
						edit: "Edit",
						dateDropdownLabel: "Pilih tanggal",
						dateOptionHint: "Pilih tanggal saja; bulan dan tahun berjalan otomatis terdeteksi.",
						delete: "Hapus",
						deleteConfirmTitle: "Hapus dompet budget?",
						deleteConfirmMessage: (name: string) =>
							`${name} akan dihapus dari budget aktif dan dipindahkan ke arsip.`,
						cancel: "Batal",
						activeLabel: "Dompet aktif",
						reviewMeta: "perlu cek",
						reviewScope: "Review hanya di Reports/Dompet",
						overviewHelper:
							"Budget tidak memblokir transaksi. Dompet membantu melihat sisa dan over budget.",
						activeSection: "Dompet Aktif",
						emptyTitle: "Belum ada dompet aktif",
						emptyDescription:
							"Buat dompet seperti Kopi, Ojol, atau Nongkrong untuk memantau budget personal.",
						reviewSection: "Perlu cek",
						transactionFallback: "Transaksi",
						lowConfidence: "Confidence rendah · cek dompet transaksi ini",
						noReview: "Tidak ada transaksi yang perlu dicek.",
						archiveSection: "Arsip",
						noArchive: "Belum ada dompet yang selesai.",
						noCategory: "Tanpa kategori",
						loadLogin: "Sesi login tidak ditemukan. Silakan login ulang.",
						loadError: "Gagal memuat data dompet. Coba lagi sebentar.",
						validationError:
							"Isi nama, kategori, limit, tanggal mulai, dan tanggal akhir.",
						saveError: "Gagal menyimpan dompet. Coba lagi sebentar.",
					},
		[isEn],
	);
	const styles = useMemo(() => createStyles(theme), [theme]);
	const [activeSummaries, setActiveSummaries] = useState<EnvelopeSummary[]>([]);
	const [archivedSummaries, setArchivedSummaries] = useState<EnvelopeSummary[]>(
		[],
	);
	const [reviewAllocations, setReviewAllocations] = useState<
		EnvelopeAllocation[]
	>([]);
	const [userId, setUserId] = useState<string | null>(null);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [name, setName] = useState("");
	const [limitAmount, setLimitAmount] = useState("");
	const [categoryOptions, setCategoryOptions] = useState<Category[]>([]);
	const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
	const [startDay, setStartDay] = useState<number | null>(null);
	const [endDay, setEndDay] = useState<number | null>(null);
	const [icon, setIcon] = useState<KaswiseIconName>("food");
	const [color, setColor] = useState("");
	const [showIconOptions, setShowIconOptions] = useState(false);
	const [showColorOptions, setShowColorOptions] = useState(false);
	const [showCategoryOptions, setShowCategoryOptions] = useState(false);
	const [showStartDateOptions, setShowStartDateOptions] = useState(false);
	const [showEndDateOptions, setShowEndDateOptions] = useState(false);
	const [editingEnvelope, setEditingEnvelope] = useState<BudgetEnvelope | null>(null);
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(true);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		loadEnvelopes();
	}, [activeContext]);

	const getDefaultDayRange = () => {
		const now = new Date();
		return {
			start: 1,
			end: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
		};
	};

	const dayOptions = useMemo(
		() =>
			Array.from({ length: 31 }, (_, index) => {
				const value = index + 1;
				return {
					label: formatDayLabel(value, isEn),
					value,
				};
			}),
		[isEn],
	);

	const selectedCategory =
		categoryOptions.find((item) => item.id === selectedCategoryId) ?? null;

	const resetEnvelopeForm = () => {
		setShowCreateForm(false);
		setEditingEnvelope(null);
		setName("");
		setLimitAmount("");
		setSelectedCategoryId(null);
		setStartDay(null);
		setEndDay(null);
		setIcon("food");
		setColor("");
		setNotes("");
		setShowIconOptions(false);
		setShowColorOptions(false);
		setShowCategoryOptions(false);
		setShowStartDateOptions(false);
		setShowEndDateOptions(false);
	};

	const openCreateForm = () => {
		if (showCreateForm && !editingEnvelope) {
			resetEnvelopeForm();
			return;
		}
		const range = getDefaultDayRange();
		setEditingEnvelope(null);
		setName("");
		setLimitAmount("");
		setSelectedCategoryId(categoryOptions[0]?.id ?? null);
		setStartDay(range.start);
		setEndDay(range.end);
		setIcon("food");
		setColor("");
		setNotes("");
		setShowCreateForm(true);
	};

	const openEditForm = (envelope: BudgetEnvelope) => {
		setEditingEnvelope(envelope);
		setName(envelope.name);
		setLimitAmount(String(Number(envelope.limit_amount ?? 0)));
		setSelectedCategoryId(
			envelope.parent_category_id ??
				categoryOptions.find(
					(category) =>
						normalizeLabel(category.name) ===
						normalizeLabel(envelope.parent_category_name),
				)?.id ??
				null,
		);
		setStartDay(dayFromDate(envelope.start_date, 1));
		setEndDay(dayFromDate(envelope.end_date, 31));
		setIcon((envelope.icon as KaswiseIconName | null) ?? "food");
		setColor(envelope.color ?? "");
		setNotes(envelope.notes ?? "");
		setShowIconOptions(false);
		setShowColorOptions(false);
		setShowCategoryOptions(false);
		setShowStartDateOptions(false);
		setShowEndDateOptions(false);
		setShowCreateForm(true);
	};

	const loadEnvelopes = async () => {
		try {
			setLoading(true);
			setLoadError(null);
			const {
				data: { user },
			} = await supabase.auth.getUser();

			setUserId(user?.id ?? null);

			if (!user) {
				setLoadError(tx.loadLogin);
				setActiveSummaries([]);
				setArchivedSummaries([]);
				setReviewAllocations([]);
				return;
			}

			const [envelopes, categories] = await Promise.all([
				listBudgetEnvelopes(supabase, user.id, activeContext),
				listCategories().catch(() => [] as Category[]),
			]);
			const expenseCategories = categories.filter(
				(category) => category.type !== "income",
			);
			setCategoryOptions(expenseCategories);
			setSelectedCategoryId((current) =>
				current && expenseCategories.some((category) => category.id === current)
					? current
					: (expenseCategories[0]?.id ?? null),
			);
			const allocations = await listEnvelopeAllocations(
				supabase,
				envelopes.map((envelope) => envelope.id),
			);
			const summaries = envelopes.map((envelope) => ({
				envelope,
				progress: buildEnvelopeProgress(envelope, allocations),
			}));

			setActiveSummaries(
				summaries.filter(
					(item) => getEnvelopeStatus(item.envelope) === "active",
				),
			);
			setArchivedSummaries(
				summaries.filter(
					(item) => getEnvelopeStatus(item.envelope) === "archived",
				),
			);
			setReviewAllocations(
				allocations.filter((allocation) => allocation.needs_review),
			);
		} catch (error) {
			console.error("Error loading budget envelopes:", error);
			setLoadError(tx.loadError);
		} finally {
			setLoading(false);
		}
	};

	const saveEnvelope = async () => {
		if (!userId || saving || !canCreate) return;
		const trimmedName = name.trim();
		const amount = Number(limitAmount.replace(/[^0-9]/g, ""));
		if (
			!trimmedName ||
			!selectedCategoryId ||
			!amount ||
			!startDay ||
			!endDay
		) {
			setLoadError(tx.validationError);
			return;
		}

		try {
			setSaving(true);
			setLoadError(null);
			const cycle = resolveMonthlyEnvelopePeriod(
				formatLocalDate(new Date(2000, 0, startDay)),
				formatLocalDate(new Date(2000, 0, endDay)),
			);
			const payload = {
				name: trimmedName,
				parent_category_id: selectedCategoryId,
				limit_amount: amount,
				start_date: cycle.start,
				end_date: cycle.end,
				icon,
				color: selectedColor,
				notes: notes.trim() || null,
			};

			if (editingEnvelope) {
				await updateBudgetEnvelope(
					supabase,
					editingEnvelope.id,
					payload,
					userId,
					activeContext,
				);
			} else {
				await createBudgetEnvelope(
					supabase,
					{
						user_id: userId,
						...payload,
					},
					activeContext,
				);
			}
			resetEnvelopeForm();
			await loadEnvelopes();
		} catch (error) {
			console.error("Error creating budget envelope:", error);
			const message = error instanceof Error ? ` ${error.message}` : "";
			setLoadError(`${tx.saveError}${message}`);
		} finally {
			setSaving(false);
		}
	};

	const deleteSelectedEnvelope = async (envelope: BudgetEnvelope) => {
		if (!userId || deletingId) return;
		try {
			setDeletingId(envelope.id);
			setLoadError(null);
			await deleteBudgetEnvelope(supabase, envelope.id, userId);
			await loadEnvelopes();
		} catch (error) {
			console.error("Error deleting budget envelope:", error);
			const message = error instanceof Error ? ` ${error.message}` : "";
			setLoadError(`${tx.saveError}${message}`);
		} finally {
			setDeletingId(null);
		}
	};

	const confirmDeleteEnvelope = (envelope: BudgetEnvelope) => {
		if (deletingId) return;
		const title = tx.deleteConfirmTitle;
		const message = tx.deleteConfirmMessage(envelope.name);

		if (Platform.OS === "web") {
			const confirm = (globalThis as { confirm?: (message?: string) => boolean })
				.confirm;
			if (confirm?.(`${title}\n\n${message}`)) {
				void deleteSelectedEnvelope(envelope);
			}
			return;
		}

		Alert.alert(title, message, [
			{ text: tx.cancel, style: "cancel" },
			{
				text: tx.delete,
				style: "destructive",
				onPress: () => void deleteSelectedEnvelope(envelope),
			},
		]);
	};

	if (loading) {
		return (
			<View
				style={[
					styles.screen,
					{ justifyContent: "center", alignItems: "center" },
				]}
			>
				<ActivityIndicator size="large" color={theme.colors.brandPrimary} />
			</View>
		);
	}

	const colorOptions =
		theme.mode === "light" ? lightColorOptions : darkColorOptions;
	const selectedIconOption =
		iconOptions.find((option) => option.value === icon) ?? iconOptions[0];
	const selectedColor = color || colorOptions[0];
	const visibleColorOptions = colorOptions.filter(
		(option) => option !== selectedColor,
	);

	const renderEnvelope = ({ item }: { item: EnvelopeSummary }) => (
		<EnvelopeRow
			item={item}
			theme={theme}
			styles={styles}
			noCategoryLabel={tx.noCategory}
			overLabel={tx.over}
			remainingLabel={tx.remaining}
			deleteLabel={tx.delete}
			editLabel={tx.edit}
			onDelete={confirmDeleteEnvelope}
			onEdit={openEditForm}
		/>
	);

	const listHeaderElement = (
		<StaggeredStack testIDPrefix="budgets-entrance">
			<ScreenHeader
				key="budgets-header"
				title={tx.title}
				subtitle={tx.subtitle}
				action={
					canCreate ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={tx.add}
							accessibilityState={{ expanded: showCreateForm }}
							style={styles.addButton}
							onPress={openCreateForm}
						>
							<Text style={styles.addButtonText}>{tx.add}</Text>
						</Pressable>
					) : null
				}
			/>
			<View key="budgets-context" testID="finance-context-badge" style={styles.contextBadge}>
				<Text style={styles.contextBadgeText}>
					{activeContext.type === "household"
						? tx.contextHousehold
						: tx.contextPersonal}
				</Text>
			</View>

			{loadError ? <StateMessage key="budgets-error" message={loadError} tone="error" /> : null}

			{showCreateForm ? (
				<View key="budgets-create-form" testID="envelope-create-form" style={styles.createCard}>
					<Text style={styles.createTitle}>{editingEnvelope ? tx.editTitle : tx.createTitle}</Text>
					<InputField
						label={tx.nameLabel}
						placeholder={tx.namePlaceholder}
						value={name}
						onChangeText={setName}
					/>
					<InputField
						label={tx.limitLabel}
						placeholder={tx.limitPlaceholder}
						value={limitAmount}
						onChangeText={setLimitAmount}
						keyboardType="numeric"
					/>
					<View style={styles.dropdownWrap}>
						<Text style={styles.fieldLabel}>{tx.categoryLabel}</Text>
						<Pressable
							testID="budget-category-dropdown"
							accessibilityRole="button"
							accessibilityLabel={tx.categoryDropdownLabel}
							accessibilityState={{ expanded: showCategoryOptions }}
							style={styles.selectButton}
							onPress={() => setShowCategoryOptions((value) => !value)}
						>
							<Text style={styles.selectText}>
								{selectedCategory?.name ?? tx.categoryPlaceholder}
							</Text>
							<Text style={styles.selectChevron}>⌄</Text>
						</Pressable>
						{showCategoryOptions ? (
							<View testID="budget-category-options" style={styles.optionList}>
								{categoryOptions.map((option) => (
									<Pressable
										key={option.id}
										testID={`budget-category-option-${option.id}`}
										accessibilityRole="button"
										accessibilityLabel={`${tx.categoryLabel}: ${option.name}`}
										style={styles.optionRow}
										onPress={() => {
											setSelectedCategoryId(option.id);
											setShowCategoryOptions(false);
										}}
									>
										<Text style={styles.optionText}>{option.name}</Text>
									</Pressable>
								))}
							</View>
						) : null}
					</View>
					<View style={styles.inputRow}>
						<View style={styles.inputHalf}>
							<Text style={styles.fieldLabel}>{tx.startLabel}</Text>
							<Pressable
								testID="budget-start-date-dropdown"
								accessibilityRole="button"
								accessibilityLabel={`${tx.dateDropdownLabel}: ${tx.startLabel}`}
								accessibilityState={{ expanded: showStartDateOptions }}
								style={styles.selectButton}
								onPress={() => setShowStartDateOptions((value) => !value)}
							>
								<Text style={styles.selectText}>{startDay ? formatDayLabel(startDay, isEn) : tx.startPlaceholder}</Text>
								<Text style={styles.selectChevron}>⌄</Text>
							</Pressable>
							{showStartDateOptions ? (
								<View testID="budget-start-date-options" style={styles.optionList}>
									<Text style={styles.optionHint}>{tx.dateOptionHint}</Text>
									<ScrollView nestedScrollEnabled style={styles.dateOptionScroll}>
										{dayOptions.map((option) => (
											<Pressable
												key={option.value}
												testID={`budget-start-date-option-${option.value}`}
												accessibilityRole="button"
												accessibilityLabel={`${tx.startLabel}: ${option.label}`}
												style={styles.optionRow}
												onPress={() => {
													setStartDay(option.value);
													setShowStartDateOptions(false);
												}}
											>
												<Text style={styles.optionText}>{option.label}</Text>
											</Pressable>
										))}
									</ScrollView>
								</View>
							) : null}
						</View>
						<View style={styles.inputHalf}>
							<Text style={styles.fieldLabel}>{tx.endLabel}</Text>
							<Pressable
								testID="budget-end-date-dropdown"
								accessibilityRole="button"
								accessibilityLabel={`${tx.dateDropdownLabel}: ${tx.endLabel}`}
								accessibilityState={{ expanded: showEndDateOptions }}
								style={styles.selectButton}
								onPress={() => setShowEndDateOptions((value) => !value)}
							>
								<Text style={styles.selectText}>{endDay ? formatDayLabel(endDay, isEn) : tx.endPlaceholder}</Text>
								<Text style={styles.selectChevron}>⌄</Text>
							</Pressable>
							{showEndDateOptions ? (
								<View testID="budget-end-date-options" style={styles.optionList}>
									<Text style={styles.optionHint}>{tx.dateOptionHint}</Text>
									<ScrollView nestedScrollEnabled style={styles.dateOptionScroll}>
										{dayOptions.map((option) => (
											<Pressable
												key={option.value}
												testID={`budget-end-date-option-${option.value}`}
												accessibilityRole="button"
												accessibilityLabel={`${tx.endLabel}: ${option.label}`}
												style={styles.optionRow}
												onPress={() => {
													setEndDay(option.value);
													setShowEndDateOptions(false);
												}}
											>
												<Text style={styles.optionText}>{option.label}</Text>
											</Pressable>
										))}
									</ScrollView>
								</View>
							) : null}
						</View>
					</View>
					<View style={styles.dropdownRow}>
						<View style={styles.dropdownWrap}>
							<Text style={styles.fieldLabel}>{tx.iconLabel}</Text>
							<Pressable
								testID="budget-wallet-icon-dropdown"
								style={styles.selectButton}
								accessibilityRole="button"
								accessibilityLabel={tx.iconDropdownLabel}
								accessibilityState={{ expanded: showIconOptions }}
								onPress={() => setShowIconOptions((value) => !value)}
							>
								<View style={styles.selectLeft}>
									<KaswiseIcon
										name={icon}
										color={theme.colors.textPrimary}
										size={18}
										weight="bold"
									/>
									<Text style={styles.selectText}>
										{isEn
											? selectedIconOption.labelEn
											: selectedIconOption.labelId}
									</Text>
								</View>
								<Text style={styles.selectChevron}>⌄</Text>
							</Pressable>
							{showIconOptions ? (
								<View
									testID="budget-wallet-icon-options"
									style={styles.optionList}
								>
									{iconOptions.map((option) => (
										<Pressable
											key={option.value}
											style={styles.optionRow}
											accessibilityRole="button"
											accessibilityLabel={`${tx.iconOptionLabel}: ${
												isEn ? option.labelEn : option.labelId
											}`}
											onPress={() => {
												setIcon(option.value);
												setShowIconOptions(false);
											}}
										>
											<KaswiseIcon
												name={option.value}
												color={theme.colors.textPrimary}
												size={18}
												weight="bold"
											/>
											<Text style={styles.optionText}>
												{isEn ? option.labelEn : option.labelId}
											</Text>
										</Pressable>
									))}
								</View>
							) : null}
						</View>
						<View style={styles.dropdownWrap}>
							<Text style={styles.fieldLabel}>{tx.colorLabel}</Text>
							<Pressable
								testID="budget-wallet-color-dropdown"
								style={styles.selectButton}
								accessibilityRole="button"
								accessibilityLabel={tx.colorDropdownLabel}
								accessibilityState={{ expanded: showColorOptions }}
								onPress={() => setShowColorOptions((value) => !value)}
							>
								<View style={styles.selectLeft}>
									<View
										style={[
											styles.colorSwatch,
											{ backgroundColor: selectedColor },
										]}
									/>
									<Text style={styles.selectText}>{selectedColor}</Text>
								</View>
								<Text style={styles.selectChevron}>⌄</Text>
							</Pressable>
							{showColorOptions ? (
								<View
									testID="budget-wallet-color-options"
									style={styles.colorOptionList}
								>
									{visibleColorOptions.map((option) => (
										<Pressable
											key={option}
											testID={`budget-wallet-color-${option}`}
											style={[
												styles.colorOption,
												selectedColor === option && styles.colorOptionActive,
											]}
											accessibilityRole="button"
											accessibilityLabel={`${tx.colorOptionLabel}: ${option}`}
											onPress={() => {
												setColor(option);
												setShowColorOptions(false);
											}}
										>
											<View
												style={[
													styles.colorOptionSwatch,
													{ backgroundColor: option },
												]}
											/>
										</Pressable>
									))}
								</View>
							) : null}
						</View>
					</View>
					<View style={styles.notesWrap}>
						<Text style={styles.fieldLabel}>{tx.notesLabel}</Text>
						<TextInput
							style={[styles.input, styles.notesInput]}
							placeholder={tx.notesPlaceholder}
							placeholderTextColor={theme.colors.textMuted}
							accessibilityLabel={tx.notesLabel}
							value={notes}
							onChangeText={setNotes}
							multiline
						/>
					</View>
					<View style={styles.formActionRow}>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={tx.cancel}
							style={styles.cancelButton}
							onPress={resetEnvelopeForm}
							disabled={saving}
						>
							<Text style={styles.cancelButtonText}>{tx.cancel}</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={editingEnvelope ? tx.update : tx.save}
							accessibilityState={{ disabled: saving, busy: saving }}
							style={[styles.saveButton, saving && { opacity: 0.7 }]}
							onPress={saveEnvelope}
							disabled={saving}
						>
							<Text style={styles.saveButtonText}>
								{saving ? tx.saving : editingEnvelope ? tx.update : tx.save}
							</Text>
						</Pressable>
					</View>
				</View>
			) : null}

			<View key="budgets-overview" testID="budgets-overview" style={styles.overviewCard}>
				<View style={styles.overviewTop}>
					<View>
						<Text style={styles.overviewLabel}>{tx.activeLabel}</Text>
						<Text style={styles.overviewPct}>{activeSummaries.length}</Text>
					</View>
					<View style={styles.overviewRight}>
						<Text style={styles.overviewSpent}>
							{reviewAllocations.length} {tx.reviewMeta}
						</Text>
						<Text style={styles.overviewLimit}>{tx.reviewScope}</Text>
					</View>
				</View>
				<Text style={styles.overviewHelper}>{tx.overviewHelper}</Text>
			</View>

			<Text key="budgets-active-title" testID="budgets-active-title" style={styles.sectionTitle}>{tx.activeSection}</Text>
		</StaggeredStack>
	);

	const ListEmpty = () => (
		<EmptyState
			icon="budgets"
			tone="primary"
			title={tx.emptyTitle}
			description={tx.emptyDescription}
		/>
	);

	const ListFooter = () => (
		<View style={styles.footerSections}>
			<Text style={styles.sectionTitle}>{tx.reviewSection}</Text>
			{reviewAllocations.length > 0 ? (
				reviewAllocations.map((allocation) => (
					<View key={allocation.id} style={styles.reviewCard}>
						<Text style={styles.reviewTitle}>
							{allocation.transaction_description ?? tx.transactionFallback}
						</Text>
						<Text style={styles.budgetMeta}>{tx.lowConfidence}</Text>
					</View>
				))
			) : (
				<Text style={styles.emptyInlineText}>{tx.noReview}</Text>
			)}

			<Text style={styles.sectionTitle}>{tx.archiveSection}</Text>
			{archivedSummaries.length > 0 ? (
				archivedSummaries.map((item) => (
					<View key={item.envelope.id} style={styles.archiveCard}>
						<Text style={styles.reviewTitle}>{item.envelope.name}</Text>
						<Text style={styles.budgetMeta}>
							{item.envelope.start_date}–{item.envelope.end_date}
						</Text>
					</View>
				))
			) : (
				<Text style={styles.emptyInlineText}>{tx.noArchive}</Text>
			)}

			<View style={{ height: 100 }} />
		</View>
	);

	return (
		<PageEntrance testID="budgets-page-entrance" style={styles.screen}>
			<FlatList
				data={activeSummaries}
				keyboardShouldPersistTaps="handled"
				renderItem={renderEnvelope}
				keyExtractor={(item) => item.envelope.id}
				ListHeaderComponent={listHeaderElement}
				ListEmptyComponent={ListEmpty}
				ListFooterComponent={ListFooter}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				initialNumToRender={10}
				maxToRenderPerBatch={10}
				windowSize={5}
				removeClippedSubviews={!showCreateForm}
				refreshing={loading}
				onRefresh={loadEnvelopes}
				refreshControl={
					<RefreshControl
						refreshing={loading}
						onRefresh={loadEnvelopes}
						tintColor={theme.colors.brandPrimary}
					/>
				}
			/>
		</PageEntrance>
	);
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
	return StyleSheet.create({
		screen: { flex: 1, backgroundColor: theme.colors.background },
		content: { padding: 20, gap: 8, paddingBottom: 26 },
		addButton: {
			backgroundColor: theme.colors.brandPrimary,
			borderRadius: 999,
			paddingHorizontal: 14,
			paddingVertical: 8,
			minHeight: 44,
			alignItems: "center",
			justifyContent: "center",
		},
		addButtonText: {
			color: theme.colors.textInverse,
			fontSize: 12,
			fontWeight: "700",
		},
		contextBadge: {
			alignSelf: "flex-start",
			backgroundColor: theme.colors.mutedSurface,
			borderColor: theme.colors.borderSoft,
			borderRadius: 999,
			borderWidth: 1,
			paddingHorizontal: 10,
			paddingVertical: 5,
		},
		contextBadgeText: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "700",
		},
		createCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 20,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 14,
			gap: 10,
		},
		createTitle: {
			color: theme.colors.textPrimary,
			fontSize: 15,
			fontWeight: "800",
		},
		input: {
			backgroundColor: theme.colors.mutedSurface,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			color: theme.colors.textPrimary,
			paddingHorizontal: 12,
			paddingVertical: 10,
			fontSize: 13,
		},
		inputRow: { flexDirection: "row", gap: 8 },
		inputHalf: { flex: 1, gap: 6 },
		notesWrap: { gap: 6 },
		dropdownRow: { gap: 10 },
		dropdownWrap: { gap: 6 },
		fieldLabel: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "700",
		},
		selectButton: {
			backgroundColor: theme.colors.mutedSurface,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			paddingHorizontal: 12,
			paddingVertical: 10,
			minHeight: 44,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 8,
		},
		selectLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
		selectText: {
			color: theme.colors.textPrimary,
			fontSize: 13,
			fontWeight: "700",
		},
		selectChevron: {
			color: theme.colors.textMuted,
			fontSize: 14,
			fontWeight: "800",
		},
		optionList: {
			backgroundColor: theme.colors.surface,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			overflow: "hidden",
		},
		dateOptionScroll: { maxHeight: 220 },
		optionHint: {
			color: theme.colors.textMuted,
			fontSize: 11,
			fontWeight: "700",
			paddingHorizontal: 12,
			paddingTop: 10,
			paddingBottom: 4,
		},
		optionRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			paddingHorizontal: 12,
			paddingVertical: 10,
			minHeight: 44,
		},
		optionText: {
			color: theme.colors.textPrimary,
			fontSize: 13,
			fontWeight: "700",
		},
		colorSwatch: {
			width: 18,
			height: 18,
			borderRadius: 9,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
		},
		colorOptionList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
		colorOption: {
			width: 44,
			height: 44,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.colors.surface,
		},
		colorOptionActive: {
			borderColor: theme.colors.brandPrimary,
			borderWidth: 2,
		},
		colorOptionSwatch: { width: 24, height: 24, borderRadius: 12 },
		notesInput: { minHeight: 64, textAlignVertical: "top" },
		formActionRow: { flexDirection: "row", gap: 10 },
		cancelButton: {
			flex: 1,
			minHeight: 44,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.mutedSurface,
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 12,
		},
		cancelButtonText: {
			color: theme.colors.textSecondary,
			fontSize: 13,
			fontWeight: "800",
		},
		saveButton: {
			flex: 1,
			minHeight: 44,
			backgroundColor: theme.colors.brandPrimary,
			borderRadius: 14,
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 12,
		},
		saveButtonText: {
			color: theme.colors.textInverse,
			fontSize: 13,
			fontWeight: "800",
		},
		overviewCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 20,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 16,
			gap: 12,
		},
		overviewTop: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		overviewLabel: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "600",
		},
		overviewPct: {
			color: theme.colors.textPrimary,
			fontSize: 32,
			fontWeight: "800",
			marginTop: 2,
		},
		overviewRight: { alignItems: "flex-end" },
		overviewSpent: {
			color: theme.colors.textPrimary,
			fontSize: 15,
			fontWeight: "800",
		},
		overviewLimit: {
			color: theme.colors.textMuted,
			fontSize: 12,
			marginTop: 2,
		},
		overviewHelper: {
			color: theme.colors.textMuted,
			fontSize: 11,
			lineHeight: 16,
		},
		sectionTitle: {
			color: theme.colors.textPrimary,
			fontSize: 16,
			fontWeight: "800",
			marginTop: 14,
			marginBottom: 4,
		},
		budgetCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 18,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 14,
			gap: 10,
		},
		budgetTop: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			gap: 10,
		},
		budgetLeft: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			flex: 1,
		},
		budgetTextWrap: { flex: 1 },
		budgetCategory: {
			color: theme.colors.textPrimary,
			fontSize: 14,
			fontWeight: "700",
		},
		budgetMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
		budgetBadge: {
			borderWidth: 1,
			borderRadius: 999,
			paddingHorizontal: 10,
			paddingVertical: 4,
		},
		budgetBadgeText: { fontSize: 13, fontWeight: "800" },
		budgetBar: {
			height: 6,
			backgroundColor: theme.colors.mutedSurface,
			borderRadius: 999,
			overflow: "hidden",
		},
		budgetBarFill: { height: "100%", borderRadius: 999 },
		budgetFooterRow: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 10,
			flexWrap: "wrap",
		},
		budgetFooter: {
			color: theme.colors.textMuted,
			fontSize: 11,
			fontWeight: "600",
			flexShrink: 1,
		},
		budgetActionRow: { flexDirection: "row", gap: 8 },
		editButton: {
			minHeight: 36,
			justifyContent: "center",
			borderRadius: 999,
			borderWidth: 1,
			borderColor: `${theme.colors.brandPrimary}40`,
			backgroundColor: `${theme.colors.brandPrimary}12`,
			paddingHorizontal: 12,
			paddingVertical: 6,
		},
		editButtonText: {
			color: theme.colors.brandPrimary,
			fontSize: 12,
			fontWeight: "800",
		},
		deleteButton: {
			minHeight: 36,
			justifyContent: "center",
			borderRadius: 999,
			borderWidth: 1,
			borderColor: `${theme.colors.danger}40`,
			backgroundColor: `${theme.colors.danger}12`,
			paddingHorizontal: 12,
			paddingVertical: 6,
		},
		deleteButtonText: {
			color: theme.colors.danger,
			fontSize: 12,
			fontWeight: "800",
		},
		footerSections: { gap: 8 },
		reviewCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 16,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 12,
		},
		archiveCard: {
			backgroundColor: theme.colors.mutedSurface,
			borderRadius: 16,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 12,
		},
		reviewTitle: {
			color: theme.colors.textPrimary,
			fontSize: 14,
			fontWeight: "700",
		},
		emptyInlineText: {
			color: theme.colors.textMuted,
			fontSize: 12,
			lineHeight: 18,
		},
	});
}
