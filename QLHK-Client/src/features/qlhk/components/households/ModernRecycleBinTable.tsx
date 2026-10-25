import type React from "react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertTriangle,
	ArrowDown,
	ArrowLeft,
	ArrowUp,
	ArrowUpDown,
	Calendar,
	Check,
	ChevronRight,
	Clock,
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
import type { Household, Person, Village } from "@/types";
import { calculateAge } from "@/utils/date";
import { exportExcelWithDialog, loadXlsx } from "@/utils/fileExport";
import { normalizeUnaccented } from "@/utils/vietnamese";
import { TablePagination } from "@/components/common/TablePagination";
import { formatVietnameseNumber } from "@/components/common/tableStyles";
import { CustomSelect } from "@/components/common/CustomSelect";
import { CitizenModal } from "./CitizenModal";

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

type QuickFilter = "all" | "large_household" | "recent_7_days" | "expiring_soon";
type SortField = "deleted_at" | "head_name" | "member_count" | "village_name";
type SortDirection = "asc" | "desc";
type ViewMode = "table" | "grid";

const RETENTION_DAYS = 30;

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
	const [viewingCitizen, setViewingCitizen] = useState<Partial<Person> | null>(null);

	const enrichedHouseholds = useMemo(() => {
		const now = Date.now();
		return households.map((hh) => {
			const members = hh.members || [];
			const memberCount =
				members.length > 0 ? members.length : (hh.members_count || 0);
			const maleCount = members.filter((m) => m.gender === "Nam").length;
			const femaleCount = members.filter((m) => m.gender === "Nữ").length;

			const deletedDate = hh.deleted_at ? new Date(hh.deleted_at) : null;
			const isValidDate = deletedDate && !isNaN(deletedDate.getTime());

			let relativeTime = "Đã xóa";
			let daysRemaining = RETENTION_DAYS;
			let isExpiringSoon = false;

			if (isValidDate) {
				const diffDays = Math.floor(
					(now - deletedDate.getTime()) / (1000 * 60 * 60 * 24),
				);
				if (diffDays === 0) relativeTime = "Hôm nay";
				else if (diffDays === 1) relativeTime = "Hôm qua";
				else relativeTime = `${diffDays} ngày trước`;

				daysRemaining = Math.max(0, RETENTION_DAYS - diffDays);
				isExpiringSoon = daysRemaining <= 3;
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
				daysRemaining,
				isExpiringSoon,
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

	const expiringHouseholdsCount = useMemo(() => {
		return enrichedHouseholds.filter((h) => h.isValidDate && h.isExpiringSoon).length;
	}, [enrichedHouseholds]);

	const villageOptions = useMemo(() => {
		const set = new Set<string>();
		enrichedHouseholds.forEach((hh) => {
			if (hh.village_name) set.add(hh.village_name);
		});
		return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
	}, [enrichedHouseholds]);

	const villageSelectOptions = useMemo(() => {
		const opts = [{ value: "all", label: "Toàn xã (Tất cả thôn)" }];
		if (villages && villages.length > 0) {
			villages.forEach((v) => {
				opts.push({ value: v.id, label: v.name });
			});
		} else {
			villageOptions.forEach((v) => {
				opts.push({ value: v, label: v });
			});
		}
		return opts;
	}, [villages, villageOptions]);

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
					hh.village_name?.toLowerCase().trim() === selectedVillage.toLowerCase().trim() ||
					villages.find((v) => v.id === selectedVillage)?.name.toLowerCase().trim() === hh.village_name?.toLowerCase().trim(),
			);
		}

		if (quickFilter === "large_household") {
			list = list.filter((hh) => hh.memberCount >= 4);
		} else if (quickFilter === "recent_7_days") {
			const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
			list = list.filter(
				(hh) => hh.deletedDate && hh.deletedDate.getTime() >= sevenDaysAgo,
			);
		} else if (quickFilter === "expiring_soon") {
			list = list.filter((hh) => hh.isExpiringSoon);
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
		villages,
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

				<div
					className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-sm flex items-center justify-between hover:shadow-md transition-all ${
						expiringHouseholdsCount > 0
							? "border-rose-200 dark:border-rose-800/60 bg-rose-50/20 dark:bg-rose-950/20"
							: "border-slate-200/90 dark:border-slate-800"
					}`}
				>
					<div className="space-y-1">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
							<span>Hộ Chờ Xóa Quá Hạn</span>
							{expiringHouseholdsCount > 0 && (
								<span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
									Cần xử lý
								</span>
							)}
						</span>
						<div
							className={`text-2xl font-black font-mono ${
								expiringHouseholdsCount > 0
									? "text-rose-600 dark:text-rose-400"
									: "text-slate-900 dark:text-white"
							}`}
						>
							{expiringHouseholdsCount.toLocaleString()} Hộ
						</div>
						<div className="text-[11px] text-slate-400 font-medium">
							{expiringHouseholdsCount > 0
								? "Sắp hết hạn lưu trữ (còn ≤ 3 ngày)"
								: "Chưa có hộ nào sắp hết hạn lưu trữ"}
						</div>
					</div>
					<div
						className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
							expiringHouseholdsCount > 0
								? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400"
								: "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400"
						}`}
					>
						<AlertTriangle className="w-6 h-6" strokeWidth={1.75} />
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
							className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
						>
							<RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
							<span className="hidden sm:inline">Làm mới</span>
						</button>

						<button
							type="button"
							onClick={handleExportExcel}
							disabled={isExporting || households.length === 0}
							title="Xuất bảng thùng rác ra file Excel"
							className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
						>
							<Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
							<span className="hidden sm:inline">Xuất Excel</span>
						</button>

						<div className="h-10 flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
							<button
								type="button"
								onClick={() => setViewMode("table")}
								title="Chế độ bảng chi tiết"
								className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
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
								className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
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
							className="w-full h-10 min-h-[40px] pl-10 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
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
						<div className="w-56 shrink-0">
							<CustomSelect
								variant="filter"
								size="sm"
								value={selectedVillage}
								onChange={(val) => setSelectedVillage(String(val))}
								options={villageSelectOptions}
								placeholder="Toàn xã (Tất cả thôn)"
								className="!h-10 rounded-xl text-xs font-bold"
								containerClassName="w-full"
							/>
						</div>

						<div className="flex items-center gap-1.5 flex-wrap">
							<button
								type="button"
								onClick={() => setQuickFilter("all")}
								className={`h-10 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
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
								className={`h-10 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
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
								className={`h-10 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
									quickFilter === "recent_7_days"
										? "bg-rose-600 text-white shadow-xs"
										: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
								}`}
							>
								7 ngày gần nhất
							</button>
							{expiringHouseholdsCount > 0 && (
								<button
									type="button"
									onClick={() => setQuickFilter("expiring_soon")}
									className={`h-10 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
										quickFilter === "expiring_soon"
											? "bg-red-600 text-white shadow-xs"
											: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100"
									}`}
								>
									<AlertTriangle className="w-3.5 h-3.5" />
									<span>Sắp hết hạn ({expiringHouseholdsCount})</span>
								</button>
							)}
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
							<tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
								{filteredAndSortedHouseholds.map((hh, idx) => {
									const isSelected = selectedIds.includes(hh.id);
									return (
										<tr
											key={hh.id}
											onClick={() => setInspectingHousehold(hh)}
											className={`transition-colors cursor-pointer ${
												isSelected
													? "bg-rose-50/70 dark:bg-rose-950/30"
													: "hover:bg-slate-50/90 dark:hover:bg-slate-800/50"
											}`}
										>
											<td
												className="py-3.5 px-4 text-center"
												onClick={(e) => e.stopPropagation()}
											>
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() => onToggleSelect(hh.id)}
													className="w-4 h-4 cursor-pointer accent-rose-600 rounded"
												/>
											</td>
											<td className="py-3.5 px-3 text-center font-mono text-slate-400">
												{(page - 1) * limit + idx + 1}
											</td>
											<td className="py-3.5 px-4">
												<div className="flex items-center gap-3">
													<div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center font-black text-xs shrink-0">
														{getInitials(hh.head_name || "")}
													</div>
													<div>
														<div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
															<span>{hh.head_name || "Chưa có tên chủ hộ"}</span>
															{hh.isExpiringSoon && (
																<span className="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
																	Còn {hh.daysRemaining} ngày
																</span>
															)}
														</div>
														{hh.notes && (
															<div className="text-[11px] text-slate-400 line-clamp-1 italic max-w-xs">
																{hh.notes}
															</div>
														)}
													</div>
												</div>
											</td>
											<td className="py-3.5 px-4">
												<div className="space-y-0.5">
													<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
														{hh.village_name || "Chưa gán thôn"}
													</span>
													<div className="text-[11px] text-slate-400 truncate max-w-xs">
														{hh.address || "Chưa cập nhật địa chỉ"}
													</div>
												</div>
											</td>
											<td className="py-3.5 px-4 text-center">
												<div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs">
													<Users className="w-3.5 h-3.5 text-slate-400" />
													<span>{hh.memberCount} khẩu</span>
												</div>
												<div className="text-[10px] text-slate-400 mt-0.5">
													{hh.maleCount} Nam • {hh.femaleCount} Nữ
												</div>
											</td>
											<td className="py-3.5 px-4">
												<div className="flex flex-col">
													<span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
														{hh.relativeTime}
													</span>
													<span className="text-[11px] text-slate-400 font-mono">
														{hh.isValidDate
															? hh.deletedDate?.toLocaleTimeString("vi-VN", {
																	hour: "2-digit",
																	minute: "2-digit",
																	day: "2-digit",
																	month: "2-digit",
																	year: "numeric",
																})
															: "—"}
													</span>
												</div>
											</td>
											<td
												className="py-3.5 px-4 text-right"
												onClick={(e) => e.stopPropagation()}
											>
												<div className="flex items-center justify-end gap-1.5">
													<button
														type="button"
														onClick={() => setInspectingHousehold(hh)}
														title="Xem chi tiết hồ sơ hộ"
														className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
													>
														<Eye className="w-4 h-4" />
													</button>

													<button
														type="button"
														onClick={() => onRestore(hh)}
														title="Khôi phục lại hộ gia đình này"
														className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1 cursor-pointer"
													>
														<RotateCcw className="w-3.5 h-3.5" />
														<span>Khôi phục</span>
													</button>

													<button
														type="button"
														onClick={() => onHardDelete(hh)}
														title="Xóa vĩnh viễn"
														className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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

					<div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
						<TablePagination
							page={page}
							totalPages={totalPages}
							limit={limit}
							total={total}
							itemCount={filteredAndSortedHouseholds.length}
							onPageChange={onPageChange}
							onLimitChange={onLimitChange}
						/>
					</div>
				</div>
			) : (
				<div className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{filteredAndSortedHouseholds.map((hh) => {
							const isSelected = selectedIds.includes(hh.id);
							return (
								<div
									key={hh.id}
									onClick={() => setInspectingHousehold(hh)}
									className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border transition-all cursor-pointer shadow-xs hover:shadow-md space-y-4 ${
										isSelected
											? "border-rose-500 dark:border-rose-500 ring-2 ring-rose-500/20"
											: "border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
									}`}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center font-black text-sm shrink-0">
												{getInitials(hh.head_name || "")}
											</div>
											<div>
												<div className="flex items-center gap-1.5">
													<h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
														{hh.head_name || "Chưa có tên"}
													</h4>
													{hh.isExpiringSoon && (
														<span className="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
															Còn {hh.daysRemaining} ngày
														</span>
													)}
												</div>
												<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mt-0.5">
													{hh.village_name || "Chưa gán thôn"}
												</span>
											</div>
										</div>

										<div
											onClick={(e) => e.stopPropagation()}
											className="flex items-center gap-1"
										>
											<input
												type="checkbox"
												checked={isSelected}
												onChange={() => onToggleSelect(hh.id)}
												className="w-4 h-4 cursor-pointer accent-rose-600 rounded"
											/>
										</div>
									</div>

									<div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
										<div className="flex items-center gap-2">
											<MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
											<span className="truncate">{hh.address || "Chưa cập nhật địa chỉ"}</span>
										</div>
										<div className="flex items-center gap-2">
											<Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
											<span>
												Xóa: {hh.relativeTime} (
												{hh.isValidDate
													? hh.deletedDate?.toLocaleDateString("vi-VN")
													: "—"}
												)
											</span>
										</div>
									</div>

									<div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
										<div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
											<Users className="w-4 h-4 text-slate-400" />
											<span>{hh.memberCount} thành viên</span>
										</div>

										<div
											onClick={(e) => e.stopPropagation()}
											className="flex items-center gap-1.5"
										>
											<button
												type="button"
												onClick={() => onRestore(hh)}
												className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1 cursor-pointer"
											>
												<RotateCcw className="w-3.5 h-3.5" />
												<span>Khôi phục</span>
											</button>

											<button
												type="button"
												onClick={() => onHardDelete(hh)}
												className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
												title="Xóa vĩnh viễn"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>

					<div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-sm">
						<TablePagination
							page={page}
							totalPages={totalPages}
							limit={limit}
							total={total}
							itemCount={filteredAndSortedHouseholds.length}
							onPageChange={onPageChange}
							onLimitChange={onLimitChange}
						/>
					</div>
				</div>
			)}

			{selectedIds.length > 0 &&
				createPortal(
					<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[900] bg-slate-900 dark:bg-slate-800 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom duration-200 select-none">
						<div className="flex items-center gap-2 pr-2 border-r border-slate-700">
							<span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
							<span className="text-xs font-bold">
								Đã chọn {selectedIds.length} hộ
							</span>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={onBatchRestore}
								className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
							>
								<RotateCcw className="w-3.5 h-3.5" />
								<span>Khôi phục hàng loạt</span>
							</button>

							<button
								type="button"
								onClick={onBatchHardDelete}
								className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
							>
								<Trash2 className="w-3.5 h-3.5" />
								<span>Xóa vĩnh viễn ({selectedIds.length})</span>
							</button>
						</div>

						<button
							type="button"
							onClick={onToggleSelectAll}
							className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
							title="Bỏ chọn"
						>
							<X className="w-4 h-4" />
						</button>
					</div>,
					document.body,
				)}

			{inspectingHousehold &&
				createPortal(
					<div className="fixed inset-0 z-[1000] select-none" role="presentation">
						<div
							className="fixed inset-0 w-screen h-screen h-[100dvh] bg-slate-950/60 backdrop-blur-xs transition-opacity cursor-pointer z-[1001]"
							onClick={() => setInspectingHousehold(null)}
							aria-hidden="true"
						/>

						<div
							className="fixed top-0 right-0 bottom-0 w-full max-w-2xl h-screen h-[100dvh] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-[1002] animate-in slide-in-from-right duration-200"
							role="dialog"
							aria-modal="true"
							aria-labelledby="recycle-bin-drawer-title"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/70 shrink-0">
								<div className="flex items-center gap-3">
									<div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
										<Trash2 className="w-5 h-5" />
									</div>
									<div>
										<div className="flex items-center gap-2">
											<h3
												id="recycle-bin-drawer-title"
												className="text-lg font-black text-slate-900 dark:text-white"
											>
												Hộ: {inspectingHousehold.head_name}
											</h3>
											<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
												Đã xóa tạm
											</span>
										</div>
										<p className="text-xs text-slate-400">
											{inspectingHousehold.village_name || "Chưa gán thôn"} •{" "}
											{inspectingHousehold.address || "Chưa có địa chỉ"}
										</p>
									</div>
								</div>

								<button
									type="button"
									onClick={() => setInspectingHousehold(null)}
									aria-label="Đóng chi tiết"
									className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
								>
									<X className="w-5 h-5" />
								</button>
							</div>

							<div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6">
								<div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-3">
									<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
									<div className="text-xs text-amber-800 dark:text-amber-200">
										<p className="font-bold">
											Hộ gia đình này hiện đang nằm trong thùng rác
										</p>
										<p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-0.5">
											Thời điểm xóa:{" "}
											{inspectingHousehold.deleted_at
												? new Date(inspectingHousehold.deleted_at).toLocaleString("vi-VN")
												: "Không rõ"}
											. Chính sách lưu trữ {RETENTION_DAYS} ngày trước khi tự động dọn dẹp vĩnh viễn.
										</p>
									</div>
								</div>

								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
											Danh Sách Nhân Khẩu Trong Hộ (
											{inspectingHousehold.members?.length ||
												inspectingHousehold.members_count ||
												0}{" "}
											người)
										</h4>
										<span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
											Bấm vào dòng để xem chi tiết
										</span>
									</div>

									{!inspectingHousehold.members ||
									inspectingHousehold.members.length === 0 ? (
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
															<tr
																key={m.id || mIdx}
																onClick={() => setViewingCitizen(m)}
																title="Bấm để xem thông tin chi tiết nhân khẩu"
																className="hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-colors group"
															>
																<td className="py-2.5 px-3 text-center font-mono text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
																	{m.stt ?? mIdx + 1}
																</td>
																<td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
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
																	{m.relationship ||
																		(m.is_head ? "Chủ hộ" : "Thành viên")}
																</td>
																<td className="py-2.5 px-2 text-center">
																	<span
																		className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
																			m.gender === "Nam"
																				? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300"
																				: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
																		}`}
																	>
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

							<div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 flex items-center justify-end gap-3 shrink-0">
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
					</div>,
					document.body,
				)}

			<CitizenModal
				isOpen={Boolean(viewingCitizen)}
				initialMember={viewingCitizen}
				existingMembers={inspectingHousehold?.members}
				onClose={() => setViewingCitizen(null)}
				readOnly={true}
				zIndex={1100}
			/>
		</div>
	);
};
