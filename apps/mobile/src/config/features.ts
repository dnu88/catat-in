import { Platform } from "react-native";

const processEnv = (
	globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

type FeatureOverride = {
	importStatement?: boolean;
	simpleNavigation?: boolean;
	voiceNote?: boolean;
	transactionEntryV2?: boolean;
	aiAutosaveText?: boolean;
	simplePremiumExperience?: boolean;
	categoryAiDiscipline?: boolean;
	categoryAiDisciplineUsers?: string;
};

function featureOverrides() {
	return (globalThis as { __KASWISE_FEATURE_FLAGS__?: FeatureOverride })
		.__KASWISE_FEATURE_FLAGS__;
}

export function flagEnabled(value: string | undefined) {
	return ["1", "true", "yes", "on"].includes(
		(value ?? "").trim().toLowerCase(),
	);
}

export const featureFlags = {
	get importStatement() {
		return featureOverrides()?.importStatement ?? flagEnabled(processEnv?.EXPO_PUBLIC_FEATURE_IMPORT_STATEMENT);
	},
	get simpleNavigation() {
		return featureOverrides()?.simpleNavigation ?? flagEnabled(processEnv?.EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION);
	},
	get voiceNote() {
		return featureOverrides()?.voiceNote ?? flagEnabled(processEnv?.EXPO_PUBLIC_FEATURE_VOICE_NOTE);
	},
	/**
	 * Gates the review-first transaction entry flow (editable draft review before
	 * saving). Kept independent from `simpleNavigation` so the entry UI can be
	 * rolled back on its own without reverting navigation.
	 */
	get transactionEntryV2() {
		return (
			featureOverrides()?.transactionEntryV2 ??
			flagEnabled(processEnv?.EXPO_PUBLIC_FEATURE_TRANSACTION_ENTRY_V2)
		);
	},
	/**
	 * Gates text auto-save: one clear sentence is written without review, with a
	 * 10s undo notice. Kept independent from `transactionEntryV2` so automatic
	 * saving can be rolled back on its own without reverting the entry flow.
	 */
	get aiAutosaveText() {
		return (
			featureOverrides()?.aiAutosaveText ??
			flagEnabled(processEnv?.EXPO_PUBLIC_FEATURE_AI_AUTOSAVE_TEXT)
		);
	},
	/**
	 * Gates the "simple premium" presentation redesign (lighter capture
	 * composer, calmer hierarchy, batch summary cards).
	 *
	 * Presentation only: it never changes what is persisted, the autosave
	 * decision, entitlements, permissions, or payment. Kept independent from
	 * `transactionEntryV2` / `aiAutosaveText` so a visual rollout can be
	 * reverted on its own.
	 *
	 * Resolution (tri-state, strict order — approved Danu 26 Nov):
	 * 1. runtime/test override wins (including explicit `false`);
	 * 2. an env key that is PRESENT (existence check, not truthy — so `=0`
	 *    can still override the web default) resolves via `flagEnabled`;
	 * 3. web defaults to ON (premium experience is the default web surface);
	 * 4. native without env stays OFF (native baseline unchanged).
	 */
	get simplePremiumExperience() {
		const override = featureOverrides()?.simplePremiumExperience;
		if (override !== undefined) {
			return override;
		}
		const envKey = "EXPO_PUBLIC_FEATURE_SIMPLE_PREMIUM_EXPERIENCE";
		if (processEnv && envKey in processEnv) {
			return flagEnabled(processEnv[envKey]);
		}
		if (Platform.OS === "web") {
			return true;
		}
		return false;
	},
	/**
	 * Gates the AI category discipline: the model must pick from the user's
	 * category list (+ Other), a suggestion for an unknown category is stored
	 * separately and waits for the user's decision, and merchant corrections
	 * become reusable rules. OFF = the previous free-text fallback behaviour.
	 */
	get categoryAiDiscipline() {
		return (
			featureOverrides()?.categoryAiDiscipline ??
			flagEnabled(processEnv?.EXPO_PUBLIC_FEATURE_CATEGORY_AI_DISCIPLINE)
		);
	},
	/**
	 * Per-user allowlist (saklar rilis 27 Nov: akun Danu dulu). Empty string /
	 * kosong = tak ada user yang di-allowlist lewat env ini.
	 */
	get categoryAiDisciplineUsers(): string[] {
		const raw =
			featureOverrides()?.categoryAiDisciplineUsers ??
			processEnv?.EXPO_PUBLIC_FEATURE_CATEGORY_AI_DISCIPLINE_USERS ??
			"";
		return String(raw)
			.split(",")
			.map((value) => value.trim().toLowerCase())
			.filter(Boolean);
	},
	/**
	 * Disiplin kategori untuk SATU user: allowlist menang bila berisi id-nya
	 * (flag global tidak perlu ON); tanpa allowlist, ikut flag global.
	 * Override global (test) tetap menang supaya tes lama tidak berubah.
	 */
	isCategoryAiDisciplineUser(userId: string | null | undefined): boolean {
		const override = featureOverrides()?.categoryAiDiscipline;
		const users = this.categoryAiDisciplineUsers;
		if (users.length > 0) {
			const id = String(userId ?? "").trim().toLowerCase();
			// Env boleh berisi id penuh atau prefix unik (mis. `aa70df9b`).
			return Boolean(id && users.some((entry) => id === entry || id.startsWith(entry)));
		}
		return override ?? this.categoryAiDiscipline;
	},
};
