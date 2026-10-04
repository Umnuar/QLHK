/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

interface ElectronFileResult {
	filePath: string;
	fileName: string;
	data?: string;
	error?: string;
}

interface ElectronAPI {
	secureStore: {
		get: (key: string) => Promise<any>;
		set: (key: string, value: any) => Promise<boolean>;
		delete: (key: string) => Promise<boolean>;
		clear: () => Promise<boolean>;
	};
	openFileDialog: (
		filters?: { name: string; extensions: string[] }[],
	) => Promise<ElectronFileResult | null>;
	setZoom: (level: number) => Promise<void>;
	getAppVersion: () => Promise<string>;
}

interface Window {
	electronAPI?: ElectronAPI;
	api?: {
		store: ElectronAPI["secureStore"];
		dialog: {
			openFile: ElectronAPI["openFileDialog"];
		};
		app: {
			getVersion: () => Promise<string>;
			setZoom: (level: number) => Promise<void>;
		};
	};
}
