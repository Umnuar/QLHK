import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { Store } from "@tauri-apps/plugin-store";

let tauriStorePromise: Promise<Store> | null = null;

function getTauriStore(): Promise<Store> {
	if (!tauriStorePromise) {
		tauriStorePromise = Store.load("qlhk-secure-tokens.bin");
	}
	return tauriStorePromise;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
	let binary = "";
	const len = bytes.byteLength;
	const chunkSize = 8192;
	for (let i = 0; i < len; i += chunkSize) {
		const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
		binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
	}
	return btoa(binary);
}

export function initTauriBridge(): void {
	if (!isTauri()) {
		return;
	}

	const bridge: ElectronAPI = {
		secureStore: {
			get: async (key: string) => {
				try {
					const store = await getTauriStore();
					const val = await store.get(key);
					return val !== undefined && val !== null ? val : null;
				} catch (err) {
					console.warn("[TauriStore] get error:", err);
					return null;
				}
			},
			set: async (key: string, value: any) => {
				try {
					const store = await getTauriStore();
					await store.set(key, value);
					await store.save();
					return true;
				} catch (err) {
					console.warn("[TauriStore] set error:", err);
					return false;
				}
			},
			delete: async (key: string) => {
				try {
					const store = await getTauriStore();
					await store.delete(key);
					await store.save();
					return true;
				} catch (err) {
					console.warn("[TauriStore] delete error:", err);
					return false;
				}
			},
			clear: async () => {
				try {
					const store = await getTauriStore();
					await store.clear();
					await store.save();
					return true;
				} catch (err) {
					console.warn("[TauriStore] clear error:", err);
					return false;
				}
			},
		},
		openFileDialog: async (filters) => {
			try {
				const selected = await open({
					multiple: false,
					filters: filters || [
						{ name: "File Excel (*.xlsx, *.xls)", extensions: ["xlsx", "xls"] },
						{ name: "Tất cả các file", extensions: ["*"] },
					],
				});
				if (!selected || typeof selected !== "string") {
					return null;
				}
				const fileBytes = await readFile(selected);
				const base64Data = uint8ArrayToBase64(fileBytes);
				const fileName = selected.split(/[/\\]/).pop() || "";
				return {
					filePath: selected,
					fileName,
					data: base64Data,
				};
			} catch (err: any) {
				console.error("[TauriDialog] open error:", err);
				return {
					filePath: "",
					fileName: "",
					error: err?.message || String(err),
				};
			}
		},
		setZoom: async (level: number) => {
			try {
				// CSS zoom trong WebView2
				document.documentElement.style.zoom = `${level}%`;
				// WebviewWindow zoom trong Tauri
				const win = getCurrentWebviewWindow();
				if (win && typeof win.setZoom === "function") {
					await win.setZoom(level / 100);
				}
			} catch (err) {
				console.warn("[TauriZoom] setZoom error:", err);
			}
		},
		getAppVersion: async () => {
			try {
				return await getVersion();
			} catch {
				return "1.0.0";
			}
		},
	};

	window.electronAPI = bridge;
	window.api = {
		store: bridge.secureStore,
		dialog: {
			openFile: bridge.openFileDialog,
		},
		app: {
			getVersion: bridge.getAppVersion,
			setZoom: bridge.setZoom,
		},
	};
}
