import {
	Activity,
	CheckCircle2,
	RefreshCw,
	WifiOff,
} from "lucide-react";
import type React from "react";
import { useNetwork } from "../../context/NetworkContext";

export interface ConnectionBannerProps {
	isOffline: boolean;
	isReconnected: boolean;
	onRetry: () => void;
	isRetrying: boolean;
	isUnstable?: boolean;
	latency?: number | null;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
	isOffline,
	isReconnected,
	onRetry,
	isRetrying,
	isUnstable,
	latency: propLatency,
}) => {
	const network = useNetwork();
	const activeLatency = propLatency !== undefined ? propLatency : network.latency;
	const isConnectionUnstable =
		isUnstable !== undefined
			? isUnstable
			: !isOffline && !isReconnected && activeLatency !== null && activeLatency >= 800;

	if (isReconnected) {
		return (
			<div
				role="status"
				aria-live="polite"
				className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-xs animate-in fade-in slide-in-from-top duration-300 select-none"
			>
				<CheckCircle2 className="w-4 h-4 shrink-0" />
				<span>
					Đã khôi phục kết nối thành công — Dữ liệu đã được đồng bộ tự động thời gian thực!
				</span>
			</div>
		);
	}

	if (isOffline) {
		const isClientOffline = typeof navigator !== "undefined" && !navigator.onLine;

		return (
			<div
				role="alert"
				aria-live="assertive"
				className="bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top duration-300 select-none"
			>
				<div className="flex items-center gap-2">
					<WifiOff className="w-4 h-4 shrink-0 text-amber-200 animate-pulse" />
					<span>
						<strong>
							{isClientOffline
								? "Mất kết nối Internet — Đang hoạt động ở chế độ ngoại tuyến (Offline)"
								: "Mất kết nối tới máy chủ — Đang hoạt động ở chế độ ngoại tuyến (Offline)"}
						</strong>
					</span>
				</div>
				<button
					type="button"
					onClick={onRetry}
					disabled={isRetrying}
					aria-label="Thử kết nối lại máy chủ"
					className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-bold rounded-lg text-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
				>
					<RefreshCw
						className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`}
					/>
					<span>{isRetrying ? "Đang thử lại..." : "Thử kết nối ngay"}</span>
				</button>
			</div>
		);
	}

	if (isConnectionUnstable) {
		return (
			<div
				role="status"
				aria-live="polite"
				className="bg-amber-600 dark:bg-amber-700 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top duration-300 select-none"
			>
				<div className="flex items-center gap-2">
					<Activity className="w-4 h-4 shrink-0 text-amber-100 animate-pulse" />
					<span>
						<strong>Kết nối máy chủ không ổn định</strong>
						{typeof activeLatency === "number" ? ` (Độ trễ: ${activeLatency} ms)` : ""} — Phản hồi có thể bị chậm.
					</span>
				</div>
				<button
					type="button"
					onClick={onRetry}
					disabled={isRetrying}
					aria-label="Kiểm tra lại độ trễ kết nối"
					className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-bold rounded-lg text-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
				>
					<RefreshCw
						className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`}
					/>
					<span>{isRetrying ? "Đang kiểm tra..." : "Kiểm tra lại"}</span>
				</button>
			</div>
		);
	}

	return null;
};
