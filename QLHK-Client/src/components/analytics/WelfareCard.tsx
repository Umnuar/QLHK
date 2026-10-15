import { Briefcase, GraduationCap, ShieldCheck } from "lucide-react";
import type React from "react";
import { formatVietnameseNumber } from "../common/tableStyles";
import { CardShell } from "./CardShell";
import { MicroBar } from "./MicroBar";

export interface WelfareItem {
	name: string;
	count: number;
	percentage: number;
}

export interface WelfareCardProps {
	militaryList: WelfareItem[];
	educationList: WelfareItem[];
	occupationList: WelfareItem[];
	totalMembers?: number;
}

const MILITARY_COLORS = [
	"#14b8a6", // teal
	"#38bdf8", // sky
	"#f59e0b", // amber
	"#a855f7", // purple
	"#ec4899", // pink
];

const EDU_COLORS = [
	"#14b8a6", // teal
	"#38bdf8", // sky
	"#f59e0b", // amber
	"#a855f7", // purple
];

const OCC_COLORS = [
	"#f59e0b", // amber
	"#38bdf8", // sky
	"#14b8a6", // teal
	"#a855f7", // purple
];

export const WelfareCard: React.FC<WelfareCardProps> = ({
	militaryList,
	educationList,
	occupationList,
}) => {
	const totalMetrics =
		militaryList.length + educationList.length + occupationList.length;

	return (
		<CardShell
			icon={<GraduationCap className="size-4" />}
			title="Nghĩa Vụ Quân Sự & Việc Làm / Học Vấn"
			badge={`${totalMetrics} chỉ số`}
		>
			<div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-slate-800">
				{/* Cột 1: Tình Hình Nghĩa Vụ Quân Sự */}
				<section
					aria-label="Tình Hình Nghĩa Vụ Quân Sự"
					className="flex flex-col px-4 py-3 min-h-0"
				>
					<div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
						<h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-300 uppercase">
							<ShieldCheck
								className="size-3.5 text-amber-400"
								aria-hidden="true"
							/>
							Tình Hình Nghĩa Vụ Quân Sự
						</h3>
						<span className="rounded border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-300">
							Quốc phòng
						</span>
					</div>

					<div className="h-[184px] overflow-y-auto scrollbar-thin pr-1.5">
						{militaryList.length > 0 ? (
							<ul className="flex flex-col gap-2.5">
								{militaryList.map((item, idx) => (
									<li key={item.name} className="flex flex-col gap-1">
										<div className="flex items-center justify-between gap-2 text-xs">
											<span className="truncate font-medium text-slate-200">
												{item.name}
											</span>
											<span className="shrink-0 font-semibold text-white tabular-nums">
												{formatVietnameseNumber(item.percentage)}%{" "}
												<span className="font-normal text-slate-400">
													({formatVietnameseNumber(item.count)})
												</span>
											</span>
										</div>
										<MicroBar
											value={item.percentage}
											color={MILITARY_COLORS[idx % MILITARY_COLORS.length]}
											label={`${item.name} ${item.percentage}%`}
										/>
									</li>
								))}
							</ul>
						) : (
							<div className="py-12 text-center text-xs text-slate-400">
								Chưa có dữ liệu nghĩa vụ quân sự
							</div>
						)}
					</div>
				</section>

				{/* Cột 2: Trình Độ Học Vấn & Cơ Cấu Nghề Nghiệp */}
				<section
					aria-label="Trình Độ Học Vấn & Cơ Cấu Nghề Nghiệp"
					className="flex flex-col px-4 py-3 min-h-0"
				>
					<div className="h-[210px] overflow-y-auto scrollbar-thin pr-1.5 space-y-3">
						{/* Nhóm Học Vấn */}
						<div>
							<div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-2">
								<h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-300 uppercase">
									<GraduationCap
										className="size-3.5 text-teal-400"
										aria-hidden="true"
									/>
									Trình Độ Học Vấn
								</h3>
								<span className="text-[10px] text-slate-400">
									{educationList.length} nhóm
								</span>
							</div>

							{educationList.length > 0 ? (
								<ul className="flex flex-col gap-2">
									{educationList.map((item, idx) => (
										<li key={item.name} className="flex flex-col gap-1">
											<div className="flex items-center justify-between gap-2 text-xs">
												<span className="truncate font-medium text-slate-200">
													{item.name}
												</span>
												<span className="shrink-0 font-semibold text-white tabular-nums">
													{formatVietnameseNumber(item.percentage)}%{" "}
													<span className="font-normal text-slate-400">
														({formatVietnameseNumber(item.count)})
													</span>
												</span>
											</div>
											<MicroBar
												value={item.percentage}
												color={EDU_COLORS[idx % EDU_COLORS.length]}
												label={`${item.name} ${item.percentage}%`}
											/>
										</li>
									))}
								</ul>
							) : (
								<div className="py-2 text-center text-xs text-slate-400">
									Chưa có dữ liệu trình độ học vấn
								</div>
							)}
						</div>

						{/* Nhóm Nghề Nghiệp */}
						<div className="pt-1">
							<div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-2">
								<h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-300 uppercase">
									<Briefcase
										className="size-3.5 text-sky-400"
										aria-hidden="true"
									/>
									Cơ Cấu Nghề Nghiệp
								</h3>
								<span className="text-[10px] text-slate-400">
									{occupationList.length} nhóm
								</span>
							</div>

							{occupationList.length > 0 ? (
								<ul className="flex flex-col gap-2">
									{occupationList.map((item, idx) => (
										<li key={item.name} className="flex flex-col gap-1">
											<div className="flex items-center justify-between gap-2 text-xs">
												<span className="truncate font-medium text-slate-200">
													{item.name}
												</span>
												<span className="shrink-0 font-semibold text-white tabular-nums">
													{formatVietnameseNumber(item.percentage)}%{" "}
													<span className="font-normal text-slate-400">
														({formatVietnameseNumber(item.count)})
													</span>
												</span>
											</div>
											<MicroBar
												value={item.percentage}
												color={OCC_COLORS[idx % OCC_COLORS.length]}
												label={`${item.name} ${item.percentage}%`}
											/>
										</li>
									))}
								</ul>
							) : (
								<div className="py-2 text-center text-xs text-slate-400">
									Chưa có dữ liệu nghề nghiệp
								</div>
							)}
						</div>
					</div>
				</section>
			</div>
		</CardShell>
	);
};
