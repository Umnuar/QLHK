import type React from "react";
import { useEffect, useState } from "react";
import { useNetwork } from "../../context/NetworkContext";
import { ConnectionBanner } from "../network/ConnectionBanner";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { isOnline, isBackendHealthy, checkServerHealth } = useNetwork();
	const [isRetrying, setIsRetrying] = useState(false);
	const [isReconnected, setIsReconnected] = useState(false);

	const isDisconnected = !isOnline || !isBackendHealthy;

	useEffect(() => {
		const handleReconnected = () => {
			setIsReconnected(true);
			const t = setTimeout(() => setIsReconnected(false), 3500);
			return () => clearTimeout(t);
		};

		window.addEventListener("server:reconnected", handleReconnected);
		return () =>
			window.removeEventListener("server:reconnected", handleReconnected);
	}, []);

	const handleRetry = async () => {
		setIsRetrying(true);
		await checkServerHealth();
		setIsRetrying(false);
	};

	return (
		<div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-150">
			<Header />
			<ConnectionBanner
				isOffline={isDisconnected}
				isReconnected={isReconnected}
				onRetry={handleRetry}
				isRetrying={isRetrying}
			/>
			<div className="flex flex-1 overflow-hidden">
				<Sidebar />
				<main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-900/30">
					<div className="w-full max-w-none space-y-6">{children}</div>
				</main>
			</div>
		</div>
	);
};
