import Svg, { Circle, Path, Rect } from "react-native-svg";

import { useTheme } from "../../theme/theme-context";

export type AvatarGroup = "all" | "men" | "women" | "other";
export type ProfileVisualMode = "photo" | "avatar" | "none";

export type ProfileAvatarPreset = {
	id: string;
	group: Exclude<AvatarGroup, "all">;
	label: string;
	background: "primary" | "navy" | "success" | "warning" | "danger" | "info";
	hair: "short" | "wave" | "hijab" | "bun" | "cap";
	accessory?: "glasses" | "tie" | "earring";
};

export const PROFILE_AVATARS: ProfileAvatarPreset[] = [
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

export const AVATAR_FILTERS: Array<{ key: AvatarGroup; labelId: string; labelEn: string }> = [
	{ key: "all", labelId: "Semua", labelEn: "All" },
	{ key: "men", labelId: "Pria", labelEn: "Men" },
	{ key: "women", labelId: "Wanita", labelEn: "Women" },
	{ key: "other", labelId: "Lainnya", labelEn: "Other" },
];

export function colorWithAlpha(color: string, alpha: string) {
	return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;
}

export function readProfileVisualMetadata(metadata: Record<string, unknown>) {
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

function getAvatarToneColor(preset: ProfileAvatarPreset, theme: ReturnType<typeof useTheme>["theme"]) {
	if (preset.background === "primary") return theme.colors.brandPrimary;
	if (preset.background === "navy") return theme.colors.brandSecondary;
	return theme.colors[preset.background];
}

export function ProfileAvatarIllustration({
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
