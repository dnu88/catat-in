import { useMemo, type ReactNode } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";

import type { Language } from "../../i18n/i18n-context";
import { financeEditorial as fe } from "../../theme/finance-editorial";
import { experienceTokens } from "../../theme/experience-tokens";
import { formatRupiah } from "./copy";

/**
 * Batch review surface: one summary, collapsed rows, and ONE save CTA.
 *
 * Presentation only. The controller owns the drafts, the request/fingerprint,
 * the atomic save and the persisted IDs; this component renders the summary,
 * the rows, and forwards callbacks. Problem rows are surfaced (badge + the
 * controller expands them) so a doubtful row is never hidden behind a fold.
 */

export type BatchReviewRow = {
	key: string;
	description: string;
	amount: number | null;
	category: string;
	walletName: string;
	/** Unresolved extraction warning on this row. */
	hasWarning: boolean;
	/** Hard field error on this row. */
	invalid: boolean;
};

export type BatchReviewCopy = {
	countUnit: string;
	totalLabel: string;
	saveN: (count: number) => string;
	needsReview: string;
	viewerNotice: string;
	editRow: string;
	expandRow: string;
	collapseRow: string;
	amountMissing: string;
};

const COPY: Record<Language, BatchReviewCopy> = {
	id: {
		countUnit: "transaksi",
		totalLabel: "Total",
		saveN: (count) => `Simpan ${count} transaksi`,
		needsReview: "Perlu ditinjau",
		viewerNotice: "Kamu tidak punya akses untuk mencatat di konteks ini.",
		editRow: "Ubah",
		expandRow: "Buka",
		collapseRow: "Tutup",
		amountMissing: "Nominal belum diisi",
	},
	en: {
		countUnit: "transactions",
		totalLabel: "Total",
		saveN: (count) => `Save ${count} transactions`,
		needsReview: "Needs review",
		viewerNotice: "You do not have access to record here.",
		editRow: "Edit",
		expandRow: "Open",
		collapseRow: "Close",
		amountMissing: "Amount not set",
	},
};

export function batchReviewCopy(language: Language): BatchReviewCopy {
	return COPY[language] ?? COPY.id;
}

/**
 * Rows that must start open: anything with an unresolved warning or a hard
 * field error. Healthy rows stay folded so the list is not exhausting.
 */
export function initialExpandedKeys(rows: BatchReviewRow[]): string[] {
	return rows
		.filter((row) => row.hasWarning || row.invalid)
		.map((row) => row.key);
}

export type BatchReviewListProps = {
	rows: BatchReviewRow[];
	count: number;
	total: number;
	canCreate: boolean;
	saveBlocked?: boolean;
	saving: boolean;
	/** Controller-owned: which rows are currently open. */
	expandedKeys: string[];
	onToggleRow: (key: string) => void;
	onEditRow: (key: string) => void;
	onSave: () => void;
	copy: BatchReviewCopy;
	renderRowEditor?: (row: BatchReviewRow) => ReactNode;
};

export function BatchReviewList({
	rows,
	count,
	total,
	canCreate,
	saveBlocked = false,
	saving,
	expandedKeys,
	onToggleRow,
	onEditRow,
	onSave,
	copy,
	renderRowEditor,
}: BatchReviewListProps) {
	const styles = useMemo(() => createStyles(), []);
	const expanded = useMemo(() => new Set(expandedKeys), [expandedKeys]);

	const saveDisabled = saving || !canCreate || saveBlocked;

	const handleSave = () => {
		if (saveDisabled) return;
		onSave();
	};

	return (
		<View style={styles.container} testID="batch-review">
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.summary} testID="batch-review-summary">
					<Text style={styles.summaryCount} testID="batch-review-count">
						{`${count} ${copy.countUnit}`}
					</Text>
					<View style={styles.summaryTotalWrap}>
						<Text style={styles.summaryTotalLabel}>{copy.totalLabel}</Text>
						<Text style={styles.summaryTotal} testID="batch-review-total">
							{formatRupiah(total)}
						</Text>
					</View>
				</View>

				{!canCreate ? (
					<View style={styles.viewerCard} testID="batch-review-viewer">
						<Text style={styles.viewerText}>{copy.viewerNotice}</Text>
					</View>
				) : null}

				{rows.map((row) => {
					const isOpen = expanded.has(row.key);
					const problem = row.hasWarning || row.invalid;
					return (
						<View key={row.key} style={styles.card} testID={`batch-review-row-${row.key}`}>
							<Pressable
								onPress={() => onToggleRow(row.key)}
								accessibilityRole="button"
								accessibilityLabel={isOpen ? copy.collapseRow : copy.expandRow}
								accessibilityState={{ expanded: isOpen }}
								style={styles.rowHeader}
								testID={`batch-review-toggle-${row.key}`}
							>
								<View style={styles.rowMain}>
									<Text style={styles.rowDescription} numberOfLines={1}>
										{row.description}
									</Text>
									<Text style={styles.rowMeta} numberOfLines={1}>
										{row.amount === null
											? copy.amountMissing
											: `${formatRupiah(row.amount)} · ${row.category} · ${row.walletName}`}
									</Text>
								</View>

								{problem ? (
									<Text
										style={styles.badge}
										testID={`batch-review-badge-${row.key}`}
										accessibilityRole="alert"
									>
										{`⚠ ${copy.needsReview}`}
									</Text>
								) : null}

								<Text
									style={styles.chevron}
									accessible={false}
									importantForAccessibility="no"
								>
									{isOpen ? "▾" : "▸"}
								</Text>
							</Pressable>

							{isOpen && renderRowEditor ? (
								<View style={styles.rowEditor}>
									{renderRowEditor(row)}
									<Pressable
										onPress={() => onEditRow(row.key)}
										accessibilityRole="button"
										accessibilityLabel={copy.editRow}
										style={styles.editButton}
										testID={`batch-review-edit-${row.key}`}
									>
										<Text style={styles.editButtonText}>{copy.editRow}</Text>
									</Pressable>
								</View>
							) : null}
						</View>
					);
				})}
			</ScrollView>

			<View style={styles.footer} testID="batch-review-footer">
				<Pressable
					onPress={handleSave}
					disabled={saveDisabled}
					accessibilityRole="button"
					accessibilityLabel={copy.saveN(count)}
					accessibilityState={{ disabled: saveDisabled, busy: saving }}
					style={[styles.saveButton, saveDisabled && styles.saveButtonDisabled]}
					testID="batch-review-save"
				>
					{saving ? (
						<ActivityIndicator color={fe.white} />
					) : (
						<Text style={styles.saveText}>{copy.saveN(count)}</Text>
					)}
				</Pressable>
			</View>
		</View>
	);
}

function createStyles() {
	return StyleSheet.create({
		container: { flex: 1, backgroundColor: fe.paper },
		scroll: { flex: 1 },
		scrollContent: { padding: 16, gap: 12 },
		summary: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 12,
			backgroundColor: fe.navySurface,
			borderRadius: experienceTokens.radius[4],
			paddingHorizontal: 16,
			paddingVertical: 14,
		},
		summaryCount: { color: fe.white, fontSize: 15, fontWeight: "800" },
		summaryTotalWrap: { alignItems: "flex-end" },
		summaryTotalLabel: {
			color: "rgba(255,255,255,0.72)",
			fontSize: experienceTokens.type.caption,
			fontWeight: "700",
			letterSpacing: 0.6,
			textTransform: "uppercase",
		},
		summaryTotal: { color: fe.white, fontSize: 18, fontWeight: "800" },
		viewerCard: {
			backgroundColor: "#EEF4FF",
			borderColor: "rgba(12,78,145,0.22)",
			borderWidth: 1,
			borderRadius: experienceTokens.radius[2],
			padding: 12,
		},
		viewerText: { color: fe.navySurface, fontSize: experienceTokens.type.helper },
		card: {
			backgroundColor: fe.white,
			borderColor: fe.line,
			borderWidth: 1,
			borderRadius: experienceTokens.radius[2],
			overflow: "hidden",
		},
		rowHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			paddingHorizontal: 14,
			paddingVertical: 12,
			minHeight: experienceTokens.target.rowMinHeight,
		},
		rowMain: { flex: 1, gap: 2 },
		rowDescription: {
			color: fe.ink,
			fontSize: experienceTokens.type.body,
			fontWeight: "700",
		},
		rowMeta: { color: fe.textMuted, fontSize: experienceTokens.type.helper },
		badge: {
			color: fe.warning,
			backgroundColor: "#FFF6E9",
			borderColor: "rgba(138,75,8,0.28)",
			borderWidth: 1,
			borderRadius: experienceTokens.radius[6],
			paddingHorizontal: 8,
			paddingVertical: 3,
			fontSize: experienceTokens.type.caption,
			fontWeight: "700",
			overflow: "hidden",
		},
		chevron: { color: fe.decorativeMuted, fontSize: 12 },
		rowEditor: {
			borderTopColor: fe.line,
			borderTopWidth: 1,
			padding: 14,
			gap: 10,
		},
		editButton: {
			alignSelf: "flex-start",
			borderColor: fe.line,
			borderWidth: 1,
			borderRadius: experienceTokens.radius[6],
			paddingHorizontal: 12,
			paddingVertical: 8,
			minHeight: experienceTokens.target.minTouch,
			justifyContent: "center",
		},
		editButtonText: {
			color: fe.navy,
			fontSize: 12.5,
			fontWeight: "600",
		},
		footer: {
			borderTopColor: fe.line,
			borderTopWidth: 1,
			backgroundColor: fe.white,
			padding: 14,
		},
		saveButton: {
			backgroundColor: fe.navy,
			borderRadius: experienceTokens.radius[3],
			minHeight: experienceTokens.target.ctaHeight,
			alignItems: "center",
			justifyContent: "center",
		},
		saveButtonDisabled: { backgroundColor: "#C6D6EA" },
		saveText: { color: fe.white, fontSize: 14, fontWeight: "700" },
	});
}
