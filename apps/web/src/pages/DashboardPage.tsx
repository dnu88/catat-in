import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@store/auth.store";
import { useWalletStore } from "@store/wallet.store";
import { useTransactionStore } from "@store/transaction.store";
import { useBudgetStore } from "@store/budget.store";
import { useBillsStore } from "@store/bills.store";
import { useI18nStore } from "@store/i18n.store";
import { buildMonthlyReport, requireAuthUid } from "@lib/firestore";

const CATEGORY_EMOJI: Record<string, string> = {
	food: "🍔",
	transport: "🚗",
	shopping: "🛒",
	health: "💊",
	entertainment: "🎬",
	education: "📚",
	housing: "🏠",
	salary: "💼",
	freelance: "💻",
	investment: "📈",
	other: "📦",
};

const CATEGORY_LABEL: Record<string, string> = {
	food: "Makan",
	transport: "Transport",
	shopping: "Belanja",
	health: "Kesehatan",
	entertainment: "Hiburan",
	education: "Pendidikan",
	housing: "Rumah",
	salary: "Gaji",
	freelance: "Freelance",
	investment: "Investasi",
	other: "Lainnya",
};

const WALLET_EMOJI: Record<string, string> = {
	bank: "🏦",
	ewallet: "📱",
	cash: "💵",
	investment: "📈",
};

function formatRupiah(amount: number): string {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		maximumFractionDigits: 0,
	}).format(amount);
}

function formatShort(amount: number): string {
	if (amount >= 1_000_000)
		return `${(amount / 1_000_000).toFixed(1).replace(".0", "")}Jt`;
	if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}rb`;
	return amount.toString();
}

function formatDate(dateStr: string): string {
	const d = new Date(dateStr);
	const now = new Date();
	const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
	if (diff === 0) return "Hari ini";
	if (diff === 1) return "Kemarin";
	return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function daysUntil(dateStr: string): number {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const due = new Date(dateStr);
	due.setHours(0, 0, 0, 0);
	return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function currentPeriodStart(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function DashboardPage() {
	const { language } = useI18nStore();
	const { user } = useAuthStore();
	const { wallets, fetchWallets, totalBalance } = useWalletStore();
	const { transactions, fetchTransactions } = useTransactionStore();
	const { budgets, fetchBudgets } = useBudgetStore();
	const { bills, fetchBills } = useBillsStore();
	const navigate = useNavigate();
	const [monthlySummary, setMonthlySummary] = useState<{
		total_income: number;
		total_expense: number;
	} | null>(null);

	useEffect(() => {
		fetchWallets();
		fetchTransactions({ per_page: 5, page: 1 });
		fetchBudgets(currentPeriodStart());
		fetchBills();

		// Ambil ringkasan bulanan lengkap (semua transaksi bulan ini, bukan hanya 5 terakhir)
		const now = new Date();
		try {
			const uid = requireAuthUid();
			buildMonthlyReport(uid, now.getFullYear(), now.getMonth() + 1)
				.then((report) =>
					setMonthlySummary({
						total_income: report.total_income,
						total_expense: report.total_expense,
					}),
				)
				.catch(() => {});
		} catch {
			// user belum login, biarkan kosong
		}
	}, []);

	// Compute summary
	const totalBal = totalBalance();
	const now = new Date();
	const monthStr = now.toLocaleDateString("id-ID", {
		month: "long",
		year: "numeric",
	});

	const incomeThisMonth = monthlySummary?.total_income ?? 0;
	const expenseThisMonth = monthlySummary?.total_expense ?? 0;

	const savingsRate =
		incomeThisMonth > 0
			? Math.round(
					((incomeThisMonth - expenseThisMonth) / incomeThisMonth) * 100,
				)
			: 0;

	const upcomingBills = bills
		.filter((b) => !b.is_paid)
		.sort((a, b) => daysUntil(a.next_due_date) - daysUntil(b.next_due_date))
		.slice(0, 3);

	const topBudgets = budgets.slice(0, 3);
	const budgetRemaining = budgets.reduce((sum, budget) => {
		const limit = Number(budget.limit_amount) || 0;
		const spent = Number(budget.spent_amount) || 0;
		return sum + Math.max(limit - spent, 0);
	}, 0);
	const hasStarterData =
		wallets.length > 0 ||
		transactions.length > 0 ||
		budgets.length > 0 ||
		bills.length > 0;

	return (
		<div className="animate-fade-in page-shell">
			{/* Hero Card */}
			<div className="hero-card" style={{ marginBottom: "20px" }}>
				<div style={{ position: "relative", zIndex: 1 }}>
					<p
						style={{
							fontSize: "12px",
							color: "rgba(255,255,255,0.65)",
							marginBottom: "4px",
						}}
					>
						{language === "id"
							? "Total saldo semua dompet"
							: "Total balance across wallets"}
					</p>
					<p
						style={{
							fontSize: "28px",
							fontWeight: 700,
							letterSpacing: "-0.5px",
							marginBottom: "16px",
						}}
					>
						{formatRupiah(totalBal)}
					</p>
					<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
						<div
							style={{
								background: "rgba(255,255,255,0.12)",
								border: "1px solid rgba(255,255,255,0.1)",
								borderRadius: "8px",
								padding: "10px 14px",
								flex: 1,
								minWidth: "120px",
							}}
						>
							<p
								style={{
									fontSize: "10px",
									color: "rgba(255,255,255,0.6)",
									marginBottom: "2px",
								}}
							>
								Pemasukan {monthStr.split(" ")[0]}
							</p>
							<p style={{ fontSize: "16px", fontWeight: 700 }}>
								Rp {formatShort(incomeThisMonth)}
							</p>
						</div>
						<div
							style={{
								background: "rgba(255,255,255,0.12)",
								border: "1px solid rgba(255,255,255,0.1)",
								borderRadius: "8px",
								padding: "10px 14px",
								flex: 1,
								minWidth: "120px",
							}}
						>
							<p
								style={{
									fontSize: "10px",
									color: "rgba(255,255,255,0.6)",
									marginBottom: "2px",
								}}
							>
								Pengeluaran {monthStr.split(" ")[0]}
							</p>
							<p style={{ fontSize: "16px", fontWeight: 700 }}>
								Rp {formatShort(expenseThisMonth)}
							</p>
						</div>
						<div
							style={{
								background: "rgba(255,255,255,0.12)",
								border: "1px solid rgba(255,255,255,0.1)",
								borderRadius: "8px",
								padding: "10px 14px",
								flex: 1,
								minWidth: "120px",
							}}
						>
							<p
								style={{
									fontSize: "10px",
									color: "rgba(255,255,255,0.6)",
									marginBottom: "2px",
								}}
							>
								Tingkat tabungan
							</p>
							<p style={{ fontSize: "16px", fontWeight: 700 }}>
								{savingsRate}%{" "}
								{savingsRate >= 50 ? "🎉" : savingsRate >= 20 ? "👍" : "📉"}
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className="dashboard-action-grid">
				<QuickActionCard
					icon="✏️"
					label="Manual"
					helper="Input cepat"
					onClick={() => navigate("/transactions")}
				/>
				<QuickActionCard
					icon="🤖"
					label="AI Chat"
					helper="Otomatis"
					onClick={() => navigate("/capture")}
				/>
				<QuickActionCard
					icon="📷"
					label="Upload Struk"
					helper="OCR + review"
					onClick={() => navigate("/imports")}
				/>
				<QuickActionCard
					icon="📥"
					label="Import"
					helper="CSV / Excel"
					onClick={() => navigate("/imports")}
				/>
			</div>

			<div className="dashboard-metric-grid">
				<MetricCard
					icon={wallets[0] ? WALLET_EMOJI[wallets[0].type] || "💳" : "💳"}
					label={wallets[0]?.name || "Wallet utama"}
					value={
						wallets[0] ? formatShort(Number(wallets[0].balance)) : "Belum ada"
					}
					helper={wallets[0] ? "Sumber saldo aktif" : "Tambahkan dompet"}
				/>
				<MetricCard
					icon="🎯"
					label="Sisa anggaran"
					value={
						budgets.length > 0 ? formatShort(budgetRemaining) : "Belum ada"
					}
					helper={
						budgets.length > 0
							? `${budgets.length} kategori aktif`
							: "Buat budget bulan ini"
					}
				/>
				<MetricCard
					icon="🔔"
					label="Pengingat"
					value={
						upcomingBills.length > 0 ? `${upcomingBills.length} aktif` : "Aman"
					}
					helper={
						upcomingBills.length > 0
							? "Tagihan perlu dipantau"
							: "Belum ada yang mendesak"
					}
				/>
			</div>

			{!hasStarterData && (
				<div
					className="card"
					style={{
						padding: "22px",
						marginBottom: "20px",
						display: "flex",
						justifyContent: "space-between",
						gap: "16px",
						flexWrap: "wrap",
						background:
							"linear-gradient(180deg, var(--accent-light), var(--bg-card))",
					}}
				>
					<div style={{ maxWidth: "560px" }}>
						<p
							style={{
								fontSize: "14px",
								fontWeight: 700,
								color: "var(--text-primary)",
								marginBottom: "6px",
							}}
						>
							Mulai pencatatan pertamamu
						</p>
						<p
							style={{
								fontSize: "13px",
								color: "var(--text-secondary)",
								lineHeight: 1.7,
							}}
						>
							Pilih cara yang paling gampang buat kamu. Bisa manual, cerita ke
							AI asisten, atau langsung foto struk aja!
						</p>
					</div>
					<div
						style={{
							display: "flex",
							gap: "8px",
							flexWrap: "wrap",
							alignItems: "flex-start",
						}}
					>
						<button
							className="btn btn-primary"
							onClick={() => navigate("/transactions")}
						>
							Manual
						</button>
						<button
							className="btn btn-secondary"
							onClick={() => navigate("/capture")}
						>
							AI Chat
						</button>
						<button
							className="btn btn-secondary"
							onClick={() => navigate("/imports")}
						>
							Upload Struk
						</button>
					</div>
				</div>
			)}

			{/* Wallet Cards */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
					gap: "10px",
					marginBottom: "20px",
				}}
			>
				{wallets.slice(0, 4).map((w) => (
					<div
						key={w.id}
						className="card"
						style={{
							padding: "14px 16px",
							cursor: "pointer",
							transition: "transform 0.15s",
						}}
						onClick={() => navigate("/wallets")}
						onMouseEnter={(e) =>
							(e.currentTarget.style.transform = "translateY(-2px)")
						}
						onMouseLeave={(e) =>
							(e.currentTarget.style.transform = "translateY(0)")
						}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								marginBottom: "8px",
							}}
						>
							<span style={{ fontSize: "18px" }}>
								{WALLET_EMOJI[w.type] || "💳"}
							</span>
							<span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
								{w.name}
							</span>
						</div>
						<p
							style={{
								fontSize: "16px",
								fontWeight: 700,
								color: "var(--text-primary)",
							}}
						>
							{formatShort(Number(w.balance))}
						</p>
					</div>
				))}
				{wallets.length === 0 && (
					<div
						className="card"
						style={{
							padding: "20px",
							textAlign: "center",
							cursor: "pointer",
							borderStyle: "dashed",
						}}
						onClick={() => navigate("/wallets")}
					>
						<p style={{ fontSize: "24px", marginBottom: "6px" }}>💳</p>
						<p
							style={{
								fontSize: "13px",
								color: "var(--accent)",
								fontWeight: 600,
							}}
						>
							+ Tambah dompet pertama
						</p>
					</div>
				)}
			</div>

			{/* Bottom Grid: Transactions + Sidebar (Budget + Bills) */}
			<div className="dashboard-main-grid">
				{/* Recent Transactions */}
				<div className="card" style={{ overflow: "hidden" }}>
					<div
						style={{
							padding: "14px 18px",
							borderBottom: "1px solid var(--border)",
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						<span
							style={{
								fontSize: "14px",
								fontWeight: 600,
								color: "var(--text-primary)",
							}}
						>
							Transaksi terakhir
						</span>
						<span
							style={{
								fontSize: "12px",
								color: "var(--accent)",
								cursor: "pointer",
								fontWeight: 500,
							}}
							onClick={() => navigate("/transactions")}
						>
							Semua →
						</span>
					</div>
					<div style={{ padding: "6px 14px" }}>
						{transactions.length === 0 ? (
							<div style={{ padding: "28px 0", textAlign: "center" }}>
								<p style={{ fontSize: "28px", marginBottom: "6px" }}>📝</p>
								<p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
									Belum ada transaksi
								</p>
								<button
									className="btn btn-primary"
									style={{ marginTop: "12px", fontSize: "12px" }}
									onClick={() => navigate("/transactions")}
								>
									+ Catat transaksi pertama
								</button>
							</div>
						) : (
							transactions.slice(0, 5).map((tx) => (
								<div
									key={tx.id}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "10px",
										padding: "10px 4px",
										borderBottom: "1px solid var(--border)",
									}}
								>
									<div
										style={{
											width: "32px",
											height: "32px",
											borderRadius: "8px",
											background: "var(--accent-light)",
											border: "1px solid var(--border)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontSize: "14px",
											flexShrink: 0,
										}}
									>
										{CATEGORY_EMOJI[tx.category] || "📦"}
									</div>
									<div style={{ flex: 1, minWidth: 0 }}>
										<p
											style={{
												fontSize: "13px",
												fontWeight: 600,
												color: "var(--text-primary)",
												margin: 0,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{tx.merchant ||
												CATEGORY_LABEL[tx.category] ||
												tx.category}
										</p>
										<p
											style={{
												fontSize: "11px",
												color: "var(--text-muted)",
												margin: 0,
											}}
										>
											{formatDate(tx.date)}
											{tx.note ? ` · ${tx.note}` : ""}
										</p>
									</div>
									<span
										className="badge badge-info"
										style={{ fontSize: "10px" }}
									>
										{CATEGORY_LABEL[tx.category]}
									</span>
									<span
										style={{
											fontSize: "13px",
											fontWeight: 700,
											whiteSpace: "nowrap",
											color:
												tx.type === "income" ? "var(--green)" : "var(--red)",
										}}
									>
										{tx.type === "income" ? "+" : "−"}
										{formatShort(Number(tx.amount))}
									</span>
								</div>
							))
						)}
					</div>
				</div>

				{/* Right column */}
				<div className="dashboard-side-col">
					{/* Budget Progress */}
					<div className="card" style={{ overflow: "hidden" }}>
						<div
							style={{
								padding: "14px 18px",
								borderBottom: "1px solid var(--border)",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<span
								style={{
									fontSize: "14px",
									fontWeight: 600,
									color: "var(--text-primary)",
								}}
							>
								Anggaran
							</span>
							<span
								style={{
									fontSize: "12px",
									color: "var(--accent)",
									cursor: "pointer",
									fontWeight: 500,
								}}
								onClick={() => navigate("/budgets")}
							>
								Kelola →
							</span>
						</div>
						<div style={{ padding: "8px 14px" }}>
							{topBudgets.length === 0 ? (
								<div style={{ padding: "16px 0", textAlign: "center" }}>
									<p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
										Belum ada anggaran
									</p>
									<button
										className="btn btn-secondary"
										style={{ marginTop: "8px", fontSize: "11px" }}
										onClick={() => navigate("/budgets")}
									>
										+ Buat anggaran
									</button>
								</div>
							) : (
								topBudgets.map((b) => {
									const spent = Number(b.spent_amount) || 0;
									const limit = Number(b.limit_amount);
									const pct = Math.min(Math.round((spent / limit) * 100), 100);
									const isOver = spent > limit;
									const isNear = pct >= (b.notify_at_percent || 80) && !isOver;

									return (
										<div
											key={b.id}
											style={{
												padding: "8px 2px",
												borderBottom: "1px solid var(--border)",
											}}
										>
											<div
												style={{
													display: "flex",
													justifyContent: "space-between",
													alignItems: "center",
													marginBottom: "4px",
												}}
											>
												<span
													style={{
														fontSize: "12px",
														color: "var(--text-primary)",
													}}
												>
													{CATEGORY_EMOJI[b.category]}{" "}
													{CATEGORY_LABEL[b.category]}
												</span>
												<span
													style={{
														fontSize: "12px",
														fontWeight: 700,
														color: isOver
															? "var(--red)"
															: isNear
																? "var(--amber)"
																: "var(--green)",
													}}
												>
													{pct}%
												</span>
											</div>
											<div
												style={{
													fontSize: "10px",
													color: "var(--text-muted)",
													marginBottom: "5px",
												}}
											>
												{formatShort(spent)} / {formatShort(limit)}
											</div>
											<div className="progress-track">
												<div
													className={`progress-fill ${isOver ? "over" : isNear ? "warn" : "ok"}`}
													style={{ width: `${pct}%` }}
												/>
											</div>
										</div>
									);
								})
							)}
						</div>
					</div>

					{/* Bill Reminders */}
					<div className="card" style={{ overflow: "hidden" }}>
						<div
							style={{
								padding: "14px 18px",
								borderBottom: "1px solid var(--border)",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<span
								style={{
									fontSize: "14px",
									fontWeight: 600,
									color: "var(--text-primary)",
								}}
							>
								Pengingat
							</span>
							<span
								style={{
									fontSize: "12px",
									color: "var(--accent)",
									cursor: "pointer",
									fontWeight: 500,
								}}
								onClick={() => navigate("/bills")}
							>
								Semua →
							</span>
						</div>
						<div style={{ padding: "8px 14px" }}>
							{upcomingBills.length === 0 ? (
								<div style={{ padding: "16px 0", textAlign: "center" }}>
									<p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
										Tidak ada tagihan mendesak 🎉
									</p>
								</div>
							) : (
								upcomingBills.map((b) => {
									const days = daysUntil(b.next_due_date);
									const isOverdue = days < 0;
									const isSoon = days >= 0 && days <= 3;

									return (
										<div
											key={b.id}
											style={{
												display: "flex",
												gap: "8px",
												padding: "8px 0",
												borderBottom: "1px solid var(--border)",
												alignItems: "flex-start",
											}}
										>
											<div
												style={{
													width: "6px",
													height: "6px",
													borderRadius: "50%",
													background: isOverdue
														? "var(--red)"
														: isSoon
															? "var(--amber)"
															: "var(--green)",
													marginTop: "6px",
													flexShrink: 0,
												}}
											/>
											<div style={{ flex: 1 }}>
												<p
													style={{
														fontSize: "12px",
														fontWeight: 600,
														color: "var(--text-primary)",
														margin: 0,
													}}
												>
													{b.icon || "📄"} {b.name} ·{" "}
													{isOverdue
														? `Telat ${Math.abs(days)} hari`
														: days === 0
															? "Hari ini"
															: `H−${days}`}
												</p>
												<p
													style={{
														fontSize: "10px",
														color: "var(--text-muted)",
														margin: 0,
													}}
												>
													{formatRupiah(Number(b.amount))} ·{" "}
													{new Date(b.next_due_date).toLocaleDateString(
														"id-ID",
														{ day: "numeric", month: "short" },
													)}
												</p>
											</div>
										</div>
									);
								})
							)}
						</div>
					</div>

					{/* Premium upsell */}
					{user?.plan_type !== "premium" && (
						<div
							style={{
								background:
									"linear-gradient(135deg, color-mix(in srgb, var(--accent) 30%, var(--bg-base)), color-mix(in srgb, var(--accent) 72%, var(--bg-card2)))",
								borderRadius: "var(--r)",
								padding: "18px",
								color: "#fff",
							}}
						>
							<p
								style={{
									fontSize: "14px",
									fontWeight: 700,
									marginBottom: "6px",
								}}
							>
								⭐ Upgrade ke Premium
							</p>
							<p
								style={{
									fontSize: "12px",
									color: "color-mix(in srgb, #fff 70%, var(--accent))",
									marginBottom: "14px",
									lineHeight: 1.6,
								}}
							>
								AI insights, kolaborasi grup, import bank tanpa batas — hanya
								Rp29.000/bulan.
							</p>
							<button
								className="btn"
								style={{
									background: "color-mix(in srgb, var(--accent) 82%, #fff)",
									color: "#fff",
									width: "100%",
									padding: "10px",
									fontSize: "13px",
									fontWeight: 700,
								}}
							>
								Upgrade Sekarang
							</button>
						</div>
					)}
				</div>
			</div>

		</div>
	);
}

function QuickActionCard({
	icon,
	label,
	helper,
	onClick,
}: {
	icon: string;
	label: string;
	helper: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			className="card"
			onClick={onClick}
			style={{
				padding: "14px 16px",
				textAlign: "left",
				cursor: "pointer",
				background: "var(--bg-card)",
			}}
		>
			<div style={{ fontSize: "20px", marginBottom: "8px" }}>{icon}</div>
			<div
				style={{
					fontSize: "13px",
					fontWeight: 700,
					color: "var(--text-primary)",
					marginBottom: "2px",
				}}
			>
				{label}
			</div>
			<div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
				{helper}
			</div>
		</button>
	);
}

function MetricCard({
	icon,
	label,
	value,
	helper,
}: {
	icon: string;
	label: string;
	value: string;
	helper: string;
}) {
	return (
		<div className="card" style={{ padding: "14px 16px" }}>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					marginBottom: "8px",
				}}
			>
				<span style={{ fontSize: "18px" }}>{icon}</span>
				<span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
					{label}
				</span>
			</div>
			<p
				style={{
					fontSize: "16px",
					fontWeight: 700,
					color: "var(--text-primary)",
					marginBottom: "4px",
				}}
			>
				{value}
			</p>
			<p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
				{helper}
			</p>
		</div>
	);
}
