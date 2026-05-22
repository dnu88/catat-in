import React from "react";
import { Text, Pressable } from "react-native";
import {
	render,
	screen,
	fireEvent,
	waitFor,
} from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { FinanceContextProvider, useFinanceContext } from "./finance-context";

jest.mock("../lib/supabase", () => ({
	supabase: {
		auth: {
			onAuthStateChange: jest.fn(() => ({
				data: { subscription: { unsubscribe: jest.fn() } },
			})),
		},
	},
}));

const memberships = [
	{
		id: "m1",
		household_id: "hh-1",
		user_id: "user-1",
		role: "admin",
		status: "active",
		joined_at: "",
		created_at: "",
		updated_at: "",
		households: {
			id: "hh-1",
			name: "Keluarga Budi",
			invite_code: "ABC123",
			owner_id: "user-1",
			created_at: "",
			updated_at: "",
		},
	},
];

function Harness() {
	const {
		activeContext,
		memberships,
		setActiveHousehold,
		setPersonalContext,
		canCreate,
	} = useFinanceContext();
	return (
		<>
			<Text testID="context-type">{activeContext.type}</Text>
			<Text testID="membership-count">{memberships.length}</Text>
			<Text testID="can-create">{canCreate ? "yes" : "no"}</Text>
			<Pressable
				testID="set-household"
				onPress={() => setActiveHousehold("hh-1")}
			>
				<Text>Household</Text>
			</Pressable>
			<Pressable testID="set-personal" onPress={setPersonalContext}>
				<Text>Personal</Text>
			</Pressable>
		</>
	);
}

describe("FinanceContextProvider", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("loads memberships and switches contexts", async () => {
		render(
			<FinanceContextProvider loadMemberships={async () => memberships as any}>
				<Harness />
			</FinanceContextProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId("membership-count").props.children).toBe(1),
		);
		expect(screen.getByTestId("context-type").props.children).toBe("personal");
		expect(screen.getByTestId("can-create").props.children).toBe("yes");

		fireEvent.press(screen.getByTestId("set-household"));
		expect(screen.getByTestId("context-type").props.children).toBe("household");
		expect(screen.getByTestId("can-create").props.children).toBe("yes");

		fireEvent.press(screen.getByTestId("set-personal"));
		expect(screen.getByTestId("context-type").props.children).toBe("personal");
	});

	it("restores a persisted household selection when membership still exists", async () => {
		(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("hh-1");

		render(
			<FinanceContextProvider loadMemberships={async () => memberships as any}>
				<Harness />
			</FinanceContextProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId("context-type").props.children).toBe(
				"household",
			),
		);
	});

	it("falls back to personal context when selected household is unavailable", async () => {
		(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
			"missing-household",
		);

		render(
			<FinanceContextProvider loadMemberships={async () => []}>
				<Harness />
			</FinanceContextProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId("membership-count").props.children).toBe(0),
		);
		expect(screen.getByTestId("context-type").props.children).toBe("personal");
	});

	it("falls back to personal context when membership loading fails", async () => {
		render(
			<FinanceContextProvider loadMemberships={async () => { throw new Error("User not authenticated") }}>
				<Harness />
			</FinanceContextProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId("membership-count").props.children).toBe(0),
		);
		expect(screen.getByTestId("context-type").props.children).toBe("personal");
		expect(screen.getByTestId("can-create").props.children).toBe("yes");
	});

	it("marks viewer household context as read only", async () => {
		const viewerMembership = [{ ...memberships[0], role: "viewer" as const }];
		render(
			<FinanceContextProvider loadMemberships={async () => viewerMembership as any}>
				<Harness />
			</FinanceContextProvider>,
		);

		await waitFor(() =>
			expect(screen.getByTestId("membership-count").props.children).toBe(1),
		);
		fireEvent.press(screen.getByTestId("set-household"));
		expect(screen.getByTestId("context-type").props.children).toBe("household");
		expect(screen.getByTestId("can-create").props.children).toBe("no");
	});
});
