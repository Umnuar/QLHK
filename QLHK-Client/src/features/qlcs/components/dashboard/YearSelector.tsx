import {
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type CalculationPrecision = "year" | "month" | "date";

export interface CalculationTarget {
	precision: CalculationPrecision;
	year: number;
	month?: number;
	day?: number;
	displayLabel: string;
	referenceDate: Date;
}

export interface YearSelectorProps {
	year: number;
	onYearChange: (year: number) => void;
	target?: CalculationTarget;
	onTargetChange?: (target: CalculationTarget) => void;
	className?: string;
}

export const YearSelector: React.FC<YearSelectorProps> = ({
	year,
	onYearChange,
	target,
	onTargetChange,
	className = "",
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const now = useMemo(() => new Date(), []);
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;
	const currentDay = now.getDate();

	const activeTarget: CalculationTarget = useMemo(() => {
		if (target) return target;
		return {
			precision: "year",
			year,
			displayLabel: `Năm ${year}`,
			referenceDate: new Date(year, 11, 31),
		};
	}, [target, year]);

	const [mode, setMode] = useState<CalculationPrecision>(activeTarget.precision);
	const [viewYear, setViewYear] = useState<number>(activeTarget.year);
	const [viewMonth, setViewMonth] = useState<number>(
		activeTarget.month ? activeTarget.month - 1 : now.getMonth(),
	);
	const [decadeStart, setDecadeStart] = useState<number>(
		Math.floor(activeTarget.year / 10) * 10,
	);

	useEffect(() => {
		if (target) {
			setMode(target.precision);
			setViewYear(target.year);
			if (target.month) setViewMonth(target.month - 1);
			setDecadeStart(Math.floor(target.year / 10) * 10);
		} else {
			setViewYear(year);
			setDecadeStart(Math.floor(year / 10) * 10);
		}
	}, [target, year]);

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

	const applyTarget = useCallback(
		(newTarget: CalculationTarget) => {
			if (onTargetChange) {
				onTargetChange(newTarget);
			}
			if (newTarget.year !== year) {
				onYearChange(newTarget.year);
			}
			setIsOpen(false);
		},
		[onTargetChange, onYearChange, year],
	);

	const handlePrev = () => {
		if (mode === "date") {
			if (viewMonth === 0) {
				setViewMonth(11);
				setViewYear((prev) => {
					const next = prev - 1;
					setDecadeStart(Math.floor(next / 10) * 10);
					return next;
				});
			} else {
				setViewMonth((prev) => prev - 1);
			}
		} else if (mode === "month") {
			setViewYear((prev) => {
				const next = prev - 1;
				setDecadeStart(Math.floor(next / 10) * 10);
				return next;
			});
		} else {
			setDecadeStart((prev) => prev - 10);
		}
	};

	const handleNext = () => {
		if (mode === "date") {
			if (viewMonth === 11) {
				setViewMonth(0);
				setViewYear((prev) => {
					const next = prev + 1;
					setDecadeStart(Math.floor(next / 10) * 10);
					return next;
				});
			} else {
				setViewMonth((prev) => prev + 1);
			}
		} else if (mode === "month") {
			setViewYear((prev) => {
				const next = prev + 1;
				setDecadeStart(Math.floor(next / 10) * 10);
				return next;
			});
		} else {
			setDecadeStart((prev) => prev + 10);
		}
	};

	const daysInMonth = useMemo(() => {
		return new Date(viewYear, viewMonth + 1, 0).getDate();
	}, [viewYear, viewMonth]);

	const firstDayOfWeek = useMemo(() => {
		return new Date(viewYear, viewMonth, 1).getDay();
	}, [viewYear, viewMonth]);

	const isFiltered =
		activeTarget.precision !== "year" || activeTarget.year !== currentYear;

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				aria-expanded={isOpen}
				className={`h-8 sm:h-9 px-2.5 text-xs rounded-xl flex items-center justify-between gap-2 cursor-pointer select-none transition-all outline-hidden ${
					isFiltered
						? "border-emerald-500/80 bg-emerald-50/70 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100 dark:border-emerald-600 font-bold shadow-xs hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40"
						: "bg-slate-50 border border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 font-semibold"
				} ${isOpen ? "ring-2 ring-emerald-500/20 border-emerald-500 dark:border-emerald-500" : ""}`}
			>
				<span className="truncate font-semibold text-xs">
					{activeTarget.displayLabel}
				</span>
				<ChevronDown
					className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 text-slate-400 ${
						isOpen ? "rotate-180 text-emerald-600 dark:text-emerald-400" : ""
					}`}
					strokeWidth={1.5}
				/>
			</button>

			{isOpen && (
				<div
					role="dialog"
					aria-label="Chọn mốc thời gian tính toán chính sách"
					className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3.5 animate-in fade-in zoom-in-95 duration-150 space-y-3"
				>
					<div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
						<button
							type="button"
							onClick={() => setMode("date")}
							className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
								mode === "date"
									? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
									: "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
							}`}
						>
							Theo Ngày
						</button>
						<button
							type="button"
							onClick={() => setMode("month")}
							className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
								mode === "month"
									? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
									: "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
							}`}
						>
							Theo Tháng
						</button>
						<button
							type="button"
							onClick={() => setMode("year")}
							className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
								mode === "year"
									? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
									: "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
							}`}
						>
							Theo Năm
						</button>
					</div>

					<div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
						<button
							type="button"
							onClick={handlePrev}
							aria-label="Lùi lại"
							className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
						>
							<ChevronLeft className="w-4 h-4" />
						</button>

						<div className="text-center">
							{mode === "date" && (
								<div className="flex items-center justify-center gap-1">
									<button
										type="button"
										onClick={() => setMode("month")}
										className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
										title="Nhấn để đổi Tháng"
									>
										Tháng {viewMonth + 1}
									</button>
									<span className="text-xs text-slate-400">,</span>
									<button
										type="button"
										onClick={() => {
											setDecadeStart(Math.floor(viewYear / 10) * 10);
											setMode("year");
										}}
										className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
										title="Nhấn để đổi Năm"
									>
										{viewYear}
									</button>
								</div>
							)}

							{mode === "month" && (
								<button
									type="button"
									onClick={() => {
										setDecadeStart(Math.floor(viewYear / 10) * 10);
										setMode("year");
									}}
									className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-0.5 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1"
									title="Nhấn để đổi Năm"
								>
									<span>Năm {viewYear}</span>
									<ChevronDown className="w-3 h-3 text-slate-400" />
								</button>
							)}

							{mode === "year" && (
								<span className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 px-2 py-0.5">
									{decadeStart} - {decadeStart + 9}
								</span>
							)}
						</div>

						<button
							type="button"
							onClick={handleNext}
							aria-label="Tiến tới"
							className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
						>
							<ChevronRight className="w-4 h-4" />
						</button>
					</div>

					{mode === "date" && (
						<div className="space-y-1">
							<div className="grid grid-cols-7 gap-1 text-center mb-1">
								{["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((dName, idx) => (
									<div
										key={dName}
										className={`text-[10px] font-bold py-1 ${
											idx === 0
												? "text-rose-500 dark:text-rose-400"
												: "text-slate-400 dark:text-slate-500"
										}`}
									>
										{dName}
									</div>
								))}
							</div>

							<div className="grid grid-cols-7 gap-1 text-center">
								{Array.from({ length: firstDayOfWeek }).map((_, i) => (
									<div key={`pad-${i}`} className="h-8 w-full" />
								))}

								{Array.from({ length: daysInMonth }).map((_, i) => {
									const dayNum = i + 1;
									const isSelected =
										activeTarget.precision === "date" &&
										activeTarget.year === viewYear &&
										activeTarget.month === viewMonth + 1 &&
										activeTarget.day === dayNum;
									const isToday =
										currentYear === viewYear &&
										currentMonth === viewMonth + 1 &&
										currentDay === dayNum;

									return (
										<button
											key={`day-${dayNum}`}
											type="button"
											onClick={() =>
												applyTarget({
													precision: "date",
													year: viewYear,
													month: viewMonth + 1,
													day: dayNum,
													displayLabel: `${String(dayNum).padStart(2, "0")}/${String(viewMonth + 1).padStart(2, "0")}/${viewYear}`,
													referenceDate: new Date(viewYear, viewMonth, dayNum),
												})
											}
											className={`h-8 w-full rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
												isSelected
													? "bg-emerald-600 text-white shadow-xs"
													: isToday
														? "border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
														: "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
											}`}
										>
											{dayNum}
										</button>
									);
								})}
							</div>

							<div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
								<button
									type="button"
									onClick={() =>
										applyTarget({
											precision: "date",
											year: currentYear,
											month: currentMonth,
											day: currentDay,
											displayLabel: `${String(currentDay).padStart(2, "0")}/${String(currentMonth).padStart(2, "0")}/${currentYear}`,
											referenceDate: new Date(currentYear, currentMonth - 1, currentDay),
										})
									}
									className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
								>
									Hôm nay ({String(currentDay).padStart(2, "0")}/{String(currentMonth).padStart(2, "0")}/{currentYear})
								</button>

								<button
									type="button"
									onClick={() =>
										applyTarget({
											precision: "month",
											year: viewYear,
											month: viewMonth + 1,
											displayLabel: `Tháng ${String(viewMonth + 1).padStart(2, "0")}/${viewYear}`,
											referenceDate: new Date(viewYear, viewMonth + 1, 0),
										})
									}
									className="font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 cursor-pointer"
								>
									Tính cả Tháng {viewMonth + 1}
								</button>
							</div>
						</div>
					)}

					{mode === "month" && (
						<div className="space-y-2">
							<div className="grid grid-cols-3 gap-1.5 py-1">
								{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((thang) => {
									const isSelected =
										activeTarget.precision === "month" &&
										activeTarget.year === viewYear &&
										activeTarget.month === thang;
									const isCurrentMonth =
										currentYear === viewYear && currentMonth === thang;

									return (
										<button
											key={`thang-${thang}`}
											type="button"
											onClick={() =>
												applyTarget({
													precision: "month",
													year: viewYear,
													month: thang,
													displayLabel: `Tháng ${String(thang).padStart(2, "0")}/${viewYear}`,
													referenceDate: new Date(viewYear, thang, 0),
												})
											}
											className={`h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
												isSelected
													? "bg-emerald-600 text-white shadow-xs"
													: isCurrentMonth
														? "border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
														: "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60"
											}`}
										>
											Tháng {thang}
										</button>
									);
								})}
							</div>

							<div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
								<button
									type="button"
									onClick={() =>
										applyTarget({
											precision: "month",
											year: currentYear,
											month: currentMonth,
											displayLabel: `Tháng ${String(currentMonth).padStart(2, "0")}/${currentYear}`,
											referenceDate: new Date(currentYear, currentMonth, 0),
										})
									}
									className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
								>
									Tháng này ({String(currentMonth).padStart(2, "0")}/{currentYear})
								</button>

								<button
									type="button"
									onClick={() =>
										applyTarget({
											precision: "year",
											year: viewYear,
											displayLabel: `Năm ${viewYear}`,
											referenceDate: new Date(viewYear, 11, 31),
										})
									}
									className="font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 cursor-pointer"
								>
									Tính cả Năm {viewYear}
								</button>
							</div>
						</div>
					)}

					{mode === "year" && (
						<div className="space-y-2">
							<div className="grid grid-cols-3 gap-1.5 py-1">
								{[-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((offset) => {
									const yearNum = decadeStart + offset;
									const isSelected =
										activeTarget.precision === "year" &&
										activeTarget.year === yearNum;
									const isCurrentYearNumber = currentYear === yearNum;
									const isOutOfDecade =
										yearNum < decadeStart || yearNum > decadeStart + 9;

									return (
										<button
											key={`year-${yearNum}`}
											type="button"
											onClick={() =>
												applyTarget({
													precision: "year",
													year: yearNum,
													displayLabel: `Năm ${yearNum}`,
													referenceDate: new Date(yearNum, 11, 31),
												})
											}
											className={`h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
												isSelected
													? "bg-emerald-600 text-white shadow-xs"
													: isCurrentYearNumber
														? "border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
														: isOutOfDecade
															? "text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
															: "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60"
											}`}
										>
											<span>{yearNum}</span>
											{isSelected && (
												<Check className="w-3 h-3 ml-1 text-white" />
											)}
										</button>
									);
								})}
							</div>

							<div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
								<button
									type="button"
									onClick={() =>
										applyTarget({
											precision: "year",
											year: currentYear,
											displayLabel: `Năm ${currentYear}`,
											referenceDate: new Date(currentYear, 11, 31),
										})
									}
									className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
								>
									Năm nay ({currentYear})
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default YearSelector;
