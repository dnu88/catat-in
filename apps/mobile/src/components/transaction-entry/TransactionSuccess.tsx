import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n } from "../../i18n/i18n-context";
import { financeEditorial as fe } from "../../theme/finance-editorial";
import { entryCopy, formatRupiah } from "./copy";

type TransactionSuccessProps = {
	destinationLabel: string;
	description: string;
	amount: number;
	count: number;
	onCaptureAnother: () => void;
	onViewTransactions: () => void;
	testID?: string;
};

/**
 * Success surface shown after a save commits.
 *
 * This is the only place the success green is allowed: a single confirmation
 * badge. Everything else stays navy/blue on warm paper.
 */
export function TransactionSuccess({
	destinationLabel,
	description,
	amount,
	count,
	onCaptureAnother,
	onViewTransactions,
	testID = "transaction-success",
}: TransactionSuccessProps) {
	const { language } = useI18n();
	const copy = entryCopy(language);
	const styles = useMemo(() => createStyles(), []);

	return (
		<View style={styles.container} testID={testID}>
			<View style={styles.badge} testID={`${testID}-badge`}>
				<Text style={styles.badgeGlyph} accessible={false} importantForAccessibility="no">
					✓
				</Text>
			</View>

			<Text style={styles.title} accessibilityRole="header">
				{copy.successTitle}
			</Text>

			<Text style={styles.amount} testID={`${testID}-amount`}>
				{formatRupiah(amount)}
			</Text>

			<Text style={styles.destination} testID={`${testID}-destination`}>
				{`${copy.destinationPrefix}: ${destinationLabel}`}
			</Text>

			{description ? (
				<Text style={styles.description} testID={`${testID}-description`}>
					{description}
				</Text>
			) : null}

			{count > 1 ? (
				<Text style={styles.count} testID={`${testID}-count`}>
					{`${count} ${copy.successCountUnit}`}
				</Text>
			) : null}

			<Pressable
				onPress={onCaptureAnother}
				accessibilityRole="button"
				accessibilityLabel={copy.captureAnother}
				style={styles.primaryButton}
				testID={`${testID}-capture-another`}
			>
				<Text style={styles.primaryButtonText}>{copy.captureAnother}</Text>
			</Pressable>

			<Pressable
				onPress={onViewTransactions}
				accessibilityRole="button"
				accessibilityLabel={copy.viewTransactions}
				style={styles.secondaryButton}
				testID={`${testID}-view-transactions`}
			>
				<Text style={styles.secondaryButtonText}>{copy.viewTransactions}</Text>
			</Pressable>
		</View>
	);
}

function createStyles() {
	return StyleSheet.create({
		container: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			gap: 12,
			paddingHorizontal: 24,
			paddingVertical: 32,
			backgroundColor: fe.paper,
		},
		badge: {
			width: 72,
			height: 72,
			borderRadius: 36,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: "rgba(34, 197, 94, 0.14)",
			borderWidth: 1,
			borderColor: "rgba(34, 197, 94, 0.32)",
		},
		badgeGlyph: {
			color: fe.successText,
			fontSize: 34,
			fontWeight: "800",
			lineHeight: 38,
		},
		title: {
			color: fe.navy,
			fontSize: 20,
			fontWeight: "800",
			textAlign: "center",
		},
		amount: {
			color: fe.financialTotal,
			fontSize: 30,
			fontWeight: "800",
			textAlign: "center",
		},
		destination: {
			color: fe.blueDeep,
			fontSize: 15,
			fontWeight: "700",
			textAlign: "center",
		},
		description: {
			color: fe.textSecondary,
			fontSize: 14,
			textAlign: "center",
		},
		count: {
			color: fe.textMuted,
			fontSize: 13,
			fontWeight: "700",
			textAlign: "center",
		},
		primaryButton: {
			alignSelf: "stretch",
			minHeight: 48,
			alignItems: "center",
			justifyContent: "center",
			borderRadius: 16,
			backgroundColor: fe.blueDeep,
			marginTop: 8,
			paddingHorizontal: 18,
		},
		primaryButtonText: {
			color: fe.white,
			fontSize: 15,
			fontWeight: "800",
		},
		secondaryButton: {
			alignSelf: "stretch",
			minHeight: 48,
			alignItems: "center",
			justifyContent: "center",
			borderRadius: 16,
			borderWidth: 1,
			borderColor: fe.blueDeep,
			backgroundColor: fe.white,
			paddingHorizontal: 18,
		},
		secondaryButtonText: {
			color: fe.blueDeep,
			fontSize: 15,
			fontWeight: "800",
		},
	});
}
