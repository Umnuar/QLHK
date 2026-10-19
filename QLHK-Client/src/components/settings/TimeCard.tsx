import {
	Clock,
	Globe,
	Database,
	Laptop,
	RefreshCw,
	Calendar,
	ShieldCheck,
} from "lucide-react";
import type React from "react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useApp } from "../../AppContext";
import { settingsApi, type SystemTimeResponse } from "../../api/settingsApi";

export const TimeCard: React.FC = () => {
	const { calculationYear, setCalculationYear } = useApp();

	const [timeInfo, setTimeInfo] = useState<SystemTimeResponse | null>(null);
	const [currentClock, setCurrentClock] = useState<Date>(new Date());
	const [isSyncing, setIsSyncing] = useState<boolean>(false);
	const deltaRef = useRef<number>(0);

	const fetchSystemTime = useCallback(async () => {
		try {
			localStorage.removeItem("app_time_config");

			const data = await settingsApi.getSystemTime();
			setTimeInfo(data);
			deltaRef.current = data.timestamp - Date.now();
			setCurrentClock(new Date(Date.now() + deltaRef.current));

			if (data.calculationYear) {
				setCalculationYear(data.calculationYear);
			}
		} catch (err) {
			console.warn("[TimeCard] Lỗi tải thời gian từ backend:", err);
		}
	}, [setCalculationYear]);

	const handleSync = async () => {
		if (isSyncing) return;
		setIsSyncing(true);
		try {
			const data = await settingsApi.syncSystemTime();
			setTimeInfo(data);
			deltaRef.current = data.timestamp - Date.now();
			setCurrentClock(new Date(Date.now() + deltaRef.current));

			if (data.calculationYear) {
				setCalculationYear(data.calculationYear);
			}
		} catch (err) {
			console.error("[TimeCard] Lỗi đồng bộ thời gian:", err);
		} finally {
			setIsSyncing(false);
		}
	};

	useEffect(() => {
		fetchSystemTime();

		const timer = setInterval(() => {
			setCurrentClock(new Date(Date.now() + deltaRef.current));
		}, 1000);

		return () => clearInterval(timer);
	}, [fetchSystemTime]);

	const formatFullDate = (d: Date) => {
		const days = [
			"Chủ Nhật",
			"Thứ Hai",
			"Thứ Ba",
			"Thứ Tư",
			"Thứ Năm",
			"Thứ Sáu",
			"Thứ Bảy",
		];
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${days[d.getDay()]}, ngày ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
	};

	const formatTimeDigits = (d: Date) => {
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
	};

	const source = timeInfo?.source || "machine";

	return (
		<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden select-none transition-colors">
			{/* Top Header Bar */}
			<div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
				<div className="flex items-center">
					<div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-2xl mr-4 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
						<Clock className="h-5 w-5" strokeWidth={1.5} />
					</div>
					<div>
						<h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
							Thời Gian Chuẩn Hệ Thống
						</h3>
						<p className="text-xs font-medium mt-0.5 text-slate-500 dark:text-slate-400">
							Quản lý tập trung từ Backend qua chuỗi fallback tự động (Internet → Database → Máy chủ)
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleSync}
						disabled={isSyncing}
						className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
					>
						<RefreshCw
							className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`}
							strokeWidth={1.5}
						/>
						<span>{isSyncing ? "Đang đồng bộ..." : "Đồng Bộ Lại"}</span>
					</button>
				</div>
			</div>

			<div className="p-6 md:p-8 space-y-6">
				{/* Digital Clock Box */}
				<div className="p-6 rounded-3xl border border-emerald-100 dark:border-slate-800 bg-gradient-to-br from-emerald-50/60 to-slate-50 dark:from-slate-800/80 dark:to-slate-900/60 flex flex-col md:flex-row items-center justify-between gap-6">
					<div className="space-y-1.5 text-center md:text-left">
						<div className="flex items-center justify-center md:justify-start gap-2">
							<span
								className={`inline-block w-2.5 h-2.5 rounded-full animate-pulse ${
									source === "internet"
										? "bg-emerald-500"
										: source === "database"
											? "bg-amber-500"
											: "bg-slate-400"
								}`}
							/>
							<span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
								Thời Gian Thực Hoạt Động
							</span>
						</div>
						<div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
							{formatTimeDigits(currentClock)}
						</div>
						<div className="text-xs font-bold text-slate-500 dark:text-slate-400">
							{formatFullDate(currentClock)}
						</div>
					</div>

					{/* KPI Năm Tính Toán & Nguồn */}
					<div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
						{/* Card Năm Tính Toán */}
						<div className="px-5 py-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs text-center min-w-[140px]">
							<div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
								<Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
								<span>Năm Làm Việc</span>
							</div>
							<div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
								{calculationYear || timeInfo?.calculationYear || new Date().getFullYear()}
							</div>
							<div className="text-[10px] text-slate-400 font-medium">Khóa cứng Backend</div>
						</div>

						{/* Card Nguồn Cấp */}
						<div className="px-5 py-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs text-center min-w-[160px]">
							<div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
								{source === "internet" && <Globe className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} />}
								{source === "database" && <Database className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />}
								{source === "machine" && <Laptop className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />}
								<span>Nguồn Đồng Bộ</span>
							</div>
							<div
								className={`text-xs font-bold mt-1 uppercase ${
									source === "internet"
										? "text-emerald-600 dark:text-emerald-400"
										: source === "database"
											? "text-amber-600 dark:text-amber-400"
											: "text-slate-600 dark:text-slate-300"
								}`}
							>
								{source === "internet" && "Internet NTP"}
								{source === "database" && "PostgreSQL DB"}
								{source === "machine" && "Máy Chủ Host"}
							</div>
							<div className="text-[10px] text-slate-400 truncate max-w-[150px]">
								{timeInfo?.lastSyncedAt
									? `Đồng bộ: ${new Date(timeInfo.lastSyncedAt).toLocaleTimeString("vi-VN")}`
									: "Tự động 15 phút/lần"}
							</div>
						</div>
					</div>
				</div>

				{/* Thông tin giải thích chuỗi Fallback (Read-Only) */}
				<div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-3">
					<ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" strokeWidth={1.5} />
					<div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
						<strong className="text-slate-800 dark:text-white block mb-0.5">
							Cơ Chế Bảo Vệ Toàn Vẹn Thời Gian Hộ Tịch:
						</strong>
						Thời gian hệ thống được đồng bộ tự động 100% từ máy chủ backend (Cổng 5002) qua 3 tầng bảo vệ. Toàn bộ cơ chế điều chỉnh giờ thủ công đã bị vô hiệu hóa để bảo đảm tính chuẩn xác của các nghiệp vụ tính tuổi nghĩa vụ quân sự, danh sách chúc thọ và thời gian lưu vết kiểm toán.
					</div>
				</div>
			</div>
		</div>
	);
};

export default TimeCard;
