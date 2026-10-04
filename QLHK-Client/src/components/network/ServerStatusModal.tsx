import { Activity, AlertCircle, CheckCircle2, Server, X } from "lucide-react";
import type React from "react";
import { createPortal } from "react-dom";
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
	const modalRef = useFocusTrap<HTMLDivElement>({
		isActive: isOpen,
		onEscape: onClose,
	});

	if (!isOpen || typeof document === "undefined") return null;

	return createPortal(
		<div
			className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 dark:bg-black/60 select-none animate-in fade-in duration-150"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
		>
			<div
				ref={modalRef}
				className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
					<div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
						<Server className="w-5 h-5 text-slate-500" />
						<span>Trạng Thái Máy Chủ</span>
					</div>
					<button
						onClick={onClose}
						className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-6 space-y-6">
					<div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
						<div className="flex items-center gap-3">
							<div
								className={`w-10 h-10 rounded-full flex items-center justify-center ${isBackendHealthy ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400" : "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400"}`}
							>
								{isBackendHealthy ? (
									<CheckCircle2 className="w-5 h-5" />
								) : (
									<AlertCircle className="w-5 h-5" />
								)}
							</div>
							<div>
								<div className="font-bold text-sm text-slate-900 dark:text-slate-100">
									Kết Nối
								</div>
								<div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
									{isBackendHealthy ? "Hoạt động ổn định" : "Mất kết nối"}
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
									Độ Trễ (Ping)
								</div>
								<div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
									{latency !== null ? `${latency} ms` : "Đang đo..."}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
};
