import {
	ChevronDown,
	Download,
	RefreshCw,
	RotateCcw,
	Search,
	Trash2,
	X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { DAKHA_ETHNICITIES } from "../../data/constants";
import { CustomSelect } from "../common/CustomSelect";
import { type AgeFilter, AgeFilterPopover } from "./AgeFilterPopover";
import { YearSelector } from "./YearSelector";

export interface HouseholdFilterBarProps {
	search: string;
	setSearch: (val: string) => void;
	loading: boolean;
	onRefresh: () => void;
	ageFilter?: AgeFilter | null;
	setAgeFilter?: (filter: AgeFilter | null) => void;
	year: number;
	onYearChange: (year: number) => void;
	genderFilter: string;
	setGenderFilter: (val: string) => void;
	ethnicityFilter: string;
	setEthnicityFilter: (val: string) => void;
	statusFilter: string;
	setStatusFilter: (val: string) => void;
	onClearAllFilters?: () => void;
	hasActiveFilters?: boolean;
	selectedCount?: number;
	onBatchDelete?: () => void;
	onExportSelected?: () => void;
	onDeselectAll?: () => void;
}

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

const STATUS_OPTIONS = [
	{ value: "", label: "Tất cả cư trú" },
	{ value: "Thường trú", label: "Thường trú" },
	{ value: "Tạm trú", label: "Tạm trú" },
	{ value: "Tạm vắng", label: "Tạm vắng" },
	{ value: "Chuyển đi", label: "Chuyển đi" },
];

export const HouseholdFilterBar: React.FC<HouseholdFilterBarProps> = ({
	search,
	setSearch,
	loading,
	onRefresh,
	ageFilter,
	setAgeFilter,
	year,
	onYearChange,
	genderFilter,
	setGenderFilter,
	ethnicityFilter,
	setEthnicityFilter,
	statusFilter,
	setStatusFilter,
	onClearAllFilters,
	hasActiveFilters,
	selectedCount = 0,
	onBatchDelete,
	onExportSelected,
	onDeselectAll,
}) => {
	const currentYear = new Date().getFullYear();
	const [isActionDropdownOpen, setIsActionDropdownOpen] = useState(false);
	const actionDropdownRef = useRef<HTMLDivElement>(null);

	// Close action dropdown on outside click or Escape
	useEffect(() => {
		if (!isActionDropdownOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				actionDropdownRef.current &&
				!actionDropdownRef.current.contains(e.target as Node)
			) {
				setIsActionDropdownOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsActionDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isActionDropdownOpen]);

	const activeFilterCount =
		(search.trim() ? 1 : 0) +
		(ageFilter ? 1 : 0) +
		(year !== currentYear ? 1 : 0) +
		(genderFilter ? 1 : 0) +
		(ethnicityFilter ? 1 : 0) +
		(statusFilter ? 1 : 0);

	const isFilterActive =
		hasActiveFilters !== undefined
			? hasActiveFilters
			: activeFilterCount > 0;

	const handleClearAll = () => {
		if (onClearAllFilters) {
			onClearAllFilters();
		} else {
			setSearch("");
			setAgeFilter?.(null);
			onYearChange(currentYear);
			setGenderFilter("");
			setEthnicityFilter("");
			setStatusFilter("");
		}
	};

	return (
		<div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-150">
			{/* 1. Ô tìm kiếm tích hợp */}
			<div className="relative w-56 sm:w-72 shrink-0">
				<Search
					className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
						search.trim() !== ""
							? "text-emerald-600 dark:text-emerald-400"
							: "text-slate-400 dark:text-slate-500"
					}`}
					strokeWidth={1.5}
				/>
				<input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Tìm theo họ tên chủ hộ, CCCD..."
					className={`w-full h-8 sm:h-9 pl-8.5 pr-14 rounded-xl text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden transition-all ${
						search.trim() !== ""
							? "bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-500/80 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-bold focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
							: "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
					}`}
				/>
				<div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
					{search && (
						<>
							<button
								type="button"
								onClick={() => setSearch("")}
								aria-label="Xóa tìm kiếm"
								className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
							>
								<X className="w-3.5 h-3.5" strokeWidth={1.5} />
							</button>
							<div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-1" />
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

			{/* 2. YearSelector (Chọn năm tính toán) */}
			<div className="shrink-0">
				<YearSelector year={year} onYearChange={onYearChange} />
			</div>

			{/* 3. AgeFilterPopover (Chọn mốc tuổi) */}
			{setAgeFilter && (
				<div className="shrink-0">
					<AgeFilterPopover
						currentFilter={ageFilter || null}
						onSelectFilter={setAgeFilter}
					/>
				</div>
			)}

			{/* 4. Dropdown Giới tính */}
			<div className="w-36 shrink-0">
				<CustomSelect
					variant="filter"
					defaultValue=""
					size="sm"
					value={genderFilter}
					onChange={setGenderFilter}
					options={GENDER_OPTIONS}
					placeholder="Tất cả giới tính"
					clearable={true}
					onClear={() => setGenderFilter("")}
				/>
			</div>

			{/* 5. Dropdown Dân tộc */}
			<div className="w-40 shrink-0">
				<CustomSelect
					variant="filter"
					defaultValue=""
					size="sm"
					value={ethnicityFilter}
					onChange={setEthnicityFilter}
					options={ETHNICITY_OPTIONS}
					placeholder="Tất cả dân tộc"
					clearable={true}
					onClear={() => setEthnicityFilter("")}
				/>
			</div>

			{/* 6. Dropdown Cư trú */}
			<div className="w-36 shrink-0">
				<CustomSelect
					variant="filter"
					defaultValue=""
					size="sm"
					value={statusFilter}
					onChange={setStatusFilter}
					options={STATUS_OPTIONS}
					placeholder="Tất cả cư trú"
					clearable={true}
					onClear={() => setStatusFilter("")}
				/>
			</div>

			{/* 7. Nút Xóa lọc nếu có lọc đang hoạt động */}
			{isFilterActive && (
				<button
					type="button"
					onClick={handleClearAll}
					className="h-8 px-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 animate-in fade-in"
					title="Xóa toàn bộ các bộ lọc đang chọn"
				>
					<RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
					<span>{activeFilterCount > 1 ? "Xóa tất cả bộ lọc" : "Xóa lọc"}</span>
					{activeFilterCount > 1 && (
						<span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200">
							{activeFilterCount}
						</span>
					)}
				</button>
			)}

			{/* 8. Cụm tác vụ hàng loạt khi có dòng được chọn: dồn sang mép phải (ml-auto) */}
			{Boolean(selectedCount && selectedCount > 0) && (
				<div className="ml-auto flex items-center gap-2 shrink-0 animate-in fade-in">
					{/* Nút trung tính "Thao tác (N)" dạng dropdown */}
					<div className="relative" ref={actionDropdownRef}>
						<button
							type="button"
							onClick={() => setIsActionDropdownOpen((prev) => !prev)}
							className="h-8 sm:h-9 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer select-none transition-all"
							aria-expanded={isActionDropdownOpen}
							aria-haspopup="menu"
						>
							<span>Thao tác ({selectedCount})</span>
							<ChevronDown
								className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
									isActionDropdownOpen ? "rotate-180" : ""
								}`}
							/>
						</button>

						{isActionDropdownOpen && (
							<div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
								{onExportSelected && (
									<button
										type="button"
										onClick={() => {
											setIsActionDropdownOpen(false);
											onExportSelected();
										}}
										className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
									>
										<Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
										<span>Xuất Excel ({selectedCount} hộ)</span>
									</button>
								)}
								{onDeselectAll && (
									<button
										type="button"
										onClick={() => {
											setIsActionDropdownOpen(false);
											onDeselectAll();
										}}
										className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 rounded-xl flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100 dark:border-slate-800"
									>
										<X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
										<span>Bỏ chọn tất cả</span>
									</button>
								)}
							</div>
						)}
					</div>

					{/* Nút đỏ xóa các hộ đã chọn */}
					{onBatchDelete && (
						<button
							type="button"
							onClick={onBatchDelete}
							className="h-8 sm:h-9 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
							title={`Xóa ${selectedCount} hộ đã chọn`}
							aria-label={`Xóa ${selectedCount} hộ đã chọn`}
						>
							<Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
							<span>{selectedCount}</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
};

export default HouseholdFilterBar;
