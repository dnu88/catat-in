import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

/**
 * ProfileMonogram — fallback avatar inisial di atas gradien (disetujui Danu,
 * spec "Clay + Monogram" 26 Nov). Dipakai saat pengguna tidak punya foto atau
 * avatar preset yang valid. Warna gradien deterministik dari nama: orang yang
 * sama selalu mendapat warna yang sama.
 */

const MONOGRAM_GRADIENTS = [
	["#178BD0", "#071B4F"],
	["#42B7EB", "#0A3D78"],
	["#168FA8", "#071B4F"],
	["#5B8DEF", "#2B4C9B"],
	["#8A7BF0", "#3D3785"],
	["#E06C8A", "#8E3A55"],
	["#3FA796", "#1F5F55"],
	["#E8A34F", "#96622A"],
] as const;

export function monogramGradientForName(name: string): readonly [string, string] {
	const normalized = name.trim().toLowerCase();
	let hash = 7;
	for (const character of normalized) {
		hash = (hash * 31 + character.charCodeAt(0)) % 997;
	}
	return MONOGRAM_GRADIENTS[hash % MONOGRAM_GRADIENTS.length];
}

export function monogramInitials(name: string, fallbackEmail?: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
	}
	if (parts.length === 1 && parts[0].length >= 2) {
		return parts[0].slice(0, 2).toUpperCase();
	}
	if (parts.length === 1) {
		return parts[0].charAt(0).toUpperCase();
	}
	if (fallbackEmail) {
		return fallbackEmail.charAt(0).toUpperCase();
	}
	return "?";
}

export function ProfileMonogram({
	name,
	size,
	fallbackEmail,
	testID,
}: {
	name: string;
	size: number;
	fallbackEmail?: string;
	testID?: string;
}) {
	const [from, to] = monogramGradientForName(name || fallbackEmail || "");
	const initials = monogramInitials(name, fallbackEmail);

	return (
		<View
			testID={testID}
			style={[
				styles.circle,
				{ width: size, height: size, borderRadius: size / 2 },
			]}
			accessibilityLabel={name}
		>
			<LinearGradient
				colors={[from, to] as [string, string]}
				start={{ x: 0.2, y: 0 }}
				end={{ x: 0.85, y: 1 }}
				style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
			/>
			{/* Highlight lembut di atas: linear putih 0.28 → 0 pada 55% tinggi. */}
			<LinearGradient
				colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0)"]}
				locations={[0, 0.55]}
				start={{ x: 0.5, y: 0 }}
				end={{ x: 0.5, y: 1 }}
				style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
			/>
			<Text
				style={{
					color: "#FFFFFF",
					fontSize: Math.max(10, Math.round(size * 0.31)),
					fontWeight: "600",
					textAlign: "center",
				}}
			>
				{initials}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	circle: {
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
});
