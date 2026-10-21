import type React from "react";
import { Download, TrendingUp } from "lucide-react";
import * as XLSX from "xlsx";
import { TABLE_STYLES } from "../common/tableStyles";
import { formatNumber, formatPct } from "./policyAnalyticsData";

export interface VillageTableRow {
	stt: number;
	id: string;
	name: string;
	total: number;
	chucTho: number;
	htxh: number;
	received: number;
	unreceived: number;
	rate: number;
}

export interface TableSummary {
	total: number;
	chucTho: number;
	htxh: number;
	received: number;
	unreceived: number;
	rate: number;
}

export interface PolicyAnalyticsTableProps {
	rows: VillageTableRow[];
	summary: TableSummary;
	selectedYear: number;
	isAdmin?: boolean;
	userVillageName?: string;
	villagesCount?: number;
}

export const PolicyAnalyticsTable: React.FC<PolicyAnalyticsTableProps> = ({
	rows,
	summary,
	selectedYear,
	isAdmin,
	userVillageName,
	villagesCount = 0,
}) => {
	const handleExportExcel = () => {
		try {
			const titleRow = [
				`UBND XÃ ĐĂK HÀ - BẢNG THỐNG KÊ BÁO CÁO ĐỐI SOÁT CHÍNH SÁCH NĂM ${selectedYear}`,
			];
			const emptyRow: any[] = [];
			const headers = [
				"STT",
				"Tên Thôn",
				"Tổng Đối Tượng",
				"Số Cụ Chúc Thọ",
				"Hồ Sơ HTXH",
				"Đã Nhận Quà / Trợ Cấp",
				"Chưa Nhận",
				"Tỷ Lệ Hoàn Thành (%)",
			];

			const dataRows = rows.map((row) => [
				row.stt,
				row.name,
				row.total,
				row.chucTho,
				row.htxh,
				row.received,
				row.unreceived,
				`${formatPct(row.rate)}%`,
			]);

			const totalRow = [
				"",
				"TỔNG CỘNG TOÀN XÃ",
				summary.total,
				summary.chucTho,
				summary.htxh,
				summary.received,
				summary.unreceived,
				`${formatPct(summary.rate)}%`,
			];

			const ws = XLSX.utils.aoa_to_sheet([titleRow, emptyRow, headers, ...dataRows, totalRow]);
			ws["!cols"] = [
				{ wch: 6 },
				{ wch: 22 },
				{ wch: 18 },
				{ wch: 18 },
				{ wch: 16 },
				{ wch: 22 },
				{ wch: 14 },
				{ wch: 18 },
			];
			ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, "ThongKeDoiSoat");
			XLSX.writeFile(wb, `BaoCao_ThongKe_DoiSoat_DakHa_${selectedYear}.xlsx`);
		} catch (err) {
			console.error("Export error:", err);
		}
	};

	return (
		<div className={TABLE_STYLES.card}>
			<div className={TABLE_STYLES.headerBar}>
				<div className="flex items-center gap-2">
					<TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
					<h3 className={TABLE_STYLES.headerTitle}>
						Đối Soát Số Liệu Chính Sách Theo Thôn ({isAdmin ? (villagesCount ? `${villagesCount} Thôn` : "Các Thôn") : userVillageName} - Năm {selectedYear})
					</h3>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleExportExcel}
						className="h-8 flex items-center gap-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-[0.99] cursor-pointer"
					>
						<Download className="w-3.5 h-3.5" strokeWidth={1.5} />
						<span>Xuất Excel</span>
					</button>
				</div>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full min-w-[960px] text-xs text-left border-collapse whitespace-nowrap">
					<thead className="bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
						<tr className="border-b border-slate-200/90 dark:border-slate-700/80">
							<th className="px-4 py-3 text-center w-12">STT</th>
							<th className="px-4 py-3">Địa Bàn Thôn</th>
							<th className="px-3 py-3 text-right">Tổng Đối Tượng</th>
							<th className="px-3 py-3 text-right">Số Cụ Chúc Thọ</th>
							<th className="px-3 py-3 text-right">Hồ Sơ HTXH</th>
							<th className="px-3 py-3 text-right">Đã Nhận Quà / Trợ Cấp</th>
							<th className="px-3 py-3 text-right">Chưa Nhận</th>
							<th className="px-3 py-3 text-right">Tỷ Lệ Hoàn Thành (%)</th>
						</tr>
					</thead>
					<tbody className="font-medium">
						{rows.length > 0 ? (
							rows.map((row) => (
								<tr key={row.id || row.stt} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/80 min-h-[48px]">
									<td className="px-4 py-3 text-center text-xs text-slate-400 dark:text-slate-500 tabular-nums">{row.stt}</td>
									<td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
										<span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200">
											{row.name}
										</span>
									</td>
									<td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">{formatNumber(row.total)}</td>
									<td className="px-3 py-3 text-right font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatNumber(row.chucTho)}</td>
									<td className="px-3 py-3 text-right font-bold text-sky-600 dark:text-sky-400 tabular-nums">{formatNumber(row.htxh)}</td>
									<td className="px-3 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatNumber(row.received)}</td>
									<td className={`px-3 py-3 text-right font-bold tabular-nums ${row.unreceived > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"}`}>{formatNumber(row.unreceived)}</td>
									<td className="px-3 py-3 text-right font-bold text-slate-800 dark:text-slate-200 tabular-nums">{formatPct(row.rate)}%</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={8} className="py-8 text-center text-slate-400 italic">
									Chưa có số liệu đối soát cho năm {selectedYear}.
								</td>
							</tr>
						)}
					</tbody>
					<tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700">
						<tr>
							<td className="px-4 py-3 text-center font-bold uppercase text-emerald-700 dark:text-emerald-300" colSpan={2}>TỔNG CỘNG TOÀN XÃ</td>
							<td className="px-3 py-3 text-right font-mono font-black text-slate-900 dark:text-white tabular-nums">{formatNumber(summary.total)}</td>
							<td className="px-3 py-3 text-right font-mono font-black text-amber-600 dark:text-amber-400 tabular-nums">{formatNumber(summary.chucTho)}</td>
							<td className="px-3 py-3 text-right font-mono font-black text-sky-600 dark:text-sky-400 tabular-nums">{formatNumber(summary.htxh)}</td>
							<td className="px-3 py-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{formatNumber(summary.received)}</td>
							<td className={`px-3 py-3 text-right font-mono font-black tabular-nums ${summary.unreceived > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"}`}>{formatNumber(summary.unreceived)}</td>
							<td className="px-3 py-3 text-right font-mono font-black text-slate-900 dark:text-white tabular-nums">{formatPct(summary.rate)}%</td>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	);
};
