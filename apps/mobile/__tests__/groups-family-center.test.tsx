import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import GroupsScreen from "../app/(tabs)/groups";
import { ThemeProvider } from "../src/theme/theme-context";

const mockCreateHousehold = jest.fn();
const mockJoinHouseholdByInviteCode = jest.fn();
const mockListMyHouseholds = jest.fn();
const mockSupabase = { from: jest.fn(), rpc: jest.fn() };

jest.mock("../src/lib/supabase", () => ({
	useSupabase: () => ({ supabase: mockSupabase }),
}));

jest.mock("../src/services/currentUser", () => ({
	getCurrentUserId: jest.fn(async () => "user-1"),
}));

jest.mock("../src/services/households", () => ({
	createHousehold: (...args: unknown[]) => mockCreateHousehold(...args),
	joinHouseholdByInviteCode: (...args: unknown[]) =>
		mockJoinHouseholdByInviteCode(...args),
	listMyHouseholds: (...args: unknown[]) => mockListMyHouseholds(...args),
}));

function renderGroupsScreen() {
	return render(
		<ThemeProvider>
			<GroupsScreen />
		</ThemeProvider>,
	);
}

describe("Family Center screen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockListMyHouseholds.mockResolvedValue([
			{
				id: "member-1",
				household_id: "hh-1",
				user_id: "user-1",
				role: "admin",
				status: "active",
				joined_at: "2026-05-21T00:00:00.000Z",
				households: {
					id: "hh-1",
					name: "Keluarga Budi",
					owner_id: "user-1",
					invite_code: "ABC123",
					created_at: "",
					updated_at: "",
				},
			},
		]);
		mockCreateHousehold.mockResolvedValue({ id: "hh-new" });
		mockJoinHouseholdByInviteCode.mockResolvedValue({ household_id: "hh-1" });
	});

	it("renders family center copy and active household list", async () => {
		renderGroupsScreen();

		expect(await screen.findByText("Keluarga")).toBeTruthy();
		expect(screen.getByText("Keluarga Budi")).toBeTruthy();
		expect(screen.getByText("Admin")).toBeTruthy();
	});

	it("creates a household from the form", async () => {
		renderGroupsScreen();

		fireEvent.press(screen.getByText("Buat"));
		fireEvent.changeText(
			screen.getByPlaceholderText("Nama keluarga"),
			"Keluarga Budi",
		);
		fireEvent.press(screen.getByText("Simpan keluarga"));

		await waitFor(() =>
			expect(mockCreateHousehold).toHaveBeenCalledWith(expect.anything(), {
				name: "Keluarga Budi",
				ownerId: "user-1",
			}),
		);
	});

	it("joins household by invite code", async () => {
		renderGroupsScreen();

		fireEvent.press(screen.getByText("Gabung"));
		fireEvent.changeText(screen.getByPlaceholderText("Kode undangan"), "ABC123");
		fireEvent.press(screen.getByText("Gabung keluarga"));

		await waitFor(() =>
			expect(mockJoinHouseholdByInviteCode).toHaveBeenCalledWith(
				expect.anything(),
				"ABC123",
			),
		);
	});
});
