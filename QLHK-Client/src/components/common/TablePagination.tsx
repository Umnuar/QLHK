import { ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import { CustomSelect } from "./CustomSelect";
import { formatVietnameseNumber } from "./tableStyles";

const LIMIT_OPTIONS = [
	{ value: 10, label: "10 dòng" },
	{ value: 20, label: "20 dòng" },
	{ value: 50, label: "50 dòng" },
	{ value: 100, label: "100 dòng" },
];

interface TablePaginationProps {
	itemCount: number;
	total: number;
	page: number;
	limit: number;
	totalPages: number;
	onPageChange: (newPage: number) => void;
	onLimitChange: (newLimit: number) => void;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
	itemCount: _itemCount,
	total,
	page,
	limit,
	totalPages,
	onPageChange,
	onLimitChange,
}) => {
	const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
	const endRecord = Math.min(page * limit, total);

	return (
		<div className="p-3.5 sm:px-4 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
			<div className="text-slate-600 dark:text-slate-300 font-medium">
				Hiển thị{" "}
				<strong className="text-slate-900 dark:text-white font-bold tabular-nums">
					{total === 0
						? "0"
						: `${formatVietnameseNumber(startRecord)}–${formatVietnameseNumber(endRecord)}`}
				</strong>{" "}
				trong tổng số{" "}
				<strong className="text-slate-900 dark:text-white font-bold tabular-nums">
					{formatVietnameseNumber(total)}
				</strong>{" "}
				bản ghi
			</div>

			<div className="flex items-center gap-3">
				{/* Limit selector */}
				<div className="flex items-center gap-1.5">
					<span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">
						Số dòng:
					</span>
					<CustomSelect<number>
						value={limit}
						onChange={(val) => onLimitChange(Number(val))}
						options={LIMIT_OPTIONS}
						size="sm"
						variant="form"
						containerClassName="w-28"
						className="font-bold"
					/>
				</div>

				{/* Page navigation: ‹ Trước | Trang X / N | Sau › */}
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						disabled={page <= 1}
						onClick={() => onPageChange(page - 1)}
						aria-label="Trang trước"
						className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1 text-xs font-semibold"
					>
						<ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
						<span>Trước</span>
					</button>

					<span className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl tabular-nums font-bold text-xs text-slate-800 dark:text-slate-200">
						Trang {page} / {totalPages || 1}
					</span>

					<button
						type="button"
						disabled={page >= totalPages}
						onClick={() => onPageChange(page + 1)}
						aria-label="Trang tiếp theo"
						className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1 text-xs font-semibold"
					>
						<span>Sau</span>
						<ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
					</button>
				</div>
			</div>
		</div>
	);
};
