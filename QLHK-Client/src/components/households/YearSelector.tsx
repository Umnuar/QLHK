import { ChevronDown, Minus, Plus, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

export interface YearSelectorProps {
	year: number;
	onYearChange: (year: number) => void;
	className?: string;
}

export const YearSelector: React.FC<YearSelectorProps> = ({
	year,
	onYearChange,
	className = "",
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [inputValue, setInputValue] = useState(String(year));
	const containerRef = useRef<HTMLDivElement>(null);
	const currentYear = new Date().getFullYear();
	const isFilteredYear = year !== currentYear;

	// Sync input value whenever year changes or popover opens
	useEffect(() => {
		setInputValue(String(year));
	}, [year, isOpen]);

	// Click outside listener
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
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

	const handleCommit = (val?: string) => {
		const v = (val !== undefined ? val : inputValue).trim();
		const parsed = parseInt(v, 10);
		if (!isNaN(parsed) && parsed >= 1900 && parsed <= 2100) {
			if (parsed !== year) {
				onYearChange(parsed);
			}
			setIsOpen(false);
		} else {
			setInputValue(String(year));
		}
	};

	const handleStep = (delta: number) => {
		const current = parseInt(inputValue, 10) || year;
		const nextVal = Math.min(2100, Math.max(1900, current + delta));
		setInputValue(String(nextVal));
	};

	const handleCurrentYear = () => {
		setInputValue(String(currentYear));
		if (currentYear !== year) {
			onYearChange(currentYear);
		}
		setIsOpen(false);
	};

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			{/* Trigger button */}
			<div
				onClick={() => setIsOpen(!isOpen)}
				className={`h-8 sm:h-9 px-2.5 py-1 text-xs rounded-xl flex items-center justify-between gap-1.5 shadow-2xs cursor-pointer select-none transition-all ${
					isFilteredYear
						? "border border-emerald-500/80 bg-emerald-50/70 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100 dark:border-emerald-600 font-bold shadow-xs"
						: "border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium hover:border-slate-300 dark:hover:border-slate-600"
				} ${isOpen ? "ring-2 ring-emerald-500/20 border-emerald-500" : ""}`}
			>
				<div className="flex items-center gap-1.5 min-w-0">
					{isFilteredYear && (
						<span
							className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0"
							title="Đang áp dụng lọc theo năm"
							aria-hidden="true"
						/>
					)}
					<span className="truncate tabular-nums">Năm {year}</span>
				</div>
				<div className="flex items-center gap-0.5 shrink-0">
					{isFilteredYear && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleCurrentYear();
							}}
							aria-label="Đặt lại năm hiện tại"
							title="Đặt lại năm hiện tại"
							className="p-0.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-full transition-colors cursor-pointer mr-0.5"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					)}
					<ChevronDown
						className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
							isFilteredYear
								? "text-emerald-600 dark:text-emerald-400"
								: "text-slate-400"
						} ${isOpen ? "rotate-180" : ""}`}
					/>
				</div>
			</div>

			{/* Popover */}
			{isOpen && (
				<div className="absolute right-0 top-full mt-1.5 w-52 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 space-y-3 animate-in fade-in zoom-in-95 duration-100">
					<div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
						Năm Tính Toán
					</div>

					{/* Stepper điều chỉnh năm */}
					<div className="flex items-center justify-between gap-1.5">
						<button
							type="button"
							onClick={() => handleStep(-1)}
							aria-label="Giảm 1 năm"
							className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer transition-colors active:scale-95 flex items-center justify-center"
						>
							<Minus className="w-3.5 h-3.5" />
						</button>

						<input
							type="text"
							value={inputValue}
							onChange={(e) => {
								const cleaned = e.target.value.replace(/\D/g, "").slice(0, 4);
								setInputValue(cleaned);
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleCommit();
								}
							}}
							placeholder="Nhập năm..."
							className="w-20 px-2 py-1 text-center font-mono font-bold text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
						/>

						<button
							type="button"
							onClick={() => handleStep(1)}
							aria-label="Tăng 1 năm"
							className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer transition-colors active:scale-95 flex items-center justify-center"
						>
							<Plus className="w-3.5 h-3.5" />
						</button>
					</div>

					{/* Hàng nút thao tác dưới */}
					<div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
						<button
							type="button"
							onClick={handleCurrentYear}
							className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
						>
							Năm nay
						</button>

						<button
							type="button"
							onClick={() => handleCommit()}
							className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
						>
							Áp dụng
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default YearSelector;
