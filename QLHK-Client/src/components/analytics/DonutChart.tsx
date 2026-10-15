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
				className="-rotate-90 overflow-visible"
				aria-hidden="true"
			>
				{/* Vòng nền xám */}
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke="#1e293b"
					strokeWidth={stroke}
				/>

				{/* Vòng SVG hiển thị màu sắc trực quan (pointer-events-none để tránh đè hit area) */}
				{arcs.map(({ segment, length, offset }) => (
					<circle
						key={segment.id}
						cx={size / 2}
						cy={size / 2}
						r={radius}
						fill="none"
						stroke={segment.color}
						strokeWidth={activeId === segment.id ? stroke + 4 : stroke}
						strokeDasharray={`${length} ${circumference - length}`}
						strokeDashoffset={-offset}
						opacity={activeId && activeId !== segment.id ? 0.3 : 1}
						className="pointer-events-none transition-all duration-200"
					/>
				))}

				{/* Vòng Hit-Target vô hình với MIN_HIT_LENGTH = 16 chống trượt hover trên lát cắt nhỏ */}
				{[...arcs]
					.sort((a, b) => b.segment.pct - a.segment.pct)
					.map(({ segment, length, offset }) => {
						const hitLength = Math.max(length, MIN_HIT_LENGTH);
						const hitOffset = offset - (hitLength - length) / 2;
						return (
							<circle
								key={`hit-${segment.id}`}
								cx={size / 2}
								cy={size / 2}
								r={radius}
								fill="none"
								stroke="transparent"
								strokeWidth={stroke + 14}
								strokeDasharray={`${hitLength} ${circumference - hitLength}`}
								strokeDashoffset={-hitOffset}
								pointerEvents="stroke"
								className="cursor-pointer"
								onMouseEnter={() => onActiveChange(segment.id)}
								onMouseLeave={() => onActiveChange(null)}
								onClick={() =>
									onActiveChange(activeId === segment.id ? null : segment.id)
								}
							/>
						);
					})}
			</svg>

			{/* Tâm Donut: số lớn và nhãn tiếng Việt bọc chữ an toàn */}
			<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
				<span className="text-xl font-black leading-none text-white tabular-nums">
					{centerValue}
				</span>
				<span
					className="mt-1 text-balance break-words text-[10px] font-semibold leading-[1.15] text-slate-300"
					style={{ maxWidth: Math.max(size - stroke * 2 - 20, 60) }}
				>
					{centerLabel}
				</span>
			</div>
		</div>
	);
};
