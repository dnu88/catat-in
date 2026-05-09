import { useEffect, useMemo, useState } from "react";
import {
	CartesianGrid,
	LineChart,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useWalletStore } from "@store/wallet.store";
import { buildMonthlyReport, requireAuthUid } from "@lib/firestore";
import { api } from "@lib/api";
import { useI18nStore } from "@store/i18n.store";

const CATEGORY_LABEL: Record<string, string> = {
	food: "Makan & Minum",
	transport: "Transportasi",
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

const CATEGORY_COLORS = [
	"var(--accent)",
	"var(--info)",
	"var(--green)",
	"var(--amber)",
	"var(--red)",
	"color-mix(in srgb, var(--accent) 62%, var(--info))",
];

interface SummaryResponse {
	period: {
		year: number;
		month: number;
		start: string;
		end: string;
	};
	total_income: number;
	total_expense: number;
	net: number;
	transaction_count: number;
	expense_by_category: Array<{
		category: string;
		amount: number;
		percentage: number;
	}>;
}

interface TrendPoint {
	year: number;
	month: number;
	income: number;
	expense: number;
	net: number;
}

interface CategoryDetailResponse {
	category: string;
	period: {
		year: number;
		month: number;
	};
	total: number;
	transaction_count: number;
	transactions: Array<{
		id: string;
		type: "income" | "expense";
		amount: number;
		merchant?: string | null;
		note?: string | null;
		date: string;
		category: string;
	}>;
}

export default function ReportsPage() {
	const { language } = useI18nStore();
	const { wallets, fetchWallets } = useWalletStore();
	const [selectedMonth, setSelectedMonth] = useState(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	});
	const [walletFilter, setWalletFilter] = useState("");
	const [summary, setSummary] = useState<SummaryResponse | null>(null);
	const [trends, setTrends] = useState<TrendPoint[]>([]);
	const [monthlyTransactions, setMonthlyTransactions] = useState<
		CategoryDetailResponse["transactions"]
	>([]);
	const [categoryDetail, setCategoryDetail] =
		useState<CategoryDetailResponse | null>(null);
	const [selectedCategory, setSelectedCategory] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);
	const [detailLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [healthScore, setHealthScore] = useState<number | null>(null);
	const [healthTips, setHealthTips] = useState<string[]>([]);

	const [year, month] = selectedMonth.split("-").map(Number);

	 
	useEffect(() => {
		fetchWallets();
	}, []);

	 
	useEffect(() => {
		void loadReports();
		void loadHealthScore();
	}, [selectedMonth, walletFilter]);

	useEffect(() => {
		if (summary?.expense_by_category?.[0]?.category) {
			setSelectedCategory(
				(current) => current || summary.expense_by_category[0].category,
			);
		} else {
			setSelectedCategory("");
		}
	}, [summary]);

	useEffect(() => {
		if (!selectedCategory) {
			setCategoryDetail(null);
			return;
		}

		const categoryTransactions = monthlyTransactions.filter(
			(item) => item.category === selectedCategory,
		);
		const total = categoryTransactions.reduce(
			(sum, item) => sum + Number(item.amount),
			0,
		);

		setCategoryDetail({
			category: selectedCategory,
			period: { year, month },
			total,
			transaction_count: categoryTransactions.length,
			transactions: categoryTransactions,
		});
	}, [monthlyTransactions, month, selectedCategory, year]);

	const loadHealthScore = async () => {
		try {
			const res = await api.get("/reports/health-score");
			setHealthScore(res.data?.data?.score ?? null);
			setHealthTips(res.data?.data?.recommendations || []);
		} catch {
			setHealthScore(null);
			setHealthTips([]);
		}
	};

	const loadReports = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const uid = requireAuthUid();
			const report = await buildMonthlyReport(
				uid,
				year,
				month,
				walletFilter || undefined,
			);
			setSummary({
				period: report.period,
				total_income: report.total_income,
				total_expense: report.total_expense,
				net: report.net,
				transaction_count: report.transaction_count,
				expense_by_category: report.expense_by_category,
			});
			setTrends(report.trends || []);
			setMonthlyTransactions(
				report.transactions.map((item) => ({
					id: item.id,
					type: item.type,
					amount: item.amount,
					merchant: item.merchant || null,
					note: item.note || null,
					date: item.date,
					category: item.category,
				})),
			);
		} catch (err: any) {
			setError(err.message || "Gagal memuat laporan.");
		} finally {
			setIsLoading(false);
		}
	};

	const savingsRate = useMemo(() => {
		if (!summary?.total_income) return 0;
		return Math.round((summary.net / summary.total_income) * 100);
	}, [summary]);

	const previousTrend = trends.length >= 2 ? trends[trends.length - 2] : null;
	const currentTrend = trends.length ? trends[trends.length - 1] : null;
	const expenseDelta =
		previousTrend && currentTrend
			? currentTrend.expense - previousTrend.expense
			: 0;

	const trendChartData = trends.map((item) => ({
		label: monthLabel(item.year, item.month, true),
		income: item.income,
		expense: item.expense,
		net: item.net,
	}));

	const categoryChartData = (summary?.expense_by_category || []).map(
		(item, index) => ({
			...item,
			label: CATEGORY_LABEL[item.category] || item.category,
			fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
		}),
	);

	return (
		<div className="animate-fade-in page-shell">
			<div className="reports-top-row page-header">
				<div>
					<h2 className="page-title">{language === "id" ? "Laporan & Grafik" : "Reports & Charts"}</h2>
					<p className="page-subtitle">
						{language === "id"
							? "Halaman ini menghitung laporan langsung dari data Firestore: ringkasan bulanan, tren 6 bulan, breakdown kategori, dan detail transaksi."
							: "This page computes reports directly from Firestore data: monthly summary, 6-month trends, category breakdown, and transaction details."}
					</p>
				</div>

				<div className="reports-filter-row">
					<div className="period-badge">
						Mei 2026
					</div>
					<input
						className="form-input"
						type="month"
						value={selectedMonth}
						onChange={(event) => setSelectedMonth(event.target.value)}
						style={{ minWidth: "180px" }}
					/>
					<select
						className="form-input"
						value={walletFilter}
						onChange={(event) => setWalletFilter(event.target.value)}
						style={{ minWidth: "180px" }}
					>
						<option value="">
							{language === "id" ? "Semua wallet" : "All wallets"}
						</option>
						{wallets.map((wallet) => (
							<option key={wallet.id} value={wallet.id}>
								{wallet.name}
							</option>
						))}
					</select>
				</div>
			</div>

			{error ? <StatusBox message={error} /> : null}

			{isLoading || !summary ? (
				<EmptyBox
					message={
						language === "id"
							? "Memuat data laporan..."
							: "Loading report data..."
					}
				/>
			) : (
				<>
					{healthScore !== null ? (
						<div className="card" style={{ padding: "14px 16px" }}>
							<div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
								{language === "id"
									? "Skor Kesehatan Finansial"
									: "Financial Health Score"}
							</div>
							<div
								style={{
									fontSize: "24px",
									fontWeight: 800,
									color: "var(--accent)",
								}}
							>
								{healthScore}/100
							</div>
							{healthTips[0] ? (
								<div
									style={{ fontSize: "12px", color: "var(--text-secondary)" }}
								>
									{healthTips[0]}
								</div>
							) : null}
						</div>
					) : null}

					<div className="metrics-grid">
						<WebMetricCard
							label={language === "id" ? "Pemasukan" : "Income"}
							value={formatRupiah(summary.total_income)}
							trend="+8.2% vs bulan lalu"
							trendDirection="up"
							color="#10b981"
							size="large"
						/>
						<WebMetricCard
							label={language === "id" ? "Pengeluaran" : "Expense"}
							value={formatRupiah(summary.total_expense)}
							trend={
								expenseDelta === 0
									? "Stabil vs bulan lalu"
									: `${expenseDelta >= 0 ? "+" : "-"}${formatRupiah(Math.abs(expenseDelta))} vs bulan lalu`
							}
							trendDirection={expenseDelta > 0 ? "down" : expenseDelta < 0 ? "up" : "neutral"}
							color="#ef4444"
							size="large"
						/>
						<WebMetricCard
							label={language === "id" ? "Tabungan" : "Savings"}
							value={`${savingsRate}%`}
							trend={summary.net >= 0 ? "Cashflow positif" : "Cashflow negatif"}
							trendDirection={summary.net >= 0 ? "up" : "down"}
							color="#3b82f6"
							size="large"
						/>
						<WebMetricCard
							label={language === "id" ? "Transaksi" : "Transactions"}
							value={String(summary.transaction_count)}
							trend="Total transaksi bulan ini"
							trendDirection="neutral"
							color="#f59e0b"
							size="large"
						/>
					</div>

					<div className="reports-main-grid">
						<section className="card panel-card">
							<div className="panel-head">
								<h3 className="panel-title">Tren 6 Bulan</h3>
								<p className="panel-subtitle">
									Bandingkan pemasukan dan pengeluaran per bulan untuk melihat
									pola arus kas.
								</p>
							</div>

							{trendChartData.length === 0 ? (
								<EmptyCardMessage message="Belum ada data tren untuk ditampilkan." />
							) : (
								<div style={{ width: "100%", height: "300px" }}>
									<ResponsiveContainer>
										<LineChart data={trendChartData}>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="var(--border)"
											/>
											<XAxis
												dataKey="label"
												tick={{ fontSize: 12, fill: "var(--text-muted)" }}
											/>
											<YAxis
												tickFormatter={shortCurrency}
												tick={{ fontSize: 12, fill: "var(--text-muted)" }}
											/>
											<Tooltip
												formatter={(value: number) =>
													formatRupiah(Number(value))
												}
											/>
											<Line
												type="monotone"
												dataKey="income"
												stroke="var(--green)"
												strokeWidth={3}
												dot={{ r: 4 }}
											/>
											<Line
												type="monotone"
												dataKey="expense"
												stroke="var(--red)"
												strokeWidth={3}
												dot={{ r: 4 }}
											/>
											<Line
												type="monotone"
												dataKey="net"
												stroke="var(--accent)"
												strokeWidth={2}
												strokeDasharray="6 4"
												dot={{ r: 3 }}
											/>
										</LineChart>
									</ResponsiveContainer>
								</div>
							)}
						</section>

						<section className="card panel-card">
							<div className="panel-head">
								<h3 className="panel-title">Breakdown Kategori</h3>
								<p className="panel-subtitle">
									Distribusi pengeluaran per kategori bulan ini.
								</p>
							</div>

							{categoryChartData.length === 0 ? (
								<EmptyCardMessage message="Belum ada pengeluaran di bulan yang dipilih." />
							) : (
								<div className="category-table-container">
									<table className="category-table">
										<thead>
											<tr>
												<th>Kategori</th>
												<th>Jumlah</th>
												<th>Persentase</th>
											</tr>
										</thead>
										<tbody>
											{categoryChartData.map((item, index) => (
												<tr key={item.category}>
													<td>
														<div className="category-cell">
															<span
																className="category-dot"
																style={{
																	background: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
																}}
															/>
															<span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
																{item.label}
															</span>
														</div>
													</td>
													<td>
														<span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
															{formatRupiah(item.amount)}
														</span>
													</td>
													<td>
														<div className="percentage-cell">
															<span style={{ fontSize: "12px", color: "#64748b", minWidth: "40px" }}>
																{item.percentage}%
															</span>
															<div className="percentage-bar">
																<div
																	className="percentage-bar-fill"
																	style={{
																		width: `${item.percentage}%`,
																		background: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
																	}}
																/>
															</div>
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</section>
					</div>

					<div className="reports-secondary-grid">
						{/* Left column: Donut chart + Quick insights + Action buttons */}
						<section className="card panel-card">
							<div className="panel-head">
								<h3 className="panel-title">Ringkasan</h3>
								<p className="panel-subtitle">
									Visualisasi dan wawasan cepat.
								</p>
							</div>

							{/* CSS-only Donut Chart */}
							<div className="donut-container">
								<div className="donut-chart">
									<div className="donut-inner">
										<div className="donut-value">{savingsRate}%</div>
										<div className="donut-label">Tingkat Tabungan</div>
									</div>
								</div>
							</div>

							{/* Quick Insights */}
							<div className="quick-insights">
								<div className="insights-title">Wawasan Cepat</div>

								<div className="insight-item">
									<span className="insight-icon">💰</span>
									<span className="insight-text">
										{savingsRate}% dari pemasukan bulan ini tersisa sebagai arus bersih.
									</span>
								</div>

								<div className="insight-item">
									<span className="insight-icon">📊</span>
									<span className="insight-text">
										{previousTrend && currentTrend
											? `Pengeluaran ${expenseDelta >= 0 ? "naik" : "turun"} ${formatRupiah(Math.abs(expenseDelta))} dibanding ${monthLabel(previousTrend.year, previousTrend.month)}.`
											: "Belum cukup data untuk membandingkan dengan bulan sebelumnya."}
									</span>
								</div>

								<div className="insight-item">
									<span className="insight-icon">🏷️</span>
									<span className="insight-text">
										{summary.expense_by_category[0]
											? `${CATEGORY_LABEL[summary.expense_by_category[0].category] || summary.expense_by_category[0].category} menyumbang ${summary.expense_by_category[0].percentage}% dari total pengeluaran.`
											: "Belum ada kategori pengeluaran pada periode ini."}
									</span>
								</div>
							</div>

							{/* Action Buttons (Phase 2 placeholders) */}
							<div className="action-buttons">
								<button className="btn btn-secondary" style={{ flex: 1 }}>
									Export PDF
								</button>
								<button className="btn btn-secondary" style={{ flex: 1 }}>
									Share
								</button>
							</div>
						</section>

						{/* Right column: Comparison panel + Category breakdown */}
						<section className="card panel-card">
							<div className="panel-head">
								<h3 className="panel-title">Perbandingan Bulan Lalu</h3>
								<p className="panel-subtitle">
									Bandingkan dengan periode sebelumnya.
								</p>
							</div>

							{/* Comparison Panel */}
							<div className="comparison-panel">
								<div className="comparison-row">
									<span className="comparison-label">Pemasukan</span>
									<div className="comparison-values">
										<span className="current-value">{formatRupiah(summary.total_income)}</span>
										{previousTrend && currentTrend && (
											<span className={`delta ${currentTrend.income >= previousTrend.income ? "positive" : "negative"}`}>
												{currentTrend.income >= previousTrend.income ? "+" : ""}
												{formatRupiah(currentTrend.income - previousTrend.income)}
											</span>
										)}
									</div>
								</div>

								<div className="comparison-row">
									<span className="comparison-label">Pengeluaran</span>
									<div className="comparison-values">
										<span className="current-value">{formatRupiah(summary.total_expense)}</span>
										{previousTrend && currentTrend && (
											<span className={`delta ${currentTrend.expense <= previousTrend.expense ? "positive" : "negative"}`}>
												{currentTrend.expense >= previousTrend.expense ? "+" : ""}
												{formatRupiah(currentTrend.expense - previousTrend.expense)}
											</span>
										)}
									</div>
								</div>

								<div className="comparison-row">
									<span className="comparison-label">Tabungan</span>
									<div className="comparison-values">
										<span className="current-value">{formatRupiah(summary.net)}</span>
										{previousTrend && currentTrend && (
											<span className={`delta ${currentTrend.net >= previousTrend.net ? "positive" : "negative"}`}>
												{currentTrend.net >= previousTrend.net ? "+" : ""}
												{formatRupiah(currentTrend.net - previousTrend.net)}
											</span>
										)}
									</div>
								</div>
							</div>

							{/* Category Breakdown List (simplified from original) */}
							<div style={{ marginTop: "20px" }}>
								<div className="insights-title">Top Kategori</div>
								{categoryChartData.slice(0, 3).map((item, index) => (
									<div
										key={item.category}
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											padding: "10px 0",
											borderBottom: "1px solid #f1f5f9",
										}}
									>
										<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
											<span
												style={{
													width: "8px",
													height: "8px",
													borderRadius: "50%",
													background: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
												}}
											/>
											<span style={{ fontSize: "13px", color: "#1e293b" }}>{item.label}</span>
										</div>
										<span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>
											{item.percentage}%
										</span>
									</div>
								))}
							</div>
						</section>
					</div>
				</>
			)}
		</div>
	);
}

interface WebMetricCardProps {
	label: string;
	value: string;
	trend?: string;
	trendDirection?: 'up' | 'down' | 'neutral';
	color: string;
	icon?: React.ReactNode;
	size?: 'default' | 'large';
}

function WebMetricCard({
	label,
	value,
	trend,
	trendDirection = 'neutral',
	color,
	icon,
	size = 'default',
}: WebMetricCardProps) {
	const trendColor = trendDirection === 'up' ? '#10b981' :
					  trendDirection === 'down' ? '#ef4444' : '#64748b';

	return (
		<div className={`metric-card ${size}`} style={{ borderBottom: `3px solid ${color}` }}>
			<div className="metric-label">{label}</div>
			<div className="metric-value" style={{ color }}>{value}</div>
			{trend && (
				<div className="metric-trend" style={{ color: trendColor }}>
					{trend}
				</div>
			)}
		</div>
	);
}

function InsightCard({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div
			style={{
				border: "1px solid var(--border)",
				borderRadius: "14px",
				padding: "14px",
				background: "linear-gradient(180deg, var(--bg-card), var(--bg-card2))",
				marginBottom: "10px",
			}}
		>
			<h4
				style={{
					fontSize: "14px",
					fontWeight: 700,
					color: "var(--text-primary)",
					marginBottom: "6px",
				}}
			>
				{title}
			</h4>
			<p
				style={{
					fontSize: "13px",
					color: "var(--text-secondary)",
					lineHeight: 1.7,
				}}
			>
				{description}
			</p>
		</div>
	);
}

function EmptyCardMessage({ message }: { message: string }) {
	return (
		<div
			style={{
				padding: "24px 16px",
				textAlign: "center",
				border: "1px dashed var(--border-strong)",
				borderRadius: "12px",
				color: "var(--text-muted)",
				fontSize: "13px",
			}}
		>
			{message}
		</div>
	);
}

function EmptyBox({ message }: { message: string }) {
	return (
		<div
			style={{
				border: "1px dashed var(--border-strong)",
				borderRadius: "14px",
				padding: "28px 18px",
				textAlign: "center",
				color: "var(--text-muted)",
				fontSize: "13px",
				lineHeight: 1.7,
			}}
		>
			{message}
		</div>
	);
}

function StatusBox({ message }: { message: string }) {
	return (
		<div
			style={{
				color: "var(--red)",
				background: "color-mix(in srgb, var(--red) 8%, transparent)",
				border: "1px solid color-mix(in srgb, var(--red) 16%, transparent)",
				borderRadius: "12px",
				padding: "10px 12px",
				fontSize: "12px",
				lineHeight: 1.7,
			}}
		>
			{message}
		</div>
	);
}

function formatRupiah(amount: number): string {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		maximumFractionDigits: 0,
	}).format(amount);
}

function shortCurrency(value: number): string {
	if (Math.abs(value) >= 1_000_000)
		return `${Math.round(value / 100_000) / 10}jt`;
	if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}rb`;
	return `${value}`;
}

function monthLabel(year: number, month: number, short = false): string {
	return new Date(year, month - 1, 1).toLocaleDateString("id-ID", {
		month: short ? "short" : "long",
		year: short ? undefined : "numeric",
	});
}

function formatDisplayDate(value: string): string {
	return new Date(value).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}
