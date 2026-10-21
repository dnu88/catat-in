import type { Language } from "../../i18n/i18n-context";
import type {
	DraftFieldErrors,
	ReviewField,
} from "../../features/transaction-entry/draft";
import { localToday } from "../../features/transaction-entry/draft";

/**
 * Copy + formatting for the transaction entry components.
 *
 * The shared i18n provider only ships the app-shell strings; the entry flow
 * keeps its own small dictionary so every label still resolves in Indonesian
 * and English from the same `language` value the screens already use.
 */

export type EntryCopy = {
	close: string;
	amountLabel: string;
	amountPlaceholder: string;
	typeHint: string;
	typeExpense: string;
	typeIncome: string;
	typeTransfer: string;
	categoryLabel: string;
	walletLabel: string;
	targetWalletLabel: string;
	dateLabel: string;
	choose: string;
	today: string;
	addDetail: string;
	hideDetail: string;
	merchantLabel: string;
	merchantPlaceholder: string;
	descriptionLabel: string;
	descriptionPlaceholder: string;
	viewerNotice: string;
	save: string;
	cancel: string;
	summaryTotalLabel: string;
	singleSummaryLabel: string;
	countUnit: string;
	acknowledge: string;
	viewSource: string;
	hideSource: string;
	sourceTitle: string;
	datePickerTitle: string;
	successTitle: string;
	successCountUnit: string;
	captureAnother: string;
	viewTransactions: string;
	destinationPrefix: string;
	amountUncertain: string;
	categoryUncertain: string;
	dateUncertain: string;
	walletUncertain: string;
	amountError: string;
	categoryError: string;
	dateError: string;
	walletError: string;
	targetWalletError: string;
	sameWalletError: string;
	permissionError: string;
	genericError: string;
	/** Heading for the "only this needs a check" banner shown before the form. */
	focusTitle: string;
	/** Shortcut label that opens the picker for one unresolved field. */
	focusFix: string;
	/** Reassurance that everything outside the banner is already filled. */
	focusRest: string;
};

const id: EntryCopy = {
	close: "Tutup",
	amountLabel: "Nominal",
	amountPlaceholder: "0",
	typeHint: "Jenis transaksi",
	typeExpense: "Pengeluaran",
	typeIncome: "Pemasukan",
	typeTransfer: "Transfer",
	categoryLabel: "Kategori",
	walletLabel: "Dompet",
	targetWalletLabel: "Dompet tujuan",
	dateLabel: "Tanggal",
	choose: "Pilih",
	today: "Hari ini",
	addDetail: "Tambah detail",
	hideDetail: "Sembunyikan detail",
	merchantLabel: "Merchant",
	merchantPlaceholder: "Nama merchant",
	descriptionLabel: "Catatan",
	descriptionPlaceholder: "Opsional",
	viewerNotice: "Kamu hanya bisa melihat transaksi ini.",
	save: "Simpan",
	cancel: "Batal",
	summaryTotalLabel: "Total",
	singleSummaryLabel: "Ringkasan",
	countUnit: "transaksi",
	acknowledge: "Konfirmasi",
	viewSource: "Lihat sumber",
	hideSource: "Sembunyikan sumber",
	sourceTitle: "Sumber",
	datePickerTitle: "Pilih tanggal",
	successTitle: "Transaksi tersimpan",
	successCountUnit: "transaksi tercatat",
	captureAnother: "Catat lagi",
	viewTransactions: "Lihat transaksi",
	destinationPrefix: "Tujuan",
	amountUncertain: "Nominal belum pasti. Periksa dulu.",
	categoryUncertain: "Kategori belum pasti. Periksa dulu.",
	dateUncertain: "Tanggal belum pasti. Periksa dulu.",
	walletUncertain: "Dompet belum pasti. Periksa dulu.",
	amountError: "Masukkan nominal lebih dari nol.",
	categoryError: "Pilih kategori untuk transaksi ini.",
	dateError: "Pilih tanggal yang valid.",
	walletError: "Pilih dompet sumber.",
	targetWalletError: "Pilih dompet tujuan.",
	sameWalletError: "Dompet tujuan harus berbeda dari dompet sumber.",
	permissionError: "Kamu tidak punya akses untuk mencatat.",
	genericError: "Periksa kembali kolom ini.",
	focusTitle: "Cuma ini yang perlu dicek",
	focusFix: "Perbaiki",
	focusRest: "Sisanya sudah terisi.",
};

const en: EntryCopy = {
	close: "Close",
	amountLabel: "Amount",
	amountPlaceholder: "0",
	typeHint: "Transaction type",
	typeExpense: "Expense",
	typeIncome: "Income",
	typeTransfer: "Transfer",
	categoryLabel: "Category",
	walletLabel: "Wallet",
	targetWalletLabel: "Destination wallet",
	dateLabel: "Date",
	choose: "Choose",
	today: "Today",
	addDetail: "Add detail",
	hideDetail: "Hide detail",
	merchantLabel: "Merchant",
	merchantPlaceholder: "Merchant name",
	descriptionLabel: "Note",
	descriptionPlaceholder: "Optional",
	viewerNotice: "You have view-only access to this transaction.",
	save: "Save",
	cancel: "Cancel",
	summaryTotalLabel: "Total",
	singleSummaryLabel: "Summary",
	countUnit: "transactions",
	acknowledge: "Acknowledge",
	viewSource: "View source",
	hideSource: "Hide source",
	sourceTitle: "Source",
	datePickerTitle: "Choose date",
	successTitle: "Transaction saved",
	successCountUnit: "transactions saved",
	captureAnother: "Capture another",
	viewTransactions: "View transactions",
	destinationPrefix: "Destination",
	amountUncertain: "Amount is uncertain. Please review.",
	categoryUncertain: "Category is uncertain. Please review.",
	dateUncertain: "Date is uncertain. Please review.",
	walletUncertain: "Wallet is uncertain. Please review.",
	amountError: "Enter an amount greater than zero.",
	categoryError: "Choose a category for this transaction.",
	dateError: "Choose a valid date.",
	walletError: "Choose a source wallet.",
	targetWalletError: "Choose a destination wallet.",
	sameWalletError: "Destination wallet must differ from the source wallet.",
	permissionError: "You do not have permission to record transactions.",
	genericError: "Check this field again.",
	focusTitle: "Only this needs a check",
	focusFix: "Fix",
	focusRest: "Everything else is filled.",
};

const COPY: Record<Language, EntryCopy> = { id, en };

export function entryCopy(language: Language): EntryCopy {
	return COPY[language] ?? id;
}

const WARNING_LABELS: Record<ReviewField, (copy: EntryCopy) => string> = {
	amount: (copy) => copy.amountUncertain,
	category: (copy) => copy.categoryUncertain,
	date: (copy) => copy.dateUncertain,
	wallet: (copy) => copy.walletUncertain,
};

export function warningLabel(field: ReviewField, language: Language): string {
	const copy = entryCopy(language);
	return (WARNING_LABELS[field] ?? (() => copy.genericError))(copy);
}

/**
 * Human label for a validation code produced by `validateDraft`.
 * Returns null when the field has no error, so callers can render conditionally.
 */
export function fieldErrorLabel(
	key: keyof DraftFieldErrors,
	errors: DraftFieldErrors | undefined,
	language: Language,
): string | null {
	const code = errors?.[key];
	if (!code) return null;
	const copy = entryCopy(language);
	switch (key) {
		case "amount":
			return copy.amountError;
		case "category":
			return copy.categoryError;
		case "date":
			return copy.dateError;
		case "walletId":
			return copy.walletError;
		case "targetWalletId":
			return code === "SAME_WALLET" ? copy.sameWalletError : copy.targetWalletError;
		case "permission":
			return copy.permissionError;
		default:
			return copy.genericError;
	}
}

/** id-ID style Rupiah formatting without relying on a full ICU bundle. */
export function formatRupiah(amount: number): string {
	const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
	const sign = safe < 0 ? "-" : "";
	const digits = Math.abs(safe).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	return `${sign}Rp ${digits}`;
}

const MONTHS_ID = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"Mei",
	"Jun",
	"Jul",
	"Agu",
	"Sep",
	"Okt",
	"Nov",
	"Des",
];

const MONTHS_EN = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

/** Human label for a draft date: "Hari ini" / "Today" plus a local short date. */
export function formatDraftDate(date: string, language: Language): string {
	const copy = entryCopy(language);
	if (date === localToday()) return copy.today;
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
	if (!match) return date;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (month < 1 || month > 12) return date;
	if (language === "en") {
		return `${MONTHS_EN[month - 1]} ${day}, ${year}`;
	}
	return `${day} ${MONTHS_ID[month - 1]} ${year}`;
}
