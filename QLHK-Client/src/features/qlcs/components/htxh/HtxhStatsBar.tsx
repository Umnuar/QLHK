import type React from "react";
import { Award, CheckCircle, Clock, Users } from "lucide-react";
import { formatNumber, formatPct } from "@/components/analytics/policyAnalyticsData";

export interface HtxhStatsBarProps {
	total: number;
	received: number;
	unreceived: number;
	rate: number;
}

export const HtxhStatsBar: React.FC<HtxhStatsBarProps> = ({
	total,
	received,
	unreceived,
	rate,
}) => {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
			<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs flex items-center gap-3">
				<div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
					<Users className="w-5 h-5" />
				</div>
				<div>
					<p className="text-xs text-slate-500 font-medium">Tổng số đối tượng</p>
					<p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
						{formatNumber(total)} <span className="text-xs font-normal text-slate-400">người</span>
					</p>
				</div>
			</div>

			<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs flex items-center gap-3">
				<div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
					<CheckCircle className="w-5 h-5" />
				</div>
				<div>
					<p className="text-xs text-slate-500 font-medium">Đã nhận quà</p>
					<p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
						{formatNumber(received)} <span className="text-xs font-normal text-slate-400">người</span>
					</p>
				</div>
			</div>

			<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs flex items-center gap-3">
				<div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
					<Clock className="w-5 h-5" />
				</div>
				<div>
					<p className="text-xs text-slate-500 font-medium">Chưa nhận quà</p>
					<p className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
						{formatNumber(unreceived)} <span className="text-xs font-normal text-slate-400">người</span>
					</p>
				</div>
			</div>

			<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs flex items-center gap-3">
				<div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
					<Award className="w-5 h-5" />
				</div>
				<div>
					<p className="text-xs text-slate-500 font-medium">Tỷ lệ hoàn thành</p>
					<p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
						{formatPct(rate)}%
					</p>
				</div>
			</div>
		</div>
	);
};
