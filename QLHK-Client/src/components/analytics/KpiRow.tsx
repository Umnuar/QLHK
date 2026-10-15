import { Building2, HeartHandshake, UserCheck, Users } from "lucide-react";
import type React from "react";
import { formatVietnameseNumber } from "../common/tableStyles";

export interface KpiRowProps {
	totalHouseholds: number;
	totalMembers: number;
	maleCount: number;
	femaleCount: number;
	malePct: number;
	femalePct: number;
	minorityCount: number;
	minorityPct: number;
	trend?: number;
}

type KpiCardProps = {
	label: string;
	value: React.ReactNode;
	unit?: string;
	detail: React.ReactNode;
	icon: React.ReactNode;
	borderClass: string;
	iconClass: string;
};

const KpiCard: React.FC<KpiCardProps> = ({
	label,
	value,
	unit,
	detail,
	icon,
	borderClass,
	iconClass,
}) => {
	return (
		<div
			className={`flex items-center gap-3 rounded-xl border border-t-2 border-slate-800 bg-slate-900/90 px-4 py-3 text-slate-100 ring-0 backdrop-blur-md transition-colors hover:border-slate-700 lg:h-[88px] ${borderClass}`}
		>
			<div
				className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
				aria-hidden="true"
			>
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-xs font-medium text-slate-300">{label}</p>
				<div className="flex items-baseline gap-1.5 leading-tight my-0.5">
					{typeof value === "string" || typeof value === "number" ? (
						<span className="text-2xl font-semibold text-white tabular-nums">
							{value}
						</span>
					) : (
						value
					)}
					{unit && <span className="text-xs text-slate-400">{unit}</span>}
				</div>
				<p className="truncate text-xs text-slate-400 tabular-nums">{detail}</p>
			</div>
		</div>
	);
};

export const KpiRow: React.FC<KpiRowProps> = ({
	totalHouseholds,
	totalMembers,
	maleCount,
	femaleCount,
	malePct,
	femalePct,
	minorityCount,
	minorityPct,
	trend,
}) => {
	return (
		<section
			aria-label="Chỉ số tổng quan"
			className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
		>
			{/* KPI 1: Tổng Hộ Gia Đình */}
			<KpiCard
				label="Tổng Hộ Gia Đình"
				value={formatVietnameseNumber(totalHouseholds)}
				unit="hộ"
				detail={
					trend !== undefined ? (
						<span>
							<span className="font-semibold text-teal-300">
								+{formatVietnameseNumber(trend)}%
							</span>{" "}
							so với quý trước
						</span>
					) : (
						"Hộ gia đình quản lý"
					)
				}
				icon={<Building2 className="size-5" />}
				borderClass="border-t-teal-500"
				iconClass="bg-teal-500/10 text-teal-400"
			/>

			{/* KPI 2: Tổng Nhân Khẩu */}
			<KpiCard
				label="Tổng Nhân Khẩu"
				value={formatVietnameseNumber(totalMembers)}
				unit="người"
				detail={`${formatVietnameseNumber(maleCount)} Nam / ${formatVietnameseNumber(femaleCount)} Nữ`}
				icon={<Users className="size-5" />}
				borderClass="border-t-sky-400"
				iconClass="bg-sky-400/10 text-sky-300"
			/>

			{/* KPI 3: Tỷ Lệ DTTS */}
			<KpiCard
				label="Tỷ Lệ DTTS"
				value={`${formatVietnameseNumber(minorityPct)}%`}
				detail={`${formatVietnameseNumber(minorityCount)} đồng bào DTTS`}
				icon={<HeartHandshake className="size-5" />}
				borderClass="border-t-amber-500"
				iconClass="bg-amber-500/10 text-amber-400"
			/>

			{/* KPI 4: Cơ Cấu Giới Tính */}
			<KpiCard
				label="Cơ Cấu Giới Tính"
				value={
					<div className="flex items-center gap-1.5 text-base sm:text-lg font-semibold leading-none">
						<span className="text-sky-400">
							{formatVietnameseNumber(malePct)}%
						</span>
						<span className="text-slate-500 text-xs font-normal">Nam /</span>
						<span className="text-rose-400">
							{formatVietnameseNumber(femalePct)}%
						</span>
						<span className="text-slate-500 text-xs font-normal">Nữ</span>
					</div>
				}
				detail={`${formatVietnameseNumber(maleCount)} Nam • ${formatVietnameseNumber(femaleCount)} Nữ`}
				icon={<UserCheck className="size-5" />}
				borderClass="border-t-purple-400"
				iconClass="bg-purple-400/10 text-purple-300"
			/>
		</section>
	);
};
