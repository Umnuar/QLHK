import axios from "axios";
import { secureStorage } from "../utils/secureStorage";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://qlhk.dulieudakha.vn/api";

let currentApiBaseUrl = API_BASE_URL;

export const getActiveApiBaseUrl = (): string => currentApiBaseUrl;

export const setApiBaseUrl = (url: string): void => {
	currentApiBaseUrl = url;
	apiClient.defaults.baseURL = url;
};

export const apiClient = axios.create({
	baseURL: currentApiBaseUrl,
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
	},
});

export const detectAndSetOptimalApiGateway = async (): Promise<string> => {
	// Mặc định 100% sử dụng Domain chính thức của Hệ sinh thái Đăk Hà để kết nối Online
	const domainUrl = API_BASE_URL;
	setApiBaseUrl(domainUrl);
	return domainUrl;
};

// Khởi chạy đảm bảo Gateway luôn trỏ về Domain chính thức
detectAndSetOptimalApiGateway().catch(() => {});

// In-memory token cache: tránh gọi async secureStorage trên mỗi request
let cachedAccessToken: string | null = null;

export const setCachedAccessToken = (token: string | null): void => {
	cachedAccessToken = token;
};

// Request Interceptor: Gắn Bearer Token nếu có trong secureStorage
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
			if (token && config.headers) {
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

// Interceptor xử lý lỗi linh hoạt & tự động thử làm mới token khi gặp 401 Unauthorized
apiClient.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error?.config;

		// Phân biệt rõ: Chỉ lỗi mạng thực sự mới coi là offline
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

		// Nếu gặp lỗi 401 Unauthorized: Tự động làm mới token bằng refreshToken nếu có
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
				// Không có refreshToken hợp lệ
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
