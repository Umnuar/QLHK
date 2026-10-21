import type React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { FluctuationResult } from "../../utils/fluctuationTracker";
import { formatVietnameseNumber } from "../common/tableStyles";

export const STAT_ACCENTS = {
	hk: "#14b8a6",
	nn: "#22c55e",
	cs: "#8b5cf6",
} as const;

export type StatAccentKey = keyof typeof STAT_ACCENTS;

export function formatVnPercent(value: number | string, decimals = 1): string {
	const num = typeof value === "string" ? parseFloat(value) : value;
	if (isNaN(num)) return "0,0%";
	return `${num.toFixed(decimals).replace(".", ",")}%`;
}

export interface TrendBadgeProps {
	diff?: number;
	timestamp?: string | null;
	className?: string;
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({
	diff,
	timestamp,
	className = "",
}) => {
	if (!diff || diff === 0) return null;

	const isPositive = diff > 0;
	const formattedDiff = isPositive
		? `+${formatVietnameseNumber(diff)}`
		: `-${formatVietnameseNumber(Math.abs(diff))}`;

	return (
		<span className={`group relative inline-flex items-center ${className}`}>
			<span
				className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums border transition-all cursor-default select-none shadow-2xs ${
					isPositive
						? "bg-emerald-50 text-emerald-700 border-emerald-200/90 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800"
						: "bg-rose-50 text-rose-700 border-rose-200/90 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800"
				}`}
			>
				{isPositive ? (
					<TrendingUp className="w-2.5 h-2.5 shrink-0" strokeWidth={2.5} />
				) : (
					<TrendingDown className="w-2.5 h-2.5 shrink-0" strokeWidth={2.5} />
				)}
				<span>{formattedDiff}</span>
			</span>

			{timestamp && (
				<span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex z-50 pointer-events-none px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xl border border-slate-700/50 dark:border-slate-200/50 whitespace-nowrap items-center gap-1">
					<span>Thời gian: {timestamp}</span>
					<span className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
				</span>
			)}
		</span>
	);
};

export interface KpiCardProps {
	label: string;
	value: string | number;
	unit?: string;
	subline?: React.ReactNode;
	statusDot?: "success" | "warning" | "error" | "neutral" | null;
	icon?: React.ReactNode;
	progressPercent?: number | null;
	progressColor?: string;
	trend?: FluctuationResult;
}

export const KpiCard: React.FC<KpiCardProps> = ({
	label,
	value,
	unit,
	subline,
	statusDot,
	icon,
	progressPercent,
	progressColor,
	trend,
}) => {
	const formattedValue =
		typeof value === "number" ? formatVietnameseNumber(value) : value;

	return (
		<div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full min-h-[128px] transition-colors duration-150">
			<div>
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 flex-1">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
							{label}
						</span>
						<div className="flex items-baseline gap-1.5 mt-1.5 flex-wrap">
							<span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight font-sans">
								{formattedValue}
							</span>
							{unit && (
								<span className="text-xs font-bold text-slate-500 dark:text-slate-400">
									{unit}
								</span>
							)}
							{trend && (
								<TrendBadge
									diff={trend.diff}
									timestamp={trend.timestamp}
									className="ml-1 self-center"
								/>
							)}
						</div>
					</div>
					{icon && (
						<div className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
							{icon}
						</div>
					)}
				</div>

				{typeof progressPercent === "number" && (
					<div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
						<div
							className="h-full rounded-full transition-all duration-500"
							style={{
								width: `${Math.min(100, Math.max(0, progressPercent))}%`,
								backgroundColor: progressColor || "var(--stat-accent, #8b5cf6)",
							}}
						/>
					</div>
				)}
			</div>

			{subline && (
				<div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-2.5 flex items-center gap-1.5 font-medium">
					{statusDot === "success" && (
						<span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
					)}
					{statusDot === "warning" && (
						<span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
					)}
					{statusDot === "error" && (
						<span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
					)}
					{statusDot === "neutral" && (
						<span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
					)}
					<span className="truncate">{subline}</span>
				</div>
			)}
		</div>
	);
};
