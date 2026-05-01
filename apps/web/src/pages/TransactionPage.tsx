import { useEffect, useMemo, useState } from "react";
import { useTransactionStore } from "@store/transaction.store";
import { useWalletStore } from "@store/wallet.store";
import { useCategoryStore } from "@store/category.store";
import {
	CATEGORY_EMOJI,
	CATEGORY_LABEL,
	buildCategoryOptions,
} from "@lib/categories";
import type { Transaction, TransactionFormData } from "@catat-in/shared/types";
import { api } from "@lib/api";
import { listMyGroups, requireAuthUid } from "@lib/firestore";
import { useI18nStore } from "@store/i18n.store";

function formatRupiah(amount: number) {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		maximumFractionDigits: 0,
	}).format(amount);
}

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

function TxModal({
	initialData,
	onClose,
	onSave,
	walletOptions,
	groupOptions,
}: {
	initialData?: Transaction;
	onClose: () => void;
	onSave: (data: TransactionFormData) => Promise<unknown>;
	walletOptions: { id: string; name: string }[];
	groupOptions: { id: string; name: string }[];
}) {
	const { categories, fetchCategories } = useCategoryStore();
	const isEdit = Boolean(initialData);
	const [type, setType] = useState<"income" | "expense">(
		initialData?.type || "expense",
	);
	const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
	const [category, setCategory] = useState(initialData?.category || "food");
	const [walletId, setWalletId] = useState(
		initialData?.wallet_id || walletOptions[0]?.id || "",
	);
	const [note, setNote] = useState(initialData?.note || "");
	const [merchant, setMerchant] = useState(initialData?.merchant || "");
	const [isShared, setIsShared] = useState(Boolean(initialData?.is_shared));
	const [groupId, setGroupId] = useState(initialData?.group_id || "");
	const [date, setDate] = useState(
		initialData?.date || new Date().toISOString().split("T")[0],
	);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		fetchCategories(type);
	}, [fetchCategories, type]);

	const categoryOptions = buildCategoryOptions(categories, type);
	const selectableCategories = useMemo(
		() =>
			categoryOptions.length
				? categoryOptions
				: [
						{
							value: type === "income" ? "salary" : "food",
							label: type === "income" ? "💼 Gaji" : "🍔 Makan & Minum",
						},
					],
		[categoryOptions, type],
	);

	useEffect(() => {
		if (!selectableCategories.some((item) => item.value === category)) {
			setCategory(
				selectableCategories[0]?.value ||
					(type === "income" ? "salary" : "food"),
			);
		}
	}, [category, selectableCategories, type]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		const parsedAmount = parseFloat(amount);
		if (!parsedAmount || parsedAmount <= 0)
			return setError("Nominal harus lebih dari 0");
		if (!walletId) return setError("Pilih wallet terlebih dahulu");
		if (isShared && !groupId)
			return setError("Pilih grup untuk transaksi bersama");
		setSaving(true);
		try {
			await onSave({
				type,
				amount: parsedAmount,
				category,
				wallet_id: walletId,
				note: note || undefined,
				merchant: merchant || undefined,
				date,
				is_shared: isShared,
				group_id: isShared ? groupId : undefined,
			});
			onClose();
		} catch (err: any) {
			setError(err.message || "Gagal menyimpan transaksi");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="modal-overlay">
			<div className="modal-box animate-slide-up">
				<h3
					style={{
						fontSize: "18px",
						fontWeight: 700,
						color: "var(--text-primary)",
						marginBottom: "20px",
					}}
				>
					{isEdit ? "Edit Transaksi" : "Tambah Transaksi"}
				</h3>
				<form
					onSubmit={handleSubmit}
					style={{ display: "flex", flexDirection: "column", gap: "14px" }}
				>
					<div style={{ display: "flex", gap: "8px" }}>
						<button
							type="button"
							onClick={() => setType("expense")}
							className={`btn ${type === "expense" ? "" : "btn-secondary"}`}
							style={{
								flex: 1,
								...(type === "expense"
									? {
											background: "linear-gradient(135deg, #EF4444, #DC2626)",
											color: "#fff",
											boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
										}
									: {}),
							}}
						>
							Pengeluaran
						</button>
						<button
							type="button"
							onClick={() => setType("income")}
							className={`btn ${type === "income" ? "" : "btn-secondary"}`}
							style={{
								flex: 1,
								...(type === "income"
									? {
											background: "linear-gradient(135deg, #10B981, #059669)",
											color: "#fff",
											boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
										}
									: {}),
							}}
						>
							Pemasukan
						</button>
					</div>

					<div>
						<label className="form-label">Nominal (Rp)</label>
						<input
							className="form-input"
							type="number"
							min="1000"
							step="1000"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="50000"
							required
						/>
					</div>

					<div>
						<label className="form-label">Kategori</label>
						<select
							className="form-input"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
						>
							{selectableCategories.map((item) => (
								<option key={item.value} value={item.value}>
									{item.label}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="form-label">Wallet</label>
						<select
							className="form-input"
							value={walletId}
							onChange={(e) => setWalletId(e.target.value)}
							required
						>
							{walletOptions.map((wallet) => (
								<option key={wallet.id} value={wallet.id}>
									{wallet.name}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="form-label">Transaksi Grup</label>
						<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
							<input
								type="checkbox"
								checked={isShared}
								onChange={(e) => setIsShared(e.target.checked)}
							/>
							<span
								style={{ fontSize: "13px", color: "var(--text-secondary)" }}
							>
								Bagikan ke grup
							</span>
						</div>
					</div>

					{isShared ? (
						<div>
							<label className="form-label">Pilih Grup</label>
							<select
								className="form-input"
								value={groupId}
								onChange={(e) => setGroupId(e.target.value)}
								required
							>
								<option value="">Pilih grup</option>
								{groupOptions.map((group) => (
									<option key={group.id} value={group.id}>
										{group.name}
									</option>
								))}
							</select>
						</div>
					) : null}

					<div>
						<label className="form-label">Merchant / Tempat (opsional)</label>
						<input
							className="form-input"
							value={merchant}
							onChange={(e) => setMerchant(e.target.value)}
							placeholder="Contoh: Indomaret"
						/>
					</div>

					<div>
						<label className="form-label">Catatan (opsional)</label>
						<input
							className="form-input"
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder="Contoh: makan siang bersama tim"
						/>
					</div>

					<div>
						<label className="form-label">Tanggal</label>
						<input
							className="form-input"
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							required
						/>
					</div>

					{error ? (
						<p
							style={{
								fontSize: "13px",
								color: "var(--red)",
								background: "rgba(239,68,68,0.08)",
								padding: "10px 14px",
								borderRadius: "8px",
								border: "1px solid rgba(239,68,68,0.15)",
								margin: 0,
							}}
						>
							{error}
						</p>
					) : null}

					<div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
						<button
							type="button"
							onClick={onClose}
							className="btn btn-secondary"
							style={{ flex: 1 }}
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={saving}
							className="btn btn-primary"
							style={{ flex: 1 }}
						>
							{saving ? "Menyimpan..." : "Simpan"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

function TxRow({
	tx,
	onEdit,
	onDelete,
}: {
	tx: Transaction;
	onEdit: (tx: Transaction) => void;
	onDelete: (id: string) => void;
}) {
	const isIncome = tx.type === "income";
	return (
		<div
			className="card"
			style={{
				padding: "12px 16px",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				transition: "transform 0.15s",
				cursor: "default",
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.transform = "translateY(-1px)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.transform = "translateY(0)";
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
				<div
					style={{
						width: "34px",
						height: "34px",
						borderRadius: "8px",
						background: isIncome
							? "rgba(16,185,129,0.1)"
							: "rgba(239,68,68,0.08)",
						border: `1px solid ${isIncome ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.15)"}`,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: "14px",
						flexShrink: 0,
					}}
				>
					{CATEGORY_EMOJI[tx.category] || "📦"}
				</div>
				<div>
					<p
						style={{
							margin: 0,
							fontSize: "13px",
							fontWeight: 600,
							color: "var(--text-primary)",
						}}
					>
						{CATEGORY_LABEL[tx.category] || tx.category}
					</p>
					{tx.merchant ? (
						<p
							style={{
								margin: 0,
								fontSize: "11px",
								color: "var(--text-secondary)",
							}}
						>
							{tx.merchant}
						</p>
					) : null}
					{tx.note ? (
						<p
							style={{
								margin: 0,
								fontSize: "11px",
								color: "var(--text-muted)",
								fontStyle: "italic",
							}}
						>
							{tx.note}
						</p>
					) : null}
					{tx.is_shared ? (
						<p
							style={{
								margin: 0,
								fontSize: "10px",
								color: "var(--accent)",
								fontWeight: 600,
							}}
						>
							👥 Grup
						</p>
					) : null}
				</div>
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<div style={{ textAlign: "right" }}>
					<p
						style={{
							margin: 0,
							fontSize: "14px",
							fontWeight: 700,
							color: isIncome ? "var(--green)" : "var(--red)",
						}}
					>
						{isIncome ? "+" : "-"}
						{formatRupiah(Number(tx.amount))}
					</p>
					<p
						style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}
					>
						{formatDate(tx.date)}
					</p>
				</div>
				<button
					onClick={() => onEdit(tx)}
					className="btn btn-secondary"
					style={{ padding: "4px 8px", fontSize: "11px" }}
					title="Edit"
				>
					✏️
				</button>
				<button
					onClick={() => onDelete(tx.id)}
					className="btn btn-danger"
					style={{ padding: "4px 8px", fontSize: "11px" }}
					title="Hapus"
				>
					✕
				</button>
			</div>
		</div>
	);
}

type SavedView = {
	id: string;
	name: string;
	scope: "transactions" | "reports";
	filters: Record<string, any>;
};

export default function TransactionPage() {
	const { language } = useI18nStore();
	const {
		transactions,
		total,
		isLoading,
		error,
		fetchTransactions,
		addTransaction,
		updateTransaction,
		deleteTransaction,
		filters,
		setFilters,
	} = useTransactionStore();
	const { wallets, fetchWallets } = useWalletStore();
	const { fetchCategories } = useCategoryStore();
	const [showModal, setShowModal] = useState(false);
	const [editingTx, setEditingTx] = useState<Transaction | null>(null);
	const [savedViews, setSavedViews] = useState<SavedView[]>([]);
	const [groupOptions, setGroupOptions] = useState<
		{ id: string; name: string }[]
	>([]);

	useEffect(() => {
		fetchTransactions();
		fetchWallets();
		fetchCategories();
		void loadSavedViews();
		void loadGroups();
	}, [fetchTransactions, fetchWallets, fetchCategories]);

	const loadGroups = async () => {
		try {
			const uid = requireAuthUid();
			const rows = await listMyGroups(uid);
			const mapped = (rows as any[]).map((row) => ({
				id: row.groups.id,
				name: row.groups.name,
			}));
			setGroupOptions(mapped);
		} catch {
			setGroupOptions([]);
		}
	};

	const loadSavedViews = async () => {
		try {
			const res = await api.get("/saved-views?scope=transactions");
			setSavedViews(res.data?.data || []);
		} catch {
			setSavedViews([]);
		}
	};

	const handleDelete = async (id: string) => {
		if (!window.confirm("Hapus transaksi ini?")) return;
		try {
			await deleteTransaction(id);
		} catch {
			alert("Gagal menghapus transaksi");
		}
	};

	const handleEdit = (tx: Transaction) => {
		setEditingTx(tx);
		setShowModal(true);
	};

	const handleSave = async (data: TransactionFormData) => {
		if (editingTx) {
			await updateTransaction(editingTx.id, data);
			return editingTx;
		}
		return addTransaction(data);
	};

	const handleCloseModal = () => {
		setShowModal(false);
		setEditingTx(null);
	};

	const handleFilterType = (type: string) => {
		const newType =
			filters.type === type ? undefined : (type as "income" | "expense");
		setFilters({ type: newType, page: 1 });
		fetchTransactions({ type: newType, page: 1 });
	};

	const walletOptions = wallets.filter((wallet) => wallet.is_active);

	const applySavedView = (view: SavedView) => {
		const payload = {
			type: view.filters?.type as "income" | "expense" | undefined,
			category: view.filters?.category as string | undefined,
			wallet_id: view.filters?.wallet_id as string | undefined,
			page: 1,
		};
		setFilters(payload);
		fetchTransactions(payload);
	};

	return (
		<div className="animate-fade-in">
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "16px",
					flexWrap: "wrap",
					gap: "10px",
				}}
			>
				<h2
					style={{
						fontSize: "20px",
						fontWeight: 700,
						color: "var(--text-primary)",
						margin: 0,
					}}
				>
					{language === "id" ? "Transaksi" : "Transactions"}
				</h2>
				<button
					onClick={() => {
						setEditingTx(null);
						setShowModal(true);
					}}
					className="btn btn-primary"
					disabled={walletOptions.length === 0}
				>
					＋ {language === "id" ? "Tambah" : "Add"}
				</button>
			</div>

			{walletOptions.length === 0 ? (
				<div
					className="card"
					style={{
						padding: "14px 16px",
						marginBottom: "12px",
						borderLeft: "3px solid var(--amber)",
					}}
				>
					<p style={{ margin: 0, fontSize: "13px", color: "var(--amber)" }}>
						Buat wallet dulu sebelum menambah transaksi.
					</p>
				</div>
			) : null}

			<div
				style={{
					display: "flex",
					gap: "8px",
					alignItems: "center",
					marginBottom: "12px",
					flexWrap: "wrap",
				}}
			>
				{(["income", "expense"] as const).map((type) => (
					<button
						key={type}
						onClick={() => handleFilterType(type)}
						className={`badge ${filters.type === type ? (type === "income" ? "badge-ok" : "badge-danger") : "badge-info"}`}
						style={{
							cursor: "pointer",
							padding: "6px 14px",
							fontSize: "12px",
							border: "none",
							fontWeight: 600,
						}}
					>
						{type === "income" ? "↗ Pemasukan" : "↘ Pengeluaran"}
					</button>
				))}
				{filters.type ? (
					<button
						onClick={() => {
							setFilters({ type: undefined, page: 1 });
							fetchTransactions({ type: undefined, page: 1 });
						}}
						className="badge"
						style={{
							cursor: "pointer",
							padding: "6px 14px",
							fontSize: "12px",
							border: "1px solid var(--border)",
							background: "var(--bg-card2)",
							color: "var(--text-muted)",
						}}
					>
						Semua
					</button>
				) : null}
				<span
					style={{
						marginLeft: "auto",
						fontSize: "12px",
						color: "var(--text-muted)",
					}}
				>
					{total} transaksi
				</span>
			</div>

			{savedViews.length > 0 ? (
				<div
					className="card"
					style={{ padding: "10px 12px", marginBottom: "12px" }}
				>
					<div
						style={{
							fontSize: "12px",
							color: "var(--text-muted)",
							marginBottom: "8px",
						}}
					>
						Saved Views
					</div>
					<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
						{savedViews.map((view) => (
							<button
								key={view.id}
								className="badge badge-info"
								style={{ border: "none", cursor: "pointer" }}
								onClick={() => applySavedView(view)}
							>
								{view.name}
							</button>
						))}
					</div>
				</div>
			) : null}

			{isLoading ? (
				<p
					style={{
						color: "var(--text-muted)",
						textAlign: "center",
						padding: "24px",
					}}
				>
					{language === "id"
						? "Memuat transaksi..."
						: "Loading transactions..."}
				</p>
			) : null}
			{error ? (
				<div
					className="card"
					style={{
						padding: "14px 16px",
						marginBottom: "12px",
						borderLeft: "3px solid var(--red)",
					}}
				>
					<p style={{ margin: 0, fontSize: "13px", color: "var(--red)" }}>
						{error}
					</p>
					<button
						className="btn btn-secondary"
						style={{ marginTop: "8px" }}
						onClick={() => fetchTransactions()}
					>
						{language === "id" ? "Coba lagi" : "Retry"}
					</button>
				</div>
			) : null}

			{!isLoading && transactions.length === 0 ? (
				<div
					className="card"
					style={{ padding: "48px 20px", textAlign: "center" }}
				>
					<p style={{ fontSize: "36px", margin: "0 0 8px" }}>📝</p>
					<p
						style={{
							color: "var(--text-muted)",
							fontSize: "14px",
							margin: "0 0 8px",
						}}
					>
						{language === "id"
							? "Belum ada transaksi pada filter ini."
							: "No transactions for this filter."}
					</p>
					<button
						className="btn btn-secondary"
						onClick={() => {
							setFilters({ type: undefined, page: 1 });
							fetchTransactions({ type: undefined, page: 1 });
						}}
					>
						Reset filter
					</button>
				</div>
			) : null}

			<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
				{transactions.map((tx) => (
					<TxRow
						key={`${tx.user_id}:${tx.id}`}
						tx={tx}
						onEdit={handleEdit}
						onDelete={handleDelete}
					/>
				))}
			</div>

			{total > (filters.per_page || 20) ? (
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						gap: "12px",
						marginTop: "20px",
					}}
				>
					<button
						disabled={(filters.page || 1) <= 1}
						className="btn btn-secondary"
						onClick={() => {
							const page = (filters.page || 1) - 1;
							setFilters({ page });
							fetchTransactions({ page });
						}}
					>
						← Sebelumnya
					</button>
					<span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
						Hal. {filters.page || 1}
					</span>
					<button
						disabled={(filters.page || 1) * (filters.per_page || 20) >= total}
						className="btn btn-secondary"
						onClick={() => {
							const page = (filters.page || 1) + 1;
							setFilters({ page });
							fetchTransactions({ page });
						}}
					>
						Berikutnya →
					</button>
				</div>
			) : null}

			{showModal ? (
				<TxModal
					initialData={editingTx ?? undefined}
					onClose={handleCloseModal}
					onSave={handleSave}
					walletOptions={walletOptions}
					groupOptions={groupOptions}
				/>
			) : null}
		</div>
	);
}
