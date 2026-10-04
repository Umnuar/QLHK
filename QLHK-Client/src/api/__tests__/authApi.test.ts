import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	authApi,
	getCachedUsers,
	getStoredSessionUser,
	saveStoredSessionUser,
} from "../authApi";
import { apiClient } from "../client";

describe("authApi - Quản lý Xác thực & Phiên làm việc Ngoại tuyến An toàn (TASK-009)", () => {
	let mockStoreData: Record<string, string> = {};

	const mockLocalStorage = {
		getItem: vi.fn((key: string) => mockStoreData[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			mockStoreData[key] = value.toString();
		}),
		removeItem: vi.fn((key: string) => {
			delete mockStoreData[key];
		}),
		clear: vi.fn(() => {
			mockStoreData = {};
		}),
	};

	beforeEach(() => {
		mockStoreData = {};
		if (typeof (globalThis as any).window === "undefined") {
			(globalThis as any).window = globalThis;
		}
		Object.defineProperty(globalThis, "localStorage", {
			value: mockLocalStorage,
			writable: true,
			configurable: true,
		});
		Object.defineProperty(window, "localStorage", {
			value: mockLocalStorage,
			writable: true,
			configurable: true,
		});
		delete (window as any).electronAPI;
		delete (window as any).api;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("đăng nhập trực tuyến thành công và lưu phiên làm việc an toàn", async () => {
		vi.spyOn(apiClient, "post").mockResolvedValueOnce({
			data: {
				accessToken: "token-test-123",
				refreshToken: "refresh-test-123",
				user: {
					id: "usr-01",
					username: "admin",
					role: "admin",
					village_id: null,
				},
			},
		});

		const res = await authApi.login({
			username: "admin",
			password: "password123",
		});

		expect(res.accessToken).toBe("token-test-123");
		expect(res.user.username).toBe("admin");

		const session = await getStoredSessionUser();
		expect(session).toBeDefined();
		expect(session?.user.username).toBe("admin");
		expect(session?.accessToken).toBe("token-test-123");
	});

	it("báo lỗi khi API trả về 401 Unauthorized (không fallback offline giả mạo)", async () => {
		vi.spyOn(apiClient, "post").mockRejectedValueOnce({
			response: {
				status: 401,
				data: { error: "Tên đăng nhập hoặc mật khẩu không chính xác." },
			},
		});

		await expect(
			authApi.login({ username: "admin", password: "wrong_password" }),
		).rejects.toThrow("Tên đăng nhập hoặc mật khẩu không chính xác.");
	});

	it("cho phép khôi phục phiên offline nếu chính người dùng đó đã đăng nhập thành công trước đó", async () => {
		await saveStoredSessionUser({
			user: {
				id: "usr-01",
				username: "canboxa",
				role: "user",
				village_id: "vil-01",
			},
			accessToken: "saved-offline-token",
			refreshToken: "saved-offline-refresh",
			savedAt: new Date().toISOString(),
		});

		// Giả lập rớt mạng (network error)
		vi.spyOn(apiClient, "post").mockRejectedValueOnce(new Error("Network Error"));

		const res = await authApi.login({
			username: "canboxa",
			password: "any_dummy_password",
		});

		expect(res.accessToken).toBe("saved-offline-token");
		expect(res.user.username).toBe("canboxa");
	});

	it("từ chối đăng nhập offline nếu người dùng chưa từng đăng nhập trên máy này", async () => {
		// Giả lập rớt mạng
		vi.spyOn(apiClient, "post").mockRejectedValueOnce(new Error("Network Error"));

		await expect(
			authApi.login({ username: "stranger", password: "secret" }),
		).rejects.toThrow("Không thể kết nối máy chủ xác thực và không tìm thấy phiên làm việc ngoại tuyến hợp lệ.");
	});

	it("lấy danh sách người dùng từ API và ghi đệm an toàn vào cache", async () => {
		const mockUsers = [
			{ id: "u1", username: "admin", role: "admin" },
			{ id: "u2", username: "canbo1", role: "user" },
		];
		vi.spyOn(apiClient, "get").mockResolvedValueOnce({
			data: { data: mockUsers },
		});

		const users = await authApi.getUsers();
		expect(users).toHaveLength(2);
		expect(users[0].username).toBe("admin");

		const cached = await getCachedUsers();
		expect(cached).toHaveLength(2);
		expect(cached[1].username).toBe("canbo1");
	});

	it("đăng xuất xóa sạch token và phiên làm việc lưu trữ", async () => {
		await saveStoredSessionUser({
			user: { id: "u1", username: "admin", role: "admin", village_id: null },
			accessToken: "test-token",
			refreshToken: "test-refresh",
			savedAt: new Date().toISOString(),
		});

		vi.spyOn(apiClient, "post").mockResolvedValueOnce({ data: { message: "OK" } });

		await authApi.logout();

		const session = await getStoredSessionUser();
		expect(session).toBeNull();
	});
});
