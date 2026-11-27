import { Avatar, Style } from "@dicebear/core";
// Clay (CC0 1.0) — definition dari @dicebear/styles@11 (clay TIDAK ada di
// @dicebear/collection). API core@11: new Avatar(new Style(def), options).
// Generate OFFLINE dari seed tetap; hasil string SVG untuk react-native-svg.
import clayStyle from "@dicebear/styles/clay.json";

const clay = new Style(clayStyle);

export function clayAvatarSvgForSeed(seed: string, size: number): string {
	return new Avatar(clay, { seed, size }).toString();
}
