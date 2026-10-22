import type { ReactNode } from "react";
import { Award, CheckCircle, HeartHandshake, Users } from "lucide-react";
import {
	formatNumber,
	formatPct,
	type PolicyDashboardData,
} from "./policyAnalyticsData";

type KpiProps = {
	label: string;
	value: string;
	unit?: string;
	detail: ReactNode;
	icon: ReactNode;
	borderClass: string;
	iconClass: string;
};

function KpiItem({
	label,
	value,
	unit,
	detail,
	icon,
	borderClass,
	iconClass,
}: KpiProps) {
	return (
		<div
			className={`flex flex-row items-center gap-3 rounded-3xl border border-t-2 border-slate-200 bg-white px-4 py-0 text-slate-900 shadow-xs ring-0 transition-colors duration-150 hover:border-slate-300 lg:h-[88px] dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:shadow-none dark:backdrop-blur-md dark:hover:border-slate-700 ${borderClass}`}
		>
			<div
				className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
				aria-hidden="true"
			>
				{icon}
			</div>
			<div className="min-w-0 py-3">
				<p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
					{label}
				</p>
				<p className="flex items-baseline gap-1.5 leading-tight">
					<span className="font-mono text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
						{value}
					</span>
					{unit && (
						<span className="text-xs text-slate-500 dark:text-slate-400">
							{unit}
						</span>
					)}
				</p>
				<p className="truncate text-xs text-slate-500 tabular-nums dark:text-slate-400">
					{detail}
				</p>
			</div>
		</div>
	);
}

export function PolicyKpiRow({ data }: { data: PolicyDashboardData }) {
	return (
		<section
			aria-label="Chỉ số tổng quan an sinh xã hội"
			className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
		>
			<KpiItem
				label="TỔNG ĐỐI TƯỢNG AN SINH"
				value={formatNumber(data.village.totalBeneficiaries)}
				unit="Người"
				detail={`${formatNumber(data.village.chucThoCount)} Chúc thọ • ${formatNumber(data.village.htxhCount)} Bảo trợ XH`}
				icon={<Users className="size-5" />}
				borderClass="border-t-sky-500 dark:border-t-sky-500"
				iconClass="bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
			/>
			<KpiItem
				label="TIẾN ĐỘ TRAO TẶNG / CHI TRẢ"
				value={`${formatPct(data.policyExecution.summary.receivedPct)}%`}
				detail={`Đã chi trả: ${formatNumber(data.policyExecution.summary.received)} • Chưa nhận: ${formatNumber(data.policyExecution.summary.unreceived)}`}
				icon={<CheckCircle className="size-5" />}
				borderClass="border-t-emerald-500 dark:border-t-emerald-500"
				iconClass="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
			/>
			<KpiItem
				label="HỒ SƠ CHÚC THỌ NGƯỜI CAO TUỔI"
				value={formatNumber(data.village.chucThoCount)}
				unit="Cụ"
				detail="Các mốc từ 70 đến >100 tuổi"
				icon={<Award className="size-5" />}
				borderClass="border-t-amber-500 dark:border-t-amber-500"
				iconClass="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
			/>
			<KpiItem
				label="ĐỐI TƯỢNG BẢO TRỢ XÃ HỘI (HTXH)"
				value={formatNumber(data.village.htxhCount)}
				unit="Hồ sơ"
				detail="Trợ cấp bảo trợ xã hội hàng tháng"
				icon={<HeartHandshake className="size-5" />}
				borderClass="border-t-blue-500 dark:border-t-blue-500"
				iconClass="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
			/>
		</section>
	);
}
