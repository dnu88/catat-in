import { render, waitFor } from "@testing-library/react-native";
import { View } from "react-native";

import TabsLayout from "../app/(tabs)/_layout";

const mockUnsubscribe = jest.fn();
const mockTabs = jest.fn((props: any) => (
	<View testID="mock-tabs">{props.children}</View>
));
const mockTabsScreen = jest.fn((_props: any) => null);

jest.mock("expo-router", () => {
	const { View } = require("react-native");
	const Tabs = (props: any) => mockTabs(props);
	Tabs.Screen = (props: any) => mockTabsScreen(props);

	return {
		Redirect: ({ href }: { href: string }) => (
			<View testID={`redirect-${href}`} />
		),
		Tabs,
		useRouter: () => ({ back: jest.fn() }),
	};
});

jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 24, left: 0 }),
}));

jest.mock("../src/lib/supabase", () => {
	const supabase = {
		auth: {
			getSession: jest.fn(async () => ({
				data: { session: { user: { id: "user-1" } } },
			})),
			onAuthStateChange: jest.fn(() => ({
				data: { subscription: { unsubscribe: mockUnsubscribe } },
			})),
		},
	};

	return {
		useSupabase: () => ({ supabase }),
	};
});

jest.mock("../src/i18n/i18n-context", () => ({
	useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock("../src/theme/theme-context", () => ({
	useTheme: () => ({
		theme: {
			mode: "light",
			colors: {
				background: "#F5F5F0",
				tabBarBackground: "#FFFFFF",
				borderSoft: "#E5E7EB",
				brandPrimaryDeep: "#65A30D",
				brandPrimary: "#3F6212",
				textMuted: "#6B7280",
				headerBackground: "#FFFFFF",
				textPrimary: "#0A0A0A",
				textInverse: "#FFFFFF",
			},
		},
	}),
}));

describe("tabs layout spacing", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("adds safe bottom breathing room for the bottom tab and capture FAB", async () => {
		render(<TabsLayout />);

		await waitFor(() => expect(mockTabs).toHaveBeenCalled());

		const screenOptions = (mockTabs.mock.calls[0][0] as any).screenOptions;
		expect(screenOptions.tabBarStyle.height).toBeGreaterThanOrEqual(78);
		expect(screenOptions.tabBarStyle.paddingBottom).toBeGreaterThanOrEqual(18);

		const captureScreen = mockTabsScreen.mock.calls
			.map(([props]) => props as any)
			.find((props) => props.name === "capture");
		expect(captureScreen).toBeTruthy();
		const captureIcon = captureScreen.options.tabBarIcon({ focused: false });
		expect(captureIcon.props.style[0].marginTop).toBeLessThanOrEqual(-18);
	});
});
