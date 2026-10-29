import type React from "react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	ArrowDown,
	ArrowRight,
	ArrowUp,
	ArrowUpDown,
	Download,
	Edit3,
	ExternalLink,
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
import { CustomSelect } from "@/components/common/CustomSelect";

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

	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editingVillage, setEditingVillage] = useState<Village | null>(null);

	const [formName, setFormName] = useState("");
	const [formCode, setFormCode] = useState("");
	const [formOfficerId, setFormOfficerId] = useState("");
	const [formSubmitting, setFormSubmitting] = useState(false);
	const [formError, setFormError] = useState("");

	const enrichedVillages = useMemo(() => {
		const totalCommuneHouseholds = overview?.totalHouseholds ?? 0;
		return villages.map((v) => {
			const vStat =
				villageStats[v.id] ||
				villageStats[v.short_code || ""] ||
				villageStats[v.name] ||
				villageStats[v.name.toLowerCase().trim()] ||
				villageStats[normalizeUnaccented(v.name.toLowerCase().trim())];

			const householdCount = vStat?.household_count ?? 0;
			const citizenCount = vStat?.citizen_count ?? 0;
			const dtts = vStat?.dtts_count ?? 0;
			const dttsPct =
				citizenCount > 0 ? Math.round((dtts / citizenCount) * 1000) / 10 : 0;
			const male = vStat?.male_count ?? 0;
			const female = vStat?.female_count ?? 0;

			const householdShare =
				totalCommuneHouseholds > 0
					? Math.round((householdCount / totalCommuneHouseholds) * 1000) / 10
					: 0;

			const avgHousehold =
				householdCount > 0 ? (citizenCount / householdCount).toFixed(1) : "0.0";

			const assignedOfficer =
				userList.find((u) => u.village_id === v.id && u.role === "user") ||
				userList.find((u) => u.village_id === v.id);

			return {
				...v,
				householdCount,
				citizenCount,
				male,
				female,
				dtts,
				dttsPct,
				householdShare,
				avgHousehold,
				assignedOfficer,
			};
		});
	}, [villages, villageStats, overview?.totalHouseholds, userList]);

	const officerOptions = useMemo(() => [
		{ value: "", label: "-- Chưa phân công cán bộ --" },
		...userList.map((u) => {
			const currentAssignedVillage = villages.find((v) => v.id === u.village_id);
			const isCurrentVillage = editingVillage && u.village_id === editingVillage.id;
			const assignedNote =
				currentAssignedVillage && !isCurrentVillage
					? ` (Đang phụ trách: ${currentAssignedVillage.name})`
					: "";
			return {
				value: u.id,
				label: `${u.full_name || u.username}${assignedNote}`,
			};
		}),
	], [userList, villages, editingVillage]);

	const displayStats = useMemo(() => {
		if (isAdmin) {
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
			return {
				totalHouseholds,
				totalCitizens,
				avgSize,
				maleCount,
				malePct,
				femaleCount,
				femalePct,
				dttsCount,
				dttsPercentage,
			};
		}

		const totalHouseholds = enrichedVillages.reduce((sum, v) => sum + v.householdCount, 0);
		const totalCitizens = enrichedVillages.reduce((sum, v) => sum + v.citizenCount, 0);
		const avgSize = totalHouseholds > 0 ? (totalCitizens / totalHouseholds).toFixed(1) : "0.0";
		const maleCount = enrichedVillages.reduce((sum, v) => sum + v.male, 0);
		const malePct = totalCitizens > 0 ? Math.round((maleCount / totalCitizens) * 1000) / 10 : 0;
		const femaleCount = enrichedVillages.reduce((sum, v) => sum + v.female, 0);
		const femalePct = totalCitizens > 0 ? Math.round((femaleCount / totalCitizens) * 1000) / 10 : 0;
		const dttsCount = enrichedVillages.reduce((sum, v) => sum + v.dtts, 0);
		const dttsPercentage = totalCitizens > 0 ? ((dttsCount / totalCitizens) * 100).toFixed(1) : "0.0";
		return {
			totalHouseholds,
			totalCitizens,
			avgSize,
			maleCount,
			malePct,
			femaleCount,
			femalePct,
			dttsCount,
			dttsPercentage,
		};
	}, [isAdmin, overview, enrichedVillages]);

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
		const officer = userList.find((u) => u.village_id === v.id);
		setFormName(v.name);
		setFormCode(v.short_code || "");
		setFormOfficerId(officer ? officer.id : "");
		setFormError("");
		setEditingVillage(v);
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
			setFormError(err.response?.data?.error || err.message || "Lỗi thao tác");
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
		<div className="space-y-6 animate-in fade-in pb-16">
			<div className="rounded-3xl p-6 bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 text-white shadow-xl shadow-emerald-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
				<div className="flex items-center gap-4 relative z-10">
					<div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 backdrop-blur-xs shadow-inner">
						<Globe className="w-7 h-7 text-white" strokeWidth={1.75} />
					</div>
					<div>
						<div className="flex items-center gap-2 flex-wrap">
							<span className="px-2.5 py-0.5 rounded-full bg-white/20 text-emerald-100 text-[11px] font-bold uppercase tracking-wider">
								{isAdmin ? "UBND Xã Đăk Hà" : "Cán Bộ Địa Bàn"}
							</span>
							<span className="text-xs text-emerald-200 font-medium">
								{isAdmin
									? `Hệ thống quản lý ${villages.length} Thôn Dân Cư`
									: `Thôn phụ trách: ${enrichedVillages[0]?.name || "Địa bàn phân công"}`}
							</span>
						</div>
						<h2 className="text-2xl font-black tracking-tight text-white mt-1">
							{isAdmin
								? "Trung Tâm Quản Lý Địa Bàn Thôn & Làng"
								: `Thông Tin Thôn ${enrichedVillages[0]?.name || ""}`}
						</h2>
						<p className="text-xs text-emerald-100/90 mt-1 max-w-2xl font-medium">
							{isAdmin ? "Toàn xã" : "Địa bàn"} hiện có{" "}
							<strong className="font-bold text-white">{displayStats.totalHouseholds.toLocaleString()}</strong> hộ gia đình,{" "}
							<strong className="font-bold text-white">{displayStats.totalCitizens.toLocaleString()}</strong> nhân khẩu (Bình quân:{" "}
							<strong className="font-bold text-white">{displayStats.avgSize}</strong> người/hộ)
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2.5 relative z-10 w-full md:w-auto justify-end flex-wrap sm:flex-nowrap">
					<button
						type="button"
						onClick={() => onSelectVillage(isAdmin ? "" : (enrichedVillages[0]?.id || ""), "analytics")}
						className="h-10 px-4 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
					>
						<span>{isAdmin ? "Báo Cáo Thống Kê Toàn Xã" : "Báo Cáo Thống Kê Thôn"}</span>
						<ArrowRight className="w-4 h-4 stroke-[2]" />
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
					<div className="space-y-1">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Địa Bàn Quản Lý
						</span>
						<div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
							{isAdmin ? `${villages.length} Thôn` : (enrichedVillages[0]?.name || "1 Thôn")}
						</div>
						<div className="text-[11px] text-slate-400 font-medium">
							{isAdmin
								? `${assignedVillagesCount}/${villages.length} thôn đã gán cán bộ`
								: "Địa bàn được phân công quản lý"}
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
							{displayStats.totalHouseholds.toLocaleString()} Hộ
						</div>
						<div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
							Bình quân: {displayStats.avgSize} người/hộ
						</div>
					</div>
					<div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/40 flex items-center justify-center shrink-0">
						<Home className="w-6 h-6 text-sky-600 dark:text-sky-400" strokeWidth={1.75} />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
					<div className="space-y-1">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Tổng Nhân Khẩu
						</span>
						<div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
							{displayStats.totalCitizens.toLocaleString()} Người
						</div>
						<div className="text-[11px] text-slate-400 font-mono">
							Nam: {displayStats.maleCount} ({displayStats.malePct}%) • Nữ: {displayStats.femaleCount} ({displayStats.femalePct}%)
						</div>
					</div>
					<div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center shrink-0">
						<Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" strokeWidth={1.75} />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
					<div className="space-y-1">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Đồng Bào DTTS
						</span>
						<div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
							{displayStats.dttsPercentage}%
						</div>
						<div className="text-[11px] text-slate-400 font-medium">
							{displayStats.dttsCount.toLocaleString()} / {displayStats.totalCitizens.toLocaleString()} nhân khẩu
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
								<span>Danh Sách Thôn Dân Cư</span>
								<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
									UI Mới
								</span>
							</h3>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Hiển thị {filteredAndSortedVillages.length}/{villages.length} thôn • Bấm vào thôn để xem trực tiếp báo cáo thống kê chi tiết
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end">
						<button
							type="button"
							onClick={handleRefreshClick}
							disabled={isRefreshing}
							title="Làm mới dữ liệu thống kê"
							className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
						>
							<RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
							<span className="hidden sm:inline">Làm mới</span>
						</button>

						<button
							type="button"
							onClick={handleExportExcel}
							disabled={isExporting}
							title="Xuất bảng thống kê danh sách thôn ra Excel"
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
								className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
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
								className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
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
							placeholder="Tìm tên thôn, tên cán bộ phụ trách..."
							className="w-full h-10 min-h-[40px] pl-10 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
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
							className={`h-10 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
								filterType === "all"
									? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
									: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
						>
							Tất cả ({villages.length})
						</button>
						{isAdmin && (
							<>
								<button
									type="button"
									onClick={() => setFilterType("assigned")}
									className={`h-10 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
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
									className={`h-10 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
										filterType === "unassigned"
											? "bg-amber-600 text-white shadow-xs"
											: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
									}`}
								>
									Chưa phân công ({villages.length - assignedVillagesCount})
								</button>
							</>
						)}
						<button
							type="button"
							onClick={() => setFilterType("high_dtts")}
							className={`h-10 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
								filterType === "high_dtts"
									? "bg-purple-600 text-white shadow-xs"
									: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
						>
							DTTS ≥ 50%
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
						Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc để xem đầy đủ danh sách thôn.
					</p>
					{searchTerm && (
						<button
							type="button"
							onClick={() => setSearchTerm("")}
							className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
						>
							Xóa từ khóa tìm kiếm
						</button>
					)}
				</div>
			) : viewMode === "table" ? (
				<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full text-left text-xs border-collapse">
							<thead>
								<tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200/90 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
									<th className="py-3.5 px-4 w-12 text-center">#</th>
									<th
										onClick={() => handleSortClick("name")}
										className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
									>
										<div className="flex items-center gap-1.5">
											<span>Tên Thôn / Làng</span>
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
											<span>Số Hộ Dân</span>
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
											<span>Dân Tộc & Giới Tính</span>
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
											onClick={() => onSelectVillage(v.id, "analytics")}
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
														</div>
														<div className="text-[11px] text-slate-400 font-medium">
															Địa bàn Xã Đăk Hà • Bấm để xem thống kê
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
																title="Xóa thôn khỏi hệ thống"
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
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
					{filteredAndSortedVillages.map((v) => {
						const officer = v.assignedOfficer;
						const initials = getInitials(officer?.full_name || officer?.username || "");

						return (
							<div
								key={v.id}
								onClick={() => onSelectVillage(v.id, "analytics")}
								className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-500/80 transition-all cursor-pointer flex flex-col justify-between group space-y-4"
							>
								<div className="space-y-4">
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-center gap-3">
											<div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
												<MapPin className="w-5 h-5" />
											</div>
											<div className="min-w-0">
												<h4 className="font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-base truncate">
													{v.name}
												</h4>
												<span className="text-[11px] text-slate-400 font-medium">
													Địa bàn Xã Đăk Hà • Bấm để xem thống kê
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
										<Home className="w-3.5 h-3.5" />
										<span>Hộ dân</span>
									</button>

									<button
										type="button"
										onClick={() => onSelectVillage(v.id, "analytics")}
										className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
									>
										<span>Thống kê</span>
										<ExternalLink className="w-3.5 h-3.5" />
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{(isCreateModalOpen || editingVillage) &&
				typeof document !== "undefined" &&
				createPortal(
					<div className="fixed inset-0 !m-0 z-[1000] overflow-y-auto flex items-center justify-center p-4 bg-slate-950/50 dark:bg-black/70 backdrop-blur-sm select-none animate-in fade-in duration-150">
						<div
							className="fixed inset-0 bg-transparent cursor-pointer"
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
										Cán Bộ Phụ Trách Thôn
									</label>
									<CustomSelect
										value={formOfficerId}
										onChange={(val) => setFormOfficerId(String(val))}
										options={officerOptions}
										placeholder="-- Chưa phân công cán bộ --"
										size="md"
										searchable
									/>
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
					</div>,
					document.body,
				)}
		</div>
	);
};
