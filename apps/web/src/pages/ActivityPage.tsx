import { useEffect, useState } from "react";
import { api } from "@lib/api";
import { useT } from "@lib/i18n";
import { useI18nStore } from "@store/i18n.store";
import { listTransactions, requireAuthUid } from "@lib/firestore";

type ActivityLog = {
	id: string;
	action: string;
	entity_type: string;
	entity_id?: string;
	created_at: string;
};

function humanizeAction(action: string, language: "id" | "en") {
	const map: Record<string, { id: string; en: string }> = {
		"transaction.income.created": { id: "Pemasukan ditambahkan", en: "Income added" },
		"transaction.expense.created": { id: "Pengeluaran ditambahkan", en: "Expense added" },
		"transaction.create": { id: "Transaksi dibuat", en: "Transaction created" },
		"transaction.update": { id: "Transaksi diperbarui", en: "Transaction updated" },
		"transaction.delete": { id: "Transaksi dihapus", en: "Transaction deleted" },
		"wallet.create": { id: "Dompet dibuat", en: "Wallet created" },
		"wallet.update": { id: "Dompet diperbarui", en: "Wallet updated" },
		"wallet.delete": { id: "Dompet dihapus", en: "Wallet deleted" },
		"budget.create": { id: "Anggaran dibuat", en: "Budget created" },
		"budget.update": { id: "Anggaran diperbarui", en: "Budget updated" },
		"budget.delete": { id: "Anggaran dihapus", en: "Budget deleted" },
		"bill.create": { id: "Tagihan dibuat", en: "Bill created" },
		"bill.update": { id: "Tagihan diperbarui", en: "Bill updated" },
		"bill.delete": { id: "Tagihan dihapus", en: "Bill deleted" },
		"bill.pay": { id: "Tagihan dibayar", en: "Bill marked as paid" },
		"group.create": { id: "Grup dibuat", en: "Group created" },
		"group.join": { id: "Bergabung ke grup", en: "Joined group" },
		"group.leave": { id: "Keluar dari grup", en: "Left group" },
	};
	const exact = map[action];
	if (exact) return exact[language];
	const normalized = action.replace(/[._]/g, " ").trim();
	if (!normalized) return language === "id" ? "Aktivitas" : "Activity";
	return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function humanizeEntityType(entityType: string, language: "id" | "en") {
	const map: Record<string, { id: string; en: string }> = {
		transaction: { id: "Transaksi", en: "Transaction" },
		wallet: { id: "Dompet", en: "Wallet" },
		budget: { id: "Anggaran", en: "Budget" },
		bill: { id: "Tagihan", en: "Bill" },
		group: { id: "Grup", en: "Group" },
	};
	return map[entityType]?.[language] || entityType.replace(/_/g, " ");
}

export default function ActivityPage() {
	const t = useT();
	const { language } = useI18nStore();
	const [items, setItems] = useState<ActivityLog[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	const loadFromTransactions = async () => {
		const uid = requireAuthUid();
		const txResult = await listTransactions(uid, { page: 1, per_page: 50 });
		setItems(
			txResult.data.map((tx) => ({
				id: `tx:${tx.user_id}:${tx.id}`,
				action: tx.type === "income" ? "transaction.income.created" : "transaction.expense.created",
				entity_type: "transaction",
				entity_id: tx.id,
				created_at: tx.created_at || `${tx.date}T00:00:00.000Z`,
			})),
		);
	};

	const load = async () => {
		setIsLoading(true);
		setError("");
		try {
			const res = await api.get("/activity-logs?limit=50");
			const rows = res.data?.data || [];
			if (rows.length > 0) setItems(rows);
			else await loadFromTransactions();
		} catch {
			try {
				await loadFromTransactions();
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Gagal memuat aktivitas");
			}
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void load();
	}, []);

	return (
		<div className="animate-fade-in page-shell">
			<div className="page-header">
				<div>
					<h2 className="page-title">{t("activity")}</h2>
					<p className="page-subtitle">Riwayat aksi terbaru pada transaksi, wallet, budget, dan tagihan.</p>
				</div>
				<button className="btn btn-secondary" onClick={() => void load()}>{t("retry")}</button>
			</div>

			{error ? (
				<div className="page-section-card" style={{ background: "color-mix(in srgb, var(--red) 12%, var(--bg-card))", border: "1px solid color-mix(in srgb, var(--red) 28%, transparent)" }}>
					<p style={{ margin: 0, color: "var(--red)", fontWeight: 600 }}>{error}</p>
				</div>
			) : null}

			{isLoading ? (
				<div className="card page-section-card">{t("loading")}</div>
			) : null}

			{!isLoading && items.length === 0 ? (
				<div className="card page-section-card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
					{language === "id" ? "Belum ada aktivitas." : "No activity yet."}
				</div>
			) : null}

			<div style={{ display: "grid", gap: 8 }}>
				{items.map((item) => (
					<div key={item.id} className="card page-section-card" style={{ padding: 12 }}>
						<div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{humanizeAction(item.action, language)}</div>
						<div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
							{humanizeEntityType(item.entity_type, language)}{item.entity_id ? ` · ${item.entity_id}` : ""}
						</div>
						<div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
							{new Date(item.created_at).toLocaleString(language === "id" ? "id-ID" : "en-US")}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
