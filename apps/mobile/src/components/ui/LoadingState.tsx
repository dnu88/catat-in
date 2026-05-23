import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../theme/theme-context";

type LoadingStateProps = {
	label: string;
	rows?: number;
};

export function LoadingState({ label, rows = 3 }: LoadingStateProps) {
	const { theme } = useTheme();
	const styles = createStyles(theme);

	return (
		<View
			accessibilityRole="progressbar"
			accessibilityLabel={label}
			style={styles.wrap}
		>
			<Text style={styles.label}>{label}</Text>
			{Array.from({ length: rows }).map((_, index) => (
				<View key={index} style={styles.row}>
					<View style={styles.icon} />
					<View style={styles.copy}>
						<View style={[styles.line, styles.lineStrong]} />
						<View style={styles.line} />
					</View>
				</View>
			))}
		</View>
	);
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
	return StyleSheet.create({
		wrap: {
			width: "100%",
			gap: 12,
			padding: 20,
		},
		label: {
			color: theme.colors.textSecondary,
			fontSize: theme.typography.fontSize.sm,
			fontWeight: theme.typography.fontWeight.bold,
		},
		row: {
			minHeight: 64,
			borderRadius: theme.radius.lg,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.surface,
			flexDirection: "row",
			alignItems: "center",
			gap: 12,
			padding: 12,
		},
		icon: {
			width: 36,
			height: 36,
			borderRadius: theme.radius.md,
			backgroundColor: theme.colors.mutedSurface,
		},
		copy: { flex: 1, gap: 8 },
		line: {
			height: 8,
			borderRadius: theme.radius.pill,
			backgroundColor: theme.colors.mutedSurface,
			width: "58%",
		},
		lineStrong: { width: "82%" },
	});
}
