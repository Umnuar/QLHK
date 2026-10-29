import {
	Activity,
	AlertCircle,
	CheckCircle2,
	Cpu,
	RefreshCw,
	Server,
	X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
	BACKEND_PORT_METADATA,
	getActiveApiBaseUrl,
	getActiveBackendPort,
} from "../../api/client";
import { useNetwork } from "../../context/NetworkContext";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface ServerStatusModalProps {
	isOpen: boolean;
	onClose: () => void;
	latency: number | null;
	isBackendHealthy: boolean;
}

export const ServerStatusModal: React.FC<ServerStatusModalProps> = ({
	isOpen,
	onClose,
	latency,
	isBackendHealthy,
}) => {
	const { checkServerHealth } = useNetwork();
	const [isChecking, setIsChecking] = useState(false);

	const modalRef = useFocusTrap<HTMLDivElement>({
		isActive: isOpen,
		onEscape: onClose,
	});

	if (!isOpen || typeof document === "undefined") return null;

	const activePort = getActiveBackendPort();
	const activeMeta = BACKEND_PORT_METADATA[activePort] || {
		name: "Máy chủ QLHK",
		engine: "Tự động cấu hình",
		url: getActiveApiBaseUrl(),
		port: activePort,
	};

	const handleRefreshHealth = async () => {
		setIsChecking(true);
		try {
			await checkServerHealth();
		} finally {
			setIsChecking(false);
		}
	};

	const getLatencyBadge = () => {
		if (latency === null) {
			return {
				text: "Đang đo...",
				className:
					"bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
			};
		}
		if (latency < 150) {
			return {
				text: `${latency} ms — Phản hồi rất nhanh`,
				className:
					"bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800",
			};
		}
		if (latency < 500) {
			return {
				text: `${latency} ms — Ổn định`,
				className:
					"bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-300 dark:border-blue-800",
			};
		}
		return {
			text: `${latency} ms — Chậm / Chập chờn`,
			className:
				"bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800",
		};
	};

	const latencyBadge = getLatencyBadge();

	return createPortal(
		<div
			className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 dark:bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-150"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="server-status-title"
		>
			<div
				ref={modalRef}
				className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
					<div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
						<Server className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
						<span id="server-status-title">Trạng Thái Kết Nối Máy Chủ</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Đóng cửa sổ"
						className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-6 space-y-4">
					<div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
						<div className="flex items-center gap-3">
							<div
								className={`w-10 h-10 rounded-full flex items-center justify-center ${
									isBackendHealthy
										? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
										: "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400"
								}`}
							>
								{isBackendHealthy ? (
									<CheckCircle2 className="w-5 h-5" />
								) : (
									<AlertCircle className="w-5 h-5" />
								)}
							</div>
							<div>
								<div className="font-bold text-sm text-slate-900 dark:text-slate-100">
									Tình Trạng Dịch Vụ
								</div>
								<div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
									{isBackendHealthy
										? "Máy chủ đang hoạt động bình thường"
										: "Mất kết nối máy chủ (Chế độ Offline)"}
								</div>
							</div>
						</div>
					</div>

					<div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
								<Activity className="w-5 h-5" />
							</div>
							<div>
								<div className="font-bold text-sm text-slate-900 dark:text-slate-100">
									Độ Trễ Phản Hồi (Ping)
								</div>
								<div className="mt-1">
									<span
										className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${latencyBadge.className}`}
									>
										{latencyBadge.text}
									</span>
								</div>
							</div>
						</div>
					</div>

					<div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
								<Cpu className="w-5 h-5" />
							</div>
							<div>
								<div className="font-bold text-sm text-slate-900 dark:text-slate-100">
									{activeMeta.name}
								</div>
								<div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
									{activeMeta.engine} — Cổng {activeMeta.port}
								</div>
							</div>
						</div>
					</div>

					<div className="pt-2 flex gap-3">
						<button
							type="button"
							onClick={handleRefreshHealth}
							disabled={isChecking}
							className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
						>
							<RefreshCw
								className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`}
							/>
							<span>
								{isChecking ? "Đang kiểm tra..." : "Kiểm tra kết nối lại"}
							</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="px-5 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all text-xs cursor-pointer"
						>
							Đóng
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
};
