import React from "react";
import { Search, X, CheckCheck, RotateCcw } from "lucide-react";
import type { Village } from "../../types";

export interface ChucThoFilterBarProps {
	search: string; onSearchChange: (val: string) => void;
	milestone: string; onMilestoneChange: (m: string) => void;
	received: string; onReceivedChange: (r: string) => void;
	gender: string; onGenderChange: (g: string) => void;
	selectedVillageId: string; onVillageChange: (v: string) => void;
	villages?: Village[]; showVillageFilter?: boolean;
	selectedCount?: number; onBulkReceived?: (status: boolean) => void;
	onDeselectAll?: () => void; calculationYear?: number; onYearChange?: (year: number) => void;
}

const MILESTONES = ["all", "60", "65", "70", "75", "80", "85", "90", "95", "100", ">100"];

export const ChucThoFilterBar: React.FC<ChucThoFilterBarProps> = ({
	search, onSearchChange, milestone, onMilestoneChange, received, onReceivedChange,
	gender, onGenderChange, selectedVillageId, onVillageChange, villages = [],
	showVillageFilter = false, selectedCount = 0, onBulkReceived, onDeselectAll,
	calculationYear, onYearChange,
}) => (
	<div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
		<div className="flex flex-wrap items-center gap-3">
			<div className="relative flex-1 min-w-[220px]">
				<Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
				<input
					type="text"
					placeholder="Tìm theo họ tên, CCCD..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
				/>
				{search && (
					<button onClick={() => onSearchChange("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
						<X className="w-4 h-4" />
					</button>
				)}
			</div>
			{calculationYear && onYearChange && (
				<select value={calculationYear} onChange={(e) => onYearChange(Number(e.target.value))} className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-800 dark:text-slate-100">
					{[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>Năm {y}</option>)}
				</select>
			)}
			{showVillageFilter && villages.length > 0 && (
				<select value={selectedVillageId} onChange={(e) => onVillageChange(e.target.value)} className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-800 dark:text-slate-100">
					<option value="">Tất cả thôn/xóm</option>
					{villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
				</select>
			)}
			<select value={received} onChange={(e) => onReceivedChange(e.target.value)} className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-800 dark:text-slate-100">
				<option value="all">Tất cả quà</option>
				<option value="received">Đã nhận quà</option>
				<option value="unreceived">Chưa nhận quà</option>
			</select>
			<select value={gender} onChange={(e) => onGenderChange(e.target.value)} className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-800 dark:text-slate-100">
				<option value="">Tất cả giới tính</option>
				<option value="Nam">Nam</option>
				<option value="Nữ">Nữ</option>
			</select>
		</div>
		<div className="flex flex-wrap items-center gap-1.5 pt-1">
			<span className="text-xs font-semibold text-slate-400 mr-1">Mốc tuổi:</span>
			{MILESTONES.map((m) => (
				<button key={m} onClick={() => onMilestoneChange(m)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${milestone === m ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
					{m === "all" ? "Tất cả" : `${m} tuổi`}
				</button>
			))}
		</div>
		{selectedCount > 0 && (
			<div className="flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
				<span className="font-semibold">Đã chọn {selectedCount} người</span>
				<div className="flex items-center gap-2">
					{onBulkReceived && (
						<>
							<button onClick={() => onBulkReceived(true)} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">
								<CheckCheck className="w-3.5 h-3.5" /> Đã nhận quà
							</button>
							<button onClick={() => onBulkReceived(false)} className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium">
								Chưa nhận
							</button>
						</>
					)}
					{onDeselectAll && (
						<button onClick={onDeselectAll} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 ml-1">
							<RotateCcw className="w-3.5 h-3.5" /> Bỏ chọn
						</button>
					)}
				</div>
			</div>
		)}
	</div>
);
