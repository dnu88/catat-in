import { useEffect, useState } from "react";
import { useBillsStore } from "@store/bills.store";
import type { BillReminder, BillFormData } from "@catat-in/shared/types";
import { useI18nStore } from "@store/i18n.store";

const getErrorMessage = (err: unknown, fallback: string) =>
	err instanceof Error ? err.message : fallback;

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

function daysUntil(dateStr: string): number {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const due = new Date(dateStr);
	due.setHours(0, 0, 0, 0);
	return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const RECURRENCE_LABEL: Record<string, string> = {
	once: "Sekali",
	monthly: "Bulanan",
	yearly: "Tahunan",
};

// ── ADD BILL MODAL ────────────────────────────────────────────

function AddBillModal({
	onClose,
	onSave,
}: {
	onClose: () => void;
	onSave: (d: BillFormData) => Promise<void>;
}) {
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [dueDay, setDueDay] = useState("1");
	const [recurrence, setRecurrence] =
		useState<BillFormData["recurrence"]>("monthly");
	const [icon, setIcon] = useState("📄");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		const parsedAmount = parseFloat(amount);
		if (!parsedAmount || parsedAmount <= 0)
			return setError("Nominal harus lebih dari 0");
		setSaving(true);
		try {
			await onSave({
				name,
				amount: parsedAmount,
				due_day: parseInt(dueDay),
				recurrence,
				icon,
				notify_before_days: [3, 1],
			});
			onClose();
		} catch (err: unknown) {
			setError(getErrorMessage(err, "Gagal menyimpan tagihan"));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div style={modalStyles.overlay}>
			<div style={modalStyles.box}>
				<h3 style={modalStyles.title}>Tambah Tagihan</h3>
				<form onSubmit={handleSubmit} style={modalStyles.form}>
					<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
						<div style={{ flex: "0 0 auto" }}>
							<label style={modalStyles.label}>Ikon</label>
							<input
								style={{
									...modalStyles.input,
									width: "60px",
									textAlign: "center",
									fontSize: "1.2rem",
								}}
								value={icon}
								onChange={(e) => setIcon(e.target.value)}
								maxLength={2}
							/>
						</div>
						<div style={{ flex: 1 }}>
							<label style={modalStyles.label}>Nama Tagihan</label>
							<input
								style={modalStyles.input}
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="cth: Listrik PLN"
								required
							/>
						</div>
					</div>

					<label style={modalStyles.label}>Nominal (Rp)</label>
					<input
						style={modalStyles.input}
						type="number"
						min="1000"
						step="1000"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						placeholder="500000"
						required
					/>

					<div style={{ display: "flex", gap: "0.75rem" }}>
						<div style={{ flex: 1 }}>
							<label style={modalStyles.label}>Tanggal Jatuh Tempo (Tgl)</label>
							<input
								style={modalStyles.input}
								type="number"
								min="1"
								max="31"
								value={dueDay}
								onChange={(e) => setDueDay(e.target.value)}
								required
							/>
						</div>
						<div style={{ flex: 1 }}>
							<label style={modalStyles.label}>Perulangan</label>
							<select
								style={modalStyles.input}
								value={recurrence}
								onChange={(e) =>
									setRecurrence(e.target.value as BillFormData["recurrence"])
								}
							>
								<option value="monthly">Bulanan</option>
								<option value="yearly">Tahunan</option>
								<option value="once">Sekali</option>
							</select>
						</div>
					</div>

					{error && <p style={modalStyles.error}>{error}</p>}

					<div style={modalStyles.actions}>
						<button
							type="button"
							onClick={onClose}
							style={modalStyles.cancelBtn}
						>
							Batal
						</button>
						<button type="submit" disabled={saving} style={modalStyles.saveBtn}>
							{saving ? "Menyimpan..." : "Simpan"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ── BILL CARD ─────────────────────────────────────────────────

function BillCard({
	bill,
	onPay,
	onDelete,
}: {
	bill: BillReminder;
	onPay: (id: string) => void;
	onDelete: (id: string) => void;
}) {
	const days = daysUntil(bill.next_due_date);
	const isOverdue = days < 0;
	const isSoon = days >= 0 && days <= 3;

	return (
		<div
			style={{
				...cardStyles.card,
				borderLeft: `4px solid ${isOverdue ? "#dc2626" : isSoon ? "#f59e0b" : "#2563eb"}`,
			}}
		>
			<div style={cardStyles.header}>
				<div style={cardStyles.iconName}>
					<span style={cardStyles.icon}>{bill.icon || "📄"}</span>
					<div>
						<p style={cardStyles.name}>{bill.name}</p>
						<p style={cardStyles.recurrence}>
							{RECURRENCE_LABEL[bill.recurrence]}
						</p>
					</div>
				</div>
				<button
					onClick={() => onDelete(bill.id)}
					style={cardStyles.deleteBtn}
					title="Hapus"
				>
					✕
				</button>
			</div>
			<div style={cardStyles.footer}>
				<div>
					<p style={cardStyles.amount}>{formatRupiah(Number(bill.amount))}</p>
					<p
						style={{
							...cardStyles.dueInfo,
							color: isOverdue ? "#dc2626" : isSoon ? "#d97706" : "#6b7280",
						}}
					>
						{isOverdue
							? `Telat ${Math.abs(days)} hari (${formatDate(bill.next_due_date)})`
							: days === 0
								? "Jatuh tempo hari ini!"
								: `${days} hari lagi · ${formatDate(bill.next_due_date)}`}
					</p>
				</div>
				<button
					onClick={() => onPay(bill.id)}
					style={{ ...cardStyles.payBtn, opacity: bill.is_paid ? 0.5 : 1 }}
					disabled={bill.is_paid}
				>
					{bill.is_paid ? "✓ Lunas" : "Bayar"}
				</button>
			</div>
		</div>
	);
}

// ── BILLS PAGE ────────────────────────────────────────────────

export default function BillsPage() {
	const { language } = useI18nStore();
	const { bills, isLoading, error, fetchBills, addBill, payBill, deleteBill } =
		useBillsStore();
	const [showModal, setShowModal] = useState(false);

	useEffect(() => {
		fetchBills();
	}, []);

	const handlePay = async (id: string) => {
		if (!window.confirm("Tandai tagihan ini sebagai lunas?")) return;
		try {
			await payBill(id);
		} catch {
			alert("Gagal memproses pembayaran");
		}
	};

	const handleDelete = async (id: string) => {
		if (!window.confirm("Hapus tagihan ini?")) return;
		try {
			await deleteBill(id);
		} catch {
			alert("Gagal menghapus tagihan");
		}
	};

	const overdueCount = bills.filter(
		(b) => daysUntil(b.next_due_date) < 0,
	).length;
	const soonCount = bills.filter((b) => {
		const d = daysUntil(b.next_due_date);
		return d >= 0 && d <= 3;
	}).length;

	return (
		<div style={styles.page}>
			<div style={styles.header}>
				<div>
					<h2 style={styles.title}>
						{language === "id" ? "Tagihan & Cicilan" : "Bills & Installments"}
					</h2>
					{(overdueCount > 0 || soonCount > 0) && (
						<p style={styles.alertText}>
							{overdueCount > 0 && (
								<span style={{ color: "#dc2626" }}>
									{overdueCount} terlambat{" "}
								</span>
							)}
							{soonCount > 0 && (
								<span style={{ color: "#d97706" }}>
									{soonCount} jatuh tempo dalam 3 hari
								</span>
							)}
						</p>
					)}
				</div>
				<button onClick={() => setShowModal(true)} style={styles.addBtn}>
					+ {language === "id" ? "Tambah Tagihan" : "Add Bill"}
				</button>
			</div>

			{isLoading && (
				<p style={styles.info}>
					{language === "id" ? "Memuat..." : "Loading..."}
				</p>
			)}
			{error && <p style={styles.errorText}>{error}</p>}

			{!isLoading && bills.length === 0 && (
				<div style={styles.empty}>
					<p style={styles.emptyIcon}>🔔</p>
					<p>
						{language === "id"
							? "Belum ada tagihan. Tambahkan pengingat tagihan agar tidak terlewat!"
							: "No bills yet. Add reminders so you never miss due dates."}
					</p>
				</div>
			)}

			<div style={styles.grid}>
				{bills.map((b) => (
					<BillCard
						key={b.id}
						bill={b}
						onPay={handlePay}
						onDelete={handleDelete}
					/>
				))}
			</div>

			{showModal && (
				<AddBillModal onClose={() => setShowModal(false)} onSave={addBill} />
			)}
		</div>
	);
}

// ── STYLES ───────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
	page: { padding: "1.5rem", maxWidth: "900px", margin: "0 auto" },
	header: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: "1.5rem",
		flexWrap: "wrap",
		gap: "1rem",
	},
	title: { margin: "0 0 0.2rem", fontSize: "1.5rem", color: "#1a1a1a" },
	alertText: { margin: 0, fontSize: "0.85rem" },
	addBtn: {
		padding: "0.6rem 1.2rem",
		backgroundColor: "#2563eb",
		color: "white",
		border: "none",
		borderRadius: "8px",
		fontWeight: 600,
		cursor: "pointer",
		fontSize: "0.9rem",
	},
	info: { color: "#666", textAlign: "center" },
	errorText: {
		color: "#dc2626",
		backgroundColor: "#fee2e2",
		padding: "0.75rem",
		borderRadius: "8px",
	},
	empty: { textAlign: "center", padding: "3rem 1rem", color: "#9ca3af" },
	emptyIcon: { fontSize: "3rem", margin: "0 0 0.5rem" },
	grid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
		gap: "1rem",
	},
};

const cardStyles: Record<string, React.CSSProperties> = {
	card: {
		backgroundColor: "white",
		borderRadius: "12px",
		padding: "1.25rem",
		boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
	},
	header: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: "1rem",
	},
	iconName: { display: "flex", gap: "0.75rem", alignItems: "center" },
	icon: { fontSize: "1.5rem", lineHeight: 1 },
	name: {
		margin: "0 0 0.15rem",
		fontSize: "0.95rem",
		fontWeight: 700,
		color: "#1a1a1a",
	},
	recurrence: { margin: 0, fontSize: "0.75rem", color: "#9ca3af" },
	deleteBtn: {
		background: "none",
		border: "none",
		cursor: "pointer",
		color: "#d1d5db",
		fontSize: "0.85rem",
	},
	footer: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "flex-end",
	},
	amount: {
		margin: "0 0 0.15rem",
		fontSize: "1.1rem",
		fontWeight: 700,
		color: "#1a1a1a",
	},
	dueInfo: { margin: 0, fontSize: "0.8rem" },
	payBtn: {
		padding: "0.5rem 1rem",
		backgroundColor: "#16a34a",
		color: "white",
		border: "none",
		borderRadius: "8px",
		cursor: "pointer",
		fontSize: "0.85rem",
		fontWeight: 600,
	},
};

const modalStyles: Record<string, React.CSSProperties> = {
	overlay: {
		position: "fixed",
		inset: 0,
		backgroundColor: "rgba(0,0,0,0.4)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 100,
		padding: "1rem",
	},
	box: {
		backgroundColor: "white",
		borderRadius: "12px",
		padding: "2rem",
		width: "100%",
		maxWidth: "440px",
		boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
	},
	title: { margin: "0 0 1.25rem", fontSize: "1.2rem", color: "#1a1a1a" },
	form: { display: "flex", flexDirection: "column", gap: "0.75rem" },
	label: {
		fontSize: "0.85rem",
		fontWeight: 600,
		color: "#374151",
		display: "block",
		marginBottom: "0.25rem",
	},
	input: {
		padding: "0.6rem 0.75rem",
		border: "1px solid #d1d5db",
		borderRadius: "8px",
		fontSize: "0.95rem",
		width: "100%",
		boxSizing: "border-box",
	},
	error: { color: "#dc2626", fontSize: "0.85rem", margin: 0 },
	actions: { display: "flex", gap: "0.75rem", marginTop: "0.5rem" },
	cancelBtn: {
		flex: 1,
		padding: "0.65rem",
		backgroundColor: "#f3f4f6",
		color: "#374151",
		border: "none",
		borderRadius: "8px",
		cursor: "pointer",
		fontWeight: 600,
	},
	saveBtn: {
		flex: 1,
		padding: "0.65rem",
		backgroundColor: "#2563eb",
		color: "white",
		border: "none",
		borderRadius: "8px",
		cursor: "pointer",
		fontWeight: 600,
	},
};
