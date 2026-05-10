import { useEffect, useState } from "react";
import { useWalletStore } from "@store/wallet.store";
import type { Wallet, WalletType } from "@kaswise/shared/types";
import type { WalletFormData } from "@store/wallet.store";
import { useI18nStore } from "@store/i18n.store";

const getErrorMessage = (err: unknown, fallback: string) =>
	err instanceof Error ? err.message : fallback;

const WALLET_TYPE_LABEL: Record<string, string> = {
	bank: "Bank",
	ewallet: "E-Wallet",
	cash: "Tunai",
	investment: "Investasi",
};

export const getWalletTypeAccent = (type: string) => {
	const map: Record<string, string> = {
		bank: "var(--accent)",
		ewallet: "var(--info)",
		cash: "var(--green)",
		investment: "var(--amber)",
	};
	return map[type] || "var(--border-strong)";
};

function formatRupiah(amount: number) {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		maximumFractionDigits: 0,
	}).format(amount);
}

interface WalletModalProps {
	initialData?: Wallet;
	onClose: () => void;
	onSave: (data: WalletFormData) => Promise<void>;
}

function WalletModal({ initialData, onClose, onSave }: WalletModalProps) {
	const isEdit = Boolean(initialData);
	const [name, setName] = useState(initialData?.name || "");
	const [type, setType] = useState<WalletType>(initialData?.type || "bank");
	const [balance, setBalance] = useState(initialData?.balance?.toString() || "");
	const [bankName, setBankName] = useState(initialData?.bank_name || "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (!name.trim()) return setError("Nama wallet wajib diisi");
		setSaving(true);
		try {
			await onSave({
				name: name.trim(),
				type,
				balance: parseFloat(balance) || 0,
				bank_name: bankName.trim() || undefined,
			});
			onClose();
		} catch (err: unknown) {
			setError(getErrorMessage(err, "Gagal menyimpan wallet"));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="modal-overlay">
			<div className="modal-box animate-slide-up" style={{ maxWidth: "460px" }}>
				<h3 style={{ margin: "0 0 16px", color: "var(--text-primary)" }}>
					{isEdit ? "Edit Wallet" : "Tambah Wallet Baru"}
				</h3>
				<form onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
					<label className="form-label">Nama Wallet</label>
					<input
						className="form-input"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="cth: BCA Utama"
						required
					/>

					<label className="form-label">Jenis</label>
					<select
						className="form-input"
						value={type}
						onChange={(e) => setType(e.target.value as WalletType)}
					>
						<option value="bank">Bank</option>
						<option value="ewallet">E-Wallet</option>
						<option value="cash">Tunai</option>
						<option value="investment">Investasi</option>
					</select>

					<label className="form-label">Nama Bank / Platform (opsional)</label>
					<input
						className="form-input"
						value={bankName}
						onChange={(e) => setBankName(e.target.value)}
						placeholder="cth: BCA, GoPay, OVO"
					/>

					<label className="form-label">{isEdit ? "Saldo (Rp)" : "Saldo Awal (Rp)"}</label>
					<input
						className="form-input"
						type="number"
						min="0"
						value={balance}
						onChange={(e) => setBalance(e.target.value)}
						placeholder="0"
					/>

					{error ? (
						<p
							style={{
								margin: 0,
								fontSize: "12px",
								color: "var(--red)",
								background: "color-mix(in srgb, var(--red) 16%, transparent)",
								border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)",
								padding: "8px 10px",
								borderRadius: "var(--r-sm)",
							}}
						>
							{error}
						</p>
					) : null}

					<div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
						<button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
							Batal
						</button>
						<button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
							{saving ? "Menyimpan..." : "Simpan"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

interface WalletCardProps {
	wallet: Wallet;
	onEdit: (wallet: Wallet) => void;
	onDelete: (id: string) => void;
}

function WalletCard({ wallet, onEdit, onDelete }: WalletCardProps) {
	const accent = getWalletTypeAccent(wallet.type);
	return (
		<div className="card page-section-card" style={{ padding: "14px", borderTop: `4px solid ${accent}` }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
				<div>
					<p style={{ margin: "0 0 2px", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
						{WALLET_TYPE_LABEL[wallet.type] || wallet.type}
					</p>
					<h4 style={{ margin: "0 0 2px", fontSize: "15px", color: "var(--text-primary)" }}>{wallet.name}</h4>
					{wallet.bank_name ? (
						<p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>{wallet.bank_name}</p>
					) : null}
				</div>
				<div style={{ display: "flex", gap: "6px" }}>
					<button onClick={() => onEdit(wallet)} className="btn btn-secondary" style={{ minHeight: "30px", padding: "5px 8px" }} title="Edit wallet">
						✏️
					</button>
					<button onClick={() => onDelete(wallet.id)} className="btn btn-danger" style={{ minHeight: "30px", padding: "5px 8px" }} title="Hapus wallet">
						✕
					</button>
				</div>
			</div>
			<p style={{ margin: "10px 0 0", fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>
				{formatRupiah(Number(wallet.balance))}
			</p>
		</div>
	);
}

export default function WalletPage() {
	const { language } = useI18nStore();
	const {
		wallets,
		isLoading,
		error,
		fetchWallets,
		addWallet,
		updateWallet,
		deleteWallet,
		recalculateBalances,
		totalBalance,
	} = useWalletStore();
	const [showModal, setShowModal] = useState(false);
	const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
	const [isRecalculating, setIsRecalculating] = useState(false);

	useEffect(() => {
		fetchWallets();
	}, []);

	const handleDelete = async (id: string) => {
		if (!window.confirm("Hapus wallet ini?")) return;
		try {
			await deleteWallet(id);
		} catch {
			alert("Gagal menghapus wallet");
		}
	};

	const handleEdit = (wallet: Wallet) => {
		setEditingWallet(wallet);
		setShowModal(true);
	};

	const handleSave = async (data: WalletFormData) => {
		if (editingWallet) {
			await updateWallet(editingWallet.id, data);
		} else {
			await addWallet(data);
		}
	};

	const handleRecalculate = async () => {
		if (!window.confirm("Hitung ulang semua saldo wallet dari histori transaksi?")) return;
		setIsRecalculating(true);
		try {
			const summary = await recalculateBalances();
			alert(`Recalculate selesai. ${summary.updated_count}/${summary.wallet_count} wallet diperbarui.`);
		} catch (err: unknown) {
			alert(getErrorMessage(err, "Gagal menghitung ulang saldo wallet."));
		} finally {
			setIsRecalculating(false);
		}
	};

	const handleCloseModal = () => {
		setShowModal(false);
		setEditingWallet(null);
	};

	return (
		<div className="page-shell">
			<div className="page-header">
				<div>
					<h2 className="page-title">{language === "id" ? "Dompet & Rekening" : "Wallets & Accounts"}</h2>
					<p className="page-subtitle">
						Total Saldo: <strong style={{ color: "var(--accent)" }}>{formatRupiah(totalBalance())}</strong>
					</p>
				</div>
				<div className="topbar-actions" style={{ alignSelf: "center" }}>
					<button onClick={handleRecalculate} className="btn btn-secondary" disabled={isRecalculating}>
						{isRecalculating ? "Menghitung ulang..." : "↻ Recalculate Saldo"}
					</button>
					<button
						onClick={() => {
							setEditingWallet(null);
							setShowModal(true);
						}}
						className="btn btn-primary"
					>
						+ {language === "id" ? "Tambah Wallet" : "Add Wallet"}
					</button>
				</div>
			</div>

			{isLoading ? (
				<div className="card page-section-card" style={{ textAlign: "center" }}>
					<p style={{ margin: 0, color: "var(--text-secondary)" }}>{language === "id" ? "Memuat..." : "Loading..."}</p>
				</div>
			) : null}

			{error ? (
				<div
					className="page-section-card"
					style={{
						background: "color-mix(in srgb, var(--red) 12%, var(--bg-card))",
						border: "1px solid color-mix(in srgb, var(--red) 28%, transparent)",
					}}
				>
					<p style={{ margin: 0, color: "var(--red)", fontWeight: 600 }}>{error}</p>
				</div>
			) : null}

			{!isLoading && wallets.length === 0 ? (
				<div className="card page-section-card" style={{ textAlign: "center", padding: "30px 18px" }}>
					<p style={{ fontSize: "36px", margin: "0 0 8px" }}>💳</p>
					<p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.6 }}>
						{language === "id"
							? "Belum ada wallet. Tambahkan rekening atau dompet pertama kamu!"
							: "No wallet yet. Add your first account or wallet."}
					</p>
				</div>
			) : null}

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
				{wallets.map((w) => (
					<WalletCard key={w.id} wallet={w} onEdit={handleEdit} onDelete={handleDelete} />
				))}
			</div>

			{showModal ? <WalletModal initialData={editingWallet ?? undefined} onClose={handleCloseModal} onSave={handleSave} /> : null}
		</div>
	);
}
