import type React from "react";

export type MicroBarProps = {
	value: number;
	color: string;
	label: string;
	className?: string;
};

export const MicroBar: React.FC<MicroBarProps> = ({
	value,
	color,
	label,
	className = "",
}) => {
	const clampedValue = Math.min(Math.max(value, 0), 100);

	return (
		<div
			role="progressbar"
			aria-label={label}
			aria-valuenow={clampedValue}
			aria-valuemin={0}
			aria-valuemax={100}
			style={{ "--bar": color } as React.CSSProperties}
			className={`h-1 w-full rounded-full bg-slate-800 overflow-hidden ${className}`}
		>
			<div
				className="h-full rounded-full transition-all duration-300"
				style={{
					width: `${clampedValue}%`,
					backgroundColor: "var(--bar, " + color + ")",
				}}
			/>
		</div>
	);
};

export const StatMicroBar = MicroBar;
