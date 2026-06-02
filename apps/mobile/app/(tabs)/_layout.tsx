import { Redirect, Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";

import { KaswiseIcon } from "../../src/components/icons/kaswise-icons";
import { useI18n } from "../../src/i18n/i18n-context";
import { useSupabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/theme/theme-context";

export default function TabsLayout() {
	const { supabase } = useSupabase();
	const { theme } = useTheme();
	const { t } = useI18n();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const tabBottomPadding = Math.max(18, insets.bottom + 8);
	const tabBarHeight = 56 + tabBottomPadding;
	const [session, setSession] = useState<unknown>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			setLoading(false);
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
			if (nextSession) {
				setSession(nextSession);
				return;
			}

			// PWA OAuth callbacks can briefly emit a null session while PKCE
			// storage is still settling. Confirm before redirecting to login so
			// feature flows such as receipt upload are not interrupted mid-action.
			const {
				data: { session: confirmedSession },
			} = await supabase.auth.getSession();
			setSession(confirmedSession);
		});

		return () => subscription.unsubscribe();
	}, [supabase.auth]);

	if (loading) {
		return (
			<View
				style={[
					styles.loadingWrap,
					{ backgroundColor: theme.colors.background },
				]}
			>
				<ActivityIndicator color={theme.colors.brandPrimary} />
			</View>
		);
	}

	if (!session) {
		return <Redirect href="/(auth)/login" />;
	}

	const hiddenScreenOptions = {
		href: null,
		headerLeft: () => (
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={t("back")}
				onPress={() => router.back()}
				style={styles.headerBackButton}
			>
				<KaswiseIcon
					name="back"
					color={theme.colors.textPrimary}
					size={18}
					weight="bold"
				/>
				<Text
					style={[styles.headerBackText, { color: theme.colors.textPrimary }]}
				>
					{t("back")}
				</Text>
			</Pressable>
		),
	} as const;

	return (
		<Tabs
			screenOptions={{
				headerShown: true,
				tabBarStyle: {
					backgroundColor: theme.colors.tabBarBackground,
					borderTopColor: theme.colors.borderSoft,
					borderTopWidth: 1,
					height: tabBarHeight,
					paddingBottom: tabBottomPadding,
					paddingTop: 4,
					elevation: theme.mode === "dark" ? 0 : 4,
				},
				tabBarActiveTintColor:
					theme.mode === "light"
						? theme.colors.brandPrimaryDeep
						: theme.colors.brandPrimary,
				tabBarInactiveTintColor: theme.colors.textMuted,
				tabBarLabelStyle: {
					fontSize: 11,
					fontWeight: "700",
					marginTop: -1,
				},
				tabBarItemStyle: {
					paddingVertical: 0,
				},
				headerStyle: {
					backgroundColor: theme.colors.headerBackground,
					borderBottomColor: theme.colors.borderSoft,
					borderBottomWidth: 1,
				},
				headerTintColor: theme.colors.textPrimary,
				headerTitleStyle: {
					fontWeight: "800",
					fontSize: 18,
				},
				headerShadowVisible: false,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: t("tabDashboard"),
					headerTitle: t("headerKaswise"),
					tabBarIcon: ({ color, focused }) => (
						<KaswiseIcon
							name="home"
							color={color}
							size={focused ? 22 : 20}
							weight={focused ? "fill" : "regular"}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="transactions"
				options={{
					title: t("tabTransactions"),
					tabBarIcon: ({ color, focused }) => (
						<KaswiseIcon
							name="transactions"
							color={color}
							size={focused ? 22 : 20}
							weight={focused ? "fill" : "regular"}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="capture"
				options={{
					title: t("tabCapture"),
					tabBarLabel: "",
					tabBarIcon: ({ focused }) => (
						<View
							style={[
								styles.captureTabIcon,
								{
									backgroundColor:
										theme.mode === "light"
											? theme.colors.brandPrimaryDeep
											: theme.colors.brandPrimary,
									borderColor: theme.colors.background,
								},
							]}
						>
							<KaswiseIcon
								name="capture"
								color={theme.colors.textInverse}
								size={22}
								weight={focused ? "fill" : "bold"}
							/>
						</View>
					),
				}}
			/>
			<Tabs.Screen
				name="reports"
				options={{
					title: t("tabReports"),
					tabBarIcon: ({ color, focused }) => (
						<KaswiseIcon
							name="reports"
							color={color}
							size={focused ? 22 : 20}
							weight={focused ? "fill" : "regular"}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: t("tabSettings"),
					tabBarIcon: ({ color, focused }) => (
						<KaswiseIcon
							name="settings"
							color={color}
							size={focused ? 22 : 20}
							weight={focused ? "fill" : "regular"}
						/>
					),
				}}
			/>

			<Tabs.Screen
				name="wallets"
				options={{
					...hiddenScreenOptions,
					title: "Wallets",
					headerTitle: t("headerWallets"),
				}}
			/>
			<Tabs.Screen
				name="budgets"
				options={{
					...hiddenScreenOptions,
					title: "Budgets",
					headerTitle: t("headerBudgets"),
				}}
			/>
			<Tabs.Screen
				name="bills"
				options={{
					...hiddenScreenOptions,
					title: "Bills",
					headerTitle: t("headerBills"),
				}}
			/>
			<Tabs.Screen
				name="groups"
				options={{
					...hiddenScreenOptions,
					title: "Groups",
					headerTitle: t("headerGroups"),
				}}
			/>
			<Tabs.Screen
				name="imports"
				options={{
					...hiddenScreenOptions,
					title: "Imports",
					headerTitle: t("headerImports"),
				}}
			/>
			<Tabs.Screen
				name="transaction-new"
				options={{
					...hiddenScreenOptions,
					title: "Manual",
					headerTitle: t("headerManualTransaction"),
				}}
			/>
		</Tabs>
	);
}

const styles = StyleSheet.create({
	loadingWrap: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	captureTabIcon: {
		width: 44,
		height: 44,
		borderRadius: 22,
		borderWidth: 3,
		alignItems: "center",
		justifyContent: "center",
		marginTop: -20,
	},
	headerBackButton: {
		minHeight: 44,
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginLeft: 12,
		paddingRight: 12,
	},
	headerBackText: {
		fontSize: 15,
		fontWeight: "700",
	},
});
