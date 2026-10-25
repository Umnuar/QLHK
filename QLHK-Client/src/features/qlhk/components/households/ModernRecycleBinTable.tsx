import type React from "react";
import { useMemo, useState } from "react";
import {
	AlertTriangle,
	ArrowDown,
	ArrowLeft,
	ArrowUp,
	ArrowUpDown,
	Calendar,
	Check,
	ChevronRight,
	Download,
	ExternalLink,
	Eye,
	Filter,
	Home,
	Info,
	LayoutGrid,
	LayoutList,
	MapPin,
	RefreshCw,
	RotateCcw,
	Search,
	ShieldAlert,
	Trash2,
	UserCheck,
	Users,
	X,
} from "lucide-react";
import type { Household, Village } from "@/types";
import { calculateAge } from "@/utils/date";
import { exportExcelWithDialog, loadXlsx } from "@/utils/fileExport";
import { normalizeUnaccented } from "@/utils/vietnamese";
import { TablePagination } from "@/components/common/TablePagination";
import { formatVietnameseNumber } from "@/components/common/tableStyles";

export interface ModernRecycleBinTableProps {
	households: Household[];
	villages?: Village[];
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
	onBatchRestore: () => void;
	onBatchHardDelete: () => void;
	onRefresh: () => Promise<void>;
}

type QuickFilter = "all" | "large_household" | "recent_7_days";
type SortField = "deleted_at" | "head_name" | "member_count" | "village_name";
type SortDirection = "asc" | "desc";
type ViewMode = "table" | "grid";

export const ModernRecycleBinTable: React.FC<ModernRecycleBinTableProps> = ({
	households,
	villages = [],
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
	onBatchRestore,
	onBatchHardDelete,
	onRefresh,
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedVillage, setSelectedVillage] = useState("all");
	const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
	const [sortField, setSortField] = useState<SortField>("deleted_at");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
	const [viewMode, setViewMode] = useState<ViewMode>("table");
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [inspectingHousehold, setInspectingHousehold] = useState<Household | null>(null);

	const enrichedHouseholds = useMemo(() => {
		return households.map((hh) => {
			const members = hh.members || [];
			const memberCount =
				members.length > 0 ? members.length : (hh.members_count || 0);
			const maleCount = members.filter((m) => m.gender === "Nam").length;
			const femaleCount = members.filter((m) => m.gender === "Nữ").length;

			const deletedDate = hh.deleted_at ? new Date(hh.deleted_at) : null;
			const isValidDate = deletedDate && !isNaN(deletedDate.getTime());

			let relativeTime = "Đã xóa";
			if (isValidDate) {
				const now = new Date();
				const diffDays = Math.floor(
					(now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24),
				);
				if (diffDays === 0) relativeTime = "Hôm nay";
				else if (diffDays === 1) relativeTime = "Hôm qua";
				else relativeTime = `${diffDays} ngày trước`;
			}

			return {
				...hh,
				members,
				memberCount,
				maleCount,
				femaleCount,
				deletedDate,
				isValidDate,
				relativeTime,
			};
		});
	}, [households]);

	const totalCitizensAffected = useMemo(() => {
		return enrichedHouseholds.reduce((acc, h) => acc + h.memberCount, 0);
	}, [enrichedHouseholds]);

	const affectedVillagesCount = useMemo(() => {
		const names = new Set(
			enrichedHouseholds.map((h) => h.village_name).filter(Boolean),
		);
		return names.size;
	}, [enrichedHouseholds]);

	const filteredAndSortedHouseholds = useMemo(() => {
		let list = enrichedHouseholds;

		if (searchTerm.trim()) {
			const normalizedTerm = normalizeUnaccented(searchTerm.toLowerCase().trim());
			list = list.filter((hh) => {
				const head = normalizeUnaccented((hh.head_name || "").toLowerCase());
				const addr = normalizeUnaccented((hh.address || "").toLowerCase());
				const vil = normalizeUnaccented((hh.village_name || "").toLowerCase());
				const notes = normalizeUnaccented((hh.notes || "").toLowerCase());
				const memberMatch = hh.members.some((m) => {
					const name = normalizeUnaccented((m.full_name || "").toLowerCase());
					const cccd = (m.cccd || "").toLowerCase();
					return name.includes(normalizedTerm) || cccd.includes(normalizedTerm);
				});
				return (
					head.includes(normalizedTerm) ||
					addr.includes(normalizedTerm) ||
					vil.includes(normalizedTerm) ||
					notes.includes(normalizedTerm) ||
					memberMatch
				);
			});
		}

		if (selectedVillage !== "all") {
			list = list.filter(
				(hh) =>
					hh.village_id === selectedVillage ||
					hh.village_name?.toLowerCase().trim() === selectedVillage.toLowerCase().trim(),
			);
		}

		if (quickFilter === "large_household") {
			list = list.filter((hh) => hh.memberCount >= 4);
		} else if (quickFilter === "recent_7_days") {
			const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
			list = list.filter(
				(hh) => hh.deletedDate && hh.deletedDate.getTime() >= sevenDaysAgo,
			);
		}

		return [...list].sort((a, b) => {
			let diff = 0;
			if (sortField === "deleted_at") {
				const timeA = a.deletedDate?.getTime() ?? 0;
				const timeB = b.deletedDate?.getTime() ?? 0;
				diff = timeA - timeB;
			} else if (sortField === "head_name") {
				diff = (a.head_name || "").localeCompare(b.head_name || "", "vi", {
					sensitivity: "base",
				});
			} else if (sortField === "member_count") {
				diff = a.memberCount - b.memberCount;
			} else if (sortField === "village_name") {
				diff = (a.village_name || "").localeCompare(b.village_name || "", "vi", {
					sensitivity: "base",
				});
			}
			return sortDirection === "asc" ? diff : -diff;
		});
	}, [
		enrichedHouseholds,
		searchTerm,
		selectedVillage,
		quickFilter,
		sortField,
		sortDirection,
	]);

	const handleSortClick = (field: SortField) => {
		if (sortField === field) {
			setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortDirection("desc");
		}
	};

	const handleRefreshClick = async () => {
		setIsRefreshing(true);
		try {
			await onRefresh();
		} finally {
			setIsRefreshing(false);
		}
	};

	const handleExportExcel = async () => {
		setIsExporting(true);
		try {
			const XLSX = await loadXlsx();
			const rows = filteredAndSortedHouseholds.map((hh, idx) => ({
				"STT": idx + 1,
				"Tên Chủ Hộ": hh.head_name || "Chưa xác định",
				"Thôn Quản Lý": hh.village_name || "Chưa gán thôn",
				"Địa Chỉ": hh.address || "—",
				"Số Nhân Khẩu": hh.memberCount,
				"Nam (Người)": hh.maleCount,
				"Nữ (Người)": hh.femaleCount,
				"Thời Điểm Xóa": hh.isValidDate
					? hh.deletedDate?.toLocaleString("vi-VN")
					: "Đã xóa",
				"Ghi Chú": hh.notes || "—",
			}));

			const worksheet = XLSX.utils.json_to_sheet(rows);
			const workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workbook, worksheet, "ThungRacHoDan");
			const nowStr = new Date().toISOString().slice(0, 10);
			await exportExcelWithDialog(
				workbook,
				`Thung_Rac_Ho_Dan_Dak_Ha_${nowStr}.xlsx`,
			);
		} finally {
			setIsExporting(false);
		}
	};

	const getInitials = (name: string) => {
		if (!name) return "H";
		const parts = name.trim().split(/\s+/);
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	};

	const allVisibleSelected =
		filteredAndSortedHouseholds.length > 0 &&
		filteredAndSortedHouseholds.every((h) => selectedIds.includes(h.id));

	return (
		<div className="space-y-6 animate-in fade-in pb-16">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
					<div className="space-y-1">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Hộ Trong Thùng Rác
						</span>
						<div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
							{total.toLocaleString()} Hộ
						</div>
						<div className="text-[11px] text-slate-400 font-medium">
							Lưu trữ tạm thời, có thể khôi phục
						</div>
					</div>
					<div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/40 flex items-center justify-center shrink-0">
						<Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" strokeWidth={1.75} />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
					<div className="space-y-1">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Nhân Khẩu Bị Ảnh Hưởng
						</span>
						<div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
							{totalCitizensAffected.toLocaleString()} Người
						</div>
						<div className="text-[11px] text-slate-400 font-medium">
							Toàn bộ thành viên và chủ hộ
						</div>
					</div>
					<div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/40 flex items-center justify-center shrink-0">
						<Users className="w-6 h-6 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
					<div className="space-y-1">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Địa Bàn Thôn Ảnh Hưởng
						</span>
						<div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
							{affectedVillagesCount} Thôn
						</div>
						<div className="text-[11px] text-slate-400 font-medium">
							Có dữ liệu hộ dân bị xóa tạm
						</div>
					</div>
					<div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center shrink-0">
						<MapPin className="w-6 h-6 text-indigo-600 dark:text-indigo-400" strokeWidth={1.75} />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
					<div className="space-y-1">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Chế Độ An Toàn Dữ Liệu
						</span>
						<div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
							<ShieldAlert className="w-4 h-4" />
							<span>Bảo Vệ Hai Lớp</span>
						</div>
						<div className="text-[11px] text-slate-400 font-medium">
							Chống xóa nhầm, khôi phục 1-click
						</div>
					</div>
					<div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center shrink-0">
						<RotateCcw className="w-6 h-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
					</div>
				</div>
			</div>

			<div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
				<div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
							<Trash2 className="w-5 h-5" strokeWidth={2} />
						</div>
						<div>
							<h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
								<span>Bảng Lưu Trữ Thùng Rác Hộ Dân</span>
								<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
									UI Mới
								</span>
							</h3>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Tổng {total} hộ trong thùng rác • Trang {page} / {totalPages || 1} • Tự động giữ nguyên trạng thành viên nhân khẩu
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end">
						<button
							type="button"
							onClick={handleRefreshClick}
							disabled={isRefreshing}
							title="Làm mới danh sách thùng rác"
							className="h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
						>
							<RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
							<span className="hidden sm:inline">Làm mới</span>
						</button>

						<button
							type="button"
							onClick={handleExportExcel}
							disabled={isExporting || households.length === 0}
							title="Xuất bảng thùng rác ra file Excel"
							className="h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
						>
							<Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
							<span className="hidden sm:inline">Xuất Excel</span>
						</button>

						<div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
							<button
								type="button"
								onClick={() => setViewMode("table")}
								title="Chế độ bảng chi tiết"
								className={`p-2 rounded-lg transition-all cursor-pointer ${
									viewMode === "table"
										? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
										: "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
								}`}
							>
								<LayoutList className="w-4 h-4" />
							</button>
							<button
								type="button"
								onClick={() => setViewMode("grid")}
								title="Chế độ lưới thẻ"
								className={`p-2 rounded-lg transition-all cursor-pointer ${
									viewMode === "grid"
										? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
										: "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
								}`}
							>
								<LayoutGrid className="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>

				<div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
					<div className="relative flex-1 max-w-md">
						<Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="Tìm tên chủ hộ, CCCD, địa chỉ, thôn..."
							className="w-full h-[42px] min-h-[42px] pl-10 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
						/>
						{searchTerm && (
							<button
								type="button"
								onClick={() => setSearchTerm("")}
								className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						)}
					</div>

					<div className="flex items-center gap-2 flex-wrap">
						{villages.length > 0 && (
							<select
								value={selectedVillage}
								onChange={(e) => setSelectedVillage(e.target.value)}
								className="h-[42px] min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
							>
								<option value="all">Toàn xã (Tất cả thôn)</option>
								{villages.map((v) => (
									<option key={v.id} value={v.id}>
										{v.name}
									</option>
								))}
							</select>
						)}

						<div className="flex items-center gap-1.5 flex-wrap">
							<button
								type="button"
								onClick={() => setQuickFilter("all")}
								className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
									quickFilter === "all"
										? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
										: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
								}`}
							>
								Tất cả ({total})
							</button>
							<button
								type="button"
								onClick={() => setQuickFilter("large_household")}
								className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
									quickFilter === "large_household"
										? "bg-amber-600 text-white shadow-xs"
										: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
								}`}
							>
								Đông khẩu (≥4)
							</button>
							<button
								type="button"
								onClick={() => setQuickFilter("recent_7_days")}
								className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
									quickFilter === "recent_7_days"
										? "bg-rose-600 text-white shadow-xs"
										: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
								}`}
							>
								7 ngày gần nhất
							</button>
						</div>
					</div>
				</div>
			</div>

			{loading ? (
				<div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-slate-200/90 dark:border-slate-800 shadow-sm">
					<div className="w-8 h-8 border-3 border-rose-500/30 border-t-rose-600 rounded-full animate-spin mx-auto mb-3" />
					<span className="font-bold text-xs text-slate-500 dark:text-slate-400">
						Đang nạp danh sách thùng rác hộ dân...
					</span>
				</div>
			) : filteredAndSortedHouseholds.length === 0 ? (
				<div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
					<div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
						<Trash2 className="w-6 h-6" />
					</div>
					<h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
						Thùng rác không có bản ghi phù hợp
					</h4>
					<p className="text-xs text-slate-400 max-w-sm mx-auto">
						{total === 0
							? "Hiện không có hộ gia đình nào bị xóa tạm trong hệ thống."
							: "Thử điều chỉnh từ khóa tìm kiếm hoặc bấm \"Tất cả\" để hiển thị đầy đủ danh sách."}
					</p>
					{searchTerm && (
						<button
							type="button"
							onClick={() => {
								setSearchTerm("");
								setSelectedVillage("all");
								setQuickFilter("all");
							}}
							className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
						>
							Đặt lại bộ lọc
						</button>
					)}
				</div>
			) : viewMode === "table" ? (
				<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
					<div className="overflow-x-auto">
						<table className="w-full text-left text-xs border-collapse">
							<thead>
								<tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200/90 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
									<th className="py-3.5 px-4 w-12 text-center">
										<input
											type="checkbox"
											checked={allVisibleSelected}
											onChange={onToggleSelectAll}
											className="w-4 h-4 cursor-pointer accent-rose-600 rounded"
										/>
									</th>
									<th className="py-3.5 px-3 w-12 text-center">#</th>
									<th
										onClick={() => handleSortClick("head_name")}
										className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
									>
										<div className="flex items-center gap-1.5">
											<span>Chủ Hộ & Gia Đình</span>
											{sortField === "head_name" ? (
												sortDirection === "asc" ? (
													<ArrowUp className="w-3.5 h-3.5 text-rose-600" />
												) : (
													<ArrowDown className="w-3.5 h-3.5 text-rose-600" />
												)
											) : (
												<ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
											)}
										</div>
									</th>
									<th
										onClick={() => handleSortClick("village_name")}
										className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
									>
										<div className="flex items-center gap-1.5">
											<span>Thôn & Địa Chỉ</span>
											{sortField === "village_name" ? (
												sortDirection === "asc" ? (
													<ArrowUp className="w-3.5 h-3.5 text-rose-600" />
												) : (
													<ArrowDown className="w-3.5 h-3.5 text-rose-600" />
												)
											) : (
												<ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
											)}
										</div>
									</th>
									<th
										onClick={() => handleSortClick("member_count")}
										className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors text-center"
									>
										<div className="flex items-center justify-center gap-1.5">
											<span>Quy Mô Nhân Khẩu</span>
											{sortField === "member_count" ? (
												sortDirection === "asc" ? (
													<ArrowUp className="w-3.5 h-3.5 text-rose-600" />
												) : (
													<ArrowDown className="w-3.5 h-3.5 text-rose-600" />
												)
											) : (
												<ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
											)}
										</div>
									</th>
									<th
										onClick={() => handleSortClick("deleted_at")}
										className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
									>
										<div className="flex items-center gap-1.5">
											<span>Thời Điểm Xóa</span>
											{sortField === "deleted_at" ? (
												sortDirection === "asc" ? (
													<ArrowUp className="w-3.5 h-3.5 text-rose-600" />
												) : (
													<ArrowDown className="w-3.5 h-3.5 text-rose-600" />
												)
											) : (
												<ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
											)}
										</div>
									</th>
									<th className="py-3.5 px-4 text-right">Thao Tác</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
								{filteredAndSortedHouseholds.map((hh, idx) => {
									const stt = (page - 1) * limit + idx + 1;
									const isSelected = selectedIds.includes(hh.id);
									const initials = getInitials(hh.head_name || "");

									return (
										<tr
											key={hh.id}
											onClick={() => setInspectingHousehold(hh)}
											className={`hover:bg-rose-50/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group ${
												isSelected ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
											}`}
										>
											<td
												className="py-4 px-4 text-center"
												onClick={(e) => e.stopPropagation()}
											>
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() => onToggleSelect(hh.id)}
													className="w-4 h-4 cursor-pointer accent-rose-600 rounded"
												/>
											</td>
											<td className="py-4 px-3 text-center font-mono text-slate-400 font-semibold text-[11px]">
												{stt}
											</td>
											<td className="py-4 px-4">
												<div className="flex items-center gap-3">
													<div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 font-black text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
														{initials}
													</div>
													<div className="min-w-0">
														<div className="font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors text-sm flex items-center gap-2">
															<span className="truncate">{hh.head_name || "Chưa xác định"}</span>
															<span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
																Chủ hộ
															</span>
														</div>
														<div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
															{hh.notes || "Không có ghi chú"}
														</div>
													</div>
												</div>
											</td>
											<td className="py-4 px-4">
												<div className="space-y-1">
													<div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
														<MapPin className="w-3 h-3 text-emerald-600" />
														<span>{hh.village_name || "Chưa gán thôn"}</span>
													</div>
													<div className="text-[11px] text-slate-400 truncate max-w-[220px]">
														{hh.address || "—"}
													</div>
												</div>
											</td>
											<td className="py-4 px-4 text-center">
												<div className="inline-flex flex-col items-center">
													<span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs">
														{hh.memberCount} Nhân khẩu
													</span>
													{hh.memberCount > 0 && (
														<span className="text-[10px] text-slate-400 font-mono mt-1">
															{hh.maleCount} Nam • {hh.femaleCount} Nữ
														</span>
													)}
												</div>
											</td>
											<td className="py-4 px-4">
												<div className="space-y-0.5">
													<div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
														{hh.isValidDate ? hh.deletedDate?.toLocaleString("vi-VN") : "Đã xóa"}
													</div>
													<div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
														{hh.relativeTime}
													</div>
												</div>
											</td>
											<td
												className="py-4 px-4 text-right"
												onClick={(e) => e.stopPropagation()}
											>
												<div className="flex items-center justify-end gap-1.5">
													<button
														type="button"
														onClick={() => setInspectingHousehold(hh)}
														title="Xem chi tiết nhân khẩu"
														className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
													>
														<Eye className="w-4 h-4" />
													</button>
													<button
														type="button"
														onClick={() => onRestore(hh)}
														title="Khôi phục nguyên trạng hộ dân"
														className="h-8 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
													>
														<RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
														<span>Khôi Phục</span>
													</button>
													<button
														type="button"
														onClick={() => onHardDelete(hh)}
														title="Xóa vĩnh viễn khỏi CSDL"
														className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
													>
														<Trash2 className="w-4 h-4" />
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					<TablePagination
						itemCount={filteredAndSortedHouseholds.length}
						total={total}
						page={page}
						limit={limit}
						totalPages={totalPages}
						onPageChange={onPageChange}
						onLimitChange={onLimitChange}
					/>
				</div>
			) : (
				<div className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{filteredAndSortedHouseholds.map((hh) => {
							const isSelected = selectedIds.includes(hh.id);
							const initials = getInitials(hh.head_name || "");

							return (
								<div
									key={hh.id}
									onClick={() => setInspectingHousehold(hh)}
									className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-sm hover:shadow-xl hover:border-rose-500/80 transition-all cursor-pointer flex flex-col justify-between group space-y-4 ${
										isSelected
											? "border-rose-500 bg-rose-50/20 dark:bg-rose-950/10"
											: "border-slate-200/90 dark:border-slate-800"
									}`}
								>
									<div className="space-y-3">
										<div className="flex items-start justify-between gap-3">
											<div className="flex items-center gap-2.5 min-w-0">
												<div
													onClick={(e) => {
														e.stopPropagation();
														onToggleSelect(hh.id);
													}}
													className="p-1 cursor-pointer"
												>
													<input
														type="checkbox"
														checked={isSelected}
														onChange={() => onToggleSelect(hh.id)}
														className="w-4 h-4 cursor-pointer accent-rose-600 rounded"
													/>
												</div>
												<div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 font-black text-xs flex items-center justify-center shrink-0">
													{initials}
												</div>
												<div className="min-w-0">
													<h4 className="font-black text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors text-base truncate">
														{hh.head_name || "Chưa xác định"}
													</h4>
													<span className="text-[11px] text-slate-400 font-medium">
														{hh.village_name || "Chưa gán thôn"}
													</span>
												</div>
											</div>
										</div>

										<div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1.5">
											<div className="flex items-center justify-between">
												<span className="text-slate-400">Địa chỉ:</span>
												<span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
													{hh.address || "—"}
												</span>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-slate-400">Thời điểm xóa:</span>
												<span className="font-mono text-rose-600 dark:text-rose-400 font-bold">
													{hh.relativeTime}
												</span>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-slate-400">Quy mô:</span>
												<span className="font-bold text-slate-800 dark:text-slate-100">
													{hh.memberCount} nhân khẩu ({hh.maleCount} Nam • {hh.femaleCount} Nữ)
												</span>
											</div>
										</div>
									</div>

									<div
										className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
										onClick={(e) => e.stopPropagation()}
									>
										<button
											type="button"
											onClick={() => onRestore(hh)}
											className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
										>
											<RotateCcw className="w-3.5 h-3.5" />
											<span>Khôi Phục</span>
										</button>

										<button
											type="button"
											onClick={() => onHardDelete(hh)}
											className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
											title="Xóa vĩnh viễn"
										>
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								</div>
							);
						})}
					</div>

					<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
						<TablePagination
							itemCount={filteredAndSortedHouseholds.length}
							total={total}
							page={page}
							limit={limit}
							totalPages={totalPages}
							onPageChange={onPageChange}
							onLimitChange={onLimitChange}
						/>
					</div>
				</div>
			)}

			{selectedIds.length > 0 && (
				<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700/80 animate-in slide-in-from-bottom duration-200">
					<div className="text-xs font-bold flex items-center gap-2 pr-2 border-r border-slate-700">
						<span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
						<span>Đã chọn {selectedIds.length} hộ</span>
					</div>

					<button
						type="button"
						onClick={onBatchRestore}
						className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
					>
						<RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
						<span>Khôi Phục Tất Cả</span>
					</button>

					<button
						type="button"
						onClick={onBatchHardDelete}
						className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
					>
						<ShieldAlert className="w-3.5 h-3.5 stroke-[2.5]" />
						<span>Xóa Vĩnh Viễn</span>
					</button>

					<button
						type="button"
						onClick={onToggleSelectAll}
						className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
						title="Bỏ chọn"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{inspectingHousehold && (
				<div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in">
					<div
						className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity cursor-pointer"
						onClick={() => setInspectingHousehold(null)}
					/>

					<div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl h-full border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 animate-in slide-in-from-right duration-200">
						<div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
							<div className="flex items-center gap-3">
								<div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
									<Trash2 className="w-5 h-5" />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<h3 className="text-lg font-black text-slate-900 dark:text-white">
											Hộ: {inspectingHousehold.head_name}
										</h3>
										<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
											Đã xóa tạm
										</span>
									</div>
									<p className="text-xs text-slate-400">
										{inspectingHousehold.village_name || "Chưa gán thôn"} • {inspectingHousehold.address || "Chưa có địa chỉ"}
									</p>
								</div>
							</div>

							<button
								type="button"
								onClick={() => setInspectingHousehold(null)}
								className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
							<div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-3">
								<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
								<div className="text-xs text-amber-800 dark:text-amber-200">
									<p className="font-bold">Hộ gia đình này hiện đang nằm trong thùng rác</p>
									<p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-0.5">
										Thời điểm xóa: {inspectingHousehold.deleted_at ? new Date(inspectingHousehold.deleted_at).toLocaleString("vi-VN") : "Không rõ"}. Bạn có thể khôi phục nguyên trạng toàn bộ nhân khẩu hoặc xóa vĩnh viễn khỏi CSDL.
									</p>
								</div>
							</div>

							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
										Danh Sách Nhân Khẩu Trong Hộ ({inspectingHousehold.members?.length || inspectingHousehold.members_count || 0} người)
									</h4>
								</div>

								{(!inspectingHousehold.members || inspectingHousehold.members.length === 0) ? (
									<div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
										Không có thông tin chi tiết các thành viên nhân khẩu
									</div>
								) : (
									<div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
										<table className="w-full text-left border-collapse text-xs">
											<thead>
												<tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200/90 dark:border-slate-800">
													<th className="py-2.5 px-3 text-center w-10">#</th>
													<th className="py-2.5 px-3">Họ và Tên</th>
													<th className="py-2.5 px-3">Quan Hệ</th>
													<th className="py-2.5 px-2 text-center">Giới Tính</th>
													<th className="py-2.5 px-2 text-center">Năm Sinh</th>
													<th className="py-2.5 px-2 text-center">Tuổi</th>
													<th className="py-2.5 px-3">CCCD</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
												{inspectingHousehold.members.map((m, mIdx) => {
													const age = calculateAge(m.dob || m.dob_raw);
													return (
														<tr key={m.id || mIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
															<td className="py-2.5 px-3 text-center font-mono text-slate-400">
																{m.stt ?? mIdx + 1}
															</td>
															<td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
																<div className="flex items-center gap-1.5">
																	<span>{m.full_name}</span>
																	{m.is_head && (
																		<span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
																			Chủ hộ
																		</span>
																	)}
																</div>
															</td>
															<td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
																{m.relationship || (m.is_head ? "Chủ hộ" : "Thành viên")}
															</td>
															<td className="py-2.5 px-2 text-center">
																<span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
																	m.gender === "Nam"
																		? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300"
																		: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
																}`}>
																	{m.gender || "Nam"}
																</span>
															</td>
															<td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-300">
																{m.dob || m.dob_raw || "—"}
															</td>
															<td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
																{age > 0 ? age : "—"}
															</td>
															<td className="py-2.5 px-3 font-mono text-slate-500">
																{m.cccd_masked || m.cccd || "—"}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								)}
							</div>
						</div>

						<div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-end gap-3">
							<button
								type="button"
								onClick={() => {
									onHardDelete(inspectingHousehold);
									setInspectingHousehold(null);
								}}
								className="px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer"
							>
								Xóa Vĩnh Viễn
							</button>

							<button
								type="button"
								onClick={() => {
									onRestore(inspectingHousehold);
									setInspectingHousehold(null);
								}}
								className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
							>
								<RotateCcw className="w-4 h-4 stroke-[2.5]" />
								<span>Khôi Phục Hộ Này</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
