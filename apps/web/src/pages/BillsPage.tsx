import { useEffect, useState } from "react";
import { useBillsStore } from "@store/bills.store";
import type { BillReminder, BillFormData } from "@kaswise/shared/types";
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

function getBillTone(bill: BillReminder): "paid" | "overdue" | "soon" | "normal" {
	if (bill.is_paid) return "paid";
	const days = daysUntil(bill.next_due_date);
	if (days < 0) return "overdue";
	if (days <= 3) return "soon";
	return "normal";
}

const RECURRENCE_LABEL: Record<string, string> = {
	once: "Sekali",
	monthly: "Bulanan",
	yearly: "Tahunan",
};

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
		<div className="modal-overlay">
			<div className="modal-box animate-slide-up" style={{ maxWidth: "460px" }}>
				<h3 style={{ margin: "0 0 16px", color: "var(--text-primary)" }}>
					Tambah Tagihan
				</h3>
				<form onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
					<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
						<div style={{ flex: "0 0 auto", width: "72px" }}>
							<label className="form-label">Ikon</label>
							<input
								className="form-input"
								style={{ textAlign: "center", fontSize: "18px" }}
								value={icon}
								onChange={(e) => setIcon(e.target.value)}
								maxLength={2}
							/>
						</div>
						<div style={{ flex: 1 }}>
							<label className="form-label">Nama Tagihan</label>
							<input
								className="form-input"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="cth: Listrik PLN"
								required
							/>
						</div>
					</div>

					<label className="form-label">Nominal (Rp)</label>
					<input
						className="form-input"
						type="number"
						min="1000"
						step="1000"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						placeholder="500000"
						required
					/>

					<div style={{ display: "flex", gap: "10px" }}>
						<div style={{ flex: 1 }}>
							<label className="form-label">Tanggal Jatuh Tempo (Tgl)</label>
							<input
								className="form-input"
								type="number"
								min="1"
								max="31"
								value={dueDay}
								onChange={(e) => setDueDay(e.target.value)}
								required
							/>
						</div>
						<div style={{ flex: 1 }}>
							<label className="form-label">Perulangan</label>
							<select
								className="form-input"
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

					{error ? (
						<p style={errorStyle}>{error}</p>
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

function BillCard({
	bill,
	onPay,
	onDelete,
}: {
	bill: BillReminder;
	onPay: (id: string) => void;
	onDelete: (id: string) => void;
}) {
	const tone = getBillTone(bill);
	const days = daysUntil(bill.next_due_date);
	const accent =
		tone === "paid"
			? "var(--green)"
			: tone === "overdue"
				? "var(--red)"
				: tone === "soon"
					? "var(--amber)"
					: "var(--accent)";

	return (
		<div className="card page-section-card" style={{ padding: "14px", border: `1px solid ${accent}`, background: tone === "paid" ? "var(--green-soft)" : tone === "overdue" ? "var(--red-soft)" : tone === "soon" ? "var(--amber-soft)" : "var(--bg-card2)" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
				<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
					<span style={{ fontSize: "24px", lineHeight: 1 }}>{bill.icon || "📄"}</span>
					<div>
						<p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{bill.name}</p>
						<p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
							{RECURRENCE_LABEL[bill.recurrence]}
						</p>
					</div>
				</div>
				<button onClick={() => onDelete(bill.id)} className="btn btn-danger" style={{ minHeight: "30px", padding: "5px 8px" }} title="Hapus">
					✕
				</button>
			</div>

			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "10px", gap: "10px" }}>
				<div>
					<p style={{ margin: "0 0 3px", fontSize: "19px", fontWeight: 700, color: "var(--text-primary)" }}>
						{formatRupiah(Number(bill.amount))}
					</p>
					<p
						style={{
							margin: 0,
							fontSize: "12px",
							color:
								tone === "paid"
									? "var(--green)"
									: tone === "overdue"
										? "var(--red)"
										: tone === "soon"
											? "var(--amber)"
											: "var(--text-secondary)",
						}}
					>
						{tone === "paid"
							? `Dibayar ${bill.paid_at ? formatDate(bill.paid_at) : "-"}`
							: tone === "overdue"
								? `Telat ${Math.abs(days)} hari (${formatDate(bill.next_due_date)})`
								: days === 0
									? "Jatuh tempo hari ini!"
									: `${days} hari lagi · ${formatDate(bill.next_due_date)}`}
					</p>
				</div>
				<button
					onClick={() => onPay(bill.id)}
					className={bill.is_paid ? "btn btn-secondary" : "btn btn-primary"}
					style={{ opacity: bill.is_paid ? 0.75 : 1, minHeight: "34px" }}
					disabled={bill.is_paid}
				>
					{bill.is_paid ? "✓ Lunas" : "Bayar"}
				</button>
			</div>
		</div>
	);
}

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
		(b) => !b.is_paid && daysUntil(b.next_due_date) < 0,
	).length;
	const soonCount = bills.filter((b) => {
		if (b.is_paid) return false;
		const d = daysUntil(b.next_due_date);
		return d >= 0 && d <= 3;
	}).length;

	return (
		<div className="page-shell">
			<div className="page-header">
				<div>
					<h2 className="page-title">
						{language === "id" ? "Tagihan & Cicilan" : "Bills & Installments"}
					</h2>
					{(overdueCount > 0 || soonCount > 0) && (
						<p className="page-subtitle" style={{ marginTop: "2px" }}>
							{overdueCount > 0 ? (
								<span style={{ color: "var(--red)", fontWeight: 700 }}>
									{overdueCount} terlambat{" "}
								</span>
							) : null}
							{soonCount > 0 ? (
								<span style={{ color: "var(--amber)", fontWeight: 700 }}>
									{soonCount} jatuh tempo dalam 3 hari
								</span>
							) : null}
						</p>
					)}
				</div>
				<button onClick={() => setShowModal(true)} className="btn btn-primary">
					+ {language === "id" ? "Tambah Tagihan" : "Add Bill"}
				</button>
			</div>

			{isLoading ? (
				<div className="card page-section-card" style={{ textAlign: "center" }}>
					<p style={{ margin: 0, color: "var(--text-secondary)" }}>
						{language === "id" ? "Memuat..." : "Loading..."}
					</p>
				</div>
			) : null}

			{error ? (
				<div className="page-section-card" style={errorPanelStyle}>
					<p style={{ margin: 0, color: "var(--red)", fontWeight: 600 }}>{error}</p>
				</div>
			) : null}

			{!isLoading && bills.length === 0 ? (
				<div className="card page-section-card" style={{ textAlign: "center", padding: "30px 18px" }}>
					<p style={{ fontSize: "36px", margin: "0 0 8px" }}>🔔</p>
					<p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.6 }}>
						{language === "id"
							? "Belum ada tagihan. Tambahkan pengingat tagihan agar tidak terlewat!"
							: "No bills yet. Add reminders so you never miss due dates."}
					</p>
				</div>
			) : null}

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
				{bills.map((b) => (
					<BillCard key={b.id} bill={b} onPay={handlePay} onDelete={handleDelete} />
				))}
			</div>

			{showModal ? (
				<AddBillModal onClose={() => setShowModal(false)} onSave={addBill} />
			) : null}
		</div>
	);
}

const errorStyle: React.CSSProperties = {
	margin: 0,
	fontSize: "12px",
	color: "var(--red)",
	background: "color-mix(in srgb, var(--red) 16%, transparent)",
	border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)",
	padding: "8px 10px",
	borderRadius: "var(--r-sm)",
};

const errorPanelStyle: React.CSSProperties = {
	background: "color-mix(in srgb, var(--red) 12%, var(--bg-card))",
	border: "1px solid color-mix(in srgb, var(--red) 28%, transparent)",
};
