import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { getActiveApiBaseUrl } from "../api/client";

export interface NetworkContextType {
	isOnline: boolean;
	isBackendHealthy: boolean;
	latency: number | null;
	checkServerHealth: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

let emaLatency: number | null = null;
const EMA_ALPHA = 0.3;

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [isOnline, setIsOnline] = useState<boolean>(
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);
	const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);
	const [latency, setLatency] = useState<number | null>(null);

	const checkServerHealth = useCallback(async (): Promise<boolean> => {
		const t0 = performance.now();
		try {
			const apiBase = getActiveApiBaseUrl();
			const res = await fetch(`${apiBase}/ping`, {
				method: "GET",
				cache: "no-store",
			});
			const rawLat = Math.round(performance.now() - t0);

			if (res.ok || res.status === 204) {
				if (emaLatency === null) {
					emaLatency = rawLat;
				} else {
					emaLatency = Math.round(
						EMA_ALPHA * rawLat + (1 - EMA_ALPHA) * emaLatency,
					);
				}
				setLatency(emaLatency);
				setIsBackendHealthy(true);
				return true;
			}
			setIsBackendHealthy(false);
			setLatency(null);
			emaLatency = null;
			return false;
		} catch {
			setIsBackendHealthy(false);
			setLatency(null);
			emaLatency = null;
			return false;
		}
	}, []);

	useEffect(() => {
		const handleOnline = () => {
			setIsOnline(true);
			checkServerHealth();
		};
		const handleOffline = () => {
			setIsOnline(false);
			setLatency(null);
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		const interval = setInterval(() => {
			if (typeof navigator !== "undefined" && navigator.onLine) {
				checkServerHealth();
			}
		}, 3000);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
			clearInterval(interval);
		};
	}, [checkServerHealth]);

	return (
		<NetworkContext.Provider
			value={{
				isOnline,
				isBackendHealthy,
				latency,
				checkServerHealth,
			}}
		>
			{children}
		</NetworkContext.Provider>
	);
};

export const useNetwork = (): NetworkContextType => {
	const context = useContext(NetworkContext);
	if (!context) {
		return {
			isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
			isBackendHealthy: true,
			latency: null,
			checkServerHealth: async () => true,
		};
	}
	return context;
};
