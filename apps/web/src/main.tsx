import React, { Component, Suspense, lazy, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import {
	BrowserRouter,
	Routes,
	Route,
	Navigate,
	useLocation,
	useNavigate,
} from "react-router-dom";
import {
	firebaseConfigError,
	sessionReady,
	subscribeAuthState,
} from "@lib/firebase";
import { backendRequiredMessage, isBackendConfigured } from "@lib/api";
import { useAuthStore } from "@store/auth.store";

import "./index.css";

import AppLayout from "@components/AppLayout";

const LoginPage = lazy(() => import("@pages/LoginPage"));
const RegisterPage = lazy(() => import("@pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("@pages/DashboardPage"));
const TransactionPage = lazy(() => import("@pages/TransactionPage"));
const WalletPage = lazy(() => import("@pages/WalletPage"));
const BudgetPage = lazy(() => import("@pages/BudgetPage"));
const BillsPage = lazy(() => import("@pages/BillsPage"));
const ReportsPage = lazy(() => import("@pages/ReportsPage"));
const SettingsPage = lazy(() => import("@pages/SettingsPage"));
const CapturePage = lazy(() => import("@pages/CapturePage"));
const GroupsPage = lazy(() => import("@pages/GroupsPage"));
const ImportsPage = lazy(() => import("@pages/ImportsPage"));
const ActivityPage = lazy(() => import("@pages/ActivityPage"));
const SavedViewsPage = lazy(() => import("@pages/SavedViewsPage"));
const SavingsGoalsPage = lazy(() => import("@pages/SavingsGoalsPage"));

// Satu sumber kebenaran auth: apakah Firebase sudah selesai cek sesi awal.
let authResolved = false;
let authSession = false;

sessionReady.then((user) => {
	authSession = !!user;
	authResolved = true;
});

function useAuthReady(): { ready: boolean; hasSession: boolean } {
	const [ready, setReady] = useState(authResolved);
	const [hasSession, setHasSession] = useState(authSession);

	useEffect(() => {
		if (authResolved) {
			setReady(true);
			setHasSession(authSession);
			return;
		}

		sessionReady.then((user) => {
			setReady(true);
			setHasSession(!!user);
		});
	}, []);

	// Tetap sinkron jika auth berubah setelah ready (login/logout)
	useEffect(() => {
		if (firebaseConfigError) return;
		const unsubscribe = subscribeAuthState((user) => {
			setHasSession(!!user);
		});
		return () => unsubscribe();
	}, []);

	return { ready, hasSession };
}

class RootErrorBoundary extends Component<
	{ children: React.ReactNode },
	{ hasError: boolean; message: string }
> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false, message: "" };
	}

	static getDerivedStateFromError(error: unknown) {
		return {
			hasError: true,
			message:
				error instanceof Error ? error.message : "Terjadi error tidak terduga.",
		};
	}

	render() {
		if (this.state.hasError) {
			return (
				<FullscreenMessage
					title="Aplikasi mengalami error"
					body={`Silakan refresh halaman. Detail: ${this.state.message}`}
				/>
			);
		}

		return this.props.children;
	}
}

function FullscreenMessage({
	title,
	body,
	loading = false,
}: {
	title: string;
	body: string;
	loading?: boolean;
}) {
	return (
		<div
			style={{
				minHeight: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "24px",
				background: "var(--bg-base)",
			}}
		>
			<div style={{ textAlign: "center", maxWidth: "520px" }}>
				<div
					style={{
						position: "relative",
						width: "102px",
						height: "102px",
						margin: "0 auto 20px",
					}}
				>
					<div
						style={{
							position: "absolute",
							inset: "-6px",
							borderRadius: "32px",
							border: "2px solid rgba(37, 99, 235, 0.08)",
							borderTopColor: "rgba(37, 99, 235, 0.7)",
							borderRightColor: "rgba(59, 130, 246, 0.38)",
							animation: loading
								? "loaderOrbit 1.2s linear infinite"
								: undefined,
						}}
					/>
					<div
						style={{
							position: "absolute",
							inset: 0,
							borderRadius: "24px",
							background:
								"linear-gradient(135deg, #1E40AF, #2563EB 50%, #3B82F6)",
							boxShadow: "0 20px 40px rgba(37, 99, 235, 0.25)",
							animation: loading
								? "loaderFloat 1.8s ease-in-out infinite"
								: undefined,
						}}
					/>
					<div
						style={{
							position: "absolute",
							inset: "10px",
							borderRadius: "18px",
							background: "rgba(255,255,255,0.14)",
							border: "1px solid rgba(255,255,255,0.22)",
							backdropFilter: "blur(10px)",
							overflow: "hidden",
						}}
					/>
					<div
						style={{
							position: "absolute",
							inset: "10px",
							borderRadius: "18px",
							background:
								"linear-gradient(120deg, transparent 10%, rgba(255,255,255,0.22) 30%, transparent 52%)",
							transform: "translateX(-120%)",
							animation: loading
								? "loaderShine 1.8s ease-in-out infinite"
								: undefined,
						}}
					/>
					<div
						style={{
							position: "absolute",
							inset: 0,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: "34px",
							animation: loading
								? "loaderPulse 1.2s ease-in-out infinite"
								: undefined,
						}}
					>
						💰
					</div>
				</div>
				<div
					style={{
						fontSize: "14px",
						fontWeight: 700,
						letterSpacing: "0.08em",
						textTransform: "uppercase",
						color: "var(--accent)",
						marginBottom: "8px",
					}}
				>
					CATAT-IN
				</div>
				<h1
					style={{
						margin: "0 0 8px",
						fontSize: "24px",
						color: "var(--text-primary)",
					}}
				>
					{title}
				</h1>
				<p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.7 }}>
					{body}
				</p>
				<style>{`
          @keyframes loaderOrbit {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes loaderFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }

          @keyframes loaderPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.92; }
          }

          @keyframes loaderShine {
            0% { transform: translateX(-130%) skewX(-18deg); opacity: 0; }
            20% { opacity: 1; }
            60% { transform: translateX(130%) skewX(-18deg); opacity: 0.9; }
            100% { transform: translateX(130%) skewX(-18deg); opacity: 0; }
          }
        `}</style>
			</div>
		</div>
	);
}

function ConfigErrorPage() {
	const configError =
		firebaseConfigError || "Konfigurasi frontend belum lengkap.";

	return (
		<FullscreenMessage
			title="Konfigurasi frontend belum siap"
			body={`${configError} Isi environment frontend dengan variabel VITE_FIREBASE_* yang benar lalu deploy ulang.`}
		/>
	);
}

function AuthCallbackPage() {
	const navigate = useNavigate();
	const { refreshUser } = useAuthStore();
	const { ready, hasSession } = useAuthReady();

	useEffect(() => {
		if (!ready) return;
		if (firebaseConfigError) {
			navigate("/login", { replace: true });
			return;
		}
		if (hasSession) {
			refreshUser().finally(() => navigate("/dashboard", { replace: true }));
		} else {
			navigate("/login", { replace: true });
		}
	}, [ready, hasSession, navigate, refreshUser]);

	return (
		<FullscreenMessage
			title="Memproses login"
			body="Sedang menyiapkan sesi akun kamu."
			loading
		/>
	);
}

function RequireAuth({ children }: { children: React.ReactNode }) {
	const location = useLocation();
	const { ready, hasSession } = useAuthReady();
	const { isLoading: authLoading } = useAuthStore();

	if (!ready || authLoading) {
		return (
			<FullscreenMessage
				title="Memuat aplikasi"
				body="Sedang mengecek sesi login kamu."
				loading
			/>
		);
	}

	if (firebaseConfigError) {
		return <ConfigErrorPage />;
	}

	if (!hasSession) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <>{children}</>;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
	const { ready, hasSession } = useAuthReady();

	if (!ready) {
		return (
			<FullscreenMessage
				title="Memuat halaman login"
				body="Sedang mengecek apakah sesi kamu masih aktif."
				loading
			/>
		);
	}

	if (firebaseConfigError) {
		return <ConfigErrorPage />;
	}

	if (hasSession) {
		return <Navigate to="/dashboard" replace />;
	}

	return <>{children}</>;
}

function BackendFeatureGuard({ children }: { children: React.ReactNode }) {
	if (!isBackendConfigured) {
		return (
			<FullscreenMessage
				title="Fitur membutuhkan backend"
				body={backendRequiredMessage}
			/>
		);
	}
	return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<RootErrorBoundary>
			<BrowserRouter>
				{firebaseConfigError ? (
					<ConfigErrorPage />
				) : (
					<Routes>
						<Route
							path="/login"
							element={
								<GuestOnly>
									<Suspense
										fallback={
											<FullscreenMessage
												title="Memuat halaman"
												body="Menyiapkan login..."
												loading
											/>
										}
									>
										<LoginPage />
									</Suspense>
								</GuestOnly>
							}
						/>
						<Route
							path="/register"
							element={
								<GuestOnly>
									<Suspense
										fallback={
											<FullscreenMessage
												title="Memuat halaman"
												body="Menyiapkan pendaftaran..."
												loading
											/>
										}
									>
										<RegisterPage />
									</Suspense>
								</GuestOnly>
							}
						/>
						<Route
							path="/forgot-password"
							element={
								<GuestOnly>
									<Suspense
										fallback={
											<FullscreenMessage
												title="Memuat halaman"
												body="Menyiapkan reset password..."
												loading
											/>
										}
									>
										<ForgotPasswordPage />
									</Suspense>
								</GuestOnly>
							}
						/>
						<Route
							path="/reset-password"
							element={
								<Suspense
									fallback={
										<FullscreenMessage
											title="Memuat halaman"
											body="Menyiapkan reset password..."
											loading
										/>
									}
								>
									<ResetPasswordPage />
								</Suspense>
							}
						/>
						<Route path="/auth/callback" element={<AuthCallbackPage />} />

						<Route
							element={
								<RequireAuth>
									<AppLayout />
								</RequireAuth>
							}
						>
							<Route
								path="/dashboard"
								element={
									<Suspense
										fallback={
											<FullscreenMessage
												title="Memuat halaman"
												body="Menyiapkan dashboard..."
												loading
											/>
										}
									>
										<DashboardPage />
									</Suspense>
								}
							/>
							<Route
								path="/transactions"
								element={
									<Suspense
										fallback={
											<FullscreenMessage
												title="Memuat halaman"
												body="Menyiapkan transaksi..."
												loading
											/>
										}
									>
										<TransactionPage />
									</Suspense>
								}
							/>
							<Route
								path="/capture"
								element={
									<Suspense
										fallback={
											<FullscreenMessage
												title="Memuat halaman"
												body="Menyiapkan capture..."
												loading
											/>
										}
									>
										<CapturePage />
									</Suspense>
								}
							/>
							<Route
								path="/wallets"
								element={
									<Suspense
										fallback={
											<FullscreenMessage
												title="Memuat halaman"
												body="Menyiapkan dompet..."
												loading
											/>
										}
									>
										<WalletPage />
									</Suspense>
								}
							/>
							<Route
								path="/budgets"
								element={
									<Suspense
										fallback={
											<FullscreenMessage
												title="Memuat halaman"
												body="Menyiapkan anggaran..."
												loading
											/>
										}
									>
										<BudgetPage />
									</Suspense>
								}
							/>
							<Route
								path="/budget"
								element={<Navigate to="/budgets" replace />}
							/>
							<Route
								path="/anggaran"
								element={<Navigate to="/budgets" replace />}
							/>
							<Route
								path="/bills"
								element={
									<Suspense
										fallback={
											<FullscreenMessage
												title="Memuat halaman"
												body="Menyiapkan tagihan..."
												loading
											/>
										}
									>
										<BillsPage />
									</Suspense>
								}
							/>
							<Route
								path="/reports"
								element={
									<Suspense
										fallback={
											<FullscreenMessage
												title="Memuat halaman"
												body="Menyiapkan laporan..."
												loading
											/>
										}
									>
										<ReportsPage />
									</Suspense>
								}
							/>
							<Route
								path="/report"
								element={<Navigate to="/reports" replace />}
							/>
							<Route
								path="/laporan"
								element={<Navigate to="/reports" replace />}
							/>
							<Route
								path="/groups"
								element={
									<Suspense
										fallback={
											<FullscreenMessage
												title="Memuat halaman"
												body="Menyiapkan grup..."
												loading
											/>
										}
									>
										<GroupsPage />
									</Suspense>
								}
							/>
							<Route
								path="/imports"
								element={
									<BackendFeatureGuard>
										<Suspense
											fallback={
												<FullscreenMessage
													title="Memuat halaman"
													body="Menyiapkan import..."
													loading
												/>
											}
										>
											<ImportsPage />
										</Suspense>
									</BackendFeatureGuard>
								}
							/>
							<Route
								path="/settings"
								element={
									<Suspense
										fallback={
											<FullscreenMessage
												title="Memuat halaman"
												body="Menyiapkan pengaturan..."
												loading
											/>
										}
									>
										<SettingsPage />
									</Suspense>
								}
							/>
							<Route
								path="/activity"
								element={
									<Suspense
										fallback={
											<FullscreenMessage
												title="Memuat halaman"
												body="Menyiapkan activity..."
												loading
											/>
										}
									>
										<ActivityPage />
									</Suspense>
								}
							/>
							<Route
								path="/saved-views"
								element={
									<Suspense
										fallback={
											<FullscreenMessage
												title="Memuat halaman"
												body="Menyiapkan saved views..."
												loading
											/>
										}
									>
										<SavedViewsPage />
									</Suspense>
								}
							/>
							<Route
								path="/goals"
								element={
									<Suspense
										fallback={
											<FullscreenMessage
												title="Memuat halaman"
												body="Menyiapkan goals..."
												loading
											/>
										}
									>
										<SavingsGoalsPage />
									</Suspense>
								}
							/>
						</Route>

						<Route path="*" element={<Navigate to="/login" replace />} />
					</Routes>
				)}
			</BrowserRouter>
		</RootErrorBoundary>
	</React.StrictMode>,
);
