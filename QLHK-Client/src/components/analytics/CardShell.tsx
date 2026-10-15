import type React from "react";

export type CardShellProps = {
	icon: React.ReactNode;
	title: string;
	badge: string;
	children: React.ReactNode;
	className?: string;
};

export const CardShell: React.FC<CardShellProps> = ({
	icon,
	title,
	badge,
	children,
	className = "",
}) => {
	return (
		<div
			className={`flex flex-col rounded-2xl border border-slate-800 bg-slate-900/90 py-0 text-slate-100 backdrop-blur-md transition-colors hover:border-slate-700 lg:h-[276px] overflow-hidden shadow-sm ${className}`}
		>
			<header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-slate-800 px-4">
				<h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
					<span className="text-teal-400 shrink-0" aria-hidden="true">
						{icon}
					</span>
					<span className="truncate">{title}</span>
				</h2>
				<span className="shrink-0 rounded-md border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-xs font-semibold text-teal-300">
					{badge}
				</span>
			</header>
			{children}
		</div>
	);
};
