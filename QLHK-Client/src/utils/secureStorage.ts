
export const secureStorage = {
	async getItem(key: string): Promise<string | null> {
		try {
			if (
				typeof window !== "undefined" &&
				window.electronAPI?.secureStore?.get
			) {
				const val = await window.electronAPI.secureStore.get(key);
				return val !== undefined && val !== null ? String(val) : null;
			}
			if (typeof window !== "undefined" && window.api?.store?.get) {
				const val = await window.api.store.get(key);
				return val !== undefined && val !== null ? String(val) : null;
			}
		} catch (err) {
			console.warn("Error reading from secure store:", err);
		}
		try {
			if (
				typeof localStorage !== "undefined" &&
				localStorage &&
				typeof localStorage.getItem === "function"
			) {
				return localStorage.getItem(key);
			}
		} catch (err) {
			console.warn("Error reading from localStorage:", err);
		}
		return null;
	},

	async setItem(key: string, value: string): Promise<void> {
		try {
			if (
				typeof window !== "undefined" &&
				window.electronAPI?.secureStore?.set
			) {
				await window.electronAPI.secureStore.set(key, value);
				if (
					typeof localStorage !== "undefined" &&
					localStorage &&
					typeof localStorage.removeItem === "function"
				) {
					localStorage.removeItem(key);
				}
				return;
			}
			if (typeof window !== "undefined" && window.api?.store?.set) {
				await window.api.store.set(key, value);
				if (
					typeof localStorage !== "undefined" &&
					localStorage &&
					typeof localStorage.removeItem === "function"
				) {
					localStorage.removeItem(key);
				}
				return;
			}
		} catch (err) {
			console.warn("Error writing to secure store:", err);
		}
		try {
			if (
				typeof localStorage !== "undefined" &&
				localStorage &&
				typeof localStorage.setItem === "function"
			) {
				localStorage.setItem(key, value);
			}
		} catch (err) {
			console.warn("Error writing to localStorage:", err);
		}
	},

	async removeItem(key: string): Promise<void> {
		try {
			if (
				typeof window !== "undefined" &&
				window.electronAPI?.secureStore?.delete
			) {
				await window.electronAPI.secureStore.delete(key);
			} else if (typeof window !== "undefined" && window.api?.store?.delete) {
				await window.api.store.delete(key);
			}
		} catch (err) {
			console.warn("Error deleting from secure store:", err);
		}
		try {
			if (
				typeof localStorage !== "undefined" &&
				localStorage &&
				typeof localStorage.removeItem === "function"
			) {
				localStorage.removeItem(key);
			}
		} catch (err) {
			console.warn("Error removing from localStorage:", err);
		}
	},

	async clear(): Promise<void> {
		try {
			if (
				typeof window !== "undefined" &&
				window.electronAPI?.secureStore?.clear
			) {
				await window.electronAPI.secureStore.clear();
			} else if (typeof window !== "undefined" && window.api?.store?.clear) {
				await window.api.store.clear();
			}
		} catch (err) {
			console.warn("Error clearing secure store:", err);
		}
		try {
			if (
				typeof localStorage !== "undefined" &&
				localStorage &&
				typeof localStorage.removeItem === "function"
			) {
				const keysToRemove = new Set<string>([
					"accessToken",
					"refreshToken",
					"user",
					"qlhk_session_user",
					"qlhk_cached_users",
				]);
				if (typeof localStorage.length === "number" && typeof localStorage.key === "function") {
					for (let i = 0; i < localStorage.length; i++) {
						const k = localStorage.key(i);
						if (k && k.startsWith("qlhk_")) {
							keysToRemove.add(k);
						}
					}
				}
				for (const k of keysToRemove) {
					localStorage.removeItem(k);
				}
			}
		} catch (err) {
			console.warn("Error clearing localStorage:", err);
		}
	},
};
