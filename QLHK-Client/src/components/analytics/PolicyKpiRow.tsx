import React from "react";
import { Award, CheckCircle2, Clock, HeartHandshake } from "lucide-react";

export interface PolicyKpiRowProps {
	chucthoTotal?: number;
	chucthoReceived?: number;
	htxhTotal?: number;
	htxhReceived?: number;
}

export const PolicyKpiRow: React.FC<PolicyKpiRowProps> = ({
	chucthoTotal = 0,
	chucthoReceived = 0,
	htxhTotal = 0,
	htxhReceived = 0,
}) => {
	const chucthoRate = chucthoTotal > 0 ? Math.round((chucthoReceived / chucthoTotal) * 100) : 0;
	const htxhRate = htxhTotal > 0 ? Math.round((htxhReceived / htxhTotal) * 100) : 0;

	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
			<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
					<Award className="w-5 h-5" />
				</div>
				<div>
					<div className="text-xs text-slate-500 font-medium">Chúc Thọ (Tổng)</div>
					<div className="text-xl font-black text-slate-800 dark:text-white font-mono">{chucthoTotal}</div>
					<div className="text-[11px] text-emerald-600 font-medium">Đã nhận: {chucthoReceived} ({chucthoRate}%)</div>
				</div>
			</div>
			<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center shrink-0">
					<HeartHandshake className="w-5 h-5" />
				</div>
				<div>
					<div className="text-xs text-slate-500 font-medium">Hỗ Trợ Xã Hội (Tổng)</div>
					<div className="text-xl font-black text-slate-800 dark:text-white font-mono">{htxhTotal}</div>
					<div className="text-[11px] text-rose-600 font-medium">Đã nhận: {htxhReceived} ({htxhRate}%)</div>
				</div>
			</div>
			<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center shrink-0">
					<CheckCircle2 className="w-5 h-5" />
				</div>
				<div>
					<div className="text-xs text-slate-500 font-medium">Tổng Đã Tặng Quà</div>
					<div className="text-xl font-black text-blue-600 font-mono">{chucthoReceived + htxhReceived}</div>
					<div className="text-[11px] text-slate-400">Trên tổng {chucthoTotal + htxhTotal} hồ sơ</div>
				</div>
			</div>
			<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
					<Clock className="w-5 h-5" />
				</div>
				<div>
					<div className="text-xs text-slate-500 font-medium">Chưa Nhận Quà</div>
					<div className="text-xl font-black text-amber-600 font-mono">{(chucthoTotal - chucthoReceived) + (htxhTotal - htxhReceived)}</div>
					<div className="text-[11px] text-slate-400">Đang chờ phát quà</div>
				</div>
			</div>
		</div>
	);
};
