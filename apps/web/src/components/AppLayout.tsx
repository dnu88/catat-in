import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@store/auth.store";
import { useI18nStore } from "@store/i18n.store";
import { isBackendConfigured } from "@lib/api";

type NavSectionItem = {
	section: string;
};

type NavLinkItem = {
	to: string;
	icon: string;
	label: string;
	badge?: string;
};

const NAV_ITEMS: Record<"id" | "en", Array<NavSectionItem | NavLinkItem>> = {
	id: [
		{ section: "Menu utama" },
		{ to: "/dashboard", icon: "🏠", label: "Dashboard" },
		{ to: "/transactions", icon: "📋", label: "Transaksi" },
		{ to: "/budgets", icon: "🎯", label: "Anggaran" },
		{ to: "/reports", icon: "📊", label: "Laporan" },
		{ to: "/bills", icon: "🔔", label: "Tagihan" },
		{ section: "Lainnya" },
		{ to: "/groups", icon: "👥", label: "Grup" },
		{ to: "/imports", icon: "📥", label: "Import" },
		{ to: "/wallets", icon: "💳", label: "Dompet" },
		{ to: "/activity", icon: "🕒", label: "Aktivitas" },
		{ to: "/saved-views", icon: "💾", label: "Tampilan Tersimpan" },
		{ to: "/goals", icon: "🏁", label: "Target" },
		{ to: "/settings", icon: "⚙️", label: "Pengaturan" },
	],
	en: [
		{ section: "Main menu" },
		{ to: "/dashboard", icon: "🏠", label: "Dashboard" },
		{ to: "/transactions", icon: "📋", label: "Transactions" },
		{ to: "/budgets", icon: "🎯", label: "Budgets" },
		{ to: "/reports", icon: "📊", label: "Reports" },
		{ to: "/bills", icon: "🔔", label: "Bills" },
		{ section: "Others" },
		{ to: "/groups", icon: "👥", label: "Groups" },
		{ to: "/imports", icon: "📥", label: "Import" },
		{ to: "/wallets", icon: "💳", label: "Wallets" },
		{ to: "/activity", icon: "🕒", label: "Activity" },
		{ to: "/saved-views", icon: "💾", label: "Saved Views" },
		{ to: "/goals", icon: "🏁", label: "Goals" },
		{ to: "/settings", icon: "⚙️", label: "Settings" },
	],
};

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((word) => word[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function getGreeting(lang: "id" | "en"): string {
	const hour = new Date().getHours();
	if (lang === "en") {
		if (hour < 12) return "Good morning";
		if (hour < 17) return "Good afternoon";
		return "Good evening";
	}
	if (hour < 11) return "Selamat pagi";
	if (hour < 15) return "Selamat siang";
	if (hour < 18) return "Selamat sore";
	return "Selamat malam";
}

function formatDate(lang: "id" | "en"): string {
	return new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

export default function AppLayout() {
	const { user, signOut, isLoading } = useAuthStore();
	const { language } = useI18nStore();
	const navigate = useNavigate();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);

	const handleSignOut = async () => {
		setIsSigningOut(true);
		try {
			await signOut();
			navigate("/login", { replace: true });
		} finally {
			setTimeout(() => setIsSigningOut(false), 150);
		}
	};

	const userName = user?.full_name || user?.email || "Pengguna";
	const initials = getInitials(userName);

	if (isSigningOut) {
		return (
			<div
				style={{
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "var(--bg-base)",
					color: "var(--text-primary)",
				}}
			>
				<div
					className="card"
					style={{ padding: "16px 20px", fontSize: "14px" }}
				>
					Keluar akun...
				</div>
			</div>
		);
	}

	return (
		<div className="app-shell">
			{sidebarOpen && (
				<div
					className="sidebar-overlay"
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0,0,0,0.4)",
						zIndex: 35,
					}}
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			<aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
				<div className="sidebar-logo">
					<div className="sidebar-logo-mark">💰</div>
					<div>
						<div className="sidebar-logo-text">Catat.in</div>
						<div className="sidebar-logo-sub">Keuangan Pribadi</div>
					</div>
				</div>

				<nav className="sidebar-nav">
					{NAV_ITEMS[language].map((item, index) => {
						if ("section" in item) {
							return (
								<div key={index} className="nav-section-label">
									{item.section}
								</div>
							);
						}

						const backendOnlyRoutes = new Set(["/imports"]);
						if (!isBackendConfigured && backendOnlyRoutes.has(item.to)) {
							return null;
						}

						return (
							<NavLink
								key={item.to}
								to={item.to}
								className={({ isActive }) =>
									`nav-item ${isActive ? "active" : ""}`
								}
								onClick={() => setSidebarOpen(false)}
							>
								<span className="nav-item-icon">{item.icon}</span>
								<span>{item.label}</span>
								{"badge" in item ? (
									<span className="nav-badge">{item.badge}</span>
								) : null}
							</NavLink>
						);
					})}
				</nav>

				<div className="sidebar-bottom">
					<div className="user-avatar">{initials}</div>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div
							className="user-name"
							style={{
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
							}}
						>
							{userName}
						</div>
						<div className="user-plan-badge">
							{user?.plan_type === "premium"
								? "Premium"
								: language === "id"
									? "Paket gratis"
									: "Free plan"}
						</div>
					</div>
					<button
						onClick={handleSignOut}
						disabled={isLoading}
						className="btn btn-danger"
						style={{
							padding: "6px 12px",
							fontSize: "12px",
							display: "flex",
							alignItems: "center",
							gap: "6px",
						}}
						title="Keluar"
					>
						<span>↪</span> {isLoading ? "Keluar..." : "Keluar"}
					</button>
				</div>
			</aside>

			<div className="main-content">
				<header className="topbar">
					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<button
							className="mobile-menu-btn btn btn-secondary"
							style={{ padding: "6px 10px" }}
							onClick={() => setSidebarOpen(!sidebarOpen)}
						>
							☰
						</button>
						<div>
							<div className="topbar-title">
								{getGreeting(language)}, {user?.full_name?.split(" ")[0] || "Pengguna"}{" "}
								👋
							</div>
							<div className="topbar-sub">{formatDate(language)}</div>
						</div>
					</div>
					<div className="topbar-actions">
						<button className="btn btn-secondary">
							🔔 {language === "id" ? "Notifikasi" : "Notifications"}
						</button>
						<button
							className="btn btn-primary"
							onClick={() => navigate("/capture")}
						>
							＋ {language === "id" ? "Tambah transaksi" : "Add transaction"}
						</button>
					</div>
				</header>

				<main className="page-content">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
