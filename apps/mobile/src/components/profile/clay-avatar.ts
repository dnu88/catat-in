import { Avatar, Style } from "@dicebear/core";
// Clay (CC0 1.0) — definition dari @dicebear/styles@11 (clay TIDAK ada di
// @dicebear/collection). API core@11: new Avatar(new Style(def), options).
// Generate OFFLINE dari seed tetap; hasil string SVG untuk react-native-svg.
import clayStyle from "@dicebear/styles/clay.json";

const clay = new Style(clayStyle);

// Definisi Clay tidak mengekspos opsi backgroundColor (options: []) — isi
// manual dengan tile opaque yang konsisten (tint biru muda brand family).
const AVATAR_TILE_COLOR = "#E8EEF7";

export function clayAvatarSvgForSeed(
	seed: string,
	size: number,
	backgroundColor: string = AVATAR_TILE_COLOR,
): string {
	const svg = new Avatar(clay, { seed, size }).toString();
	return svg.replace(
		/<svg([^>]*)>/,
		`<svg$1><rect x="0" y="0" width="100%" height="100%" fill="${backgroundColor}"/>`,
	);
}
