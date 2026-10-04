/**
 * Bộ nhớ đệm ngoại tuyến (Offline Cache) cho QLHK-Client
 * Sử dụng Native IndexedDB bất đồng bộ chuẩn HTML5, phá vỡ giới hạn 5MB của localStorage.
 * Hỗ trợ lưu trữ tập dữ liệu lớn 23.000+ nhân khẩu (~30MB) mà không chặn UI thread.
 */

export interface CacheItem<T = any> {
	key: string;
	data: T;
	updatedAt: number;
}

const DB_NAME = "qlhk_offline_db";
const STORE_NAME = "offline_cache";
const DB_VERSION = 1;
const CACHE_PREFIX = "qlhk_cache_";

function getIDBFactory(): IDBFactory | null {
	try {
		if (typeof window !== "undefined" && window.indexedDB) {
			return window.indexedDB;
		}
		if (typeof globalThis !== "undefined" && (globalThis as any).indexedDB) {
			return (globalThis as any).indexedDB;
		}
	} catch {
		// Access denied
	}
	return null;
}

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

export function resetDBConnection(): void {
	if (dbInstance) {
		try {
			dbInstance.close();
		} catch {
			// ignore
		}
		dbInstance = null;
	}
	dbPromise = null;
}

function openDatabase(): Promise<IDBDatabase> {
	if (dbInstance) {
		return Promise.resolve(dbInstance);
	}
	if (dbPromise) {
		return dbPromise;
	}

	dbPromise = new Promise((resolve, reject) => {
		const factory = getIDBFactory();
		if (!factory) {
			return reject(new Error("Native IndexedDB is not supported"));
		}

		const request = factory.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "key" });
			}
		};

		request.onsuccess = (event) => {
			dbInstance = (event.target as IDBOpenDBRequest).result;
			dbInstance.onversionchange = () => {
				resetDBConnection();
			};
			resolve(dbInstance);
		};

		request.onerror = (event) => {
			const error = (event.target as IDBOpenDBRequest).error;
			dbPromise = null;
			reject(error);
		};
	});

	return dbPromise;
}

// Fallback Memory Store (khi IndexedDB bị chặn hoặc trong môi trường test không có IDB)
const memoryFallback = new Map<string, CacheItem>();

function getLocalStorage(): Storage | null {
	try {
		if (typeof window !== "undefined" && window.localStorage) {
			return window.localStorage;
		}
		if (typeof localStorage !== "undefined") {
			return localStorage;
		}
	} catch {
		// Restricted
	}
	return null;
}

/**
 * Lưu dữ liệu vào cache kèm thời gian cập nhật
 */
export async function setCache(key: string, data: any): Promise<void> {
	const item: CacheItem = {
		key,
		data,
		updatedAt: Date.now(),
	};

	try {
		const db = await openDatabase();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readwrite");
			const store = tx.objectStore(STORE_NAME);
			const req = store.put(item);

			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
			tx.onerror = () => reject(tx.error);
		});
	} catch {
		// Fallback sang memory & localStorage
		memoryFallback.set(key, item);
		const ls = getLocalStorage();
		if (ls) {
			try {
				ls.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(item));
			} catch {
				// Quota exceeded in localStorage, memory store retains it
			}
		}
	}
}

/**
 * Lấy dữ liệu từ cache theo key
 */
export async function getCache<T = any>(key: string): Promise<T | null> {
	try {
		const db = await openDatabase();
		return await new Promise<T | null>((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readonly");
			const store = tx.objectStore(STORE_NAME);
			const req = store.get(key);

			req.onsuccess = () => {
				const result = req.result as CacheItem<T> | undefined;
				resolve(result ? result.data : null);
			};
			req.onerror = () => reject(req.error);
		});
	} catch {
		// Fallback
		const inMem = memoryFallback.get(key);
		if (inMem) return inMem.data as T;

		const ls = getLocalStorage();
		if (ls) {
			const raw = ls.getItem(`${CACHE_PREFIX}${key}`);
			if (raw) {
				try {
					const parsed = JSON.parse(raw) as CacheItem<T>;
					return parsed.data;
				} catch {
					return null;
				}
			}
		}
		return null;
	}
}

/**
 * Lấy thông tin metadata của cache (thời gian cập nhật)
 */
export async function getCacheMeta(
	key: string,
): Promise<{ updatedAt: number } | null> {
	try {
		const db = await openDatabase();
		return await new Promise<{ updatedAt: number } | null>((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readonly");
			const store = tx.objectStore(STORE_NAME);
			const req = store.get(key);

			req.onsuccess = () => {
				const result = req.result as CacheItem | undefined;
				resolve(result ? { updatedAt: result.updatedAt } : null);
			};
			req.onerror = () => reject(req.error);
		});
	} catch {
		const inMem = memoryFallback.get(key);
		if (inMem) return { updatedAt: inMem.updatedAt };

		const ls = getLocalStorage();
		if (ls) {
			const raw = ls.getItem(`${CACHE_PREFIX}${key}`);
			if (raw) {
				try {
					const parsed = JSON.parse(raw) as CacheItem;
					return { updatedAt: parsed.updatedAt };
				} catch {
					return null;
				}
			}
		}
		return null;
	}
}

/**
 * Xóa một mục cache cụ thể
 */
export async function removeCache(key: string): Promise<void> {
	try {
		const db = await openDatabase();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readwrite");
			const store = tx.objectStore(STORE_NAME);
			const req = store.delete(key);

			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	} catch {
		memoryFallback.delete(key);
		const ls = getLocalStorage();
		if (ls) {
			ls.removeItem(`${CACHE_PREFIX}${key}`);
		}
	}
}

/**
 * Xóa toàn bộ dữ liệu offline cache của QLHK
 */
export async function clearCache(): Promise<void> {
	try {
		const db = await openDatabase();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readwrite");
			const store = tx.objectStore(STORE_NAME);
			const req = store.clear();

			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	} catch {
		memoryFallback.clear();
		const ls = getLocalStorage();
		if (ls) {
			const keysToRemove: string[] = [];
			for (let i = 0; i < ls.length; i++) {
				const k = ls.key(i);
				if (k && k.startsWith(CACHE_PREFIX)) {
					keysToRemove.push(k);
				}
			}
			keysToRemove.forEach((k) => ls.removeItem(k));
		}
	}
}
