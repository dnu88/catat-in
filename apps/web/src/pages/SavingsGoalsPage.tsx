import { FormEvent, useEffect, useState } from "react";
import { createSavingsGoal, deleteSavingsGoal, listSavingsGoals, requireAuthUid } from "@lib/firestore";
import { useT } from "@lib/i18n";
import { useI18nStore } from "@store/i18n.store";

type Goal = {
	id: string;
	name: string;
	target_amount: number;
	current_amount: number;
};

function rupiah(v: number) {
	return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
}

export default function SavingsGoalsPage() {
	const t = useT();
	const { language } = useI18nStore();
	const [goals, setGoals] = useState<Goal[]>([]);
	const [name, setName] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [target, setTarget] = useState("1000000");
	const [current, setCurrent] = useState("0");

	const load = async () => {
		setIsLoading(true);
		setError("");
		try {
			const uid = requireAuthUid();
			setGoals(await listSavingsGoals(uid));
		} catch (err: any) {
			setError(err.message || "Gagal memuat goals");
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
			await createSavingsGoal(uid, { name, target_amount: Number(target), current_amount: Number(current) });
			setName("");
			await load();
		} catch (err: any) {
			setError(err.message || "Gagal menambah goal");
		}
	};

	const remove = async (id: string) => {
		if (!window.confirm("Hapus goal ini?")) return;
		try {
			const uid = requireAuthUid();
			await deleteSavingsGoal(uid, id);
			await load();
		} catch (err: any) {
			setError(err.message || "Gagal menghapus goal");
		}
	};

	return (
		<div className="animate-fade-in page-shell">
			<div className="page-header">
				<div>
					<h2 className="page-title">{t("goals")}</h2>
					<p className="page-subtitle">Pantau progres target tabungan dengan progress bar real-time.</p>
				</div>
			</div>

			<form className="card page-section-card" style={{ padding: 14, display: "grid", gap: 8 }} onSubmit={create}>
				<input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={language === "id" ? "Nama target" : "Goal name"} required />
				<input className="form-input" type="number" value={target} onChange={(e) => setTarget(e.target.value)} required />
				<input className="form-input" type="number" value={current} onChange={(e) => setCurrent(e.target.value)} required />
				<button className="btn btn-primary" type="submit">{language === "id" ? "Tambah Goal" : "Add Goal"}</button>
			</form>

			{error ? <div className="page-section-card" style={{ color: "var(--red)", background: "color-mix(in srgb, var(--red) 12%, var(--bg-card))", border: "1px solid color-mix(in srgb, var(--red) 28%, transparent)" }}>{error}</div> : null}
			{isLoading ? <div className="card page-section-card">{language === "id" ? "Memuat goals..." : "Loading goals..."}</div> : null}

			<div style={{ display: "grid", gap: 8 }}>
				{!isLoading && goals.length === 0 ? <div className="card page-section-card" style={{ textAlign: "center", color: "var(--text-muted)" }}>{language === "id" ? "Belum ada target tabungan." : "No savings goals yet."}</div> : null}
				{goals.map((g) => {
					const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0;
					return (
						<div key={g.id} className="card page-section-card" style={{ padding: 12 }}>
							<div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
								<div>
									<div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{g.name}</div>
									<div style={{ fontSize: 12, color: "var(--text-muted)" }}>{rupiah(g.current_amount)} / {rupiah(g.target_amount)}</div>
								</div>
								<button className="btn btn-danger" onClick={() => void remove(g.id)}>{t("delete")}</button>
							</div>
							<div className="progress-track" style={{ marginTop: 8 }}>
								<div className="progress-fill ok" style={{ width: `${pct}%` }} />
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
