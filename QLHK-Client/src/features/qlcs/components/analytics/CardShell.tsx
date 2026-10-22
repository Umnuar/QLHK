import type React from "react";
import type { ReactNode } from "react";

export interface CardShellProps {
	icon: ReactNode;
	title: string;
	badge: string;
	children: ReactNode;
	className?: string;
}

export const CardShell: React.FC<CardShellProps> = ({
	icon,
	title,
	badge,
	children,
	className = "",
}) => {
	return (
		<div
			className={`flex flex-col gap-0 rounded-3xl border border-slate-200/90 bg-white py-0 text-slate-900 shadow-xs transition-colors duration-150 hover:border-slate-300 lg:h-[276px] dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:shadow-none dark:backdrop-blur-md dark:hover:border-slate-700 select-none ${className}`}
		>
			<header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 px-4">
				<h3 className="flex min-w-0 items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
					<span className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true">
						{icon}
					</span>
					<span className="truncate">{title}</span>
				</h3>
				<span className="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300">
					{badge}
				</span>
			</header>
			<div className="flex-1 min-h-0 flex flex-col">{children}</div>
		</div>
	);
};
