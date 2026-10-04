import type { User } from "../types";
import { secureStorage } from "../utils/secureStorage";
import { apiClient, setCachedAccessToken } from "./client";

export interface StoredSessionUser {
	user: User;
	accessToken: string;
	refreshToken: string;
	savedAt: string;
}

export const SESSION_USER_STORE_KEY = "qlhk_session_user";
export const USERS_CACHE_STORE_KEY = "qlhk_cached_users";

export const getStoredSessionUser = async (): Promise<StoredSessionUser | null> => {
	try {
		const raw = await secureStorage.getItem(SESSION_USER_STORE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (parsed?.user?.id) {
				return parsed;
			}
		}
	} catch (err) {
		console.warn("Lỗi đọc session user từ secureStorage:", err);
	}
	return null;
};

export const saveStoredSessionUser = async (
	session: StoredSessionUser | null,
): Promise<void> => {
	try {
		if (session) {
			await secureStorage.setItem(
				SESSION_USER_STORE_KEY,
				JSON.stringify(session),
			);
		} else {
			await secureStorage.removeItem(SESSION_USER_STORE_KEY);
		}
	} catch (err) {
		console.warn("Lỗi lưu session user vào secureStorage:", err);
	}
};

export const getCachedUsers = async (): Promise<User[]> => {
	try {
		const raw = await secureStorage.getItem(USERS_CACHE_STORE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				return parsed;
			}
		}
	} catch (err) {
		console.warn("Lỗi đọc cached users từ secureStorage:", err);
	}
	return [];
};

export const saveCachedUsers = async (users: User[]): Promise<void> => {
	try {
		await secureStorage.setItem(
			USERS_CACHE_STORE_KEY,
			JSON.stringify(users),
		);
	} catch (err) {
		console.warn("Lỗi lưu cached users vào secureStorage:", err);
	}
};

export const authApi = {
	async login(credentials: {
		username: string;
		password: string;
	}): Promise<{ accessToken: string; refreshToken: string; user: User }> {
		const inputUser = credentials.username.trim();

		try {
			const res = await apiClient.post("/auth/login", {
				username: inputUser,
				password: credentials.password,
			});

			const data = res.data?.data || res.data;
			if (data?.accessToken && data?.user) {
				setCachedAccessToken(data.accessToken);
				await saveStoredSessionUser({
					user: data.user,
					accessToken: data.accessToken,
					refreshToken: data.refreshToken || "",
					savedAt: new Date().toISOString(),
				});
				return {
					accessToken: data.accessToken,
					refreshToken: data.refreshToken || "",
					user: data.user,
				};
			}
		} catch (err: any) {
			// Nếu là lỗi 401 từ server: Báo sai thông tin xác thực, không fallback
			if (err.response?.status === 401) {
				throw new Error(
					err.response.data?.error || "Tên đăng nhập hoặc mật khẩu không chính xác.",
				);
			}

			// Nếu server trả về lỗi nghiệp vụ khác
			if (err.response?.data?.error) {
				throw new Error(err.response.data.error);
			}

			// Chế độ Offline Fallback: Chỉ cho phép phiên làm việc trước đó của chính người dùng đã đăng nhập thành công
			const storedSession = await getStoredSessionUser();
			if (
				storedSession &&
				storedSession.user.username.toLowerCase() === inputUser.toLowerCase()
			) {
				setCachedAccessToken(storedSession.accessToken);
				return {
					accessToken: storedSession.accessToken,
					refreshToken: storedSession.refreshToken,
					user: storedSession.user,
				};
			}

			throw new Error(
				"Không thể kết nối máy chủ xác thực và không tìm thấy phiên làm việc ngoại tuyến hợp lệ.",
			);
		}

		throw new Error("Đăng nhập thất bại.");
	},

	async refreshToken(
		refreshToken: string,
	): Promise<{ accessToken: string; refreshToken?: string }> {
		try {
			const res = await apiClient.post("/auth/refresh", { refreshToken });
			if (res.data?.accessToken) {
				setCachedAccessToken(res.data.accessToken);
				return res.data;
			}
		} catch (err) {
			console.warn("Lỗi làm mới token:", err);
		}
		throw new Error("Làm mới phiên đăng nhập thất bại.");
	},

	async getMe(accessToken?: string): Promise<User> {
		try {
			const headers: Record<string, string> = {
				"Cache-Control": "no-cache",
				Pragma: "no-cache",
			};
			if (accessToken) {
				headers["Authorization"] = `Bearer ${accessToken}`;
			}
			const res = await apiClient.get("/auth/me", { headers });
			const user = res.data?.data || res.data?.user || res.data;
			if (!user || typeof user !== "object" || !user.username) {
				throw new Error("Dữ liệu người dùng trả về không hợp lệ");
			}
			return user;
		} catch (err: any) {
			// Offline fallback từ session đã lưu
			const storedSession = await getStoredSessionUser();
			if (storedSession?.user) {
				return storedSession.user;
			}
			throw err;
		}
	},

	async getUsers(): Promise<User[]> {
		try {
			const res = await apiClient.get("/users");
			const remoteUsers = res.data?.data || res.data;
			if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
				await saveCachedUsers(remoteUsers);
				return remoteUsers;
			}
		} catch (err) {
			console.warn("Lấy danh sách người dùng từ backend thất bại, dùng cache:", err);
		}

		return getCachedUsers();
	},

	async updatePassword(userId: string, newPassword: string): Promise<void> {
		await apiClient.put(`/users/${userId}/password`, {
			password: newPassword,
		});
	},

	async updateUser(
		userId: string,
		data: {
			full_name?: string;
			role?: "admin" | "user";
			village_id?: string | null;
		},
	): Promise<User> {
		const res = await apiClient.put(`/users/${userId}`, data);
		const updatedUser = res.data?.data || res.data?.user || res.data;

		// Cập nhật cache
		const cached = await getCachedUsers();
		const newCached = cached.map((u) =>
			u.id === userId ? { ...u, ...data } : u,
		);
		await saveCachedUsers(newCached);

		return updatedUser;
	},

	async createUser(userData: {
		username: string;
		password: string;
		role: "admin" | "user";
		village_id?: string | null;
		full_name?: string;
	}): Promise<User> {
		const res = await apiClient.post("/users", userData);
		const createdUser = res.data?.data || res.data?.user || res.data;

		// Cập nhật cache
		const cached = await getCachedUsers();
		cached.push(createdUser);
		await saveCachedUsers(cached);

		return createdUser;
	},

	async deleteUser(userId: string): Promise<void> {
		await apiClient.delete(`/users/${userId}`);

		// Cập nhật cache
		const cached = await getCachedUsers();
		const newCached = cached.filter((u) => u.id !== userId);
		await saveCachedUsers(newCached);
	},

	async logout(_refreshToken?: string): Promise<void> {
		setCachedAccessToken(null);
		await saveStoredSessionUser(null);
		try {
			await apiClient.post("/auth/logout", { refreshToken: _refreshToken });
		} catch {
			// Offline fallback
		}
	},
};
