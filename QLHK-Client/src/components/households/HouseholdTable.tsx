import {
	ChevronRight,
	Edit3,
	Eye,
	EyeOff,
	Lightbulb,
	Plus,
	Trash2,
	Users,
} from "lucide-react";
import React, { useState } from "react";
import { householdApi } from "../../api/householdApi";
import type { Household, Person } from "../../types";
import { calculateAge } from "../../utils/date";
import { TablePagination } from "../common/TablePagination";
import {
	formatHouseholdStatus,
	formatVietnameseNumber,
	getHouseholdStatusBadge,
	getHouseholdStatusBadgeClass,
	getTableRowBackground,
	TABLE_HEADER_CLASSES,
	VILLAGE_BADGE_CLASS,
} from "../common/tableStyles";
import type { AgeFilter } from "./AgeFilterPopover";

// Re-export để tương thích ngược với các module khác
export { formatHouseholdStatus, getHouseholdStatusBadgeClass };

interface HouseholdTableProps {
	selectedIds?: string[];
	onToggleSelect?: (id: string) => void;
	onToggleSelectAll?: () => void;
	readOnly?: boolean;
	households: Household[];
	loading: boolean;
	total: number;
	page: number;
	limit: number;
	totalPages: number;
	onPageChange: (newPage: number) => void;
	onLimitChange: (newLimit: number) => void;
	onEdit: (hh: Household) => void;
	onDelete: (hh: Household) => void;
	onAddMember?: (hh: Household) => void;
	onEditMember?: (hh: Household, member: Person) => void;
	onDeleteMember?: (hh: Household, memberId: string) => void;
	ageFilter?: AgeFilter | null;
	calculationYear?: number;
}

export const HouseholdTable: React.FC<HouseholdTableProps> = ({
	selectedIds = [],
	onToggleSelect,
	onToggleSelectAll,
	readOnly = false,
	households,
	loading,
	total,
	page,
	limit,
	totalPages,
	onPageChange,
	onLimitChange,
	onEdit,
	onDelete,
	onAddMember,
	onEditMember,
	onDeleteMember,
	ageFilter,
	calculationYear,
}) => {
	// Trạng thái bung mở accordion cho từng hộ
	const [expandedHouseholdIds, setExpandedHouseholdIds] = useState<string[]>(
		[],
	);
	// Trạng thái hiển thị đầy đủ CCCD cho từng nhân khẩu
	const [revealedCccdIds, setRevealedCccdIds] = useState<string[]>([]);
	const [decryptedCccds, setDecryptedCccds] = useState<Record<string, string>>({});
	// Trạng thái xem toàn bộ thành viên (bỏ qua lọc độ tuổi cục bộ cho từng hộ)
	const [showAllMembersHhIds, setShowAllMembersHhIds] = useState<string[]>([]);

	const toggleAccordion = (hhId: string) => {
		setExpandedHouseholdIds((prev) =>
			prev.includes(hhId) ? prev.filter((id) => id !== hhId) : [...prev, hhId],
		);
	};

	const toggleRevealCccd = async (personId: string, fallbackCccd?: string) => {
		if (revealedCccdIds.includes(personId)) {
			setRevealedCccdIds((prev) => prev.filter((id) => id !== personId));
			return;
		}

		// Nếu đã có trong cache decryptedCccds
		if (decryptedCccds[personId]) {
			setRevealedCccdIds((prev) => [...prev, personId]);
			return;
		}

		// Nếu bản ghi đã có plaintext không bị mask
		if (fallbackCccd && !fallbackCccd.includes("•") && fallbackCccd.length >= 9) {
			setDecryptedCccds((prev) => ({ ...prev, [personId]: fallbackCccd }));
			setRevealedCccdIds((prev) => [...prev, personId]);
			return;
		}

		try {
			const plain = await householdApi.revealCitizenCCCD(personId);
			if (plain) {
				setDecryptedCccds((prev) => ({ ...prev, [personId]: plain }));
			}
			setRevealedCccdIds((prev) => [...prev, personId]);
		} catch (err) {
			console.error("Lỗi khi mở khóa CCCD:", err);
			setRevealedCccdIds((prev) => [...prev, personId]);
		}
	};

	const isAllCurrentSelected =
		households.length > 0 &&
		households.every((h) => selectedIds.includes(h.id));
	const isSomeCurrentSelected =
		households.some((h) => selectedIds.includes(h.id));

	return (
		<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors duration-150">
			{/* Top Controls Info: Tiêu đề bên trái, Dòng Mẹo bên phải */}
			<div className="p-3 sm:px-4 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs">
				<div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-bold">
					<Users
						className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
						strokeWidth={1.75}
					/>
					<span>Danh sách Hộ Gia Đình</span>
				</div>
				<div className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2 flex items-center gap-1.5">
					<Lightbulb
						className="w-3.5 h-3.5 text-amber-500 shrink-0"
						strokeWidth={1.75}
					/>
					<span className="hidden sm:inline">
						Mẹo: Bấm vào dòng hoặc mũi tên để mở xem danh sách Nhân khẩu chi tiết
					</span>
				</div>
			</div>

			{/* Table Container - Cuộn dọc tối đa 640px, thead cố định sticky top-0 */}
			<div className="overflow-x-auto overflow-y-auto max-h-[640px] relative custom-scrollbar">
				<table className="w-full text-left border-collapse text-xs">
					<thead className={TABLE_HEADER_CLASSES.thead}>
						<tr className={TABLE_HEADER_CLASSES.row}>
							<th className={TABLE_HEADER_CLASSES.stickyLeftCheckbox}>
								<input
									type="checkbox"
									aria-label="Chọn tất cả hộ gia đình"
									className="w-4 h-4 cursor-pointer accent-emerald-600 rounded"
									checked={isAllCurrentSelected}
									ref={(input) => {
										if (input) {
											input.indeterminate =
												isSomeCurrentSelected && !isAllCurrentSelected;
										}
									}}
									onChange={() => onToggleSelectAll && onToggleSelectAll()}
								/>
							</th>
							<th className={`${TABLE_HEADER_CLASSES.thCenter} w-8`}></th>
							<th className={`${TABLE_HEADER_CLASSES.thCenter} w-12`}>
								STT
							</th>
							<th className={`${TABLE_HEADER_CLASSES.th} min-w-[200px]`}>
								Hộ Gia Đình
							</th>
							<th className={`${TABLE_HEADER_CLASSES.th} min-w-[130px]`}>
								Thôn Quản Lý
							</th>
							<th className={`${TABLE_HEADER_CLASSES.th} min-w-[200px]`}>
								Địa Chỉ
							</th>
							<th className={`${TABLE_HEADER_CLASSES.thCenter} w-28`}>
								Số Nhân Khẩu
							</th>
							<th className={`${TABLE_HEADER_CLASSES.thCenter} w-32`}>
								Trạng Thái
							</th>
							{!readOnly && (
								<th className={TABLE_HEADER_CLASSES.stickyRightAction}>
									Thao Tác
								</th>
							)}
						</tr>
					</thead>

					<tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
						{loading ? (
							<tr>
								<td
									colSpan={readOnly ? 8 : 9}
									className="py-16 text-center text-slate-400 dark:text-slate-500"
								>
									<div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
									<span className="font-bold text-sm">
										Đang tải dữ liệu hộ gia đình...
									</span>
								</td>
							</tr>
						) : households.length === 0 ? (
							<tr>
								<td
									colSpan={readOnly ? 8 : 9}
									className="py-16 text-center text-slate-400 dark:text-slate-500"
								>
									<div className="text-base font-bold text-slate-600 dark:text-slate-300">
										Không tìm thấy hộ gia đình nào
									</div>
								</td>
							</tr>
						) : (
							households.map((hh, idx) => {
								const stt = (page - 1) * limit + idx + 1;
								const isExpanded = expandedHouseholdIds.includes(hh.id);
								const headMember = hh.members?.find((m) => m.is_head);
								const headName =
									headMember?.full_name ||
									(hh.head_name && hh.head_name !== "Chưa rõ"
										? hh.head_name
										: hh.members?.[0]?.full_name ||
											hh.head_name ||
											"Chưa xác định");

								const isPlaceholderName =
									!headName ||
									headName.trim().toLowerCase() === "chưa xác định" ||
									headName.trim().toLowerCase() === "chưa rõ" ||
									headName.trim().toLowerCase().startsWith("thôn ");

								const isSelected = selectedIds.includes(hh.id);
								const memberCount = hh.members
									? hh.members.length
									: hh.members_count || 0;
								const statusBadge = getHouseholdStatusBadge(hh.status);

								const { rowClass, stickyCellClass } = getTableRowBackground(
									isSelected,
								);

								return (
									<React.Fragment key={hh.id}>
										{/* Hàng cha: Hộ gia đình - chiều cao ~52px, nền đồng bộ 100% giữa dòng và ô sticky */}
										<tr
											onClick={() => toggleAccordion(hh.id)}
											className={`h-[52px] border-b border-slate-100 dark:border-slate-800/60 transition-colors group text-[14px] cursor-pointer ${rowClass}`}
											title="Bấm để bung mở/thu gọn danh sách nhân khẩu"
										>
											<td
												className={`py-3 px-2 text-center sticky left-0 z-10 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)] transition-colors ${stickyCellClass}`}
												onClick={(e) => e.stopPropagation()}
											>
												<input
													type="checkbox"
													aria-label={`Chọn hộ ${headName}`}
													className="w-4 h-4 cursor-pointer accent-emerald-600 rounded"
													checked={selectedIds.includes(hh.id)}
													onChange={() =>
														onToggleSelect && onToggleSelect(hh.id)
													}
												/>
											</td>

											{/* Accordion trigger arrow: xám khi đóng, đổi xanh khi đang mở */}
											<td className="py-3 px-2 text-center">
												<ChevronRight
													strokeWidth={1.75}
													className={`w-4 h-4 mx-auto transition-transform duration-200 ${
														isExpanded
															? "rotate-90 text-emerald-600 dark:text-emerald-400"
															: "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
													}`}
												/>
											</td>

											<td className="py-3.5 px-3 text-center tabular-nums font-medium text-[14px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
												{formatVietnameseNumber(stt)}
											</td>

											{/* Cột Hộ Gia Đình: Bỏ tiền tố "Hộ ông/bà:", chỉ hiện tên đậm, giá trị chưa có hiển thị xám nghiêng */}
											<td className="py-3.5 px-4 whitespace-nowrap">
												<div className="text-[14px] leading-tight">
													{isPlaceholderName ? (
														<span className="text-slate-400 dark:text-slate-500 italic font-normal">
															{headName}
														</span>
													) : (
														<span className="font-bold text-slate-900 dark:text-slate-100">
															{headName}
														</span>
													)}
												</div>
												{hh.notes && (
													<div className="text-[12px] text-slate-400 dark:text-slate-500 font-normal truncate max-w-[220px] mt-0.5">
														{hh.notes}
													</div>
												)}
											</td>

											{/* Cột Thôn Quản Lý: Badge viền xanh lá, nền xanh lá rất nhạt đồng bộ */}
											<td className="py-3.5 px-3.5 whitespace-nowrap">
												<span className={VILLAGE_BADGE_CLASS}>
													{hh.village_name || (
														<span className="italic text-slate-400 dark:text-slate-500">
															Chưa gán thôn
														</span>
													)}
												</span>
											</td>

											{/* Cột Địa Chỉ: Tên địa chỉ hoặc xám nghiêng nếu chưa có */}
											<td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-normal whitespace-nowrap text-[14px]">
												{hh.address || (
													<span className="text-slate-400 dark:text-slate-500 italic">
														Chưa có địa chỉ
													</span>
												)}
											</td>

											{/* Cột Số Nhân Khẩu: Căn giữa, 0 màu xám nhạt, > 0 giữ nhấn xanh nhẹ */}
											<td className="py-3.5 px-3 text-center w-28 whitespace-nowrap">
												{memberCount === 0 ? (
													<span className="tabular-nums text-[14px] text-slate-400 dark:text-slate-500 font-normal">
														0
													</span>
												) : (
													<span className="tabular-nums text-[14px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
														{formatVietnameseNumber(memberCount)}
													</span>
												)}
											</td>

											{/* Cột Trạng Thái: Badge nhỏ cùng kích thước, có chấm màu trợ năng */}
											<td className="py-3.5 px-3 text-center w-32 whitespace-nowrap">
												<span
													className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${statusBadge.className}`}
												>
													<span
														className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotColor} shrink-0`}
														aria-hidden="true"
													/>
													<span>{statusBadge.label}</span>
												</span>
											</td>

											{/* Cột Thao Tác: Ô bấm 32px, hover sửa=xanh, xóa=đỏ */}
											{!readOnly && (
												<td
													className={`py-3.5 px-3 text-center sticky right-0 z-10 shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.3)] whitespace-nowrap transition-colors ${stickyCellClass}`}
													onClick={(e) => e.stopPropagation()}
												>
													<div className="flex items-center justify-center gap-1">
														<button
															type="button"
															onClick={() => onEdit(hh)}
															aria-label={`Sửa hộ gia đình ${headName}`}
															title="Sửa thông tin Hộ gia đình & Nhân khẩu"
															className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400 transition-colors cursor-pointer"
														>
															<Edit3 strokeWidth={1.75} className="w-4 h-4" />
														</button>
														<button
															type="button"
															onClick={() => onDelete(hh)}
															aria-label={`Xóa hộ gia đình ${headName}`}
															title="Chuyển vào Thùng rác"
															className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 transition-colors cursor-pointer"
														>
															<Trash2 strokeWidth={1.75} className="w-4 h-4" />
														</button>
													</div>
												</td>
											)}
										</tr>

										{/* Hàng con bung mở (Flat Inline Sub-table: Danh sách Nhân khẩu) */}
										{isExpanded &&
											(() => {
												const effectiveYear =
													calculationYear || new Date().getFullYear();
												const isViewingAll = showAllMembersHhIds.includes(
													hh.id,
												);
												const allMembers = hh.members || [];
												const matchingMembers = ageFilter
													? allMembers.filter((m) => {
															const mAge = calculateAge(
																m.dob_formatted || m.dob_raw || m.dob,
																effectiveYear,
															);
															if (
																ageFilter.min !== undefined &&
																mAge < ageFilter.min
															)
																return false;
															if (
																ageFilter.max !== undefined &&
																mAge > ageFilter.max
															)
																return false;
															return true;
														})
													: allMembers;

												const displayedMembers =
													ageFilter && !isViewingAll
														? matchingMembers
														: allMembers;

												return (
													<tr className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800/80 animate-in fade-in duration-200">
														<td
															colSpan={readOnly ? 8 : 9}
															className="p-3.5 pl-7 sm:pl-9 border-l-[3px] border-l-emerald-600"
														>
															<div className="space-y-3">
																<div className="flex items-center justify-between flex-wrap gap-2">
																	<div className="flex items-center gap-2">
																		<span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
																		<h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
																			Danh sách Nhân khẩu ({allMembers.length} người)
																		</h4>
																	</div>
																	{onAddMember && !readOnly && (
																		<button
																			type="button"
																			onClick={() => onAddMember(hh)}
																			className="flex items-center justify-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-xl text-xs font-bold border border-emerald-200/80 dark:border-emerald-800 transition-colors cursor-pointer shadow-2xs"
																		>
																			<Plus
																				className="w-3.5 h-3.5"
																				strokeWidth={1.75}
																			/>
																			<span>Thêm Nhân Khẩu</span>
																		</button>
																	)}
																</div>

																{/* Thanh thông báo lọc độ tuổi tinh gọn */}
																{ageFilter && (
																	<div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
																		<div className="flex items-center gap-1.5 flex-wrap">
																			<span className="font-bold">
																				Đang lọc độ tuổi [{ageFilter.label}]:
																			</span>
																			<span>
																				Hiển thị {matchingMembers.length} /{" "}
																				{allMembers.length} nhân khẩu
																			</span>
																		</div>
																		<button
																			type="button"
																			onClick={() => {
																				setShowAllMembersHhIds((prev) =>
																					prev.includes(hh.id)
																						? prev.filter((id) => id !== hh.id)
																						: [...prev, hh.id],
																				);
																			}}
																			className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer ml-2"
																		>
																			{isViewingAll
																				? "Chỉ xem nhân khẩu phù hợp"
																				: "Xem toàn bộ thành viên"}
																		</button>
																	</div>
																)}

																<div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
																	<table className="w-full text-left border-collapse text-xs">
																		<thead>
																			<tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200/90 dark:border-slate-800">
																				<th className="py-2.5 px-2.5 text-center w-12 whitespace-nowrap">
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
																					Tuổi ({calculationYear || 2026})
																				</th>
																				<th className="py-2.5 px-3 min-w-[170px] whitespace-nowrap">
																					Căn Cước Công Dân (CCCD)
																				</th>
																				<th className="py-2.5 px-2 w-24 whitespace-nowrap">
																					Dân Tộc
																				</th>
																				<th className="py-2.5 px-2 w-24 whitespace-nowrap">
																					Tôn Giáo
																				</th>
																				<th className="py-2.5 px-3 min-w-[140px] whitespace-nowrap">
																					Ghi Chú
																				</th>
																				{!readOnly &&
																					(onEditMember || onDeleteMember) && (
																						<th className="py-2.5 px-2 text-center w-20 whitespace-nowrap">
																							Thao Tác
																						</th>
																					)}
																			</tr>
																		</thead>
																		<tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
																			{displayedMembers &&
																			displayedMembers.length > 0 ? (
																				displayedMembers.map((m, mIdx) => {
																					const isRevealed =
																						revealedCccdIds.includes(m.id);
																					const plain = decryptedCccds[m.id];
																					const rawCccd = (m.cccd || m.cccd_last4 || plain || "").trim();
																					const hasCccd =
																						!!rawCccd &&
																						rawCccd !== "—" &&
																						rawCccd !== "-" &&
																						rawCccd !== "0" &&
																						!rawCccd.toLowerCase().includes("chưa có");

																					const displayedCccd = isRevealed
																						? plain ||
																							(m.cccd && !m.cccd.includes("•")
																								? m.cccd
																								: m.cccd_masked || "—")
																						: m.cccd_masked ||
																							(m.cccd_last4
																								? `••••••••${m.cccd_last4}`
																								: m.cccd && m.cccd.includes("•")
																									? m.cccd
																									: "—");

																					return (
																						<tr
																							key={m.id || mIdx}
																							className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
																						>
																							<td className="py-2.5 px-2.5 text-center tabular-nums text-slate-500 text-[13px]">
																								{formatVietnameseNumber(
																									m.stt || mIdx + 1,
																								)}
																							</td>
																							<td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 text-[13.5px]">
																								{m.full_name}
																							</td>
																							<td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
																								{m.relationship}
																							</td>
																							<td className="py-2.5 px-2 text-center">
																								<span
																									className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
																										m.gender === "Nam"
																											? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60"
																											: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60"
																									}`}
																								>
																									<span
																										className={`w-1 h-1 rounded-full ${
																											m.gender === "Nam"
																												? "bg-blue-500"
																												: "bg-rose-500"
																										}`}
																									/>
																									{m.gender}
																								</span>
																							</td>
																							<td className="py-2.5 px-2 text-center tabular-nums text-slate-700 dark:text-slate-300 text-[13px]">
																								{m.dob_formatted ||
																									m.dob_raw ||
																									m.dob ||
																									"-"}
																							</td>
																							<td className="py-2.5 px-2 text-center tabular-nums font-bold text-slate-700 dark:text-slate-300 text-[13px]">
																								{formatVietnameseNumber(
																									calculateAge(
																										m.dob_formatted ||
																											m.dob_raw ||
																											m.dob,
																										calculationYear || 2026,
																									),
																								)}
																							</td>
																							<td className="py-2.5 px-3 tabular-nums">
																								{hasCccd ? (
																									<div
																										className="inline-flex items-center gap-1.5 cursor-pointer select-none group/cccd"
																										onClick={() =>
																											toggleRevealCccd(
																												m.id,
																												m.cccd,
																											)
																										}
																										title={
																											isRevealed
																												? "Bấm để ẩn số CCCD"
																												: "Bấm để xem đầy đủ 12 số CCCD"
																										}
																									>
																										<span className="text-slate-800 dark:text-slate-200 group-hover/cccd:text-emerald-600 dark:group-hover/cccd:text-emerald-400 transition-colors text-[13px]">
																											{displayedCccd}
																										</span>
																										<button
																											type="button"
																											onClick={(e) => {
																												e.stopPropagation();
																												toggleRevealCccd(
																													m.id,
																													m.cccd,
																												);
																											}}
																											title={
																												isRevealed
																													? "Ẩn số CCCD"
																													: "Xem đầy đủ số CCCD"
																											}
																											className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
																										>
																											{isRevealed ? (
																												<EyeOff
																													strokeWidth={1.75}
																													className="w-3.5 h-3.5"
																												/>
																											) : (
																												<Eye
																													strokeWidth={1.75}
																													className="w-3.5 h-3.5"
																												/>
																											)}
																										</button>
																									</div>
																								) : (
																									<span className="text-slate-400 dark:text-slate-500 font-normal select-none text-[13px]">
																										—
																									</span>
																								)}
																							</td>
																							<td className="py-2.5 px-2">
																								<span
																									className={`px-2 py-0.5 rounded text-[11px] font-medium ${
																										m.ethnicity === "Kinh"
																											? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
																											: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60"
																									}`}
																								>
																									{m.ethnicity}
																								</span>
																							</td>
																							<td className="py-2.5 px-2 text-slate-700 dark:text-slate-300 font-medium">
																								{m.religion || "Không"}
																							</td>
																							<td className="py-2.5 px-3 text-slate-500 truncate max-w-[150px]">
																								{m.notes || m.occupation || ""}
																							</td>
																							{!readOnly &&
																								(onEditMember ||
																									onDeleteMember) && (
																									<td className="py-2.5 px-2 text-center">
																										<div className="flex items-center justify-center gap-1">
																											{onEditMember && (
																												<button
																													type="button"
																													onClick={() =>
																														onEditMember(hh, m)
																													}
																													title="Sửa nhân khẩu"
																													className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 cursor-pointer transition-colors"
																												>
																													<Edit3
																														strokeWidth={1.75}
																														className="w-3.5 h-3.5"
																													/>
																												</button>
																											)}
																											{onDeleteMember && (
																												<button
																													type="button"
																													onClick={() =>
																														onDeleteMember(
																															hh,
																															m.id,
																														)
																													}
																													title="Xóa nhân khẩu"
																													className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer transition-colors"
																												>
																													<Trash2
																														strokeWidth={1.75}
																														className="w-3.5 h-3.5"
																													/>
																												</button>
																											)}
																										</div>
																									</td>
																								)}
																						</tr>
																					);
																				})
																			) : (
																				<tr>
																					<td
																						colSpan={11}
																						className="py-8 px-4 text-center"
																					>
																						<div className="flex flex-col items-center justify-center gap-2">
																							<div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
																								<Users
																									className="w-5 h-5"
																									strokeWidth={1.5}
																								/>
																							</div>
																							<p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
																								{ageFilter && !isViewingAll
																									? `Không có nhân khẩu nào trong độ tuổi [${ageFilter.label}]. Bấm "Xem toàn bộ thành viên" để hiển thị.`
																									: "Chưa có thông tin nhân khẩu trong hộ này"}
																							</p>
																							{onAddMember && !readOnly && (
																								<button
																									type="button"
																									onClick={() => onAddMember(hh)}
																									className="mt-1 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl text-xs font-bold border border-emerald-200/80 dark:border-emerald-800 transition-colors cursor-pointer"
																								>
																									<Plus
																										className="w-3.5 h-3.5"
																										strokeWidth={1.75}
																									/>
																									<span>Thêm Nhân Khẩu</span>
																								</button>
																							)}
																						</div>
																					</td>
																				</tr>
																			)}
																		</tbody>
																	</table>
																</div>
															</div>
														</td>
													</tr>
												);
											})()}
									</React.Fragment>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{/* Pagination Footer */}
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

export default HouseholdTable;
