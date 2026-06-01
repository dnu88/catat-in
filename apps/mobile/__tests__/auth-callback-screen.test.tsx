import { render, screen, waitFor } from "@testing-library/react-native";


const mockReplace = jest.fn();
let mockParams: Record<string, string | string[]> = { code: "oauth-code" };
const mockGetInitialURL = jest.fn<Promise<string | null>, []>(async () => null);
const mockExchangeCodeForSession = jest.fn<Promise<{ error: Error | null }>, [string]>(
	async () => ({ error: null }),
);
const mockGetSession = jest.fn<
	Promise<{ data: { session: { access_token: string } | null } }>,
	[]
>(async () => ({ data: { session: null } }));
const mockSupabase = {
	auth: {
		exchangeCodeForSession: mockExchangeCodeForSession,
		getSession: mockGetSession,
	},
};

jest.mock("expo-router", () => ({
	router: { replace: mockReplace },
	useLocalSearchParams: () => mockParams,
}));

jest.mock("expo-linking", () => ({
	getInitialURL: () => mockGetInitialURL(),
}));

jest.mock("../src/lib/supabase", () => ({
	useSupabase: () => ({ supabase: mockSupabase }),
}));

jest.mock("../src/i18n/i18n-context", () => ({
	useI18n: () => ({
		t: (key: string) =>
			({
				authCallbackLoading: "Processing login...",
				authCallbackFailed: "Login could not be completed.",
				authCallbackTitle: "Completing login",
				authCallbackSubtitle: "Please wait",
			}[key] ?? key),
	}),
}));

jest.mock("../src/components/motion", () => {
	const { View } = require("react-native");
	return {
		StaggeredStack: ({ children }: { children: React.ReactNode }) => (
			<View>{children}</View>
		),
	};
});

jest.mock("../src/components/ui", () => {
	const { Text, View } = require("react-native");
	return {
		AuthScreenLayout: ({ children }: { children: React.ReactNode }) => (
			<View>{children}</View>
		),
		AuthHeroPanel: ({ title }: { title: string }) => <Text>{title}</Text>,
		AuthFormCard: ({ children, title }: { children: React.ReactNode; title: string }) => (
			<View>
				<Text>{title}</Text>
				{children}
			</View>
		),
		StateMessage: ({ message, tone }: { message: string; tone: string }) => (
			<Text testID="auth-callback-message">{`${tone}:${message}`}</Text>
		),
	};
});

const AuthCallbackScreen = require("../app/(auth)/callback").default as React.ComponentType;

describe("AuthCallbackScreen Google OAuth handling", () => {
	beforeEach(() => {
		mockReplace.mockClear();
		mockParams = { code: "oauth-code" };
		mockGetInitialURL.mockReset();
		mockGetInitialURL.mockResolvedValue(null);
		mockExchangeCodeForSession.mockReset();
		mockExchangeCodeForSession.mockResolvedValue({ error: null });
		mockGetSession.mockReset();
		mockGetSession.mockResolvedValue({ data: { session: null } });
	});

	it("exchanges the OAuth code and redirects to tabs", async () => {
		render(<AuthCallbackScreen />);

		await waitFor(() =>
			expect(mockExchangeCodeForSession).toHaveBeenCalledWith("oauth-code"),
		);
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
		expect(screen.getByTestId("auth-callback-message").props.children).toBe(
			"success:Processing login...",
		);
	});

	it("treats an existing session as success when code exchange is replayed", async () => {
		mockExchangeCodeForSession.mockResolvedValueOnce({
			error: new Error("auth code already used"),
		});
		mockGetSession.mockResolvedValueOnce({
			data: { session: { access_token: "token" } },
		});

		render(<AuthCallbackScreen />);

		await waitFor(() => expect(mockGetSession).toHaveBeenCalled());
		expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
		expect(screen.getByTestId("auth-callback-message").props.children).toBe(
			"success:Processing login...",
		);
	});

	it("shows the callback error only when there is no code and no session", async () => {
		mockParams = {};

		render(<AuthCallbackScreen />);

		await waitFor(() =>
			expect(screen.getByTestId("auth-callback-message").props.children).toBe(
				"error:Login could not be completed.",
			),
		);
		expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
		expect(mockReplace).not.toHaveBeenCalled();
	});
});
