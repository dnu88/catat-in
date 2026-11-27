import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FLOATING_TAB_MIN_BOTTOM_OFFSET = 10;
const DEFAULT_CONTENT_SPACING = 16;
// Mirrors the floating tab bar height defined in app/(tabs)/_layout.tsx.
const FLOATING_TAB_BAR_HEIGHT = 64;

type ResolveScreenInsetsOptions = {
	topSafeArea: number;
	bottomSafeArea: number;
	tabBarHeight?: number;
	includeTopInset?: boolean;
	bottomSpacing?: number;
};

export function resolveScreenInsets({
	topSafeArea,
	bottomSafeArea,
	tabBarHeight = 0,
	includeTopInset = true,
	bottomSpacing = DEFAULT_CONTENT_SPACING,
}: ResolveScreenInsetsOptions) {
	const safeBottom = Math.max(0, bottomSafeArea);
	const navigationInset =
		tabBarHeight > 0
			? tabBarHeight + Math.max(FLOATING_TAB_MIN_BOTTOM_OFFSET, safeBottom)
			: safeBottom;

	return {
		paddingTop: includeTopInset ? Math.max(0, topSafeArea) : 0,
		paddingBottom: navigationInset + bottomSpacing,
	};
}

type ScreenShellProps = PropsWithChildren<
	ViewProps & {
		includeTopInset?: boolean;
		bottomSpacing?: number;
	}
>;

export function OperationalScreen({
	children,
	style,
	includeTopInset = true,
	bottomSpacing = DEFAULT_CONTENT_SPACING,
	...viewProps
}: ScreenShellProps) {
	const insets = useSafeAreaInsets();
	const contentInsets = resolveScreenInsets({
		topSafeArea: insets.top,
		bottomSafeArea: insets.bottom,
		includeTopInset,
		bottomSpacing,
	});

	return (
		<View {...viewProps} style={[styles.screen, contentInsets, style]}>
			{children}
		</View>
	);
}

export function TabScreen({
	children,
	style,
	includeTopInset = true,
	bottomSpacing = DEFAULT_CONTENT_SPACING,
	...viewProps
}: ScreenShellProps) {
	const insets = useSafeAreaInsets();
	const contentInsets = resolveScreenInsets({
		topSafeArea: insets.top,
		bottomSafeArea: insets.bottom,
		tabBarHeight: FLOATING_TAB_BAR_HEIGHT,
		includeTopInset,
		bottomSpacing,
	});

	return (
		<View {...viewProps} style={[styles.screen, contentInsets, style]}>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
});
