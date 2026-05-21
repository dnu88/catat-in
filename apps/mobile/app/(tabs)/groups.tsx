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
import { useSupabase } from "../../src/lib/supabase";
import { getCurrentUserId } from "../../src/services/currentUser";
import {
	createHousehold,
	joinHouseholdByInviteCode,
	listMyHouseholds,
	type HouseholdMember,
	type HouseholdRole,
} from "../../src/services/households";
import { useTheme } from "../../src/theme/theme-context";

type ActiveForm = "create" | "join" | null;

const roleLabels: Record<HouseholdRole, string> = {
	owner: "Owner",
	admin: "Admin",
	member: "Member",
	viewer: "Akses lihat saja",
};

export default function GroupsScreen() {
	const { theme } = useTheme();
	const { supabase } = useSupabase();
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
			setError(err instanceof Error ? err.message : "Gagal memuat keluarga");
		} finally {
			setLoading(false);
		}
	}, [supabase]);

	useEffect(() => {
		refreshHouseholds();
	}, [refreshHouseholds]);

	const handleCreate = useCallback(async () => {
		if (!householdName.trim()) return;
		setSubmitting(true);
		setError(null);
		try {
			const userId = await getCurrentUserId();
			await createHousehold(supabase, { name: householdName, ownerId: userId });
			setHouseholdName("");
			setActiveForm(null);
			await refreshHouseholds();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Gagal membuat keluarga");
		} finally {
			setSubmitting(false);
		}
	}, [householdName, refreshHouseholds, supabase]);

	const handleJoin = useCallback(async () => {
		if (!inviteCode.trim()) return;
		setSubmitting(true);
		setError(null);
		try {
			await joinHouseholdByInviteCode(supabase, inviteCode);
			setInviteCode("");
			setActiveForm(null);
			await refreshHouseholds();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Gagal bergabung keluarga");
		} finally {
			setSubmitting(false);
		}
	}, [inviteCode, refreshHouseholds, supabase]);

	return (
		<View style={styles.screen}>
			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				<SectionHeader
					title="Keluarga"
					subtitle="Pantau keuangan keluarga dari satu ruang bersama."
					action={
						<View style={styles.headerActions}>
							<Pressable
								style={styles.addButton}
								onPress={() =>
									setActiveForm(activeForm === "create" ? null : "create")
								}
							>
								<Text style={styles.addButtonText}>Buat</Text>
							</Pressable>
							<Pressable
								style={styles.secondaryButton}
								onPress={() =>
									setActiveForm(activeForm === "join" ? null : "join")
								}
							>
								<Text style={styles.secondaryButtonText}>Gabung</Text>
							</Pressable>
						</View>
					}
				/>

				<Card variant="muted" style={styles.infoCard}>
					<IconBubble name="groups" tone="info" size={48} />
					<View style={styles.infoContent}>
						<Text style={styles.infoTitle}>Family Center</Text>
						<Text style={styles.infoSub}>
							Buat ruang bersama, undang anggota, dan pantau akses dasar tiap
							keluarga.
						</Text>
					</View>
				</Card>

				{activeForm === "create" ? (
					<Card variant="default" style={styles.formCard}>
						<Text style={styles.formTitle}>Buat keluarga baru</Text>
						<TextInput
							value={householdName}
							onChangeText={setHouseholdName}
							placeholder="Nama keluarga"
							placeholderTextColor={theme.colors.textMuted}
							style={styles.input}
						/>
						<Pressable
							style={[styles.submitButton, submitting && styles.disabledButton]}
							onPress={handleCreate}
							disabled={submitting}
						>
							<Text style={styles.submitButtonText}>Simpan keluarga</Text>
						</Pressable>
					</Card>
				) : null}

				{activeForm === "join" ? (
					<Card variant="default" style={styles.formCard}>
						<Text style={styles.formTitle}>Masukkan kode undangan</Text>
						<TextInput
							value={inviteCode}
							onChangeText={setInviteCode}
							placeholder="Kode undangan"
							placeholderTextColor={theme.colors.textMuted}
							autoCapitalize="characters"
							style={styles.input}
						/>
						<Pressable
							style={[styles.submitButton, submitting && styles.disabledButton]}
							onPress={handleJoin}
							disabled={submitting}
						>
							<Text style={styles.submitButtonText}>Gabung keluarga</Text>
						</Pressable>
					</Card>
				) : null}

				{error ? <Text style={styles.errorText}>{error}</Text> : null}
				{loading ? (
					<Text style={styles.emptyText}>Memuat keluarga...</Text>
				) : null}

				{!loading && memberships.length === 0 ? (
					<Card variant="default" style={styles.emptyCard}>
						<IconBubble name="groups" tone="accent" size={46} />
						<Text style={styles.emptyTitle}>Belum ada keluarga</Text>
						<Text style={styles.emptyText}>
							Buat keluarga baru atau gabung memakai kode undangan.
						</Text>
					</Card>
				) : null}

				{memberships.map((membership) => {
					const household = membership.households;
					const roleLabel = roleLabels[membership.role];
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
											{household?.name ?? "Keluarga"}
										</Text>
										<Text style={styles.groupMeta}>Anggota</Text>
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
									<Text style={styles.balanceLabel}>Kode undangan</Text>
									<Text style={styles.balanceValue}>
										{household?.invite_code ?? "-"}
									</Text>
								</View>
								<Text style={styles.memberLabel}>Anggota</Text>
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
