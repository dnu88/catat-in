import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./index.css";

import { applyWebTheme, resolveThemeMode } from "@theme/web-theme";

const LandingPage = lazy(() => import("@pages/LandingPage"));
const LegacyApp = lazy(() => import("./legacy/LegacyApp"));

function bootstrapTheme() {
	try {
		const raw = localStorage.getItem("kaswise-web-theme");
		const parsed = raw ? JSON.parse(raw) : null;
		const preference = parsed?.state?.preference || "system";
		applyWebTheme(resolveThemeMode(preference));
	} catch {
		applyWebTheme(resolveThemeMode("system"));
	}
}

function LoadingShell() {
	return (
		<div className="landing-loading" role="status">
			<div className="landing-brand-mark">K</div>
			<span>Memuat Kaswise...</span>
		</div>
	);
}

bootstrapTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<BrowserRouter>
			<Suspense fallback={<LoadingShell />}>
				<Routes>
					<Route path="/" element={<LandingPage />} />
					<Route path="/*" element={<LegacyApp />} />
				</Routes>
			</Suspense>
		</BrowserRouter>
	</React.StrictMode>,
);
