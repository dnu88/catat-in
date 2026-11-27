jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { I18nProvider } from "../../i18n/i18n-context";
import { ThemeProvider } from "../../theme/theme-context";
import {
	CaptureComposer,
	captureComposerCopy,
	type CaptureComposerProps,
} from "./CaptureComposer";

function makeProps(
	overrides: Partial<CaptureComposerProps> = {},
): CaptureComposerProps {
	return {
		value: "",
		onTextChange: jest.fn(),
		onSubmitText: jest.fn(),
		onOpenManual: jest.fn(),
		onOpenReceipt: jest.fn(),
		copy: captureComposerCopy("id"),
		...overrides,
	};
}

function renderComposer(overrides: Partial<CaptureComposerProps> = {}) {
	const props = makeProps(overrides);
	const utils = render(
		<I18nProvider>
			<ThemeProvider>
				<CaptureComposer {...props} />
			</ThemeProvider>
		</I18nProvider>,
	);
	return { ...utils, props };
}

describe("CaptureComposer", () => {
	it("keeps long destination and wallet names on separate bounded rows", () => {
		const name = "Family household with a very long multilingual display name";
		const wallet = "Salary July savings wallet with a very long display name";
		const { getByTestId, getByText } = renderComposer({
			contextLabel: name, selectedWalletLabel: wallet,
			contextAccessory: <Text>Money space</Text>,
			onChangeWallet: jest.fn(),
		});
		expect(getByText(name).props.numberOfLines).toBe(2);
		expect(getByText(wallet).props.numberOfLines).toBe(2);
		expect(StyleSheet.flatten(getByTestId("capture-composer-context").props.style).flexDirection).toBe("column");
		expect(StyleSheet.flatten(getByText(wallet).props.style)).toMatchObject({ flex: 1, minWidth: 0 });
	});
	it("offers exactly one dominant submit CTA", () => {
		const { getByTestId, queryAllByTestId } = renderComposer({
			value: "kopi 35 ribu pakai BCA",
		});

		expect(getByTestId("capture-composer-submit")).toBeTruthy();
		// The secondary routes must never be rendered as a second primary CTA.
		expect(queryAllByTestId("capture-composer-submit")).toHaveLength(1);
		// Both secondary routes exist exactly once, each on its own testID.
		expect(getByTestId("capture-composer-manual")).toBeTruthy();
		expect(getByTestId("capture-composer-receipt")).toBeTruthy();
	});

	it("submits the typed text once when the primary CTA is pressed", () => {
		const onSubmitText = jest.fn();
		const { getByTestId } = renderComposer({
			value: "kopi 35 ribu pakai BCA",
			onSubmitText,
		});

		fireEvent.press(getByTestId("capture-composer-submit"));

		expect(onSubmitText).toHaveBeenCalledTimes(1);
	});

	it("reports typing through onTextChange without owning the value", () => {
		const onTextChange = jest.fn();
		const { getByTestId } = renderComposer({ value: "", onTextChange });

		fireEvent.changeText(getByTestId("capture-composer-input"), "makan 20rb");

		expect(onTextChange).toHaveBeenCalledWith("makan 20rb");
	});

	it("exposes Manual and Struk as secondary routes", () => {
		const onOpenManual = jest.fn();
		const onOpenReceipt = jest.fn();
		const { getByTestId } = renderComposer({ onOpenManual, onOpenReceipt });

		fireEvent.press(getByTestId("capture-composer-manual"));
		fireEvent.press(getByTestId("capture-composer-receipt"));

		expect(onOpenManual).toHaveBeenCalledTimes(1);
		expect(onOpenReceipt).toHaveBeenCalledTimes(1);
	});

	it("disables the CTA and reports busy while processing", () => {
		const onSubmitText = jest.fn();
		const { getByTestId } = renderComposer({
			value: "kopi 35 ribu",
			processing: true,
			onSubmitText,
		});

		const cta = getByTestId("capture-composer-submit");
		expect(cta.props.accessibilityState).toMatchObject({
			disabled: true,
			busy: true,
		});

		fireEvent.press(cta);
		expect(onSubmitText).not.toHaveBeenCalled();
	});

	it("blocks editing for a viewer and explains why", () => {
		const onTextChange = jest.fn();
		const onSubmitText = jest.fn();
		const { getByTestId, getByText } = renderComposer({
			value: "",
			canCreate: false,
			onTextChange,
			onSubmitText,
		});

		expect(getByText("Hanya lihat")).toBeTruthy();
		expect(getByTestId("capture-composer-submit").props.accessibilityState)
			.toMatchObject({ disabled: true });

		fireEvent.press(getByTestId("capture-composer-submit"));
		expect(onSubmitText).not.toHaveBeenCalled();
		expect(onTextChange).not.toHaveBeenCalled();
	});

	it("hides voice when the feature or device does not support it", () => {
		const { queryByTestId } = renderComposer({ voiceAvailable: false });

		expect(queryByTestId("capture-composer-voice")).toBeNull();
	});

	it("shows a working voice route only when it is actually available", () => {
		const onOpenVoice = jest.fn();
		const { getByTestId, queryByTestId } = renderComposer({
			voiceAvailable: true,
			onOpenVoice,
		});

		expect(queryByTestId("capture-composer-voice")).toBeTruthy();
		fireEvent.press(getByTestId("capture-composer-voice"));
		expect(onOpenVoice).toHaveBeenCalledTimes(1);
	});

	it("never claims success on an unknown outcome and offers a status check", () => {
		const onCheckStatus = jest.fn();
		const onSubmitText = jest.fn();
		const { getByTestId, queryByTestId, queryByText, getByText } = renderComposer({
			value: "kopi 35 ribu",
			onSubmitText,
			unknownOutcome: {
				message: "Hasil penyimpanan belum bisa dipastikan. Cek status dulu.",
				onCheckStatus,
			},
		});

		expect(getByText(/belum bisa dipastikan/i)).toBeTruthy();
		// No false success surface.
		expect(queryByText(/tersimpan/i)).toBeNull();
		expect(queryByText(/berhasil/i)).toBeNull();

		// Strongest guarantee: there is no create CTA left to press, so a blind
		// second write from the edited payload is impossible.
		expect(queryByTestId("capture-composer-submit")).toBeNull();
		expect(onSubmitText).not.toHaveBeenCalled();

		fireEvent.press(getByTestId("capture-composer-check-status"));
		expect(onCheckStatus).toHaveBeenCalledTimes(1);
	});

	it("suppresses the internal hero when the host screen owns the header", () => {
		const { queryByText } = renderComposer({
			value: "",
			showHero: false,
		});

		expect(queryByText(captureComposerCopy("id").title)).toBeNull();
		expect(queryByText(captureComposerCopy("id").promise)).toBeNull();
	});

	it("shows a calm loading row instead of a ready-looking wallet control", () => {
		const onChangeWallet = jest.fn();
		const { getByTestId, queryByTestId } = renderComposer({
			contextLabel: "Pribadi",
			walletState: "loading",
			onChangeWallet,
		});

		expect(getByTestId("capture-composer-wallet-loading")).toBeTruthy();
		// No tappable wallet control while the list is still resolving.
		expect(queryByTestId("capture-composer-wallet")).toBeNull();
		expect(queryByTestId("capture-composer-create-wallet")).toBeNull();
	});

	it("offers a create-wallet CTA when the context has no wallet", () => {
		const onCreateWallet = jest.fn();
		const { getByTestId, queryByTestId } = renderComposer({
			contextLabel: "Pribadi",
			walletState: "empty",
			onCreateWallet,
		});

		expect(getByTestId("capture-composer-wallet-empty")).toBeTruthy();
		expect(queryByTestId("capture-composer-wallet")).toBeNull();

		fireEvent.press(getByTestId("capture-composer-create-wallet"));
		expect(onCreateWallet).toHaveBeenCalledTimes(1);
	});

	it("shows the selected wallet and a change action when ready", () => {
		const onChangeWallet = jest.fn();
		const { getByTestId, queryByTestId } = renderComposer({
			contextLabel: "Pribadi",
			walletState: "ready",
			selectedWalletLabel: "BCA",
			onChangeWallet,
		});

		expect(getByTestId("capture-composer-wallet")).toBeTruthy();
		expect(getByTestId("capture-composer-wallet").props.accessibilityLabel).toBe(
			"Dompet: BCA",
		);
		expect(queryByTestId("capture-composer-wallet-loading")).toBeNull();
		expect(queryByTestId("capture-composer-create-wallet")).toBeNull();

		fireEvent.press(getByTestId("capture-composer-wallet"));
		expect(onChangeWallet).toHaveBeenCalledTimes(1);
	});

	it("reveals wallet choices only after the user asks to change", () => {
		const onSelectWallet = jest.fn();
		const { getByTestId, queryByTestId } = renderComposer({
			contextLabel: "Pribadi",
			walletState: "ready",
			selectedWalletLabel: "BCA",
			walletOptions: [
				{ id: "w-1", name: "BCA" },
				{ id: "w-2", name: "Mandiri" },
			],
			onSelectWallet,
		});

		// Collapsed by default — progressive disclosure, no extra first decision.
		expect(queryByTestId("capture-composer-wallet-options")).toBeNull();

		fireEvent.press(getByTestId("capture-composer-wallet"));
		expect(getByTestId("capture-composer-wallet-options")).toBeTruthy();

		fireEvent.press(getByTestId("capture-composer-wallet-option-w-2"));
		expect(onSelectWallet).toHaveBeenCalledWith("w-2");
		// Choosing collapses the picker again.
		expect(queryByTestId("capture-composer-wallet-options")).toBeNull();
	});

	it("renders a host-owned context accessory without owning the switcher", () => {
		const { getByTestId } = renderComposer({
			contextLabel: "Pribadi",
			walletState: "ready",
			selectedWalletLabel: "BCA",
			contextAccessory: <Text testID="host-context-switcher">Pribadi</Text>,
		});

		expect(getByTestId("host-context-switcher")).toBeTruthy();
	});

	it("localizes the primary CTA and secondary routes", () => {
		expect(captureComposerCopy("id")).toMatchObject({
			submit: "Catat",
			manual: "Manual",
			receipt: "Struk",
		});
		expect(captureComposerCopy("en")).toMatchObject({
			submit: "Record",
			manual: "Manual",
			receipt: "Receipt",
		});
	});
});
