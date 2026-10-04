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
	refreshVillages: () => Promise<void>;
	checkServerHealth: () => Promise<boolean>;

	// 1. Sidebar state
	isSidebarCollapsed: boolean;
	toggleSidebar: () => void;
	setSidebarCollapsed: (collapsed: boolean) => void;

	// 2. Theme state (Dark / Light mode)
	theme: "light" | "dark";
	toggleTheme: () => void;

	// 3. Zoom state
	zoomLevel: number;
	zoomIn: () => void;
	zoomOut: () => void;
	resetZoom: () => void;

	// 4. Calculation Year
	calculationYear: number;
	setCalculationYear: (year: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

let lastFetchedVillagesTime = 0;

let emaLatency: number | null = null;
const EMA_ALPHA = 0.3; // Hệ số làm mượt: 0.3 = phản ứng vừa phải, loại spike

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
	const [latency, setLatency] = useState<number | null>(null);
	const [isInitializing, setIsInitializing] = useState<boolean>(true);

	// 1. Sidebar Collapsed State
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
				// Ignore
			}
			return next;
		});
	};

	const setSidebarCollapsed = (collapsed: boolean) => {
		setIsSidebarCollapsed(collapsed);
		try {
			localStorage.setItem("qlhk_sidebar_collapsed", String(collapsed));
		} catch {
			// Ignore
		}
	};

	// 2. Theme State (Dark / Light)
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
			// Ignore
		}
	}, [theme]);

	const toggleTheme = () => {
		setTheme((prev) => (prev === "light" ? "dark" : "light"));
	};

	// 3. Zoom State (80% to 140%, step 10%)
	const [zoomLevel, setZoomLevel] = useState<number>(() => {
		try {
			const saved = localStorage.getItem("qlhk_zoom");
			const parsed = saved ? parseInt(saved, 10) : 100;
			return parsed >= 80 && parsed <= 140 ? parsed : 100;
		} catch {
			return 100;
		}
	});

	useEffect(() => {
		// Zoom qua IPC của Electron
		if (window.electronAPI?.setZoom) {
			window.electronAPI.setZoom(zoomLevel);
		} else if (window.api?.app?.setZoom) {
			window.api.app.setZoom(zoomLevel);
		}
		localStorage.setItem("qlhk_zoom", String(zoomLevel));
	}, [zoomLevel]);

	const zoomIn = () => {
		setZoomLevel((prev) => Math.min(140, prev + 10));
	};

	const zoomOut = () => {
		setZoomLevel((prev) => Math.max(80, prev - 10));
	};

	const resetZoom = () => {
		setZoomLevel(100);
	};

	// Keyboard Shortcuts for Zoom (Ctrl +, Ctrl -, Ctrl 0)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.ctrlKey || e.metaKey) {
				if (e.key === "=" || e.key === "+") {
					e.preventDefault();
					zoomIn();
				} else if (e.key === "-" || e.key === "_") {
					e.preventDefault();
					zoomOut();
				} else if (e.key === "0") {
					e.preventDefault();
					resetZoom();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	// 4. Calculation Year
	const [calculationYear, setCalculationYearState] = useState<number>(() => {
		try {
			const saved = localStorage.getItem("globalCalculationYear");
			if (saved) {
				const parsed = parseInt(saved, 10);
				if (!isNaN(parsed) && parsed >= 1900 && parsed <= 2100) return parsed;
			}
			const timeConfigRaw = localStorage.getItem("app_time_config");
			if (timeConfigRaw) {
				const config = JSON.parse(timeConfigRaw);
				const offset = config.offset || 0;
				const effectiveDate = new Date(Date.now() + offset);
				return effectiveDate.getFullYear();
			}
		} catch {
			// Ignore
		}
		return new Date().getFullYear();
	});

	const setCalculationYear = useCallback((year: number) => {
		setCalculationYearState(year);
		try {
			localStorage.setItem("globalCalculationYear", String(year));
		} catch {
			// Ignore
		}
	}, []);

	const logout = async () => {
		try {
			const refreshToken = await secureStorage.getItem("refreshToken");
			if (refreshToken) {
				await authApi.logout(refreshToken);
			}
		} catch {
			// Ignore
		} finally {
			setCachedAccessToken(null);
			await secureStorage.clear();
			setUser(null);
			setSelectedVillageId("");
		}
	};

	// 30 phút tự động đăng xuất nếu không có tương tác
	useInactivityTimeout(() => {
		logout();
	}, !!user);

	const refreshVillages = useCallback(async (force = false) => {
		if (
			!force &&
			Date.now() - lastFetchedVillagesTime < 30000 &&
			lastFetchedVillagesTime > 0
		) {
			return;
		}
		try {
			const res = await villageApi.getAll();
			if (Array.isArray(res) && res.length > 0) {
				setVillages(res);
				lastFetchedVillagesTime = Date.now();
				await setCache("villages", res);
				return;
			}
			const cached = await getCache<Village[]>("villages");
			if (cached && cached.length > 0) {
				setVillages(cached);
			} else {
				setVillages(VILLAGES);
			}
		} catch (err) {
			console.warn(
				"Lỗi tải danh mục thôn từ Backend, nạp từ Offline Cache:",
				err,
			);
			try {
				const cached = await getCache<Village[]>("villages");
				if (cached && cached.length > 0) {
					setVillages(cached);
				} else {
					setVillages(VILLAGES);
				}
			} catch {
				setVillages(VILLAGES);
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
						// Token hiện tại hết hạn hoặc không hợp lệ: Thử làm mới bằng refreshToken
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
								// Refresh không thành công
							}
						}
						// Không thể làm mới: Dọn dẹp session cũ để hiển thị màn hình đăng nhập
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
							// Ignore
						}
					}
					if (isMounted) setUser(null);
				} else {
					// Chưa đăng nhập -> Hiển thị form Đăng nhập
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
		// Warm-up: 2 ping liên tiếp để làm nóng TLS trước khi đo chính thức
		detectAndSetOptimalApiGateway().then(async () => {
			const apiBase = getActiveApiBaseUrl();
			try {
				await fetch(`${apiBase}/ping`, { method: "GET", cache: "no-store" });
				await fetch(`${apiBase}/ping`, { method: "GET", cache: "no-store" });
			} catch {
				/* ignore warm-up errors */
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
			refreshVillages();
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
				checkServerHealth,

				// 1. Sidebar
				isSidebarCollapsed,
				toggleSidebar,
				setSidebarCollapsed,

				// 2. Theme
				theme,
				toggleTheme,

				// 3. Zoom
				zoomLevel,
				zoomIn,
				zoomOut,
				resetZoom,

				// 4. Calculation Year
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
