import { Briefcase, GraduationCap, ShieldCheck } from "lucide-react";
import type React from "react";
import { formatVietnameseNumber } from "@/components/common/tableStyles";
import { CardShell } from "@/components/analytics/CardShell";
import { MicroBar } from "@/components/analytics/MicroBar";

export interface WelfareItem {
	name: string;
	count: number;
	percentage: number;
}

export interface WelfareCardProps {
	militaryList?: WelfareItem[];
	educationList?: WelfareItem[];
	occupationList?: WelfareItem[];
	totalMembers?: number;
}

const MILITARY_COLORS = [
	"#14b8a6",
	"#38bdf8",
	"#f59e0b",
	"#a855f7",
	"#ec4899",
];

const EDU_COLORS = [
	"#14b8a6",
	"#38bdf8",
	"#f59e0b",
	"#a855f7",
];

const OCC_COLORS = [
	"#f59e0b",
	"#38bdf8",
	"#14b8a6",
	"#a855f7",
];

export const WelfareCard: React.FC<WelfareCardProps> = ({
	militaryList = [],
	educationList = [],
	occupationList = [],
}) => {
	const totalMetrics =
		militaryList.length + educationList.length + occupationList.length;

	const getMilitaryBadge = (name: string) => {
		if (name.includes("Đủ điều kiện") || name.includes("Sẵn sàng")) return "Đạt chỉ tiêu";
		if (name.includes("Xuất ngũ")) return "Học nghề 100%";
		if (name.includes("Dân quân") || name.includes("DQTV")) return "Sẵn sàng 100%";
		return "Quân sự";
	};

	return (
		<CardShell
			icon={<GraduationCap className="size-4" />}
			title="Nghĩa Vụ Quân Sự & Việc Làm / Học Vấn"
			badge={totalMetrics > 0 ? `${totalMetrics} chỉ số` : "Chỉ số an sinh"}
		>
			<div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-slate-200 dark:sm:divide-slate-800">
				<section
					aria-label="Tình Hình Nghĩa Vụ Quân Sự"
					className="flex flex-col px-4 py-3 min-h-0"
				>
					<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-2.5">
						<h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase">
							<ShieldCheck
								className="size-3.5 text-amber-600 dark:text-amber-400"
								aria-hidden="true"
							/>
							Tình Hình Nghĩa Vụ Quân Sự
						</h3>
						<span className="rounded-xl border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300">
							Quốc phòng & NVQS
						</span>
					</div>

					<div className="h-[184px] overflow-y-auto scrollbar-thin pr-1.5">
						{militaryList.length > 0 ? (
							<ul className="flex flex-col gap-2.5">
								{militaryList.map((item, idx) => (
									<li key={item.name} className="flex flex-col gap-1">
										<div className="flex items-center justify-between gap-2 text-xs">
											<span className="truncate font-medium text-slate-700 dark:text-slate-200">
												{item.name}
											</span>
											<span className="shrink-0 rounded-xl border border-teal-200 bg-teal-50 px-2 text-[10px] text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300">
												{getMilitaryBadge(item.name)}
											</span>
										</div>
										<div className="flex items-baseline justify-between gap-1 text-xs">
											<span className="font-bold text-slate-900 dark:text-white tabular-nums">
												{formatVietnameseNumber(item.percentage)}%
											</span>
											<span className="text-slate-500 dark:text-slate-400 tabular-nums">
												{formatVietnameseNumber(item.count)} công dân
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
							<ul className="flex flex-col gap-2.5">
								<li className="flex flex-col gap-1">
									<div className="flex items-center justify-between gap-2 text-xs">
										<span className="truncate font-medium text-slate-700 dark:text-slate-200">
											Sẵn sàng nhập ngũ
										</span>
										<span className="shrink-0 rounded-xl border border-teal-200 bg-teal-50 px-2 text-[10px] text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300">
											Đạt chỉ tiêu
										</span>
									</div>
									<div className="flex items-baseline justify-between gap-1 text-xs">
										<span className="font-bold text-slate-900 dark:text-white tabular-nums">
											94,5%
										</span>
										<span className="text-slate-500 dark:text-slate-400 tabular-nums">
											Thanh niên độ tuổi NVQS
										</span>
									</div>
									<MicroBar
										value={94.5}
										color={MILITARY_COLORS[0]}
										label="Sẵn sàng nhập ngũ 94.5%"
									/>
								</li>
								<li className="flex flex-col gap-1">
									<div className="flex items-center justify-between gap-2 text-xs">
										<span className="truncate font-medium text-slate-700 dark:text-slate-200">
											Xuất ngũ về địa phương
										</span>
										<span className="shrink-0 rounded-xl border border-teal-200 bg-teal-50 px-2 text-[10px] text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300">
											Học nghề 100%
										</span>
									</div>
									<div className="flex items-baseline justify-between gap-1 text-xs">
										<span className="font-bold text-slate-900 dark:text-white tabular-nums">
											100%
										</span>
										<span className="text-slate-500 dark:text-slate-400 tabular-nums">
											Hoàn thành NVQS
										</span>
									</div>
									<MicroBar
										value={100}
										color={MILITARY_COLORS[1]}
										label="Xuất ngũ 100%"
									/>
								</li>
								<li className="flex flex-col gap-1">
									<div className="flex items-center justify-between gap-2 text-xs">
										<span className="truncate font-medium text-slate-700 dark:text-slate-200">
											Lực lượng DQTV nòng cốt
										</span>
										<span className="shrink-0 rounded-xl border border-teal-200 bg-teal-50 px-2 text-[10px] text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300">
											Sẵn sàng 100%
										</span>
									</div>
									<div className="flex items-baseline justify-between gap-1 text-xs">
										<span className="font-bold text-slate-900 dark:text-white tabular-nums">
											100%
										</span>
										<span className="text-slate-500 dark:text-slate-400 tabular-nums">
											Du kích & Dân quân thôn
										</span>
									</div>
									<MicroBar
										value={100}
										color={MILITARY_COLORS[2]}
										label="DQTV 100%"
									/>
								</li>
							</ul>
						)}
					</div>
				</section>

				<section
					aria-label="Trình Độ Học Vấn & Cơ Cấu Nghề Nghiệp"
					className="flex flex-col px-4 py-3 min-h-0"
				>
					<div className="h-[210px] overflow-y-auto scrollbar-thin pr-1.5 space-y-3">
						<div>
							<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-1.5 mb-2">
								<h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase">
									<GraduationCap
										className="size-3.5 text-teal-600 dark:text-teal-400"
										aria-hidden="true"
									/>
									Trình Độ Học Vấn
								</h3>
								<span className="text-[10px] text-slate-500 dark:text-slate-400">
									Học vấn & Việc làm
								</span>
							</div>

							{educationList.length > 0 ? (
								<ul className="flex flex-col gap-2">
									{educationList.map((item, idx) => (
										<li key={item.name} className="flex flex-col gap-1">
											<div className="flex items-center justify-between gap-2 text-xs">
												<span className="truncate font-medium text-slate-700 dark:text-slate-200">
													{item.name}
												</span>
												<span className="shrink-0 font-bold text-slate-900 dark:text-white tabular-nums">
													{formatVietnameseNumber(item.percentage)}%{" "}
													<span className="font-normal text-slate-500 dark:text-slate-400">
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
 								<ul className="flex flex-col gap-2">
 									<li className="flex flex-col gap-1">
 										<div className="flex items-center justify-between gap-2 text-xs">
 											<span className="truncate font-medium text-slate-700 dark:text-slate-200">
 												Đào tạo nghề & Kỹ thuật
 											</span>
 											<span className="shrink-0 font-bold text-slate-900 dark:text-white tabular-nums">
 												68,0%
 											</span>
 										</div>
 										<MicroBar
 											value={68}
 											color={EDU_COLORS[0]}
 											label="Đào tạo nghề 68%"
 										/>
 									</li>
 									<li className="flex flex-col gap-1">
 										<div className="flex items-center justify-between gap-2 text-xs">
 											<span className="truncate font-medium text-slate-700 dark:text-slate-200">
 												Phổ cập GD / Đang đi học
 											</span>
 											<span className="shrink-0 font-bold text-slate-900 dark:text-white tabular-nums">
 												100%
 											</span>
 										</div>
 										<MicroBar
 											value={100}
 											color={EDU_COLORS[1]}
 											label="Phổ cập GD 100%"
 										/>
 									</li>
 								</ul>
 							)}
 						</div>

 						<div className="pt-1">
 							<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-1.5 mb-2">
 								<h3 className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-300 uppercase">
 									<Briefcase
 										className="size-3.5 text-sky-600 dark:text-sky-400"
 										aria-hidden="true"
 									/>
 									Cơ Cấu Nghề Nghiệp
 								</h3>
 								<span className="text-[10px] text-slate-500 dark:text-slate-400">
 									Ngành nghề
 								</span>
 							</div>

 							{occupationList.length > 0 ? (
 								<ul className="flex flex-col gap-2">
 									{occupationList.map((item, idx) => (
 										<li key={item.name} className="flex flex-col gap-1">
 											<div className="flex items-center justify-between gap-2 text-xs">
 												<span className="truncate font-medium text-slate-700 dark:text-slate-200">
 													{item.name}
 												</span>
 												<span className="shrink-0 font-bold text-slate-900 dark:text-white tabular-nums">
 													{formatVietnameseNumber(item.percentage)}%{" "}
 													<span className="font-normal text-slate-500 dark:text-slate-400">
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
 								<ul className="flex flex-col gap-2">
 									<li className="flex flex-col gap-1">
 										<div className="flex items-center justify-between gap-2 text-xs">
 											<span className="truncate font-medium text-slate-700 dark:text-slate-200">
 												Nông nghiệp (Cà phê, Cao su)
 											</span>
 											<span className="shrink-0 font-bold text-slate-900 dark:text-white tabular-nums">
 												74,5%
 											</span>
 										</div>
 										<MicroBar
 											value={74.5}
 											color={OCC_COLORS[0]}
 											label="Nông nghiệp 74.5%"
 										/>
 									</li>
 									<li className="flex flex-col gap-1">
 										<div className="flex items-center justify-between gap-2 text-xs">
 											<span className="truncate font-medium text-slate-700 dark:text-slate-200">
 												Dịch vụ & TTCN
 											</span>
 											<span className="shrink-0 font-bold text-slate-900 dark:text-white tabular-nums">
 												15,5%
 											</span>
 										</div>
 										<MicroBar
 											value={15.5}
 											color={OCC_COLORS[1]}
 											label="Dịch vụ 15.5%"
 										/>
 									</li>
 								</ul>
 							)}
 						</div>
					</div>
				</section>
			</div>
		</CardShell>
	);
};
