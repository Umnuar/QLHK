import { Activity, CheckCircle, Users, XCircle } from "lucide-react";

interface StatsCardsProps {
	total: number;
	received: number;
	unreceived: number;
	rate: string;
	panelClass?: string;
	softTextClass?: string;
}

export function StatsCards({
	total,
	received,
	unreceived,
	rate,
}: StatsCardsProps) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

			<div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between">
				<div>
					<div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
						TỔNG SỐ HỒ SƠ
					</div>
					<div className="text-2xl font-black font-mono mt-1 text-slate-900 dark:text-white">
						{total.toLocaleString("vi-VN")}
					</div>
					<div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
						Hồ sơ trong danh sách
					</div>
				</div>
				<Users
					className="w-6 h-6 text-slate-400 dark:text-slate-500 shrink-0"
					strokeWidth={1.5}
				/>
			</div>

			<div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between">
				<div>
					<div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
						ĐÃ NHẬN QUÀ
					</div>
					<div className="text-2xl font-black font-mono mt-1 text-emerald-600 dark:text-emerald-400">
						{received.toLocaleString("vi-VN")}
					</div>
					<div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
						Đã hoàn tất chi trả
					</div>
				</div>
				<CheckCircle
					className="w-6 h-6 text-slate-400 dark:text-slate-500 shrink-0"
					strokeWidth={1.5}
				/>
			</div>

			<div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between">
				<div>
					<div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
						CHƯA NHẬN QUÀ
					</div>
					<div className="text-2xl font-black font-mono mt-1 text-rose-600 dark:text-rose-400">
						{unreceived.toLocaleString("vi-VN")}
					</div>
					<div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
						Cần rà soát & trao quà
					</div>
				</div>
				<XCircle
					className="w-6 h-6 text-slate-400 dark:text-slate-500 shrink-0"
					strokeWidth={1.5}
				/>
			</div>

			<div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between">
				<div>
					<div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
						TỶ LỆ HOÀN THÀNH
					</div>
					<div className="text-2xl font-black font-mono mt-1 text-blue-600 dark:text-blue-400">
						{rate}%
					</div>
					<div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
						Tiến độ giải ngân
					</div>
				</div>
				<Activity
					className="w-6 h-6 text-slate-400 dark:text-slate-500 shrink-0"
					strokeWidth={1.5}
				/>
			</div>
		</div>
	);
}
