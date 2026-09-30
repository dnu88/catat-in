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
import { financeEditorial as fe } from "../../src/theme/finance-editorial";

export default function TabsLayout() {
	const { supabase } = useSupabase();
	const { theme } = useTheme();
	const { t } = useI18n();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const tabBottomOffset = Math.max(10, insets.bottom);
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
					{ backgroundColor: fe.paper },
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
				tabBarShowLabel: false,
				tabBarStyle: {
					position: "absolute",
					left: 20,
					right: 20,
					bottom: tabBottomOffset,
					backgroundColor: fe.paper,
					borderTopWidth: 0,
					height: 64,
					paddingBottom: 6,
					paddingTop: 6,
					borderRadius: 28,
					elevation: 12,
					shadowColor: fe.navy,
					shadowOpacity: 0.16,
					shadowRadius: 22,
				},
				tabBarActiveTintColor: fe.white,
				tabBarInactiveTintColor: fe.slate,
				tabBarLabelStyle: {
					fontSize: 11,
					fontWeight: "700",
					marginTop: -1,
				},
				tabBarItemStyle: {
					paddingVertical: 0,
				},
				headerStyle: {
					backgroundColor: fe.white,
					borderBottomColor: fe.line,
					borderBottomWidth: 1,
				},
				headerTintColor: fe.ink,
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
					headerShown: false,
					tabBarIcon: ({ color, focused }) => (
						<View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
							<KaswiseIcon name="home" color={color} size={20} weight={focused ? "fill" : "regular"} />
						</View>
					),
				}}
			/>
			<Tabs.Screen
				name="transactions"
				options={{
					title: t("tabTransactions"),
					headerShown: false,
					tabBarIcon: ({ color, focused }) => (
						<View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
							<KaswiseIcon name="transactions" color={color} size={20} weight={focused ? "fill" : "regular"} />
						</View>
					),
				}}
			/>
			<Tabs.Screen
			  name="capture"
				options={{
					title: t("tabCapture"),
					headerShown: false,
					tabBarLabel: "",
					tabBarIcon: ({ focused }) => (
						<View
							style={[
								styles.captureTabIcon,
								{
									backgroundColor: fe.ink,
									borderColor: fe.paper,
								},
							]}
						>
							<KaswiseIcon
								name="capture"
								color={fe.white}
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
					headerShown: false,
					tabBarIcon: ({ color, focused }) => (
						<View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
							<KaswiseIcon name="reports" color={color} size={20} weight={focused ? "fill" : "regular"} />
						</View>
					),
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: t("tabSettings"),
					headerShown: false,
					tabBarIcon: ({ color, focused }) => (
						<View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
							<KaswiseIcon name="settings" color={color} size={20} weight={focused ? "fill" : "regular"} />
						</View>
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
	tabIconWrap: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	tabIconActive: {
		backgroundColor: fe.navySurface,
	},
	captureTabIcon: {
		width: 44,
		height: 44,
		borderRadius: 22,
		borderWidth: 3,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 0,
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
