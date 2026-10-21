import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";

import type {
	CategoryOption,
	DraftFieldErrors,
	ReviewField,
	TransactionDraft,
	WalletOption,
} from "../../features/transaction-entry/draft";
import {
	allDraftsValid,
	unacknowledgedWarnings,
} from "../../features/transaction-entry/draft";
import { useI18n } from "../../i18n/i18n-context";
import { financeEditorial as fe } from "../../theme/finance-editorial";
import { entryCopy, formatRupiah, warningLabel } from "./copy";
import {
	TransactionFields,
	type EntryPickerKind,
} from "./TransactionFields";

type TransactionReviewProps = {
	drafts: TransactionDraft[];
	wallets: WalletOption[];
	categories: CategoryOption[];
	canCreate: boolean;
	saveBlocked?: boolean;
	onChange: (key: string, patch: Partial<TransactionDraft>) => void;
	onAcknowledge: (key: string, field: ReviewField) => void;
	onOpenPicker: (key: string, kind: EntryPickerKind) => void;
	onSave: () => void;
	onCancel: () => void;
	saving: boolean;
	errors?: Record<string, DraftFieldErrors>;
	summary: { count: number; total: number };
};

export function DraftWarnings({
	draft,
	onAcknowledge,
}: {
	draft: TransactionDraft;
	onAcknowledge: (key: string, field: ReviewField) => void;
}) {
	const { language } = useI18n();
	const copy = entryCopy(language);
	const styles = useMemo(() => createStyles(), []);
	const warnings = unacknowledgedWarnings(draft);
	if (warnings.length === 0) return null;

	return (
		<View style={styles.warningBox} testID={`review-warnings-${draft.key}`}>
			{warnings.map((field) => (
				<View key={field} style={styles.warningRow}>
					<Text
						style={styles.warningText}
						accessibilityRole="alert"
						accessibilityLiveRegion="polite"
					>
						{warningLabel(field, language)}
					</Text>
					<Pressable
						onPress={() => onAcknowledge(draft.key, field)}
						accessibilityRole="button"
						accessibilityLabel={copy.acknowledge}
						style={styles.ackButton}
						testID={`review-ack-${draft.key}-${field}`}
					>
						<Text style={styles.ackButtonText}>{copy.acknowledge}</Text>
					</Pressable>
				</View>
			))}
		</View>
	);
}

function sourceLine(draft: TransactionDraft): string {
	const extracted = draft.extraction ? JSON.stringify(draft.extraction) : "";
	return [draft.source, draft.receiptUrl ?? "", extracted].filter(Boolean).join(" · ");
}

/**
 * Confirmation surface for one or many drafts.
 *
 * Warnings from extraction are shown per field with an explicit acknowledge
 * control, and the primary save CTA stays disabled until every draft is valid
 * and acknowledged — a doubtful AI read can never be saved silently.
 */
export function TransactionReview({
	drafts,
	wallets,
	categories,
	canCreate,
	saveBlocked = false,
	onChange,
	onAcknowledge,
	onOpenPicker,
	onSave,
	onCancel,
	saving,
	errors,
	summary,
}: TransactionReviewProps) {
	const { language } = useI18n();
	const copy = entryCopy(language);
	const styles = useMemo(() => createStyles(), []);
	const [sourceOpen, setSourceOpen] = useState(false);

	const context = useMemo(
		() => ({ wallets, categories, canCreate }),
		[wallets, categories, canCreate],
	);
	const savable = !saving && !saveBlocked && allDraftsValid(drafts, context);

	// When the extractor is unsure about one or two fields, the reviewer should
	// not have to re-read the whole form. Name only what is unresolved and give
	// a one-tap route to the matching picker; acknowledging still happens in the
	// warning row so a doubtful read can never be saved silently.
	const focusFields = useMemo(
		() => (drafts.length === 1 ? unacknowledgedWarnings(drafts[0]) : []),
		[drafts],
	);
	const fixKindFor = (field: ReviewField): EntryPickerKind | null =>
		field === "category" || field === "wallet" || field === "date" ? field : null;

	return (
		<View style={styles.container} testID="transaction-review">
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{summary.count > 1 ? (
					<View style={styles.summary} testID="review-summary">
						<Text style={styles.summaryCount} testID="review-summary-count">
							{`${summary.count} ${copy.countUnit}`}
						</Text>
						<View style={styles.summaryTotalWrap}>
							<Text style={styles.summaryTotalLabel}>{copy.summaryTotalLabel}</Text>
							<Text style={styles.summaryTotal} testID="review-summary-total">
								{formatRupiah(summary.total)}
							</Text>
						</View>
					</View>
				) : null}

				{/* Single draft: one calm summary card with the amount as anchor, so
				    the reviewer reads the number before the editable rows. */}
				{summary.count === 1 && drafts[0] ? (
					<View style={styles.singleSummary} testID="review-summary-single">
						<Text style={styles.singleSummaryLabel}>
							{copy.singleSummaryLabel}
						</Text>
						<Text
							style={styles.singleSummaryAmount}
							testID="review-summary-single-amount"
						>
							{formatRupiah(drafts[0].amount ?? 0)}
						</Text>
						{drafts[0].description ? (
							<Text style={styles.singleSummaryMeta} numberOfLines={1}>
								{drafts[0].description}
							</Text>
						) : null}
					</View>
				) : null}

				{focusFields.length > 0 ? (
					<View style={styles.focusBanner} testID="review-focus-banner">
						<Text style={styles.focusTitle}>{copy.focusTitle}</Text>
						<View style={styles.focusChips}>
							{focusFields.map(field => {
								const kind = fixKindFor(field);
								const label = warningLabel(field, language).replace(/\.$/, "");
								return kind ? (
									<Pressable
										key={field}
										testID={`review-focus-fix-${field}`}
										accessibilityRole="button"
										accessibilityLabel={`${copy.focusFix}: ${label}`}
										accessibilityHint={copy.focusRest}
										onPress={() => onOpenPicker(drafts[0].key, kind)}
										style={styles.focusChip}
									>
										<Text style={styles.focusChipText}>{label}</Text>
									</Pressable>
								) : (
									<View key={field} style={styles.focusChipStatic}>
										<Text style={styles.focusChipText}>{label}</Text>
									</View>
								);
							})}
						</View>
						<Text style={styles.focusRest}>{copy.focusRest}</Text>
					</View>
				) : null}

				{drafts.map((draft) => {
					const draftErrors = errors?.[draft.key];
					return (
						<View key={draft.key} style={styles.card} testID={`review-draft-${draft.key}`}>
							<TransactionFields
								draft={draft}
								onChange={(patch) => onChange(draft.key, patch)}
								wallets={wallets}
								categories={categories}
								canCreate={canCreate}
								onOpenPicker={(kind) => onOpenPicker(draft.key, kind)}
								errors={draftErrors}
								testID={`draft-${draft.key}`}
							/>

							<DraftWarnings draft={draft} onAcknowledge={onAcknowledge} />
						</View>
					);
				})}

				<View style={styles.sourceBlock}>
					<Pressable
						onPress={() => setSourceOpen((open) => !open)}
						accessibilityRole="button"
						accessibilityLabel={sourceOpen ? copy.hideSource : copy.viewSource}
						accessibilityState={{ expanded: sourceOpen }}
						style={styles.sourceToggle}
						testID="review-source-toggle"
					>
						<Text style={styles.sourceToggleText}>
							{sourceOpen ? copy.hideSource : copy.viewSource}
						</Text>
						<Text
							style={styles.chevron}
							accessible={false}
							importantForAccessibility="no"
						>
							{sourceOpen ? "▾" : "▸"}
						</Text>
					</Pressable>
					{sourceOpen ? (
						<View style={styles.sourceBody} testID="review-source-body">
							<Text style={styles.sourceTitle}>{copy.sourceTitle}</Text>
							{drafts.map((draft) => (
								<Text key={draft.key} style={styles.sourceLine}>
									{sourceLine(draft)}
								</Text>
							))}
						</View>
					) : null}
				</View>
			</ScrollView>

			<View style={styles.footer} testID="review-footer">
				<Pressable
					onPress={onCancel}
					accessibilityRole="button"
					accessibilityLabel={copy.cancel}
					style={styles.cancelButton}
					testID="review-cancel"
				>
					<Text style={styles.cancelText}>{copy.cancel}</Text>
				</Pressable>
				<Pressable
					onPress={onSave}
					disabled={!savable}
					accessibilityRole="button"
					accessibilityLabel={copy.save}
					accessibilityState={{ disabled: !savable, busy: saving }}
					style={[styles.saveButton, !savable && styles.saveButtonDisabled]}
					testID="review-save"
				>
					{saving ? (
						<ActivityIndicator color={fe.white} />
					) : (
						<Text style={styles.saveText}>{copy.save}</Text>
					)}
				</Pressable>
			</View>
		</View>
	);
}

function createStyles() {
	return StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: fe.paper,
		},
		scroll: {
			flex: 1,
		},
		scrollContent: {
			padding: 16,
			gap: 14,
		},
		summary: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 12,
			backgroundColor: fe.navySurface,
			borderRadius: 18,
			paddingHorizontal: 16,
			paddingVertical: 14,
		},
		singleSummary: {
			backgroundColor: fe.white,
			borderWidth: 1,
			borderColor: fe.line,
			borderRadius: 18,
			paddingHorizontal: 16,
			paddingVertical: 14,
			gap: 2,
		},
		singleSummaryLabel: {
			color: fe.textMuted,
			fontSize: 10,
			fontWeight: "800",
			letterSpacing: 0.6,
			textTransform: "uppercase",
		},
		singleSummaryAmount: {
			color: fe.financialExpense,
			fontSize: 22,
			fontWeight: "800",
		},
		singleSummaryMeta: {
			color: fe.textSecondary,
			fontSize: 12,
		},
		summaryCount: {
			color: fe.white,
			fontSize: 15,
			fontWeight: "800",
		},
		summaryTotalWrap: {
			alignItems: "flex-end",
		},
		summaryTotalLabel: {
			color: "rgba(255,255,255,0.72)",
			fontSize: 10,
			fontWeight: "800",
			letterSpacing: 0.6,
			textTransform: "uppercase",
		},
		summaryTotal: {
			color: fe.white,
			fontSize: 18,
			fontWeight: "800",
		},
		card: {
			backgroundColor: fe.white,
			borderWidth: 1,
			borderColor: fe.line,
			borderRadius: 20,
			padding: 16,
			gap: 12,
		},
		warningBox: {
			gap: 10,
			borderRadius: 14,
			padding: 12,
			backgroundColor: "rgba(138, 75, 8, 0.08)",
			borderWidth: 1,
			borderColor: "rgba(138, 75, 8, 0.24)",
		},
		focusBanner: {
			gap: 8,
			padding: 14,
			borderRadius: 16,
			backgroundColor: "rgba(20, 71, 230, 0.06)",
			borderWidth: 1,
			borderColor: "rgba(20, 71, 230, 0.18)",
		},
		focusTitle: { color: fe.ink, fontSize: 14, fontWeight: "700" },
		focusChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
		focusChip: {
			minHeight: 44,
			justifyContent: "center",
			paddingHorizontal: 14,
			borderRadius: 12,
			backgroundColor: fe.white,
			borderWidth: 1,
			borderColor: "rgba(20, 71, 230, 0.28)",
		},
		focusChipStatic: {
			minHeight: 44,
			justifyContent: "center",
			paddingHorizontal: 14,
			borderRadius: 12,
			backgroundColor: "rgba(255, 255, 255, 0.7)",
			borderWidth: 1,
			borderColor: "rgba(20, 71, 230, 0.16)",
		},
		focusChipText: { color: fe.blue, fontSize: 13, fontWeight: "600" },
		focusRest: { color: fe.slate, fontSize: 12 },
		warningRow: {
			gap: 8,
		},
		warningText: {
			color: fe.warning,
			fontSize: 12,
			fontWeight: "700",
		},
		ackButton: {
			minHeight: 44,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 1,
			borderColor: fe.blueDeep,
			borderRadius: 999,
			paddingHorizontal: 16,
			alignSelf: "flex-start",
		},
		ackButtonText: {
			color: fe.blueDeep,
			fontSize: 13,
			fontWeight: "800",
		},
		sourceBlock: {
			gap: 8,
		},
		sourceToggle: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			minHeight: 44,
			paddingHorizontal: 4,
		},
		sourceToggleText: {
			color: fe.blue,
			fontSize: 14,
			fontWeight: "800",
		},
		chevron: {
			color: fe.decorativeMuted,
			fontSize: 20,
			fontWeight: "700",
		},
		sourceBody: {
			gap: 6,
			backgroundColor: fe.white,
			borderWidth: 1,
			borderColor: fe.line,
			borderRadius: 14,
			padding: 12,
		},
		sourceTitle: {
			color: fe.textMuted,
			fontSize: 10,
			fontWeight: "800",
			letterSpacing: 0.6,
			textTransform: "uppercase",
		},
		sourceLine: {
			color: fe.textSecondary,
			fontSize: 12,
		},
		footer: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			paddingHorizontal: 16,
			paddingTop: 12,
			paddingBottom: 16,
			backgroundColor: fe.white,
			borderTopWidth: 1,
			borderTopColor: fe.line,
		},
		cancelButton: {
			minHeight: 48,
			alignItems: "center",
			justifyContent: "center",
			borderRadius: 16,
			paddingHorizontal: 18,
			borderWidth: 1,
			borderColor: fe.line,
			backgroundColor: fe.paper,
		},
		cancelText: {
			color: fe.ink,
			fontSize: 15,
			fontWeight: "800",
		},
		saveButton: {
			flex: 1,
			minHeight: 48,
			alignItems: "center",
			justifyContent: "center",
			borderRadius: 16,
			backgroundColor: fe.blueDeep,
			paddingHorizontal: 18,
		},
		saveButtonDisabled: {
			backgroundColor: fe.slate,
			opacity: 0.55,
		},
		saveText: {
			color: fe.white,
			fontSize: 15,
			fontWeight: "800",
		},
	});
}
