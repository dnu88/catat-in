import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { FinanceContextSwitcher } from "../../src/components/FinanceContextSwitcher";
import { PageEntrance, StaggeredEntrance } from "../../src/components/motion";
import {
	KaswiseIcon,
	type KaswiseIconName,
} from "../../src/components/icons/kaswise-icons";
import { NotificationBell } from "../../src/components/notifications/NotificationBell";
import { PROFILE_AVATARS, ProfileAvatarIllustration, readProfileVisualMetadata } from "../../src/components/profile/ProfileAvatar";

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
import { useTheme } from "../../src/theme/theme-context";
import { financeEditorial as fe, resolveFinancialIconPalette } from "../../src/theme/finance-editorial";


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
	const { theme } = useTheme();
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
					}
					return;
				}

				if (isMounted()) {
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
				}
			}
	}, [supabase, activeContext]);

	useFocusEffect(
		useCallback(() => {
			let mounted = true;
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
		const iconPalette = resolveFinancialIconPalette(
			transaction.category,
			transaction.transaction_type,
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
			iconColor: iconPalette.color,
			iconBackground: iconPalette.background,
			iconBorder: iconPalette.border,
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
						tintColor={fe.white}
					/>
				}
			>
				<View style={styles.headerRow}>
					<View style={styles.headerCopy}>
						<Text style={styles.greeting}>{greeting}</Text>
						<Text style={styles.dateText}>{dateText}</Text>
					</View>
					<View style={styles.headerActions}>
						<NotificationBell pollIntervalMs={60000} tint={fe.white} />
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

				<View style={styles.heroStage}>
				<StaggeredEntrance index={0} testID="home-entrance-hero">
					<LinearGradient
						testID="home-hero-card"
						colors={[fe.navySurface, fe.blueDeep, fe.blueBright]}
						locations={[0, 0.55, 1]}
						start={{ x: 0.1, y: 0 }}
						end={{ x: 0.95, y: 1 }}
						style={styles.heroCard}
					>
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
							<Text style={styles.heroLabel}>{tx.totalBalance}</Text>
							<View style={styles.amountRow}>
								<Text
									testID="home-total-balance"
									style={styles.heroAmount}
								>
									{displayAmount(formatCurrency(totalBalance))}
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
								<Text style={styles.heroMetricLabel}>{heroTitle}</Text>
								<Text testID="home-monthly-remaining" style={[styles.heroMetricValue, monthlyRemainingTone === "danger" && styles.heroAmountDanger]}>
									{displayAmount(formatSignedCurrency(monthlyRemaining))}
								</Text>
								<Text style={styles.heroMetricSub}>{activePeriodLabel}</Text>
							</View>
							<View style={styles.heroMetricCard}>
								<Text style={styles.heroMetricLabel}>{tx.monthlyExpense}</Text>
								<Text testID="home-monthly-expense" style={styles.heroMetricValue}>
									{displayAmount(formatCurrency(monthlyExpense))}
								</Text>
								<Text style={styles.heroMetricSub}>{tx.monthlyExpenseSub}</Text>
							</View>
						</View>
						{wallets.length > 0 ? (
							<View style={styles.walletStack}>
								<View style={styles.walletStackBack} />
								<View style={styles.walletStackMiddle} />
								<LinearGradient
									colors={["rgba(72,151,211,0.58)", "rgba(7,27,79,0.94)"]}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 1 }}
									style={styles.walletStackFront}
								>
									<Text style={styles.walletStackBrand}>KASWISE</Text>
									<Text style={styles.walletStackMeta}>
										{wallets.length} {isEn ? "active wallets" : "dompet aktif"}
									</Text>
								</LinearGradient>
							</View>
						) : null}
						</LinearGradient>
						</StaggeredEntrance>
				</View>

				<View style={styles.paperSheet}>
				<StaggeredEntrance index={1} testID="home-entrance-recent">
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
											backgroundColor: item.iconBackground,
											borderColor: item.iconBorder,
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
						<View style={styles.emptyInline}>
							<KaswiseIcon name="transactions" size={20} color={theme.colors.textMuted} />
							<View style={styles.emptyInlineCopy}>
								<Text style={styles.emptyInlineTitle}>{isEn ? "No transactions yet" : "Belum ada transaksi"}</Text>
								<Text style={styles.emptyInlineBody}>
									{isEn ? "Use the + button to record the first one." : "Gunakan tombol + untuk mencatat transaksi pertama."}
								</Text>
							</View>
						</View>
					)}
					</View>
				</StaggeredEntrance>

				{primaryEnvelopeAlert ? (
				<StaggeredEntrance index={2} testID="home-entrance-budget">
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
				) : null}

				{reviewSummary && reviewSummary.count > 0 ? (
					<StaggeredEntrance index={3} testID="home-entrance-review">
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
				</View>

			</ScrollView>
		</PageEntrance>
	);
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
	return StyleSheet.create({
		screen: { flex: 1, backgroundColor: fe.navySurface },
		scrollView: {
			flex: 1,
		},
		content: { padding: 0, paddingBottom: 110, gap: 0 },
		headerRow: {
			flexDirection: "row", justifyContent: "space-between", alignItems: "center",
			paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8, gap: 8,
		},
		headerCopy: {
			flexShrink: 1,
			minWidth: 0,
		},
		greeting: { color: fe.white, fontSize: 22, fontWeight: theme.typography.fontWeight.semibold, letterSpacing: -0.3 },
		dateText: { color: "rgba(255,255,255,0.58)", fontSize: 13, marginTop: 2 },
		headerActions: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			flexShrink: 1,
			minWidth: 0,
		},
		avatarWrap: {
			width: 40, height: 40, borderRadius: 20, backgroundColor: fe.glassStrong,
			borderWidth: 0, alignItems: "center", justifyContent: "center", overflow: "hidden",
		},
		avatarImage: {
			width: 34,
			height: 34,
			borderRadius: 17,
		},
		avatarText: { color: fe.white, fontSize: 12, fontWeight: theme.typography.fontWeight.bold },
		heroStage: { backgroundColor: fe.paper },
		heroCard: {
			backgroundColor: fe.blue, borderRadius: 0, paddingHorizontal: 20, paddingTop: 18,
			paddingBottom: 38, borderWidth: 0, overflow: "hidden",
			borderBottomLeftRadius: 42,
			borderBottomRightRadius: 42,
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
			backgroundColor: fe.glass,
			borderColor: fe.glassStrong,
			borderWidth: 1,
			alignItems: "center",
			justifyContent: "center",
		},
		manageText: {
			color: "rgba(255,255,255,0.76)",
			fontSize: 12,
			fontWeight: theme.typography.fontWeight.semibold,
		},
		balanceBlock: {
			position: "relative",
			marginBottom: 16,
		},
		heroLabel: {
			color: "rgba(255,255,255,0.54)", fontSize: 13, fontWeight: theme.typography.fontWeight.medium,
			marginBottom: 6,
		},
		amountRow: {
			flexDirection: "row",
			alignItems: "baseline",
			gap: 10,
			flexWrap: "wrap",
		},
		heroAmount: { color: fe.white, fontSize: 38, fontWeight: theme.typography.fontWeight.semibold, letterSpacing: -1.1 },
		heroAmountDanger: {
			color: fe.financialExpenseAlert,
		},
		heroPeriodRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			marginBottom: 12,
			flexWrap: "wrap",
		},
		heroPeriodChip: {
			borderWidth: 1, borderColor: fe.glassStrong, borderRadius: 999, backgroundColor: fe.glass,
			paddingHorizontal: 11, paddingVertical: 6,
		},
		heroPeriodText: { color: "rgba(255,255,255,0.72)", fontSize: 11, fontWeight: theme.typography.fontWeight.medium },
		heroPeriodReset: {
			minHeight: 30,
			borderRadius: 999,
			paddingHorizontal: 10,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.iconBubbles.primary.background,
			borderWidth: 1,
			borderColor: fe.glassStrong,
		},
		heroPeriodResetText: {
			color: fe.white,
			fontSize: 11,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		heroMetricRow: {
			flexDirection: "row", gap: 24, paddingTop: 14, borderTopWidth: 1, borderTopColor: fe.glass,
		},
		heroMetricCard: {
			flex: 1,
			borderWidth: 0,
			borderRadius: 0,
			backgroundColor: "transparent",
			paddingVertical: 8,
			paddingHorizontal: 0,
			gap: 3,
		},
		heroMetricLabel: { color: "rgba(255,255,255,0.54)", fontSize: 11, fontWeight: theme.typography.fontWeight.medium },
		heroMetricValue: { color: fe.white, fontSize: 15, fontWeight: theme.typography.fontWeight.semibold },
		heroMetricSub: { color: "rgba(255,255,255,0.42)", fontSize: 10, fontWeight: theme.typography.fontWeight.medium },
		walletStack: { height: 84, marginTop: 20, marginBottom: 4, position: "relative" },
		walletStackBack: { position: "absolute", left: 30, right: 30, top: 0, height: 50, borderRadius: 18, backgroundColor: "rgba(6,30,87,0.22)" },
		walletStackMiddle: { position: "absolute", left: 15, right: 15, top: 11, height: 52, borderRadius: 18, backgroundColor: "rgba(6,30,87,0.38)" },
		walletStackFront: { position: "absolute", left: 0, right: 0, top: 22, height: 56, borderRadius: 18, backgroundColor: fe.navySurface, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: fe.navy, shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
		walletStackBrand: { color: fe.white, fontSize: 12, fontWeight: theme.typography.fontWeight.bold, letterSpacing: 1.2 },
		walletStackMeta: { color: "rgba(255,255,255,0.68)", fontSize: 11 },
		paperSheet: { backgroundColor: fe.paper, borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingHorizontal: 20, paddingTop: 26, paddingBottom: 20, gap: 18, minHeight: 420 },
		sectionCard: { backgroundColor: "transparent", borderWidth: 0, borderRadius: 0, padding: 0, gap: 12 },
		sectionTopRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		sectionTitle: { color: fe.ink, fontSize: 20, fontWeight: theme.typography.fontWeight.semibold, letterSpacing: -0.35 },
		sectionAction: { color: fe.muted, fontSize: 12, fontWeight: theme.typography.fontWeight.semibold },
		emptyInline: {
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			paddingVertical: 16,
		},
		emptyInlineCopy: { flex: 1, gap: 2 },
		emptyInlineTitle: { color: fe.ink, fontSize: 14, fontWeight: theme.typography.fontWeight.semibold },
		emptyInlineBody: { color: fe.slate, fontSize: 12, lineHeight: 18 },
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
		budgetName: { color: fe.ink, fontSize: 13, fontWeight: theme.typography.fontWeight.semibold },
		budgetPercent: {
			color: theme.colors.warning,
			fontSize: 12,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		budgetMeta: { color: fe.slate, fontSize: 11 },
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
		budgetStatus: { color: fe.slate, fontSize: 11, marginTop: 2 },
		txRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: fe.line },
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
		txTitle: { color: fe.ink, fontSize: 14, fontWeight: theme.typography.fontWeight.semibold },
		txMeta: { color: fe.muted, fontSize: 11, marginTop: 2 },
		txAmount: { fontSize: 13, fontWeight: theme.typography.fontWeight.semibold },
		txAmountIncome: { color: fe.financialIncome },
		txAmountExpense: { color: fe.financialExpense },
		});
}
