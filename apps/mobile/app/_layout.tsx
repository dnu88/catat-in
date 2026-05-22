import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Component, type ReactNode } from "react";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider, useI18n } from "../src/i18n/i18n-context";
import { SupabaseProvider } from "../src/lib/supabase";
import { FinanceContextProvider } from "../src/state/finance-context";
import { ThemeProvider, useTheme } from "../src/theme/theme-context";

class ErrorBoundary extends Component<
	{ children: ReactNode },
	{ hasError: boolean; error: Error | null }
> {
	constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error };
	}

	render() {
		if (this.state.hasError) {
			return <RootErrorFallback />;
		}
		return this.props.children;
	}
}

function RootErrorFallback() {
	const { t } = useI18n();
	const { theme } = useTheme();

	return (
		<View
			style={{
				flex: 1,
				justifyContent: "center",
				alignItems: "center",
				padding: 20,
				backgroundColor: theme.colors.background,
			}}
		>
			<Text
				style={{
					fontSize: 18,
					fontWeight: "bold",
					marginBottom: 10,
					color: theme.colors.danger,
					textAlign: "center",
				}}
			>
				{t("appCrashedTitle")}
			</Text>
			<Text
				style={{
					fontSize: 13,
					color: theme.colors.textSecondary,
					textAlign: "center",
				}}
			>
				{t("appCrashedDescription")}
			</Text>
		</View>
	);
}

function ThemedRootStack() {
	const { theme } = useTheme();

	return (
		<>
			<StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
			<Stack
				screenOptions={{
					headerShown: false,
					contentStyle: { backgroundColor: theme.colors.background },
				}}
			>
				<Stack.Screen name="index" />
				<Stack.Screen name="(auth)" />
				<Stack.Screen name="(tabs)" />
			</Stack>
		</>
	);
}

export default function RootLayout() {
	return (
		<SafeAreaProvider>
			<SupabaseProvider>
				<I18nProvider>
					<ThemeProvider>
						<ErrorBoundary>
							<FinanceContextProvider>
								<ThemedRootStack />
							</FinanceContextProvider>
						</ErrorBoundary>
					</ThemeProvider>
				</I18nProvider>
			</SupabaseProvider>
		</SafeAreaProvider>
	);
}
