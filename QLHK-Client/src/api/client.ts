import axios from "axios";
import { secureStorage } from "../utils/secureStorage";
import { getTauriAxiosAdapter } from "./tauriHttpAdapter";

export type BackendPort = 5002 | 5012;

export const STORAGE_KEY_BACKEND_PORT = "qlhk_backend_port";

export const BACKEND_PORT_METADATA: Record<
	BackendPort,
	{ name: string; engine: string; url: string; port: BackendPort }
> = {
	5002: {
		name: "Backend Node.js",
		engine: "Express.js & Prisma",
		url: "http://localhost:5002/api",
		port: 5002,
	},
	5012: {
		name: "Backend Rust Axum",
		engine: "Axum & SQLx",
		url: "http://localhost:5012/api",
		port: 5012,
	},
};

export const getActiveBackendPort = (): BackendPort => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem(STORAGE_KEY_BACKEND_PORT);
		if (saved === "5002") return 5002;
		if (saved === "5012") return 5012;
	}
	return 5012;
};

export const API_BASE_URL =
	import.meta.env.VITE_API_URL || "http://localhost:5012/api";

const getInitialBaseUrl = (): string => {
	if (typeof window !== "undefined") {
		const saved = localStorage.getItem(STORAGE_KEY_BACKEND_PORT);
		if (saved === "5002") return "http://localhost:5002/api";
		if (saved === "5012") return "http://localhost:5012/api";
	}
	return API_BASE_URL;
};

let currentApiBaseUrl = getInitialBaseUrl();

export const getActiveApiBaseUrl = (): string => currentApiBaseUrl;

export const setApiBaseUrl = (url: string): void => {
	currentApiBaseUrl = url;
	apiClient.defaults.baseURL = url;
};

export const switchBackendPort = (port: BackendPort): void => {
	if (typeof window !== "undefined") {
		localStorage.setItem(STORAGE_KEY_BACKEND_PORT, String(port));
	}
	const newUrl = `http://localhost:${port}/api`;
	setApiBaseUrl(newUrl);
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("backend:port_changed", {
				detail: { port, url: newUrl },
			}),
		);
	}
};

export const checkBackendHealth = async (
	port: BackendPort,
): Promise<{ online: boolean; latencyMs: number }> => {
	const start = performance.now();
	try {
		const testClient = axios.create({
			baseURL: `http://localhost:${port}/api`,
			timeout: 2000,
			adapter: getTauriAxiosAdapter(),
		});
		const res = await testClient.get("/ping");
		const latencyMs = Math.round(performance.now() - start);
		if (res.status === 200 || res.status === 204) {
			return { online: true, latencyMs };
		}
		return { online: false, latencyMs };
	} catch (err: any) {
		if (err?.response) {
			const latencyMs = Math.round(performance.now() - start);
			return { online: true, latencyMs };
		}
		return { online: false, latencyMs: -1 };
	}
};

export const apiClient = axios.create({
	baseURL: currentApiBaseUrl,
	timeout: 10000,
	adapter: getTauriAxiosAdapter(),
	headers: {
		"Content-Type": "application/json",
	},
});

export const detectAndSetOptimalApiGateway = async (): Promise<string> => {
	const activePort = getActiveBackendPort();
	const preferredLocalUrl = `http://localhost:${activePort}/api`;

	try {
		const testClient = axios.create({
			baseURL: preferredLocalUrl,
			timeout: 1500,
			adapter: getTauriAxiosAdapter(),
		});
		const localRes = await testClient.get("/ping");
		if (localRes.status === 204 || localRes.status === 200) {
			setApiBaseUrl(preferredLocalUrl);
			return preferredLocalUrl;
		}
	} catch {
	}

	const domainUrl = API_BASE_URL;
	try {
		const res = await apiClient.get("/ping", { timeout: 2000 });
		if (res.status === 204 || res.status === 200) {
			setApiBaseUrl(domainUrl);
			return domainUrl;
		}
	} catch {
	}

	setApiBaseUrl(preferredLocalUrl);
	return preferredLocalUrl;
};

detectAndSetOptimalApiGateway().catch(() => {});

let cachedAccessToken: string | null = null;

export const setCachedAccessToken = (token: string | null): void => {
	cachedAccessToken = token;
};

apiClient.interceptors.request.use(
	async (config) => {
		try {
			let token = cachedAccessToken;
			if (!token) {
				token = await secureStorage.getItem("accessToken");
				if (token) {
					cachedAccessToken = token;
				}
			}
			if (token && !token.startsWith("offline-token-") && config.headers) {
				config.headers.Authorization = `Bearer ${token}`;
			}
		} catch (err) {
			console.warn("Lỗi đọc accessToken từ secureStorage:", err);
		}
		return config;
	},
	(error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: Array<{
	resolve: (token: string) => void;
	reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
	failedQueue.forEach((prom) => {
		if (error) {
			prom.reject(error);
		} else {
			prom.resolve(token!);
		}
	});
	failedQueue = [];
};

apiClient.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error?.config;

		const isRealNetworkError =
			error?.code === "ERR_NETWORK" ||
			error?.code === "ECONNABORTED" ||
			(!error?.response && error?.message?.includes("Network Error"));

		if (isRealNetworkError) {
			console.warn(
				`[API Network] Chưa kết nối được Backend tại ${currentApiBaseUrl}, đang sử dụng Local Store.`,
			);
			return Promise.reject(error);
		}

		if (
			error?.response?.status === 401 &&
			originalRequest &&
			!originalRequest._retry &&
			!originalRequest.url?.includes("/auth/login") &&
			!originalRequest.url?.includes("/auth/refresh")
		) {
			if (isRefreshing) {
				return new Promise((resolve, reject) => {
					failedQueue.push({
						resolve: (token: string) => {
							originalRequest.headers = originalRequest.headers || {};
							originalRequest.headers.Authorization = `Bearer ${token}`;
							resolve(apiClient(originalRequest));
						},
						reject: (err: any) => {
							reject(err);
						},
					});
				});
			}

			originalRequest._retry = true;
			isRefreshing = true;

			try {
				const refreshToken = await secureStorage.getItem("refreshToken");
				if (refreshToken && !refreshToken.startsWith("offline-refresh-")) {
					const { authApi } = await import("./authApi");
					const refreshed = await authApi.refreshToken(refreshToken);
					if (refreshed?.accessToken) {
						await secureStorage.setItem("accessToken", refreshed.accessToken);
						setCachedAccessToken(refreshed.accessToken);
						if (refreshed.refreshToken) {
							await secureStorage.setItem(
								"refreshToken",
								refreshed.refreshToken,
							);
						}
						processQueue(null, refreshed.accessToken);
						originalRequest.headers = originalRequest.headers || {};
						originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
						return apiClient(originalRequest);
					}
				}
				processQueue(error, null);
				setCachedAccessToken(null);
				await secureStorage.removeItem("accessToken");
				await secureStorage.removeItem("refreshToken");
				window.dispatchEvent(new CustomEvent("auth:expired"));
			} catch (refreshErr) {
				processQueue(refreshErr, null);
				setCachedAccessToken(null);
				await secureStorage.removeItem("accessToken");
				await secureStorage.removeItem("refreshToken");
				window.dispatchEvent(new CustomEvent("auth:expired"));
			} finally {
				isRefreshing = false;
			}
		}

		return Promise.reject(error);
	},
);
