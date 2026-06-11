import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { PageEntrance, StaggeredStack } from "../../src/components/motion";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { useSupabase } from "../../src/lib/supabase";
import type { KaswiseIconName } from "../../src/components/icons/kaswise-icons";
import { KaswiseIcon } from "../../src/components/icons/kaswise-icons";
import { KaswiseLogoMark } from "../../src/components/brand/KaswiseLogoMark";
import { IconBubble } from "../../src/components/ui";
import { useTheme } from "../../src/theme/theme-context";
import { useI18n } from "../../src/i18n/i18n-context";
import { useEntitlements } from "../../src/hooks/useEntitlements";
import { planStatusLabel } from "../../src/utils/plan-labels";
import { getNotificationPreferences, updateNotificationPreferences, type NotificationPreferences } from "../../src/services/notifications";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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


type AvatarGroup = "all" | "men" | "women" | "other";
type ProfileVisualMode = "photo" | "avatar" | "none";

type ProfileAvatarPreset = {
	id: string;
	group: Exclude<AvatarGroup, "all">;
	label: string;
	background: "primary" | "navy" | "success" | "warning" | "danger" | "info";
	hair: "short" | "wave" | "hijab" | "bun" | "cap";
	accessory?: "glasses" | "tie" | "earring";
};

const PROFILE_AVATARS: ProfileAvatarPreset[] = [
	{ id: "rafi-casual", group: "men", label: "Rafi casual", background: "primary", hair: "short" },
	{ id: "arya-glasses", group: "men", label: "Arya berkacamata", background: "navy", hair: "wave", accessory: "glasses" },
	{ id: "dimas-pro", group: "men", label: "Dimas profesional", background: "info", hair: "short", accessory: "tie" },
	{ id: "dania-casual", group: "women", label: "Dania casual", background: "success", hair: "wave", accessory: "earring" },
	{ id: "sari-hijab", group: "women", label: "Sari berhijab", background: "warning", hair: "hijab" },
	{ id: "maya-pro", group: "women", label: "Maya profesional", background: "danger", hair: "bun", accessory: "glasses" },
	{ id: "nara-clean", group: "other", label: "Nara clean", background: "primary", hair: "cap" },
	{ id: "bima-playful", group: "other", label: "Bima playful", background: "info", hair: "wave" },
	{ id: "raya-modern", group: "other", label: "Raya modern", background: "navy", hair: "short", accessory: "glasses" },
];

const AVATAR_FILTERS: Array<{ key: AvatarGroup; labelId: string; labelEn: string }> = [
	{ key: "all", labelId: "Semua", labelEn: "All" },
	{ key: "men", labelId: "Pria", labelEn: "Men" },
	{ key: "women", labelId: "Wanita", labelEn: "Women" },
	{ key: "other", labelId: "Lainnya", labelEn: "Other" },
];

const PROFILE_MESSAGE_AUTO_HIDE_MS = 3000;

function colorWithAlpha(color: string, alpha: string) {
	return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;
}

function readProfileVisualMetadata(metadata: Record<string, unknown>) {
	const avatarUrl = typeof metadata.avatar_url === "string" ? metadata.avatar_url : "";
	const providerPicture = typeof metadata.picture === "string" ? metadata.picture : "";
	const avatarKey = typeof metadata.avatar_key === "string" ? metadata.avatar_key : "";
	const avatarPath = typeof metadata.avatar_path === "string" ? metadata.avatar_path : "";
	const visualMode =
		metadata.profile_visual_mode === "photo" ||
		metadata.profile_visual_mode === "avatar" ||
		metadata.profile_visual_mode === "none"
			? metadata.profile_visual_mode
			: "";

	if (visualMode === "avatar" || (!visualMode && avatarKey)) {
		return { photoUrl: "", avatarKey, avatarPath };
	}

	if (visualMode === "none") {
		return { photoUrl: "", avatarKey: "", avatarPath: "" };
	}

	return {
		photoUrl: avatarUrl || (!visualMode ? providerPicture : ""),
		avatarKey,
		avatarPath,
	};
}

function getFileExtension(uri: string, mimeType?: string | null) {
	if (mimeType?.includes("png")) return "png";
	if (mimeType?.includes("webp")) return "webp";
	const match = uri.match(/\.([a-z0-9]+)(?:\?|#|$)/i);
	return match?.[1]?.toLowerCase() || "jpg";
}

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
	const { theme } = useTheme();
	const { language, setLanguage, t } = useI18n();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const { data: entitlements, loading: entitlementsLoading } = useEntitlements();
	const [dailyReminder, setDailyReminder] = useState(true);
	const [billReminder, setBillReminder] = useState(true);
	const [budgetAlert, setBudgetAlert] = useState(true);
	const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);
	const [notifPrefsLoading, setNotifPrefsLoading] = useState(false);
	const [profileLoading, setProfileLoading] = useState(true);
	const [profileName, setProfileName] = useState("");
	const [profileEmail, setProfileEmail] = useState("");
	const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
	const [profileAvatarKey, setProfileAvatarKey] = useState("");
	const [profileAvatarPath, setProfileAvatarPath] = useState("");
	const [profileSheetVisible, setProfileSheetVisible] = useState(false);
	const [avatarFilter, setAvatarFilter] = useState<AvatarGroup>("all");
	const [draftPhotoUri, setDraftPhotoUri] = useState<string | null>(null);
	const [draftAvatarKey, setDraftAvatarKey] = useState<string | null>(null);
	const [draftVisualMode, setDraftVisualMode] = useState<ProfileVisualMode>("none");
	const [profileSaving, setProfileSaving] = useState(false);
	const [profileMessage, setProfileMessage] = useState<SeedResultState | null>(null);
	const [passwordExpanded, setPasswordExpanded] = useState(false);
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [passwordSaving, setPasswordSaving] = useState(false);
	const [passwordMessage, setPasswordMessage] = useState<SeedResultState | null>(null);
	const [seedLoading, setSeedLoading] = useState(false);
	const [seedResult, setSeedResult] = useState<SeedResultState | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const [logoutLoading, setLogoutLoading] = useState(false);
	const logoutScale = useRef(new Animated.Value(1)).current;
	const profileMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearProfileMessageTimer = () => {
		if (profileMessageTimerRef.current) {
			clearTimeout(profileMessageTimerRef.current);
			profileMessageTimerRef.current = null;
		}
	};

	const showTemporaryProfileSuccess = (message: string) => {
		clearProfileMessageTimer();
		setProfileMessage({ type: "success", message });
		profileMessageTimerRef.current = setTimeout(() => {
			setProfileMessage((current) =>
				current?.type === "success" && current.message === message ? null : current,
			);
			profileMessageTimerRef.current = null;
		}, PROFILE_MESSAGE_AUTO_HIDE_MS);
	};

	useEffect(() => () => {
		clearProfileMessageTimer();
	}, []);

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
			const visual = readProfileVisualMetadata(metadata);
			setProfileEmail(email);
			setProfileName(name);
			setProfilePhotoUrl(visual.photoUrl);
			setProfileAvatarKey(visual.avatarKey);
			setProfileAvatarPath(visual.avatarPath);
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
			// Load from backend first.
			try {
				setNotifPrefsLoading(true);
				const prefs = await getNotificationPreferences(supabase);
				if (active) {
					setNotifPrefs(prefs);
					setDailyReminder(prefs.daily_reminder_enabled);
					setBillReminder(prefs.bill_reminder_enabled);
					setBudgetAlert(prefs.budget_alert_enabled);
				}
			} catch {
				// Fallback: load from legacy AsyncStorage (migration path).
				const [daily, bill, budget] = await AsyncStorage.multiGet([
					NOTIFICATION_KEYS.dailyReminder,
					NOTIFICATION_KEYS.billReminder,
					NOTIFICATION_KEYS.budgetAlert,
				]);
				if (!active) return;
				if (daily[1] !== null) setDailyReminder(daily[1] === "true");
				if (bill[1] !== null) setBillReminder(bill[1] === "true");
				if (budget[1] !== null) setBudgetAlert(budget[1] === "true");
			} finally {
				if (active) setNotifPrefsLoading(false);
			}
		};
		loadNotifications();
		return () => {
			active = false;
		};
	}, [supabase]);

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
	const selectedAvatar = PROFILE_AVATARS.find(
		(avatar) => avatar.id === profileAvatarKey,
	);
	const draftSelectedAvatar = PROFILE_AVATARS.find(
		(avatar) => avatar.id === draftAvatarKey,
	);
	const filteredAvatars = PROFILE_AVATARS.filter(
		(avatar) => avatarFilter === "all" || avatar.group === avatarFilter,
	);

	const toggleDailyReminder = () => {
		setDailyReminder((v) => {
			const next = !v;
			updateNotificationPreferences(supabase, { daily_reminder_enabled: next }).catch(() => {});
			return next;
		});
	};

	const toggleBillReminder = () => {
		setBillReminder((v) => {
			const next = !v;
			updateNotificationPreferences(supabase, { bill_reminder_enabled: next }).catch(() => {});
			return next;
		});
	};

	const toggleBudgetAlert = () => {
		setBudgetAlert((v) => {
			const next = !v;
			updateNotificationPreferences(supabase, { budget_alert_enabled: next }).catch(() => {});
			return next;
		});
	};

	const toggleNotifEnabled = () => {
		if (!notifPrefs) return;
		const next = !notifPrefs.enabled;
		setNotifPrefs({ ...notifPrefs, enabled: next });
		updateNotificationPreferences(supabase, { enabled: next }).catch(() => {});
	};

	const openProfileSheet = () => {
		setDraftPhotoUri(profilePhotoUrl || null);
		setDraftAvatarKey(profileAvatarKey || null);
		setDraftVisualMode(profilePhotoUrl ? "photo" : profileAvatarKey ? "avatar" : "none");
		clearProfileMessageTimer();
		setProfileMessage(null);
		setProfileSheetVisible(true);
	};

	const pickProfilePhoto = async (source: "camera" | "library") => {
		clearProfileMessageTimer();
		setProfileMessage(null);
		const permission =
			source === "camera"
				? await ImagePicker.requestCameraPermissionsAsync()
				: await ImagePicker.requestMediaLibraryPermissionsAsync();

		if (!permission.granted) {
			setProfileMessage({
				type: "error",
				message:
					language === "id"
						? "Izin akses foto belum diberikan."
						: "Photo permission was not granted.",
			});
			return;
		}

		const result =
			source === "camera"
				? await ImagePicker.launchCameraAsync({
					allowsEditing: true,
					aspect: [1, 1],
					quality: 0.72,
				})
				: await ImagePicker.launchImageLibraryAsync({
					mediaTypes: ImagePicker.MediaTypeOptions.Images,
					allowsEditing: true,
					aspect: [1, 1],
					quality: 0.72,
				});

		if (result.canceled || !result.assets[0]?.uri) return;
		setDraftPhotoUri(result.assets[0].uri);
		setDraftAvatarKey(null);
		setDraftVisualMode("photo");
	};

	const saveProfileVisual = async () => {
		if (profileSaving) return;
		setProfileSaving(true);
		clearProfileMessageTimer();
		setProfileMessage(null);

		try {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError) throw userError;
			if (!user) throw new Error(language === "id" ? "Pengguna tidak ditemukan." : "User not found.");

			const currentMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
			let nextPhotoUrl = "";
			let nextAvatarKey = "";
			let nextAvatarPath = "";
			let nextVisualMode: ProfileVisualMode = "none";

			if (draftVisualMode === "photo" && draftPhotoUri) {
				nextVisualMode = "photo";
				if (/^https?:\/\//i.test(draftPhotoUri)) {
					nextPhotoUrl = draftPhotoUri;
					nextAvatarPath = profileAvatarPath;
				} else {
					const response = await fetch(draftPhotoUri);
					const blob = await response.blob();
					const mimeType = blob.type || "image/jpeg";
					const extension = getFileExtension(draftPhotoUri, mimeType);
					const path = `${user.id}/avatar-${Date.now()}.${extension}`;
					const { error: uploadError } = await supabase.storage
						.from("avatars")
						.upload(path, blob, { contentType: mimeType, upsert: true });
					if (uploadError) throw uploadError;
					const { data } = supabase.storage.from("avatars").getPublicUrl(path);
					nextPhotoUrl = data.publicUrl;
					nextAvatarPath = path;
				}
			} else if (draftVisualMode === "avatar" && draftAvatarKey) {
				nextAvatarKey = draftAvatarKey;
				nextVisualMode = "avatar";
			} else {
				nextPhotoUrl = "";
				nextAvatarKey = "";
			}

			const { error: updateError } = await supabase.auth.updateUser({
				data: {
					...currentMetadata,
					avatar_url: nextPhotoUrl || null,
					avatar_path: nextAvatarPath || null,
					avatar_key: nextAvatarKey || null,
					profile_visual_mode: nextVisualMode,
					profile_visual_updated_at: new Date().toISOString(),
				},
			});
			if (updateError) throw updateError;

			if (profileAvatarPath && profileAvatarPath !== nextAvatarPath) {
				void supabase.storage.from("avatars").remove([profileAvatarPath]);
			}

			setProfilePhotoUrl(nextPhotoUrl);
			setProfileAvatarKey(nextAvatarKey);
			setProfileAvatarPath(nextAvatarPath);
			setProfileSheetVisible(false);
			showTemporaryProfileSuccess(
				language === "id" ? "Foto profil tersimpan." : "Profile photo saved.",
			);
		} catch (error) {
			setProfileMessage({
				type: "error",
				message:
					language === "id"
						? "Gagal menyimpan foto profil. Coba lagi."
						: "Failed to save profile photo. Try again.",
			});
		} finally {
			setProfileSaving(false);
		}
	};

	const onChangePassword = async () => {
		setPasswordMessage(null);
		if (newPassword.length < 8) {
			setPasswordMessage({
				type: "error",
				message: language === "id" ? "Password minimal 8 karakter." : "Password must be at least 8 characters.",
			});
			return;
		}
		if (newPassword !== confirmPassword) {
			setPasswordMessage({
				type: "error",
				message: language === "id" ? "Konfirmasi password belum sama." : "Password confirmation does not match.",
			});
			return;
		}

		setPasswordSaving(true);
		try {
			const { error } = await supabase.auth.updateUser({ password: newPassword });
			if (error) throw error;
			setNewPassword("");
			setConfirmPassword("");
			setPasswordExpanded(false);
			setPasswordMessage({
				type: "success",
				message: language === "id" ? "Password berhasil diganti." : "Password updated.",
			});
		} catch (error) {
			setPasswordMessage({
				type: "error",
				message:
					language === "id"
						? "Gagal mengganti password. Login ulang jika diminta."
						: "Failed to update password. Sign in again if prompted.",
			});
		} finally {
			setPasswordSaving(false);
		}
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
			const visual = readProfileVisualMetadata(metadata);
			setProfileEmail(email);
			setProfileName(
				(typeof metadata.full_name === "string" && metadata.full_name) ||
					(typeof metadata.name === "string" && metadata.name) ||
					"",
			);
			setProfilePhotoUrl(visual.photoUrl);
			setProfileAvatarKey(visual.avatarKey);
			setProfileAvatarPath(visual.avatarPath);
		} finally {
			setRefreshing(false);
		}
	};

	const animateLogoutButton = (toValue: number) => {
		Animated.spring(logoutScale, {
			toValue,
			useNativeDriver: true,
			speed: 24,
			bounciness: 6,
		}).start();
	};

	const onLogout = async () => {
		if (logoutLoading) return;

		setLogoutLoading(true);
		animateLogoutButton(0.96);

		// Navigasi dulu, signOut di background — jangan block UI
		router.replace("/(auth)/login");

		try {
			await Promise.race([
				supabase.auth.signOut(),
				new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
			]);
		} catch {
			// signOut gagal atau timeout — session akan expire sendiri
		} finally {
			setLogoutLoading(false);
			animateLogoutButton(1);
		}
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
						{profilePhotoUrl ? (
							<Image source={{ uri: profilePhotoUrl }} style={styles.profileAvatarImage} />
						) : selectedAvatar ? (
							<ProfileAvatarIllustration preset={selectedAvatar} theme={theme} size={68} />
						) : (
							<Text style={styles.profileAvatarText}>{avatarInitials}</Text>
						)}
					</View>
					<View style={styles.profileInfo}>
						<Text style={styles.profileName}>{displayName}</Text>
						{displayEmail ? (
							<Text style={styles.profileEmail}>{displayEmail}</Text>
						) : null}
						<Pressable
							testID="settings-change-profile-photo"
							accessibilityRole="button"
							accessibilityLabel={language === "id" ? "Ubah foto profil" : "Change profile photo"}
							onPress={openProfileSheet}
							style={styles.profilePhotoButton}
						>
							<Text style={styles.profilePhotoButtonText}>
								{language === "id" ? "Ubah Foto Profil" : "Change Profile Photo"}
							</Text>
						</Pressable>
						{profileMessage ? (
							<Text style={[styles.inlineMessage, profileMessage.type === "error" && styles.inlineMessageError]}>
								{profileMessage.message}
							</Text>
						) : null}
					</View>
				</View>

				{/* Account Security */}
				<View key="settings-account-security" testID="settings-account-security" style={styles.sectionCard}>
					<Text style={styles.sectionTitle}>
						{language === "id" ? "Akun & Keamanan" : "Account & Security"}
					</Text>
					<Text style={styles.sectionSub}>
						{language === "id"
							? "Kelola akses akun dan password login."
							: "Manage account access and login password."}
					</Text>
					<Pressable
						testID="settings-password-toggle"
						accessibilityRole="button"
						accessibilityLabel={language === "id" ? "Ubah password" : "Change password"}
						style={styles.navigationRow}
						onPress={() => setPasswordExpanded((value) => !value)}
					>
						<View style={styles.navigationCopy}>
							<IconBubble name="lock" tone="primary" size={32} />
							<View style={styles.navigationTextBlock}>
								<Text style={styles.navigationTitle}>{language === "id" ? "Ubah Password" : "Change Password"}</Text>
								<Text style={styles.navigationHelper}>
									{language === "id" ? "Gunakan minimal 8 karakter." : "Use at least 8 characters."}
								</Text>
							</View>
						</View>
						<Text style={styles.navigationChevron}>{passwordExpanded ? "⌃" : "›"}</Text>
					</Pressable>
					{passwordExpanded ? (
						<View style={styles.passwordForm}>
							<TextInput
								testID="settings-new-password"
								value={newPassword}
								onChangeText={setNewPassword}
								placeholder={language === "id" ? "Password baru" : "New password"}
								placeholderTextColor={theme.colors.textDim}
								secureTextEntry
								style={styles.textInput}
							/>
							<TextInput
								testID="settings-confirm-password"
								value={confirmPassword}
								onChangeText={setConfirmPassword}
								placeholder={language === "id" ? "Konfirmasi password" : "Confirm password"}
								placeholderTextColor={theme.colors.textDim}
								secureTextEntry
								style={styles.textInput}
							/>
							{passwordMessage ? (
								<Text style={[styles.inlineMessage, passwordMessage.type === "error" && styles.inlineMessageError]}>
									{passwordMessage.message}
								</Text>
							) : null}
							<Pressable
								testID="settings-save-password"
								accessibilityRole="button"
								accessibilityState={{ busy: passwordSaving, disabled: passwordSaving }}
								disabled={passwordSaving}
								style={[styles.primaryButton, passwordSaving && styles.buttonDisabled]}
								onPress={onChangePassword}
							>
								{passwordSaving ? (
									<ActivityIndicator color={theme.colors.buttonPrimaryText} />
								) : (
									<Text style={styles.primaryButtonText}>{language === "id" ? "Simpan Password" : "Save Password"}</Text>
								)}
							</Pressable>
						</View>
					) : passwordMessage ? (
						<Text style={[styles.inlineMessage, passwordMessage.type === "error" && styles.inlineMessageError]}>
							{passwordMessage.message}
						</Text>
					) : null}
				</View>

				{/* Plan / Paket Section */}
				<View key="settings-plan" testID="settings-plan" style={styles.sectionCard}>
					<Text style={styles.sectionTitle}>
						{language === "id" ? "Paket" : "Plan"}
					</Text>
					<Text style={styles.sectionSub}>
						{language === "id"
							? "Status langganan dan upgrade ke Premium."
							: "Subscription status and premium upgrade."}
					</Text>
					{entitlementsLoading ? (
						<ActivityIndicator style={{ marginTop: 6 }} />
					) : (
						<>
							<View style={styles.navigationRow}>
								<View style={styles.navigationCopy}>
									<IconBubble name="card" tone="primary" size={32} />
									<View style={styles.navigationTextBlock}>
										<Text style={styles.navigationTitle}>
											{planStatusLabel(entitlements)}
										</Text>
										{entitlements?.plan === "premium" && entitlements.plan_expires_at ? (
											<Text style={styles.navigationHelper}>
												{language === "id" ? "Berlaku sampai " : "Valid until "}
												{new Date(entitlements.plan_expires_at).toLocaleDateString(
													language === "id" ? "id-ID" : "en-US",
													{ year: "numeric", month: "long", day: "numeric" }
												)}
											</Text>
										) : (
											<Text style={styles.navigationHelper}>
												{language === "id" ? "Akses dasar dengan batasan." : "Basic access with limits."}
											</Text>
										)}
									</View>
								</View>
							</View>
							{entitlements?.plan !== "premium" ? (
								<Pressable
									testID="settings-upgrade-button"
									accessibilityRole="button"
									style={styles.primaryButton}
									onPress={() => router.push("/upgrade")}
								>
									<Text style={styles.primaryButtonText}>
										{language === "id" ? "Upgrade ke Premium" : "Upgrade to Premium"}
									</Text>
								</Pressable>
							) : (
								<Pressable
									testID="settings-extend-button"
									accessibilityRole="button"
									style={styles.primaryButton}
									onPress={() => router.push("/upgrade")}
								>
									<Text style={styles.primaryButtonText}>
										{language === "id" ? "Perpanjang" : "Extend"}
									</Text>
								</Pressable>
							)}
						</>
					)}
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

					{notifPrefs != null ? (
						<ToggleRow
							icon="notification"
							tone="primary"
							title={language === "id" ? "Notifikasi Aktif" : "Notifications On"}
							helper={
								language === "id"
									? "Matikan semua notifikasi sekaligus"
									: "Turn off all notifications at once"
							}
							value={notifPrefs.enabled}
							onToggle={toggleNotifEnabled}
							theme={theme}
						/>
					) : notifPrefsLoading ? (
						<ActivityIndicator style={{ marginTop: 6 }} />
					) : null}

					<ToggleRow
						icon="chart"
						tone="info"
						title={language === "id" ? "Pengingat Harian" : "Daily Summary"}
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
					<Text style={styles.appName}>Kaswise v1.0.0</Text>
					<Text style={styles.appTagline}>
						{language === "id"
							? "Catat Keuangan, Bijak Setiap Hari"
							: "Track Finances, Wise Every Day"}
					</Text>
				</View>


				{/* Logout */}
				<AnimatedPressable
					key="settings-logout"
					testID="settings-logout"
					accessibilityRole="button"
					accessibilityLabel={
						language === "id" ? "Keluar dari akun" : "Sign out"
					}
					accessibilityState={{ busy: logoutLoading, disabled: logoutLoading }}
					disabled={logoutLoading}
					hitSlop={12}
					onPressIn={() => animateLogoutButton(0.97)}
					onPressOut={() => animateLogoutButton(1)}
					style={[
						styles.logoutBtn,
						{ transform: [{ scale: logoutScale }], opacity: logoutLoading ? 0.72 : 1 },
					]}
					onPress={onLogout}
				>
					{logoutLoading ? (
						<ActivityIndicator color={theme.colors.danger} />
					) : (
						<Text style={styles.logoutText}>
							{language === "id" ? "Keluar dari Akun" : "Sign Out"}
						</Text>
					)}
				</AnimatedPressable>
				</StaggeredStack>


				<View style={{ height: 100 }} />
			</ScrollView>
			<Modal
				visible={profileSheetVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setProfileSheetVisible(false)}
			>
				<View style={styles.sheetOverlay}>
					<Pressable style={styles.sheetBackdrop} onPress={() => setProfileSheetVisible(false)} />
					<View style={styles.bottomSheet}>
						<View style={styles.sheetHeader}>
							<Text style={styles.sheetTitle}>{language === "id" ? "Ubah Foto Profil" : "Change Profile Photo"}</Text>
							<Pressable
								testID="settings-profile-sheet-close"
								accessibilityRole="button"
								accessibilityLabel={language === "id" ? "Tutup" : "Close"}
								style={styles.closeButton}
								onPress={() => setProfileSheetVisible(false)}
							>
								<KaswiseIcon name="close" size={18} color={theme.colors.textPrimary} />
							</Pressable>
						</View>

						<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
							<View style={styles.profileActionRow}>
								<ProfilePhotoAction icon="camera" label={language === "id" ? "Ambil Foto" : "Camera"} onPress={() => pickProfilePhoto("camera")} theme={theme} />
								<ProfilePhotoAction icon="image" label={language === "id" ? "Galeri" : "Gallery"} onPress={() => pickProfilePhoto("library")} theme={theme} />
								<ProfilePhotoAction
									icon="trash"
									label={language === "id" ? "Hapus Foto" : "Remove"}
									onPress={() => {
										setDraftPhotoUri(null);
										setDraftAvatarKey(null);
										setDraftVisualMode("none");
									}}
									theme={theme}
								/>
							</View>

							<View style={styles.sheetPreviewRow}>
								<View style={styles.sheetPreviewAvatar}>
									{draftVisualMode === "photo" && draftPhotoUri ? (
										<Image source={{ uri: draftPhotoUri }} style={styles.sheetPreviewImage} />
									) : draftVisualMode === "avatar" && draftSelectedAvatar ? (
										<ProfileAvatarIllustration preset={draftSelectedAvatar} theme={theme} size={72} />
									) : (
										<Text style={styles.profileAvatarText}>{avatarInitials}</Text>
									)}
								</View>
								<Text style={styles.sheetPreviewText}>
									{language === "id" ? "Preview profil" : "Profile preview"}
								</Text>
							</View>

							<Text style={styles.avatarSectionTitle}>{language === "id" ? "Pilih Avatar" : "Choose Avatar"}</Text>
							<View style={styles.avatarTabs}>
								{AVATAR_FILTERS.map((filter) => {
									const active = avatarFilter === filter.key;
									return (
										<Pressable
											key={filter.key}
											testID={`settings-avatar-filter-${filter.key}`}
											accessibilityRole="button"
											accessibilityState={{ selected: active }}
											style={styles.avatarTab}
											onPress={() => setAvatarFilter(filter.key)}
										>
											<Text style={[styles.avatarTabText, active && styles.avatarTabTextActive]}>
												{language === "id" ? filter.labelId : filter.labelEn}
											</Text>
											<View style={[styles.avatarTabUnderline, active && styles.avatarTabUnderlineActive]} />
										</Pressable>
									);
								})}
							</View>

							<View style={styles.avatarGrid}>
								{filteredAvatars.map((avatar) => {
									const selected = draftVisualMode === "avatar" && draftAvatarKey === avatar.id;
									return (
										<Pressable
											key={avatar.id}
											testID={`settings-avatar-option-${avatar.id}`}
											accessibilityRole="button"
											accessibilityLabel={avatar.label}
											accessibilityState={{ selected }}
											style={[styles.avatarOption, selected && styles.avatarOptionSelected]}
											onPress={() => {
											setDraftPhotoUri(null);
											setDraftAvatarKey(avatar.id);
											setDraftVisualMode("avatar");
										}}
										>
											<ProfileAvatarIllustration preset={avatar} theme={theme} size={88} />
											{selected ? (
												<View style={styles.avatarCheck}>
													<KaswiseIcon name="check" size={14} weight="fill" color={theme.colors.buttonPrimaryText} />
												</View>
											) : null}
										</Pressable>
									);
								})}
							</View>
						</ScrollView>

						<View style={styles.sheetFooter}>
							{profileMessage && profileSheetVisible ? (
								<Text style={[styles.inlineMessage, profileMessage.type === "error" && styles.inlineMessageError]}>
									{profileMessage.message}
								</Text>
							) : null}
							<Pressable
								testID="settings-save-profile-photo"
								accessibilityRole="button"
								accessibilityState={{ busy: profileSaving, disabled: profileSaving }}
								disabled={profileSaving}
								style={[styles.primaryButton, profileSaving && styles.buttonDisabled]}
								onPress={saveProfileVisual}
							>
								{profileSaving ? (
									<ActivityIndicator color={theme.colors.buttonPrimaryText} />
								) : (
									<Text style={styles.primaryButtonText}>{language === "id" ? "Simpan" : "Save"}</Text>
								)}
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>
		</PageEntrance>
	);
}

function getAvatarToneColor(preset: ProfileAvatarPreset, theme: ReturnType<typeof useTheme>["theme"]) {
	if (preset.background === "primary") return theme.colors.brandPrimary;
	if (preset.background === "navy") return theme.colors.brandSecondary;
	return theme.colors[preset.background];
}

function ProfileAvatarIllustration({
	preset,
	theme,
	size,
}: {
	preset: ProfileAvatarPreset;
	theme: ReturnType<typeof useTheme>["theme"];
	size: number;
}) {
	const accent = getAvatarToneColor(preset, theme);
	const softAccent = colorWithAlpha(accent, theme.mode === "dark" ? "30" : "24");
	const face = theme.mode === "dark" ? theme.colors.warning : theme.iconBubbles.warning.background;
	const hair = preset.hair === "hijab" ? theme.colors.brandSecondary : theme.colors.textSecondary;
	const body = preset.accessory === "tie" ? theme.colors.brandSecondary : theme.colors.brandPrimary;
	const cheek = colorWithAlpha(theme.colors.danger, "30");

	return (
		<Svg width={size} height={size} viewBox="0 0 96 96" accessibilityLabel={preset.label}>
			<Circle cx="48" cy="48" r="46" fill={softAccent} />
			<Circle cx="34" cy="26" r="8" fill={colorWithAlpha(theme.colors.surfaceElevated, "88")} />
			<Circle cx="68" cy="28" r="5" fill={colorWithAlpha(accent, "55")} />
			<Path d="M22 82c4-18 16-28 26-28s22 10 26 28" fill={body} />
			<Path d="M30 82c4-10 12-15 18-15s14 5 18 15" fill={colorWithAlpha(theme.colors.surface, "72")} />
			{preset.accessory === "tie" ? <Path d="M45 65h6l4 17-7 8-7-8 4-17z" fill={theme.colors.danger} /> : null}
			<Circle cx="48" cy="43" r="22" fill={face} />
			{preset.hair === "hijab" ? (
				<Path d="M24 48c0-22 11-34 25-34 15 0 25 12 25 34 0 15-8 27-26 31-17-4-24-16-24-31z" fill={hair} />
			) : preset.hair === "bun" ? (
				<>
					<Circle cx="69" cy="28" r="10" fill={hair} />
					<Path d="M25 38c4-17 16-25 30-21 10 3 16 11 17 23-15-6-30-6-47-2z" fill={hair} />
				</>
			) : preset.hair === "cap" ? (
				<>
					<Path d="M25 34c7-14 33-17 47 2-13 5-30 4-47-2z" fill={accent} />
					<Rect x="56" y="32" width="20" height="7" rx="4" fill={colorWithAlpha(accent, "99")} />
				</>
			) : preset.hair === "wave" ? (
				<Path d="M24 39c4-18 18-28 33-21 10 5 15 13 14 25-8-8-17-11-26-8-8 2-14 2-21 4z" fill={hair} />
			) : (
				<Path d="M25 37c5-17 18-24 33-18 8 3 13 10 14 21-16-6-31-7-47-3z" fill={hair} />
			)}
			{preset.hair === "hijab" ? <Circle cx="48" cy="45" r="18" fill={face} /> : null}
			<Circle cx="39" cy="45" r="2.5" fill={theme.colors.textPrimary} />
			<Circle cx="57" cy="45" r="2.5" fill={theme.colors.textPrimary} />
			<Path d="M41 57c5 5 10 5 15 0" stroke={theme.colors.textPrimary} strokeWidth="3" strokeLinecap="round" fill="none" />
			<Circle cx="33" cy="53" r="4" fill={cheek} />
			<Circle cx="63" cy="53" r="4" fill={cheek} />
			{preset.accessory === "glasses" ? (
				<>
					<Circle cx="39" cy="45" r="7" stroke={theme.colors.textPrimary} strokeWidth="2" fill="none" />
					<Circle cx="57" cy="45" r="7" stroke={theme.colors.textPrimary} strokeWidth="2" fill="none" />
					<Path d="M46 45h4" stroke={theme.colors.textPrimary} strokeWidth="2" />
				</>
			) : null}
			{preset.accessory === "earring" ? <Circle cx="70" cy="51" r="3" fill={accent} /> : null}
			<Circle cx="34" cy="30" r="3" fill={colorWithAlpha(theme.colors.textInverse, "70")} />
		</Svg>
	);
}

function ProfilePhotoAction({
	icon,
	label,
	onPress,
	theme,
}: {
	icon: KaswiseIconName;
	label: string;
	onPress: () => void;
	theme: ReturnType<typeof useTheme>["theme"];
}) {
	return (
		<Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1, alignItems: "center", gap: 8 }}>
			<View
				style={{
					width: 48,
					height: 48,
					borderRadius: 24,
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: colorWithAlpha(theme.colors.brandPrimary, theme.mode === "dark" ? "18" : "14"),
					borderWidth: 1,
					borderColor: colorWithAlpha(theme.colors.brandPrimary, "55"),
				}}
			>
				<KaswiseIcon name={icon} color={theme.colors.brandPrimary} size={22} />
			</View>
			<Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: "800", textAlign: "center" }}>{label}</Text>
		</Pressable>
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
			gap: 14,
		},
		profileAvatar: {
			width: 68,
			height: 68,
			borderRadius: 34,
			backgroundColor: theme.colors.mutedSurface,
			alignItems: "center",
			justifyContent: "center",
			overflow: "hidden",
		},
		profileAvatarImage: {
			width: 68,
			height: 68,
			borderRadius: 34,
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
		profilePhotoButton: { alignSelf: "flex-start", marginTop: 8 },
		profilePhotoButtonText: {
			color: theme.colors.brandPrimary,
			fontSize: 12,
			fontWeight: "800",
		},
		inlineMessage: {
			color: theme.colors.success,
			fontSize: 11,
			fontWeight: "700",
			marginTop: 6,
		},
		inlineMessageError: { color: theme.colors.danger },
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
		passwordForm: { gap: 10, paddingTop: 2 },
		textInput: {
			minHeight: 46,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.mutedSurface,
			color: theme.colors.textPrimary,
			paddingHorizontal: 14,
			fontSize: 14,
			fontWeight: "600",
		},
		primaryButton: {
			minHeight: 48,
			borderRadius: 14,
			backgroundColor: theme.colors.buttonPrimaryBg,
			alignItems: "center",
			justifyContent: "center",
			paddingHorizontal: 16,
			paddingVertical: 12,
		},
		buttonDisabled: { opacity: 0.68 },
		primaryButtonText: {
			color: theme.colors.buttonPrimaryText,
			fontSize: 14,
			fontWeight: "800",
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
		sheetOverlay: {
			flex: 1,
			justifyContent: "flex-end",
			backgroundColor: colorWithAlpha(theme.colors.background, theme.mode === "dark" ? "CC" : "AA"),
		},
		sheetBackdrop: { ...StyleSheet.absoluteFillObject },
		bottomSheet: {
			maxHeight: "90%",
			backgroundColor: theme.colors.surface,
			borderTopLeftRadius: 30,
			borderTopRightRadius: 30,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			overflow: "hidden",
			shadowColor: theme.colors.textPrimary,
			shadowOpacity: theme.mode === "dark" ? 0.34 : 0.14,
			shadowRadius: 24,
			elevation: 18,
		},
		sheetHeader: {
			paddingHorizontal: 20,
			paddingTop: 18,
			paddingBottom: 12,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
		},
		sheetTitle: {
			color: theme.colors.textPrimary,
			fontSize: 18,
			fontWeight: "800",
		},
		closeButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.colors.mutedSurface,
		},
		sheetContent: { paddingHorizontal: 20, paddingBottom: 16, gap: 16 },
		profileActionRow: { flexDirection: "row", gap: 10 },
		sheetPreviewRow: {
			alignItems: "center",
			gap: 8,
			paddingVertical: 6,
		},
		sheetPreviewAvatar: {
			width: 76,
			height: 76,
			borderRadius: 38,
			backgroundColor: theme.colors.mutedSurface,
			alignItems: "center",
			justifyContent: "center",
			overflow: "hidden",
		},
		sheetPreviewImage: { width: 76, height: 76, borderRadius: 38 },
		sheetPreviewText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: "700" },
		avatarSectionTitle: {
			color: theme.colors.textPrimary,
			fontSize: 15,
			fontWeight: "800",
		},
		avatarTabs: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
		avatarTab: { paddingBottom: 6, gap: 6 },
		avatarTabText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "800" },
		avatarTabTextActive: { color: theme.colors.textPrimary },
		avatarTabUnderline: { height: 2, borderRadius: 999, backgroundColor: "transparent" },
		avatarTabUnderlineActive: { backgroundColor: theme.colors.brandPrimary },
		avatarGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent: "space-between",
			rowGap: 14,
		},
		avatarOption: {
			width: "31%",
			aspectRatio: 1,
			borderRadius: 999,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 2,
			borderColor: "transparent",
			backgroundColor: theme.colors.mutedSurface,
		},
		avatarOptionSelected: {
			borderColor: theme.colors.brandPrimary,
			shadowColor: theme.colors.brandPrimary,
			shadowOpacity: theme.mode === "dark" ? 0.34 : 0.20,
			shadowRadius: 12,
			elevation: 7,
		},
		avatarCheck: {
			position: "absolute",
			right: 4,
			bottom: 6,
			width: 24,
			height: 24,
			borderRadius: 12,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: theme.colors.buttonPrimaryBg,
			borderWidth: 2,
			borderColor: theme.colors.surface,
		},
		sheetFooter: {
			padding: 20,
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.surface,
			gap: 8,
		},
	});
}
