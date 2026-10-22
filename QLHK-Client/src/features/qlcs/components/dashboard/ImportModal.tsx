import clsx from "@/utils/clsx";
import {
	AlertCircle,
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Check,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	HelpCircle,
	Layers,
	Loader2,
	RefreshCw,
	RotateCcw,
	Save,
	SlidersHorizontal,
	UploadCloud,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExcelDropzone } from "./ExcelDropzone";
import { formatVietnameseNumber } from "@/components/common/tableStyles";
import {
	SYSTEM_FIELDS,
} from "@/utils/policyExcelFields";
import type {
	ExcelMappingData,
	ImportPreviewData,
	ImportStep,
} from "@/hooks/useImportExport";
import type { TabType } from "@/types";

export interface ImportModalProps {
	isImportModalOpen: boolean;
	setIsImportModalOpen: (b: boolean) => void;
	isImporting: boolean;
	importProgress: number;
	importResult: {
		created: number;
		updated: number;
		failed?: number;
		errors: string[];
		total: number;
	} | null;
	setImportResult: (res: any) => void;
	previewData: ImportPreviewData | null;
	confirmImport: (config?: {
		selectedVillageId?: string;
		calculationYear?: number;
	}) => void;
	cancelImport: () => void;
	fileInputRef: React.RefObject<HTMLInputElement>;
	handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
	handleDownloadTemplate: () => void;
	activeTab: TabType;
	isDarkMode?: boolean;
	panelClass?: string;
	softTextClass?: string;

	importStep?: ImportStep;
	mappingData?: ExcelMappingData | null;
	customMapping?: Record<string, string>;
	setCustomMapping?: (mapping: Record<string, string>) => void;
	applyMapping?: (mapping: Record<string, string>) => void;
	goToMappingStep?: () => void;
	goToUploadStep?: () => void;
}

const isDobError = (dob: any) => {
	if (!dob) return true;
	const s = String(dob).trim();
	if (s.includes("/") && s.split("/").length === 3) {
		const parts = s.split("/");
		const d = parseInt(parts[0], 10);
		const m = parseInt(parts[1], 10);
		const y = parseInt(parts[2], 10);
		return (
			isNaN(d) ||
			isNaN(m) ||
			isNaN(y) ||
			m < 1 ||
			m > 12 ||
			d < 1 ||
			d > 31 ||
			y < 1900 ||
			y > 2100
		);
	}
	if (/^\d{4}$/.test(s)) {
		const y = parseInt(s, 10);
		return isNaN(y) || y < 1900 || y > 2100;
	}
	return true;
};

const getRowIssueInfo = (row: any) => {
	if (!row.name || String(row.name).trim() === "") {
		return { isError: true, isWarning: false, reason: "Thiếu họ và tên" };
	}
	if (isDobError(row.dob)) {
		return {
			isError: true,
			isWarning: false,
			reason: "Ngày sinh không đúng định dạng",
		};
	}
	if (row.hasError) {
		return {
			isError: true,
			isWarning: false,
			reason: row.errorMessage || "Lỗi dữ liệu",
		};
	}
	if (row.hasWarning) {
		return {
			isError: false,
			isWarning: true,
			reason: row.warningMessage || "Cảnh báo",
		};
	}
	return { isError: false, isWarning: false, reason: "Hợp lệ" };
};

const getMilestoneDisplay = (p: any, tab: TabType) => {
	if (tab === "chuctho") {
		return p.age_milestone ? `${p.age_milestone} tuổi` : "Chưa xác định";
	}
	const list: string[] = [];
	if (p.age75plus) list.push("Đủ 75+");
	if (p.age70to74poor) list.push("70-74 Nghèo");
	if (p.baoTro || p.bao_tro) list.push("Bảo trợ");
	if (p.huuTri || p.huu_tri) list.push("Hưu trí");
	if (p.huuTuatBaoHiem || p.huu_tuat_bao_hiem) list.push("Hưu/Tuất");
	if (p.nguoiCoCong || p.nguoi_co_cong) list.push("Có công");
	return list.length > 0 ? list.join(", ") : p.subCategory || "HTXH";
};

export const ImportModal: React.FC<ImportModalProps> = ({
	isImportModalOpen,
	setIsImportModalOpen,
	isImporting,
	importProgress,
	importResult,
	setImportResult,
	previewData,
	confirmImport,
	cancelImport,
	fileInputRef,
	handleFileUpload,
	handleDownloadTemplate,
	activeTab,
	isDarkMode: _isDarkMode,
	panelClass: _panelClass,
	softTextClass: _softTextClass,

	importStep = "upload",
	mappingData = null,
	customMapping = {},
	applyMapping,
	goToMappingStep,
	goToUploadStep,
}) => {
	const [fileDropError, setFileDropError] = useState<string | null>(null);
	const [filterOnlyIssues, setFilterOnlyIssues] = useState(false);
	const [showErrorDetails, setShowErrorDetails] = useState(false);
	const [previewPage, setPreviewPage] = useState(1);
	const previewLimit = 50;

	const [localMapping, setLocalMapping] =
		useState<Record<string, string>>(customMapping);

	useEffect(() => {
		if (customMapping && Object.keys(customMapping).length > 0) {
			setLocalMapping(customMapping);
		} else if (mappingData?.suggestedMapping) {
			setLocalMapping(mappingData.suggestedMapping);
		}
	}, [customMapping, mappingData]);

	const modalRef = useRef<HTMLDivElement>(null);

	const currentStepNumber = useMemo(() => {
		if (importResult || importStep === "result") return 4;
		if (previewData && importStep === "preview") return 3;
		if (mappingData && importStep === "mapping") return 2;
		return 1;
	}, [importResult, importStep, mappingData, previewData]);

	const handleCloseModal = useCallback(() => {
		if (isImporting) return;
		cancelImport();
		setIsImportModalOpen(false);
	}, [cancelImport, isImporting, setIsImportModalOpen]);

	useEffect(() => {
		if (!isImportModalOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !isImporting) {
				handleCloseModal();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isImportModalOpen, isImporting, handleCloseModal]);

	const handleSaveErrorLog = () => {
		if (!importResult || !importResult.errors || importResult.errors.length === 0)
			return;
		const content = importResult.errors
			.map((e: string) => `[${new Date().toLocaleString("vi-VN")}] ${e}`)
			.join("\n");
		const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `import_errors_${new Date().toISOString().slice(0, 10)}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const handleFieldMappingChange = (fieldKey: string, excelHeader: string) => {
		setLocalMapping((prev) => {
			const next = { ...prev };
			if (excelHeader) {
				next[fieldKey] = excelHeader;
			} else {
				delete next[fieldKey];
			}
			return next;
		});
	};

	const handleResetToSuggested = () => {
		if (mappingData?.suggestedMapping) {
			setLocalMapping({ ...mappingData.suggestedMapping });
		}
	};

	const handleClearAllMappings = () => {
		setLocalMapping({});
	};

	const hasRequiredName = Boolean(localMapping.name);
	const hasRequiredDob = Boolean(localMapping.dob);
	const hasRequiredGender = Boolean(
		localMapping.gender ||
			(localMapping.genderNam && localMapping.genderNu) ||
			localMapping.genderNam ||
			localMapping.genderNu,
	);
	const canProceedToPreview =
		hasRequiredName && hasRequiredDob && hasRequiredGender;

	const handleSubmitMapping = () => {
		if (!canProceedToPreview) return;
		if (applyMapping) {
			applyMapping(localMapping);
		}
	};

	if (!isImportModalOpen && !importResult) return null;

	const allProfiles = previewData?.profiles || [];
	const errorRowsCount = allProfiles.filter(
		(p) => getRowIssueInfo(p).isError,
	).length;
	const warningRowsCount = allProfiles.filter(
		(p) => getRowIssueInfo(p).isWarning,
	).length;
	const validRowsCount = allProfiles.filter(
		(p) => !getRowIssueInfo(p).isError,
	).length;

	const filteredProfiles = filterOnlyIssues
		? allProfiles.filter(
				(p) => getRowIssueInfo(p).isError || getRowIssueInfo(p).isWarning,
			)
		: allProfiles;

	const maxPage = Math.ceil(filteredProfiles.length / previewLimit) || 1;
	const paginatedProfiles = filteredProfiles.slice(
		(previewPage - 1) * previewLimit,
		previewPage * previewLimit,
	);

	const relevantFields = SYSTEM_FIELDS.filter((f) => {
		if (f.category === "chuctho" && activeTab !== "chuctho") return false;
		if (f.category === "htxh" && activeTab !== "htxh") return false;
		return true;
	});

	const requiredFields = relevantFields.filter((f) => f.category === "required");
	const generalFields = relevantFields.filter((f) => f.category === "general");
	const policyFields = relevantFields.filter(
		(f) => f.category === "chuctho" || f.category === "htxh",
	);

	const getSampleValueForHeader = (headerName: string) => {
		if (!headerName || !mappingData?.rawRows || mappingData.rawRows.length === 0)
			return null;
		const val = mappingData.rawRows[0][headerName];
		if (val === undefined || val === null || val === "") return null;
		return String(val);
	};

	return createPortal(
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
			onClick={() => {
				if (!isImporting && currentStepNumber === 1) {
					handleCloseModal();
				}
			}}
		>
			<div
				ref={modalRef}
				role="dialog"
				aria-modal="true"
				onClick={(e) => e.stopPropagation()}
				className={clsx(
					"bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 transition-all duration-200 select-text",
					currentStepNumber === 2 || currentStepNumber === 3
						? "max-w-[1240px] w-[95vw] h-[90vh]"
						: currentStepNumber === 4
							? "max-w-2xl w-full max-h-[85vh]"
							: "max-w-xl w-full max-h-[85vh]",
				)}
			>

				<div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70 shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
							<UploadCloud className="w-5 h-5" strokeWidth={1.5} />
						</div>
						<div className="min-w-0">
							<h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
								{currentStepNumber === 4
									? "Kết quả nhập dữ liệu"
									: currentStepNumber === 3
										? `Xem trước dữ liệu — ${previewData?.fileName || "File Excel"}`
										: currentStepNumber === 2
											? `Khớp cột dữ liệu — ${mappingData?.fileName || "File Excel"}`
											: `Nhập dữ liệu Excel — ${
													activeTab === "chuctho"
														? "Hồ sơ Chúc thọ"
														: "Hưu trí xã hội"
												}`}
							</h2>
							<p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
								{currentStepNumber === 4
									? `Tổng xử lý: ${formatVietnameseNumber(importResult?.total || 0)} hồ sơ`
									: currentStepNumber === 3
										? `Đã phân tích ${formatVietnameseNumber(allProfiles.length)} dòng từ file`
										: currentStepNumber === 2
											? `File có ${mappingData?.headers.length || 0} cột và ${mappingData?.rawRows.length || 0} dòng dữ liệu`
											: "Kéo thả hoặc chọn file Excel để bắt đầu"}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0 ml-3">
						{currentStepNumber === 3 && !isImporting && (
							<button
								type="button"
								onClick={() => {
									if (goToMappingStep) goToMappingStep();
								}}
								className="min-h-[40px] px-3.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
							>
								<SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.75} />
								<span>Sửa khớp cột</span>
							</button>
						)}
						{currentStepNumber >= 2 && currentStepNumber <= 3 && !isImporting && (
							<button
								type="button"
								onClick={() => {
									if (goToUploadStep) goToUploadStep();
									else cancelImport();
								}}
								className="min-h-[40px] px-3.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
							>
								<RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
								<span>Chọn file khác</span>
							</button>
						)}
						<button
							type="button"
							onClick={handleCloseModal}
							disabled={isImporting}
							aria-label="Đóng modal"
							title="Đóng (Escape)"
							className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
						>
							<X className="w-5 h-5" strokeWidth={1.5} />
						</button>
					</div>
				</div>

				<div className="px-6 py-2.5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 sm:gap-6 text-xs shrink-0 select-none overflow-x-auto">
					{[
						{ num: 1, label: "Tải lên" },
						{ num: 2, label: "Khớp cột" },
						{ num: 3, label: "Xem trước" },
						{ num: 4, label: "Kết quả" },
					].map((st, idx, arr) => {
						const isCompleted = currentStepNumber > st.num;
						const isActive = currentStepNumber === st.num;
						return (
							<div key={st.num} className="flex items-center gap-2 sm:gap-4 shrink-0">
								<div
									className={clsx(
										"flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all",
										isActive
											? "bg-emerald-600 text-white shadow-xs"
											: isCompleted
												? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
												: "text-slate-700 dark:text-slate-200 bg-slate-200/90 dark:bg-slate-800 font-semibold",
									)}
								>
									{isCompleted ? (
										<Check className="w-3.5 h-3.5" strokeWidth={2.5} />
									) : (
										<span className="w-4 text-center">{st.num}</span>
									)}
									<span>{st.label}</span>
								</div>
								{idx < arr.length - 1 && (
									<ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
								)}
							</div>
						);
					})}
				</div>

				<div className="flex-1 min-h-0 overflow-y-auto flex flex-col">

					{currentStepNumber === 1 && (
						<div className="p-6 sm:p-8 flex flex-col items-center justify-center flex-1">
							<input
								ref={fileInputRef}
								type="file"
								accept=".xlsx, .xls, .csv"
								className="hidden"
								onChange={handleFileUpload}
							/>

							<ExcelDropzone
								onFileSelect={(file) => {
									setFileDropError(null);
									if (fileInputRef?.current) {
										try {
											const dt = new DataTransfer();
											dt.items.add(file);
											fileInputRef.current.files = dt.files;
										} catch {
										}
									}
									const fakeTarget = {
										files: [file],
										value: "",
									} as unknown as HTMLInputElement;
									handleFileUpload({
										target: fileInputRef?.current?.files?.length
											? fileInputRef.current
											: fakeTarget,
									} as React.ChangeEvent<HTMLInputElement>);
								}}
								onDownloadTemplate={handleDownloadTemplate}
								errorMessage={fileDropError}
								onClearError={() => setFileDropError(null)}
								isReading={isImporting}
								primaryButtonLabel="Chọn tệp Excel"
								templateButtonLabel="Tải biểu mẫu chuẩn (.xlsx)"
								className="w-full max-w-[540px]"
							/>

							<div className="mt-6 w-full max-w-[540px] p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
								<div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
									<HelpCircle className="w-4 h-4 text-emerald-600" />
									<span>Lưu ý khi nhập dữ liệu:</span>
								</div>
								<ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400">
									<li>
										Hệ thống tự động so khớp tiêu đề cột tiếng Việt (có dấu hoặc không dấu).
									</li>
									<li>
										Hỗ trợ cả tệp Excel mẫu hệ thống và tệp Excel tự tạo có tên cột tùy biến thông qua màn hình Khớp Cột.
									</li>
									<li>
										Trường bắt buộc: <strong>Họ và tên</strong>, <strong>Ngày/Năm sinh</strong>, <strong>Giới tính</strong>.
									</li>
								</ul>
							</div>
						</div>
					)}

					{currentStepNumber === 2 && mappingData && (
						<div className="flex flex-col flex-1 min-h-0 overflow-hidden">

							<div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap shrink-0 bg-white dark:bg-slate-900">
								<div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
									<Layers className="w-4 h-4 text-emerald-600 shrink-0" />
									<span>
										Chọn cột từ file Excel tương ứng với từng trường hệ thống.
										Trường có <span className="text-rose-600 font-bold">(*)</span> là bắt buộc.
									</span>
								</div>

								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={handleResetToSuggested}
										className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
										title="Tự động so khớp lại theo từ điển"
									>
										<RotateCcw className="w-3.5 h-3.5" />
										<span>Tự động khớp lại</span>
									</button>
									<button
										type="button"
										onClick={handleClearAllMappings}
										className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer active:scale-95"
									>
										<span>Bỏ chọn tất cả</span>
									</button>
								</div>
							</div>

							<div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">

								<div className="bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xs">
									<div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
										<div className="flex items-center gap-2">
											<div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
											<h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
												Trường Bắt Buộc (*)
											</h3>
										</div>
										<span className="text-[11px] font-medium text-slate-500">
											Cần khớp đủ Họ tên, Ngày/Năm sinh và Giới tính
										</span>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{requiredFields.map((field) => {
											const selectedHeader = localMapping[field.key] || "";
											const sampleVal = getSampleValueForHeader(selectedHeader);
											const isRequiredMissing =
												field.key === "name"
													? !hasRequiredName
													: field.key === "dob"
														? !hasRequiredDob
														: false;

											return (
												<div
													key={field.key}
													className={clsx(
														"p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 bg-white dark:bg-slate-900",
														isRequiredMissing
															? "border-rose-300 dark:border-rose-800/80 shadow-rose-500/5 shadow-xs"
															: selectedHeader
																? "border-emerald-200 dark:border-emerald-800/80"
																: "border-slate-200 dark:border-slate-800",
													)}
												>
													<div className="flex items-start justify-between gap-2">
														<div>
															<div className="flex items-center gap-1.5">
																<span className="text-xs font-bold text-slate-800 dark:text-slate-100">
																	{field.label}
																</span>
																{field.required && (
																	<span className="text-rose-500 font-black">*</span>
																)}
															</div>
															{field.description && (
																<p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
																	{field.description}
																</p>
															)}
														</div>

														{selectedHeader ? (
															<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 shrink-0 flex items-center gap-1">
																<Check className="w-3 h-3" />
																<span>Đã chọn</span>
															</span>
														) : field.required ? (
															<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 shrink-0 flex items-center gap-1">
																<AlertTriangle className="w-3 h-3" />
																<span>Chưa gán</span>
															</span>
														) : null}
													</div>

													<div className="space-y-1">
														<select
															value={selectedHeader}
															onChange={(e) =>
																handleFieldMappingChange(field.key, e.target.value)
															}
															className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
														>
															<option value="">-- Không sử dụng / Bỏ qua --</option>
															{mappingData.headers.map((h) => (
																<option key={h} value={h}>
																	{h}
																</option>
															))}
														</select>

														{sampleVal && (
															<div className="text-[11px] text-slate-500 dark:text-slate-400 truncate px-1">
																<span className="font-medium text-slate-400">
																	Ví dụ:{" "}
																</span>
																<span className="font-semibold text-emerald-600 dark:text-emerald-400">
																	{sampleVal}
																</span>
															</div>
														)}
													</div>
												</div>
											);
										})}
									</div>
								</div>

								{policyFields.length > 0 && (
									<div className="bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xs">
										<div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
											<div className="flex items-center gap-2">
												<div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
												<h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
													{activeTab === "chuctho"
														? "Các Mốc Tuổi Chúc Thọ"
														: "Các Diện Hưởng Hưu Trí Xã Hội"}
												</h3>
											</div>
											<span className="text-[11px] font-medium text-slate-500">
												Có thể tự động tính toán theo Năm sinh nếu để trống
											</span>
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
											{policyFields.map((field) => {
												const selectedHeader = localMapping[field.key] || "";
												const sampleVal = getSampleValueForHeader(selectedHeader);

												return (
													<div
														key={field.key}
														className={clsx(
															"p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2 bg-white dark:bg-slate-900",
															selectedHeader
																? "border-emerald-200 dark:border-emerald-800/80"
																: "border-slate-200 dark:border-slate-800",
														)}
													>
														<div className="flex items-start justify-between gap-1.5">
															<span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
																{field.label}
															</span>
															{selectedHeader && (
																<Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
															)}
														</div>

														<div className="space-y-1">
															<select
																value={selectedHeader}
																onChange={(e) =>
																	handleFieldMappingChange(field.key, e.target.value)
																}
																className="w-full text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
															>
																<option value="">-- Bỏ qua --</option>
																{mappingData.headers.map((h) => (
																	<option key={h} value={h}>
																		{h}
																	</option>
																))}
															</select>

															{sampleVal && (
																<div className="text-[10px] text-slate-500 dark:text-slate-400 truncate px-1">
																	Mẫu: {sampleVal}
																</div>
															)}
														</div>
													</div>
												);
											})}
										</div>
									</div>
								)}

								<div className="bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xs">
									<div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
										<div className="flex items-center gap-2">
											<div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
											<h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
												Thông Tin Bổ Sung & Hành Chính
											</h3>
										</div>
										<span className="text-[11px] font-medium text-slate-500">
											Các trường không bắt buộc (CCCD, Cư trú, Thôn/Xóm...)
										</span>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
										{generalFields.map((field) => {
											const selectedHeader = localMapping[field.key] || "";
											const sampleVal = getSampleValueForHeader(selectedHeader);

											return (
												<div
													key={field.key}
													className={clsx(
														"p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2 bg-white dark:bg-slate-900",
														selectedHeader
															? "border-emerald-200 dark:border-emerald-800/80"
															: "border-slate-200 dark:border-slate-800",
													)}
												>
													<div className="flex items-start justify-between gap-1.5">
														<span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
															{field.label}
														</span>
														{selectedHeader && (
															<Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
														)}
													</div>

													<div className="space-y-1">
														<select
															value={selectedHeader}
															onChange={(e) =>
																handleFieldMappingChange(field.key, e.target.value)
															}
															className="w-full text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
														>
															<option value="">-- Bỏ qua --</option>
															{mappingData.headers.map((h) => (
																<option key={h} value={h}>
																	{h}
																</option>
															))}
														</select>

														{sampleVal && (
															<div className="text-[10px] text-slate-500 dark:text-slate-400 truncate px-1">
																Mẫu: {sampleVal}
															</div>
														)}
													</div>
												</div>
											);
										})}
									</div>
								</div>
							</div>

							<div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 flex items-center justify-between gap-4 shrink-0">
								<button
									type="button"
									onClick={() => {
										if (goToUploadStep) goToUploadStep();
										else cancelImport();
									}}
									className="min-h-[42px] px-5 rounded-2xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
								>
									<ArrowLeft className="w-4 h-4" />
									<span>Quay lại tải file</span>
								</button>

								<div className="flex items-center gap-3">
									{!canProceedToPreview && (
										<span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
											<AlertCircle className="w-3.5 h-3.5" />
											<span>Vui lòng chọn cột Họ tên, Ngày sinh và Giới tính</span>
										</span>
									)}

									<button
										type="button"
										onClick={handleSubmitMapping}
										disabled={!canProceedToPreview}
										className="min-h-[42px] px-6 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<span>Tiếp tục: Xem trước dữ liệu</span>
										<ArrowRight className="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
					)}

					{currentStepNumber === 3 && (
						<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
							{isImporting ? (
								<div className="flex flex-col items-center justify-center py-24 px-4 flex-1">
									<Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
									<h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white mb-1">
										Đang lưu dữ liệu vào hệ thống...
									</h3>
									<p className="text-xs text-slate-500 mb-6">
										Vui lòng không đóng cửa sổ này trong khi hệ thống đang xử lý.
									</p>
									<div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
										<div
											className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300 ease-out"
											style={{ width: `${importProgress}%` }}
										/>
									</div>
									<p className="mt-2 text-xs font-bold text-emerald-600">
										{importProgress}%
									</p>
								</div>
							) : (
								<>

									<div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap shrink-0 bg-white dark:bg-slate-900">
										<div className="flex items-center gap-2 flex-wrap text-xs">
											<div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5">
												<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
												<span>
													Hợp lệ: {formatVietnameseNumber(validRowsCount)}
												</span>
											</div>

											{warningRowsCount > 0 && (
												<div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1.5">
													<AlertCircle className="w-3.5 h-3.5 text-amber-600" />
													<span>
														Cảnh báo: {formatVietnameseNumber(warningRowsCount)}
													</span>
												</div>
											)}

											{errorRowsCount > 0 && (
												<button
													type="button"
													onClick={() => setShowErrorDetails(!showErrorDetails)}
													className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold flex items-center gap-1.5 cursor-pointer hover:bg-rose-100 transition-colors"
												>
													<AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
													<span>
														Lỗi: {formatVietnameseNumber(errorRowsCount)}
													</span>
												</button>
											)}
										</div>

										<div className="flex items-center gap-2">
											{(errorRowsCount > 0 || warningRowsCount > 0) && (
												<button
													type="button"
													onClick={() => {
														setFilterOnlyIssues(!filterOnlyIssues);
														setPreviewPage(1);
													}}
													className={clsx(
														"px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
														filterOnlyIssues
															? "bg-amber-100 dark:bg-amber-900/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200"
															: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700",
													)}
												>
													<span>
														{filterOnlyIssues
															? "Hiện tất cả dòng"
															: "Chỉ hiện dòng cảnh báo/lỗi"}
													</span>
												</button>
											)}
										</div>
									</div>

									{showErrorDetails &&
										previewData?.warnings &&
										previewData.warnings.length > 0 && (
											<div className="mx-6 mt-3 p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl max-h-28 overflow-y-auto text-xs text-rose-700 dark:text-rose-300 space-y-1 shrink-0">
												{previewData.warnings.slice(0, 30).map((w, i) => (
													<div key={i} className="flex items-start gap-1.5">
														<span className="text-rose-500">•</span>
														<span>
															Dòng {w.row}
															{w.name ? ` (${w.name})` : ""}: {w.message}
														</span>
													</div>
												))}
												{previewData.warnings.length > 30 && (
													<div className="font-bold text-rose-600 pt-1">
														...và {previewData.warnings.length - 30} cảnh báo khác
													</div>
												)}
											</div>
										)}

									<div className="flex-1 min-h-0 overflow-auto p-4">
										<div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
											<table className="w-full text-left border-collapse text-xs">
												<thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold sticky top-0 z-10">
													<tr>
														<th className="py-2.5 px-3 text-center w-12">
															STT
														</th>
														<th className="py-2.5 px-3 min-w-[150px]">
															Họ và tên
														</th>
														<th className="py-2.5 px-3 min-w-[100px]">
															Ngày sinh
														</th>
														<th className="py-2.5 px-3 min-w-[120px]">
															CCCD / Mã ĐD
														</th>
														<th className="py-2.5 px-3 min-w-[70px]">
															Giới tính
														</th>
														<th className="py-2.5 px-3 min-w-[120px]">
															Thôn / Tổ
														</th>
														<th className="py-2.5 px-3 min-w-[120px]">
															{activeTab === "chuctho"
																? "Mốc tuổi"
																: "Diện hưởng"}
														</th>
														<th className="py-2.5 px-3 min-w-[130px]">
															Trạng thái
														</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
													{paginatedProfiles.map((row, index) => {
														const issue = getRowIssueInfo(row);
														const realIdx =
															(previewPage - 1) * previewLimit + index + 1;
														return (
															<tr
																key={index}
																className={clsx(
																	"hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors",
																	issue.isError
																		? "bg-rose-50/40 dark:bg-rose-950/20"
																		: issue.isWarning
																			? "bg-amber-50/40 dark:bg-amber-950/20"
																			: "",
																)}
															>
																<td className="py-2 px-3 text-center text-slate-400">
																	{realIdx}
																</td>
																<td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
																	{row.name || (
																		<span className="text-rose-500 italic">
																			(Thiếu tên)
																		</span>
																	)}
																</td>
																<td className="py-2 px-3">
																	{row.dob ? (
																		issue.isError && isDobError(row.dob) ? (
																			<span className="text-rose-600 font-bold">
																				{row.dob}
																			</span>
																		) : (
																			row.dob
																		)
																	) : (
																		<span className="text-rose-500 italic">
																			(Trống)
																		</span>
																	)}
																</td>
																<td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
																	{row.cccd || "—"}
																</td>
																<td className="py-2 px-3">
																	{row.gender || "—"}
																</td>
																<td className="py-2 px-3">
																	{row.village_name || (
																		<span className="text-amber-500 italic">
																			Mặc định
																		</span>
																	)}
																</td>
																<td className="py-2 px-3">
																	<span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
																		{getMilestoneDisplay(row, activeTab)}
																	</span>
																</td>
																<td className="py-2 px-3">
																	{issue.isError ? (
																		<span className="text-rose-600 font-semibold flex items-center gap-1">
																			<AlertTriangle className="w-3.5 h-3.5 shrink-0" />
																			<span>{issue.reason}</span>
																		</span>
																	) : issue.isWarning ? (
																		<span className="text-amber-600 font-semibold flex items-center gap-1">
																			<AlertCircle className="w-3.5 h-3.5 shrink-0" />
																			<span>{issue.reason}</span>
																		</span>
																	) : (
																		<span className="text-emerald-600 font-semibold flex items-center gap-1">
																			<Check className="w-3.5 h-3.5 shrink-0" />
																			<span>Hợp lệ</span>
																		</span>
																	)}
																</td>
															</tr>
														);
													})}
												</tbody>
											</table>
										</div>
									</div>

									<div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 flex items-center justify-between gap-4 shrink-0">
										<div className="flex items-center gap-2 text-xs">
											{maxPage > 1 && (
												<>
													<button
														type="button"
														disabled={previewPage <= 1}
														onClick={() =>
															setPreviewPage((p) => Math.max(1, p - 1))
														}
														className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer"
													>
														<ChevronLeft className="w-4 h-4" />
													</button>
													<span className="text-slate-600 dark:text-slate-400 font-medium">
														Trang {previewPage} / {maxPage}
													</span>
													<button
														type="button"
														disabled={previewPage >= maxPage}
														onClick={() =>
															setPreviewPage((p) => Math.min(maxPage, p + 1))
														}
														className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer"
													>
														<ChevronRight className="w-4 h-4" />
													</button>
												</>
											)}
										</div>

										<div className="flex items-center gap-3">
											{mappingData && (
												<button
													type="button"
													onClick={() => {
														if (goToMappingStep) goToMappingStep();
													}}
													className="min-h-[42px] px-4 rounded-2xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
												>
													<SlidersHorizontal className="w-4 h-4" />
													<span>Khớp lại cột</span>
												</button>
											)}

											<button
												type="button"
												onClick={cancelImport}
												className="min-h-[42px] px-5 rounded-2xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
											>
												Hủy bỏ
											</button>
											<button
												type="button"
												onClick={() => confirmImport()}
												disabled={validRowsCount === 0}
												className="min-h-[42px] px-6 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<span>
													Lưu {formatVietnameseNumber(validRowsCount)} hồ sơ
												</span>
												<ArrowRight className="w-4 h-4" />
											</button>
										</div>
									</div>
								</>
							)}
						</div>
					)}

					{currentStepNumber === 4 && importResult && (
						<div className="p-6 sm:p-8 flex flex-col flex-1">
							<div className="text-center py-4">
								<div
									className={clsx(
										"rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4",
										importResult.errors.length === 0
											? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400"
											: "bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400",
									)}
								>
									{importResult.errors.length === 0 ? (
										<CheckCircle2 className="h-8 w-8" strokeWidth={2} />
									) : (
										<AlertTriangle className="h-8 w-8" strokeWidth={2} />
									)}
								</div>

								<h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-1">
									{importResult.errors.length === 0
										? "Nhập dữ liệu thành công!"
										: "Hoàn tất có cảnh báo!"}
								</h3>
								<p className="text-xs text-slate-500 dark:text-slate-400">
									Dữ liệu đã được nạp và cập nhật vào hệ thống.
								</p>
							</div>

							<div className="grid grid-cols-3 gap-3 my-4">
								<div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center">
									<div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
										Thêm mới
									</div>
									<div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
										{formatVietnameseNumber(importResult.created)}
									</div>
								</div>
								<div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-center">
									<div className="text-xs font-bold text-blue-700 dark:text-blue-300">
										Cập nhật
									</div>
									<div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
										{formatVietnameseNumber(importResult.updated)}
									</div>
								</div>
								<div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-center">
									<div className="text-xs font-bold text-amber-700 dark:text-amber-300">
										Lỗi / Bỏ qua
									</div>
									<div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
										{formatVietnameseNumber(
											importResult.failed ?? importResult.errors.length,
										)}
									</div>
								</div>
							</div>

							{importResult.errors.length > 0 && (
								<div className="my-2 flex-1 min-h-0 flex flex-col">
									<div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2 flex items-center justify-between">
										<span>Danh sách lỗi / trùng lặp:</span>
										<button
											type="button"
											onClick={handleSaveErrorLog}
											className="text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
										>
											<Save className="w-3.5 h-3.5" />
											<span>Tải file log (.txt)</span>
										</button>
									</div>
									<div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-h-40 overflow-y-auto text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
										{importResult.errors.slice(0, 50).map((err, i) => (
											<div key={i} className="flex items-start gap-1.5">
												<span className="text-amber-500 font-bold">•</span>
												<span>{err}</span>
											</div>
										))}
										{importResult.errors.length > 50 && (
											<div className="font-bold text-slate-500 pt-1">
												...và {importResult.errors.length - 50} lỗi khác
											</div>
										)}
									</div>
								</div>
							)}

							<div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
								<button
									type="button"
									onClick={() => {
										setImportResult(null);
										cancelImport();
										setIsImportModalOpen(false);
									}}
									className="min-h-[44px] px-8 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95 transition-all shadow-xs"
								>
									Hoàn tất & Đóng
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
};
