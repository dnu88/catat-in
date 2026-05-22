import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n } from "../i18n/i18n-context";
import { useFinanceContext } from "../state/finance-context";
import { useTheme } from "../theme/theme-context";

export function FinanceContextSwitcher() {
	const { theme } = useTheme();
	const { language } = useI18n();
	const isEn = language === "en";
	const { activeContext, memberships, setPersonalContext, setActiveHousehold } =
		useFinanceContext();
	const [open, setOpen] = useState(false);
	const styles = useMemo(() => createStyles(theme), [theme]);

	const activeMembership =
		activeContext.type === "household"
			? memberships.find(
					(membership) => membership.household_id === activeContext.householdId,
				)
			: undefined;
	const personalLabel = isEn ? "Personal" : "Pribadi";
	const activeLabel = activeMembership?.households?.name ?? personalLabel;

	const choosePersonal = () => {
		setPersonalContext();
		setOpen(false);
	};

	const chooseHousehold = (householdId: string) => {
		setActiveHousehold(householdId);
		setOpen(false);
	};

	return (
		<View style={styles.container}>
			<Pressable
				testID="finance-context-switcher"
				accessibilityRole="button"
				accessibilityLabel={`${isEn ? "Choose finance context" : "Pilih konteks keuangan"}, ${isEn ? "currently" : "saat ini"} ${activeLabel}`}
				accessibilityState={{ expanded: open }}
				style={styles.trigger}
				onPress={() => setOpen((current) => !current)}
			>
				<View style={styles.iconBubble}>
					<Text style={styles.iconText}>
						{activeContext.type === "household" ? "⌂" : "•"}
					</Text>
				</View>
				<View style={styles.labelBlock}>
					<Text style={styles.caption}>{isEn ? "Context" : "Konteks"}</Text>
					<Text style={styles.label} numberOfLines={1}>
						{activeLabel}
					</Text>
				</View>
				<Text style={styles.caret}>{open ? "⌃" : "⌄"}</Text>
			</Pressable>

			{open ? (
				<View style={styles.menu}>
					<Pressable
						testID="finance-context-option-personal"
						accessibilityRole="button"
						accessibilityState={{ selected: activeContext.type === "personal" }}
						style={[
							styles.option,
							activeContext.type === "personal" && styles.optionActive,
						]}
						onPress={choosePersonal}
					>
						<Text style={styles.optionTitle}>{personalLabel}</Text>
						<Text style={styles.optionMeta}>{isEn ? "Personal finance" : "Keuangan pribadi"}</Text>
					</Pressable>

					{memberships.map((membership) => {
						const householdName = membership.households?.name ?? (isEn ? "Family" : "Keluarga");
						const isActive =
							activeContext.type === "household" &&
							activeContext.householdId === membership.household_id;

						return (
							<Pressable
								key={membership.household_id}
								testID={`finance-context-option-${membership.household_id}`}
								accessibilityRole="button"
								accessibilityState={{ selected: isActive }}
								style={[styles.option, isActive && styles.optionActive]}
								onPress={() => chooseHousehold(membership.household_id)}
							>
								<Text style={styles.optionTitle}>{householdName}</Text>
								<Text style={styles.optionMeta}>{membership.role}</Text>
							</Pressable>
						);
					})}
				</View>
			) : null}
		</View>
	);
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
	return StyleSheet.create({
		container: {
			position: "relative",
			zIndex: 10,
			flexShrink: 1,
			minWidth: 0,
		},
		trigger: {
			minWidth: 0,
			maxWidth: 150,
			minHeight: 44,
			borderRadius: theme.radius.lg,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.card,
			paddingHorizontal: theme.spacing.sm,
			paddingVertical: 6,
			flexDirection: "row",
			alignItems: "center",
			gap: theme.spacing.sm,
			...theme.shadow.sm,
		},
		iconBubble: {
			width: 24,
			height: 24,
			borderRadius: theme.radius.pill,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: `${theme.colors.brandPrimary}18`,
		},
		iconText: {
			color: theme.colors.brandPrimary,
			fontWeight: "800",
		},
		labelBlock: {
			flex: 1,
			minWidth: 0,
		},
		caption: {
			color: theme.colors.textMuted,
			fontSize: theme.typography.fontSize.xs,
			fontWeight: theme.typography.fontWeight.semibold,
		},
		label: {
			color: theme.colors.textPrimary,
			fontSize: theme.typography.fontSize.sm,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		caret: {
			color: theme.colors.textSecondary,
			fontSize: 14,
			fontWeight: "800",
		},
		menu: {
			position: "absolute",
			top: 50,
			right: 0,
			width: 220,
			borderRadius: theme.radius.lg,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.surfaceElevated,
			padding: theme.spacing.xs,
			...theme.shadow.md,
		},
		option: {
			minHeight: 44,
			borderRadius: theme.radius.md,
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.sm,
			justifyContent: "center",
		},
		optionActive: {
			backgroundColor: `${theme.colors.brandPrimary}14`,
		},
		optionTitle: {
			color: theme.colors.textPrimary,
			fontSize: theme.typography.fontSize.md,
			fontWeight: theme.typography.fontWeight.extrabold,
		},
		optionMeta: {
			color: theme.colors.textMuted,
			fontSize: theme.typography.support.fontSize,
			marginTop: 2,
			textTransform: "capitalize",
		},
	});
}
