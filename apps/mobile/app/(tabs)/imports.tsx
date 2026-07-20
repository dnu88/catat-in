import { useCallback, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect, useRouter } from "expo-router";

import { featureFlags } from "../../src/config/features";
import { useSupabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/theme/theme-context";
import { useFinanceContext } from "../../src/state/finance-context";
import { listWallets, type Wallet } from "../../src/services/wallets";
import {
	BANK_OPTIONS,
	confirmImportStatement,
	previewImportStatement,
	type BankName,
	type ConfirmImportResponse,
	type ImportPreviewResponse,
} from "../../src/services/import-statements";

const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMPORT_EXTENSIONS = [".csv", ".xlsx"];

type PickedImportFile = {
	uri: string;
	name: string;
	mimeType?: string | null;
	size?: number | null;
};

function formatAmount(value: number | string) {
	const amount = Number(value);
	if (!Number.isFinite(amount)) return String(value);
	return `Rp${amount.toLocaleString("id-ID")}`;
}

function isSupportedImportFile(name: string) {
	const lower = name.trim().toLowerCase();
	return ALLOWED_IMPORT_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

async function blobFromPickedFile(file: PickedImportFile) {
	const response = await fetch(file.uri);
	if (!response.ok) throw new Error("File rekening koran tidak bisa dibaca.");
	return response.blob();
}

export default function ImportsScreen() {
	const { supabase } = useSupabase();
	const { theme } = useTheme();
	const router = useRouter();
	const { activeContext, canCreate } = useFinanceContext();
	const [wallets, setWallets] = useState<Wallet[]>([]);
	const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
	const [selectedBank, setSelectedBank] = useState<BankName>("bca");
	const [file, setFile] = useState<PickedImportFile | null>(null);
	const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
	const [confirmResult, setConfirmResult] = useState<ConfirmImportResponse | null>(null);
	const [loadingWallets, setLoadingWallets] = useState(false);
	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const activeWallets = useMemo(
		() => wallets.filter((wallet) => wallet.is_active !== false),
		[wallets],
	);

	const loadWallets = useCallback(async () => {
		if (!featureFlags.importStatement) return;
		setLoadingWallets(true);
		try {
			const rows = await listWallets(activeContext);
			const activeRows = rows.filter((wallet) => wallet.is_active !== false);
			setWallets(activeRows);
			setSelectedWalletId((current) =>
				current && activeRows.some((wallet) => wallet.id === current)
					? current
					: (activeRows[0]?.id ?? null),
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Daftar akun belum bisa dimuat.");
		} finally {
			setLoadingWallets(false);
		}
	}, [activeContext]);

	useFocusEffect(
		useCallback(() => {
			void loadWallets();
		}, [loadWallets]),
	);

	const chooseFile = async () => {
		setError(null);
		setConfirmResult(null);
		try {
			const result = await DocumentPicker.getDocumentAsync({
				copyToCacheDirectory: true,
				multiple: false,
				type: [
					"text/csv",
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				],
			});
			if (result.canceled) return;
			const asset = result.assets[0];
			if (!asset) return;
			const picked = {
				uri: asset.uri,
				name: asset.name ?? "rekening-koran.csv",
				mimeType: asset.mimeType,
				size: asset.size,
			};
			if (!isSupportedImportFile(picked.name)) {
				setError("Format belum didukung. Gunakan file CSV atau XLSX.");
				return;
			}
			if (picked.size && picked.size > MAX_IMPORT_FILE_BYTES) {
				setError("File terlalu besar. Maksimal 5MB.");
				return;
			}
			setFile(picked);
			setPreview(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "File belum bisa dipilih.");
		}
	};

	const runPreview = async () => {
		setError(null);
		setConfirmResult(null);
		if (!canCreate) {
			setError("Akses lihat saja tidak dapat melakukan import.");
			return;
		}
		if (!selectedWalletId) {
			setError("Pilih akun tujuan sebelum import.");
			return;
		}
		if (!file) {
			setError("Pilih file rekening koran terlebih dahulu.");
			return;
		}
		if (file.size && file.size > MAX_IMPORT_FILE_BYTES) {
			setError("File terlalu besar. Maksimal 5MB.");
			return;
		}

		setProcessing(true);
		try {
			const blob = await blobFromPickedFile(file);
			if (blob.size > MAX_IMPORT_FILE_BYTES) {
				setError("File terlalu besar. Maksimal 5MB.");
				return;
			}
			const result = await previewImportStatement(supabase, {
				blob,
				filename: file.name,
				mimeType: file.mimeType || blob.type,
				bankName: selectedBank,
			});
			setPreview(result);
		} catch (err) {
			setPreview(null);
			setError(err instanceof Error ? err.message : "File belum bisa diproses.");
		} finally {
			setProcessing(false);
		}
	};

	const runConfirm = async () => {
		setError(null);
		if (!preview || !selectedWalletId) return;
		if (preview.transactions.length === 0) {
			setError("Tidak ada transaksi baru untuk diimpor.");
			return;
		}
		setProcessing(true);
		try {
			const result = await confirmImportStatement(supabase, {
				wallet_id: selectedWalletId,
				transactions: preview.transactions,
				skip_duplicates: true,
				context_type: activeContext.type === "household" ? "household" : "personal",
				household_id: activeContext.type === "household" ? activeContext.householdId : null,
			});
			setConfirmResult(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Transaksi belum bisa diimpor.");
		} finally {
			setProcessing(false);
		}
	};

	if (!featureFlags.importStatement) {
		return (
			<ScrollView
				style={[styles.container, { backgroundColor: theme.colors.background }]}
				contentContainerStyle={styles.content}
			>
				<View style={[styles.card, { backgroundColor: theme.colors.surface }]}> 
					<Text style={[styles.title, { color: theme.colors.textPrimary }]}>Import Rekening Koran</Text>
					<Text style={[styles.helper, { color: theme.colors.textSecondary }]}>Fitur sedang disiapkan. Import akan tersedia bertahap tanpa mengubah alur aplikasi yang sudah live.</Text>
					<Pressable
						testID="imports-back-to-capture"
						accessibilityRole="button"
						style={[styles.primaryButton, { backgroundColor: theme.colors.brandPrimary }]}
						onPress={() => router.push("/(tabs)/capture")}
					>
						<Text style={[styles.primaryButtonText, { color: theme.colors.textInverse }]}>Kembali ke Capture</Text>
					</Pressable>
				</View>
			</ScrollView>
		);
	}

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: theme.colors.background }]}
			contentContainerStyle={styles.content}
		>
			<View style={[styles.card, { backgroundColor: theme.colors.surface }]}> 
				<Text style={[styles.title, { color: theme.colors.textPrimary }]}>Import Rekening Koran</Text>
				<Text style={[styles.helper, { color: theme.colors.textSecondary }]}>Upload CSV/XLSX dari bank atau e-wallet. Kaswise akan menampilkan preview sebelum transaksi disimpan.</Text>
			</View>

			<View style={[styles.card, { backgroundColor: theme.colors.surface }]}> 
				<Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>1. Pilih akun tujuan</Text>
				{loadingWallets ? <ActivityIndicator testID="imports-wallets-loading" /> : null}
				{activeWallets.length === 0 && !loadingWallets ? (
					<Text style={[styles.helper, { color: theme.colors.textSecondary }]}>Belum ada akun aktif. Buat akun dulu sebelum import.</Text>
				) : (
					<View style={styles.chipWrap}>
						{activeWallets.map((wallet) => (
							<Pressable
								key={wallet.id}
								testID={`imports-wallet-${wallet.id}`}
								accessibilityRole="button"
								accessibilityState={{ selected: selectedWalletId === wallet.id }}
								style={[
									styles.chip,
									{ borderColor: theme.colors.borderSoft },
									selectedWalletId === wallet.id && { backgroundColor: theme.colors.brandPrimary, borderColor: theme.colors.brandPrimary },
								]}
								onPress={() => setSelectedWalletId(wallet.id)}
							>
								<Text style={[styles.chipText, { color: selectedWalletId === wallet.id ? theme.colors.textInverse : theme.colors.textPrimary }]}>{wallet.name}</Text>
							</Pressable>
						))}
					</View>
				)}
			</View>

			<View style={[styles.card, { backgroundColor: theme.colors.surface }]}> 
				<Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>2. Pilih bank/e-wallet</Text>
				<View style={styles.chipWrap}>
					{BANK_OPTIONS.map((bank) => (
						<Pressable
							key={bank.id}
							testID={`imports-bank-${bank.id}`}
							accessibilityRole="button"
							accessibilityState={{ selected: selectedBank === bank.id }}
							style={[
								styles.chip,
								{ borderColor: theme.colors.borderSoft },
								selectedBank === bank.id && { backgroundColor: theme.colors.brandPrimary, borderColor: theme.colors.brandPrimary },
							]}
							onPress={() => setSelectedBank(bank.id)}
						>
							<Text style={[styles.chipText, { color: selectedBank === bank.id ? theme.colors.textInverse : theme.colors.textPrimary }]}>{bank.label}</Text>
						</Pressable>
					))}
				</View>
			</View>

			<View style={[styles.card, { backgroundColor: theme.colors.surface }]}> 
				<Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>3. Upload file</Text>
				<Pressable
					testID="imports-choose-file"
					accessibilityRole="button"
					style={[styles.secondaryButton, { borderColor: theme.colors.borderSoft }]}
					onPress={chooseFile}
				>
					<Text style={[styles.secondaryButtonText, { color: theme.colors.textPrimary }]}>{file ? file.name : "Pilih CSV/XLSX"}</Text>
				</Pressable>
				<Text style={[styles.smallText, { color: theme.colors.textMuted }]}>Maksimal 5MB. PDF rekening koran belum didukung di MVP.</Text>
				<Pressable
					testID="imports-preview-submit"
					accessibilityRole="button"
					accessibilityState={{ disabled: processing }}
					disabled={processing}
					style={[styles.primaryButton, { backgroundColor: theme.colors.brandPrimary, opacity: processing ? 0.6 : 1 }]}
					onPress={runPreview}
				>
					{processing ? <ActivityIndicator color={theme.colors.textInverse} /> : <Text style={[styles.primaryButtonText, { color: theme.colors.textInverse }]}>Preview Import</Text>}
				</Pressable>
			</View>

			{error ? (
				<View testID="imports-error" style={[styles.messageCard, { backgroundColor: theme.mode === "light" ? "#fee2e2" : "rgba(248,113,113,0.16)" }]}> 
					<Text style={[styles.messageText, { color: theme.colors.danger ?? "#991b1b" }]}>{error}</Text>
				</View>
			) : null}

			{preview ? (
				<View testID="imports-preview-result" style={[styles.card, { backgroundColor: theme.colors.surface }]}> 
					<Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Preview {preview.bank_name}</Text>
					<View style={styles.summaryGrid}>
						<SummaryItem label="Total baris" value={preview.total_rows} />
						<SummaryItem label="Transaksi baru" value={preview.transactions.length} />
						<SummaryItem label="Duplikat" value={preview.duplicates.length} />
						<SummaryItem label="Error" value={preview.errors.length} />
					</View>
					{preview.skipped_months > 0 ? (
						<Text style={[styles.smallText, { color: theme.colors.textMuted }]}>{preview.skipped_months} baris di luar periode free tier dilewati.</Text>
					) : null}
					{preview.transactions.slice(0, 10).map((tx) => (
						<View key={tx.hash} style={[styles.row, { borderColor: theme.colors.borderSoft }]}> 
							<View style={styles.rowMain}>
								<Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>{tx.description}</Text>
								<Text style={[styles.smallText, { color: theme.colors.textMuted }]}>{tx.date} • {tx.type === "income" ? "Pemasukan" : "Pengeluaran"}</Text>
							</View>
							<Text style={[styles.rowAmount, { color: theme.colors.textPrimary }]}>{formatAmount(tx.amount)}</Text>
						</View>
					))}
					{preview.duplicates.length > 0 ? <Text style={[styles.smallText, { color: theme.colors.textMuted }]}>{preview.duplicates.length} duplikat akan dilewati otomatis.</Text> : null}
					{preview.errors.slice(0, 5).map((row) => (
						<Text key={`${row.row}-${row.reason}`} style={[styles.smallText, { color: theme.colors.danger ?? "#991b1b" }]}>Baris {row.row}: {row.reason}</Text>
					))}
					<Pressable
						testID="imports-confirm-submit"
						accessibilityRole="button"
						accessibilityState={{ disabled: processing || preview.transactions.length === 0 }}
						disabled={processing || preview.transactions.length === 0}
						style={[styles.primaryButton, { backgroundColor: theme.colors.brandPrimary, opacity: processing || preview.transactions.length === 0 ? 0.6 : 1 }]}
						onPress={runConfirm}
					>
						<Text style={[styles.primaryButtonText, { color: theme.colors.textInverse }]}>Konfirmasi Import</Text>
					</Pressable>
				</View>
			) : null}

			{confirmResult ? (
				<View testID="imports-confirm-result" style={[styles.messageCard, { backgroundColor: theme.mode === "light" ? "#dcfce7" : "rgba(34,197,94,0.16)" }]}> 
					<Text style={[styles.messageText, { color: theme.colors.success ?? "#166534" }]}>{confirmResult.message}</Text>
					<Text style={[styles.smallText, { color: theme.colors.textSecondary }]}>{confirmResult.imported} transaksi masuk, {confirmResult.skipped_duplicates} duplikat dilewati.</Text>
					<Pressable
						testID="imports-view-transactions"
						accessibilityRole="button"
						style={[styles.secondaryButton, { borderColor: theme.colors.borderSoft }]}
						onPress={() => router.push("/(tabs)/transactions")}
					>
						<Text style={[styles.secondaryButtonText, { color: theme.colors.textPrimary }]}>Lihat Transaksi</Text>
					</Pressable>
				</View>
			) : null}
		</ScrollView>
	);
}

function SummaryItem({ label, value }: { label: string; value: number }) {
	return (
		<View style={styles.summaryItem}>
			<Text style={styles.summaryValue}>{value}</Text>
			<Text style={styles.summaryLabel}>{label}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		padding: 16,
		gap: 14,
		paddingBottom: 120,
	},
	card: {
		borderRadius: 20,
		padding: 16,
		gap: 12,
	},
	title: {
		fontSize: 24,
		fontWeight: "800",
	},
	sectionTitle: {
		fontSize: 17,
		fontWeight: "800",
	},
	helper: {
		fontSize: 14,
		lineHeight: 20,
	},
	smallText: {
		fontSize: 12,
		lineHeight: 17,
	},
	chipWrap: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	chip: {
		borderRadius: 999,
		borderWidth: 1,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	chipText: {
		fontSize: 13,
		fontWeight: "700",
	},
	primaryButton: {
		minHeight: 46,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 16,
		marginTop: 4,
	},
	primaryButtonText: {
		fontSize: 15,
		fontWeight: "800",
	},
	secondaryButton: {
		minHeight: 44,
		borderRadius: 14,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 14,
	},
	secondaryButtonText: {
		fontSize: 14,
		fontWeight: "700",
	},
	messageCard: {
		borderRadius: 16,
		padding: 14,
		gap: 8,
	},
	messageText: {
		fontSize: 14,
		fontWeight: "700",
	},
	summaryGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	summaryItem: {
		minWidth: "47%",
		borderRadius: 14,
		backgroundColor: "rgba(127,127,127,0.10)",
		padding: 12,
	},
	summaryValue: {
		fontSize: 20,
		fontWeight: "800",
	},
	summaryLabel: {
		fontSize: 12,
		fontWeight: "600",
	},
	row: {
		borderTopWidth: 1,
		paddingTop: 10,
		flexDirection: "row",
		gap: 8,
		alignItems: "center",
	},
	rowMain: {
		flex: 1,
	},
	rowTitle: {
		fontSize: 14,
		fontWeight: "700",
	},
	rowAmount: {
		fontSize: 14,
		fontWeight: "800",
	},
});
