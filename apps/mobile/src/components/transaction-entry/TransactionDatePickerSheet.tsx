import { useI18n } from "../../i18n/i18n-context";
import { IOSWheelDatePicker } from "../date/IOSWheelDatePicker";
import { entryCopy } from "./copy";
import { EntrySheet } from "./EntrySheet";

type TransactionDatePickerSheetProps = {
	visible: boolean;
	value: string;
	onChange: (nextValue: string) => void;
	onClose: () => void;
	testID?: string;
};

/**
 * Date picker sheet for a draft. Wraps the existing iOS-style wheel picker in
 * the shared accessible sheet — no second wheel implementation.
 */
export function TransactionDatePickerSheet({
	visible,
	value,
	onChange,
	onClose,
	testID = "transaction-date-sheet",
}: TransactionDatePickerSheetProps) {
	const { language } = useI18n();
	const copy = entryCopy(language);

	return (
		<EntrySheet
			visible={visible}
			title={copy.datePickerTitle}
			onClose={onClose}
			testID={testID}
		>
			<IOSWheelDatePicker
				value={value}
				onChange={onChange}
				locale={language}
				testID={`${testID}-wheel`}
			/>
		</EntrySheet>
	);
}
