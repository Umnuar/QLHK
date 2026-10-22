import clsx from "@/utils/clsx";
import {
	ChevronDown,
	ChevronsUpDown,
	ChevronUp,
	Lightbulb,
	SearchX,
} from "lucide-react";
import { useCallback, useState } from "react";
import { TablePagination } from "@/components/common/TablePagination";
import { TABLE_STYLES } from "@/components/common/tableStyles";
import type { SortDirection, SortKey, TabType } from "@/types";
import { ProfileRow, type TableProfile } from "./ProfileRow";

interface MainTableProps {
	paginatedProfiles: TableProfile[];
	activeTab: TabType;
	currentPage: number;
	itemsPerPage: number;
	total?: number;
	totalPages?: number;
	onPageChange?: (newPage: number) => void;
	onLimitChange?: (newLimit: number) => void;
	selectedIds: Set<string>;
	setSelectedIds: (
		s: Set<string> | ((prev: Set<string>) => Set<string>),
	) => void;
	onEditProfile: (profile: TableProfile) => void;
	onDeleteProfile: (profile: TableProfile) => void;
	handleToggleReceived: (id: string, newStatus: boolean) => void;
	sortConfig: { key: SortKey; direction: SortDirection };
	handleSort: (key: SortKey) => void;
	isDarkMode: boolean;
	panelClass: string;
	softTextClass: string;
}

function SortIcon({
	columnKey,
	sortConfig,
}: {
	columnKey: SortKey;
	sortConfig: { key: SortKey; direction: SortDirection };
}) {
	if (sortConfig.key !== columnKey || !sortConfig.direction) {
		return (
			<ChevronsUpDown
				className="w-3.5 h-3.5 ml-1 opacity-40 group-hover:opacity-100 transition-opacity"
				strokeWidth={1.5}
			/>
		);
	}
	return sortConfig.direction === "asc" ? (
		<ChevronUp
			className="w-3.5 h-3.5 ml-1 text-emerald-600 dark:text-emerald-400"
			strokeWidth={1.5}
		/>
	) : (
		<ChevronDown
			className="w-3.5 h-3.5 ml-1 text-emerald-600 dark:text-emerald-400"
			strokeWidth={1.5}
		/>
	);
}

export function MainTable({
	paginatedProfiles,
	activeTab,
	currentPage,
	itemsPerPage,
	total,
	totalPages,
	onPageChange,
	onLimitChange,
	selectedIds,
	setSelectedIds,
	onEditProfile,
	onDeleteProfile,
	handleToggleReceived,
	sortConfig,
	handleSort,
	isDarkMode,
	panelClass,
	softTextClass,
}: MainTableProps) {
	const [openPolicyPopover, setOpenPolicyPopover] = useState<string | null>(
		null,
	);

	const isAllSelected =
		paginatedProfiles.length > 0 &&
		paginatedProfiles.every((p) => selectedIds.has(String(p.id)));

	const handleToggleSelect = useCallback(
		(id: string) => {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				if (next.has(id)) next.delete(id);
				else next.add(id);
				return next;
			});
		},
		[setSelectedIds],
	);

	const handleToggleSelectAll = useCallback(() => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (isAllSelected) {
				paginatedProfiles.forEach((p) => {
					next.delete(String(p.id));
				});
			} else {
				paginatedProfiles.forEach((p) => {
					next.add(String(p.id));
				});
			}
			return next;
		});
	}, [isAllSelected, paginatedProfiles, setSelectedIds]);

	const getGroupKey = (p: TableProfile) => {
		if (activeTab === "chuctho") {
			if (p.age60) return "60";
			if (p.age65) return "65";
			if (p.age70) return "70";
			if (p.age75) return "75";
			if (p.age80) return "80";
			if (p.age85) return "85";
			if (p.age90) return "90";
			if (p.age95) return "95";
			if (p.age100) return "100";
			if (p.ageOver100 || p.age_over_100) return ">100";
			return "other";
		}
		if (p.age75plus) return "75plus";
		if (p.age70to74poor) return "poor";
		if (p.baoTro || p.bao_tro) return "baotro";
		if (p.huuTri || p.huu_tri) return "huutri";
		if (p.huuTuatBaoHiem || p.huu_tuat_bao_hiem) return "huutuat";
		if (p.nguoiCoCong || p.nguoi_co_cong) return "cocong";
		return "other";
	};

	return (
		<div
			className={clsx(
				"bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative transition-colors duration-150",
				panelClass,
			)}
		>

			<div className={TABLE_STYLES.cardHeader}>
				<div className="flex items-center gap-2">
					<span className={TABLE_STYLES.headerTitle}>
						{activeTab === "chuctho"
							? "Danh Sách Người Cao Tuổi Chúc Thọ"
							: "Danh Sách Hưu Trí Xã Hội"}{" "}
						— Xã Đăk Hà
					</span>
				</div>
				<div className={TABLE_STYLES.headerTip}>
					<Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={1.75} />
					<span className="hidden sm:inline">
						Mẹo: Bấm dòng để xem chi tiết • Dùng cột Thao tác bên phải để sửa hoặc xóa
					</span>
				</div>
			</div>

			<div className={TABLE_STYLES.scrollContainer}>
				<table className={TABLE_STYLES.table}>
					<colgroup>

						<col style={{ width: 48 }} />

						<col style={{ width: 56 }} />

						<col style={{ minWidth: 220, width: "22%" }} />

						<col style={{ width: 120 }} />

						<col style={{ width: 90 }} />

						<col style={{ width: 120 }} />

						<col style={{ width: 160 }} />

						<col style={{ minWidth: 240, maxWidth: 420, width: "26.4%" }} />

						{activeTab === "chuctho" ? (
							<col style={{ width: 140 }} />
						) : (
							<>
								<col style={{ width: 90 }} />
								<col style={{ width: 110 }} />
								<col style={{ width: 140 }} />
							</>
						)}

						<col style={{ width: 120 }} />

						<col style={{ width: 96 }} />
					</colgroup>
					<thead className={TABLE_STYLES.thead}>
						<tr className={TABLE_STYLES.headerRow}>

							<th className={TABLE_STYLES.thStickyLeft}>
								<input
									type="checkbox"
									checked={isAllSelected}
									ref={(input) => {
										if (input) {
											const someSelected = paginatedProfiles.some((p) =>
												selectedIds.has(String(p.id)),
											);
											input.indeterminate = someSelected && !isAllSelected;
										}
									}}
									onChange={handleToggleSelectAll}
									className="w-4 h-4 cursor-pointer accent-emerald-600 rounded"
									title="Chọn tất cả hồ sơ trong trang này"
								/>
							</th>

							<th className={TABLE_STYLES.thStickyLeftStt}>
								STT
							</th>

							<th
								className={clsx(
									TABLE_STYLES.thStickyLeftName,
									TABLE_STYLES.thSortable,
								)}
								onClick={() => handleSort("name")}
							>
								<div className="flex items-center">
									<span>HỌ VÀ TÊN</span>
									<SortIcon columnKey="name" sortConfig={sortConfig} />
								</div>
							</th>

							<th className={clsx(TABLE_STYLES.thCenter, "w-28")}>
								{activeTab === "chuctho" ? "MỨC TUỔI" : "DIỆN HƯỞNG"}
							</th>

							<th className={clsx(TABLE_STYLES.thCenter, "w-16")}>
								GIỚI TÍNH
							</th>

							<th
								className={clsx(
									TABLE_STYLES.thCenter,
									TABLE_STYLES.thSortable,
									"w-24",
								)}
								onClick={() => handleSort("dob")}
							>
								<div className="flex items-center justify-center">
									<span>NĂM SINH</span>
									<SortIcon columnKey="dob" sortConfig={sortConfig} />
								</div>
							</th>

							<th className={clsx(TABLE_STYLES.thCenter, "w-32")}>
								SỐ CCCD
							</th>

							<th className={clsx(TABLE_STYLES.th, "min-w-[180px]")}>
								NƠI CƯ TRÚ (HỘ KHẨU)
							</th>

							{activeTab === "chuctho" ? (
								<th
									className={clsx(
										TABLE_STYLES.thCenter,
										TABLE_STYLES.thSortable,
										"w-28",
									)}
									onClick={() => handleSort("milestone")}
								>
									<div className="flex items-center justify-center">
										<span>MỐC CHÚC THỌ</span>
										<SortIcon columnKey="milestone" sortConfig={sortConfig} />
									</div>
								</th>
							) : (
								<>
									<th className={clsx(TABLE_STYLES.thCenter, "w-20")}>
										ĐỦ 75+
									</th>
									<th className={clsx(TABLE_STYLES.thCenter, "w-24")}>
										70-74 NGHÈO
									</th>
									<th className={clsx(TABLE_STYLES.thCenter, "w-32")}>
										CHẾ ĐỘ HƯỞNG
									</th>
								</>
							)}

							<th className={clsx(TABLE_STYLES.thCenter, "w-28")}>
								QUÀ TẶNG
							</th>

							<th className={TABLE_STYLES.thStickyRight}>
								THAO TÁC
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
						{paginatedProfiles.length === 0 ? (
							<tr>
								<td
									colSpan={activeTab === "chuctho" ? 11 : 13}
									className="py-16 text-center"
								>
									<div className="flex flex-col items-center justify-center space-y-3">
										<div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
											<SearchX className="w-6 h-6" strokeWidth={1.5} />
										</div>
										<div className="text-sm font-bold text-slate-700 dark:text-slate-200">
											Không tìm thấy hồ sơ phù hợp
										</div>
										<p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
											Vui lòng kiểm tra lại từ khóa tìm kiếm, bộ lọc mốc tuổi hoặc chuyển sang thôn khác.
										</p>
									</div>
								</td>
							</tr>
						) : (
							paginatedProfiles.map((profile, idx) => {
							const prevGroup =
								idx > 0 ? getGroupKey(paginatedProfiles[idx - 1]) : null;
							const currentGroup = getGroupKey(profile);
							const isFirstOfGroup = idx > 0 && currentGroup !== prevGroup;
							const isSelected = selectedIds.has(String(profile.id));

							return (
								<ProfileRow
									key={profile.id}
									profile={profile}
									idx={idx}
									activeTab={activeTab}
									currentPage={currentPage}
									itemsPerPage={itemsPerPage}
									isSelected={isSelected}
									onToggleSelect={handleToggleSelect}
									onEdit={onEditProfile}
									onDelete={onDeleteProfile}
									handleToggleReceived={handleToggleReceived}
									openPolicyPopover={openPolicyPopover}
									setOpenPolicyPopover={setOpenPolicyPopover}
									isDarkMode={isDarkMode}
									panelClass={panelClass}
									softTextClass={softTextClass}
									isFirstOfGroup={isFirstOfGroup}
								/>
							);
						})
					)}
					</tbody>
				</table>
			</div>

			{total !== undefined && onPageChange && onLimitChange && (
				<TablePagination
					itemCount={paginatedProfiles.length}
					total={total}
					page={currentPage}
					limit={itemsPerPage}
					totalPages={totalPages || 1}
					onPageChange={onPageChange}
					onLimitChange={onLimitChange}
				/>
			)}
		</div>
	);
}

export default MainTable;
