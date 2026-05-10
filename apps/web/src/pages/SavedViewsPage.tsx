import { FormEvent, useEffect, useState } from "react";
import { createSavedView, deleteSavedView, listSavedViews, requireAuthUid } from "@lib/firestore";
import { useT } from "@lib/i18n";
import { useI18nStore } from "@store/i18n.store";

type SavedView = {
	id: string;
	name: string;
	scope: "transactions" | "reports";
	filters: Record<string, unknown>;
};

export default function SavedViewsPage() {
	const t = useT();
	const { language } = useI18nStore();
	const [items, setItems] = useState<SavedView[]>([]);
	const [name, setName] = useState("");
	const [scope, setScope] = useState<"transactions" | "reports">("transactions");
	const [filters, setFilters] = useState('{"type":"expense"}');
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const load = async () => {
		setIsLoading(true);
		setError("");
		try {
			const uid = requireAuthUid();
			setItems(await listSavedViews(uid));
		} catch (err: any) {
			setError(err.message || "Gagal memuat saved views");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void load();
	}, []);

	const create = async (e: FormEvent) => {
		e.preventDefault();
		setError("");
		try {
			const uid = requireAuthUid();
			await createSavedView(uid, { name, scope, filters: JSON.parse(filters || "{}") });
			setName("");
			await load();
		} catch (err: any) {
			setError(err.message || "Gagal membuat saved view");
		}
	};

	const remove = async (id: string) => {
		if (!window.confirm("Hapus saved view ini?")) return;
		try {
			const uid = requireAuthUid();
			await deleteSavedView(uid, id);
			await load();
		} catch (err: any) {
			setError(err.message || "Gagal menghapus saved view");
		}
	};

	return (
		<div className="animate-fade-in page-shell">
			<div className="page-header">
				<div>
					<h2 className="page-title">{t("savedViews")}</h2>
					<p className="page-subtitle">Simpan kombinasi filter transaksi/laporan favorit untuk akses cepat.</p>
				</div>
			</div>

			<form className="card page-section-card" style={{ padding: 14, display: "grid", gap: 8 }} onSubmit={create}>
				<input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={language === "id" ? "Nama view" : "View name"} required />
				<select className="form-input" value={scope} onChange={(e) => setScope(e.target.value as "transactions" | "reports") }>
					<option value="transactions">Transactions</option>
					<option value="reports">Reports</option>
				</select>
				<textarea className="form-input" value={filters} onChange={(e) => setFilters(e.target.value)} rows={4} />
				<button className="btn btn-primary" type="submit">{language === "id" ? "Simpan View" : "Save View"}</button>
			</form>

			{error ? <div className="page-section-card" style={{ color: "var(--red)", background: "color-mix(in srgb, var(--red) 12%, var(--bg-card))", border: "1px solid color-mix(in srgb, var(--red) 28%, transparent)" }}>{error}</div> : null}
			{isLoading ? <div className="card page-section-card">{language === "id" ? "Memuat saved views..." : "Loading saved views..."}</div> : null}

			<div style={{ display: "grid", gap: 8 }}>
				{!isLoading && items.length === 0 ? <div className="card page-section-card" style={{ textAlign: "center", color: "var(--text-muted)" }}>{language === "id" ? "Belum ada saved view." : "No saved views yet."}</div> : null}
				{items.map((item) => (
					<div key={item.id} className="card page-section-card" style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
						<div>
							<div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{item.name}</div>
							<div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.scope}</div>
						</div>
						<button className="btn btn-danger" onClick={() => void remove(item.id)}>{t("delete")}</button>
					</div>
				))}
			</div>
		</div>
	);
}
