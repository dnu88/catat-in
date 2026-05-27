import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { PageEntrance, StaggeredStack } from "../../src/components/motion";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useSupabase } from "../../src/lib/supabase";
import type { KaswiseIconName } from "../../src/components/icons/kaswise-icons";
import { KaswiseLogoMark } from "../../src/components/brand/KaswiseLogoMark";
import { IconBubble } from "../../src/components/ui";
import { useTheme } from "../../src/theme/theme-context";
import { useI18n } from "../../src/i18n/i18n-context";

const NOTIFICATION_KEYS = {
	dailyReminder: "@kaswise/notifications/dailyReminder",
	billReminder: "@kaswise/notifications/billReminder",
	budgetAlert: "@kaswise/notifications/budgetAlert",
} as const;

const EXPENSE_CATEGORY_CONFIG = {
	Makanan: {
		min: 20_000,
		max: 150_000,
		merchants: [
			"RM Sederhana",
			"Warteg Bu Tini",
			"KFC",
			"McDonald's",
			"GoFood",
			"GrabFood",
		],
	},
	Transportasi: {
		min: 10_000,
		max: 100_000,
		merchants: ["Grab", "Gojek", "Pertamina", "TransJakarta"],
	},
	Belanja: {
		min: 50_000,
		max: 500_000,
		merchants: ["Tokopedia", "Shopee", "Indomaret", "Alfamart", "ACE Hardware"],
	},
	Tagihan: {
		min: 100_000,
		max: 2_000_000,
		merchants: ["PLN", "PDAM", "IndiHome", "Telkomsel", "XL Axiata"],
	},
	Hiburan: {
		min: 30_000,
		max: 300_000,
		merchants: ["Cinema XXI", "Netflix", "Spotify", "Timezone", "Steam"],
	},
	Kesehatan: {
		min: 50_000,
		max: 500_000,
		merchants: ["Kimia Farma", "Halodoc", "Guardian", "RS Hermina"],
	},
	Pendidikan: {
		min: 100_000,
		max: 1_000_000,
		merchants: ["Gramedia", "Ruangguru", "Coursera", "Udemy"],
	},
} as const;

const INCOME_SOURCES = ["Gaji", "Freelance", "Bonus"] as const;
const BUDGET_LIMITS = {
	Makanan: 3_000_000,
	Transportasi: 1_500_000,
	Belanja: 2_000_000,
	Tagihan: 2_500_000,
	Hiburan: 1_000_000,
} as const;

type SeedResultState = {
	type: "success" | "error";
	message: string;
};

type WalletRow = {
	id: string;
	name: string;
	type: string;
};

type HouseholdRow = {
	id: string;
	name?: string | null;
};

type HouseholdMembershipRow = {
	household_id: string;
	households: HouseholdRow | HouseholdRow[] | null;
};

type TransactionInsert = {
	user_id: string;
	wallet_id: string;
	type: "income" | "expense";
	nominal: number;
	kategori: string;
	tanggal: string;
	catatan: string;
	merchant: string | null;
	input_type: "manual";
	status: "done";
	created_by: string;
	household_id: string | null;
};

type BudgetInsert = {
	user_id: string;
	category: string;
	limit_amount: number;
	period: "monthly";
	period_start: string;
	notify_at_percent: number;
	is_active: boolean;
	created_by: string;
	household_id: string | null;
};

function seededRandom(seed: number) {
	const raw = Math.sin(seed) * 10000;
	return raw - Math.floor(raw);
}

function randomInt(seed: number, min: number, max: number) {
	return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

function chooseOne<T>(items: readonly T[], seed: number) {
	return items[Math.floor(seededRandom(seed) * items.length)];
}

function clampDay(year: number, monthIndex: number, day: number) {
	return Math.min(day, new Date(year, monthIndex + 1, 0).getDate());
}

function formatDate(date: Date) {
	return date.toISOString().slice(0, 10);
}

function createSampleTransactions({
	userId,
	walletId,
	householdId,
	seedOffset,
}: {
	userId: string;
	walletId: string;
	householdId: string | null;
	seedOffset: number;
}): TransactionInsert[] {
	const now = new Date();
	const transactions: TransactionInsert[] = [];
	const expenseCategories = Object.keys(EXPENSE_CATEGORY_CONFIG) as Array<
		keyof typeof EXPENSE_CATEGORY_CONFIG
	>;

	for (let monthOffset = 0; monthOffset < 12; monthOffset += 1) {
		const baseDate = new Date(
			now.getFullYear(),
			now.getMonth() - monthOffset,
			1,
		);
		const year = baseDate.getFullYear();
		const monthIndex = baseDate.getMonth();
		const baseSeed = seedOffset + monthOffset * 97;

		const salaryDate = new Date(
			year,
			monthIndex,
			clampDay(year, monthIndex, randomInt(baseSeed + 1, 1, 3)),
		);
		transactions.push({
			user_id: userId,
			wallet_id: walletId,
			type: "income",
			nominal: randomInt(baseSeed + 2, 8_000_000, 15_000_000),
			kategori: "Gaji",
			tanggal: formatDate(salaryDate),
			catatan: "Penerimaan gaji bulanan",
			merchant: "Perusahaan",
			input_type: "manual",
			status: "done",
			created_by: userId,
			household_id: householdId,
		});

		const freelanceCount = seededRandom(baseSeed + 3) > 0.45 ? 1 : 0;
		for (let incomeIndex = 0; incomeIndex < freelanceCount; incomeIndex += 1) {
			const incomeDate = new Date(
				year,
				monthIndex,
				clampDay(
					year,
					monthIndex,
					randomInt(baseSeed + 10 + incomeIndex, 8, 24),
				),
			);
			transactions.push({
				user_id: userId,
				wallet_id: walletId,
				type: "income",
				nominal: randomInt(baseSeed + 11 + incomeIndex, 1_000_000, 5_000_000),
				kategori: "Freelance",
				tanggal: formatDate(incomeDate),
				catatan: "Pembayaran proyek freelance",
				merchant: "Klien Freelance",
				input_type: "manual",
				status: "done",
				created_by: userId,
				household_id: householdId,
			});
		}

		if (monthOffset % 3 === 0) {
			const bonusDate = new Date(
				year,
				monthIndex,
				clampDay(year, monthIndex, randomInt(baseSeed + 20, 20, 28)),
			);
			transactions.push({
				user_id: userId,
				wallet_id: walletId,
				type: "income",
				nominal: randomInt(baseSeed + 21, 2_000_000, 10_000_000),
				kategori: "Bonus",
				tanggal: formatDate(bonusDate),
				catatan: "Bonus kinerja kuartalan",
				merchant: "Perusahaan",
				input_type: "manual",
				status: "done",
				created_by: userId,
				household_id: householdId,
			});
		}

		for (let expenseIndex = 0; expenseIndex < 20; expenseIndex += 1) {
			const category = chooseOne(
				expenseCategories,
				baseSeed + 30 + expenseIndex,
			);
			const config = EXPENSE_CATEGORY_CONFIG[category];
			const merchant = chooseOne(
				config.merchants,
				baseSeed + 60 + expenseIndex,
			);
			const day = randomInt(baseSeed + 90 + expenseIndex, 1, 28);
			const transactionDate = new Date(
				year,
				monthIndex,
				clampDay(year, monthIndex, day),
			);
			transactions.push({
				user_id: userId,
				wallet_id: walletId,
				type: "expense",
				nominal: randomInt(
					baseSeed + 120 + expenseIndex,
					config.min,
					config.max,
				),
				kategori: category,
				tanggal: formatDate(transactionDate),
				catatan: `Pengeluaran ${category.toLowerCase()} rutin`,
				merchant,
				input_type: "manual",
				status: "done",
				created_by: userId,
				household_id: householdId,
			});
		}
	}

	return transactions.sort((left, right) =>
		left.tanggal.localeCompare(right.tanggal),
	);
}

function createBudgets({
	userId,
	householdId,
	periodStart,
}: {
	userId: string;
	householdId: string | null;
	periodStart: string;
}): BudgetInsert[] {
	return Object.entries(BUDGET_LIMITS).map(([category, limitAmount]) => ({
		user_id: userId,
		category,
		limit_amount: limitAmount,
		period: "monthly",
		period_start: periodStart,
		notify_at_percent: 80,
		is_active: true,
		created_by: userId,
		household_id: householdId,
	}));
}

export default function SettingsScreen() {
	const { supabase } = useSupabase();
	const { theme, preference, setPreference } = useTheme();
	const { language, setLanguage, t } = useI18n();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const [dailyReminder, setDailyReminder] = useState(true);
	const [billReminder, setBillReminder] = useState(true);
	const [budgetAlert, setBudgetAlert] = useState(true);
	const [profileLoading, setProfileLoading] = useState(true);
	const [profileName, setProfileName] = useState("");
	const [profileEmail, setProfileEmail] = useState("");
	const [seedLoading, setSeedLoading] = useState(false);
	const [seedResult, setSeedResult] = useState<SeedResultState | null>(null);
	const [refreshing, setRefreshing] = useState(false);

	useEffect(() => {
		let active = true;
		const loadProfile = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!active) return;
			const email = user?.email ?? "";
			const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
			const name =
				(typeof metadata.full_name === "string" && metadata.full_name) ||
				(typeof metadata.name === "string" && metadata.name) ||
				"";
			setProfileEmail(email);
			setProfileName(name);
			setProfileLoading(false);
		};
		loadProfile();
		return () => {
			active = false;
		};
	}, [supabase]);

	useEffect(() => {
		let active = true;
		const loadNotifications = async () => {
			const [daily, bill, budget] = await AsyncStorage.multiGet([
				NOTIFICATION_KEYS.dailyReminder,
				NOTIFICATION_KEYS.billReminder,
				NOTIFICATION_KEYS.budgetAlert,
			]);
			if (!active) return;
			if (daily[1] !== null) setDailyReminder(daily[1] === "true");
			if (bill[1] !== null) setBillReminder(bill[1] === "true");
			if (budget[1] !== null) setBudgetAlert(budget[1] === "true");
		};
		loadNotifications();
		return () => {
			active = false;
		};
	}, []);

	const placeholderName = language === "id" ? "Memuat..." : "Loading...";
	const fallbackName = profileEmail
		? profileEmail.split("@")[0]
		: language === "id"
			? "Pengguna"
			: "User";
	const displayName = profileLoading
		? placeholderName
		: profileName || fallbackName;
	const displayEmail = profileLoading ? "" : profileEmail;
	const avatarInitials = profileLoading
		? ""
		: (profileName || fallbackName)
				.trim()
				.split(/\s+/)
				.filter(Boolean)
				.slice(0, 2)
				.map((part) => part.charAt(0).toUpperCase())
				.join("") || "?";

	const toggleDailyReminder = () => {
		setDailyReminder((v) => {
			const next = !v;
			AsyncStorage.setItem(NOTIFICATION_KEYS.dailyReminder, String(next));
			return next;
		});
	};

	const toggleBillReminder = () => {
		setBillReminder((v) => {
			const next = !v;
			AsyncStorage.setItem(NOTIFICATION_KEYS.billReminder, String(next));
			return next;
		});
	};

	const toggleBudgetAlert = () => {
		setBudgetAlert((v) => {
			const next = !v;
			AsyncStorage.setItem(NOTIFICATION_KEYS.budgetAlert, String(next));
			return next;
		});
	};

	const onSeedSampleData = async () => {
		setSeedLoading(true);
		setSeedResult(null);

		try {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError) throw userError;
			if (!user)
				throw new Error(
					language === "id" ? "Pengguna tidak ditemukan." : "User not found.",
				);

			const { data: existingWallets, error: walletQueryError } = await supabase
				.from("wallets")
				.select("id, name, type")
				.eq("user_id", user.id)
				.eq("is_active", true);

			if (walletQueryError) throw walletQueryError;

			let personalWallet = (existingWallets as WalletRow[] | null)?.find(
				(wallet) => wallet.type === "bank",
			);

			if (!personalWallet) {
				const { data: createdWallet, error: walletInsertError } = await supabase
					.from("wallets")
					.insert({
						user_id: user.id,
						name: "Dompet Utama",
						type: "bank",
						balance: 0,
						currency: "IDR",
						is_active: true,
						created_by: user.id,
					})
					.select("id, name, type")
					.single();

				if (walletInsertError) throw walletInsertError;
				personalWallet = createdWallet as WalletRow;
			}

			if (!personalWallet) {
				throw new Error(
					language === "id"
						? "Gagal membuat dompet pribadi."
						: "Failed to create a personal wallet.",
				);
			}

			const { data: membershipRows, error: membershipError } = await supabase
				.from("household_members")
				.select("household_id, households(*)")
				.eq("user_id", user.id)
				.eq("status", "active");

			if (membershipError) throw membershipError;

			const contexts: Array<{
				householdId: string | null;
				seedOffset: number;
			}> = [{ householdId: null, seedOffset: 101 }];

			(membershipRows as HouseholdMembershipRow[] | null)?.forEach(
				(row, index) => {
					if (row.household_id) {
						contexts.push({
							householdId: row.household_id,
							seedOffset: 1001 + index * 211,
						});
					}
				},
			);

			const totalMemberships = contexts.length - 1;
			const householdContextCount = contexts.filter(
				(context) => context.householdId !== null,
			).length;
			const periodStart = formatDate(
				new Date(new Date().getFullYear(), new Date().getMonth(), 1),
			);

			let createdTransactions = 0;
			let createdBudgets = 0;

			for (const [contextIndex, context] of contexts.entries()) {
				const transactions = createSampleTransactions({
					userId: user.id,
					walletId: personalWallet.id,
					householdId: context.householdId,
					seedOffset:
						context.seedOffset +
						totalMemberships * 19 +
						householdContextCount * 23 +
						contextIndex,
				});

				if (transactions.length > 0) {
					const { error: transactionInsertError } = await supabase
						.from("transactions")
						.insert(transactions);
					if (transactionInsertError) throw transactionInsertError;
					createdTransactions += transactions.length;
				}

				const budgets = createBudgets({
					userId: user.id,
					householdId: context.householdId,
					periodStart,
				});

				if (budgets.length > 0) {
					const { error: budgetInsertError } = await supabase
						.from("budgets")
						.insert(budgets);
					if (budgetInsertError) throw budgetInsertError;
					createdBudgets += budgets.length;
				}
			}

			const successMessage =
				language === "id"
					? `Selesai! ${createdTransactions} transaksi dibuat, ${createdBudgets} anggaran ditambahkan.`
					: `Done! ${createdTransactions} transactions created, ${createdBudgets} budgets added.`;

			setSeedResult({ type: "success", message: successMessage });
			setTimeout(() => {
				setSeedResult((current) =>
					current?.message === successMessage ? null : current,
				);
			}, 4000);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: language === "id"
						? "Terjadi kesalahan."
						: "Something went wrong.";
			setSeedResult({
				type: "error",
				message:
					language === "id"
						? `Gagal mengisi data contoh: ${message}`
						: `Failed to seed sample data: ${message}`,
			});
		} finally {
			setSeedLoading(false);
		}
	};

	const onRefresh = async () => {
		setRefreshing(true);
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			const email = user?.email ?? "";
			const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
			setProfileEmail(email);
			setProfileName(
				(typeof metadata.full_name === "string" && metadata.full_name) ||
					(typeof metadata.name === "string" && metadata.name) ||
					"",
			);
		} finally {
			setRefreshing(false);
		}
	};

	const onLogout = async () => {
		await supabase.auth.signOut();
		router.replace("/(auth)/login");
	};

	const themeLabels = {
		system: language === "id" ? "Sistem" : "System",
		light: language === "id" ? "Terang" : "Light",
		dark: language === "id" ? "Gelap" : "Dark",
	};

	return (
		<PageEntrance testID="settings-page-entrance" style={styles.screen}>
			<ScrollView
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
				<StaggeredStack testIDPrefix="settings-entrance">
				{/* Header */}
				<View key="settings-header" testID="settings-header" style={styles.headerRow}>
					<View style={styles.headerCopy}>
						<Text style={styles.title}>{t("settingsTitle")}</Text>
						<Text style={styles.subtitle}>{t("settingsSubtitle")}</Text>
					</View>
					<KaswiseLogoMark testID="settings-kaswise-logo-mark" size={42} />
				</View>

				{/* Profile Card */}
				<View key="settings-profile" testID="settings-profile" style={styles.profileCard}>
					<View style={styles.profileAvatar}>
						<Text style={styles.profileAvatarText}>{avatarInitials}</Text>
					</View>
					<View style={styles.profileInfo}>
						<Text style={styles.profileName}>{displayName}</Text>
						{displayEmail ? (
							<Text style={styles.profileEmail}>{displayEmail}</Text>
						) : null}
					</View>
				</View>

				{/* Family Section */}
				<View key="settings-family" testID="settings-family" style={styles.sectionCard}>
					<Text style={styles.sectionTitle}>
						{language === "id" ? "Keluarga" : "Family"}
					</Text>
					<Text style={styles.sectionSub}>
						{language === "id"
							? "Kelola akses keluarga, undangan, dan mode keuangan bersama."
							: "Manage household access, invites, and shared finance mode."}
					</Text>
					<Pressable
						testID="settings-family-center"
						accessibilityRole="button"
						accessibilityLabel={
							language === "id" ? "Buka pusat keluarga" : "Open family center"
						}
						style={styles.navigationRow}
						onPress={() => router.push("/(tabs)/groups")}
					>
						<View style={styles.navigationCopy}>
							<IconBubble name="groups" tone="primary" size={32} />
							<View style={styles.navigationTextBlock}>
								<Text style={styles.navigationTitle}>
									{language === "id" ? "Pusat Keluarga" : "Family Center"}
								</Text>
								<Text style={styles.navigationHelper}>
									{language === "id"
										? "Buat keluarga atau gabung dengan kode undangan."
										: "Create a family or join with an invite code."}
								</Text>
							</View>
						</View>
						<Text style={styles.navigationChevron}>›</Text>
					</Pressable>
				</View>

				{/* Theme Section */}
				<View key="settings-appearance" testID="settings-appearance" style={styles.sectionCard}>
					<Text style={styles.sectionTitle}>
						{language === "id" ? "Tampilan" : "Appearance"}
					</Text>
					<Text style={styles.sectionSub}>
						{language === "id"
							? "Pilih tema yang nyaman di mata."
							: "Choose a comfortable theme."}
					</Text>

					<View style={styles.themeGrid}>
						{(["system", "light", "dark"] as const).map((mode) => (
							<Pressable
								key={mode}
								testID={`settings-theme-${mode}`}
								accessibilityRole="button"
								accessibilityLabel={`${language === "id" ? "Pilih tema" : "Choose theme"} ${themeLabels[mode]}`}
								accessibilityState={{ selected: preference === mode }}
								onPress={() => setPreference(mode)}
								style={[
									styles.themeChip,
									preference === mode && {
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
										styles.themeChipText,
										preference === mode && { color: theme.colors.textInverse },
									]}
								>
									{themeLabels[mode]}
								</Text>
							</Pressable>
						))}
					</View>
				</View>

				{/* Language Section */}
				<View key="settings-language" testID="settings-language" style={styles.sectionCard}>
					<Text style={styles.sectionTitle}>{t("languageSection")}</Text>
					<Text style={styles.sectionSub}>{t("languageSectionHelper")}</Text>

					<View style={styles.themeGrid}>
						{(["id", "en"] as const).map((lang) => (
							<Pressable
								key={lang}
								testID={`settings-language-${lang}`}
								accessibilityRole="button"
								accessibilityLabel={`${language === "id" ? "Pilih bahasa" : "Choose language"} ${lang === "id" ? t("indonesian") : t("english")}`}
								accessibilityState={{ selected: language === lang }}
								onPress={() => setLanguage(lang)}
								style={[
									styles.themeChip,
									language === lang && {
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
										styles.themeChipText,
										language === lang && { color: theme.colors.textInverse },
									]}
								>
									{lang === "id" ? t("indonesian") : t("english")}
								</Text>
							</Pressable>
						))}
					</View>
				</View>

				{/* Notifications Section */}
				<View key="settings-notifications" testID="settings-notifications" style={styles.sectionCard}>
					<Text style={styles.sectionTitle}>
						{language === "id" ? "Notifikasi" : "Notifications"}
					</Text>
					<Text style={styles.sectionSub}>
						{language === "id"
							? "Kelola pengingat penting."
							: "Manage important reminders."}
					</Text>

					<ToggleRow
						icon="chart"
						tone="info"
						title={language === "id" ? "Ringkasan Harian" : "Daily Summary"}
						helper={
							language === "id"
								? "Notifikasi kondisi keuangan setiap malam"
								: "Nightly financial condition notification"
						}
						value={dailyReminder}
						onToggle={toggleDailyReminder}
						theme={theme}
					/>
					<ToggleRow
						icon="bills"
						tone="warning"
						title={language === "id" ? "Pengingat Tagihan" : "Bill Reminder"}
						helper={
							language === "id"
								? "Notifikasi sebelum jatuh tempo"
								: "Notification before due date"
						}
						value={billReminder}
						onToggle={toggleBillReminder}
						theme={theme}
					/>
					<ToggleRow
						icon="budgets"
						tone="primary"
						title={language === "id" ? "Alert Anggaran" : "Budget Alert"}
						helper={
							language === "id"
								? "Notifikasi saat budget hampir habis"
								: "Notification when budget is nearly depleted"
						}
						value={budgetAlert}
						onToggle={toggleBudgetAlert}
						theme={theme}
					/>
				</View>

				{/* App Info */}
				<View key="settings-app-info" testID="settings-app-info" style={styles.appInfo}>
					<Text style={styles.appName}>kaswise v1.0.0</Text>
					<Text style={styles.appTagline}>
						{language === "id"
							? "Catat Keuangan, Bijak Setiap Hari"
							: "Track Finances, Wise Every Day"}
					</Text>
				</View>


				{/* Logout */}
				<Pressable
					key="settings-logout"
					testID="settings-logout"
					accessibilityRole="button"
					accessibilityLabel={
						language === "id" ? "Keluar dari akun" : "Sign out"
					}
					style={styles.logoutBtn}
					onPress={onLogout}
				>
					<Text style={styles.logoutText}>
						{language === "id" ? "Keluar dari Akun" : "Sign Out"}
					</Text>
				</Pressable>
				</StaggeredStack>


				<View style={{ height: 100 }} />
			</ScrollView>
		</PageEntrance>
	);
}

function ToggleRow({
	icon,
	tone,
	title,
	helper,
	value,
	onToggle,
	theme,
}: {
	icon: KaswiseIconName;
	tone: "primary" | "success" | "warning" | "danger" | "accent" | "info";
	title: string;
	helper: string;
	value: boolean;
	onToggle: () => void;
	theme: ReturnType<typeof useTheme>["theme"];
}) {
	return (
		<Pressable
			onPress={onToggle}
			accessibilityRole="switch"
			accessibilityState={{ checked: value }}
			accessibilityLabel={title}
			style={{
				flexDirection: "row",
				justifyContent: "space-between",
				alignItems: "center",
				paddingVertical: 10,
				borderTopWidth: 1,
				borderTopColor: theme.colors.borderSoft,
				gap: 12,
			}}
		>
			<View
				style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}
			>
				<IconBubble name={icon} tone={tone} size={32} />
				<View style={{ flex: 1 }}>
					<Text
						style={{
							color: theme.colors.textPrimary,
							fontSize: 13,
							fontWeight: "700",
						}}
					>
						{title}
					</Text>
					<Text
						style={{
							color: theme.colors.textMuted,
							fontSize: 11,
							marginTop: 1,
						}}
					>
						{helper}
					</Text>
				</View>
			</View>
			<View
				style={{
					width: 44,
					height: 24,
					borderRadius: 999,
					backgroundColor: value
						? theme.mode === "light"
							? theme.colors.brandPrimaryDeep
							: theme.colors.brandPrimary
						: theme.colors.borderStrong,
					padding: 2,
					justifyContent: "center",
				}}
			>
				<View
					style={{
						width: 20,
						height: 20,
						borderRadius: 10,
						backgroundColor: theme.colors.textInverse,
						alignSelf: value ? "flex-end" : "flex-start",
					}}
				/>
			</View>
		</Pressable>
	);
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
	return StyleSheet.create({
		screen: { flex: 1, backgroundColor: theme.colors.background },
		content: { padding: 20, gap: 10, paddingBottom: 26 },
		headerRow: {
			marginBottom: 4,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 14,
		},
		headerCopy: { flex: 1 },
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
		profileCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: theme.radius.lg,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 14,
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		profileAvatar: {
			width: 50,
			height: 50,
			borderRadius: 25,
			backgroundColor: theme.colors.mutedSurface,
			alignItems: "center",
			justifyContent: "center",
		},
		profileAvatarText: {
			color: theme.colors.textPrimary,
			fontSize: 16,
			fontWeight: "800",
		},
		profileInfo: { flex: 1 },
		profileName: {
			color: theme.colors.textPrimary,
			fontSize: theme.typography.fontSize.lg,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		profileEmail: {
			color: theme.colors.textMuted,
			fontSize: theme.typography.fontSize.sm,
			marginTop: 2,
		},
		sectionCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 18,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 14,
			gap: 10,
		},
		sectionTitle: {
			color: theme.colors.textPrimary,
			fontSize: 15,
			fontWeight: "800",
		},
		sectionSub: { color: theme.colors.textSecondary, fontSize: 12 },
		themeGrid: { flexDirection: "row", gap: 8 },
		themeChip: {
			flex: 1,
			paddingVertical: 10,
			minHeight: 44,
			justifyContent: "center",
			borderRadius: 12,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.mutedSurface,
			alignItems: "center",
		},
		themeChipText: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "700",
		},
		navigationRow: {
			minHeight: 56,
			borderTopWidth: 1,
			borderTopColor: theme.colors.borderSoft,
			paddingTop: 10,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 12,
		},
		navigationCopy: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
		},
		navigationTextBlock: { flex: 1 },
		navigationTitle: {
			color: theme.colors.textPrimary,
			fontSize: 13,
			fontWeight: "800",
		},
		navigationHelper: {
			color: theme.colors.textMuted,
			fontSize: 11,
			marginTop: 1,
		},
		navigationChevron: {
			color: theme.colors.textMuted,
			fontSize: 24,
			fontWeight: "700",
		},
		appInfo: { alignItems: "center", paddingVertical: 10, gap: 4 },
		appName: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "700" },
		appTagline: { color: theme.colors.textMuted, fontSize: 11 },
		seedButton: {
			backgroundColor:
				theme.mode === "light"
					? theme.colors.brandPrimaryDeep
					: theme.colors.brandPrimary,
			borderRadius: 14,
			minHeight: 46,
			alignItems: "center",
			justifyContent: "center",
			paddingVertical: 12,
			paddingHorizontal: 14,
		},
		seedButtonDisabled: { opacity: 0.65 },
		seedButtonText: {
			color: theme.colors.textInverse,
			fontSize: 14,
			fontWeight: "800",
		},
		seedResult: {
			color: theme.colors.success,
			fontSize: 12,
			fontWeight: "700",
		},
		seedResultError: { color: theme.colors.danger },
		logoutBtn: {
			backgroundColor: `${theme.colors.danger}12`,
			borderWidth: 1,
			borderColor: `${theme.colors.danger}40`,
			borderRadius: 14,
			paddingVertical: 14,
			alignItems: "center",
		},
		logoutText: { color: theme.colors.danger, fontSize: 14, fontWeight: "700" },
	});
}
