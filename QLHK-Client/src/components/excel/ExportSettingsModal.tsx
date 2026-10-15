import { CheckSquare, DownloadCloud, Filter, Layers, Square, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export type ExportTab = "traditional" | "custom";
export type AgeFilterMode = "range" | "exact";

export type CustomColumnKey =
	| "stt"
	| "household_book"
	| "full_name"
	| "relationship"
	| "dob"
	| "age"
	| "gender"
	| "military_status"
	| "education"
	| "occupation"
	| "native_place"
	| "cccd"
	| "ethnicity"
	| "religion"
	| "address"
	| "notes";

export interface CustomColumnDefinition {
	key: CustomColumnKey;
	label: string;
	description?: string;
}

export const EXPORT_COLUMNS: CustomColumnDefinition[] = [
	{ key: "stt", label: "STT" },
	{ key: "household_book", label: "Số sổ / Thôn" },
	{ key: "full_name", label: "Họ và tên" },
	{ key: "relationship", label: "Quan hệ chủ hộ" },
	{ key: "dob", label: "Ngày sinh" },
	{ key: "age", label: "Tuổi" },
	{ key: "gender", label: "Giới tính" },
	{ key: "military_status", label: "Tình hình NVQS" },
	{ key: "education", label: "Trình độ học vấn" },
	{ key: "occupation", label: "Nghề nghiệp" },
	{ key: "native_place", label: "Quê quán" },
	{ key: "cccd", label: "Số CCCD" },
	{ key: "ethnicity", label: "Dân tộc" },
	{ key: "religion", label: "Tôn giáo" },
	{ key: "address", label: "Địa chỉ thường trú" },
	{ key: "notes", label: "Ghi chú" },
];

export interface ExportConfig {
	tab: ExportTab;
	scope: "all" | "selected";
	ageMode: AgeFilterMode;
	minAge?: number;
	maxAge?: number;
	exactAge?: number;
	gender?: string;
	militaryKeyword?: string;
	educationKeyword?: string;
	occupationKeyword?: string;
	selectedColumns: CustomColumnKey[];
}

export interface ExportSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	onExport: (config: ExportConfig | "all" | "selected") => void | Promise<void>;
	exporting: boolean;
	selectedCount?: number;
	villageName?: string;
}

export const ExportSettingsModal: React.FC<ExportSettingsModalProps> = ({
	isOpen,
	onClose,
	onExport,
	exporting,
	selectedCount = 0,
	villageName,
}) => {
	const [activeTab, setActiveTab] = useState<ExportTab>("traditional");
	const [exportScope, setExportScope] = useState<"all" | "selected">("all");

	// Bộ lọc Tab 2 (Chuyên đề)
	const [ageMode, setAgeMode] = useState<AgeFilterMode>("range");
	const [minAge, setMinAge] = useState<string>("");
	const [maxAge, setMaxAge] = useState<string>("");
	const [exactAge, setExactAge] = useState<string>("");
	const [genderFilter, setGenderFilter] = useState<string>("all");
	const [militaryKeyword, setMilitaryKeyword] = useState<string>("");
	const [educationKeyword, setEducationKeyword] = useState<string>("");
	const [occupationKeyword, setOccupationKeyword] = useState<string>("");

	// Tùy biến cột xuất (16 cột, mặc định chọn hết)
	const [selectedColumns, setSelectedColumns] = useState<Set<CustomColumnKey>>(
		new Set(EXPORT_COLUMNS.map((c) => c.key)),
	);

	const modalRef = useFocusTrap<HTMLDivElement>({
		isActive: isOpen,
		onEscape: onClose,
	});

	if (!isOpen || typeof document === "undefined") return null;

	const handleToggleColumn = (key: CustomColumnKey) => {
		const next = new Set(selectedColumns);
		if (next.has(key)) {
			next.delete(key);
		} else {
			next.add(key);
		}
		setSelectedColumns(next);
	};

	const handleSelectAllColumns = () => {
		setSelectedColumns(new Set(EXPORT_COLUMNS.map((c) => c.key)));
	};

	const handleDeselectAllColumns = () => {
		setSelectedColumns(new Set());
	};

	const handleSubmit = () => {
		const config: ExportConfig = {
			tab: activeTab,
			scope: exportScope,
			ageMode,
			minAge: minAge !== "" ? Number(minAge) : undefined,
			maxAge: maxAge !== "" ? Number(maxAge) : undefined,
			exactAge: exactAge !== "" ? Number(exactAge) : undefined,
			gender: genderFilter !== "all" ? genderFilter : undefined,
			militaryKeyword: militaryKeyword.trim() || undefined,
			educationKeyword: educationKeyword.trim() || undefined,
			occupationKeyword: occupationKeyword.trim() || undefined,
			selectedColumns: Array.from(selectedColumns),
		};
		onExport(config);
	};

	return createPortal(
		<div
			className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 dark:bg-black/60 select-none animate-in fade-in duration-150"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="export-settings-title"
		>
			<div
				ref={modalRef}
				className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 flex items-center justify-center">
							<DownloadCloud className="w-5 h-5" />
						</div>
						<div>
							<h2
								id="export-settings-title"
								className="text-lg font-black text-slate-900 dark:text-white"
							>
								Cài Đặt Xuất File Excel
							</h2>
							<p className="text-xs text-slate-500">
								Đang thao tác:{" "}
								<strong className="text-emerald-600 dark:text-emerald-400">
									{villageName || "Toàn xã Đăk Hà"}
								</strong>
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
						aria-label="Đóng hộp thoại"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Tab Selector */}
				<div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-2 bg-slate-50/50 dark:bg-slate-900/40">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "traditional"}
						onClick={() => setActiveTab("traditional")}
						className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
							activeTab === "traditional"
								? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
								: "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
						}`}
					>
						<Layers className="w-4 h-4" />
						Biểu mẫu 11 cột Đăk Hà
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "custom"}
						onClick={() => setActiveTab("custom")}
						className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
							activeTab === "custom"
								? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
								: "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
						}`}
					>
						<Filter className="w-4 h-4" />
						Báo cáo chuyên đề tùy chọn
					</button>
				</div>

				{/* Modal Body (Scrollable) */}
				<div className="p-5 space-y-5 overflow-y-auto max-h-[calc(92vh-180px)]">
					{/* Phạm vi xuất (Áp dụng cho cả 2 tab) */}
					<div className="space-y-3">
						<label className="text-xs font-bold uppercase tracking-wider text-slate-500">
							Phạm vi xuất dữ liệu
						</label>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
								<input
									type="radio"
									name="exportScope"
									checked={exportScope === "all"}
									onChange={() => setExportScope("all")}
									className="mt-0.5 peer w-4 h-4 appearance-none border-2 border-slate-300 dark:border-slate-600 rounded-full checked:border-emerald-500 checked:border-[5px] transition-all cursor-pointer"
								/>
								<div>
									<p className="text-xs font-bold text-slate-800 dark:text-slate-200">
										Toàn bộ Sổ Hộ Khẩu
									</p>
									<p className="text-[11px] text-slate-500">
										Xuất toàn bộ sổ và nhân khẩu trong phạm vi.
									</p>
								</div>
							</label>

							<label
								className={`flex items-start gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors ${
									selectedCount === 0
										? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50"
										: "hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
								}`}
							>
								<input
									type="radio"
									name="exportScope"
									disabled={selectedCount === 0}
									checked={exportScope === "selected"}
									onChange={() => setExportScope("selected")}
									className="mt-0.5 peer w-4 h-4 appearance-none border-2 border-slate-300 dark:border-slate-600 rounded-full checked:border-emerald-500 checked:border-[5px] transition-all disabled:cursor-not-allowed cursor-pointer"
								/>
								<div>
									<p className="text-xs font-bold text-slate-800 dark:text-slate-200">
										Chỉ {selectedCount} Sổ Đã Chọn
									</p>
									<p className="text-[11px] text-slate-500">
										Chỉ xuất các hộ đã đánh dấu tích chọn.
									</p>
								</div>
							</label>
						</div>
					</div>

					{/* Nội dung Tab 1: Biểu mẫu 11 cột truyền thống */}
					{activeTab === "traditional" && (
						<div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
							<p className="text-xs font-bold text-slate-700 dark:text-slate-300">
								Quy chuẩn biểu mẫu Công an xã:
							</p>
							<p className="text-xs text-slate-500 leading-relaxed">
								Xuất file chuẩn gồm 11 cột truyền thống: STT, Chủ hộ, Thành viên,
								Họ đệm, Tên, Ngày tháng năm sinh, Tuổi, Nữ, DTTS, Tôn giáo, Ghi chú.
								Có sẵn tiêu đề UBND Xã Đăk Hà và phân tích hộ gia đình.
							</p>
						</div>
					)}

					{/* Nội dung Tab 2: Báo cáo chuyên đề tùy chọn */}
					{activeTab === "custom" && (
						<div className="space-y-5">
							{/* 1. Bộ lọc độ tuổi */}
							<div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
										1. Lọc theo độ tuổi
									</label>
									<div className="flex items-center gap-3 text-xs">
										<label className="flex items-center gap-1.5 cursor-pointer">
											<input
												type="radio"
												name="ageMode"
												checked={ageMode === "range"}
												onChange={() => setAgeMode("range")}
												className="w-3.5 h-3.5 text-emerald-600"
											/>
											Khoảng tuổi
										</label>
										<label className="flex items-center gap-1.5 cursor-pointer">
											<input
												type="radio"
												name="ageMode"
												checked={ageMode === "exact"}
												onChange={() => setAgeMode("exact")}
												className="w-3.5 h-3.5 text-emerald-600"
											/>
											Đúng tuổi
										</label>
									</div>
								</div>

								{ageMode === "range" ? (
									<div className="grid grid-cols-2 gap-3">
										<div>
											<label
												htmlFor="export-min-age"
												className="text-[11px] font-semibold text-slate-500 mb-1 block"
											>
												Từ tuổi
											</label>
											<input
												id="export-min-age"
												type="number"
												min="0"
												max="130"
												placeholder="VD: 18"
												value={minAge}
												onChange={(e) => setMinAge(e.target.value)}
												className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
											/>
										</div>
										<div>
											<label
												htmlFor="export-max-age"
												className="text-[11px] font-semibold text-slate-500 mb-1 block"
											>
												Đến tuổi
											</label>
											<input
												id="export-max-age"
												type="number"
												min="0"
												max="130"
												placeholder="VD: 27"
												value={maxAge}
												onChange={(e) => setMaxAge(e.target.value)}
												className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
											/>
										</div>
									</div>
								) : (
									<div>
										<label
											htmlFor="export-exact-age"
											className="text-[11px] font-semibold text-slate-500 mb-1 block"
										>
											Đúng một độ tuổi cụ thể
										</label>
										<input
											id="export-exact-age"
											type="number"
											min="0"
											max="130"
											placeholder="VD: 18"
											value={exactAge}
											onChange={(e) => setExactAge(e.target.value)}
											className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
										/>
									</div>
								)}
							</div>

							{/* 2. Tiêu chí khác */}
							<div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
								<label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
									2. Tiêu chí chuyên đề
								</label>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<label
											htmlFor="export-gender"
											className="text-[11px] font-semibold text-slate-500 mb-1 block"
										>
											Giới tính
										</label>
										<select
											id="export-gender"
											value={genderFilter}
											onChange={(e) => setGenderFilter(e.target.value)}
											className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
										>
											<option value="all">Tất cả giới tính</option>
											<option value="Nam">Nam</option>
											<option value="Nữ">Nữ</option>
										</select>
									</div>

									<div>
										<label
											htmlFor="export-military"
											className="text-[11px] font-semibold text-slate-500 mb-1 block"
										>
											Tình hình NVQS
										</label>
										<input
											id="export-military"
											type="text"
											placeholder="VD: Đủ điều kiện, Xuất ngũ..."
											value={militaryKeyword}
											onChange={(e) => setMilitaryKeyword(e.target.value)}
											className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
										/>
									</div>

									<div>
										<label
											htmlFor="export-education"
											className="text-[11px] font-semibold text-slate-500 mb-1 block"
										>
											Trình độ học vấn
										</label>
										<input
											id="export-education"
											type="text"
											placeholder="VD: Đại học, 12/12..."
											value={educationKeyword}
											onChange={(e) => setEducationKeyword(e.target.value)}
											className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
										/>
									</div>

									<div>
										<label
											htmlFor="export-occupation"
											className="text-[11px] font-semibold text-slate-500 mb-1 block"
										>
											Nghề nghiệp
										</label>
										<input
											id="export-occupation"
											type="text"
											placeholder="VD: Làm nông, Công nhân..."
											value={occupationKeyword}
											onChange={(e) => setOccupationKeyword(e.target.value)}
											className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
										/>
									</div>
								</div>
							</div>

							{/* 3. Tùy biến cột xuất (16 cột) */}
							<div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
										3. Tùy biến cột xuất ({selectedColumns.size}/
										{EXPORT_COLUMNS.length} cột)
									</label>
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={handleSelectAllColumns}
											className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
										>
											<CheckSquare className="w-3.5 h-3.5" />
											Chọn tất cả
										</button>
										<span className="text-slate-300 dark:text-slate-700">|</span>
										<button
											type="button"
											onClick={handleDeselectAllColumns}
											className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
										>
											<Square className="w-3.5 h-3.5" />
											Bỏ chọn tất cả
										</button>
									</div>
								</div>

								<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
									{EXPORT_COLUMNS.map((col) => {
										const isChecked = selectedColumns.has(col.key);
										return (
											<label
												key={col.key}
												className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all select-none ${
													isChecked
														? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-900 dark:text-white font-medium"
														: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 opacity-70"
												}`}
											>
												<input
													type="checkbox"
													checked={isChecked}
													onChange={() => handleToggleColumn(col.key)}
													className="w-3.5 h-3.5 text-emerald-600 rounded-sm focus:ring-emerald-500"
												/>
												<span className="truncate">{col.label}</span>
											</label>
										);
									})}
								</div>
								{selectedColumns.size === 0 && (
									<p className="text-[11px] text-amber-500 font-medium">
										* Vui lòng chọn ít nhất 1 cột để xuất dữ liệu.
									</p>
								)}
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
					<button
						type="button"
						onClick={onClose}
						className="h-10 px-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
					>
						Hủy
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						disabled={
							exporting ||
							(activeTab === "custom" && selectedColumns.size === 0)
						}
						className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
					>
						{exporting ? "Đang xử lý..." : "Xuất tệp Excel"}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
};
