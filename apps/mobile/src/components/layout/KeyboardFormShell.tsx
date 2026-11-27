import type { PropsWithChildren } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	type KeyboardAvoidingViewProps,
	type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_FORM_BOTTOM_SPACING = 16;

export function resolveKeyboardAvoidingBehavior(
	platform: typeof Platform.OS,
): KeyboardAvoidingViewProps["behavior"] {
	return platform === "ios" ? "padding" : undefined;
}

export function resolveKeyboardDismissMode(
	platform: typeof Platform.OS,
): ScrollViewProps["keyboardDismissMode"] {
	return platform === "ios" ? "interactive" : "on-drag";
}

type KeyboardFormShellProps = PropsWithChildren<{
	testID?: string;
	scrollViewTestID?: string;
	style?: KeyboardAvoidingViewProps["style"];
	contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
	keyboardVerticalOffset?: number;
	includeTopInset?: boolean;
	bottomSpacing?: number;
	keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
	/** Primarily useful for deterministic previews and tests. */
	platform?: typeof Platform.OS;
}>;

/**
 * Keyboard-safe shell for task forms. It owns keyboard behavior and safe-area
 * content insets so individual forms do not need device-specific spacers.
 */
export function KeyboardFormShell({
	children,
	testID,
	scrollViewTestID,
	style,
	contentContainerStyle,
	keyboardVerticalOffset = 0,
	includeTopInset = true,
	bottomSpacing = DEFAULT_FORM_BOTTOM_SPACING,
	keyboardShouldPersistTaps = "handled",
	platform = Platform.OS,
}: KeyboardFormShellProps) {
	const insets = useSafeAreaInsets();
	const isIOS = platform === "ios";

	return (
		<KeyboardAvoidingView
			testID={testID}
			behavior={resolveKeyboardAvoidingBehavior(platform)}
			keyboardVerticalOffset={keyboardVerticalOffset}
			style={[styles.container, style]}
		>
			<ScrollView
				testID={scrollViewTestID}
				automaticallyAdjustKeyboardInsets={isIOS}
				keyboardDismissMode={resolveKeyboardDismissMode(platform)}
				keyboardShouldPersistTaps={keyboardShouldPersistTaps}
				contentContainerStyle={[
					styles.content,
					contentContainerStyle,
					{
						paddingTop: includeTopInset ? insets.top : 0,
						paddingBottom: insets.bottom + bottomSpacing,
					},
				]}
			>
				{children}
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flexGrow: 1,
	},
});
