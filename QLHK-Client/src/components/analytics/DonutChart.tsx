import type React from "react";

export type Segment = {
	id: string;
	label: string;
	pct: number;
	count: number;
	color: string;
	note?: string;
};

export type DonutChartProps = {
	segments: Segment[];
	centerValue: string;
	centerLabel: string;
	activeId: string | null;
	onActiveChange: (id: string | null) => void;
	ariaLabel: string;
	size?: number;
	stroke?: number;
	gap?: number;
};

export const DonutChart: React.FC<DonutChartProps> = ({
	segments,
	centerValue,
	centerLabel,
	activeId,
	onActiveChange,
	ariaLabel,
	size = 136,
	stroke = 12,
	gap = 2,
}) => {
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const total = segments.reduce((sum, s) => sum + s.pct, 0) || 1;

	let consumed = 0;
	const arcs = segments.map((segment) => {
		const fraction = segment.pct / total;
		const length = Math.max(fraction * circumference - gap, 0.5);
		const offset = consumed * circumference;
		consumed += fraction;
		return { segment, length, offset };
	});

	return (
		<div
			className="relative shrink-0 flex items-center justify-center"
			style={{ width: size, height: size }}
			role="img"
			aria-label={ariaLabel}
		>
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				className="-rotate-90"
				aria-hidden="true"
			>
				{/* Background track */}
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke="#1e293b"
					strokeWidth={stroke}
				/>
				{arcs.map(({ segment, length, offset }) => (
					<circle
						key={segment.id}
						cx={size / 2}
						cy={size / 2}
						r={radius}
						fill="none"
						stroke={segment.color}
						strokeWidth={activeId === segment.id ? stroke + 3 : stroke}
						strokeDasharray={`${length} ${circumference - length}`}
						strokeDashoffset={-offset}
						opacity={activeId && activeId !== segment.id ? 0.3 : 1}
						className="cursor-pointer transition-all duration-200"
						onMouseEnter={() => onActiveChange(segment.id)}
						onMouseLeave={() => onActiveChange(null)}
					/>
				))}
			</svg>
			<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
				<span className="text-xl font-black leading-none text-white tabular-nums tracking-tight">
					{centerValue}
				</span>
				<span className="mt-1 max-w-[76px] truncate text-xs font-bold tracking-wide text-slate-300 uppercase">
					{centerLabel}
				</span>
			</div>
		</div>
	);
};
