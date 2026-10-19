import type React from "react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../common/statStyles";
import { formatVietnameseNumber } from "../common/tableStyles";
import { CardShell } from "./CardShell";
import { DonutChart, type Segment } from "./DonutChart";
import { MicroBar } from "./MicroBar";

export type DistributionCardProps = {
	icon: React.ReactNode;
	title: string;
	badge: string;
	segments: Segment[];
	centerValue: string;
	centerLabel: string;
	digits?: number;
};

export const DistributionCard: React.FC<DistributionCardProps> = ({
	icon,
	title,
	badge,
	segments,
	centerValue,
	centerLabel,
	digits = 1,
}) => {
	const [activeId, setActiveId] = useState<string | null>(null);
	const active = segments.find((s) => s.id === activeId);

	return (
		<CardShell icon={icon} title={title} badge={badge}>
			<div className="grid min-h-0 flex-1 grid-cols-1 items-center gap-4 px-4 py-3 sm:grid-cols-2">
				<div className="flex justify-center">
					<DonutChart
						segments={segments}
						size={176}
						centerValue={
							active
								? `${formatVietnameseNumber(
										digits === 0 ? Math.round(active.pct) : active.pct,
									)}%`
								: centerValue
						}
						centerLabel={active ? active.label : centerLabel}
						activeId={activeId}
						onActiveChange={setActiveId}
						ariaLabel={`${title}: ${segments
							.map((s) => `${s.label} ${s.pct}%`)
							.join(", ")}`}
					/>
				</div>

				<div className="h-[184px] overflow-y-auto scrollbar-thin pr-2">
					<ul className="flex flex-col gap-2.5">
						{segments.map((segment) => (
							<li key={segment.id}>
								<Tooltip>
									<TooltipTrigger
										tabIndex={0}
										onMouseEnter={() => setActiveId(segment.id)}
										onMouseLeave={() => setActiveId(null)}
										onFocus={() => setActiveId(segment.id)}
										onBlur={() => setActiveId(null)}
										className={`block w-full rounded-xl border px-2.5 py-1 text-slate-700 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-teal-500/60 cursor-pointer dark:text-slate-300 ${
											activeId === segment.id
												? "border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-700/50 dark:bg-teal-950/40 dark:text-teal-200"
												: "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60"
										} ${activeId && activeId !== segment.id ? "opacity-60" : "opacity-100"}`}
									>
										<div className="flex items-center justify-between gap-2 text-xs">
											<span className="flex min-w-0 items-center gap-1.5 text-slate-800 dark:text-slate-200">
												<span
													className="w-2 h-2 shrink-0 rounded-full"
													style={{ backgroundColor: segment.color }}
													aria-hidden="true"
												/>
												<span className="truncate font-medium leading-tight text-slate-800 dark:text-slate-200">
													{segment.label}
												</span>
											</span>
											<span className="shrink-0 tabular-nums font-bold text-slate-900 dark:text-slate-100">
												{formatVietnameseNumber(
													digits === 0 ? Math.round(segment.pct) : segment.pct,
												)}
												%{" "}
												<span className="font-normal text-slate-500 dark:text-slate-400">
													({formatVietnameseNumber(segment.count)})
												</span>
											</span>
										</div>
										<MicroBar
											value={segment.pct}
											color={segment.color}
											label={`${segment.label} ${segment.pct}%`}
											className="mt-1"
										/>
									</TooltipTrigger>
									<TooltipContent side="left">
										<span className="font-semibold">{segment.label}</span>:{" "}
										{formatVietnameseNumber(segment.count)} người
										{segment.note ? ` · ${segment.note}` : ""}
									</TooltipContent>
								</Tooltip>
							</li>
						))}
					</ul>
				</div>
			</div>
		</CardShell>
	);
};
