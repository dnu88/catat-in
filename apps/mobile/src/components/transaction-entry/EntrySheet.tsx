import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import {
	AccessibilityInfo,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "../../i18n/i18n-context";
import { financeEditorial as fe } from "../../theme/finance-editorial";
import { entryCopy } from "./copy";

type EntrySheetProps = {
	visible: boolean;
	title: string;
	onClose: () => void;
	children: ReactNode;
	testID?: string;
	/** Explicit host opt-in; legacy sheets retain their existing presentation. */
	premium?: boolean;
};

/**
 * Accessible bottom sheet used for every entry-flow picker.
 *
 * Built on React Native's Modal so it traps focus for assistive tech, dismisses
 * on backdrop press, Escape / Android back (onRequestClose) and an explicit
 * close control, and keeps the last row clear of the home indicator.
 */
export function EntrySheet({
	visible,
	title,
	onClose,
	children,
	testID = "entry-sheet",
	premium = false,
}: EntrySheetProps) {
	const { language } = useI18n();
	const insets = useSafeAreaInsets();
	const copy = entryCopy(language);
	const styles = useMemo(() => createStyles(), []);

	const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
	useEffect(() => {
		if (!premium) return;
		let mounted = true;
		let preferenceChanged = false;
		setReduceMotion(null);
		const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
			preferenceChanged = true;
			if (mounted) setReduceMotion(enabled);
		});
		AccessibilityInfo.isReduceMotionEnabled()
			.then((enabled) => {
				if (mounted && !preferenceChanged) setReduceMotion(enabled);
			})
			.catch(() => {
				if (mounted && !preferenceChanged) setReduceMotion(false);
			});
		return () => {
			mounted = false;
			subscription?.remove();
		};
	}, [premium]);

	const bottomPadding = Math.max(insets.bottom, 12);

	return (
		<Modal
			visible={visible}
			transparent
			animationType={premium && reduceMotion !== false ? "none" : "slide"}
			onRequestClose={onClose}
			statusBarTranslucent
		>
			<View
				style={styles.root}
				testID={testID}
				{...(premium && Platform.OS === "web" ? {
					// RN Web's document Escape listener depends on animation activation.
					// Handle only keys originating within this visible sheet, not other modals.
					onKeyUpCapture: (event: KeyboardEvent) => {
						if (visible && event.key === "Escape") {
							event.stopPropagation();
							onClose();
						}
					},
				} : {})}
			>
				<Pressable
					style={styles.backdrop}
					onPress={onClose}
					accessible={false}
					importantForAccessibility="no"
					testID={`${testID}-backdrop`}
				/>
				<View
					style={[styles.sheet, { paddingBottom: bottomPadding }]}
					accessibilityViewIsModal
					testID={`${testID}-panel`}
				>
					<View style={styles.header}>
						<Text style={styles.title} accessibilityRole="header" numberOfLines={premium ? undefined : 1}>
							{title}
						</Text>
						<Pressable
							onPress={onClose}
							accessibilityRole="button"
							accessibilityLabel={copy.close}
							style={styles.closeButton}
							hitSlop={8}
							testID={`${testID}-close`}
						>
							<Text
								style={styles.closeGlyph}
								accessible={false}
								importantForAccessibility="no"
							>
								×
							</Text>
						</Pressable>
					</View>
					<ScrollView
						style={styles.body}
						contentContainerStyle={styles.bodyContent}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
						testID={`${testID}-body`}
					>
						{children}
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}

function createStyles() {
	return StyleSheet.create({
		root: {
			flex: 1,
			justifyContent: "flex-end",
		},
		backdrop: {
			...StyleSheet.absoluteFillObject,
			backgroundColor: "rgba(6, 10, 28, 0.42)",
		},
		sheet: {
			backgroundColor: fe.paper,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			borderTopWidth: 1,
			borderColor: fe.line,
			maxHeight: "88%",
		},
		header: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 12,
			paddingHorizontal: 16,
			paddingTop: 12,
			paddingBottom: 8,
			borderBottomWidth: 1,
			borderBottomColor: fe.line,
		},
		title: {
			flexShrink: 1,
			color: fe.navy,
			fontSize: 16,
			fontWeight: "800",
		},
		closeButton: {
			minHeight: 44,
			minWidth: 44,
			alignItems: "center",
			justifyContent: "center",
			borderRadius: 22,
		},
		closeGlyph: {
			color: fe.blueDeep,
			fontSize: 24,
			fontWeight: "700",
			lineHeight: 26,
		},
		body: {
			flexGrow: 0,
		},
		bodyContent: {
			paddingHorizontal: 16,
			paddingTop: 12,
			paddingBottom: 8,
			gap: 12,
		},
	});
}
