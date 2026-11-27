import { useMemo, useState, type ReactNode } from "react";
import {
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

import type {
	CategoryOption,
	DraftFieldErrors,
	TransactionDraft,
	WalletOption,
} from "../../features/transaction-entry/draft";
import type { TransactionType } from "../../services/transactions";
import { useI18n } from "../../i18n/i18n-context";
import { financeEditorial as fe } from "../../theme/finance-editorial";
import { entryCopy, fieldErrorLabel, formatDraftDate } from "./copy";
import { TransactionDatePickerSheet } from "./TransactionDatePickerSheet";

export { fieldErrorLabel } from "./copy";

export type EntryPickerKind = "category" | "wallet" | "targetWallet" | "date";

type TransactionFieldsProps = {
	draft: TransactionDraft;
	onChange: (patch: Partial<TransactionDraft>) => void;
	wallets: WalletOption[];
	categories: CategoryOption[];
	canCreate: boolean;
	onOpenPicker: (kind: EntryPickerKind) => void;
	errors?: DraftFieldErrors;
	testID?: string;
};

const TYPE_ORDER: TransactionType[] = ["expense", "income", "transfer"];

function walletName(wallets: WalletOption[], walletId: string | null): string | null {
	if (!walletId) return null;
	const wallet = wallets.find((candidate) => candidate.id === walletId);
	return wallet ? wallet.name : null;
}

/**
 * Compact entry form for a single draft.
 *
 * Amount is the visual anchor, type is a 3-way segmented control, and category
 * and wallet are low-density rows that open picker sheets rather than chip
 * grids. Editing is disabled entirely for view-only (canCreate === false) users.
 */
export function TransactionFields({
	draft,
	onChange,
	wallets,
	categories,
	canCreate,
	onOpenPicker,
	errors,
	testID = "transaction-fields",
}: TransactionFieldsProps) {
	const { language } = useI18n();
	const copy = entryCopy(language);
	const styles = useMemo(() => createStyles(), []);
	const [detailOpen, setDetailOpen] = useState(false);
	const [dateSheetOpen, setDateSheetOpen] = useState(false);

	const isTransfer = draft.transactionType === "transfer";
	const editable = canCreate;

	const amountError = fieldErrorLabel("amount", errors, language);
	const categoryError = isTransfer ? null : fieldErrorLabel("category", errors, language);
	const walletError = fieldErrorLabel("walletId", errors, language);
	const targetWalletError = isTransfer
		? fieldErrorLabel("targetWalletId", errors, language)
		: null;

	const typeLabel = (type: TransactionType) =>
		type === "expense"
			? copy.typeExpense
			: type === "income"
				? copy.typeIncome
				: copy.typeTransfer;

	const handleAmountChange = (text: string) => {
		const digits = text.replace(/[^0-9]/g, "");
		if (!digits) {
			onChange({ amount: null });
			return;
		}
		const parsed = Number.parseInt(digits, 10);
		onChange({ amount: Number.isFinite(parsed) ? parsed : null });
	};

	const openPicker = (kind: EntryPickerKind) => {
		if (onOpenPicker) {
			onOpenPicker(kind);
			return;
		}
		if (kind === "date") setDateSheetOpen(true);
	};

	const renderError = (message: string | null, errorTestID: string): ReactNode => {
		if (!message) return null;
		return (
			<Text
				style={styles.errorText}
				accessibilityRole="alert"
				accessibilityLiveRegion="polite"
				testID={errorTestID}
			>
				{message}
			</Text>
		);
	};

	const renderRow = (options: {
		label: string;
		value: string;
		selected: boolean;
		onPress: () => void;
		error: string | null;
		errorTestID: string;
		rowTestID: string;
	}): ReactNode => (
		<View style={styles.field}>
			<Pressable
				onPress={options.onPress}
				disabled={!editable}
				accessibilityRole="button"
				accessibilityLabel={options.label}
				accessibilityValue={{ text: options.selected ? options.value : copy.choose }}
				accessibilityState={{ disabled: !editable }}
				style={[styles.row, !editable && styles.rowDisabled]}
				testID={options.rowTestID}
			>
				<Text style={styles.rowLabel}>{options.label}</Text>
				<View style={styles.rowValueWrap}>
					<Text
						style={[styles.rowValue, !options.selected && styles.rowValuePlaceholder]}
						numberOfLines={1}
					>
						{options.selected ? options.value : copy.choose}
					</Text>
					<Text
						style={styles.chevron}
						accessible={false}
						importantForAccessibility="no"
					>
						›
					</Text>
				</View>
			</Pressable>
			{renderError(options.error, options.errorTestID)}
		</View>
	);

	return (
		<View style={styles.container} testID={testID}>
			<View style={styles.field}>
				<Text style={styles.label}>{copy.amountLabel}</Text>
				<View style={styles.amountRow}>
					<Text style={styles.amountPrefix} accessible={false} importantForAccessibility="no">
						Rp
					</Text>
					<TextInput
						testID={`${testID}-amount`}
						accessibilityLabel={copy.amountLabel}
						keyboardType="numeric"
						inputMode="numeric"
						editable={editable}
						accessibilityState={{ disabled: !editable }}
						accessibilityHint={amountError ?? undefined}
						placeholder={copy.amountPlaceholder}
						placeholderTextColor={fe.decorativeMuted}
						value={draft.amount === null ? "" : String(draft.amount)}
						onChangeText={handleAmountChange}
						style={[
							styles.amountInput,
							draft.transactionType === "income" && styles.amountIncome,
							amountError ? styles.amountInvalid : null,
						]}
					/>
				</View>
				{renderError(amountError, `${testID}-amount-error`)}
			</View>

			<View style={styles.field}>
				<Text style={styles.label}>{copy.typeHint}</Text>
				<View
					style={styles.segmented}
					accessibilityRole="tablist"
					testID={`${testID}-type`}
				>
					{TYPE_ORDER.map((type) => {
						const selected = draft.transactionType === type;
						return (
							<Pressable
								key={type}
								onPress={() => onChange({ transactionType: type })}
								disabled={!editable}
								accessibilityRole="tab"
								accessibilityLabel={typeLabel(type)}
								accessibilityState={{ selected, disabled: !editable }}
								style={[
									styles.segment,
									selected && styles.segmentSelected,
									!editable && styles.segmentDisabled,
								]}
								testID={`${testID}-type-${type}`}
							>
								<Text
									style={[
										styles.segmentText,
										selected && styles.segmentTextSelected,
									]}
								>
									{typeLabel(type)}
								</Text>
							</Pressable>
						);
					})}
				</View>
			</View>

			{!isTransfer
				? renderRow({
						label: copy.categoryLabel,
						value: draft.category,
						selected: Boolean(draft.category?.trim()),
						onPress: () => openPicker("category"),
						error: categoryError,
						errorTestID: `${testID}-category-error`,
						rowTestID: `${testID}-category`,
					})
				: null}

			{renderRow({
				label: copy.walletLabel,
				value: walletName(wallets, draft.walletId) ?? "",
				selected: Boolean(walletName(wallets, draft.walletId)),
				onPress: () => openPicker("wallet"),
				error: walletError,
				errorTestID: `${testID}-wallet-error`,
				rowTestID: `${testID}-wallet`,
			})}

			{isTransfer
				? renderRow({
						label: copy.targetWalletLabel,
						value: walletName(wallets, draft.targetWalletId) ?? "",
						selected: Boolean(walletName(wallets, draft.targetWalletId)),
						onPress: () => openPicker("targetWallet"),
						error: targetWalletError,
						errorTestID: `${testID}-target-wallet-error`,
						rowTestID: `${testID}-target-wallet`,
					})
				: null}

			{renderRow({
				label: copy.dateLabel,
				value: formatDraftDate(draft.date, language),
				selected: true,
				onPress: () => openPicker("date"),
				error: fieldErrorLabel("date", errors, language),
				errorTestID: `${testID}-date-error`,
				rowTestID: `${testID}-date`,
			})}

			<View style={styles.field}>
				<Pressable
					onPress={() => setDetailOpen((open) => !open)}
					accessibilityRole="button"
					accessibilityLabel={detailOpen ? copy.hideDetail : copy.addDetail}
					accessibilityState={{ expanded: detailOpen }}
					style={styles.detailToggle}
					testID={`${testID}-detail-toggle`}
				>
					<Text style={styles.detailToggleText}>
						{detailOpen ? copy.hideDetail : copy.addDetail}
					</Text>
					<Text
						style={styles.chevron}
						accessible={false}
						importantForAccessibility="no"
					>
						{detailOpen ? "▾" : "▸"}
					</Text>
				</Pressable>

				{detailOpen ? (
					<View style={styles.detailBody}>
						<View style={styles.field}>
							<Text style={styles.label}>{copy.merchantLabel}</Text>
							<TextInput
								testID={`${testID}-merchant`}
								accessibilityLabel={copy.merchantLabel}
								editable={editable}
								accessibilityState={{ disabled: !editable }}
								placeholder={copy.merchantPlaceholder}
								placeholderTextColor={fe.decorativeMuted}
								value={draft.merchant ?? ""}
								onChangeText={(text) => onChange({ merchant: text || null })}
								style={styles.detailInput}
							/>
						</View>
						<View style={styles.field}>
							<Text style={styles.label}>{copy.descriptionLabel}</Text>
							<TextInput
								testID={`${testID}-description`}
								accessibilityLabel={copy.descriptionLabel}
								editable={editable}
								accessibilityState={{ disabled: !editable }}
								placeholder={copy.descriptionPlaceholder}
								placeholderTextColor={fe.decorativeMuted}
								value={draft.description}
								onChangeText={(text) => onChange({ description: text })}
								style={styles.detailInput}
								multiline
							/>
						</View>
					</View>
				) : null}
			</View>

			{!canCreate ? (
				<Text
					style={styles.errorText}
					accessibilityRole="alert"
					testID={`${testID}-permission-error`}
				>
					{fieldErrorLabel("permission", errors, language) ?? copy.viewerNotice}
				</Text>
			) : null}

			<TransactionDatePickerSheet
				visible={dateSheetOpen}
				value={draft.date}
				onChange={(next) => onChange({ date: next })}
				onClose={() => setDateSheetOpen(false)}
			/>
		</View>
	);
}

function createStyles() {
	return StyleSheet.create({
		container: {
			gap: 14,
		},
		field: {
			gap: 6,
		},
		label: {
			color: fe.textMuted,
			fontSize: 10,
			fontWeight: "800",
			letterSpacing: 0.6,
			textTransform: "uppercase",
		},
		amountRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			backgroundColor: fe.white,
			borderWidth: 1,
			borderColor: fe.line,
			borderRadius: 16,
			paddingHorizontal: 14,
			minHeight: 60,
		},
		amountPrefix: {
			color: fe.textMuted,
			fontSize: 18,
			fontWeight: "800",
		},
		amountInput: {
			flex: 1,
			minHeight: 56,
			color: fe.financialExpense,
			fontSize: 30,
			fontWeight: "800",
			paddingVertical: 8,
		},
		amountIncome: {
			color: fe.financialIncome,
		},
		amountInvalid: {
			color: fe.financialExpenseAlert,
		},
		segmented: {
			flexDirection: "row",
			backgroundColor: fe.white,
			borderWidth: 1,
			borderColor: fe.line,
			borderRadius: 999,
			padding: 3,
			gap: 3,
		},
		segment: {
			flex: 1,
			minHeight: 44,
			alignItems: "center",
			justifyContent: "center",
			borderRadius: 999,
			paddingHorizontal: 8,
		},
		segmentSelected: {
			backgroundColor: fe.blueDeep,
		},
		segmentDisabled: {
			opacity: 0.5,
		},
		segmentText: {
			color: fe.blueDeep,
			fontSize: 13,
			fontWeight: "800",
		},
		segmentTextSelected: {
			color: fe.white,
		},
		row: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 12,
			minHeight: 56,
			backgroundColor: fe.white,
			borderWidth: 1,
			borderColor: fe.line,
			borderRadius: 16,
			paddingHorizontal: 14,
		},
		rowDisabled: {
			opacity: 0.6,
		},
		rowLabel: {
			color: fe.ink,
			fontSize: 15,
			fontWeight: "700",
		},
		rowValueWrap: {
			flexShrink: 1,
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},
		rowValue: {
			flexShrink: 1,
			color: fe.blue,
			fontSize: 15,
			fontWeight: "700",
			textAlign: "right",
		},
		rowValuePlaceholder: {
			color: fe.textMuted,
			fontWeight: "600",
		},
		chevron: {
			color: fe.decorativeMuted,
			fontSize: 20,
			fontWeight: "700",
		},
		detailToggle: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			minHeight: 44,
			borderTopWidth: 1,
			borderTopColor: fe.line,
			paddingHorizontal: 4,
		},
		detailToggleText: {
			color: fe.blue,
			fontSize: 14,
			fontWeight: "800",
		},
		detailBody: {
			gap: 14,
			paddingTop: 4,
		},
		detailInput: {
			minHeight: 44,
			backgroundColor: fe.white,
			borderWidth: 1,
			borderColor: fe.line,
			borderRadius: 16,
			paddingHorizontal: 14,
			paddingVertical: 10,
			color: fe.ink,
			fontSize: 15,
		},
		errorText: {
			color: fe.financialExpenseAlert,
			fontSize: 12,
			fontWeight: "700",
		},
	});
}
