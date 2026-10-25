import React, { useMemo } from "react";
import { AlertCircle, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import {
	HOUSEHOLD_SYSTEM_FIELDS,
	type HouseholdSystemField,
} from "@/utils/householdExcelFields";

export interface ColumnMappingStepProps {
	headers: string[];
	sampleRow: Record<string, any>;
	mapping: Record<string, string>;
	onMappingChange: (fieldKey: string, header: string) => void;
	onAutoSuggest: () => void;
	onReset: () => void;
}

export const ColumnMappingStep: React.FC<ColumnMappingStepProps> = ({
	headers,
	sampleRow,
	mapping,
	onMappingChange,
	onAutoSuggest,
	onReset,
}) => {
	const mappedCount = useMemo(
		() => Object.values(mapping).filter(Boolean).length,
		[mapping],
	);

	const missingRequired = useMemo(
		() => HOUSEHOLD_SYSTEM_FIELDS.filter((f) => f.required && !mapping[f.key]),
		[mapping],
	);

	return (
		<div className="space-y-4">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
				<div>
					<h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
						<span>Ánh xạ các cột biểu mẫu Excel</span>
						<span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
							{mappedCount}/{HOUSEHOLD_SYSTEM_FIELDS.length} trường đã khớp
						</span>
					</h3>
					<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
						Hệ thống tự động nhận diện cột tương ứng. Vui lòng kiểm tra và khớp các cột bắt buộc.
					</p>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={onAutoSuggest}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
					>
						<Sparkles className="w-3.5 h-3.5" />
						<span>Tự động khớp</span>
					</button>

					<button
						type="button"
						onClick={onReset}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
					>
						<RotateCcw className="w-3.5 h-3.5" />
						<span>Đặt lại</span>
					</button>
				</div>
			</div>

			{missingRequired.length > 0 && (
				<div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
					<AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
					<span>
						Chưa ánh xạ cột bắt buộc:{" "}
						<strong>{missingRequired.map((f) => f.label).join(", ")}</strong>. Vui lòng chọn cột tương ứng để tiếp tục.
					</span>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
				{HOUSEHOLD_SYSTEM_FIELDS.map((field) => {
					const selectedHeader = mapping[field.key] || "";
					const sampleValue = selectedHeader ? sampleRow[selectedHeader] : null;

					return (
						<div
							key={field.key}
							className={`p-3.5 rounded-2xl border transition-all ${
								field.required && !selectedHeader
									? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
									: selectedHeader
										? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
										: "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-80"
							}`}
						>
							<div className="flex items-center justify-between gap-2 mb-2">
								<div className="flex items-center gap-1.5 min-w-0">
									<span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
										{field.label}
									</span>
									{field.required && (
										<span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
											Bắt buộc
										</span>
									)}
								</div>

								{selectedHeader ? (
									<span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
										<CheckCircle2 className="w-3 h-3" />
										<span>Đã khớp</span>
									</span>
								) : (
									<span className="text-[11px] text-slate-400">Chưa chọn</span>
								)}
							</div>

							<div className="space-y-1.5">
								<select
									aria-label={field.label}
									value={selectedHeader}
									onChange={(e) => onMappingChange(field.key, e.target.value)}
									className="w-full text-xs font-medium py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
								>
									<option value="">-- Bỏ qua / Không ánh xạ --</option>
									{headers.map((h) => (
										<option key={h} value={h}>
											{h}
										</option>
									))}
								</select>

								{selectedHeader && sampleValue !== undefined && sampleValue !== null && String(sampleValue).trim() !== "" ? (
									<div className="text-[11px] text-slate-500 dark:text-slate-400 truncate px-1">
										<span className="text-slate-400">Dữ liệu mẫu: </span>
										<span className="font-semibold text-emerald-600 dark:text-emerald-400">
											{String(sampleValue)}
										</span>
									</div>
								) : (
									<p className="text-[11px] text-slate-400 dark:text-slate-500 truncate px-1">
										{field.description}
									</p>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
