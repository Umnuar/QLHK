import { Check, ChevronDown, Users, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

export interface AgeFilter {
	min?: number;
	max?: number;
	label: string;
}

interface AgeFilterPopoverProps {
	currentFilter: AgeFilter | null;
	onSelectFilter: (filter: AgeFilter | null) => void;
}

interface PresetItem {
	label: string;
	min?: number;
	max?: number;
}

const PRESETS: PresetItem[] = [
	{ label: "< 6 tuổi", max: 5 },
	{ label: "6 - 17 tuổi", min: 6, max: 17 },
	{ label: "Tròn 14 tuổi", min: 14, max: 14 },
	{ label: "Tròn 18 tuổi", min: 18, max: 18 },
	{ label: "18 - 27 tuổi", min: 18, max: 27 },
	{ label: "18 - 60 tuổi", min: 18, max: 60 },
	{ label: "≥ 60 tuổi", min: 60 },
	{ label: "≥ 80 tuổi", min: 80 },
];

export const AgeFilterPopover: React.FC<AgeFilterPopoverProps> = ({
	currentFilter,
	onSelectFilter,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [customMin, setCustomMin] = useState<string>("");
	const [customMax, setCustomMax] = useState<string>("");
	const popoverRef = useRef<HTMLDivElement>(null);

	// Đồng bộ custom inputs khi filter bên ngoài thay đổi
	useEffect(() => {
		if (currentFilter) {
			setCustomMin(
				currentFilter.min !== undefined ? String(currentFilter.min) : "",
			);
			setCustomMax(
				currentFilter.max !== undefined ? String(currentFilter.max) : "",
			);
		} else {
			setCustomMin("");
			setCustomMax("");
		}
	}, [currentFilter]);

	// Đóng popover khi click ra ngoài
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				popoverRef.current &&
				!popoverRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const handleSelectPreset = (preset: PresetItem) => {
		onSelectFilter({
			min: preset.min,
			max: preset.max,
			label: preset.label,
		});
		setIsOpen(false);
	};

	const handleApplyCustom = (e: React.FormEvent) => {
		e.preventDefault();
		const minVal =
			customMin.trim() !== "" ? parseInt(customMin, 10) : undefined;
		const maxVal =
			customMax.trim() !== "" ? parseInt(customMax, 10) : undefined;

		if (minVal === undefined && maxVal === undefined) {
			onSelectFilter(null);
			setIsOpen(false);
			return;
		}

		let min =
			minVal !== undefined && !isNaN(minVal) ? Math.max(0, minVal) : undefined;
		let max =
			maxVal !== undefined && !isNaN(maxVal) ? Math.max(0, maxVal) : undefined;

		// Nếu người dùng nhập min > max, tự động hoán đổi hợp lý
		if (min !== undefined && max !== undefined && min > max) {
			const temp = min;
			min = max;
			max = temp;
		}

		let label = "";
		if (min !== undefined && max !== undefined) {
			label = `${min} - ${max} tuổi`;
		} else if (min !== undefined) {
			label = `≥ ${min} tuổi`;
		} else if (max !== undefined) {
			label = `≤ ${max} tuổi`;
		}

		onSelectFilter({ min, max, label });
		setIsOpen(false);
	};

	const handleClear = () => {
		setCustomMin("");
		setCustomMax("");
		onSelectFilter(null);
		setIsOpen(false);
	};

	// Kiểm tra xem preset có đang được chọn hay không
	const isPresetActive = (preset: PresetItem) => {
		if (!currentFilter) return false;
		return currentFilter.min === preset.min && currentFilter.max === preset.max;
	};

	return (
		<div className="relative inline-block text-left" ref={popoverRef}>
			{/* Nút Trigger */}
			{currentFilter ? (
				<div
					onClick={() => setIsOpen(!isOpen)}
					className="h-8 sm:h-9 px-2.5 py-1 text-xs font-semibold rounded-xl border border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-1.5 shadow-xs cursor-pointer select-none transition-all"
				>
					<div className="flex items-center gap-1.5 min-w-0">
						<span
							className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0"
							title="Đang áp dụng lọc độ tuổi"
							aria-hidden="true"
						/>
						<span className="truncate">{currentFilter.label}</span>
					</div>
					<div className="flex items-center gap-1 shrink-0">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleClear();
							}}
							title="Xóa lọc độ tuổi"
							aria-label="Xóa lọc độ tuổi"
							className="p-0.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-full transition-colors cursor-pointer"
						>
							<X className="w-3.5 h-3.5" />
						</button>
						<ChevronDown
							className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 ${
								isOpen ? "rotate-180" : ""
							}`}
						/>
					</div>
				</div>
			) : (
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					aria-expanded={isOpen}
					aria-haspopup="true"
					className={`h-8 sm:h-9 px-2.5 py-1 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 flex items-center justify-between gap-1.5 shadow-2xs hover:border-emerald-500/50 cursor-pointer select-none transition-all ${
						isOpen ? "ring-2 ring-emerald-500/20 border-emerald-500" : ""
					}`}
				>
					<span className="truncate">Lọc Độ Tuổi</span>
					<ChevronDown
						className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
							isOpen ? "rotate-180" : ""
						}`}
					/>
				</button>
			)}

			{/* Popover Panel */}
			{isOpen && (
				<div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-64 sm:w-72 bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-xl border border-slate-200 dark:border-slate-800 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-100">
					{/* Header */}
					<div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
						<div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-xs">
							<Users className="w-3.5 h-3.5 text-emerald-500" />
							<span>Lọc Theo Nhóm Tuổi</span>
						</div>
						{currentFilter && (
							<button
								type="button"
								onClick={handleClear}
								className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
							>
								Xóa lọc
							</button>
						)}
					</div>

					{/* Presets List */}
					<div>
						<div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 px-0.5">
							Nhóm tuổi phổ biến
						</div>
						<div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
							{PRESETS.map((preset, idx) => {
								const active = isPresetActive(preset);
								return (
									<button
										key={idx}
										type="button"
										onClick={() => handleSelectPreset(preset)}
										className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left text-xs font-semibold transition-all border cursor-pointer ${
											active
												? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs"
												: "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"
										}`}
									>
										<span>{preset.label}</span>
										{active && (
											<Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* Custom Range Form */}
					<form
						onSubmit={handleApplyCustom}
						className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5"
					>
						<div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
							Tùy chỉnh khoảng tuổi
						</div>
						<div className="flex items-center gap-2">
							<div className="flex-1">
								<input
									type="number"
									min={0}
									max={120}
									value={customMin}
									onChange={(e) => setCustomMin(e.target.value)}
									placeholder="Từ (ví dụ: 18)"
									className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
								/>
							</div>
							<span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
								đến
							</span>
							<div className="flex-1">
								<input
									type="number"
									min={0}
									max={120}
									value={customMax}
									onChange={(e) => setCustomMax(e.target.value)}
									placeholder="Đến (ví dụ: 60)"
									className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
								/>
							</div>
						</div>

						<div className="flex items-center justify-end gap-2 pt-1">
							<button
								type="button"
								onClick={() => setIsOpen(false)}
								className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
							>
								Đóng
							</button>
							<button
								type="submit"
								className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 rounded-lg shadow-xs transition-colors cursor-pointer"
							>
								Áp dụng
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
};
