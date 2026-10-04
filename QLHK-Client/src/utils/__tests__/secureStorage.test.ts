import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { secureStorage } from "../secureStorage";

describe("secureStorage", () => {
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

	describe("Web fallback (localStorage)", () => {
		it("lưu và lấy dữ liệu qua localStorage khi không có Electron API", async () => {
			await secureStorage.setItem("testKey", "hello-dak-ha");
			const val = await secureStorage.getItem("testKey");
			expect(val).toBe("hello-dak-ha");
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"testKey",
				"hello-dak-ha",
			);
		});

		it("xóa dữ liệu qua removeItem", async () => {
			await secureStorage.setItem("token", "sample-token");
			await secureStorage.removeItem("token");
			const val = await secureStorage.getItem("token");
			expect(val).toBeNull();
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("token");
		});

		it("clear các key phiên đăng nhập", async () => {
			await secureStorage.setItem("accessToken", "token-123");
			await secureStorage.setItem("refreshToken", "refresh-456");
			await secureStorage.setItem("user", JSON.stringify({ name: "Admin" }));

			await secureStorage.clear();

			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("accessToken");
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("refreshToken");
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("user");
		});
	});

	describe("Electron API (window.electronAPI.secureStore)", () => {
		it("ưu tiên đọc và ghi qua window.electronAPI.secureStore", async () => {
			const mockStore = {
				get: vi.fn().mockResolvedValue("electron-val"),
				set: vi.fn().mockResolvedValue(true),
				delete: vi.fn().mockResolvedValue(true),
				clear: vi.fn().mockResolvedValue(true),
			};

			window.electronAPI = {
				secureStore: mockStore,
				openFileDialog: vi.fn(),
				setZoom: vi.fn(),
				getAppVersion: vi.fn(),
			};

			await secureStorage.setItem("key1", "val1");
			expect(mockStore.set).toHaveBeenCalledWith("key1", "val1");

			const res = await secureStorage.getItem("key1");
			expect(mockStore.get).toHaveBeenCalledWith("key1");
			expect(res).toBe("electron-val");

			await secureStorage.removeItem("key1");
			expect(mockStore.delete).toHaveBeenCalledWith("key1");

			await secureStorage.clear();
			expect(mockStore.clear).toHaveBeenCalled();
		});

		it("xử lý lỗi an toàn và fallback sang localStorage nếu secure store throw error", async () => {
			const mockStore = {
				get: vi.fn().mockRejectedValue(new Error("IPC Failure")),
				set: vi.fn().mockRejectedValue(new Error("IPC Failure")),
				delete: vi.fn().mockRejectedValue(new Error("IPC Failure")),
				clear: vi.fn().mockRejectedValue(new Error("IPC Failure")),
			};

			window.electronAPI = {
				secureStore: mockStore,
				openFileDialog: vi.fn(),
				setZoom: vi.fn(),
				getAppVersion: vi.fn(),
			};

			mockStoreData["fallbackKey"] = "fallbackVal";
			const val = await secureStorage.getItem("fallbackKey");
			expect(val).toBe("fallbackVal");
		});
	});
});
