import type { StyleProp, TextStyle } from "react-native";
import { Text } from "react-native";

import {
	type FinancialAmountRole,
	financeEditorial as fe,
	resolveFinancialAmountColor,
} from "../../theme/finance-editorial";
import {
	type ExperienceTextRole,
	resolveExperienceTextStyle,
} from "../../theme/experience-tokens";

export type AmountTextRole = FinancialAmountRole | "neutral";

type AmountTextProps = {
	/** Pre-formatted figure (e.g. `- Rp 35.000`). Formatting stays at the call site. */
	value: string;
	role?: AmountTextRole;
	/** Named presentation role. Defaults to the transaction-row figure. */
	textRole?: ExperienceTextRole;
	testID?: string;
	numberOfLines?: number;
	accessibilityLabel?: string;
	style?: StyleProp<TextStyle>;
};

/**
 * Single source for rendering a financial figure.
 *
 * - always tabular digits (amount columns line up between rows),
 * - always a semantic color from `finance-editorial`,
 * - never performs arithmetic or formatting of its own: the caller passes the
 *   already-formatted string, so no money logic can hide in a presentational
 *   component.
 */
export function AmountText({
	value,
	role = "expense",
	textRole = "rowAmount",
	testID,
	numberOfLines,
	accessibilityLabel,
	style,
}: AmountTextProps) {
	const color =
		role === "neutral" ? fe.slate : resolveFinancialAmountColor(role);

	return (
		<Text
			testID={testID}
			numberOfLines={numberOfLines}
			accessibilityLabel={accessibilityLabel}
			style={[resolveExperienceTextStyle(textRole), { color }, style]}
		>
			{value}
		</Text>
	);
}
