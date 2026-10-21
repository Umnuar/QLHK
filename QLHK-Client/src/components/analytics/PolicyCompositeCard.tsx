import { CheckCircle2, TrendingUp } from "lucide-react";
import { CardShell } from "./CardShell";
import { MicroBar } from "./MicroBar";
import {
	COLORS,
	formatCurrency,
	formatNumber,
	formatPct,
	type PolicyDashboardData,
} from "./policyAnalyticsData";

export function PolicyCompositeCard({ data }: { data: PolicyDashboardData }) {
	const ct = data.policyExecution.chucTho;
	const htxh = data.policyExecution.htxh;

	return (
		<CardShell
			icon={<TrendingUp className="size-4" />}
			title="Tiến Độ Thực Hiện Chính Sách"
			badge="Chúc thọ & Hưu trí xã hội"
			className="lg:h-[276px]"
		>
			<div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-slate-100 dark:sm:divide-slate-800/80">
				<div className="flex flex-col justify-between px-3.5 sm:px-4 py-3 min-h-0">
					<div className="flex items-center justify-between gap-1.5">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 whitespace-nowrap">
							Quà Chúc Thọ
						</span>
						<span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
							Đạt {formatPct(ct.receivedPct)}%
						</span>
					</div>

					<div className="space-y-1.5 py-1">
						<div className="flex items-baseline justify-between text-xs">
							<span className="font-mono text-base font-bold tabular-nums text-slate-900 dark:text-white">
								{formatNumber(ct.received)}{" "}
								<span className="text-xs font-normal text-slate-500 dark:text-slate-400">
									/ {formatNumber(ct.total)} Cụ
								</span>
							</span>
							<span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
								Chưa trao: <span className="font-mono font-bold text-rose-500 dark:text-rose-400">{formatNumber(ct.chuaNhan)}</span>
							</span>
						</div>
						<MicroBar value={ct.receivedPct} color={COLORS.amber} />
					</div>

					<div className="space-y-1 text-xs">
						<div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
							<span className="text-[11px]">Tại hội nghị mừng thọ:</span>
							<span className="shrink-0 font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
								{formatNumber(ct.hoiNghi)} cụ
							</span>
						</div>
						<div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
							<span className="text-[11px]">Tại nhà (cụ già yếu):</span>
							<span className="shrink-0 font-mono font-bold tabular-nums text-teal-600 dark:text-teal-400">
								{formatNumber(ct.taiNha)} cụ
							</span>
						</div>
						<div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
							<span className="text-[11px]">Chưa nhận / Vắng mặt:</span>
							<span className="shrink-0 font-mono font-medium tabular-nums text-rose-500 dark:text-rose-400">
								{formatNumber(ct.chuaNhan)} cụ
							</span>
						</div>
					</div>

					<div className="border-t border-slate-100 pt-2 text-xs dark:border-slate-800/80">
						<div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
							<span className="text-[11px]">Kinh phí giải ngân:</span>
							<span className="shrink-0 font-mono font-bold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
								{formatCurrency(ct.budget)}
							</span>
						</div>
					</div>
				</div>

				<div className="flex flex-col justify-between px-3.5 sm:px-4 py-3 min-h-0">
					<div className="flex items-center justify-between gap-1.5">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 whitespace-nowrap">
							Trợ Cấp HTXH
						</span>
						<span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
							Đạt {formatPct(htxh.receivedPct)}%
						</span>
					</div>

					<div className="space-y-1.5 py-1">
						<div className="flex items-baseline justify-between text-xs">
							<span className="font-mono text-base font-bold tabular-nums text-slate-900 dark:text-white">
								{formatNumber(htxh.received)}{" "}
								<span className="text-xs font-normal text-slate-500 dark:text-slate-400">
									/ {formatNumber(htxh.total)} Hồ sơ
								</span>
							</span>
							<span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
								Chưa nhận: <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatNumber(htxh.unreceived)}</span>
							</span>
						</div>
						<MicroBar value={htxh.receivedPct} color={COLORS.emerald} />
					</div>

					<div className="space-y-1 text-xs">
						<div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
							<span className="text-[11px]">Đã nhận chi trả:</span>
							<span className="shrink-0 font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
								{formatNumber(htxh.received)} ({formatPct(htxh.receivedPct)}%)
							</span>
						</div>
						<div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
							<span className="text-[11px]">Chờ tại bưu điện:</span>
							<span className="shrink-0 font-mono font-medium tabular-nums text-amber-600 dark:text-amber-400 whitespace-nowrap">
								{formatNumber(htxh.unreceived)} ({formatPct(htxh.unreceivedPct)}%)
							</span>
						</div>
						<div className="flex items-center justify-between text-slate-600 dark:text-slate-300 text-[11px]">
							<span className="text-slate-500 dark:text-slate-400">Hình thức:</span>
							<span className="shrink-0 flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
								<CheckCircle2 className="size-3 text-emerald-500" /> Tài khoản & Bưu điện
							</span>
						</div>
					</div>

					<div className="border-t border-slate-100 pt-2 text-xs dark:border-slate-800/80">
						<div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
							<span className="text-[11px]">Kinh phí trợ cấp:</span>
							<span className="shrink-0 font-mono font-bold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
								{formatCurrency(htxh.budget)}
							</span>
						</div>
					</div>
				</div>
			</div>
		</CardShell>
	);
}
