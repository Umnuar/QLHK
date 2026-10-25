import type React from "react";
import { useMemo, useState } from "react";
import {
	ArrowDown,
	ArrowRight,
	ArrowUp,
	ArrowUpDown,
	Check,
	ChevronRight,
	Download,
	Edit3,
	ExternalLink,
	Eye,
	Globe,
	Home,
	LayoutGrid,
	LayoutList,
	MapPin,
	Plus,
	RefreshCw,
	Search,
	Shield,
	Trash2,
	UserCheck,
	UserPlus,
	Users,
	UserX,
	X,
} from "lucide-react";
import type {
	AnalyticsOverviewData,
	VillageAnalyticsRow,
} from "@/api/analyticsApi";
import type { User, Village } from "@/types";
import { exportExcelWithDialog, loadXlsx } from "@/utils/fileExport";
import { normalizeUnaccented } from "@/utils/vietnamese";

export interface ModernVillageTableProps {
	villages: Village[];
	villageStats: Record<string, VillageAnalyticsRow>;
	overview: AnalyticsOverviewData | null;
	userList: User[];
	isAdmin: boolean;
	onSelectVillage: (id: string, destination: "households" | "analytics") => void;
	onCreateVillage: (name: string, code?: string, officerId?: string) => Promise<void>;
	onUpdateVillage: (id: string, name: string, code?: string, officerId?: string) => Promise<void>;
	onDeleteVillage: (id: string, name: string) => void;
	onRefresh: () => Promise<void>;
}

type FilterType = "all" | "assigned" | "unassigned" | "high_dtts" | "large_household";
type SortField = "name" | "household_count" | "citizen_count" | "dtts_percentage";
type SortDirection = "asc" | "desc";
type ViewMode = "table" | "grid";

export const ModernVillageTable: React.FC<ModernVillageTableProps> = ({
	villages,
	villageStats,
	overview,
	userList,
	isAdmin,
	onSelectVillage,
	onCreateVillage,
	onUpdateVillage,
	onDeleteVillage,
	onRefresh,
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [filterType, setFilterType] = useState<FilterType>("all");
	const [sortField, setSortField] = useState<SortField>("household_count");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
	const [viewMode, setViewMode] = useState<ViewMode>("table");
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isExporting, setIsExporting] = useState(false);

	const [inspectingVillageId, setInspectingVillageId] = useState<string | null>(null);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editingVillage, setEditingVillage] = useState<Village | null>(null);

	const [formName, setFormName] = useState("");
	const [formCode, setFormCode] = useState("");
	const [formOfficerId, setFormOfficerId] = useState("");
	const [formSubmitting, setFormSubmitting] = useState(false);
	const [formError, setFormError] = useState("");

	const totalHouseholds = overview?.totalHouseholds ?? 0;
	const totalCitizens = overview?.totalCitizens ?? 0;
	const avgSize = overview?.averageHouseholdSize ?? 0;
	const maleCount = overview?.gender?.male?.count ?? 0;
	const malePct = overview?.gender?.male?.percentage ?? 0;
	const femaleCount = overview?.gender?.female?.count ?? 0;
	const femalePct = overview?.gender?.female?.percentage ?? 0;

	const dttsCount = overview?.ethnicities
		? overview.ethnicities
				.filter((e) => e.name.toLowerCase().trim() !== "kinh")
				.reduce((sum, e) => sum + e.count, 0)
		: 0;
	const dttsPercentage =
		totalCitizens > 0 ? ((dttsCount / totalCitizens) * 100).toFixed(1) : "0.0";

	const enrichedVillages = useMemo(() => {
		return villages.map((v, index) => {
			const vStat =
				villageStats[v.id] ||
				villageStats[v.short_code] ||
				villageStats[v.name] ||
				villageStats[v.name.toLowerCase().trim()] ||
				villageStats[normalizeUnaccented(v.name.toLowerCase().trim())];

			const householdCount = vStat?.household_count ?? 0;
			const citizenCount = vStat?.citizen_count ?? 0;
			const male = vStat?.male_count ?? 0;
			const female = vStat?.female_count ?? 0;
			const dtts = vStat?.dtts_count ?? 0;
			const dttsPct =
				vStat?.dtts_percentage ??
				(citizenCount > 0 ? Math.round((dtts / citizenCount) * 1000) / 10 : 0);

			const householdShare =
				totalHouseholds > 0
					? Math.round((householdCount / totalHouseholds) * 1000) / 10
					: 0;

			const avgHousehold =
				householdCount > 0 ? (citizenCount / householdCount).toFixed(1) : "0.0";

			const assignedOfficer =
				userList.find((u) => u.village_id === v.id && u.role === "user") ||
				userList.find((u) => u.village_id === v.id);

			const chucthoTotal = vStat?.chuctho?.total ?? 0;
			const htxhTotal = vStat?.htxh?.total ?? 0;
			const policyTotal = chucthoTotal + htxhTotal;

			return {
				...v,
				index: index + 1,
				stat: vStat,
				householdCount,
				citizenCount,
				male,
				female,
				dtts,
				dttsPct,
				householdShare,
				avgHousehold,
				assignedOfficer,
				policyTotal,
				chucthoTotal,
				htxhTotal,
			};
		});
	}, [villages, villageStats, totalHouseholds, totalCitizens, userList]);

	const assignedVillagesCount = useMemo(() => {
		return enrichedVillages.filter((v) => Boolean(v.assignedOfficer)).length;
	}, [enrichedVillages]);

	const filteredAndSortedVillages = useMemo(() => {
		let list = enrichedVillages;

		if (searchTerm.trim()) {
			const normalizedTerm = normalizeUnaccented(searchTerm.toLowerCase().trim());
			list = list.filter((v) => {
				const matchName = normalizeUnaccented(v.name.toLowerCase()).includes(normalizedTerm);
				const matchCode = normalizeUnaccented((v.short_code || "").toLowerCase()).includes(normalizedTerm);
				const matchOfficer = v.assignedOfficer
					? normalizeUnaccented(
							(v.assignedOfficer.full_name || v.assignedOfficer.username).toLowerCase(),
						).includes(normalizedTerm)
					: false;
				return matchName || matchCode || matchOfficer;
			});
		}

		if (filterType === "assigned") {
			list = list.filter((v) => Boolean(v.assignedOfficer));
		} else if (filterType === "unassigned") {
			list = list.filter((v) => !v.assignedOfficer);
		} else if (filterType === "high_dtts") {
			list = list.filter((v) => v.dttsPct >= 50);
		} else if (filterType === "large_household") {
			list = list.filter((v) => v.householdCount >= 100);
		}

		return [...list].sort((a, b) => {
			let diff = 0;
			if (sortField === "name") {
				diff = a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
			} else if (sortField === "household_count") {
				diff = a.householdCount - b.householdCount;
			} else if (sortField === "citizen_count") {
				diff = a.citizenCount - b.citizenCount;
			} else if (sortField === "dtts_percentage") {
				diff = a.dttsPct - b.dttsPct;
			}
			return sortDirection === "asc" ? diff : -diff;
		});
	}, [enrichedVillages, searchTerm, filterType, sortField, sortDirection]);

	const inspectingVillage = useMemo(() => {
		if (!inspectingVillageId) return null;
		return enrichedVillages.find((v) => v.id === inspectingVillageId) || null;
	}, [inspectingVillageId, enrichedVillages]);

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

	const openCreateModal = () => {
		setFormName("");
		setFormCode("");
		setFormOfficerId("");
		setFormError("");
		setIsCreateModalOpen(true);
	};

	const openEditModal = (v: Village) => {
		const assigned =
			userList.find((u) => u.village_id === v.id && u.role === "user") ||
			userList.find((u) => u.village_id === v.id);
		setEditingVillage(v);
		setFormName(v.name);
		setFormCode(v.short_code || "");
		setFormOfficerId(assigned ? assigned.id : "");
		setFormError("");
	};

	const handleSaveForm = async () => {
		if (!formName.trim()) {
			setFormError("Vui lòng nhập tên thôn");
			return;
		}

		setFormSubmitting(true);
		setFormError("");
		try {
			if (editingVillage) {
				await onUpdateVillage(
					editingVillage.id,
					formName.trim(),
					formCode.trim() || undefined,
					formOfficerId || undefined,
				);
				setEditingVillage(null);
			} else {
				await onCreateVillage(
					formName.trim(),
					formCode.trim() || undefined,
					formOfficerId || undefined,
				);
				setIsCreateModalOpen(false);
			}
		} catch (err: any) {
			setFormError(err.message || "Có lỗi xảy ra khi lưu thôn");
		} finally {
			setFormSubmitting(false);
		}
	};

	const handleExportExcel = async () => {
		setIsExporting(true);
		try {
			const XLSX = await loadXlsx();
			const rows = filteredAndSortedVillages.map((v, idx) => ({
				"STT": idx + 1,
				"Tên Thôn": v.name,
				"Mã Thôn": v.short_code || `TH-${idx + 1}`,
				"Cán Bộ Phụ Trách": v.assignedOfficer
					? v.assignedOfficer.full_name || v.assignedOfficer.username
					: "Chưa phân công",
				"Số Hộ Gia Đình": v.householdCount,
				"Tỷ Trọng Hộ Toàn Xã (%)": `${v.householdShare}%`,
				"Số Nhân Khẩu": v.citizenCount,
				"Bình Quân (Người/Hộ)": v.avgHousehold,
				"Nam (Người)": v.male,
				"Nữ (Người)": v.female,
				"Đồng Bào DTTS (Người)": v.dtts,
				"Tỷ Lệ DTTS (%)": `${v.dttsPct}%`,
				"Chính Sách Chúc Thọ": v.chucthoTotal,
				"Bảo Trợ Xã Hội": v.htxhTotal,
			}));

			const worksheet = XLSX.utils.json_to_sheet(rows);
			const workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachThon");
			const nowStr = new Date().toISOString().slice(0, 10);
			await exportExcelWithDialog(workbook, `Danh_Sach_Thon_Dak_Ha_${nowStr}.xlsx`);
		} finally {
			setIsExporting(false);
		}
	};

	const getInitials = (name: string) => {
		if (!name) return "CB";
		const parts = name.trim().split(/\s+/);
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	};

	return (
		<div className="space-y-6 animate-in fade-in pb-10">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
					<div className="space-y-1">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Địa Bàn Quản Lý
						</span>
						<div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
							{villages.length} Thôn
						</div>
						<div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
							<UserCheck className="w-3.5 h-3.5" />
							<span>{assignedVillagesCount}/{villages.length} thôn có cán bộ</span>
						</div>
					</div>
					<div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center shrink-0">
						<MapPin className="w-6 h-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
					<div className="space-y-1">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Tổng Hộ Gia Đình
						</span>
						<div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
							{totalHouseholds.toLocaleString()} Hộ
						</div>
						<div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
							Bình quân: <strong className="font-bold text-slate-700 dark:text-slate-300">{avgSize}</strong> người/hộ
						</div>
					</div>
					<div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center shrink-0">
						<Home className="w-6 h-6 text-indigo-600 dark:text-indigo-400" strokeWidth={1.75} />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
					<div className="space-y-1">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Tổng Nhân Khẩu
						</span>
						<div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
							{totalCitizens.toLocaleString()} Người
						</div>
						<div className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
							Nam: {maleCount} ({malePct}%) • Nữ: {femaleCount} ({femalePct}%)
						</div>
					</div>
					<div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/40 flex items-center justify-center shrink-0">
						<Users className="w-6 h-6 text-sky-600 dark:text-sky-400" strokeWidth={1.75} />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
					<div className="space-y-1">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Dân Tộc Thiểu Số
						</span>
						<div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
							{dttsPercentage}%
						</div>
						<div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
							{dttsCount.toLocaleString()} / {totalCitizens.toLocaleString()} nhân khẩu
						</div>
					</div>
					<div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/40 flex items-center justify-center shrink-0">
						<Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" strokeWidth={1.75} />
					</div>
				</div>
			</div>

			<div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
				<div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
							<Shield className="w-5 h-5" strokeWidth={2} />
						</div>
						<div>
							<h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
								<span>Bảng Quản Lý Thôn & Địa Bàn Dân Cư</span>
								<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
									UI Mới
								</span>
							</h3>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Hiển thị {filteredAndSortedVillages.length}/{villages.length} thôn • Quản lý quy mô hộ gia đình, nhân khẩu và phân công cán bộ
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end">
						<button
							type="button"
							onClick={handleRefreshClick}
							disabled={isRefreshing}
							title="Làm mới dữ liệu thống kê"
							className="h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
						>
							<RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
							<span className="hidden sm:inline">Làm mới</span>
						</button>

						<button
							type="button"
							onClick={handleExportExcel}
							disabled={isExporting}
							title="Xuất bảng thống kê danh sách thôn ra Excel"
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
										? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
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
										? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
										: "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
								}`}
							>
								<LayoutGrid className="w-4 h-4" />
							</button>
						</div>

						{isAdmin && (
							<button
								type="button"
								onClick={openCreateModal}
								className="h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
							>
								<Plus className="w-4 h-4 stroke-[2.5]" />
								<span>Thêm Thôn</span>
							</button>
						)}
					</div>
				</div>

				<div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
					<div className="relative flex-1 max-w-md">
						<Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="Tìm tên thôn, mã thôn, tên cán bộ phụ trách..."
							className="w-full h-[42px] min-h-[42px] pl-10 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
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

					<div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 md:pb-0">
						<button
							type="button"
							onClick={() => setFilterType("all")}
							className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
								filterType === "all"
									? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
									: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
						>
							Tất cả ({villages.length})
						</button>
						<button
							type="button"
							onClick={() => setFilterType("assigned")}
							className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
								filterType === "assigned"
									? "bg-emerald-600 text-white shadow-xs"
									: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
						>
							Đã có cán bộ ({assignedVillagesCount})
						</button>
						<button
							type="button"
							onClick={() => setFilterType("unassigned")}
							className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
								filterType === "unassigned"
									? "bg-amber-600 text-white shadow-xs"
									: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
						>
							Chưa phân công ({villages.length - assignedVillagesCount})
						</button>
						<button
							type="button"
							onClick={() => setFilterType("high_dtts")}
							className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
								filterType === "high_dtts"
									? "bg-purple-600 text-white shadow-xs"
									: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
						>
							DTTS ≥ 50%
						</button>
						<button
							type="button"
							onClick={() => setFilterType("large_household")}
							className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
								filterType === "large_household"
									? "bg-indigo-600 text-white shadow-xs"
									: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
						>
							Quy mô lớn (≥100 hộ)
						</button>
					</div>
				</div>
			</div>

			{filteredAndSortedVillages.length === 0 ? (
				<div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
					<div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
						<Search className="w-6 h-6" />
					</div>
					<h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
						Không tìm thấy thôn nào phù hợp
					</h4>
					<p className="text-xs text-slate-400 max-w-sm mx-auto">
						Thử thay đổi từ khóa tìm kiếm hoặc bấm &quot;Tất cả&quot; để hiển thị lại toàn bộ danh sách thôn.
					</p>
					<button
						type="button"
						onClick={() => {
							setSearchTerm("");
							setFilterType("all");
						}}
						className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
					>
						Đặt lại bộ lọc
					</button>
				</div>
			) : viewMode === "table" ? (
				<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full text-left text-xs border-collapse">
							<thead>
								<tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200/90 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
									<th className="py-3.5 px-4 w-14 text-center">#</th>
									<th
										onClick={() => handleSortClick("name")}
										className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
									>
										<div className="flex items-center gap-1.5">
											<span>Thôn / Địa Bàn</span>
											{sortField === "name" ? (
												sortDirection === "asc" ? (
													<ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
												) : (
													<ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
												)
											) : (
												<ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
											)}
										</div>
									</th>
									<th className="py-3.5 px-4">Cán Bộ Phụ Trách</th>
									<th
										onClick={() => handleSortClick("household_count")}
										className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
									>
										<div className="flex items-center gap-1.5">
											<span>Hộ Gia Đình</span>
											{sortField === "household_count" ? (
												sortDirection === "asc" ? (
													<ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
												) : (
													<ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
												)
											) : (
												<ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
											)}
										</div>
									</th>
									<th
										onClick={() => handleSortClick("citizen_count")}
										className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
									>
										<div className="flex items-center gap-1.5">
											<span>Nhân Khẩu</span>
											{sortField === "citizen_count" ? (
												sortDirection === "asc" ? (
													<ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
												) : (
													<ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
												)
											) : (
												<ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
											)}
										</div>
									</th>
									<th
										onClick={() => handleSortClick("dtts_percentage")}
										className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
									>
										<div className="flex items-center gap-1.5">
											<span>DTTS & Giới Tính</span>
											{sortField === "dtts_percentage" ? (
												sortDirection === "asc" ? (
													<ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
												) : (
													<ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
												)
											) : (
												<ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />
											)}
										</div>
									</th>
									<th className="py-3.5 px-4 text-center">Chính Sách An Sinh</th>
									<th className="py-3.5 px-4 text-right">Thao Tác</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
								{filteredAndSortedVillages.map((v, idx) => {
									const officer = v.assignedOfficer;
									const initials = getInitials(officer?.full_name || officer?.username || "");

									return (
										<tr
											key={v.id}
											onClick={() => setInspectingVillageId(v.id)}
											className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
										>
											<td className="py-4 px-4 text-center font-mono text-slate-400 font-semibold text-[11px]">
												{idx + 1}
											</td>
											<td className="py-4 px-4">
												<div className="flex items-center gap-3">
													<div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
														<MapPin className="w-4 h-4" />
													</div>
													<div className="min-w-0">
														<div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-sm flex items-center gap-2">
															<span className="truncate">{v.name}</span>
															{v.short_code && (
																<span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
																	{v.short_code}
																</span>
															)}
														</div>
														<div className="text-[11px] text-slate-400 font-medium">
															Địa bàn Xã Đăk Hà
														</div>
													</div>
												</div>
											</td>
											<td className="py-4 px-4">
												{officer ? (
													<div className="flex items-center gap-2.5">
														<div className="w-7 h-7 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-xs">
															{initials}
														</div>
														<div className="min-w-0">
															<div className="font-bold text-slate-800 dark:text-slate-200 truncate">
																{officer.full_name || officer.username}
															</div>
															<div className="text-[10px] text-slate-400 font-mono">
																@{officer.username}
															</div>
														</div>
													</div>
												) : (
													<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60">
														<UserX className="w-3 h-3" />
														<span>Chưa phân công</span>
													</span>
												)}
											</td>
											<td className="py-4 px-4">
												<div className="space-y-1">
													<div className="flex items-baseline gap-1.5">
														<span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
															{v.householdCount.toLocaleString()}
														</span>
														<span className="text-[11px] text-slate-400">hộ</span>
														<span className="text-[10px] font-mono font-semibold text-slate-400 ml-auto">
															{v.householdShare}%
														</span>
													</div>
													<div className="w-28 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
														<div
															className="h-full bg-emerald-500 rounded-full"
															style={{ width: `${Math.min(100, Math.max(4, v.householdShare * 3))}%` }}
														/>
													</div>
												</div>
											</td>
											<td className="py-4 px-4">
												<div className="space-y-0.5">
													<div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
														{v.citizenCount.toLocaleString()} <span className="text-[11px] text-slate-400 font-normal">người</span>
													</div>
													<div className="text-[11px] text-slate-400">
														BQ: <strong className="text-slate-600 dark:text-slate-300">{v.avgHousehold}</strong> ng/hộ
													</div>
												</div>
											</td>
											<td className="py-4 px-4">
												<div className="space-y-1">
													<div className="flex items-center gap-1.5">
														<span
															className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
																v.dttsPct >= 50
																	? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
																	: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
															}`}
														>
															{v.dttsPct}% DTTS
														</span>
														<span className="text-[11px] font-mono text-slate-400">
															({v.dtts} ng)
														</span>
													</div>
													<div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
														<span className="text-sky-600 dark:text-sky-400 font-semibold">{v.male} Nam</span>
														<span>•</span>
														<span className="text-rose-500 dark:text-rose-400 font-semibold">{v.female} Nữ</span>
													</div>
												</div>
											</td>
											<td className="py-4 px-4 text-center">
												{v.policyTotal > 0 ? (
													<div className="inline-flex flex-col items-center">
														<span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
															{v.policyTotal} hồ sơ
														</span>
														<span className="text-[10px] text-slate-400 mt-0.5">
															{v.chucthoTotal} Thọ • {v.htxhTotal} HTXH
														</span>
													</div>
												) : (
													<span className="text-slate-400 text-[11px] italic">—</span>
												)}
											</td>
											<td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
												<div className="flex items-center justify-end gap-1">
													<button
														type="button"
														onClick={() => onSelectVillage(v.id, "households")}
														title="Xem danh sách hộ gia đình thôn này"
														className="p-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
													>
														<Home className="w-4 h-4" />
													</button>
													<button
														type="button"
														onClick={() => onSelectVillage(v.id, "analytics")}
														title="Xem báo cáo thống kê thôn này"
														className="p-1.5 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
													>
														<ExternalLink className="w-4 h-4" />
													</button>
													{isAdmin && (
														<>
															<button
																type="button"
																onClick={() => openEditModal(v)}
																title="Chỉnh sửa thông tin thôn"
																className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
															>
																<Edit3 className="w-4 h-4" />
															</button>
															<button
																type="button"
																onClick={() => onDeleteVillage(v.id, v.name)}
																title="Xóa thôn"
																className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
															>
																<Trash2 className="w-4 h-4" />
															</button>
														</>
													)}
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{filteredAndSortedVillages.map((v) => {
						const officer = v.assignedOfficer;
						const initials = getInitials(officer?.full_name || officer?.username || "");

						return (
							<div
								key={v.id}
								onClick={() => setInspectingVillageId(v.id)}
								className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-500/80 transition-all cursor-pointer flex flex-col justify-between group space-y-4"
							>
								<div className="space-y-3">
									<div className="flex items-start justify-between gap-2">
										<div className="flex items-center gap-2.5 min-w-0">
											<div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-center shrink-0">
												<MapPin className="w-5 h-5" />
											</div>
											<div className="min-w-0">
												<h4 className="font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-base truncate">
													{v.name}
												</h4>
												<span className="text-[11px] text-slate-400 font-medium">
													{v.short_code ? `Mã: ${v.short_code}` : "Địa bàn Xã Đăk Hà"}
												</span>
											</div>
										</div>

										{isAdmin && (
											<div
												className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
												onClick={(e) => e.stopPropagation()}
											>
												<button
													type="button"
													onClick={() => openEditModal(v)}
													className="p-1 text-slate-400 hover:text-emerald-600 rounded-lg cursor-pointer"
												>
													<Edit3 className="w-3.5 h-3.5" />
												</button>
												<button
													type="button"
													onClick={() => onDeleteVillage(v.id, v.name)}
													className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</div>
										)}
									</div>

									<div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
										<div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
											Cán bộ phụ trách
										</div>
										{officer ? (
											<div className="flex items-center gap-2">
												<div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
													{initials}
												</div>
												<span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
													{officer.full_name || officer.username}
												</span>
											</div>
										) : (
											<span className="text-xs text-amber-600 dark:text-amber-400 italic">
												Chưa phân công cán bộ
											</span>
										)}
									</div>

									<div className="grid grid-cols-3 gap-2 text-center">
										<div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
											<div className="text-base font-black font-mono text-slate-900 dark:text-white">
												{v.householdCount}
											</div>
											<div className="text-[10px] text-slate-400 font-semibold uppercase">
												Hộ Dân
											</div>
										</div>
										<div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
											<div className="text-base font-black font-mono text-slate-900 dark:text-white">
												{v.citizenCount}
											</div>
											<div className="text-[10px] text-slate-400 font-semibold uppercase">
												Nhân Khẩu
											</div>
										</div>
										<div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
											<div className="text-base font-black font-mono text-purple-600 dark:text-purple-400">
												{v.dttsPct}%
											</div>
											<div className="text-[10px] text-slate-400 font-semibold uppercase">
												DTTS
											</div>
										</div>
									</div>
								</div>

								<div
									className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
									onClick={(e) => e.stopPropagation()}
								>
									<button
										type="button"
										onClick={() => onSelectVillage(v.id, "households")}
										className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
									>
										<span>Xem Hộ Dân</span>
										<ArrowRight className="w-3.5 h-3.5" />
									</button>
									<button
										type="button"
										onClick={() => onSelectVillage(v.id, "analytics")}
										className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
									>
										<span>Thống kê</span>
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{inspectingVillage && (
				<div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in">
					<div
						className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity cursor-pointer"
						onClick={() => setInspectingVillageId(null)}
					/>

					<div className="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl h-full border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 animate-in slide-in-from-right duration-200">
						<div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
							<div className="flex items-center gap-3">
								<div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
									<MapPin className="w-5 h-5" />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<h3 className="text-lg font-black text-slate-900 dark:text-white">
											{inspectingVillage.name}
										</h3>
										{inspectingVillage.short_code && (
											<span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
												{inspectingVillage.short_code}
											</span>
										)}
									</div>
									<p className="text-xs text-slate-400">
										Địa bàn dân cư trực thuộc UBND Xã Đăk Hà
									</p>
								</div>
							</div>

							<button
								type="button"
								onClick={() => setInspectingVillageId(null)}
								className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
							<div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
										Cán Bộ Phụ Trách Thôn
									</span>
									{isAdmin && (
										<button
											type="button"
											onClick={() => {
												openEditModal(inspectingVillage);
											}}
											className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
										>
											Đổi Cán Bộ
										</button>
									)}
								</div>

								{inspectingVillage.assignedOfficer ? (
									<div className="flex items-center gap-3">
										<div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-black text-base flex items-center justify-center shadow-xs">
											{getInitials(
												inspectingVillage.assignedOfficer.full_name ||
													inspectingVillage.assignedOfficer.username,
											)}
										</div>
										<div className="min-w-0">
											<div className="font-bold text-slate-900 dark:text-white text-sm">
												{inspectingVillage.assignedOfficer.full_name ||
													inspectingVillage.assignedOfficer.username}
											</div>
											<div className="text-xs text-slate-400 font-mono">
												Tài khoản: @{inspectingVillage.assignedOfficer.username}
											</div>
											<div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
												Vai trò: {inspectingVillage.assignedOfficer.role === "admin" ? "Quản trị viên" : "Cán bộ thôn"}
											</div>
										</div>
									</div>
								) : (
									<div className="py-2 text-center text-xs text-amber-600 dark:text-amber-400 font-medium">
										Thôn này hiện chưa có cán bộ phụ trách. Bấm &quot;Đổi Cán Bộ&quot; để gán người theo dõi.
									</div>
								)}
							</div>

							<div className="space-y-3">
								<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
									Quy Mô Dân Cư & Tỷ Trọng
								</h4>
								<div className="grid grid-cols-2 gap-3">
									<div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-800">
										<div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
											{inspectingVillage.householdCount}
										</div>
										<div className="text-xs text-slate-500 font-medium mt-0.5">
											Hộ gia đình ({inspectingVillage.householdShare}% toàn xã)
										</div>
									</div>
									<div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-800">
										<div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
											{inspectingVillage.citizenCount}
										</div>
										<div className="text-xs text-slate-500 font-medium mt-0.5">
											Nhân khẩu (BQ: {inspectingVillage.avgHousehold} ng/hộ)
										</div>
									</div>
									<div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-800">
										<div className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
											{inspectingVillage.male}
										</div>
										<div className="text-xs text-slate-500 font-medium mt-0.5">
											Nam giới
										</div>
									</div>
									<div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-800">
										<div className="text-2xl font-black font-mono text-rose-500 dark:text-rose-400">
											{inspectingVillage.female}
										</div>
										<div className="text-xs text-slate-500 font-medium mt-0.5">
											Nữ giới
										</div>
									</div>
								</div>
							</div>

							<div className="space-y-3">
								<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
									Đặc Thù Dân Tộc & Chính Sách
								</h4>
								<div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3 text-xs">
									<div className="flex items-center justify-between">
										<span className="text-slate-600 dark:text-slate-400">Đồng bào DTTS:</span>
										<strong className="font-mono font-bold text-purple-600 dark:text-purple-400">
											{inspectingVillage.dtts} người ({inspectingVillage.dttsPct}%)
										</strong>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-slate-600 dark:text-slate-400">Hồ sơ Chúc thọ người cao tuổi:</span>
										<strong className="font-mono font-bold text-slate-800 dark:text-slate-200">
											{inspectingVillage.chucthoTotal} hồ sơ
										</strong>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-slate-600 dark:text-slate-400">Đối tượng Bảo trợ & Hưu tuất:</span>
										<strong className="font-mono font-bold text-slate-800 dark:text-slate-200">
											{inspectingVillage.htxhTotal} hồ sơ
										</strong>
									</div>
								</div>
							</div>
						</div>

						<div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col gap-2.5">
							<button
								type="button"
								onClick={() => {
									onSelectVillage(inspectingVillage.id, "households");
									setInspectingVillageId(null);
								}}
								className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
							>
								<Home className="w-4 h-4" />
								<span>Mở Danh Sách {inspectingVillage.householdCount} Hộ Gia Đình</span>
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectVillage(inspectingVillage.id, "analytics");
									setInspectingVillageId(null);
								}}
								className="w-full h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
							>
								<ExternalLink className="w-4 h-4" />
								<span>Xem Báo Cáo Phân Tích Thôn</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{(isCreateModalOpen || editingVillage) && (
				<div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 animate-in fade-in">
					<div
						className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity cursor-pointer"
						onClick={() => {
							setIsCreateModalOpen(false);
							setEditingVillage(null);
						}}
					/>

					<div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 z-10 space-y-5 animate-in zoom-in-95 duration-150">
						<div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
							<h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
								<MapPin className="w-5 h-5 text-emerald-600" />
								<span>{editingVillage ? "Cập Nhật Thông Tin Thôn" : "Thêm Thôn Mới"}</span>
							</h3>
							<button
								type="button"
								onClick={() => {
									setIsCreateModalOpen(false);
									setEditingVillage(null);
								}}
								className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{formError && (
							<div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
								{formError}
							</div>
						)}

						<div className="space-y-4 text-xs">
							<div>
								<label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
									Tên Thôn / Làng *
								</label>
								<input
									type="text"
									value={formName}
									onChange={(e) => setFormName(e.target.value)}
									placeholder="Ví dụ: Thôn Kon Xôm Lũy, Thôn 1..."
									className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
								/>
							</div>

							<div>
								<label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
									Mã Thôn / Ký Hiệu Viết Tắt (Tùy chọn)
								</label>
								<input
									type="text"
									value={formCode}
									onChange={(e) => setFormCode(e.target.value)}
									placeholder="Ví dụ: KXL, T01..."
									className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
								/>
							</div>

							<div>
								<label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
									Cán Bộ Phụ Trách Thôn
								</label>
								<select
									value={formOfficerId}
									onChange={(e) => setFormOfficerId(e.target.value)}
									className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
								>
									<option value="">-- Chưa phân công cán bộ --</option>
									{userList.map((u) => (
										<option key={u.id} value={u.id}>
											{u.full_name ? `${u.full_name} (@${u.username})` : `@${u.username}`} {u.role === "admin" ? "[Admin]" : ""}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
							<button
								type="button"
								onClick={() => {
									setIsCreateModalOpen(false);
									setEditingVillage(null);
								}}
								className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
							>
								Hủy
							</button>
							<button
								type="button"
								onClick={handleSaveForm}
								disabled={formSubmitting}
								className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
							>
								{formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
								<span>Lưu Thay Đổi</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
