import type React from "react";
import type { Segment } from "./policyAnalyticsData";

export type { Segment };

export interface DonutChartProps {
	segments: Segment[];
	centerValue: string;
	centerLabel: string;
	activeId: string | null;
	onActiveChange: (id: string | null) => void;
	ariaLabel: string;
	size?: number;
	stroke?: number;
	gap?: number;
}

const MIN_HIT_LENGTH = 16;

export const DonutChart: React.FC<DonutChartProps> = ({
	segments,
	centerValue,
	centerLabel,
	activeId,
	onActiveChange,
	ariaLabel,
	size = 176,
	stroke = 16,
	gap = 2,
}) => {
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const center = size / 2;

	let accumulatedAngle = -90;

	return (
		<div
			className="relative shrink-0 flex items-center justify-center select-none"
			style={{ width: size, height: size }}
		>
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				className="transform -rotate-90"
				role="img"
				aria-label={ariaLabel}
			>
				{segments.map((seg) => {
					const angle = (seg.pct / 100) * 360;
					const arcLength = (seg.pct / 100) * circumference;
					const dashLength = Math.max(0, arcLength - gap);
					const dashArray = `${dashLength} ${circumference - dashLength}`;

					const currentAngle = accumulatedAngle;
					accumulatedAngle += angle;

					const isActive = activeId === seg.id;
					const isAnyActive = activeId !== null;
					const strokeWidth = isActive ? stroke + 4 : stroke;
					const opacity = isAnyActive && !isActive ? 0.35 : 1;

					return (
						<g key={seg.id} className="transition-all duration-200">
							<circle
								cx={center}
								cy={center}
								r={radius}
								fill="none"
								stroke={seg.color}
								strokeWidth={strokeWidth}
								strokeDasharray={dashArray}
								strokeDashoffset={0}
								style={{
									transformOrigin: `${center}px ${center}px`,
									transform: `rotate(${currentAngle + 90}deg)`,
									opacity,
									transition:
										"stroke-width 150ms ease, opacity 150ms ease",
								}}
							/>
							<circle
								cx={center}
								cy={center}
								r={radius}
								fill="none"
								stroke="transparent"
								strokeWidth={Math.max(
									stroke + 12,
									MIN_HIT_LENGTH,
								)}
								strokeDasharray={dashArray}
								style={{
									transformOrigin: `${center}px ${center}px`,
									transform: `rotate(${currentAngle + 90}deg)`,
									cursor: "pointer",
								}}
								onMouseEnter={() => onActiveChange(seg.id)}
								onMouseLeave={() => onActiveChange(null)}
								onClick={() =>
									onActiveChange(isActive ? null : seg.id)
								}
								aria-label={`${seg.label}: ${seg.pct}%`}
							/>
						</g>
					);
				})}
			</svg>

			<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
				<span className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight leading-none">
					{centerValue}
				</span>
				<span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mt-1 truncate max-w-[110px]">
					{centerLabel}
				</span>
			</div>
		</div>
	);
};
