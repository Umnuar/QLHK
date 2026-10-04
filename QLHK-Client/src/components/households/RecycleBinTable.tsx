import { RotateCcw, Trash2 } from "lucide-react";
import type React from "react";
import type { Household } from "../../types";
import { TablePagination } from "../common/TablePagination";

interface RecycleBinTableProps {
	households: Household[];
	loading: boolean;
	total: number;
	page: number;
	limit: number;
	totalPages: number;
	selectedIds: string[];
	onToggleSelect: (id: string) => void;
	onToggleSelectAll: () => void;
	onPageChange: (newPage: number) => void;
	onLimitChange: (newLimit: number) => void;
	onRestore: (hh: Household) => void;
	onHardDelete: (hh: Household) => void;
}

export const RecycleBinTable: React.FC<RecycleBinTableProps> = ({
	households,
	loading,
	total,
	page,
	limit,
	totalPages,
	selectedIds,
	onToggleSelect,
	onToggleSelectAll,
	onPageChange,
	onLimitChange,
	onRestore,
	onHardDelete,
}) => {
	return (
		<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors duration-150">
			<div className="overflow-x-auto">
				<table className="w-full text-left border-collapse text-xs">
					<thead>
						<tr className="bg-slate-100/90 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-b border-slate-200/90 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider">
							<th className="py-3 px-3 text-center w-10 border-r border-slate-200/80 dark:border-slate-800">
								<input
									type="checkbox"
									className="w-4 h-4 cursor-pointer accent-emerald-600 rounded"
									checked={
										households.length > 0 &&
										selectedIds.length === households.length
									}
									onChange={onToggleSelectAll}
								/>
							</th>
							<th className="py-3 px-3.5 text-center w-12 border-r border-slate-200/80 dark:border-slate-800 whitespace-nowrap">
								STT
							</th>
							<th className="py-3 px-4 min-w-[180px] border-r border-slate-200/80 dark:border-slate-800 whitespace-nowrap">
								Chủ Hộ
							</th>
							<th className="py-3 px-3.5 min-w-[130px] border-r border-slate-200/80 dark:border-slate-800 whitespace-nowrap">
								Thôn Quản Lý
							</th>
							<th className="py-3 px-4 min-w-[200px] border-r border-slate-200/80 dark:border-slate-800 whitespace-nowrap">
								Địa Chỉ
							</th>
							<th className="py-3 px-3 text-center border-r border-slate-200/80 dark:border-slate-800 whitespace-nowrap">
								Số Nhân Khẩu
							</th>
							<th className="py-3 px-3.5 border-r border-slate-200/80 dark:border-slate-800 whitespace-nowrap">
								Thời Điểm Xóa
							</th>
							<th className="py-3 px-3 text-center min-w-[100px] sticky right-0 z-10 bg-slate-100 dark:bg-slate-950 whitespace-nowrap">
								Thao Tác
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
						{loading ? (
							<tr>
								<td
									colSpan={8}
									className="py-16 text-center text-slate-400 dark:text-slate-500"
								>
									<div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
									<span className="font-bold text-sm">
										Đang tải danh sách thùng rác...
									</span>
								</td>
							</tr>
						) : households.length === 0 ? (
							<tr>
								<td
									colSpan={8}
									className="py-16 text-center text-slate-400 dark:text-slate-500"
								>
									<div className="text-base font-bold text-slate-600 dark:text-slate-300">
										Thùng rác hiện đang trống
									</div>
									<p className="text-xs text-slate-400 mt-1">
										Không có hộ gia đình nào bị xóa tạm
									</p>
								</td>
							</tr>
						) : (
							households.map((hh, idx) => {
								const stt = (page - 1) * limit + idx + 1;
								return (
									<tr
										key={hh.id}
										className="hover:bg-rose-50/30 dark:hover:bg-slate-800/40 transition-colors text-[13.5px]"
									>
										<td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center">
											<input
												type="checkbox"
												className="w-4 h-4 cursor-pointer accent-emerald-600 rounded"
												checked={selectedIds.includes(hh.id)}
												onChange={() => onToggleSelect(hh.id)}
											/>
										</td>
										<td className="py-3 px-3.5 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono text-slate-500">
											{stt}
										</td>
										<td className="py-3 px-4 border-r border-slate-100 dark:border-slate-800/60 font-bold text-slate-800 dark:text-slate-200">
											Hộ ông/bà:{" "}
											<span className="text-emerald-700 dark:text-emerald-400">
												{hh.head_name || "Chưa xác định"}
											</span>
										</td>
										<td className="py-3 px-3.5 border-r border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-400">
											{hh.village_name}
										</td>
										<td className="py-3 px-4 border-r border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-400">
											{hh.address}
										</td>
										<td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
											{hh.members ? hh.members.length : hh.members_count || 0}
										</td>
										<td className="py-3 px-3.5 border-r border-slate-100 dark:border-slate-800/60 text-slate-500 font-mono text-xs">
											{hh.deleted_at
												? new Date(hh.deleted_at).toLocaleString("vi-VN")
												: "Đã xóa"}
										</td>
										<td className="py-3 px-3 text-center sticky right-0 bg-white dark:bg-slate-900 shadow-xs whitespace-nowrap">
											<div className="flex items-center justify-center gap-1">
												<button
													type="button"
													onClick={() => onRestore(hh)}
													title="Khôi phục nguyên trạng"
													className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-xl transition-colors cursor-pointer"
												>
													<RotateCcw className="w-4 h-4" />
												</button>
												<button
													type="button"
													onClick={() => onHardDelete(hh)}
													title="Xóa vĩnh viễn khỏi CSDL"
													className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer"
												>
													<Trash2 className="w-4 h-4" />
												</button>
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			<TablePagination
				itemCount={households.length}
				total={total}
				page={page}
				limit={limit}
				totalPages={totalPages}
				onPageChange={onPageChange}
				onLimitChange={onLimitChange}
			/>
		</div>
	);
};
