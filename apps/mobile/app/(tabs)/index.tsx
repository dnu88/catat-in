import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { FinanceContextSwitcher } from "../../src/components/FinanceContextSwitcher";
import { PageEntrance, StaggeredEntrance } from "../../src/components/motion";
import { KaswiseIcon } from "../../src/components/icons/kaswise-icons";
import { NotificationBell } from "../../src/components/notifications/NotificationBell";
import { PROFILE_AVATARS, ProfileAvatarIllustration, readProfileVisualMetadata } from "../../src/components/profile/ProfileAvatar";
import { EmptyState } from "../../src/components/ui";
import { useI18n } from "../../src/i18n/i18n-context";
import { useSupabase } from "../../src/lib/supabase";
import {
	buildEnvelopeProgress,
	getEnvelopeStatus,
	getHomeEnvelopeAlerts,
	listBudgetEnvelopes,
	listEnvelopeAllocations,
	type EnvelopeSummary,
} from "../../src/services/budget-envelopes";
import {
	listTransactions,
	type Transaction,
} from "../../src/services/transactions";
import {
	getTransactionReviewSummary,
	type TransactionReviewSummary,
} from "../../src/services/transaction-review";
import { listWallets, type Wallet } from "../../src/services/wallets";
import { listCategories, type Category } from "../../src/services/categories";
import { getLocalizedCategoryName } from "../../src/services/category-taxonomy";
import { resolveCategoryVisual } from "../../src/theme/category-visuals";
import { useFinanceContext } from "../../src/state/finance-context";
import {
	formatReportPeriodLabel,
	isCurrentMonthPeriod,
	isDateInReportPeriod,
	useReportPeriod,
} from "../../src/state/report-period";
import {
	readFirstUseGuideState,
	saveFirstUseGuideState,
	type FirstUseGuideState,
} from "../../src/services/first-use-guide";
import { useTheme } from "../../src/theme/theme-context";

const quickActions = [
	{
		id: "manual",
		label: "Input AI",
		icon: "capture",
		route: "/(tabs)/capture",
		tone: "primary",
	},
] as const;

function formatCurrency(value: number) {
	return `Rp ${Math.abs(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

function formatSignedCurrency(value: number) {
	return value < 0 ? `- ${formatCurrency(value)}` : formatCurrency(value);
}

const DASHBOARD_NOMINAL_VISIBILITY_KEY = "kaswise:dashboard-nominal-hidden";
const MASKED_AMOUNT = "Rp ••••••";

function formatCompactAmount(
	value: number,
	type: Transaction["transaction_type"],
) {
	const sign = type === "income" ? "+" : "-";
	return `${sign}${formatCurrency(value).replace("Rp ", "")}`;
}

function getFirstName(fullName: string) {
	return fullName.trim().split(/\s+/)[0] ?? "";
}

function colorWithAlpha(color: string, alpha: string) {
	return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;
}

function getInitials(fullName: string) {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return "";
	}
	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function DashboardScreen() {
	const { supabase } = useSupabase();
	const { theme, toggleTheme } = useTheme();
	const { language } = useI18n();
	const { activeContext } = useFinanceContext();
	const { activePeriod, resetToCurrentMonth } = useReportPeriod();
	const router = useRouter();
	const isEn = language === "en";
	const tx = useMemo(
		() =>
			isEn
				? {
						budget: "Budgets",
						view: "View →",
						monthlyRemaining: "This month left",
						monthlyDeficit: "This month minus",
						periodRemaining: "This period left",
						periodDeficit: "This period minus",
						activePeriod: "Active period",
						resetPeriod: "This month",
						hideAmounts: "Hide",
						showAmounts: "Show",
						hideAmountsA11y: "Hide dashboard amounts",
						showAmountsA11y: "Show dashboard amounts",
						switchToLightTheme: "Switch to light mode",
						switchToDarkTheme: "Switch to dark mode",
						manageWallets: "Manage wallets",
						manage: "Manage",
						quickActionA11y: (label: string) => `Quick action ${label}`,
						budgetActionA11y: "View all budgets",
						recentTitle: "Recent",
						allTransactions: "All →",
						allTransactionsA11y: "View all transactions",
						overUntilHidden: (day: string, month: string) => `Amount hidden until ${day}/${month}`,
						remainingUntilHidden: (day: string, month: string) => `Amount hidden until ${day}/${month}`,
						totalBalance: "Total balance",
						totalBalanceSub: "All active wallets",
						monthlyExpense: "Spending",
						monthlyExpenseSub: "This month",
						onboardingEyebrow: "First steps",
						onboardingTitle: "Start with one wallet and one transaction.",
						onboardingBody: "Kaswise works best after it knows where your money lives and has one daily transaction to read.",
						onboardingPrimaryNoWallet: "Create first wallet",
						onboardingPrimaryTransaction: "Record first transaction",
						onboardingSecondary: "Open budgets",
						guideNext: "Next",
						guideHide: "Hide",
						guideStepCounter: (current: number, total: number) => `Step ${current} of ${total}`,
						guideComplete: "Done",
						guideOpenMenu: "Open menu",
						onboardingSteps: [
							"Create a wallet for cash, bank, or e-wallet balance.",
							"Type a transaction like: bought coffee 35k.",
							"Add a category budget after your first transaction.",
						],
						over: "over budget",
						near: "almost used up",
						overUntil: (amount: number, day: string, month: string) =>
							`Over Rp${amount.toLocaleString("id-ID")} until ${day}/${month}`,
						remainingUntil: (amount: number, day: string, month: string) =>
							`Rp${amount.toLocaleString("id-ID")} left until ${day}/${month}`,
						attention: "Active budget wallet needs attention",
						reviewTitle: (count: number) => `${count} ${count === 1 ? "transaction needs" : "transactions need"} review`,
						reviewBody: "Clean up categories so reports and AI Insight stay accurate.",
						reviewCta: "Review now",
					}
				: {
						budget: "Anggaran",
						view: "Lihat →",
						monthlyRemaining: "Sisa bulan ini",
						monthlyDeficit: "Minus bulan ini",
						periodRemaining: "Sisa periode ini",
						periodDeficit: "Minus periode ini",
						activePeriod: "Periode aktif",
						resetPeriod: "Bulan ini",
						hideAmounts: "Sembunyikan",
						showAmounts: "Lihat",
						hideAmountsA11y: "Sembunyikan nominal dashboard",
						showAmountsA11y: "Tampilkan nominal dashboard",
						switchToLightTheme: "Ganti ke mode terang",
						switchToDarkTheme: "Ganti ke mode gelap",
						manageWallets: "Kelola dompet",
						manage: "Kelola",
						quickActionA11y: (label: string) => `Aksi cepat ${label}`,
						budgetActionA11y: "Lihat semua budget",
						recentTitle: "Terakhir",
						allTransactions: "Semua →",
						allTransactionsA11y: "Lihat semua transaksi",
						overUntilHidden: (day: string, month: string) => `Nominal disembunyikan sampai ${day}/${month}`,
						remainingUntilHidden: (day: string, month: string) => `Nominal disembunyikan sampai ${day}/${month}`,
						totalBalance: "Total saldo",
						totalBalanceSub: "Semua dompet aktif",
						monthlyExpense: "Pengeluaran",
						monthlyExpenseSub: "Bulan ini",
						onboardingEyebrow: "Langkah awal",
						onboardingTitle: "Mulai dari satu dompet dan satu transaksi.",
						onboardingBody: "Kaswise paling terasa setelah tahu uangmu ada di mana dan punya satu transaksi harian untuk dibaca.",
						onboardingPrimaryNoWallet: "Buat dompet pertama",
						onboardingPrimaryTransaction: "Catat transaksi pertama",
						onboardingSecondary: "Buka budget",
						guideNext: "Lanjut",
						guideHide: "Sembunyikan",
						guideStepCounter: (current: number, total: number) => `Langkah ${current} dari ${total}`,
						guideComplete: "Selesai",
						guideOpenMenu: "Buka menu",
						onboardingSteps: [
							"Buat dompet untuk saldo tunai, bank, atau e-wallet.",
							"Tulis transaksi seperti: beli kopi 35rb.",
							"Tambahkan budget kategori setelah transaksi pertama.",
						],
						over: "lewat budget",
						near: "hampir habis",
						overUntil: (amount: number, day: string, month: string) =>
							`Lewat Rp${amount.toLocaleString("id-ID")} sampai ${day}/${month}`,
						remainingUntil: (amount: number, day: string, month: string) =>
							`Rp${amount.toLocaleString("id-ID")} tersisa sampai ${day}/${month}`,
						attention: "Dompet aktif yang perlu perhatian",
						reviewTitle: (count: number) => `${count} transaksi perlu dicek`,
						reviewBody: "Rapikan kategori agar laporan dan Insight AI lebih akurat.",
						reviewCta: "Cek sekarang",
					},
		[isEn],
	);
	const styles = useMemo(() => createStyles(theme), [theme]);
	const [envelopeAlerts, setEnvelopeAlerts] = useState<EnvelopeSummary[]>([]);
	const [wallets, setWallets] = useState<Wallet[]>([]);
	const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
		[],
	);
	const [reviewSummary, setReviewSummary] = useState<TransactionReviewSummary | null>(null);
	const [categoryOptions, setCategoryOptions] = useState<Category[]>([]);
	const [userName, setUserName] = useState("");
	const [userEmail, setUserEmail] = useState("");
	const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
	const [profileAvatarKey, setProfileAvatarKey] = useState("");

	const [refreshing, setRefreshing] = useState(false);
	const [dashboardReady, setDashboardReady] = useState(false);
	const [guideStateReady, setGuideStateReady] = useState(false);
	const [guideUserId, setGuideUserId] = useState("");
	const [firstUseGuideState, setFirstUseGuideState] =
		useState<FirstUseGuideState>({});
	const [activeBudgetCount, setActiveBudgetCount] = useState(0);
	const [currentGuideStep, setCurrentGuideStep] = useState(0);
	const [isNominalHidden, setIsNominalHidden] = useState(false);

	useEffect(() => {
		let active = true;
		void AsyncStorage.getItem(DASHBOARD_NOMINAL_VISIBILITY_KEY)
			.then((value) => {
				if (active) setIsNominalHidden(value === "hidden");
			})
			.catch(() => undefined);
		return () => {
			active = false;
		};
	}, []);

	const toggleNominalVisibility = useCallback(() => {
		setIsNominalHidden((current) => {
			const next = !current;
			void AsyncStorage.setItem(
				DASHBOARD_NOMINAL_VISIBILITY_KEY,
				next ? "hidden" : "visible",
			).catch(() => undefined);
			return next;
		});
	}, []);

	const displayAmount = useCallback(
		(amount: string) => (isNominalHidden ? MASKED_AMOUNT : amount),
		[isNominalHidden],
	);

	const loadDashboard = useCallback(async (isMounted: () => boolean = () => true) => {
			try {
				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (!user) {
					if (isMounted()) {
						setEnvelopeAlerts([]);
						setUserName("");
						setUserEmail("");
						setProfilePhotoUrl("");
						setProfileAvatarKey("");
						setWallets([]);
						setRecentTransactions([]);
						setReviewSummary(null);
						setCategoryOptions([]);
						setGuideUserId("");
						setFirstUseGuideState({});
						setGuideStateReady(true);
						setActiveBudgetCount(0);
					}
					return;
				}

				const persistedGuideState = await readFirstUseGuideState(user.id);

				if (isMounted()) {
					setGuideUserId(user.id);
					setFirstUseGuideState(persistedGuideState);
					setGuideStateReady(true);
					const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
					const resolvedName =
						(typeof metadata.full_name === "string" && metadata.full_name) ||
						(typeof metadata.name === "string" && metadata.name) ||
						"";
					const visual = readProfileVisualMetadata(metadata);
					setUserName(resolvedName);
					setUserEmail(user.email ?? "");
					setProfilePhotoUrl(visual.photoUrl);
					setProfileAvatarKey(visual.avatarKey);
				}

				const [envelopes, scopedWallets, scopedTransactions, categories] =
					await Promise.all([
						listBudgetEnvelopes(supabase, user.id, activeContext),
						listWallets(activeContext),
						listTransactions(undefined, activeContext),
						listCategories().catch(() => [] as Category[]),
					]);
				if (isMounted()) {
					setWallets(
						scopedWallets.filter((wallet) => wallet.is_active !== false),
					);
					setRecentTransactions(scopedTransactions);
					setCategoryOptions(categories);
				}
				const activeEnvelopes = envelopes.filter(
					(envelope) => getEnvelopeStatus(envelope) === "active",
				);
				if (isMounted()) setActiveBudgetCount(activeEnvelopes.length);
				const allocations = await listEnvelopeAllocations(
					supabase,
					activeEnvelopes.map((envelope) => envelope.id),
				);

				// Load transaction review summary
				const reviewResult = await getTransactionReviewSummary(activeContext)
					.catch(() => null);
				if (isMounted() && reviewResult) {
					setReviewSummary(reviewResult.summary);
				}

				const summaries = activeEnvelopes.map((envelope) => ({
					envelope,
					progress: buildEnvelopeProgress(envelope, allocations),
					reviewCount: allocations.filter(
						(allocation) =>
							allocation.envelope_id === envelope.id && allocation.needs_review,
					).length,
				}));

				if (isMounted()) setEnvelopeAlerts(getHomeEnvelopeAlerts(summaries));
			} catch (error) {
				if (isMounted()) {
					console.error("Error loading home envelope alerts:", error);
					setEnvelopeAlerts([]);
					setReviewSummary(null);
					setGuideStateReady(true);
					setActiveBudgetCount(0);
				}
			} finally {
				if (isMounted()) setDashboardReady(true);
			}
	}, [supabase, activeContext]);

	useFocusEffect(
		useCallback(() => {
			let mounted = true;
			setDashboardReady(false);
			setGuideStateReady(false);
			void loadDashboard(() => mounted);
			return () => {
				mounted = false;
			};
		}, [loadDashboard]),
	);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await loadDashboard();
		} finally {
			setRefreshing(false);
		}
	}, [loadDashboard]);

	const primaryEnvelopeAlert = envelopeAlerts[0];
	const totalBalance = wallets.reduce(
		(sum, wallet) => sum + Number(wallet.balance ?? 0),
		0,
	);
	const now = new Date();
	const activePeriodRangeLabel = formatReportPeriodLabel(activePeriod, isEn ? "en" : "id");
	const activePeriodLabel = activePeriod.ruleName
		? `${activePeriod.ruleName} · ${activePeriodRangeLabel}`
		: activePeriodRangeLabel;
	const isCurrentMonth = isCurrentMonthPeriod(activePeriod, now);
	const activePeriodTransactions = recentTransactions.filter((transaction) =>
		isDateInReportPeriod(transaction.date, activePeriod),
	);
	const monthlyIncome = activePeriodTransactions
		.filter((transaction) => transaction.transaction_type === "income")
		.reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
	const monthlyExpense = activePeriodTransactions
		.filter((transaction) => transaction.transaction_type === "expense")
		.reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
	const monthlyRemaining = monthlyIncome - monthlyExpense;
	const monthlyRemainingTone = monthlyRemaining < 0 ? "danger" : "default";
	const heroTitle = isCurrentMonth
		? monthlyRemaining < 0 ? tx.monthlyDeficit : tx.monthlyRemaining
		: monthlyRemaining < 0 ? tx.periodDeficit : tx.periodRemaining;
	const displayedTransactions = recentTransactions.slice(0, 3).map((transaction) => {
		const categoryVisual = resolveCategoryVisual({
			categoryName: transaction.category,
			categories: categoryOptions,
			mode: theme.mode,
		});

		const localizedCategoryName = getLocalizedCategoryName(
			transaction.category,
			isEn ? "en" : "id",
		);

		return {
			id: transaction.id,
			title:
				transaction.merchant ?? transaction.description ?? transaction.category,
			meta: `${transaction.date ?? ""} · ${localizedCategoryName}`,
			amount: displayAmount(formatCompactAmount(
				transaction.amount,
				transaction.transaction_type,
			)),
			amountTone:
				transaction.transaction_type === "income"
					? ("income" as const)
					: ("expense" as const),
			icon:
				transaction.transaction_type === "income" ? "chart" : categoryVisual.icon,
			iconColor:
				transaction.transaction_type === "income"
					? theme.colors.success
					: categoryVisual.color,
		};
	});

	const firstName = userName ? getFirstName(userName) : "";
	const greeting = firstName
		? isEn
			? `Hi, ${firstName}`
			: `Halo, ${firstName}`
		: isEn
			? "Hi"
			: "Halo";
	const avatarInitials = userName
		? getInitials(userName)
		: userEmail
			? userEmail.slice(0, 1).toUpperCase()
			: "?";
	const selectedProfileAvatar = PROFILE_AVATARS.find(
		(avatar) => avatar.id === profileAvatarKey,
	);
	const dateText = now.toLocaleDateString(isEn ? "en-US" : "id-ID", {
		month: "long",
		year: "numeric",
	});
	const guideSteps = useMemo(
		() => [
			{
				id: "wallet",
				title: isEn ? "Create your first wallet" : "Buat dompet pertama",
				body: isEn
					? "Set where your money lives: cash, bank, or e-wallet."
					: "Tentukan uangmu ada di mana: tunai, bank, atau e-wallet.",
				action: isEn ? "Open Wallets" : "Buka Dompet",
				route: "/(tabs)/wallets",
				isComplete: wallets.length > 0,
			},
			{
				id: "capture",
				title: isEn ? "Record one real transaction" : "Catat satu transaksi nyata",
				body: isEn
					? "Use a short sentence, for example: bought coffee 35k."
					: "Pakai kalimat pendek, misalnya: beli kopi 35rb.",
				action: isEn ? "Open Capture" : "Buka Catat",
				route: "/(tabs)/capture",
				isComplete: recentTransactions.length > 0,
			},
			{
				id: "budget",
				title: isEn ? "Add a category budget" : "Buat budget kategori",
				body: isEn
					? "Start with one recurring category like food, transport, or bills."
					: "Mulai dari satu kategori rutin seperti makan, transport, atau tagihan.",
				action: isEn ? "Open Budgets" : "Buka Budget",
				route: "/(tabs)/budgets",
				isComplete: activeBudgetCount > 0,
			},
			{
				id: "reports",
				title: isEn ? "Check the first report" : "Cek laporan pertama",
				body: isEn
					? "Use Reports to see how transactions affect cashflow and categories."
					: "Gunakan Laporan untuk melihat dampak transaksi ke arus kas dan kategori.",
				action: isEn ? "Open Reports" : "Buka Laporan",
				route: "/(tabs)/reports",
				isComplete: recentTransactions.length > 0 && Boolean(firstUseGuideState.reportsVisited),
			},
		],
		[
			activeBudgetCount,
			firstUseGuideState.reportsVisited,
			isEn,
			recentTransactions.length,
			wallets.length,
		],
	);
	const guideCompletionKey = guideSteps
		.map((step) => `${step.id}:${step.isComplete ? "1" : "0"}`)
		.join("|");
	const showFirstUseGuide =
		dashboardReady &&
		guideStateReady &&
		!firstUseGuideState.dismissed &&
		guideSteps.some((step) => !step.isComplete);
	const activeGuideStep = guideSteps[currentGuideStep] ?? guideSteps[0];
	const canMoveGuideNext = currentGuideStep < guideSteps.length - 1;

	useEffect(() => {
		if (!dashboardReady || !guideStateReady) return;
		const firstIncompleteIndex = guideSteps.findIndex((step) => !step.isComplete);
		setCurrentGuideStep((currentStep) => {
			const savedStep =
				typeof firstUseGuideState.lastStep === "number"
					? firstUseGuideState.lastStep
					: currentStep;
			const clampedStep = Math.max(
				0,
				Math.min(savedStep, guideSteps.length - 1),
			);
			if (!guideSteps[clampedStep]?.isComplete) return clampedStep;
			return firstIncompleteIndex >= 0 ? firstIncompleteIndex : clampedStep;
		});
	}, [
		dashboardReady,
		firstUseGuideState.lastStep,
		guideCompletionKey,
		guideStateReady,
		guideSteps,
	]);

	const updateGuideStep = useCallback(
		(nextStep: number) => {
			const clampedStep = Math.max(
				0,
				Math.min(nextStep, guideSteps.length - 1),
			);
			setCurrentGuideStep(clampedStep);
			setFirstUseGuideState((state) => ({
				...state,
				lastStep: clampedStep,
			}));
			if (guideUserId) {
				void saveFirstUseGuideState(guideUserId, { lastStep: clampedStep })
					.then(setFirstUseGuideState)
					.catch(() => undefined);
			}
		},
		[guideSteps.length, guideUserId],
	);

	const dismissGuide = useCallback(() => {
		setFirstUseGuideState((state) => ({ ...state, dismissed: true }));
		if (guideUserId) {
			void saveFirstUseGuideState(guideUserId, { dismissed: true })
				.then(setFirstUseGuideState)
				.catch(() => undefined);
		}
	}, [guideUserId]);

	const budgetAlertMeta = primaryEnvelopeAlert
		? (() => {
				const day = primaryEnvelopeAlert.envelope.end_date.slice(8, 10);
				const month = primaryEnvelopeAlert.envelope.end_date.slice(5, 7);
				if (primaryEnvelopeAlert.progress.is_over_budget) {
					return isNominalHidden
						? tx.overUntilHidden(day, month)
						: tx.overUntil(
								primaryEnvelopeAlert.progress.over_budget_amount,
								day,
								month,
							);
				}
				return isNominalHidden
					? tx.remainingUntilHidden(day, month)
					: tx.remainingUntil(
							Math.max(primaryEnvelopeAlert.progress.remaining_amount, 0),
							day,
							month,
						);
			})()
		: "";

	return (
		<PageEntrance testID="home-page-entrance" style={styles.screen}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={theme.colors.brandPrimary}
					/>
				}
			>
				<View style={styles.headerRow}>
					<View style={styles.headerCopy}>
						<Text style={styles.greeting}>{greeting}</Text>
						<Text style={styles.dateText}>{dateText}</Text>
					</View>
					<View style={styles.headerActions}>
						<Pressable
							testID="home-theme-toggle"
							accessibilityRole="button"
							accessibilityLabel={theme.mode === "dark" ? tx.switchToLightTheme : tx.switchToDarkTheme}
							style={({ pressed }) => [styles.headerIconButton, pressed && { opacity: 0.74 }]}
							onPress={toggleTheme}
						>
							<KaswiseIcon
								name={theme.mode === "dark" ? "sun" : "moon"}
								size={18}
								weight="bold"
								color={theme.colors.textSecondary}
							/>
						</Pressable>
						<NotificationBell pollIntervalMs={60000} />
						<View testID="home-avatar" style={styles.avatarWrap}>
							{profilePhotoUrl ? (
								<Image
									testID="home-avatar-image"
									source={{ uri: profilePhotoUrl }}
									style={styles.avatarImage}
								/>
							) : selectedProfileAvatar ? (
								<ProfileAvatarIllustration preset={selectedProfileAvatar} theme={theme} size={34} />
							) : (
								<Text style={styles.avatarText}>{avatarInitials}</Text>
							)}
						</View>
					</View>
				</View>

				<StaggeredEntrance index={0} testID="home-entrance-hero">
					<View testID="home-hero-card" style={styles.heroCard}>
						<View style={styles.heroTopRow}>
							<View style={styles.heroContextRow}>
								<FinanceContextSwitcher variant="hero" />
							</View>
							<View style={styles.heroTopActions}>
								<Pressable
									testID="home-amount-visibility-toggle"
									accessibilityRole="button"
									accessibilityLabel={isNominalHidden ? tx.showAmountsA11y : tx.hideAmountsA11y}
									accessibilityState={{ selected: isNominalHidden }}
									style={styles.privacyToggle}
									onPress={toggleNominalVisibility}
								>
									<KaswiseIcon
										name={isNominalHidden ? "eyeSlash" : "eye"}
										size={17}
										weight="bold"
										color={theme.colors.textSecondary}
									/>
								</Pressable>
								<Pressable
									accessibilityRole="button"
									accessibilityLabel={tx.manageWallets}
									hitSlop={12}
									onPress={() => router.push("/(tabs)/wallets" as never)}
								>
									<Text style={styles.manageText}>{tx.manage}</Text>
								</Pressable>
							</View>
						</View>

						<View style={styles.balanceBlock}>
							<Text style={styles.heroLabel}>{heroTitle}</Text>
							<View style={styles.amountRow}>
								<Text
									testID="home-monthly-remaining"
									style={[
										styles.heroAmount,
										monthlyRemainingTone === "danger" && styles.heroAmountDanger,
									]}
								>
									{displayAmount(formatSignedCurrency(monthlyRemaining))}
								</Text>
							</View>
						</View>

						<View style={styles.heroPeriodRow}>
							<View style={styles.heroPeriodChip}>
								<Text testID="home-active-period-label" style={styles.heroPeriodText}>{tx.activePeriod}: {activePeriodLabel}</Text>
							</View>
							{!isCurrentMonth ? (
								<Pressable
									accessibilityRole="button"
									accessibilityLabel={tx.resetPeriod}
									testID="home-period-reset"
									onPress={resetToCurrentMonth}
									style={({ pressed }) => [styles.heroPeriodReset, pressed && { opacity: 0.74 }]}
								>
									<Text style={styles.heroPeriodResetText}>{tx.resetPeriod}</Text>
								</Pressable>
							) : null}
						</View>

						<View style={styles.heroMetricRow}>
							<View style={styles.heroMetricCard}>
								<Text style={styles.heroMetricLabel}>{tx.totalBalance}</Text>
								<Text testID="home-total-balance" style={styles.heroMetricValue}>
									{displayAmount(formatCurrency(totalBalance))}
								</Text>
								<Text style={styles.heroMetricSub}>{tx.totalBalanceSub}</Text>
							</View>
							<View style={styles.heroMetricCard}>
								<Text style={styles.heroMetricLabel}>{tx.monthlyExpense}</Text>
								<Text testID="home-monthly-expense" style={styles.heroMetricValue}>
									{displayAmount(formatCurrency(monthlyExpense))}
								</Text>
								<Text style={styles.heroMetricSub}>{tx.monthlyExpenseSub}</Text>
							</View>
						</View>
					</View>

					{/* Active wallet chips */}
					{wallets.length > 0 && (
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.walletChipRow}
							style={{ marginTop: -8, marginBottom: 4 }}
						>
							{wallets.map((w) => (
								<Pressable
									key={w.id}
									accessibilityRole="button"
									accessibilityLabel={`${isEn ? "Wallet" : "Dompet"}: ${w.name}`}
									onPress={() => router.push("/(tabs)/wallets" as never)}
									style={[styles.walletChip]}
								>
									<Text style={styles.walletChipName}>{w.name}</Text>
									<Text style={styles.walletChipBalance}>
										{displayAmount(formatCurrency(Number(w.balance ?? 0)))}
									</Text>
								</Pressable>
							))}
						</ScrollView>
					)}
				</StaggeredEntrance>

				<StaggeredEntrance index={1} testID="home-entrance-actions">
					<View style={styles.quickActionRow}>
						{quickActions.map((action) => (
						<Pressable
							key={action.id}
							testID={`home-quick-action-${action.id}`}
							accessibilityRole="button"
							accessibilityLabel={tx.quickActionA11y(action.label)}
							style={styles.quickActionCard}
							onPress={() => router.push(action.route as never)}
						>
							<View
								testID={`home-quick-bubble-${action.id}`}
								style={[styles.iconBubble, styles[`${action.tone}Bubble`]]}
							>
								<KaswiseIcon
									name={action.icon}
									size={16}
									weight="bold"
									color={
										action.tone === "primary"
											? theme.iconBubbles.primary.color
											: theme.iconBubbles.info.color
									}
								/>
							</View>
							<Text style={styles.quickActionLabel}>{action.label}</Text>
						</Pressable>
						))}
					</View>
				</StaggeredEntrance>


				{showFirstUseGuide ? (
					<StaggeredEntrance index={2} testID="home-entrance-first-use">
						<View testID="home-first-use-card" style={styles.firstUseCard}>
							<View style={styles.firstUseTopRow}>
								<View style={styles.firstUseCopy}>
									<Text style={styles.firstUseEyebrow}>{tx.onboardingEyebrow}</Text>
									<Text style={styles.firstUseCounter}>
										{tx.guideStepCounter(currentGuideStep + 1, guideSteps.length)}
									</Text>
									<Text style={styles.firstUseTitle}>{activeGuideStep.title}</Text>
									<Text style={styles.firstUseBody}>{activeGuideStep.body}</Text>
								</View>
								<View style={styles.firstUseTopActions}>
									<Pressable
										testID="home-first-use-dismiss"
										accessibilityRole="button"
										accessibilityLabel={tx.guideHide}
										hitSlop={10}
										style={styles.firstUseDismissButton}
										onPress={dismissGuide}
									>
										<Text style={styles.firstUseDismissText}>{tx.guideHide}</Text>
									</Pressable>
									<View style={[styles.iconBubble, styles.primaryBubble]}>
										<KaswiseIcon
											name={activeGuideStep.id === "wallet" ? "wallets" : activeGuideStep.id === "budget" ? "budgets" : activeGuideStep.id === "reports" ? "chart" : "capture"}
											size={18}
											weight="bold"
											color={theme.iconBubbles.primary.color}
										/>
									</View>
								</View>
							</View>

							<View style={styles.firstUseStepList}>
								{guideSteps.map((step, index) => (
									<Pressable
										key={step.id}
										testID={`home-first-use-step-${step.id}`}
										accessibilityRole="button"
										accessibilityLabel={step.title}
										accessibilityState={{ selected: index === currentGuideStep }}
										style={[
											styles.firstUseStepRow,
											index === currentGuideStep && styles.firstUseStepRowActive,
										]}
										onPress={() => updateGuideStep(index)}
									>
										<Text
											style={[
												styles.firstUseStepNumber,
												step.isComplete && styles.firstUseStepNumberDone,
											]}
										>
											{step.isComplete ? "✓" : `0${index + 1}`}
										</Text>
										<View style={styles.firstUseStepCopy}>
											<Text style={styles.firstUseStepText}>{step.title}</Text>
											<Text style={styles.firstUseStepMeta}>
												{step.isComplete ? tx.guideComplete : step.action}
											</Text>
										</View>
									</Pressable>
								))}
							</View>

							<View style={styles.firstUseActionRow}>
								<Pressable
									testID="home-first-use-primary"
									accessibilityRole="button"
									accessibilityLabel={`${tx.guideOpenMenu}: ${activeGuideStep.action}`}
									style={styles.firstUsePrimaryButton}
									onPress={() => router.push(activeGuideStep.route as never)}
								>
									<Text style={styles.firstUsePrimaryText}>{activeGuideStep.action}</Text>
								</Pressable>
								{canMoveGuideNext ? (
									<Pressable
										testID="home-first-use-next"
										accessibilityRole="button"
										accessibilityLabel={tx.guideNext}
										style={styles.firstUseSecondaryButton}
										onPress={() => updateGuideStep(currentGuideStep + 1)}
									>
										<Text style={styles.firstUseSecondaryText}>{tx.guideNext}</Text>
									</Pressable>
								) : null}
							</View>
						</View>
					</StaggeredEntrance>
				) : null}

				<StaggeredEntrance index={3} testID="home-entrance-budget">
					<View testID="home-budget-section" style={styles.sectionCard}>
					<View style={styles.sectionTopRow}>
						<Text style={styles.sectionTitle}>{tx.budget}</Text>
						<Pressable
							testID="home-budget-action"
							accessibilityRole="button"
							accessibilityLabel={tx.budgetActionA11y}
							hitSlop={12}
							onPress={() => router.push("/(tabs)/budgets" as never)}
						>
							<Text style={styles.sectionAction}>{tx.view}</Text>
						</Pressable>
					</View>
					{primaryEnvelopeAlert ? (
						<View testID="home-envelope-alert" style={styles.budgetContent}>
							<View style={styles.budgetTopRow}>
								<View style={styles.budgetTextBlock}>
									<Text style={styles.budgetName}>
										{primaryEnvelopeAlert.progress.is_over_budget
											? `${primaryEnvelopeAlert.envelope.name} ${tx.over}`
											: `${primaryEnvelopeAlert.envelope.name} ${tx.near}`}
									</Text>
									<Text style={styles.budgetMeta}>{budgetAlertMeta}</Text>
								</View>
								<Text style={styles.budgetPercent}>
									{primaryEnvelopeAlert.progress.used_percentage}%
								</Text>
							</View>
							<View style={styles.progressTrack}>
								<View
									style={[
										styles.progressFill,
										{
											width: `${Math.min(primaryEnvelopeAlert.progress.used_percentage, 100)}%`,
										},
									]}
								/>
							</View>
							<Text style={styles.budgetStatus}>{tx.attention}</Text>
						</View>
					) : null}
					</View>
				</StaggeredEntrance>

				{reviewSummary && reviewSummary.count > 0 ? (
					<StaggeredEntrance index={4} testID="home-entrance-review">
						<View testID="home-transaction-review-card" style={styles.sectionCard}>
							<View style={styles.sectionTopRow}>
								<View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
									<View
										style={{
											width: 32,
											height: 32,
											borderRadius: theme.radius.pill,
											backgroundColor: colorWithAlpha(theme.colors.warning, "18"),
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										<KaswiseIcon name="notification" color={theme.colors.warning} size={16} weight="bold" />
									</View>
									<Text style={styles.sectionTitle}>{tx.reviewTitle(reviewSummary.count)}</Text>
								</View>
								<Pressable
									testID="home-review-action"
									accessibilityRole="button"
									accessibilityLabel={tx.reviewCta}
									hitSlop={12}
									onPress={() => router.push("/(tabs)/transactions?review=1" as never)}
								>
									<Text style={[styles.sectionAction, { color: theme.colors.warning }]}>{tx.reviewCta}</Text>
								</Pressable>
							</View>
							<Text style={[styles.budgetMeta, { marginTop: theme.spacing.xs }]}>{tx.reviewBody}</Text>
						</View>
					</StaggeredEntrance>
				) : null}

				<StaggeredEntrance index={reviewSummary && reviewSummary.count > 0 ? 5 : 4} testID="home-entrance-recent">
					<View style={styles.sectionCard}>
						<View style={styles.sectionTopRow}>
							<Text style={styles.sectionTitle}>{tx.recentTitle}</Text>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={tx.allTransactionsA11y}
							hitSlop={12}
							onPress={() => router.push("/(tabs)/transactions" as never)}
						>
							<Text style={styles.sectionAction}>{tx.allTransactions}</Text>
						</Pressable>
					</View>
					{displayedTransactions.length ? (
						displayedTransactions.map((item, index) => (
							<View
								key={item.id}
								style={[
									styles.txRow,
									index === displayedTransactions.length - 1 &&
										styles.txRowLast,
								]}
							>
								<View
									style={[
										styles.txBubble,
										{
											backgroundColor: colorWithAlpha(item.iconColor, "18"),
											borderColor: colorWithAlpha(item.iconColor, "40"),
										},
									]}
								>
									<KaswiseIcon
										name={item.icon}
										color={item.iconColor}
										size={18}
										weight="bold"
									/>
								</View>
								<View style={styles.txInfo}>
									<Text style={styles.txTitle}>{item.title}</Text>
									<Text style={styles.txMeta}>{item.meta}</Text>
								</View>
								<Text
									testID={`home-recent-amount-${item.id}`}
									style={[
										styles.txAmount,
										item.amountTone === "income"
											? styles.txAmountIncome
											: styles.txAmountExpense,
									]}
								>
									{item.amount}
								</Text>
							</View>
						))
					) : (
						<EmptyState
							icon="transactions"
							title={isEn ? "No transactions yet" : "Belum ada transaksi"}
							description={
								isEn
									? "Record your first transaction from the Capture tab to see it here."
									: "Catat transaksi pertamamu dari tab Catat untuk melihatnya di sini."
							}
						/>
					)}
					</View>
				</StaggeredEntrance>
			</ScrollView>
		</PageEntrance>
	);
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
	return StyleSheet.create({
		screen: {
			flex: 1,
			backgroundColor: theme.colors.background,
		},
		scrollView: {
			flex: 1,
		},
		content: {
			padding: 16,
			paddingBottom: 110,
			gap: 14,
		},
		headerRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingTop: 6,
			gap: 8,
		},
		headerCopy: {
			flexShrink: 1,
			minWidth: 0,
		},
		greeting: {
			color: theme.colors.textPrimary,
			fontSize: 22,
			fontWeight: theme.typography.fontWeight.extrabold,
			letterSpacing: -0.3,
		},
		dateText: {
			color: theme.colors.textMuted,
			fontSize: 13,
			marginTop: 2,
		},
		headerActions: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			flexShrink: 1,
			minWidth: 0,
		},
		headerIconButton: {
			width: 38,
			height: 38,
			borderRadius: 19,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.mutedSurface,
			alignItems: "center",
			justifyContent: "center",
		},
		avatarWrap: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: theme.colors.surfaceElevated,
			borderWidth: 2,
			borderColor: theme.mode === "dark"
				? colorWithAlpha(theme.colors.textInverse, "D9")
				: colorWithAlpha(theme.colors.textPrimary, "24"),
			alignItems: "center",
			justifyContent: "center",
			overflow: "hidden",
		},
		avatarImage: {
			width: 34,
			height: 34,
			borderRadius: 17,
		},
		avatarText: {
			color: theme.colors.textInverse,
			fontSize: 12,
			fontWeight: theme.typography.fontWeight.bold,
		},
		heroCard: {
			backgroundColor: theme.colors.card,
			borderRadius: 24,
			padding: 18,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			overflow: "hidden",
		},
		heroTopRow: {
			position: "relative",
			zIndex: 20,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 12,
			marginBottom: 16,
		},
		heroContextRow: {
			position: "relative",
			zIndex: 20,
			alignSelf: "flex-start",
			flexShrink: 1,
		},
		heroTopActions: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			flexShrink: 0,
		},
		privacyToggle: {
			width: 34,
			height: 34,
			borderRadius: 17,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.mutedSurface,
			alignItems: "center",
			justifyContent: "center",
		},
		manageText: {
			color: theme.colors.textMuted,
			fontSize: 12,
			fontWeight: theme.typography.fontWeight.semibold,
		},
		balanceBlock: {
			position: "relative",
			marginBottom: 16,
		},
		heroLabel: {
			color: theme.colors.textMuted,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.bold,
			textTransform: "uppercase",
			letterSpacing: 0.4,
			marginBottom: 4,
		},
		amountRow: {
			flexDirection: "row",
			alignItems: "baseline",
			gap: 10,
			flexWrap: "wrap",
		},
		heroAmount: {
			color: theme.colors.textPrimary,
			fontSize: 30,
			fontWeight: theme.typography.fontWeight.extrabold,
			letterSpacing: -0.6,
		},
		heroAmountDanger: {
			color: theme.colors.danger,
		},
		heroPeriodRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			marginBottom: 12,
			flexWrap: "wrap",
		},
		heroPeriodChip: {
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			borderRadius: 999,
			backgroundColor: theme.colors.mutedSurface,
			paddingHorizontal: 10,
			paddingVertical: 5,
		},
		heroPeriodText: {
			color: theme.colors.textSecondary,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.bold,
		},
		heroPeriodReset: {
			minHeight: 30,
			borderRadius: 999,
			paddingHorizontal: 10,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.iconBubbles.primary.background,
			borderWidth: 1,
			borderColor: theme.iconBubbles.primary.border,
		},
		heroPeriodResetText: {
			color: theme.iconBubbles.primary.color,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		heroMetricRow: {
			flexDirection: "row",
			gap: 10,
		},
		heroMetricCard: {
			flex: 1,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			borderRadius: 16,
			backgroundColor: theme.colors.mutedSurface,
			padding: 12,
			gap: 3,
		},
		heroMetricLabel: {
			color: theme.colors.textMuted,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.bold,
		},
		heroMetricValue: {
			color: theme.colors.textPrimary,
			fontSize: 15,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		heroMetricSub: {
			color: theme.colors.textDim,
			fontSize: 10,
			fontWeight: theme.typography.fontWeight.semibold,
		},
		quickActionRow: {
			flexDirection: "row",
			gap: 8,
		},
		quickActionCard: {
			flex: 1,
			minHeight: 72,
			backgroundColor: theme.colors.card,
			borderRadius: 16,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			paddingVertical: 12,
			paddingHorizontal: 8,
			alignItems: "center",
			gap: 6,
		},
		iconBubble: {
			width: 32,
			height: 32,
			borderRadius: 16,
			borderWidth: 1,
			alignItems: "center",
			justifyContent: "center",
		},
		primaryBubble: {
			backgroundColor: theme.iconBubbles.primary.background,
			borderColor: theme.iconBubbles.primary.border,
		},
		primaryBubbleText: {
			color: theme.colors.brandPrimary,
		},
		warningBubble: {
			backgroundColor: theme.iconBubbles.warning.background,
			borderColor: theme.iconBubbles.warning.border,
		},
		warningBubbleText: {
			color: theme.colors.warning,
		},
		infoBubble: {
			backgroundColor: theme.iconBubbles.info.background,
			borderColor: theme.iconBubbles.info.border,
		},
		infoBubbleText: {
			color: theme.colors.info,
		},
		quickActionLabel: {
			color: theme.colors.textSecondary,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.bold,
		},
		firstUseCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 20,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 16,
			gap: 14,
		},
		firstUseTopRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			gap: 12,
		},
		firstUseCopy: { flex: 1, gap: 6 },
		firstUseTopActions: {
			alignItems: "flex-end",
			gap: 10,
		},
		firstUseDismissButton: {
			minHeight: 32,
			borderRadius: 999,
			backgroundColor: theme.colors.mutedSurface,
			paddingHorizontal: 10,
			alignItems: "center",
			justifyContent: "center",
		},
		firstUseDismissText: {
			color: theme.colors.textMuted,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.bold,
		},
		firstUseEyebrow: {
			color: theme.colors.brandPrimary,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.extrabold,
			letterSpacing: 0.5,
			textTransform: "uppercase",
		},
		firstUseCounter: {
			color: theme.colors.textMuted,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.bold,
		},
		firstUseTitle: {
			color: theme.colors.textPrimary,
			fontSize: 18,
			fontWeight: theme.typography.fontWeight.extrabold,
			letterSpacing: -0.3,
			lineHeight: 23,
		},
		firstUseBody: {
			color: theme.colors.textSecondary,
			fontSize: 13,
			lineHeight: 20,
		},
		firstUseStepList: { gap: 8 },
		firstUseStepRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			minHeight: 44,
			borderRadius: 14,
			padding: 8,
		},
		firstUseStepRowActive: {
			backgroundColor: theme.colors.mutedSurface,
		},
		firstUseStepNumber: {
			width: 30,
			height: 30,
			borderRadius: 10,
			backgroundColor: theme.iconBubbles.primary.background,
			borderWidth: 1,
			borderColor: theme.iconBubbles.primary.border,
			color: theme.iconBubbles.primary.color,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.extrabold,
			textAlign: "center",
			textAlignVertical: "center",
			lineHeight: 28,
		},
		firstUseStepNumberDone: {
			backgroundColor: theme.colors.brandPrimary,
			borderColor: theme.colors.brandPrimary,
			color: theme.colors.textInverse,
		},
		firstUseStepCopy: { flex: 1, gap: 2 },
		firstUseStepText: {
			color: theme.colors.textPrimary,
			fontSize: 12,
			fontWeight: theme.typography.fontWeight.bold,
			lineHeight: 18,
		},
		firstUseStepMeta: {
			color: theme.colors.textMuted,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.semibold,
		},
		firstUseActionRow: {
			flexDirection: "row",
			gap: 10,
			flexWrap: "wrap",
		},
		firstUsePrimaryButton: {
			flexGrow: 1,
			minHeight: 44,
			borderRadius: theme.radius.sm,
			backgroundColor: theme.colors.brandPrimary,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 14,
		},
		firstUsePrimaryText: {
			color: theme.colors.textInverse,
			fontSize: 13,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		firstUseSecondaryButton: {
			minHeight: 44,
			borderRadius: theme.radius.sm,
			borderWidth: 1,
			borderColor: theme.colors.borderStrong,
			backgroundColor: theme.colors.mutedSurface,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 14,
		},
		firstUseSecondaryText: {
			color: theme.colors.textPrimary,
			fontSize: 13,
			fontWeight: theme.typography.fontWeight.bold,
		},
		sectionCard: {
			backgroundColor: theme.colors.card,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			borderRadius: 18,
			padding: 14,
			gap: 10,
		},
		sectionTopRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		sectionTitle: {
			color: theme.colors.textPrimary,
			fontSize: 14,
			fontWeight: theme.typography.fontWeight.bold,
		},
		sectionAction: {
			color: theme.colors.brandPrimary,
			fontSize: 12,
			fontWeight: theme.typography.fontWeight.bold,
		},
		budgetContent: {
			gap: 6,
		},
		budgetTopRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		budgetTextBlock: {
			flex: 1,
			gap: 3,
		},
		budgetName: {
			color: theme.colors.textPrimary,
			fontSize: 13,
			fontWeight: theme.typography.fontWeight.bold,
		},
		budgetPercent: {
			color: theme.colors.warning,
			fontSize: 12,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		budgetMeta: {
			color: theme.colors.textMuted,
			fontSize: 11,
		},
		progressTrack: {
			height: 6,
			backgroundColor: theme.colors.borderBase,
			borderRadius: 999,
			overflow: "hidden",
		},
		progressFill: {
			width: "82%",
			height: "100%",
			backgroundColor: theme.colors.warning,
			borderRadius: 999,
		},
		budgetStatus: {
			color: theme.colors.textMuted,
			fontSize: 11,
			marginTop: 2,
		},
		txRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			paddingVertical: 8,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.borderSoft,
		},
		txRowLast: {
			borderBottomWidth: 0,
		},
		txBubble: {
			width: 36,
			height: 36,
			borderRadius: 18,
			borderWidth: 1,
			alignItems: "center",
			justifyContent: "center",
			flexShrink: 0,
		},
		txBubbleText: {
			fontSize: 12,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		txInfo: {
			flex: 1,
		},
		txTitle: {
			color: theme.colors.textPrimary,
			fontSize: 13,
			fontWeight: theme.typography.fontWeight.bold,
		},
		txMeta: {
			color: theme.colors.textDim,
			fontSize: 11,
			marginTop: 2,
		},
		txAmount: {
			fontSize: 13,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		txAmountIncome: {
			color: theme.colors.success,
		},
		txAmountExpense: {
			color: theme.colors.danger,
		},
		walletChipRow: {
			paddingHorizontal: 2,
			gap: 8,
		},
		walletChip: {
			backgroundColor: theme.colors.mutedSurface,
			borderRadius: 12,
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			minWidth: 100,
		},
		walletChipName: {
			color: theme.colors.textSecondary,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.bold,
			textTransform: "uppercase" as const,
		},
		walletChipBalance: {
			color: theme.colors.textPrimary,
			fontSize: 13,
			fontWeight: theme.typography.fontWeight.extrabold,
			marginTop: 2,
		},
	});
}
