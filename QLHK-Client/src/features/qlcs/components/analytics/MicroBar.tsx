import type React from "react";

export interface MicroBarProps {
	value: number;
	color: string;
	label?: string;
	className?: string;
}

export const MicroBar: React.FC<MicroBarProps> = ({
	value,
	color,
	label,
	className = "",
}) => {
	const clamped = Math.min(Math.max(value, 0), 100);

	return (
		<div
			className={`w-full h-1 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden ${className}`}
			role="progressbar"
			aria-valuenow={clamped}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label={label}
		>
			<div
				className="h-full rounded-full transition-all duration-300 ease-out"
				style={{ width: `${clamped}%`, backgroundColor: color }}
			/>
		</div>
	);
};
