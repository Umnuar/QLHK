import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearCache,
	getCache,
	getCacheMeta,
	removeCache,
	setCache,
} from "../indexedDB";

describe("indexedDB Offline Cache Module", () => {
	let mockStore: Record<string, string> = {};

	const mockLocalStorage = {
		getItem: vi.fn((key: string) => mockStore[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			mockStore[key] = String(value);
		}),
		removeItem: vi.fn((key: string) => {
			delete mockStore[key];
		}),
		clear: vi.fn(() => {
			mockStore = {};
		}),
		key: vi.fn((index: number) => Object.keys(mockStore)[index] || null),
		get length() {
			return Object.keys(mockStore).length;
		},
	};

	beforeEach(async () => {
		mockStore = {};
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
		await clearCache();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("lưu và đọc dữ liệu cache chính xác", async () => {
		const testData = { id: "hh-1", book_number: "SHK-001", head_name: "A Đôi" };
		await setCache("test_key", testData);

		const retrieved = await getCache<typeof testData>("test_key");
		expect(retrieved).toEqual(testData);
	});

	it("trả về null nếu cache key không tồn tại", async () => {
		const result = await getCache("non_existent_key");
		expect(result).toBeNull();
	});

	it("trả về metadata thời gian cập nhật updatedAt", async () => {
		const before = Date.now();
		await setCache("meta_key", { value: 123 });
		const after = Date.now();

		const meta = await getCacheMeta("meta_key");
		expect(meta).not.toBeNull();
		expect(meta!.updatedAt).toBeGreaterThanOrEqual(before);
		expect(meta!.updatedAt).toBeLessThanOrEqual(after);
	});

	it("xóa đúng key cụ thể với removeCache", async () => {
		await setCache("key_1", { data: 1 });
		await setCache("key_2", { data: 2 });

		await removeCache("key_1");

		expect(await getCache("key_1")).toBeNull();
		expect(await getCache("key_2")).not.toBeNull();
	});

	it("clearCache chỉ xóa các key có tiền tố qlhk_cache_ mà không ảnh hưởng key khác", async () => {
		localStorage.setItem("other_app_key", "keep_me");
		await setCache("cache_1", "val1");
		await setCache("cache_2", "val2");

		await clearCache();

		expect(await getCache("cache_1")).toBeNull();
		expect(await getCache("cache_2")).toBeNull();
		expect(localStorage.getItem("other_app_key")).toBe("keep_me");
	});

	it("hỗ trợ lưu trữ cấu trúc lớn dạng object bất đồng bộ không phụ thuộc localStorage string", async () => {
		const largeBatch = Array.from({ length: 50 }, (_, i) => ({
			id: `hh-${i}`,
			head_name: `Chủ hộ số ${i}`,
			members: [{ full_name: `Thành viên A${i}`, age: 20 + (i % 50) }],
		}));

		await setCache("large_batch_test", largeBatch);
		const result = await getCache<typeof largeBatch>("large_batch_test");
		expect(result).toHaveLength(50);
		expect(result![0].head_name).toBe("Chủ hộ số 0");
		expect(result![49].head_name).toBe("Chủ hộ số 49");
	});
});
