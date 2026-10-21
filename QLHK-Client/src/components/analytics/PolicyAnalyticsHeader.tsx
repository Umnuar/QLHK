import type React from "react";
import { BarChart3, Calendar, RefreshCw, RotateCcw } from "lucide-react";
import { YearSelector } from "../dashboard/YearSelector";

export interface PolicyAnalyticsHeaderProps {
	currentVillageLabel: string;
	isAdmin?: boolean;
	selectedVillage?: string;
	userVillageName?: string;
	selectedYear: number;
	currentYear: number;
	loading: boolean;
	onClearTrends: () => void;
	onRefresh: () => void;
	onYearChange: (year: number) => void;
}

export const PolicyAnalyticsHeader: React.FC<PolicyAnalyticsHeaderProps> = ({
	currentVillageLabel,
	isAdmin,
	selectedVillage,
	userVillageName,
	selectedYear,
	currentYear,
	loading,
	onClearTrends,
	onRefresh,
	onYearChange,
}) => {
	return (
		<>
			<div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-150">
				<div>
					<div className="flex items-center gap-2.5 flex-wrap">
						<span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
							{currentVillageLabel}
						</span>

						<h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
							<BarChart3
								className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
								strokeWidth={1.5}
							/>
							<span>Thống Kê Chính Sách Xã Hội</span>
						</h2>
					</div>
					<p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
						Phân tích số liệu đối tượng Chúc Thọ và Hưu Trí Xã Hội trên địa bàn{" "}
						{isAdmin ? (selectedVillage ? currentVillageLabel : "Xã Đăk Hà") : userVillageName} (Năm {selectedYear})
					</p>
				</div>

				<div className="flex items-center gap-2.5 flex-wrap">
					<button
						type="button"
						onClick={onClearTrends}
						className="h-10 flex items-center justify-center gap-1.5 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 active:scale-95"
						title="Đặt lại lịch sử biến động cho địa bàn và năm này"
					>
						<RotateCcw className="w-4 h-4 text-slate-500 dark:text-slate-400" strokeWidth={1.5} />
						<span className="hidden sm:inline">Đặt lại biến động</span>
					</button>

					<button
						type="button"
						onClick={onRefresh}
						disabled={loading}
						className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl transition-all cursor-pointer active:scale-95 disabled:opacity-50 border border-slate-200 dark:border-slate-700"
						title="Làm mới dữ liệu"
					>
						<RefreshCw
							className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`}
							strokeWidth={1.5}
						/>
					</button>
				</div>
			</div>

			<div className="relative z-20 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-150">
				<div className="flex items-center gap-2.5 flex-wrap">
					<div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 pl-1">
						<Calendar
							className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
							strokeWidth={1.5}
						/>
						<span>Năm tính toán:</span>
					</div>

					<div className="shrink-0">
						<YearSelector
							year={selectedYear}
							onYearChange={onYearChange}
						/>
					</div>

					{selectedYear !== currentYear && (
						<button
							type="button"
							onClick={() => onYearChange(currentYear)}
							className="h-8 sm:h-9 px-2.5 py-1 text-xs rounded-xl flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200/70 dark:border-slate-700/70"
							title="Về năm hiện tại"
						>
							<RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
							<span>Về năm {currentYear}</span>
						</button>
					)}
				</div>

				<div className="text-xs text-slate-400 dark:text-slate-500 font-medium hidden sm:flex items-center gap-2 pr-1">
					<span>
						Đối soát số liệu và mốc tuổi chính sách theo năm{" "}
						<strong className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
							{selectedYear}
						</strong>
					</span>
				</div>
			</div>
		</>
	);
};
