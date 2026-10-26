import {
	Calendar,
	CheckCircle2,
	ChevronDown,
	Circle,
	RefreshCw,
	RotateCcw,
	Search,
	Trash2,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/AppContext";
import type { Village } from "@/types";
import { CustomSelect } from "@/components/common/CustomSelect";
import { DAKHA_ETHNICITIES } from "./constants";
import { YearSelector } from "./YearSelector";

export interface ProfileFilterBarProps {
	activeTab: "chuctho" | "htxh";
	search: string;
	setSearch: (val: string) => void;
	dateFilter?: string;
	onDateChange?: (val: string) => void;
	loading: boolean;
	onRefresh: () => void;
	selectedVillageId: string;
	onVillageChange: (villageId: string) => void;
	villages: Village[];
	statusFilter: string;
	onStatusChange: (status: string) => void;
	ageMilestoneFilter: string;
	onAgeMilestoneChange: (milestone: string) => void;
	globalCalculationYear: number;
	onYearChange: (year: number) => void;
	genderFilter: string;
	setGenderFilter: (val: string) => void;
	ethnicityFilter: string;
	setEthnicityFilter: (val: string) => void;
	residenceFilter: string;
	setResidenceFilter: (val: string) => void;
	onClearAllFilters?: () => void;
	hasActiveFilters?: boolean;
	showVillageFilter?: boolean;
	selectedCount?: number;
	onBulkDelete?: () => void;
	onBulkToggleReceived?: (status: boolean) => void;
	onDeselectAll?: () => void;
	isBulkUpdating?: boolean;
}

const CHUCTHO_MILESTONE_OPTIONS = [
	{ value: "", label: "Tất cả độ tuổi" },
	{ value: "age60", label: "Mốc 60 (60 - 64 tuổi)" },
	{ value: "age65", label: "Mốc 65 (65 - 69 tuổi)" },
	{ value: "age70", label: "Mốc 70 (70 - 74 tuổi)" },
	{ value: "age75", label: "Mốc 75 (75 - 79 tuổi)" },
	{ value: "age80", label: "Mốc 80 (80 - 84 tuổi)" },
	{ value: "age85", label: "Mốc 85 (85 - 89 tuổi)" },
	{ value: "age90", label: "Mốc 90 (90 - 94 tuổi)" },
	{ value: "age95", label: "Mốc 95 (95 - 99 tuổi)" },
	{ value: "age100", label: "Tròn 100 tuổi" },
	{ value: "age_over_100", label: "Trên 100 tuổi" },
];

const HTXH_CATEGORY_OPTIONS = [
	{ value: "", label: "Tất cả diện hưởng" },
	{ value: "age75plus", label: "Đủ 75 tuổi trở lên" },
	{ value: "age70to74poor", label: "Từ 70-74 tuổi hộ nghèo" },
	{ value: "bao_tro", label: "Đang hưởng Bảo trợ" },
	{ value: "huu_tri", label: "Đang hưởng Hưu trí" },
	{ value: "huu_tuat_bao_hiem", label: "Hưu tuất / Bảo hiểm" },
	{ value: "nguoi_co_cong", label: "Người có công" },
];

const GENDER_OPTIONS = [
	{ value: "", label: "Tất cả giới tính" },
	{ value: "Nam", label: "Nam" },
	{ value: "Nữ", label: "Nữ" },
];

const ETHNICITY_OPTIONS = [
	{ value: "", label: "Tất cả dân tộc" },
	{ value: "Kinh", label: "Dân tộc Kinh" },
	{ value: "dtts", label: "Dân tộc thiểu số (DTTS)" },
	...DAKHA_ETHNICITIES.filter((e) => e !== "Kinh").map((e) => ({
		value: e,
		label: `Dân tộc ${e}`,
	})),
];

const RESIDENCE_OPTIONS = [
	{ value: "", label: "Tất cả cư trú" },
	{ value: "Thường trú", label: "Thường trú" },
	{ value: "Tạm trú", label: "Tạm trú" },
	{ value: "Tạm vắng", label: "Tạm vắng" },
];

const STATUS_GIFT_OPTIONS = [
	{ value: "all", label: "Tất cả trạng thái" },
	{ value: "received", label: "Đã nhận quà" },
	{ value: "unreceived", label: "Chưa nhận quà" },
];

const formatBirthDateInput = (val: string): string => {
	const cleaned = val.replace(/[-.]/g, "/").replace(/[^\d/]/g, "");
	const digitsOnly = cleaned.replace(/\//g, "");
	if (digitsOnly.length === 8 && !cleaned.includes("/")) {
		return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
	}
	return cleaned.slice(0, 10);
};

const normalizeBirthDate = (val: string): string => {
	const trimmed = val.trim();
	const parts = trimmed.split("/");
	if (parts.length === 3) {
		const day = parts[0].padStart(2, "0");
		const month = parts[1].padStart(2, "0");
		const year = parts[2];
		if (day.length === 2 && month.length === 2 && (year.length === 4 || year.length === 2)) {
			return `${day}/${month}/${year}`;
		}
	}
	return trimmed;
};

export const ProfileFilterBar: React.FC<ProfileFilterBarProps> = ({
	activeTab,
	search,
	setSearch,
	dateFilter,
	onDateChange,
	loading,
	onRefresh,
	selectedVillageId,
	onVillageChange,
	villages,
	statusFilter,
	onStatusChange,
	ageMilestoneFilter,
	onAgeMilestoneChange,
	globalCalculationYear,
	onYearChange,
	genderFilter,
	setGenderFilter,
	ethnicityFilter,
	setEthnicityFilter,
	residenceFilter,
	setResidenceFilter,
	onClearAllFilters,
	hasActiveFilters,
	showVillageFilter = true,
	selectedCount = 0,
	onBulkDelete,
	onBulkToggleReceived,
	onDeselectAll,
	isBulkUpdating = false,
}) => {
	const { user } = useApp();
	const isVillageOfficer = user?.role === "user";

	const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
	const bulkMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				bulkMenuRef.current &&
				!bulkMenuRef.current.contains(e.target as Node)
			) {
				setIsBulkMenuOpen(false);
			}
		};
		if (isBulkMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isBulkMenuOpen]);

	const activeFiltersCount = [
		Boolean(search.trim()),
		Boolean(dateFilter?.trim()),
		Boolean(ageMilestoneFilter),
		Boolean(genderFilter),
		Boolean(ethnicityFilter),
		Boolean(residenceFilter),
		Boolean(showVillageFilter && selectedVillageId),
		Boolean(statusFilter && statusFilter !== "all"),
	].filter(Boolean).length;

	const isFilterActive =
		hasActiveFilters !== undefined
			? hasActiveFilters
			: activeFiltersCount > 0;

	const handleClearAll = () => {
		if (onClearAllFilters) {
			onClearAllFilters();
		} else {
			setSearch("");
			if (onDateChange) onDateChange("");
			onAgeMilestoneChange("");
			setGenderFilter("");
			setEthnicityFilter("");
			setResidenceFilter("");
			onStatusChange("all");
			if (showVillageFilter) onVillageChange("");
		}
	};

	const villageOptions = [
		{
			value: "",
			label: villages.length ? `Toàn xã (${villages.length} thôn)` : "Toàn xã",
		},
		...villages.map((v) => ({
			value: v.id,
			label: v.name,
		})),
	];

	return (
		<div className="relative z-30 flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-150">
			<div className="relative w-56 sm:w-80 shrink-0">
				<Search
					className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
						search.trim()
							? "text-emerald-600 dark:text-emerald-400"
							: "text-slate-400 dark:text-slate-500"
					}`}
					strokeWidth={1.5}
				/>
				<input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Tìm theo họ tên, CCCD..."
					className={`w-full h-8 sm:h-9 pl-8.5 pr-14 rounded-xl text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden transition-all ${
						search.trim()
							? "bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-500/80 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 font-bold focus:ring-2 focus:ring-emerald-500/20"
							: "bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
					}`}
				/>
				<div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
					{search && (
						<>
							<button
								type="button"
								onClick={() => setSearch("")}
								aria-label="Xóa tìm kiếm"
								title="Xóa tìm kiếm"
								className="p-0.5 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 rounded-full hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
							>
								<X className="w-3.5 h-3.5" strokeWidth={2} />
							</button>
							<div className="w-px h-3.5 bg-emerald-300 dark:bg-emerald-800 mx-1" />
						</>
					)}
					<button
						type="button"
						onClick={onRefresh}
						aria-label="Làm mới danh sách"
						title="Làm mới danh sách"
						className="p-0.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
					>
						<RefreshCw
							className={`w-3.5 h-3.5 ${
								loading
									? "animate-spin text-emerald-600 dark:text-emerald-400"
									: ""
							}`}
							strokeWidth={1.5}
						/>
					</button>
				</div>
			</div>

			{activeTab === "chuctho" && (
				<div className="shrink-0">
					<YearSelector
						year={globalCalculationYear}
						onYearChange={onYearChange}
					/>
				</div>
			)}

			{activeTab === "chuctho" && (
				<div className="relative w-48 sm:w-56 shrink-0">
					<Calendar
						className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
							dateFilter?.trim()
								? "text-emerald-600 dark:text-emerald-400"
								: "text-slate-400 dark:text-slate-500"
						}`}
						strokeWidth={1.5}
					/>
					<input
						type="text"
						value={dateFilter || ""}
						maxLength={10}
						title="Lọc ngày sinh (VD: 22/11/1966 hoặc 1966)"
						onChange={(e) => onDateChange?.(formatBirthDateInput(e.target.value))}
						onBlur={() => {
							if (dateFilter) {
								const normalized = normalizeBirthDate(dateFilter);
								if (normalized !== dateFilter) {
									onDateChange?.(normalized);
								}
							}
						}}
						placeholder="VD: 22/11/1966 hoặc 1966"
						className={`w-full h-8 sm:h-9 pl-8.5 pr-8 rounded-xl text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden transition-all ${
							dateFilter?.trim()
								? "bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-500/80 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 font-bold focus:ring-2 focus:ring-emerald-500/20"
							: "bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
						}`}
					/>
					{dateFilter && (
						<button
							type="button"
							onClick={() => onDateChange?.("")}
							aria-label="Xóa lọc ngày"
							className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 rounded-full hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
						>
							<X className="w-3.5 h-3.5" strokeWidth={2} />
						</button>
					)}
				</div>
			)}

			<div className="w-40 shrink-0">
				<CustomSelect
					size="sm"
					variant="filter"
					defaultValue=""
					value={ageMilestoneFilter}
					onChange={onAgeMilestoneChange}
					options={
						activeTab === "chuctho"
							? CHUCTHO_MILESTONE_OPTIONS
							: HTXH_CATEGORY_OPTIONS
					}
					placeholder={
						activeTab === "chuctho" ? "Tất cả độ tuổi" : "Tất cả diện hưởng"
					}
					clearable={true}
					onClear={() => onAgeMilestoneChange("")}
				/>
			</div>

			<div className="w-36 shrink-0">
				<CustomSelect
					size="sm"
					variant="filter"
					defaultValue=""
					value={genderFilter}
					onChange={setGenderFilter}
					options={GENDER_OPTIONS}
					placeholder="Tất cả giới tính"
					clearable={true}
					onClear={() => setGenderFilter("")}
				/>
			</div>

			<div className="w-38 shrink-0">
				<CustomSelect
					size="sm"
					variant="filter"
					defaultValue=""
					value={ethnicityFilter}
					onChange={setEthnicityFilter}
					options={ETHNICITY_OPTIONS}
					placeholder="Tất cả dân tộc"
					clearable={true}
					onClear={() => setEthnicityFilter("")}
				/>
			</div>

			<div className="w-36 shrink-0">
				<CustomSelect
					size="sm"
					variant="filter"
					defaultValue=""
					value={residenceFilter}
					onChange={setResidenceFilter}
					options={RESIDENCE_OPTIONS}
					placeholder="Tất cả cư trú"
					clearable={true}
					onClear={() => setResidenceFilter("")}
				/>
			</div>

			{isVillageOfficer ? (
				<div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
					<span>
						{villages.find((v) => v.id === user?.village_id)?.name ||
							"Thôn phụ trách"}
					</span>
				</div>
			) : (
				showVillageFilter && (
					<div className="w-36 shrink-0">
						<CustomSelect
							size="sm"
							variant="filter"
							defaultValue=""
							value={selectedVillageId}
							onChange={(val) => onVillageChange(String(val))}
							options={villageOptions}
							placeholder="Toàn xã"
							clearable={true}
							onClear={() => onVillageChange("")}
						/>
					</div>
				)
			)}

			<div className="w-40 shrink-0">
				<CustomSelect
					size="sm"
					variant="filter"
					defaultValue="all"
					value={statusFilter}
					onChange={onStatusChange}
					options={STATUS_GIFT_OPTIONS}
					placeholder="Tất cả trạng thái"
					clearable={true}
					onClear={() => onStatusChange("all")}
				/>
			</div>

			{isFilterActive && (
				<button
					type="button"
					onClick={handleClearAll}
					className="h-8 px-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 animate-in fade-in"
					title="Xóa toàn bộ các bộ lọc đang chọn"
				>
					<RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
					<span>
						{activeFiltersCount > 1
							? `Xóa tất cả bộ lọc (${activeFiltersCount})`
							: "Xóa lọc"}
					</span>
				</button>
			)}

			{Boolean(selectedCount && selectedCount > 0) && (
				<div className="ml-auto flex items-center gap-2 shrink-0 animate-in fade-in flex-wrap relative">
					<div className="relative" ref={bulkMenuRef}>
						<button
							type="button"
							onClick={() => setIsBulkMenuOpen(!isBulkMenuOpen)}
							aria-label={`Thao tác ${selectedCount} hồ sơ đã chọn`}
							className="h-8 sm:h-9 px-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
						>
							<span>Thao tác ({selectedCount})</span>
							<ChevronDown
								className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
									isBulkMenuOpen ? "rotate-180" : ""
								}`}
								strokeWidth={1.5}
							/>
						</button>

						{isBulkMenuOpen && (
							<div className="absolute right-0 top-full mt-1.5 w-44 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100 text-xs">
								<button
									type="button"
									disabled={isBulkUpdating}
									onClick={() => {
										setIsBulkMenuOpen(false);
										onBulkToggleReceived?.(true);
									}}
									className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold transition-colors cursor-pointer disabled:opacity-50"
								>
									<CheckCircle2
										className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
										strokeWidth={1.75}
									/>
									<span>Đã nhận quà</span>
								</button>
								<button
									type="button"
									disabled={isBulkUpdating}
									onClick={() => {
										setIsBulkMenuOpen(false);
										onBulkToggleReceived?.(false);
									}}
									className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors cursor-pointer disabled:opacity-50"
								>
									<Circle
										className="w-3.5 h-3.5 text-slate-400"
										strokeWidth={1.75}
									/>
									<span>Chưa nhận quà</span>
								</button>
								<div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
								<button
									type="button"
									onClick={() => {
										setIsBulkMenuOpen(false);
										onDeselectAll?.();
									}}
									className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-semibold transition-colors cursor-pointer"
								>
									<X className="w-3.5 h-3.5" strokeWidth={1.75} />
									<span>Bỏ chọn tất cả</span>
								</button>
							</div>
						)}
					</div>

					{Boolean(onBulkDelete) && activeTab !== "chuctho" && activeTab !== "htxh" && (
						<button
							type="button"
							disabled={isBulkUpdating}
							onClick={onBulkDelete}
							className="h-8 sm:h-9 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
							title={`Xóa ${selectedCount} hồ sơ đã chọn`}
							aria-label={`Xóa ${selectedCount} hồ sơ đã chọn`}
						>
							<Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
							<span>{selectedCount}</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
};

export default ProfileFilterBar;
