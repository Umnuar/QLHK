import { Check, ChevronDown, Minus, Plus } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

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

	useEffect(() => {
		setInputValue(String(year));
	}, [year, isOpen]);

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

	const currentYear = new Date().getFullYear();
	const quickYears = useMemo(() => {
		const start = currentYear - 1;
		const end = currentYear + 8;
		const years: number[] = [];
		for (let y = start; y <= end; y++) {
			years.push(y);
		}
		return years;
	}, [currentYear]);

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

	const isFiltered = year !== currentYear;

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className={`h-8 sm:h-9 px-2.5 py-1 text-xs rounded-xl flex items-center justify-between gap-1.5 cursor-pointer select-none transition-all outline-hidden ${
					isFiltered
						? "border-emerald-500/80 bg-emerald-50/70 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-600 font-bold hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40"
						: "bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 font-medium"
				} ${
					isOpen ? "ring-2 ring-emerald-500/20 border-emerald-500" : ""
				}`}
			>
				<div className="flex items-center gap-1.5 min-w-0">
					{isFiltered && (
						<span
							className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0"
							aria-hidden="true"
						/>
					)}
					<span className="truncate">Năm {year}</span>
				</div>
				<ChevronDown
					className={`w-3.5 h-3.5 ${
						isFiltered
							? "text-emerald-600 dark:text-emerald-400"
							: "text-slate-400"
					}`}
					strokeWidth={1.5}
				/>
			</button>

			{isOpen && (
				<div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-56 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 space-y-3 animate-in fade-in zoom-in-95 duration-100">
					<div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
						Năm Tính Toán
					</div>

					<div className="flex items-center justify-between gap-1.5">
						<button
							type="button"
							onClick={() => handleStep(-1)}
							aria-label="Giảm 1 năm"
							className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer transition-colors active:scale-95 flex items-center justify-center"
						>
							<Minus className="w-3.5 h-3.5" strokeWidth={1.5} />
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
							<Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
						</button>
					</div>

					<div className="pt-1 border-t border-slate-100 dark:border-slate-800">
						<div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
							Chọn nhanh
						</div>
						<div className="grid grid-cols-3 gap-1">
							{quickYears.map((y) => {
								const isSelected = y === year;
								return (
									<button
										key={y}
										type="button"
										onClick={() => {
											onYearChange(y);
											setInputValue(String(y));
											setIsOpen(false);
										}}
										className={`py-1 px-1.5 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
											isSelected
												? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50 font-bold"
												: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent"
										}`}
									>
										<span>{y}</span>
										{isSelected && (
											<Check className="w-2.5 h-2.5 ml-0.5 text-emerald-600" strokeWidth={1.5} />
										)}
									</button>
								);
							})}
						</div>
					</div>

					<div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
						<button
							type="button"
							onClick={handleCurrentYear}
							className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
						>
							Năm nay ({currentYear})
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
