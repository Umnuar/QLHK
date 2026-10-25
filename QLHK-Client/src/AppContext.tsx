import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { authApi } from "./api/authApi";
import {
	detectAndSetOptimalApiGateway,
	getActiveApiBaseUrl,
	setCachedAccessToken,
} from "./api/client";
import { villageApi } from "./api/villageApi";
import { VILLAGES } from "./data/constants";
import { getCache, setCache } from "./db/indexedDB";
import { useInactivityTimeout } from "./hooks/useInactivityTimeout";
import type { User, Village } from "./types";
import { secureStorage } from "./utils/secureStorage";

interface AppContextType {
	user: User | null;
	setUser: (user: User | null) => void;
	activeTab: string;
	setActiveTab: (tab: string) => void;
	selectedVillageId: string;
	setSelectedVillageId: (id: string) => void;
	selectedVillageName: string;
	villages: Village[];
	setVillages: React.Dispatch<React.SetStateAction<Village[]>>;
	isOnline: boolean;
	isBackendHealthy: boolean;
	latency: number | null;
	isInitializing: boolean;
	logout: () => Promise<void>;
	refreshVillages: (force?: boolean) => Promise<void>;
	removeVillage: (idOrName: string) => Promise<void>;
	checkServerHealth: () => Promise<boolean>;

	isSidebarCollapsed: boolean;
	toggleSidebar: () => void;
	setSidebarCollapsed: (collapsed: boolean) => void;

	theme: "light" | "dark";
	isDarkMode: boolean;
	toggleTheme: () => void;

	zoomLevel: number;
	zoomIn: () => void;
	zoomOut: () => void;
	resetZoom: () => void;

	calculationYear: number;
	setCalculationYear: (year: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

let lastFetchedVillagesTime = 0;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [user, setUser] = useState<User | null>(null);
	const userRef = useRef<User | null>(user);
	userRef.current = user;

	const [activeTab, setActiveTab] = useState<string>("households");
	const [selectedVillageId, setSelectedVillageIdState] = useState<string>("");

	const setSelectedVillageId = useCallback((id: string) => {
		const currentUser = userRef.current;
		if (currentUser?.role === "user" && currentUser.village_id) {
			setSelectedVillageIdState(currentUser.village_id);
		} else {
			setSelectedVillageIdState(id);
		}
	}, []);

	useEffect(() => {
		if (user?.role === "user" && user.village_id) {
			setSelectedVillageIdState(user.village_id);
		}
	}, [user]);
	const [villages, setVillages] = useState<Village[]>(VILLAGES);
	const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
	const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);
	const [latency] = useState<number | null>(null);
	const [isInitializing, setIsInitializing] = useState<boolean>(true);

	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
		try {
			if (typeof window !== "undefined" && window.innerWidth < 768) {
				return true;
			}
			return localStorage.getItem("qlhk_sidebar_collapsed") === "true";
		} catch {
			return false;
		}
	});

	useEffect(() => {
		const handleResize = () => {
			if (typeof window !== "undefined" && window.innerWidth < 768) {
				setIsSidebarCollapsed(true);
			}
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const toggleSidebar = () => {
		setIsSidebarCollapsed((prev) => {
			const next = !prev;
			try {
				localStorage.setItem("qlhk_sidebar_collapsed", String(next));
			} catch {
			}
			return next;
		});
	};

	const setSidebarCollapsed = (collapsed: boolean) => {
		setIsSidebarCollapsed(collapsed);
		try {
			localStorage.setItem("qlhk_sidebar_collapsed", String(collapsed));
		} catch {
		}
	};

	const [theme, setTheme] = useState<"light" | "dark">(() => {
		try {
			const saved = localStorage.getItem("qlhk_theme");
			if (saved === "dark" || saved === "light") return saved;
			return window.matchMedia?.("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light";
		} catch {
			return "light";
		}
	});

	useEffect(() => {
		const root = document.documentElement;
		if (theme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
		try {
			localStorage.setItem("qlhk_theme", theme);
		} catch {
		}
	}, [theme]);

	const toggleTheme = () => {
		setTheme((prev) => (prev === "light" ? "dark" : "light"));
	};

	const [zoomLevel, setZoomLevel] = useState<number>(() => {
		try {
			const saved = localStorage.getItem("qlhk_zoom");
			const parsed = saved ? parseInt(saved, 10) : 100;
			return parsed >= 50 && parsed <= 150 ? parsed : 100;
		} catch {
			return 100;
		}
	});

	useEffect(() => {
		const factor = Math.min(1.5, Math.max(0.5, zoomLevel / 100));
		document.documentElement.style.setProperty("--app-zoom", String(factor));
		if (window.electronAPI?.setZoom) {
			window.electronAPI.setZoom(zoomLevel);
		} else if (window.api?.app?.setZoom) {
			window.api.app.setZoom(zoomLevel);
		} else {
			document.documentElement.style.setProperty("--app-zoom", String(factor));
		}
		try {
			localStorage.setItem("qlhk_zoom", String(zoomLevel));
		} catch (err) {
			console.warn("Cannot save zoom to localStorage", err);
		}
	}, [zoomLevel]);

	const zoomIn = () => {
		setZoomLevel((prev) => Math.min(150, prev + 10));
	};

	const zoomOut = () => {
		setZoomLevel((prev) => Math.max(50, prev - 10));
	};

	const resetZoom = () => {
		setZoomLevel(100);
	};

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.ctrlKey || e.metaKey) {
				if (e.key === "=" || e.key === "+" || e.code === "NumpadAdd") {
					e.preventDefault();
					zoomIn();
				} else if (e.key === "-" || e.key === "_" || e.code === "NumpadSubtract") {
					e.preventDefault();
					zoomOut();
				} else if (e.key === "0" || e.code === "Numpad0") {
					e.preventDefault();
					resetZoom();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const [calculationYear, setCalculationYearState] = useState<number>(() => {
		try {
			const saved = localStorage.getItem("globalCalculationYear");
			if (saved) {
				const parsed = parseInt(saved, 10);
				if (!isNaN(parsed) && parsed >= 1900 && parsed <= 2100) return parsed;
			}
		} catch {
		}
		return new Date().getFullYear();
	});

	const setCalculationYear = useCallback((year: number) => {
		setCalculationYearState(year);
		try {
			localStorage.setItem("globalCalculationYear", String(year));
		} catch {
		}
	}, []);

	const logout = async () => {
		try {
			const refreshToken = await secureStorage.getItem("refreshToken");
			if (refreshToken) {
				await authApi.logout(refreshToken);
			}
		} catch {
		} finally {
			setCachedAccessToken(null);
			await secureStorage.clear();
			setUser(null);
			setSelectedVillageId("");
		}
	};

	useInactivityTimeout(() => {
		logout();
	}, !!user);

	const refreshVillages = useCallback(async (force = false) => {
		if (
			!force &&
			Date.now() - lastFetchedVillagesTime < 5000 &&
			lastFetchedVillagesTime > 0
		) {
			return;
		}
		try {
			const res = await villageApi.getAll();
			if (Array.isArray(res)) {
				setVillages(res);
				lastFetchedVillagesTime = Date.now();
				await setCache("villages", res);
				return;
			}
			const cached = await getCache<Village[]>("villages");
			if (cached && Array.isArray(cached)) {
				setVillages(cached);
			} else {
				setVillages([]);
			}
		} catch (err) {
			console.warn(
				"Lỗi tải danh mục thôn từ Backend, nạp từ Offline Cache:",
				err,
			);
			try {
				const cached = await getCache<Village[]>("villages");
				if (cached && Array.isArray(cached)) {
					setVillages(cached);
				} else {
					setVillages([]);
				}
			} catch {
				setVillages([]);
			}
		} finally {
			const currentUser = userRef.current;
			setSelectedVillageIdState((prev) =>
				!prev && currentUser?.role === "user" && currentUser.village_id
					? currentUser.village_id
					: prev,
			);
		}
	}, []);

	const removeVillage = useCallback(async (idOrName: string) => {
		setVillages((prev) => {
			const updated = prev.filter(
				(v) => v.id !== idOrName && v.name !== idOrName,
			);
			setCache("villages", updated).catch(() => {});
			return updated;
		});
		lastFetchedVillagesTime = 0;
	}, []);

	const checkServerHealth = useCallback(async (): Promise<boolean> => {
		try {
			const apiBase = getActiveApiBaseUrl();
			const res = await fetch(`${apiBase}/ping`, {
				method: "GET",
				cache: "no-store",
			});

			if (res.ok || res.status === 204) {
				if (!isBackendHealthy) {
					window.dispatchEvent(new CustomEvent("server:reconnected"));
				}
				setIsBackendHealthy(true);
				return true;
			}
			setIsBackendHealthy(false);
			return false;
		} catch {
			setIsBackendHealthy(false);
			return false;
		}
	}, [isBackendHealthy]);

	useEffect(() => {
		let isMounted = true;
		const initAuth = async () => {
			try {
				const token = await secureStorage.getItem("accessToken");
				const isOfflineToken = !token || token.startsWith("offline-token-");

				if (token && !isOfflineToken) {
					setCachedAccessToken(token);
					try {
						const u = await authApi.getMe(token);
						if (!isMounted) return;
						setUser(u);
						await secureStorage.setItem("user", JSON.stringify(u));
						if (u.village_id) {
							setSelectedVillageIdState(u.village_id);
							setActiveTab("households");
						} else if (u.role === "admin") {
							setActiveTab("villages");
						}
					} catch {
						const refreshToken = await secureStorage.getItem("refreshToken");
						if (refreshToken && !refreshToken.startsWith("offline-refresh-")) {
							try {
								const refreshed = await authApi.refreshToken(refreshToken);
								if (refreshed?.accessToken) {
									await secureStorage.setItem(
										"accessToken",
										refreshed.accessToken,
									);
									setCachedAccessToken(refreshed.accessToken);
									if (refreshed.refreshToken) {
										await secureStorage.setItem(
											"refreshToken",
											refreshed.refreshToken,
										);
									}
									const u = await authApi.getMe(refreshed.accessToken);
									if (!isMounted) return;
									setUser(u);
									await secureStorage.setItem("user", JSON.stringify(u));
									if (u.village_id) {
										setSelectedVillageIdState(u.village_id);
										setActiveTab("households");
									} else if (u.role === "admin") {
										setActiveTab("villages");
									}
									return;
								}
							} catch {
							}
						}
						if (!isMounted) return;
						setCachedAccessToken(null);
						await secureStorage.removeItem("accessToken");
						await secureStorage.removeItem("refreshToken");
						await secureStorage.removeItem("user");
						setUser(null);
					}
				} else if (token && isOfflineToken) {
					const cachedUserStr = await secureStorage.getItem("user");
					if (cachedUserStr) {
						try {
							const u = JSON.parse(cachedUserStr);
							if (!isMounted) return;
							setUser(u);
							if (u.village_id) {
								setSelectedVillageIdState(u.village_id);
								setActiveTab("households");
							} else if (u.role === "admin") {
								setActiveTab("villages");
							}
							return;
						} catch {
						}
					}
					if (isMounted) setUser(null);
				} else {
					if (isMounted) setUser(null);
				}
			} catch (e) {
				console.error("Init auth error:", e);
				if (isMounted) setUser(null);
			} finally {
				if (isMounted) setIsInitializing(false);
			}
		};

		initAuth();
		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		detectAndSetOptimalApiGateway().then(async () => {
			const apiBase = getActiveApiBaseUrl();
			try {
				await fetch(`${apiBase}/ping`, { method: "GET", cache: "no-store" });
				await fetch(`${apiBase}/ping`, { method: "GET", cache: "no-store" });
			} catch {
			}
			checkServerHealth();
		});

		const handleOnline = () => {
			setIsOnline(true);
			window.dispatchEvent(new CustomEvent("server:reconnected"));
			checkServerHealth();
		};
		const handleOffline = () => {
			setIsOnline(false);
		};
		const handleAuthExpired = () => logout();
		const handleReconnected = async () => {
			refreshVillages();
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		window.addEventListener("auth:expired", handleAuthExpired);
		window.addEventListener("server:reconnected", handleReconnected);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
			window.removeEventListener("auth:expired", handleAuthExpired);
			window.removeEventListener("server:reconnected", handleReconnected);
		};
	}, [checkServerHealth, refreshVillages]);

	useEffect(() => {
		if (user?.id) {
			refreshVillages(true);
		}
	}, [user?.id, refreshVillages]);

	const selectedVillage = villages.find((v) => v.id === selectedVillageId);
	const selectedVillageName = selectedVillage
		? selectedVillage.name
		: user?.role === "admin"
			? "Toàn xã Đăk Hà"
			: "";

	return (
		<AppContext.Provider
			value={{
				user,
				setUser,
				activeTab,
				setActiveTab,
				selectedVillageId,
				setSelectedVillageId,
				selectedVillageName,
				villages,
				setVillages,
				isOnline,
				isBackendHealthy,
				latency,
				isInitializing,
				logout,
				refreshVillages,
				removeVillage,
				checkServerHealth,

				isSidebarCollapsed,
				toggleSidebar,
				setSidebarCollapsed,

				theme,
				isDarkMode: theme === "dark",
				toggleTheme,

				zoomLevel,
				zoomIn,
				zoomOut,
				resetZoom,

				calculationYear,
				setCalculationYear,
			}}
		>
			{children}
		</AppContext.Provider>
	);
};

export const useApp = () => {
	const context = useContext(AppContext);
	if (!context) {
		throw new Error("useApp must be used within an AppProvider");
	}
	return context;
};

export const useAppContext = useApp;
