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
	 * reverted on its own. Default OFF, so the legacy surfaces stay intact
	 * until it is explicitly rolled out.
	 */
	get simplePremiumExperience() {
		return (
			featureOverrides()?.simplePremiumExperience ??
			flagEnabled(processEnv?.EXPO_PUBLIC_FEATURE_SIMPLE_PREMIUM_EXPERIENCE)
		);
	},
};
