import { Platform } from "react-native";

import { featureFlags } from "../config/features";
import { experienceTokens } from "./experience-tokens";
import { financeEditorial as fe } from "./finance-editorial";

/**
 * PWA-only Unslop polish (2026-11). Applies only when the premium experience
 * is ON *and* the app runs on web, so native builds and flag OFF keep their
 * existing styles byte-for-byte. Resolve it during render (not at module load)
 * because the flag reads runtime overrides.
 */
export function isPwaPolish(): boolean {
	return featureFlags.simplePremiumExperience && Platform.OS === "web";
}

/**
 * Supporting copy on the navy hero gradient. Same value Beranda ships with
 * (white at E6), replacing the scattered 0.54-0.76 alphas that read as
 * disabled text on the bright end of the gradient.
 */
export const pwaHeroCaption = `${fe.white}E6`;

/** Minimum interactive box for the polished PWA controls. */
export const pwaMinTouch = experienceTokens.target.minTouch;
