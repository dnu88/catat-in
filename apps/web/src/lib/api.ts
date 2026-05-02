import axios from "axios";
import { getCurrentIdToken } from "./firebase";

const DEFAULT_DEV_API_BASE_URL = "http://localhost:8000/api/v1";

function normalizeBaseUrl(url: string) {
	return url.replace(/\/+$/, "");
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const isBackendConfigured = Boolean(configuredApiBaseUrl);
export const backendRequiredMessage =
	"Fitur ini membutuhkan backend aktif. Untuk mode Firebase-only, fitur ini dinonaktifkan.";

// Backend API optional. Jika tidak diisi, fitur backend-only harus ditangani graceful di level UI.
export const apiConfigError = null;

export const apiBaseUrl = normalizeBaseUrl(
	configuredApiBaseUrl ||
		(import.meta.env.DEV ? DEFAULT_DEV_API_BASE_URL : "/api/v1"),
);

export const api = axios.create({
	baseURL: apiBaseUrl,
	timeout: 30_000,
	headers: {
		"Content-Type": "application/json",
	},
});

api.interceptors.request.use(
	async (config) => {
		const idToken = await getCurrentIdToken();
		if (idToken) {
			config.headers.Authorization = `Bearer ${idToken}`;
		}
		return config;
	},
	(error) => Promise.reject(error),
);

api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const networkErrorMessage = !error.response
			? `Tidak bisa terhubung ke backend (${apiBaseUrl}).`
			: null;

		const errorMessage =
			networkErrorMessage ||
			error.response?.data?.detail ||
			error.response?.data?.message ||
			error.message ||
			"Terjadi kesalahan. Silakan coba lagi.";

		return Promise.reject(new Error(errorMessage));
	},
);

export const uploadApi = axios.create({
	baseURL: apiBaseUrl,
	timeout: 60_000,
});

uploadApi.interceptors.request.use(async (config) => {
	const idToken = await getCurrentIdToken();
	if (idToken) {
		config.headers.Authorization = `Bearer ${idToken}`;
	}
	return config;
});
