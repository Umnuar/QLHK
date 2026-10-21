import type React from "react";
import type { FluctuationResult } from "../../utils/fluctuationTracker";
import { formatVietnameseNumber } from "../common/tableStyles";
import { TrendBadge } from "./AnalyticsTrendWidgets";

export * from "./AnalyticsTrendWidgets";

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
