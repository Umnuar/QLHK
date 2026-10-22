import type React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { FluctuationResult } from "@/utils/fluctuationTracker";
import { formatVietnameseNumber } from "@/components/common/tableStyles";

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

export interface ChartPanelProps {
	title: string;
	subtitle?: string;
	icon?: React.ReactNode;
	badge?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({
	title,
	subtitle,
	icon,
	badge,
	children,
	className = "",
}) => {
	return (
		<div
			className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full transition-colors duration-150 ${className}`}
		>
			<div className="h-full flex flex-col justify-between">
				<div className="flex items-start justify-between gap-3 pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800">
					<div className="flex items-center gap-2.5 min-w-0">
						{icon && (
							<div
								className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
								style={{
									backgroundColor:
										"color-mix(in srgb, var(--stat-accent, #8b5cf6) 14%, transparent)",
									color: "var(--stat-accent, #8b5cf6)",
								}}
							>
								{icon}
							</div>
						)}
						<div className="min-w-0">
							<h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
								{title}
							</h3>
							{subtitle && (
								<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
									{subtitle}
								</p>
							)}
						</div>
					</div>
					{badge && <div className="shrink-0">{badge}</div>}
				</div>

				<div className="flex-1 flex flex-col justify-center">{children}</div>
			</div>
		</div>
	);
};

export const CATEGORY_COLORS = [
	"var(--cat-1, #2563eb)",
	"var(--cat-2, #059669)",
	"var(--cat-3, #d97706)",
	"var(--cat-4, #7c3aed)",
	"var(--cat-5, #db2777)",
	"var(--cat-other, #64748b)",
] as const;

export interface DonutItem {
	label: string;
	value: number;
	color: string;
	strokeHex?: string;
	trend?: FluctuationResult;
}

export interface MiniDonutProps {
	total: number;
	unit: string;
	items: DonutItem[];
}

export const MiniDonut: React.FC<MiniDonutProps> = ({ total, unit, items }) => {
	const radius = 40;
	const circumference = 2 * Math.PI * radius;
	const sum = items.reduce((acc, it) => acc + Math.max(0, it.value), 0);

	let accumulatedLength = 0;
	const nonZeroCount = items.filter((it) => it.value > 0).length;

	const gap = nonZeroCount > 1 ? 2 : 0;

	const segments = items.map((it) => {
		const rawPct = sum > 0 ? (Math.max(0, it.value) / sum) * 100 : 0;
		const len = (rawPct / 100) * circumference;
		const offset = -accumulatedLength;
		accumulatedLength += len;
		return {
			...it,
			pct: Math.round(rawPct),
			len,
			offset,
		};
	});

	return (
		<div className="flex items-center gap-5 sm:gap-6">

			<div className="relative w-[104px] h-[104px] shrink-0 flex items-center justify-center select-none">
				<svg
					viewBox="0 0 104 104"
					className="w-[104px] h-[104px] -rotate-90"
					role="img"
					aria-label={`Biểu đồ tỷ lệ ${items.map((i) => i.label).join(", ")}`}
				>

					<circle
						cx="52"
						cy="52"
						r={radius}
						fill="none"
						stroke="currentColor"
						strokeWidth="11"
						className="text-slate-100 dark:text-slate-800"
					/>

					{segments.map((seg, idx) => {
						if (seg.len <= 0) return null;
						const visibleLen = Math.max(0, seg.len - gap);
						return (
							<circle
								key={seg.label || idx}
								cx="52"
								cy="52"
								r={radius}
								fill="none"
								stroke={seg.strokeHex || seg.color}
								strokeWidth="11"
								strokeDasharray={`${visibleLen} ${circumference - visibleLen}`}
								strokeDashoffset={seg.offset}
								strokeLinecap="butt"
								className="transition-all duration-700"
							/>
						);
					})}
				</svg>

				<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
					<span className="text-sm font-black text-slate-900 dark:text-white font-sans tabular-nums leading-tight">
						{formatVietnameseNumber(total)}
					</span>
					<span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
						{unit}
					</span>
				</div>
			</div>

			<div className="flex-1 space-y-2.5 min-w-0">
				{segments.map((seg) => (
					<div key={seg.label} className="space-y-1">
						<div className="flex items-center justify-between text-xs font-medium">
							<span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 truncate">
								<span
									className="w-2.5 h-2.5 rounded-full shrink-0"
									style={{ backgroundColor: seg.color }}
								/>
								<span className="truncate">{seg.label}</span>
							</span>
							<div className="flex items-center gap-1.5 shrink-0 ml-2">
								{seg.trend && (
									<TrendBadge
										diff={seg.trend.diff}
										timestamp={seg.trend.timestamp}
									/>
								)}
								<span className="font-bold text-slate-900 dark:text-white tabular-nums font-sans">
									{formatVietnameseNumber(seg.value)}{" "}
									<span className="text-[11px] text-slate-400 font-normal">
										({seg.pct}%)
									</span>
								</span>
							</div>
						</div>
						<div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
							<div
								className="h-full rounded-full transition-all duration-500"
								style={{
									width: `${seg.pct}%`,
									backgroundColor: seg.color,
								}}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export interface BarRowProps {
	label: string;
	count: number;
	maxOrTotal: number;
	unit?: string;
	color?: string;
	trend?: FluctuationResult;
}

export const BarRow: React.FC<BarRowProps> = ({
	label,
	count,
	maxOrTotal,
	unit = "người",
	color = "var(--stat-accent, #8b5cf6)",
	trend,
}) => {
	const isZero = count === 0;
	const pct = maxOrTotal > 0 ? Math.round((count / maxOrTotal) * 100) : 0;

	if (isZero) {
		return (
			<div className="p-2 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200/50 dark:border-slate-800/50 opacity-75 transition-all">
				<div className="flex items-center justify-between text-xs">
					<span className="text-slate-400 dark:text-slate-500 font-medium truncate">
						{label}{" "}
						<span className="text-[10px] text-slate-400 font-normal">(0%)</span>
					</span>
					<div className="flex items-center gap-1.5 shrink-0 ml-2">
						{trend && (
							<TrendBadge diff={trend.diff} timestamp={trend.timestamp} />
						)}
						<span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums font-sans">
							0 {unit}
						</span>
					</div>
				</div>
				<div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full mt-1.5 overflow-hidden" />
			</div>
		);
	}

	return (
		<div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5 transition-all">
			<div className="flex items-center justify-between text-xs">
				<span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
					{label}{" "}
					<span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal ml-1">
						({pct}%)
					</span>
				</span>
				<div className="flex items-center gap-1.5 shrink-0 ml-2">
					{trend && (
						<TrendBadge diff={trend.diff} timestamp={trend.timestamp} />
					)}
					<span className="font-bold text-slate-900 dark:text-white tabular-nums font-sans">
						{formatVietnameseNumber(count)}{" "}
						<span className="font-normal text-slate-400 dark:text-slate-500 ml-0.5">
							{unit}
						</span>
					</span>
				</div>
			</div>
			<div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
				<div
					className="h-full rounded-full transition-all duration-500"
					style={{
						width: `${Math.min(100, Math.max(0, pct))}%`,
						backgroundColor: color,
					}}
				/>
			</div>
		</div>
	);
};

export const ScrollFadeContainer: React.FC<{
	children: React.ReactNode;
	maxHeight?: string;
}> = ({ children, maxHeight = "max-h-[380px]" }) => {
	return (
		<div className="relative">
			<div
				className={`${maxHeight} overflow-y-auto pr-1 space-y-2 custom-scrollbar`}
			>
				{children}
			</div>

			<div className="pointer-events-none absolute bottom-0 left-0 right-1 h-6 bg-gradient-to-t from-white/90 dark:from-slate-900/90 to-transparent rounded-b-xl" />
		</div>
	);
};
