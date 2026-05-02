import { FormEvent, useEffect, useState } from "react";
import {
	createSavedView,
	deleteSavedView,
	listSavedViews,
	requireAuthUid,
} from "@lib/firestore";
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
	const [scope, setScope] = useState<"transactions" | "reports">(
		"transactions",
	);
	const [filters, setFilters] = useState('{"type":"expense"}');
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const load = async () => {
		setIsLoading(true);
		setError("");
		try {
			const uid = requireAuthUid();
			const rows = await listSavedViews(uid);
			setItems(rows);
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
			await createSavedView(uid, {
				name,
				scope,
				filters: JSON.parse(filters || "{}"),
			});
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
		<div className="animate-fade-in" style={{ display: "grid", gap: 12 }}>
			<h2 style={{ margin: 0 }}>{t("savedViews")}</h2>
			<form
				className="card"
				style={{ padding: 12, display: "grid", gap: 8 }}
				onSubmit={create}
			>
				<input
					className="form-input"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder={language === "id" ? "Nama view" : "View name"}
					required
				/>
				<select
					className="form-input"
					value={scope}
					onChange={(e) =>
						setScope(e.target.value as "transactions" | "reports")
					}
				>
					<option value="transactions">Transactions</option>
					<option value="reports">Reports</option>
				</select>
				<textarea
					className="form-input"
					value={filters}
					onChange={(e) => setFilters(e.target.value)}
					rows={4}
				/>
				{error ? (
					<p style={{ margin: 0, color: "var(--red)", fontSize: 12 }}>
						{error}
					</p>
				) : null}
				<button className="btn btn-primary" type="submit">
					{language === "id" ? "Simpan View" : "Save View"}
				</button>
			</form>

			{error ? (
				<div className="card" style={{ padding: 12, color: "var(--red)" }}>
					{error}
				</div>
			) : null}
			{isLoading ? (
				<div className="card" style={{ padding: 12 }}>
					{language === "id"
						? "Memuat saved views..."
						: "Loading saved views..."}
				</div>
			) : null}

			<div style={{ display: "grid", gap: 8 }}>
				{!isLoading && items.length === 0 ? (
					<div
						className="card"
						style={{
							padding: 16,
							textAlign: "center",
							color: "var(--text-muted)",
						}}
					>
						{language === "id"
							? "Belum ada saved view."
							: "No saved views yet."}
					</div>
				) : null}
				{items.map((item) => (
					<div
						key={item.id}
						className="card"
						style={{
							padding: 12,
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							gap: 8,
						}}
					>
						<div>
							<div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
							<div style={{ fontSize: 11, color: "var(--text-muted)" }}>
								{item.scope}
							</div>
						</div>
						<button
							className="btn btn-danger"
							onClick={() => void remove(item.id)}
						>
							{t("delete")}
						</button>
					</div>
				))}
			</div>
		</div>
	);
}
