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
		let timerId: ReturnType<typeof setTimeout> | undefined;

		const handleReconnected = () => {
			setIsReconnected(true);
			if (timerId) clearTimeout(timerId);
			timerId = setTimeout(() => setIsReconnected(false), 3500);
		};

		window.addEventListener("server:reconnected", handleReconnected);
		return () => {
			if (timerId) clearTimeout(timerId);
			window.removeEventListener("server:reconnected", handleReconnected);
		};
	}, []);

	const handleRetry = async () => {
		setIsRetrying(true);
		await checkServerHealth();
		setIsRetrying(false);
	};

	return (
		<div className="flex flex-col h-screen h-[100dvh] w-full min-h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-150">
			<Header />
			<ConnectionBanner
				isOffline={isDisconnected}
				isReconnected={isReconnected}
				onRetry={handleRetry}
				isRetrying={isRetrying}
			/>
			<div className="flex flex-1 overflow-hidden relative">
				<Sidebar />
				<main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-900/30">
					<div className="w-full max-w-none space-y-6">{children}</div>
				</main>
			</div>
		</div>
	);
};
