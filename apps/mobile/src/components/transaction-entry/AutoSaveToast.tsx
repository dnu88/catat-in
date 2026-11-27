import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type AutoSaveToastProps = {
	/** e.g. "Tersimpan: Makan & Minum · Rp35.000" */
	title: string;
	actionLabel: string;
	editLabel: string;
	timeoutMs?: number;
	bottomOffset?: number;
	onUndo: () => void;
	onEdit: () => void;
	onExpire: () => void;
};

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Floating notice shown right after an automatic save. It stays for 10 seconds
 * (per the agreed decision) so the user can undo it or open the entry for
 * editing; after that the save is treated as accepted.
 *
 * Both actions keep a 44px touch target so the bar stays usable one-handed.
 */
export function AutoSaveToast({
	title,
	bottomOffset = 16,
	actionLabel,
	editLabel,
	timeoutMs = DEFAULT_TIMEOUT_MS,
	onUndo,
	onEdit,
	onExpire,
}: AutoSaveToastProps) {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		timerRef.current = setTimeout(onExpire, timeoutMs);
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [onExpire, timeoutMs]);

	return (
		<View style={[styles.container, { bottom: bottomOffset }]} testID="auto-save-toast">
			<Text style={styles.title} numberOfLines={2}>
				{title}
			</Text>
			<View style={styles.actions}>
				<Pressable
					testID="auto-save-undo"
					accessibilityRole="button"
					style={styles.action}
					onPress={onUndo}
				>
					<Text style={styles.actionText}>{actionLabel}</Text>
				</Pressable>
				<Pressable
					testID="auto-save-edit"
					accessibilityRole="button"
					style={styles.action}
					onPress={onEdit}
				>
					<Text style={styles.actionText}>{editLabel}</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		left: 16,
		right: 16,
		bottom: 16,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 16,
		backgroundColor: "#0B1F3B",
		shadowColor: "#000000",
		shadowOpacity: 0.2,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		elevation: 6,
		zIndex: 20,
	},
	title: {
		color: "#FFFFFF",
		flexShrink: 1,
		fontSize: 13,
	},
	actions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginLeft: 12,
	},
	action: {
		minHeight: 44,
		minWidth: 44,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 8,
	},
	actionText: {
		color: "#FFFFFF",
		fontWeight: "700",
		fontSize: 13,
		textDecorationLine: "underline",
	},
});
