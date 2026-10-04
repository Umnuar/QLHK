import { ChevronRight, RotateCcw, Trash2 } from "lucide-react";
import React, { useState } from "react";
import type { Household } from "../../types";
import { calculateAge } from "../../utils/date";
import { TablePagination } from "../common/TablePagination";
import {
	formatVietnameseNumber,
	VILLAGE_BADGE_CLASS,
} from "../common/tableStyles";

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
	const [expandedIds, setExpandedIds] = useState<string[]>([]);

	const toggleAccordion = (hhId: string) => {
		setExpandedIds((prev) =>
			prev.includes(hhId) ? prev.filter((id) => id !== hhId) : [...prev, hhId],
		);
	};

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
							<th className="py-3 px-2 text-center w-8 border-r border-slate-200/80 dark:border-slate-800">
								<span className="sr-only">Chi tiết</span>
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
									colSpan={9}
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
									colSpan={9}
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
								const isExpanded = expandedIds.includes(hh.id);
								const members = hh.members || [];
								const memberCount = members.length > 0 ? members.length : (hh.members_count || 0);

								return (
									<React.Fragment key={hh.id}>
										<tr
											onClick={() => toggleAccordion(hh.id)}
											className={`hover:bg-rose-50/30 dark:hover:bg-slate-800/40 transition-colors text-[13.5px] cursor-pointer group ${
												isExpanded ? "bg-rose-50/20 dark:bg-slate-800/20" : ""
											}`}
											title="Bấm để xem danh sách nhân khẩu chi tiết"
										>
											<td
												className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center"
												onClick={(e) => e.stopPropagation()}
											>
												<input
													type="checkbox"
													aria-label={`Chọn hộ ${hh.head_name}`}
													className="w-4 h-4 cursor-pointer accent-emerald-600 rounded"
													checked={selectedIds.includes(hh.id)}
													onChange={() => onToggleSelect(hh.id)}
												/>
											</td>
											<td className="py-3 px-2 text-center border-r border-slate-100 dark:border-slate-800/60">
												<ChevronRight
													strokeWidth={1.75}
													className={`w-4 h-4 mx-auto transition-transform duration-200 ${
														isExpanded
															? "rotate-90 text-rose-600 dark:text-rose-400"
															: "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
													}`}
												/>
											</td>
											<td className="py-3 px-3.5 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono text-slate-500">
												{formatVietnameseNumber(stt)}
											</td>
											<td className="py-3 px-4 border-r border-slate-100 dark:border-slate-800/60 font-bold text-slate-800 dark:text-slate-200">
												Hộ ông/bà:{" "}
												<span className="text-emerald-700 dark:text-emerald-400">
													{hh.head_name || "Chưa xác định"}
												</span>
												{hh.notes && (
													<div className="text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate max-w-[200px]">
														{hh.notes}
													</div>
												)}
											</td>
											<td className="py-3 px-3.5 border-r border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-400">
												<span className={VILLAGE_BADGE_CLASS}>
													{hh.village_name || "Chưa gán thôn"}
												</span>
											</td>
											<td className="py-3 px-4 border-r border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-400">
												{hh.address || "—"}
											</td>
											<td className="py-3 px-3 border-r border-slate-100 dark:border-slate-800/60 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
												<span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
													{formatVietnameseNumber(memberCount)}
												</span>
											</td>
											<td className="py-3 px-3.5 border-r border-slate-100 dark:border-slate-800/60 text-slate-500 font-mono text-xs whitespace-nowrap">
												{hh.deleted_at
													? new Date(hh.deleted_at).toLocaleString("vi-VN")
													: "Đã xóa"}
											</td>
											<td
												className="py-3 px-3 text-center sticky right-0 bg-white dark:bg-slate-900 shadow-xs whitespace-nowrap"
												onClick={(e) => e.stopPropagation()}
											>
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

										{/* Dòng mở rộng: Danh sách nhân khẩu chi tiết */}
										{isExpanded && (
											<tr className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800/80 animate-in fade-in duration-200">
												<td
													colSpan={9}
													className="p-3.5 pl-7 sm:pl-9 border-l-[3px] border-l-rose-500"
												>
													<div className="space-y-3">
														<div className="flex items-center gap-2">
															<span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
															<h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
																Chi tiết Nhân khẩu ({members.length} người) — Đã xóa tạm
															</h4>
														</div>

														{members.length === 0 ? (
															<div className="py-4 text-center text-xs text-slate-400 italic">
																Chưa có thông tin thành viên nhân khẩu được lưu trữ
															</div>
														) : (
															<div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
																<table className="w-full text-left border-collapse text-xs">
																	<thead>
																		<tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200/90 dark:border-slate-800">
																			<th className="py-2.5 px-3 text-center w-12 whitespace-nowrap">
																				STT
																			</th>
																			<th className="py-2.5 px-3 min-w-[180px] whitespace-nowrap">
																				Họ và Tên
																			</th>
																			<th className="py-2.5 px-3 w-28 whitespace-nowrap">
																				Quan Hệ
																			</th>
																			<th className="py-2.5 px-2 text-center w-24 whitespace-nowrap">
																				Giới Tính
																			</th>
																			<th className="py-2.5 px-2 text-center w-28 whitespace-nowrap">
																				Ngày Sinh
																			</th>
																			<th className="py-2.5 px-2 text-center w-20 whitespace-nowrap">
																				Tuổi
																			</th>
																			<th className="py-2.5 px-3 text-center w-28 whitespace-nowrap">
																				Dân Tộc
																			</th>
																			<th className="py-2.5 px-3 w-28 whitespace-nowrap">
																				Tôn Giáo
																			</th>
																			<th className="py-2.5 px-3 min-w-[160px] whitespace-nowrap">
																				Căn Cước Công Dân (CCCD)
																			</th>
																			<th className="py-2.5 px-3 whitespace-nowrap">
																				Ghi Chú
																			</th>
																		</tr>
																	</thead>
																	<tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
																		{members.map((m, mIdx) => {
																			const age = calculateAge(m.dob || m.dob_raw);
																			return (
																				<tr
																					key={m.id || mIdx}
																					className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
																				>
																					<td className="py-2.5 px-3 text-center font-mono text-slate-500">
																						{m.stt ?? mIdx + 1}
																					</td>
																					<td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
																						<div className="flex items-center gap-1.5">
																							<span>{m.full_name}</span>
																							{m.is_head && (
																								<span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
																									Chủ hộ
																								</span>
																							)}
																						</div>
																					</td>
																					<td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
																						{m.relationship ||
																							(m.is_head ? "Chủ hộ" : "Thành viên")}
																					</td>
																					<td className="py-2.5 px-2 text-center whitespace-nowrap">
																						<span
																							className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
																								m.gender === "Nam"
																									? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
																									: "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
																							}`}
																						>
																							{m.gender || "Nam"}
																						</span>
																					</td>
																					<td className="py-2.5 px-2 text-center font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
																						{m.dob || m.dob_raw || "—"}
																					</td>
																					<td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
																						{age > 0 ? age : "—"}
																					</td>
																					<td className="py-2.5 px-3 text-center whitespace-nowrap">
																						<span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
																							{m.ethnicity || "Kinh"}
																						</span>
																					</td>
																					<td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
																						{m.religion || "Không"}
																					</td>
																					<td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
																						{m.cccd_masked || m.cccd || "Chưa có"}
																					</td>
																					<td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-[150px] truncate">
																						{m.notes || "—"}
																					</td>
																				</tr>
																			);
																		})}
																	</tbody>
																</table>
															</div>
														)}
													</div>
												</td>
											</tr>
										)}
									</React.Fragment>
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
