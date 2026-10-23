import {
	Activity,
	Check,
	Cpu,
	HardDrive,
	RefreshCw,
	Server,
	Zap,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
	BACKEND_PORT_METADATA,
	type BackendPort,
	checkBackendHealth,
	getActiveBackendPort,
	switchBackendPort,
} from "../../api/client";

interface PortStatus {
	online: boolean;
	latencyMs: number;
	checking: boolean;
}

interface BackendSwitcherProps {
	variant?: "compact" | "card";
	className?: string;
}

export const BackendSwitcher: React.FC<BackendSwitcherProps> = ({
	variant = "compact",
	className = "",
}) => {
	const [activePort, setActivePort] = useState<BackendPort>(() =>
		getActiveBackendPort(),
	);
	const [statuses, setStatuses] = useState<Record<BackendPort, PortStatus>>({
		5002: { online: false, latencyMs: -1, checking: false },
		5012: { online: false, latencyMs: -1, checking: false },
	});
	const [isRefreshing, setIsRefreshing] = useState(false);

	const pingAllPorts = useCallback(async () => {
		setIsRefreshing(true);
		setStatuses((prev) => ({
			5002: { ...prev[5002], checking: true },
			5012: { ...prev[5012], checking: true },
		}));

		try {
			const [res5002, res5012] = await Promise.all([
				checkBackendHealth(5002),
				checkBackendHealth(5012),
			]);

			setStatuses({
				5002: {
					online: res5002.online,
					latencyMs: res5002.latencyMs,
					checking: false,
				},
				5012: {
					online: res5012.online,
					latencyMs: res5012.latencyMs,
					checking: false,
				},
			});
		} finally {
			setIsRefreshing(false);
		}
	}, []);

	useEffect(() => {
		pingAllPorts();

		const handlePortChanged = (e: Event) => {
			const customEvent = e as CustomEvent<{ port: BackendPort }>;
			if (customEvent?.detail?.port) {
				setActivePort(customEvent.detail.port);
			} else {
				setActivePort(getActiveBackendPort());
			}
		};

		window.addEventListener("backend:port_changed", handlePortChanged);

		const interval = setInterval(() => {
			pingAllPorts();
		}, 8000);

		return () => {
			window.removeEventListener("backend:port_changed", handlePortChanged);
			clearInterval(interval);
		};
	}, [pingAllPorts]);

	const handleSelectPort = (port: BackendPort) => {
		if (port === activePort) return;
		switchBackendPort(port);
		setActivePort(port);
	};

	if (variant === "compact") {
		return (
			<div
				className={`inline-flex items-center gap-1 bg-slate-800/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 text-xs shadow-xs ${className}`}
				role="group"
				aria-label="Bộ chuyển đổi Backend kép"
			>
				<button
					type="button"
					onClick={() => handleSelectPort(5002)}
					title="Node.js Express (Cổng 5002)"
					className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
						activePort === 5002
							? "bg-emerald-600 text-white shadow-xs"
							: "text-slate-300 hover:text-white hover:bg-slate-700/60"
					}`}
				>
					<span
						className={`w-2 h-2 rounded-full shrink-0 ${
							statuses[5002].checking
								? "bg-amber-400 animate-pulse"
								: statuses[5002].online
									? "bg-emerald-400"
									: "bg-rose-500"
						}`}
					/>
					<HardDrive className="w-3.5 h-3.5 shrink-0 opacity-80" />
					<span className="font-mono text-[11px]">Node 5002</span>
					{statuses[5002].online && statuses[5002].latencyMs >= 0 && (
						<span className="font-mono text-[10px] opacity-75 hidden lg:inline">
							{statuses[5002].latencyMs}ms
						</span>
					)}
				</button>

				<button
					type="button"
					onClick={() => handleSelectPort(5012)}
					title="Rust Axum (Cổng 5012 - Hiệu năng cao)"
					className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
						activePort === 5012
							? "bg-cyan-600 text-white shadow-xs"
							: "text-slate-300 hover:text-white hover:bg-slate-700/60"
					}`}
				>
					<span
						className={`w-2 h-2 rounded-full shrink-0 ${
							statuses[5012].checking
								? "bg-amber-400 animate-pulse"
								: statuses[5012].online
									? "bg-cyan-400"
									: "bg-rose-500"
						}`}
					/>
					<Zap className="w-3.5 h-3.5 shrink-0 opacity-80" />
					<span className="font-mono text-[11px]">Rust 5012</span>
					{statuses[5012].online && statuses[5012].latencyMs >= 0 && (
						<span className="font-mono text-[10px] opacity-75 hidden lg:inline">
							{statuses[5012].latencyMs}ms
						</span>
					)}
				</button>

				<button
					type="button"
					onClick={pingAllPorts}
					disabled={isRefreshing}
					title="Kiểm tra lại trạng thái hai cổng máy chủ"
					aria-label="Kiểm tra lại trạng thái hai cổng máy chủ"
					className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded-md transition-colors cursor-pointer disabled:opacity-40"
				>
					<RefreshCw
						className={`w-3 h-3 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`}
					/>
				</button>
			</div>
		);
	}

	return (
		<div
			className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 ${className}`}
		>
			<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shrink-0">
						<Server className="w-5 h-5" strokeWidth={1.5} />
					</div>
					<div>
						<h3 className="font-black text-slate-900 dark:text-white text-base">
							Cơ Chế Chuyển Đổi Backend Kép (Dual Backend Switcher)
						</h3>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
							Hỗ trợ kiểm thử song song (Shadow Testing) giữa máy chủ Node.js
							Express và máy chủ Rust Axum
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={pingAllPorts}
					disabled={isRefreshing}
					className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
				>
					<RefreshCw
						className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-500" : ""}`}
					/>
					<span>Kiểm Tra Trạng Thái</span>
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div
					onClick={() => handleSelectPort(5002)}
					className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
						activePort === 5002
							? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20"
							: "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40"
					}`}
				>
					<div className="flex items-start justify-between gap-3 mb-3">
						<div className="flex items-center gap-2.5">
							<div
								className={`w-9 h-9 rounded-xl flex items-center justify-center ${
									activePort === 5002
										? "bg-emerald-600 text-white"
										: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
								}`}
							>
								<HardDrive className="w-5 h-5" />
							</div>
							<div>
								<div className="font-black text-sm text-slate-900 dark:text-white">
									{BACKEND_PORT_METADATA[5002].name}
								</div>
								<div className="font-mono text-xs text-slate-500 dark:text-slate-400">
									Cổng 5002 • {BACKEND_PORT_METADATA[5002].engine}
								</div>
							</div>
						</div>

						<span
							className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
								statuses[5002].checking
									? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
									: statuses[5002].online
										? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
										: "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
							}`}
						>
							<span
								className={`w-2 h-2 rounded-full ${
									statuses[5002].checking
										? "bg-amber-500 animate-pulse"
										: statuses[5002].online
											? "bg-emerald-500"
											: "bg-rose-500"
								}`}
							/>
							<span>
								{statuses[5002].checking
									? "Đang ping..."
									: statuses[5002].online
										? `Online (${statuses[5002].latencyMs}ms)`
										: "Ngoại tuyến"}
							</span>
						</span>
					</div>

					<p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
						Máy chủ Node.js Express với Prisma ORM, đảm bảo tính toàn vẹn và
						tương thích cao với toàn bộ module hiện hành của QLHK.
					</p>

					<div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
						<span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
							http://localhost:5002/api
						</span>
						{activePort === 5002 ? (
							<span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
								<Check className="w-3.5 h-3.5" />
								<span>Đang Hoạt Động</span>
							</span>
						) : (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleSelectPort(5002);
								}}
								className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 px-3 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
							>
								Kích hoạt cổng này
							</button>
						)}
					</div>
				</div>

				<div
					onClick={() => handleSelectPort(5012)}
					className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
						activePort === 5012
							? "border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/20 shadow-md ring-2 ring-cyan-500/20"
							: "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40"
					}`}
				>
					<div className="flex items-start justify-between gap-3 mb-3">
						<div className="flex items-center gap-2.5">
							<div
								className={`w-9 h-9 rounded-xl flex items-center justify-center ${
									activePort === 5012
										? "bg-cyan-600 text-white"
										: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
								}`}
							>
								<Cpu className="w-5 h-5" />
							</div>
							<div>
								<div className="font-black text-sm text-slate-900 dark:text-white">
									{BACKEND_PORT_METADATA[5012].name}
								</div>
								<div className="font-mono text-xs text-slate-500 dark:text-slate-400">
									Cổng 5012 • {BACKEND_PORT_METADATA[5012].engine}
								</div>
							</div>
						</div>

						<span
							className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
								statuses[5012].checking
									? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
									: statuses[5012].online
										? "bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800"
										: "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
							}`}
						>
							<span
								className={`w-2 h-2 rounded-full ${
									statuses[5012].checking
										? "bg-amber-500 animate-pulse"
										: statuses[5012].online
											? "bg-cyan-500"
											: "bg-rose-500"
								}`}
							/>
							<span>
								{statuses[5012].checking
									? "Đang ping..."
									: statuses[5012].online
										? `Online (${statuses[5012].latencyMs}ms)`
										: "Ngoại tuyến"}
							</span>
						</span>
					</div>

					<p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
						Máy chủ Rust Axum hiệu năng cao với SQLx, mã hóa phần cứng AES-GCM và
						xử lý dữ liệu hàng vạn nhân khẩu với độ trễ cực thấp.
					</p>

					<div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
						<span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
							http://localhost:5012/api
						</span>
						{activePort === 5012 ? (
							<span className="flex items-center gap-1 text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-100/60 dark:bg-cyan-950/60 px-2.5 py-1 rounded-lg">
								<Check className="w-3.5 h-3.5" />
								<span>Đang Hoạt Động</span>
							</span>
						) : (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleSelectPort(5012);
								}}
								className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 px-3 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
							>
								Kích hoạt cổng này
							</button>
						)}
					</div>
				</div>
			</div>

			<div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
				<Activity className="w-4 h-4 text-emerald-500 shrink-0" />
				<span>
					Lựa chọn được lưu vào bộ nhớ trình duyệt (localStorage:
					qlhk_backend_port). Toàn bộ các yêu cầu dữ liệu và xác thực sẽ định
					tuyến trực tiếp tới cổng đang hoạt động.
				</span>
			</div>
		</div>
	);
};
