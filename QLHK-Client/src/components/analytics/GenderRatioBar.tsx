import React from "react";

export interface GenderRatioBarProps {
	maleCount: number;
	femaleCount: number;
	className?: string;
}

export const GenderRatioBar: React.FC<GenderRatioBarProps> = ({
	maleCount,
	femaleCount,
	className = "",
}) => {
	const total = maleCount + femaleCount;
	const malePct = total > 0 ? Math.round((maleCount / total) * 100) : 50;
	const femalePct = total > 0 ? 100 - malePct : 50;

	return (
		<div className={`space-y-1.5 ${className}`}>
			<div className="flex justify-between items-center text-xs">
				<span className="font-semibold text-slate-700 dark:text-slate-300">Cơ cấu Giới tính:</span>
				<div className="flex items-center gap-2 font-mono tabular-nums text-xs">
					<span className="text-sky-600 font-medium">Nam: {maleCount} ({malePct}%)</span>
					<span className="text-slate-300 dark:text-slate-600">|</span>
					<span className="text-rose-500 font-medium">Nữ: {femaleCount} ({femalePct}%)</span>
				</div>
			</div>
			<div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
				<div className="h-full bg-sky-500 transition-all duration-300" style={{ width: `${malePct}%` }} />
				<div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${femalePct}%` }} />
			</div>
		</div>
	);
};
