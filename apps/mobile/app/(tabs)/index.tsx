import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { FinanceContextSwitcher } from "../../src/components/FinanceContextSwitcher";
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
import { listWallets, type Wallet } from "../../src/services/wallets";
import { useFinanceContext } from "../../src/state/finance-context";
import { useTheme } from "../../src/theme/theme-context";

const quickActions = [
	{
		id: "manual",
		label: "Manual",
		glyph: "✎",
		route: "/(tabs)/capture",
		tone: "primary",
	},
	{
		id: "import",
		label: "Import",
		glyph: "↓",
		route: "/(tabs)/imports",
		tone: "info",
	},
] as const;

const fallbackTransactions = [
	{
		id: "indomaret",
		title: "Indomaret",
		meta: "Hari ini · GoPay",
		amount: "-45rb",
		tone: "primary" as const,
	},
	{
		id: "fore",
		title: "Fore Coffee",
		meta: "Hari ini · GoPay",
		amount: "-38rb",
		tone: "warning" as const,
	},
	{
		id: "grab",
		title: "Grab Car",
		meta: "Kemarin · GoPay",
		amount: "-22rb",
		tone: "primary" as const,
	},
] as const;

function formatCurrency(value: number) {
	return `Rp ${Math.abs(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}

function formatCompactAmount(
	value: number,
	type: Transaction["transaction_type"],
) {
	const sign = type === "income" ? "+" : "-";
	return `${sign}${formatCurrency(value).replace("Rp ", "")}`;
}

export default function DashboardScreen() {
	const { supabase } = useSupabase();
	const { theme } = useTheme();
	const { language } = useI18n();
	const { activeContext } = useFinanceContext();
	const router = useRouter();
	const isEn = language === "en";
	const tx = useMemo(
		() =>
			isEn
				? {
						budget: "Budgets",
						view: "View →",
						over: "over budget",
						near: "almost used up",
						overUntil: (amount: number, day: string, month: string) =>
							`Over Rp${amount.toLocaleString("id-ID")} until ${day}/${month}`,
						remainingUntil: (amount: number, day: string, month: string) =>
							`Rp${amount.toLocaleString("id-ID")} left until ${day}/${month}`,
						attention: "Active budget wallet needs attention",
					}
				: {
						budget: "Anggaran",
						view: "Lihat →",
						over: "lewat budget",
						near: "hampir habis",
						overUntil: (amount: number, day: string, month: string) =>
							`Lewat Rp${amount.toLocaleString("id-ID")} sampai ${day}/${month}`,
						remainingUntil: (amount: number, day: string, month: string) =>
							`Rp${amount.toLocaleString("id-ID")} tersisa sampai ${day}/${month}`,
						attention: "Dompet aktif yang perlu perhatian",
					},
		[isEn],
	);
	const styles = useMemo(() => createStyles(theme), [theme]);
	const [envelopeAlerts, setEnvelopeAlerts] = useState<EnvelopeSummary[]>([]);
	const [wallets, setWallets] = useState<Wallet[]>([]);
	const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
		[],
	);

	useEffect(() => {
		let mounted = true;

		const loadEnvelopeAlerts = async () => {
			try {
				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (!user) {
					if (mounted) setEnvelopeAlerts([]);
					return;
				}

				const [envelopes, scopedWallets, scopedTransactions] =
					await Promise.all([
						listBudgetEnvelopes(supabase, user.id, activeContext),
						listWallets(activeContext),
						listTransactions(undefined, activeContext),
					]);
				if (mounted) {
					setWallets(
						scopedWallets.filter((wallet) => wallet.is_active !== false),
					);
					setRecentTransactions(scopedTransactions.slice(0, 3));
				}
				const activeEnvelopes = envelopes.filter(
					(envelope) => getEnvelopeStatus(envelope) === "active",
				);
				const allocations = await listEnvelopeAllocations(
					supabase,
					activeEnvelopes.map((envelope) => envelope.id),
				);
				const summaries = activeEnvelopes.map((envelope) => ({
					envelope,
					progress: buildEnvelopeProgress(envelope, allocations),
					reviewCount: allocations.filter(
						(allocation) =>
							allocation.envelope_id === envelope.id && allocation.needs_review,
					).length,
				}));

				if (mounted) setEnvelopeAlerts(getHomeEnvelopeAlerts(summaries));
			} catch (error) {
				console.error("Error loading home envelope alerts:", error);
				if (mounted) setEnvelopeAlerts([]);
			}
		};

		loadEnvelopeAlerts();

		return () => {
			mounted = false;
		};
	}, [supabase, activeContext]);

	const primaryEnvelopeAlert = envelopeAlerts[0];
	const totalBalance = wallets.reduce(
		(sum, wallet) => sum + Number(wallet.balance ?? 0),
		0,
	);
	const activeWalletName =
		wallets[0]?.name ??
		(activeContext.type === "household" ? "Dompet Keluarga" : "Main Wallet");
	const displayedTransactions = recentTransactions.length
		? recentTransactions.map((transaction) => ({
				id: transaction.id,
				title:
					transaction.merchant ??
					transaction.description ??
					transaction.category,
				meta: `${transaction.date ?? ""} · ${transaction.category}`,
				amount: formatCompactAmount(
					transaction.amount,
					transaction.transaction_type,
				),
				tone:
					transaction.transaction_type === "income"
						? ("info" as const)
						: ("primary" as const),
			}))
		: fallbackTransactions;

	return (
		<View style={styles.screen}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.headerRow}>
					<View style={styles.headerCopy}>
						<Text style={styles.greeting}>Halo, Danu</Text>
						<Text style={styles.dateText}>April 2026</Text>
					</View>
					<View style={styles.headerActions}>
						<FinanceContextSwitcher />
						<View testID="home-avatar" style={styles.avatarWrap}>
							<Text style={styles.avatarText}>DB</Text>
						</View>
					</View>
				</View>

				<View testID="home-hero-card" style={styles.heroCard}>
					<View style={styles.heroBloomOne} />
					<View style={styles.heroBloomTwo} />

					<View style={styles.heroControlRow}>
						<Pressable
							testID="home-wallet-pill"
							accessibilityRole="button"
							accessibilityLabel="Buka daftar dompet, dompet aktif Main Wallet"
							style={styles.walletPill}
							onPress={() => router.push("/(tabs)/wallets" as never)}
						>
							<Text style={styles.walletIcon}>▱</Text>
							<Text style={styles.walletName} numberOfLines={1}>
								{activeWalletName}
							</Text>
							<Text style={styles.walletCaret}>⌄</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Kelola dompet"
							onPress={() => router.push("/(tabs)/wallets" as never)}
						>
							<Text style={styles.manageText}>Manage</Text>
						</Pressable>
					</View>

					<View style={styles.balanceBlock}>
						<Text style={styles.heroLabel}>Total saldo</Text>
						<View style={styles.amountRow}>
							<Text testID="home-total-balance" style={styles.heroAmount}>
								{formatCurrency(totalBalance || 4_250_000)}
							</Text>
							<View style={styles.deltaPill}>
								<Text style={styles.deltaText}>↗ 15%</Text>
							</View>
						</View>
					</View>
				</View>

				<View style={styles.quickActionRow}>
					{quickActions.map((action) => (
						<Pressable
							key={action.id}
							testID={`home-quick-action-${action.id}`}
							accessibilityRole="button"
							accessibilityLabel={`Aksi cepat ${action.label}`}
							style={styles.quickActionCard}
							onPress={() => router.push(action.route as never)}
						>
							<View
								testID={`home-quick-bubble-${action.id}`}
								style={[styles.iconBubble, styles[`${action.tone}Bubble`]]}
							>
								<Text
									style={[
										styles.iconBubbleText,
										styles[`${action.tone}BubbleText`],
									]}
								>
									{action.glyph}
								</Text>
							</View>
							<Text style={styles.quickActionLabel}>{action.label}</Text>
						</Pressable>
					))}
				</View>

				<View testID="home-budget-section" style={styles.sectionCard}>
					<View style={styles.sectionTopRow}>
						<Text style={styles.sectionTitle}>{tx.budget}</Text>
						<Pressable
							testID="home-budget-action"
							accessibilityRole="button"
							accessibilityLabel="Lihat semua budget"
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
									<Text style={styles.budgetMeta}>
										{primaryEnvelopeAlert.progress.is_over_budget
											? tx.overUntil(
													primaryEnvelopeAlert.progress.over_budget_amount,
													primaryEnvelopeAlert.envelope.end_date.slice(8, 10),
													primaryEnvelopeAlert.envelope.end_date.slice(5, 7),
												)
											: tx.remainingUntil(
													Math.max(
														primaryEnvelopeAlert.progress.remaining_amount,
														0,
													),
													primaryEnvelopeAlert.envelope.end_date.slice(8, 10),
													primaryEnvelopeAlert.envelope.end_date.slice(5, 7),
												)}
									</Text>
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

				<View style={styles.sectionCard}>
					<View style={styles.sectionTopRow}>
						<Text style={styles.sectionTitle}>Terakhir</Text>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Lihat semua transaksi"
							onPress={() => router.push("/(tabs)/transactions" as never)}
						>
							<Text style={styles.sectionAction}>Semua →</Text>
						</Pressable>
					</View>
					{displayedTransactions.map((item, index) => (
						<View
							key={item.id}
							style={[
								styles.txRow,
								index === displayedTransactions.length - 1 && styles.txRowLast,
							]}
						>
							<View style={[styles.txBubble, styles[`${item.tone}Bubble`]]}>
								<Text
									style={[
										styles.txBubbleText,
										styles[`${item.tone}BubbleText`],
									]}
								>
									{item.title.slice(0, 1)}
								</Text>
							</View>
							<View style={styles.txInfo}>
								<Text style={styles.txTitle}>{item.title}</Text>
								<Text style={styles.txMeta}>{item.meta}</Text>
							</View>
							<Text style={styles.txAmount}>{item.amount}</Text>
						</View>
					))}
				</View>

				<View style={styles.insightCard}>
					<View style={[styles.txBubble, styles.infoBubble]}>
						<Text style={[styles.txBubbleText, styles.infoBubbleText]}>i</Text>
					</View>
					<View style={styles.insightTextBlock}>
						<Text style={styles.insightTitle}>Insight harian</Text>
						<Text style={styles.insightBody}>
							Pengeluaran kategori Belanja melebihi 10% bulan ini. Mungkin
							saatnya rem sebentar?
						</Text>
					</View>
				</View>
			</ScrollView>
		</View>
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
		avatarWrap: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: theme.colors.brandPrimary,
			alignItems: "center",
			justifyContent: "center",
		},
		avatarText: {
			color: "#FFFFFF",
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
		heroBloomOne: {
			position: "absolute",
			top: -60,
			right: -60,
			width: 180,
			height: 180,
			borderRadius: 90,
			backgroundColor: "rgba(163, 255, 18, 0.14)",
			opacity: 0.55,
		},
		heroBloomTwo: {
			position: "absolute",
			bottom: -80,
			left: -60,
			width: 180,
			height: 180,
			borderRadius: 90,
			backgroundColor: "rgba(74, 128, 240, 0.10)",
			opacity: 0.6,
		},
		heroControlRow: {
			position: "relative",
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 16,
		},
		walletPill: {
			flexShrink: 1,
			minWidth: 0,
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			backgroundColor: theme.colors.glass.background,
			borderWidth: 1,
			borderColor: theme.colors.glass.border,
			borderRadius: 999,
			paddingVertical: 7,
			paddingHorizontal: 12,
		},
		walletIcon: {
			color: theme.colors.textMuted,
			fontSize: 13,
			fontWeight: theme.typography.fontWeight.bold,
		},
		walletName: {
			flexShrink: 1,
			minWidth: 0,
			color: theme.colors.textPrimary,
			fontSize: 12,
			fontWeight: theme.typography.fontWeight.bold,
		},
		walletCaret: {
			color: theme.colors.textDim,
			fontSize: 10,
			fontWeight: theme.typography.fontWeight.bold,
		},
		manageText: {
			color: theme.colors.textMuted,
			fontSize: 12,
			fontWeight: theme.typography.fontWeight.semibold,
		},
		balanceBlock: {
			position: "relative",
			marginBottom: 14,
		},
		heroLabel: {
			color: theme.colors.textMuted,
			fontSize: 11,
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
		deltaPill: {
			backgroundColor: "rgba(163, 255, 18, 0.14)",
			borderRadius: 6,
			paddingVertical: 3,
			paddingHorizontal: 8,
		},
		deltaText: {
			color: theme.colors.brandPrimary,
			fontSize: 10,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		quickActionRow: {
			flexDirection: "row",
			gap: 8,
		},
		quickActionCard: {
			flex: 1,
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
		iconBubbleText: {
			fontSize: 12,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		primaryBubble: {
			backgroundColor: "rgba(163, 255, 18, 0.14)",
			borderColor: "rgba(163, 255, 18, 0.25)",
		},
		primaryBubbleText: {
			color: theme.colors.brandPrimary,
		},
		warningBubble: {
			backgroundColor: "rgba(255, 192, 109, 0.14)",
			borderColor: "rgba(255, 192, 109, 0.30)",
		},
		warningBubbleText: {
			color: theme.colors.warning,
		},
		infoBubble: {
			backgroundColor: "rgba(56, 189, 248, 0.14)",
			borderColor: "rgba(56, 189, 248, 0.30)",
		},
		infoBubbleText: {
			color: theme.colors.info,
		},
		quickActionLabel: {
			color: theme.colors.textSecondary,
			fontSize: 11,
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
			backgroundColor: "rgba(255,255,255,0.05)",
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
			color: theme.colors.danger,
			fontSize: 13,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		insightCard: {
			backgroundColor: theme.colors.mutedSurface,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			borderRadius: 16,
			padding: 14,
			flexDirection: "row",
			gap: 12,
			alignItems: "flex-start",
		},
		insightTextBlock: {
			flex: 1,
		},
		insightTitle: {
			color: theme.colors.textPrimary,
			fontSize: 13,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		insightBody: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			lineHeight: 18,
			marginTop: 4,
		},
	});
}
