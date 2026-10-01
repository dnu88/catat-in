import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { View } from "react-native";

import TabsLayout from "../app/(tabs)/_layout";
import { goBackSafely } from "../src/lib/safe-back";

declare const __dirname: string;

// `fs`/`path` are read through jest so the file needs no @types/node, and the
// `require` identifier stays untouched for `jest.mock` factory scoping.
const fs = jest.requireActual<{
	readFileSync: (filePath: string, encoding: string) => string;
	existsSync: (filePath: string) => boolean;
}>("fs");
const path = jest.requireActual<{
	join: (...segments: string[]) => string;
}>("path");

const mockUnsubscribe = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockTabs = jest.fn((props: any) => (
	<View testID="mock-tabs">{props.children}</View>
));
const mockTabsScreen = jest.fn((_props: any) => null);
let mockSegments = ["(tabs)", "index"];
let mockSimpleNavigation = false;
let mockCanGoBack = true;

const mobileRoot = path.join(__dirname, "..");

// Every route Expo Router registers under `app/(tabs)`. Simple Mode changes
// which entries the tab bar shows, never which routes exist.
const ALL_TAB_ROUTE_NAMES = [
	"index",
	"transactions",
	"capture",
	"reports",
	"settings",
	"wallets",
	"budgets",
	"bills",
	"groups",
	"imports",
	"transaction-new",
];

// Primary destination each hidden route falls back to when a cold deep link
// leaves it without navigation history. Mirrors `HIDDEN_ROUTE_BACK_FALLBACKS`
// in `app/(tabs)/_layout.tsx`.
const HIDDEN_ROUTE_BACK_FALLBACKS: Record<string, string> = {
	settings: "/(tabs)",
	wallets: "/(tabs)",
	budgets: "/(tabs)/settings",
	bills: "/(tabs)/settings",
	groups: "/(tabs)/settings",
	imports: "/(tabs)/settings",
	"transaction-new": "/(tabs)/capture",
};

const EXPECTED_PUBLIC_PWA_PATHS = [
	"login",
	"register",
	"forgot-password",
	"reset-password",
	"auth/callback",
	"help",
	"terms",
	"privacy",
	"contact",
	"account-deletion",
	"notifications",
	"upgrade",
	"transactions",
	"transaction-new",
	"capture",
	"wallets",
	"budgets",
	"bills",
	"reports",
	"groups",
	"imports",
	"settings",
];

function readMobileFile(...segments: string[]) {
	return fs.readFileSync(path.join(mobileRoot, ...segments), "utf8");
}

function spaRouteEntries() {
	const source = readMobileFile("scripts", "generate-spa-fallbacks.mjs");
	const start = source.indexOf("const spaRoutes = [");
	const end = source.indexOf("];", start);
	const block = source.slice(start, end);
	const entries: string[] = [];
	const pattern = /'([^']+)'/g;
	let match: RegExpExecArray | null = pattern.exec(block);
	while (match) {
		entries.push(match[1]);
		match = pattern.exec(block);
	}
	return entries;
}

function appRouteFileCandidates(route: string) {
	return [
		path.join("app", "(tabs)", `${route}.tsx`),
		path.join("app", `${route}.tsx`),
		path.join("app", "(auth)", `${route}.tsx`),
	];
}

jest.mock("expo-router", () => {
	const { View } = require("react-native");
	const Tabs = (props: any) => mockTabs(props);
	Tabs.Screen = (props: any) => mockTabsScreen(props);

	return {
		Redirect: ({ href }: { href: string }) => (
			<View testID={`redirect-${href}`} />
		),
		Tabs,
		useRouter: () => ({
			back: mockBack,
			replace: mockReplace,
			canGoBack: () => mockCanGoBack,
		}),
		useSegments: () => mockSegments,
	};
});


jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 24, left: 0 }),
}));

jest.mock("../src/config/features", () => ({
	featureFlags: {
		get simpleNavigation() {
			return mockSimpleNavigation;
		},
	},
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
				brandPrimaryDeep: "#0A3D78",
				brandPrimary: "#178BD0",
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
		mockSegments = ["(tabs)", "index"];
		mockSimpleNavigation = false;
		mockCanGoBack = true;
	});

	it("renders the compact floating navigation above the safe-area inset", async () => {
		render(<TabsLayout />);

		await waitFor(() => expect(mockTabs).toHaveBeenCalled());

		const screenOptions = (mockTabs.mock.calls[0][0] as any).screenOptions;
		expect(screenOptions.tabBarStyle.height).toBe(64);
		expect(screenOptions.tabBarStyle.bottom).toBe(24);
		expect(screenOptions.tabBarStyle.paddingBottom).toBe(6);
		expect(screenOptions.tabBarStyle.borderRadius).toBe(28);

		const captureScreen = mockTabsScreen.mock.calls
			.map(([props]) => props as any)
			.find((props) => props.name === "capture");
		expect(captureScreen).toBeTruthy();
		const captureIcon = captureScreen.options.tabBarIcon({ focused: false });
		expect(captureIcon.props.style[0].marginTop).toBe(0);
	});

	it("exposes exactly five accessible primary tab destinations", async () => {
		render(<TabsLayout />);
		await waitFor(() => expect(mockTabs).toHaveBeenCalled());

		const screens = mockTabsScreen.mock.calls.map(([props]) => props as any);
		const visibleScreens = screens.filter(
			(screen) => screen.options.href !== null,
		);
		expect(visibleScreens.map((screen) => screen.name)).toEqual([
			"index",
			"transactions",
			"capture",
			"reports",
			"settings",
		]);
		for (const screen of visibleScreens) {
			expect(screen.options.tabBarAccessibilityLabel).toBe(screen.options.title);
		}
	});

	it("uses Wallets as the fifth primary destination in simple navigation mode", async () => {
		mockSimpleNavigation = true;
		render(<TabsLayout />);
		await waitFor(() => expect(mockTabs).toHaveBeenCalled());

		const screens = mockTabsScreen.mock.calls.map(([props]) => props as any);
		const visibleScreens = screens.filter(
			(screen) => screen.options.href !== null,
		);
		expect(visibleScreens.map((screen) => screen.name)).toEqual([
			"index",
			"transactions",
			"capture",
			"reports",
			"wallets",
		]);
		expect(screens.find((screen) => screen.name === "settings")?.options.href).toBeNull();
		expect(screens.find((screen) => screen.name === "wallets")?.options.title).toBe("tabWallets");
	});

	it("removes the floating tab bar and duplicate native header on task routes", async () => {
		mockSegments = ["(tabs)", "transaction-new"];
		render(<TabsLayout />);
		await waitFor(() => expect(mockTabs).toHaveBeenCalled());

		const screenOptions = (mockTabs.mock.calls[0][0] as any).screenOptions;
		expect(screenOptions.tabBarStyle).toEqual({ display: "none" });

		const transactionScreen = mockTabsScreen.mock.calls
			.map(([props]) => props as any)
			.find((props) => props.name === "transaction-new");
		expect(transactionScreen.options.headerShown).toBe(false);
	});

	async function registeredScreens() {
		render(<TabsLayout />);
		await waitFor(() => expect(mockTabs).toHaveBeenCalled());
		return mockTabsScreen.mock.calls.map(([props]) => props as any);
	}

	it("registers the same route set in both navigation modes (no renames or moves)", async () => {
		const registeredByMode: Record<string, string[]> = {};

		for (const simple of [false, true]) {
			jest.clearAllMocks();
			mockSegments = ["(tabs)", "index"];
			mockSimpleNavigation = simple;
			registeredByMode[simple ? "on" : "off"] = (
				await registeredScreens()
			).map((props) => props.name);
		}

		expect([...registeredByMode.on].sort()).toEqual(
			[...ALL_TAB_ROUTE_NAMES].sort(),
		);
		expect([...registeredByMode.off].sort()).toEqual(
			[...ALL_TAB_ROUTE_NAMES].sort(),
		);
		expect(registeredByMode.on).toEqual(registeredByMode.off);
	});

	it("keeps settings, budgets, bills, groups, imports and transaction-new registered in simple mode", async () => {
		mockSimpleNavigation = true;
		const screens = await registeredScreens();
		const names = screens.map((props) => props.name);

		for (const route of [
			"settings",
			"budgets",
			"bills",
			"groups",
			"imports",
			"transaction-new",
		]) {
			expect(names).toContain(route);
		}

		const hiddenNames = screens
			.filter((props) => props.options.href === null)
			.map((props) => props.name);
		expect(hiddenNames).toEqual([
			"settings",
			"budgets",
			"bills",
			"groups",
			"imports",
			"transaction-new",
		]);
	});

	it("only changes tab-bar visibility between the two navigation modes", async () => {
		const routeNamesByMode: string[][] = [];

		for (const simple of [false, true]) {
			jest.clearAllMocks();
			mockSimpleNavigation = simple;
			const screens = await registeredScreens();
			routeNamesByMode.push(
				screens
					.filter((props) => props.options.href !== null)
					.map((props) => props.name),
			);
		}

		expect(routeNamesByMode[0]).toEqual([
			"index",
			"transactions",
			"capture",
			"reports",
			"settings",
		]);
		expect(routeNamesByMode[1]).toEqual([
			"index",
			"transactions",
			"capture",
			"reports",
			"wallets",
		]);
	});

	it("uses history back when it exists and the primary route otherwise", () => {
		const historyRouter = {
			back: jest.fn(),
			replace: jest.fn(),
			canGoBack: () => true,
		};
		goBackSafely(historyRouter, "/(tabs)/settings");
		expect(historyRouter.back).toHaveBeenCalledTimes(1);
		expect(historyRouter.replace).not.toHaveBeenCalled();

		const coldRouter = {
			back: jest.fn(),
			replace: jest.fn(),
			canGoBack: () => false,
		};
		goBackSafely(coldRouter, "/(tabs)/settings");
		expect(coldRouter.back).not.toHaveBeenCalled();
		expect(coldRouter.replace).toHaveBeenCalledWith("/(tabs)/settings");

		const legacyRouter = { back: jest.fn(), replace: jest.fn() };
		goBackSafely(legacyRouter, "/(tabs)");
		expect(legacyRouter.replace).toHaveBeenCalledWith("/(tabs)");
	});

	it.each(Object.entries(HIDDEN_ROUTE_BACK_FALLBACKS))(
		"falls back to %s's primary route when the hidden route opens cold",
		async (route, fallback) => {
			mockSegments = ["(tabs)", route];
			mockSimpleNavigation = route !== "wallets";
			mockCanGoBack = false;

			const screens = await registeredScreens();
			const screen = screens.find((props) => props.name === route);
			expect(screen.options.headerLeft).toBeTruthy();

			const header = render(<>{screen.options.headerLeft()}</>);
			fireEvent.press(header.getByLabelText("back"));

			expect(mockReplace).toHaveBeenCalledWith(fallback);
			expect(mockBack).not.toHaveBeenCalled();
		},
	);

	it.each(Object.entries(HIDDEN_ROUTE_BACK_FALLBACKS))(
		"uses history back for %s when history exists",
		async (route) => {
			mockSegments = ["(tabs)", route];
			mockSimpleNavigation = route !== "wallets";
			mockCanGoBack = true;

			const screens = await registeredScreens();
			const screen = screens.find((props) => props.name === route);
			const header = render(<>{screen.options.headerLeft()}</>);
			fireEvent.press(header.getByLabelText("back"));

			expect(mockBack).toHaveBeenCalledTimes(1);
			expect(mockReplace).not.toHaveBeenCalled();
		},
	);

	it("only ever falls back to a registered route", () => {
		for (const fallback of Object.values(HIDDEN_ROUTE_BACK_FALLBACKS)) {
			const route = fallback.replace("/(tabs)/", "");
			if (route === "/(tabs)") continue;
			expect(ALL_TAB_ROUTE_NAMES).toContain(route);
		}
		expect(ALL_TAB_ROUTE_NAMES).toContain("budgets");
		expect(ALL_TAB_ROUTE_NAMES).toContain("capture");
	});

	it("routes notifications and manual-entry back exits through the safe back helper", () => {
		const notifications = readMobileFile("app", "notifications.tsx");
		expect(notifications).toContain('goBackSafely(router, "/(tabs)")');
		expect(notifications).not.toContain("router.back()");

		const transactionNew = readMobileFile("app", "(tabs)", "transaction-new.tsx");
		expect(transactionNew).toContain('goBackSafely(router, "/(tabs)/capture")');
	});

	it("keeps the public PWA path list valid and backed by real routes", () => {
		const entries = spaRouteEntries();

		for (const route of EXPECTED_PUBLIC_PWA_PATHS) {
			expect(entries).toContain(route);
		}

		for (const route of [
			"settings",
			"wallets",
			"budgets",
			"bills",
			"groups",
			"imports",
			"notifications",
			"transaction-new",
		]) {
			expect(entries).toContain(route);
			const hasRouteFile = appRouteFileCandidates(route).some((candidate) =>
				fs.existsSync(path.join(mobileRoot, candidate)),
			);
			expect({ route, hasRouteFile }).toEqual({ route, hasRouteFile: true });
		}
	});

	it("keeps notification payload targets routable and unchanged in this phase", () => {
		const notifications = readMobileFile("app", "notifications.tsx");
		expect(notifications).toContain("item.data?.target_path");
		expect(notifications).toContain("router.push(target as never)");

		const targetedPayloads: Array<[string, string]> = [
			["../../backend/app/services/notification_events.py", "/(tabs)/budgets"],
			[
				"../../backend/scripts/generate_bill_reminder_notifications.py",
				"/(tabs)/bills",
			],
			["../../backend/scripts/generate_weekly_notifications.py", "/(tabs)/reports"],
			["../../backend/app/api/v1/ai.py", "/(tabs)/reports"],
		];

		for (const [relativePath, target] of targetedPayloads) {
			const backendSource = fs.readFileSync(
				path.join(mobileRoot, relativePath),
				"utf8",
			);
			expect(backendSource).toContain(target);
			expect(ALL_TAB_ROUTE_NAMES).toContain(target.replace("/(tabs)/", ""));
		}
	});
});
