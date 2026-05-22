import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

import { Card } from "../../src/components/ui/Card";
import { IconBubble } from "../../src/components/ui/IconBubble";
import { SectionHeader } from "../../src/components/ui/SectionHeader";
import { useI18n } from "../../src/i18n/i18n-context";
import { useSupabase } from "../../src/lib/supabase";
import { getCurrentUserId } from "../../src/services/currentUser";
import {
	createHousehold,
	joinHouseholdByInviteCode,
	listMyHouseholds,
	type HouseholdMember,
	type HouseholdRole,
} from "../../src/services/households";
import { useFinanceContext } from "../../src/state/finance-context";
import { useTheme } from "../../src/theme/theme-context";

type ActiveForm = "create" | "join" | null;

const roleLabels = {
	id: {
		owner: "Owner",
		admin: "Admin",
		member: "Member",
		viewer: "Akses lihat saja",
	},
	en: { owner: "Owner", admin: "Admin", member: "Member", viewer: "View only" },
} satisfies Record<"id" | "en", Record<HouseholdRole, string>>;

const copy = {
	id: {
		title: "Keluarga",
		subtitle: "Pantau keuangan keluarga dari satu ruang bersama.",
		create: "Buat",
		join: "Gabung",
		createLabel: "Buat keluarga baru",
		createHint: "Menampilkan atau menyembunyikan formulir pembuatan keluarga",
		joinLabel: "Gabung keluarga",
		joinHint: "Menampilkan atau menyembunyikan formulir kode undangan",
		infoTitle: "Pusat Keluarga",
		infoSub:
			"Buat ruang bersama, undang anggota, dan pantau akses dasar tiap keluarga.",
		createTitle: "Buat keluarga baru",
		namePlaceholder: "Nama keluarga",
		saveFamily: "Simpan keluarga",
		saveHint: "Membuat keluarga baru dengan nama yang diisi",
		joinTitle: "Masukkan kode undangan",
		invitePlaceholder: "Kode undangan",
		joinWithCode: "Gabung keluarga",
		joinWithCodeLabel: "Gabung keluarga dengan kode undangan",
		joinWithCodeHint: "Bergabung ke keluarga memakai kode undangan yang diisi",
		loading: "Memuat keluarga...",
		emptyTitle: "Belum ada keluarga",
		emptyBody: "Buat keluarga baru atau gabung memakai kode undangan.",
		familyFallback: "Keluarga",
		members: "Anggota",
		inviteCode: "Kode undangan",
		loadError: "Gagal memuat keluarga",
		createError: "Gagal membuat keluarga",
		joinError: "Gagal bergabung keluarga",
	},
	en: {
		title: "Family",
		subtitle: "Track household finances from one shared space.",
		create: "Create",
		join: "Join",
		createLabel: "Create new family",
		createHint: "Shows or hides the family creation form",
		joinLabel: "Join family",
		joinHint: "Shows or hides the invite code form",
		infoTitle: "Family Center",
		infoSub:
			"Create a shared space, invite members, and manage basic access for each family.",
		createTitle: "Create a new family",
		namePlaceholder: "Family name",
		saveFamily: "Save family",
		saveHint: "Creates a new family with the entered name",
		joinTitle: "Enter invite code",
		invitePlaceholder: "Invite code",
		joinWithCode: "Join family",
		joinWithCodeLabel: "Join family with invite code",
		joinWithCodeHint: "Joins a family using the entered invite code",
		loading: "Loading family...",
		emptyTitle: "No family yet",
		emptyBody: "Create a new family or join with an invite code.",
		familyFallback: "Family",
		members: "Members",
		inviteCode: "Invite code",
		loadError: "Failed to load family",
		createError: "Failed to create family",
		joinError: "Failed to join family",
	},
} as const;

export default function GroupsScreen() {
	const { theme } = useTheme();
	const { language } = useI18n();
	const tx = copy[language];
	const { supabase } = useSupabase();
	const { refreshMemberships } = useFinanceContext();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const [memberships, setMemberships] = useState<HouseholdMember[]>([]);
	const [activeForm, setActiveForm] = useState<ActiveForm>(null);
	const [householdName, setHouseholdName] = useState("");
	const [inviteCode, setInviteCode] = useState("");
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refreshHouseholds = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const userId = await getCurrentUserId();
			const rows = await listMyHouseholds(supabase, userId);
			setMemberships(rows);
		} catch (err) {
			setError(err instanceof Error ? err.message : tx.loadError);
		} finally {
			setLoading(false);
		}
	}, [supabase, tx.loadError]);

	useEffect(() => {
		refreshHouseholds();
	}, [refreshHouseholds]);

	const handleCreate = useCallback(async () => {
		if (!householdName.trim()) return;
		setSubmitting(true);
		setError(null);
		try {
			const userId = await getCurrentUserId();
			await createHousehold(supabase, {
				name: householdName.trim(),
				ownerId: userId,
			});
			setHouseholdName("");
			setActiveForm(null);
			await Promise.all([refreshHouseholds(), refreshMemberships()]);
		} catch (err) {
			setError(err instanceof Error ? err.message : tx.createError);
		} finally {
			setSubmitting(false);
		}
	}, [
		householdName,
		refreshHouseholds,
		refreshMemberships,
		supabase,
		tx.createError,
	]);

	const handleJoin = useCallback(async () => {
		if (!inviteCode.trim()) return;
		setSubmitting(true);
		setError(null);
		try {
			await joinHouseholdByInviteCode(supabase, inviteCode);
			setInviteCode("");
			setActiveForm(null);
			await Promise.all([refreshHouseholds(), refreshMemberships()]);
		} catch (err) {
			setError(err instanceof Error ? err.message : tx.joinError);
		} finally {
			setSubmitting(false);
		}
	}, [
		inviteCode,
		refreshHouseholds,
		refreshMemberships,
		supabase,
		tx.joinError,
	]);

	return (
		<View style={styles.screen}>
			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				<SectionHeader
					title={tx.title}
					subtitle={tx.subtitle}
					action={
						<View style={styles.headerActions}>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={tx.createLabel}
								accessibilityHint={tx.createHint}
								style={[styles.addButton, submitting && styles.disabledButton]}
								onPress={() =>
									setActiveForm(activeForm === "create" ? null : "create")
								}
								disabled={submitting}
							>
								<Text style={styles.addButtonText}>{tx.create}</Text>
							</Pressable>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={tx.joinLabel}
								accessibilityHint={tx.joinHint}
								style={[
									styles.secondaryButton,
									submitting && styles.disabledButton,
								]}
								onPress={() =>
									setActiveForm(activeForm === "join" ? null : "join")
								}
								disabled={submitting}
							>
								<Text style={styles.secondaryButtonText}>{tx.join}</Text>
							</Pressable>
						</View>
					}
				/>

				<Card variant="muted" style={styles.infoCard}>
					<IconBubble name="groups" tone="info" size={48} />
					<View style={styles.infoContent}>
						<Text style={styles.infoTitle}>{tx.infoTitle}</Text>
						<Text style={styles.infoSub}>{tx.infoSub}</Text>
					</View>
				</Card>

				{activeForm === "create" ? (
					<Card variant="default" style={styles.formCard}>
						<Text style={styles.formTitle}>{tx.createTitle}</Text>
						<TextInput
							accessibilityLabel={tx.namePlaceholder}
							value={householdName}
							onChangeText={setHouseholdName}
							placeholder={tx.namePlaceholder}
							placeholderTextColor={theme.colors.textMuted}
							style={styles.input}
						/>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={tx.saveFamily}
							accessibilityHint={tx.saveHint}
							style={[styles.submitButton, submitting && styles.disabledButton]}
							onPress={handleCreate}
							disabled={submitting}
						>
							<Text style={styles.submitButtonText}>{tx.saveFamily}</Text>
						</Pressable>
					</Card>
				) : null}

				{activeForm === "join" ? (
					<Card variant="default" style={styles.formCard}>
						<Text style={styles.formTitle}>{tx.joinTitle}</Text>
						<TextInput
							accessibilityLabel={tx.invitePlaceholder}
							value={inviteCode}
							onChangeText={setInviteCode}
							placeholder={tx.invitePlaceholder}
							placeholderTextColor={theme.colors.textMuted}
							autoCapitalize="characters"
							style={styles.input}
						/>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={tx.joinWithCodeLabel}
							accessibilityHint={tx.joinWithCodeHint}
							style={[styles.submitButton, submitting && styles.disabledButton]}
							onPress={handleJoin}
							disabled={submitting}
						>
							<Text style={styles.submitButtonText}>{tx.joinWithCode}</Text>
						</Pressable>
					</Card>
				) : null}

				{error ? <Text style={styles.errorText}>{error}</Text> : null}
				{loading ? <Text style={styles.emptyText}>{tx.loading}</Text> : null}

				{!loading && memberships.length === 0 ? (
					<Card variant="default" style={styles.emptyCard}>
						<IconBubble name="groups" tone="accent" size={46} />
						<Text style={styles.emptyTitle}>{tx.emptyTitle}</Text>
						<Text style={styles.emptyText}>{tx.emptyBody}</Text>
					</Card>
				) : null}

				{memberships.map((membership) => {
					const household = membership.households;
					const roleLabel = roleLabels[language][membership.role];
					return (
						<Card
							key={membership.id ?? membership.household_id}
							variant="default"
							style={styles.groupCard}
						>
							<View style={styles.groupTop}>
								<View style={styles.groupLeft}>
									<IconBubble
										name="groups"
										tone={membership.role === "viewer" ? "accent" : "primary"}
										size={46}
									/>
									<View style={styles.groupText}>
										<Text style={styles.groupName}>
											{household?.name ?? tx.familyFallback}
										</Text>
										<Text style={styles.groupMeta}>{tx.members}</Text>
									</View>
								</View>
								<View
									style={[
										styles.roleBadge,
										membership.role !== "viewer" && styles.roleBadgeActive,
									]}
								>
									<Text
										style={[
											styles.roleBadgeText,
											membership.role !== "viewer" &&
												styles.roleBadgeTextActive,
										]}
									>
										{roleLabel}
									</Text>
								</View>
							</View>

							<View style={styles.groupBottom}>
								<View>
									<Text style={styles.balanceLabel}>{tx.inviteCode}</Text>
									<Text style={styles.balanceValue}>
										{household?.invite_code ?? "-"}
									</Text>
								</View>
								<Text style={styles.memberLabel}>{tx.members}</Text>
							</View>
						</Card>
					);
				})}

				<View style={{ height: 100 }} />
			</ScrollView>
		</View>
	);
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
	return StyleSheet.create({
		screen: { flex: 1, backgroundColor: theme.colors.background },
		content: { padding: 20, gap: 12, paddingBottom: 26 },
		headerActions: { flexDirection: "row", gap: 8 },
		addButton: {
			backgroundColor: theme.colors.brandPrimary,
			borderRadius: theme.radius.pill,
			paddingHorizontal: 14,
			paddingVertical: 8,
		},
		addButtonText: {
			color: theme.colors.textInverse,
			fontSize: 12,
			fontWeight: "800",
		},
		secondaryButton: {
			backgroundColor: theme.iconBubbles.primary.background,
			borderRadius: theme.radius.pill,
			paddingHorizontal: 14,
			paddingVertical: 8,
		},
		secondaryButtonText: {
			color: theme.colors.brandPrimary,
			fontSize: 12,
			fontWeight: "800",
		},
		infoCard: { flexDirection: "row", alignItems: "center", gap: 12 },
		infoContent: { flex: 1 },
		infoTitle: {
			color: theme.colors.textPrimary,
			fontSize: 14,
			fontWeight: "800",
		},
		infoSub: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			marginTop: 4,
			lineHeight: 18,
		},
		formCard: { gap: 10 },
		formTitle: {
			color: theme.colors.textPrimary,
			fontSize: 14,
			fontWeight: "800",
		},
		input: {
			backgroundColor: theme.colors.surface,
			borderColor: theme.colors.borderSoft,
			borderRadius: theme.radius.md,
			borderWidth: 1,
			color: theme.colors.textPrimary,
			fontSize: 14,
			paddingHorizontal: 12,
			paddingVertical: 10,
		},
		submitButton: {
			alignItems: "center",
			backgroundColor: theme.colors.brandPrimary,
			borderRadius: theme.radius.pill,
			paddingVertical: 10,
		},
		submitButtonText: {
			color: theme.colors.textInverse,
			fontSize: 13,
			fontWeight: "800",
		},
		disabledButton: { opacity: 0.65 },
		errorText: { color: theme.colors.danger, fontSize: 12, fontWeight: "700" },
		emptyCard: { alignItems: "center", gap: 8 },
		emptyTitle: {
			color: theme.colors.textPrimary,
			fontSize: 15,
			fontWeight: "800",
		},
		emptyText: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
		groupCard: { gap: 12 },
		groupTop: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			gap: 8,
		},
		groupLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
		groupText: { flex: 1 },
		groupName: {
			color: theme.colors.textPrimary,
			fontSize: 15,
			fontWeight: "800",
		},
		groupMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
		roleBadge: {
			backgroundColor: theme.colors.mutedSurface,
			borderRadius: theme.radius.pill,
			paddingHorizontal: 10,
			paddingVertical: 4,
		},
		roleBadgeActive: { backgroundColor: theme.iconBubbles.primary.background },
		roleBadgeText: {
			color: theme.colors.textSecondary,
			fontSize: 11,
			fontWeight: "700",
		},
		roleBadgeTextActive: { color: theme.colors.brandPrimary },
		groupBottom: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			borderTopWidth: 1,
			borderTopColor: theme.colors.borderSoft,
			paddingTop: 10,
		},
		balanceLabel: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "600",
		},
		balanceValue: {
			color: theme.colors.textPrimary,
			fontSize: 16,
			fontWeight: "800",
			marginTop: 2,
		},
		memberLabel: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "800",
		},
	});
}
