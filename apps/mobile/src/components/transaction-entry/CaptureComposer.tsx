import { useMemo, useState, type ReactNode } from "react";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
	type TextStyle,
	type ViewStyle,
} from "react-native";

import type { Language } from "../../i18n/i18n-context";
import { financeEditorial as fe } from "../../theme/finance-editorial";
import { experienceTokens } from "../../theme/experience-tokens";

/**
 * Presentation-only compositor for the Capture surface.
 *
 * It receives the draft value, phase flags and callbacks from the controller and
 * renders them. It never talks to Supabase, never writes, and never mints a
 * request — the controller keeps ownership of data, permissions and persistence.
 * Rendered only when `simplePremiumExperience` is ON; the legacy workspace is
 * untouched otherwise.
 */

export type CaptureComposerCopy = {
	title: string;
	promise: string;
	inputLabel: string;
	inputPlaceholder: string;
	submit: string;
	submitBusy: string;
	manual: string;
	receipt: string;
	voice: string;
	voiceHint: string;
	viewerTitle: string;
	viewerNotice: string;
	unknownTitle: string;
	checkStatus: string;
	destinationLabel: string;
	walletCaption: string;
	walletLoading: string;
	walletEmpty: string;
	createWallet: string;
	changeWallet: string;
};

const COPY: Record<Language, CaptureComposerCopy> = {
	id: {
		title: "Catat transaksi",
		promise: "Ketik saja, Kaswise rapikan sisanya.",
		inputLabel: "Input teks transaksi",
		inputPlaceholder: "Contoh: kopi 35 ribu pakai BCA",
		submit: "Catat",
		submitBusy: "Memproses…",
		manual: "Manual",
		receipt: "Struk",
		voice: "Suara",
		voiceHint: "Ucapkan transaksi, Kaswise jadikan catatan",
		viewerTitle: "Hanya lihat",
		viewerNotice: "Kamu tidak punya akses untuk mencatat di konteks ini.",
		unknownTitle: "Status belum pasti",
		checkStatus: "Cek status",
		destinationLabel: "Tujuan",
		walletCaption: "Dompet",
		walletLoading: "Memuat dompet…",
		walletEmpty: "Belum ada dompet di ruang uang ini.",
		createWallet: "Buat dompet",
		changeWallet: "Ganti",
	},
	en: {
		title: "Add transaction",
		promise: "Just type it, Kaswise tidies up the rest.",
		inputLabel: "Transaction text input",
		inputPlaceholder: "Example: coffee 35k with BCA",
		submit: "Record",
		submitBusy: "Processing…",
		manual: "Manual",
		receipt: "Receipt",
		voice: "Voice",
		voiceHint: "Say the transaction, Kaswise notes it down",
		viewerTitle: "View only",
		viewerNotice: "You do not have access to record here.",
		unknownTitle: "Outcome unconfirmed",
		checkStatus: "Check status",
		destinationLabel: "Destination",
		walletCaption: "Wallet",
		walletLoading: "Loading wallets…",
		walletEmpty: "No wallet yet in this money space.",
		createWallet: "Create wallet",
		changeWallet: "Change",
	},
};

export function captureComposerCopy(language: Language): CaptureComposerCopy {
	return COPY[language] ?? COPY.id;
}

export type CaptureComposerUnknownOutcome = {
	/** Must describe an unconfirmed outcome — never a success claim. */
	message: string;
	onCheckStatus: () => void;
};

export type CaptureComposerProps = {
	value: string;
	onTextChange: (value: string) => void;
	onSubmitText: () => void;
	onOpenManual: () => void;
	onOpenReceipt: () => void;
	copy: CaptureComposerCopy;
	/** Controller-owned phase: true while a capture request is in flight. */
	processing?: boolean;
	/** False for a viewer / no-permission context. */
	canCreate?: boolean;
	/** Only true when the feature, entitlement AND device support voice. */
	voiceAvailable?: boolean;
	onOpenVoice?: () => void;
	/** Present only after an unknown save outcome; blocks a blind re-create. */
	unknownOutcome?: CaptureComposerUnknownOutcome | null;
	/** The host screen already renders a header — suppress the internal one. */
	showHero?: boolean;
	/**
	 * Wallet readiness of the active context. A control must never look ready
	 * while the list is still resolving or empty.
	 */
	walletState?: "loading" | "empty" | "ready";
	selectedWalletLabel?: string;
	/** Compact, progressively disclosed wallet choices for the active context. */
	walletOptions?: { id: string; name: string }[];
	onSelectWallet?: (walletId: string) => void;
	onCreateWallet?: () => void;
	onChangeWallet?: () => void;
	/** Host-owned control (e.g. the finance-context switcher) for the row. */
	contextAccessory?: ReactNode;
	contextLabel?: string;
	walletLabel?: string;
	helperText?: string;
};

export function CaptureComposer({
	value,
	onTextChange,
	onSubmitText,
	onOpenManual,
	onOpenReceipt,
	copy,
	processing = false,
	canCreate = true,
	voiceAvailable = false,
	onOpenVoice,
	unknownOutcome = null,
	showHero = true,
	walletState = "ready",
	selectedWalletLabel,
	walletOptions = [],
	onSelectWallet,
	onCreateWallet,
	onChangeWallet,
	contextAccessory,
	contextLabel,
	walletLabel,
	helperText,
}: CaptureComposerProps) {
	const styles = useMemo(() => createStyles(), []);
	const [walletPickerOpen, setWalletPickerOpen] = useState(false);

	const editable = canCreate && !processing;
	// An unknown outcome keeps the original request/fingerprint; the surface must
	// offer a status check instead of minting a new write from edited input.
	const submitDisabled = !editable || unknownOutcome !== null;
	const busy = processing;

	const handleSubmit = () => {
		if (submitDisabled) return;
		onSubmitText();
	};

	const handleTextChange = (next: string) => {
		if (!canCreate) return;
		onTextChange(next);
	};

	return (
		<View testID="capture-composer" style={styles.root}>
			{showHero ? (
				<View style={styles.hero}>
					<Text style={styles.heroTitle}>{copy.title}</Text>
					<Text style={styles.heroPromise}>{copy.promise}</Text>
				</View>
			) : null}

			<View style={styles.body}>
				{contextLabel || walletLabel || selectedWalletLabel || walletState !== "ready" ? (
					<View testID="capture-composer-context" style={styles.contextCard}>
						<View style={styles.contextBlock}>
							{contextLabel ? (
								<Text numberOfLines={1} style={styles.contextCaption}>{copy.destinationLabel}</Text>
							) : null}
							{contextLabel ? (
								<Text numberOfLines={2} style={styles.contextText}>{contextLabel}</Text>
							) : null}
						</View>

						{contextAccessory ? (
							<View style={styles.contextAccessory}>{contextAccessory}</View>
						) : null}

						{walletState === "loading" ? (
							<Text
								testID="capture-composer-wallet-loading"
								style={styles.walletMuted}
							>
								{copy.walletLoading}
							</Text>
						) : walletState === "empty" ? (
							<View style={styles.walletEmptyBlock}>
								<Text
									testID="capture-composer-wallet-empty"
									style={styles.walletMuted}
								>
									{copy.walletEmpty}
								</Text>
								<Pressable
									testID="capture-composer-create-wallet"
									accessibilityRole="button"
									accessibilityLabel={copy.createWallet}
									style={styles.walletAction}
									onPress={onCreateWallet}
								>
									<Text style={styles.walletActionText}>
										{copy.createWallet}
									</Text>
								</Pressable>
							</View>
						) : (
							<Pressable
								testID="capture-composer-wallet"
								accessibilityRole="button"
								accessibilityLabel={`${copy.walletCaption}: ${
									selectedWalletLabel ?? walletLabel ?? ""
								}`}
								accessibilityState={{ expanded: walletPickerOpen }}
								style={styles.walletAction}
								onPress={() => {
									// Progressive disclosure: prefer the inline picker when
									// options are known, otherwise defer to the host.
									if (walletOptions.length > 0) {
										setWalletPickerOpen((current) => !current);
										return;
									}
									onChangeWallet?.();
								}}
								disabled={walletOptions.length === 0 && !onChangeWallet}
							>
								<Text numberOfLines={2} style={styles.walletText}>
									{selectedWalletLabel ?? walletLabel}
								</Text>
								{walletOptions.length > 0 || onChangeWallet ? (
									<Text style={styles.walletChange}>{copy.changeWallet}</Text>
								) : null}
							</Pressable>
						)}
					</View>
				) : null}

				{walletPickerOpen && walletOptions.length > 0 ? (
					<View
						testID="capture-composer-wallet-options"
						style={styles.walletOptionRow}
					>
						{walletOptions.map((wallet) => {
							const selected =
								wallet.name === (selectedWalletLabel ?? walletLabel);
							return (
								<Pressable
									key={wallet.id}
									testID={`capture-composer-wallet-option-${wallet.id}`}
									accessibilityRole="button"
									accessibilityState={{ selected }}
									style={[
										styles.walletOption,
										selected && styles.walletOptionActive,
									]}
									onPress={() => {
										onSelectWallet?.(wallet.id);
										setWalletPickerOpen(false);
									}}
								>
									<Text numberOfLines={2} style={styles.walletOptionText}>{wallet.name}</Text>
								</Pressable>
							);
						})}
					</View>
				) : null}

				{!canCreate ? (
					<View testID="capture-composer-viewer" style={styles.feedbackCard}>
						<Text style={styles.feedbackTitle}>{copy.viewerTitle}</Text>
						<Text style={styles.feedbackBody}>{copy.viewerNotice}</Text>
					</View>
				) : null}

				{unknownOutcome ? (
					<View testID="capture-composer-unknown" style={styles.unknownCard}>
						<Text style={styles.unknownTitle}>{copy.unknownTitle}</Text>
						<Text style={styles.unknownBody}>{unknownOutcome.message}</Text>
					</View>
				) : null}

				<TextInput
					testID="capture-composer-input"
					style={styles.input}
					value={value}
					onChangeText={handleTextChange}
					multiline
					editable={editable}
					accessibilityLabel={copy.inputLabel}
					placeholder={copy.inputPlaceholder}
					placeholderTextColor={fe.textMuted}
				/>

				{helperText ? <Text style={styles.helper}>{helperText}</Text> : null}

				{unknownOutcome ? (
					<Pressable
						testID="capture-composer-check-status"
						accessibilityRole="button"
						style={styles.submit}
						onPress={unknownOutcome.onCheckStatus}
					>
						<Text style={styles.submitText}>{copy.checkStatus}</Text>
					</Pressable>
				) : (
					<Pressable
						testID="capture-composer-submit"
						accessibilityRole="button"
						accessibilityState={{ disabled: submitDisabled, busy }}
						style={[styles.submit, submitDisabled && styles.submitDisabled]}
						onPress={handleSubmit}
						disabled={submitDisabled}
					>
						{busy ? (
							<ActivityIndicator color={fe.white} />
						) : (
							<Text style={styles.submitText}>
								{busy ? copy.submitBusy : copy.submit}
							</Text>
						)}
					</Pressable>
				)}

				<View style={styles.secondaryRow}>
					<Pressable
						testID="capture-composer-manual"
						accessibilityRole="button"
						style={styles.secondary}
						onPress={onOpenManual}
						disabled={processing}
					>
						<Text style={styles.secondaryText}>{copy.manual}</Text>
					</Pressable>
					<Pressable
						testID="capture-composer-receipt"
						accessibilityRole="button"
						style={styles.secondary}
						onPress={onOpenReceipt}
						disabled={processing}
					>
						<Text style={styles.secondaryText}>{copy.receipt}</Text>
					</Pressable>
				</View>

				{voiceAvailable && onOpenVoice ? (
					<Pressable
						testID="capture-composer-voice"
						accessibilityRole="button"
						style={styles.voiceRow}
						onPress={onOpenVoice}
						disabled={processing}
					>
						<Text style={styles.voiceText}>{copy.voice}</Text>
						<Text style={styles.voiceHint}>{copy.voiceHint}</Text>
					</Pressable>
				) : null}
			</View>
		</View>
	);
}

const HERO = fe.navySurface;
const BRAND = fe.blueBright;

function createStyles(): Record<string, ViewStyle | TextStyle> {
	return StyleSheet.create({
		root: {
			flex: 1,
			backgroundColor: fe.paper,
		},
		hero: {
			backgroundColor: HERO,
			borderBottomLeftRadius: experienceTokens.radius[5],
			borderBottomRightRadius: experienceTokens.radius[5],
			paddingHorizontal: experienceTokens.spacing[4],
			paddingTop: experienceTokens.spacing[4],
			paddingBottom: experienceTokens.spacing[5],
		},
		heroTitle: {
			color: fe.white,
			fontSize: experienceTokens.type.title,
			fontWeight: "800",
		},
		heroPromise: {
			color: "rgba(255,255,255,0.78)",
			fontSize: experienceTokens.type.helper,
			marginTop: experienceTokens.spacing[1],
		},
		body: {
			padding: experienceTokens.spacing[4],
			gap: experienceTokens.spacing[3],
		},
		contextCard: {
			backgroundColor: fe.white,
			borderColor: fe.line,
			borderWidth: 1,
			borderRadius: experienceTokens.radius[2],
			paddingVertical: experienceTokens.spacing[3],
			paddingHorizontal: experienceTokens.spacing[3],
			minHeight: experienceTokens.target.rowMinHeight,
			flexDirection: "column",
			alignItems: "stretch",
			gap: experienceTokens.spacing[2],
		},
		contextBlock: {
			minWidth: 0,
			gap: 1,
		},
		contextCaption: {
			color: fe.textMuted,
			fontSize: experienceTokens.type.caption,
			fontWeight: "700",
			letterSpacing: 0.6,
			textTransform: "uppercase",
		},
		contextText: {
			color: fe.ink,
			fontSize: experienceTokens.type.body,
			fontWeight: "600",
		},
		walletText: {
			flex: 1,
			minWidth: 0,
			color: fe.navy,
			fontSize: experienceTokens.type.body,
			fontWeight: "700",
		},
		walletMuted: {
			color: fe.textMuted,
			fontSize: experienceTokens.type.helper,
			flexShrink: 1,
			textAlign: "right",
		},
		walletEmptyBlock: {
			alignItems: "flex-end",
			gap: experienceTokens.spacing[1],
			flexShrink: 1,
		},
		walletAction: {
			width: "100%",
			minWidth: 0,
			flexDirection: "row",
			alignItems: "center",
			gap: experienceTokens.spacing[1],
			minHeight: experienceTokens.target.minTouch,
			paddingHorizontal: experienceTokens.spacing[2],
		},
		walletActionText: {
			color: fe.navy,
			fontSize: experienceTokens.type.body,
			fontWeight: "700",
		},
		walletChange: {
			flexShrink: 0,
			color: fe.blueBright,
			fontSize: experienceTokens.type.helper,
			fontWeight: "600",
		},
		contextAccessory: {
			width: "100%",
			minWidth: 0,
		},
		walletOptionRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: experienceTokens.spacing[1],
		},
		walletOption: {
			maxWidth: "100%",
			minWidth: 0,
			backgroundColor: fe.white,
			borderColor: fe.line,
			borderWidth: 1,
			borderRadius: experienceTokens.radius[6],
			paddingVertical: experienceTokens.spacing[2],
			paddingHorizontal: experienceTokens.spacing[3],
			minHeight: experienceTokens.target.minTouch,
			justifyContent: "center",
		},
		walletOptionActive: {
			borderColor: fe.blueBright,
			backgroundColor: "#EEF4FF",
		},
		walletOptionText: {
			color: fe.navy,
			fontSize: 12.5,
			fontWeight: "600",
		},
		feedbackCard: {
			backgroundColor: "#EEF4FF",
			borderColor: "rgba(12,78,145,0.22)",
			borderWidth: 1,
			borderRadius: experienceTokens.radius[2],
			padding: experienceTokens.spacing[3],
			gap: experienceTokens.spacing[1],
		},
		feedbackTitle: {
			color: fe.navySurface,
			fontSize: experienceTokens.type.body,
			fontWeight: "700",
		},
		feedbackBody: {
			color: fe.navySurface,
			fontSize: experienceTokens.type.helper,
		},
		unknownCard: {
			backgroundColor: "#FDEEEC",
			borderColor: "rgba(180,35,24,0.28)",
			borderWidth: 1,
			borderRadius: experienceTokens.radius[2],
			padding: experienceTokens.spacing[3],
			gap: experienceTokens.spacing[1],
		},
		unknownTitle: {
			color: fe.danger,
			fontSize: experienceTokens.type.body,
			fontWeight: "700",
		},
		unknownBody: {
			color: fe.danger,
			fontSize: experienceTokens.type.helper,
			lineHeight: 16,
		},
		input: {
			backgroundColor: fe.white,
			borderColor: BRAND,
			borderWidth: 1.5,
			borderRadius: experienceTokens.radius[3],
			padding: experienceTokens.spacing[3],
			minHeight: 120,
			color: fe.navy,
			fontSize: experienceTokens.type.body,
			textAlignVertical: "top",
		},
		helper: {
			color: fe.textMuted,
			fontSize: experienceTokens.type.helper,
		},
		submit: {
			backgroundColor: fe.navy,
			borderRadius: experienceTokens.radius[3],
			minHeight: experienceTokens.target.ctaHeight,
			alignItems: "center",
			justifyContent: "center",
		},
		submitDisabled: {
			backgroundColor: "#C6D6EA",
		},
		submitText: {
			color: fe.white,
			fontSize: 14,
			fontWeight: "700",
		},
		secondaryRow: {
			flexDirection: "row",
			gap: experienceTokens.spacing[2],
		},
		secondary: {
			flex: 1,
			backgroundColor: fe.white,
			borderColor: fe.line,
			borderWidth: 1,
			borderRadius: experienceTokens.radius[3],
			minHeight: experienceTokens.target.minTouch,
			alignItems: "center",
			justifyContent: "center",
		},
		secondaryText: {
			color: fe.navy,
			fontSize: 12.5,
			fontWeight: "600",
		},
		voiceRow: {
			backgroundColor: fe.white,
			borderColor: fe.line,
			borderWidth: 1,
			borderRadius: experienceTokens.radius[2],
			padding: experienceTokens.spacing[3],
			minHeight: experienceTokens.target.minTouch,
			justifyContent: "center",
		},
		voiceText: {
			color: fe.navy,
			fontSize: experienceTokens.type.body,
			fontWeight: "700",
		},
		voiceHint: {
			color: fe.textMuted,
			fontSize: experienceTokens.type.caption,
		},
	}) as Record<string, ViewStyle | TextStyle>;
}
