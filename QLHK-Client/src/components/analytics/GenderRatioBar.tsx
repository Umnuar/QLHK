import type React from "react";
import { formatNumber, formatPct } from "./policyAnalyticsData";

export interface GenderRatioBarProps {
	maleCount: number;
	malePct?: number;
	femaleCount: number;
	femalePct?: number;
	className?: string;
}

export const GenderRatioBar: React.FC<GenderRatioBarProps> = ({
	maleCount,
	malePct,
	femaleCount,
	femalePct,
	className = "",
}) => {
	const total = maleCount + femaleCount;
	const computedMalePct = malePct !== undefined ? malePct : total > 0 ? (maleCount / total) * 100 : 50;
	const computedFemalePct = femalePct !== undefined ? femalePct : total > 0 ? (femaleCount / total) * 100 : 50;

	return (
		<div
			className={`border-t border-slate-200/70 dark:border-slate-800/80 pt-2 space-y-1.5 ${className}`}
		>
			<div className="flex items-center justify-between text-[11px]">
				<span className="font-semibold text-slate-700 dark:text-slate-300">
					Cơ cấu Giới tính:
				</span>
				<div className="flex items-center gap-3 font-mono tabular-nums text-[11px]">
					<span className="text-sky-600 dark:text-sky-400 font-medium">
						Nam: {formatNumber(maleCount)} ({formatPct(computedMalePct)}%)
					</span>
					<span className="text-slate-300 dark:text-slate-600">|</span>
					<span className="text-rose-500 dark:text-rose-400 font-medium">
						Nữ: {formatNumber(femaleCount)} ({formatPct(computedFemalePct)}%)
					</span>
				</div>
			</div>

			<div
				className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden flex"
				role="progressbar"
				aria-label={`Tỷ lệ giới tính: Nam ${formatPct(computedMalePct)}%, Nữ ${formatPct(computedFemalePct)}%`}
			>
				<div
					className="h-full bg-sky-500 transition-all duration-300 ease-out"
					style={{ width: `${Math.min(Math.max(computedMalePct, 0), 100)}%` }}
					title={`Nam: ${formatPct(computedMalePct)}%`}
				/>
				<div
					className="h-full bg-rose-500 transition-all duration-300 ease-out"
					style={{ width: `${Math.min(Math.max(computedFemalePct, 0), 100)}%` }}
					title={`Nữ: ${formatPct(computedFemalePct)}%`}
				/>
			</div>
		</div>
	);
};
