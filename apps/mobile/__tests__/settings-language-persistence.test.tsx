import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { SettingsLanguageRow } from "../src/components/settings/SettingsLanguageRow";
import { ThemeProvider } from "../src/theme/theme-context";

function renderRow(onSelect: (language: "id" | "en") => void | Promise<boolean>) {
	return render(
		<ThemeProvider>
			<SettingsLanguageRow language="id" onSelect={onSelect} />
		</ThemeProvider>,
	);
}

async function chooseEnglish() {
	fireEvent.press(screen.getByTestId("settings-language-row"));
	await waitFor(() => expect(screen.getByTestId("settings-language-sheet")).toBeTruthy());
	await act(async () => {
		fireEvent.press(screen.getByTestId("settings-language-en"));
	});
}

describe("SettingsLanguageRow persistence honesty", () => {
	it("says the choice was not saved when storage fails", async () => {
		const onSelect = jest.fn(async () => false);
		renderRow(onSelect);

		await chooseEnglish();

		await waitFor(() => expect(screen.getByTestId("settings-language-error")).toBeTruthy());
		expect(screen.getByTestId("settings-language-error").props.children).toMatch(
			/gagal disimpan/i,
		);
		expect(onSelect).toHaveBeenCalledWith("en");
	});

	it("stays quiet when the choice was persisted", async () => {
		const onSelect = jest.fn(async () => true);
		renderRow(onSelect);

		await chooseEnglish();

		await waitFor(() => expect(onSelect).toHaveBeenCalledWith("en"));
		expect(screen.queryByTestId("settings-language-error")).toBeNull();
	});

	it("keeps legacy fire-and-forget callers error-free", async () => {
		const onSelect = jest.fn(() => undefined);
		renderRow(onSelect);

		await chooseEnglish();

		await waitFor(() => expect(onSelect).toHaveBeenCalledWith("en"));
		expect(screen.queryByTestId("settings-language-error")).toBeNull();
	});
});
