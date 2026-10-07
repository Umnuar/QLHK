import {
	AlertCircle,
	AlertTriangle,
	Check,
	CheckCircle2,
	ChevronRight,
	FileDown,
	Filter,
	FolderOpen,
	RefreshCw,
	UploadCloud,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { type ParsedExcelRow, parseExcelSheet } from "../../utils/excelParser";
import { CustomSelect } from "../common/CustomSelect";
import { formatVietnameseNumber } from "../common/tableStyles";

export interface ImportPreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	file?: File | null;
	parsedData?: any[]; // Mỗi phần tử là ParsedExcelRow hoặc mảng 11 cột thô
	onConfirm?: (validRows: any[]) => Promise<void> | void;
	importing?: boolean;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
	isOpen,
	onClose,
	file = null,
	parsedData = [],
	onConfirm,
	importing = false,
}) => {
	const [internalFile, setInternalFile] = useState<File | null>(null);
	const [internalParsedRows, setInternalParsedRows] = useState<
		ParsedExcelRow[]
	>([]);
	const [isDragging, setIsDragging] = useState(false);
	const [dropError, setDropError] = useState<string | null>(null);
	const [importPage, setImportPage] = useState(1);
	const [importLimit, setImportLimit] = useState(20);
	const [showOnlyIssues, setShowOnlyIssues] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const modalRef = useRef<HTMLDivElement>(null);
	const autoId = useId();
	const titleId = `import-modal-title-${autoId}`;

	const handleProcessFile = async (selectedFile: File) => {
		const isExcelOrCsv = /\.(xlsx|xls|csv)$/i.test(selectedFile.name);
		if (!isExcelOrCsv) {
			setDropError(
				"Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp .xlsx, .xls hoặc .csv",
			);
			return;
		}
		if (selectedFile.size === 0) {
			setDropError(
				"Tệp được chọn rỗng (0 bytes). Vui lòng chọn tệp có dữ liệu",
			);
			return;
		}
		if (selectedFile.size > 10 * 1024 * 1024) {
			setDropError(
				"Dung lượng tệp vượt quá giới hạn 10 MB. Vui lòng chọn tệp nhỏ hơn.",
			);
			return;
		}
		setDropError(null);

		try {
			const buffer = await selectedFile.arrayBuffer();
			const workbook = XLSX.read(buffer, { type: "array" });
			const firstSheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[firstSheetName];
			const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, {
				header: 1,
				defval: "",
			});

			const normalizedRows = parseExcelSheet(rawJson);
			setInternalFile(selectedFile);
			setInternalParsedRows(normalizedRows);
			setImportPage(1);
			setShowOnlyIssues(false);
		} catch (err) {
			console.error("Lỗi phân tích tệp Excel:", err);
			setDropError("Không thể đọc tệp Excel. Vui lòng kiểm tra định dạng tệp.");
		}
	};

	useEffect(() => {
		if (file && (!parsedData || parsedData.length === 0)) {
			handleProcessFile(file);
		}
	}, [file]);

	// Chuẩn hóa activeData từ parsedData prop hoặc từ file đã chọn nội bộ
	const processedRows: ParsedExcelRow[] = useMemo(() => {
		if (parsedData && parsedData.length > 0) {
			if (
				typeof parsedData[0] === "object" &&
				!Array.isArray(parsedData[0]) &&
				"fullName" in parsedData[0]
			) {
				return parsedData as ParsedExcelRow[];
			}
			return parseExcelSheet(parsedData as any[][]);
		}
		return internalParsedRows;
	}, [parsedData, internalParsedRows]);

	const activeFile = file || internalFile;

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (f) {
			handleProcessFile(f);
		}
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleClose = () => {
		setInternalFile(null);
		setInternalParsedRows([]);
		setDropError(null);
		setShowOnlyIssues(false);
		onClose();
	};

	const handleDownloadTemplate = () => {
		const headers = [
			"STT",
			"Chủ hộ / Thành viên",
			"Họ và tên",
			"Quan hệ",
			"Ngày sinh",
			"Giới tính",
			"Dân tộc",
			"Tôn giáo",
			"CCCD",
			"Địa chỉ",
			"Ghi chú",
		];
		const sampleData = [
			[
				1,
				"Chủ hộ",
				"A Đôi",
				"Chủ hộ",
				"15/05/1975",
				"Nam",
				"Xơ Đăng",
				"Không",
				"062075001234",
				"Thôn 1",
				"Mẫu hộ chuẩn",
			],
			[
				2,
				"Thành viên",
				"Y Bluih",
				"Vợ",
				"20/08/1978",
				"Nữ",
				"Xơ Đăng",
				"Không",
				"062078005678",
				"Thôn 1",
				"",
			],
		];
		const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "NhanHoKhau");
		XLSX.writeFile(wb, "Bieu_Mau_Nhan_Ho_Khau_11_Cot.xlsx");
	};

	const errorRowsCount = processedRows.filter((r) => r.hasError).length;
	// Cảnh báo: dòng có cảnh báo nhưng không phải lỗi chặn
	const warningRowsCount = processedRows.filter(
		(r) => !r.hasError && (r.dobError || (r as any).warning),
	).length;
	const validRowsCount = processedRows.length - errorRowsCount;

	const filteredRows = useMemo(() => {
		if (!showOnlyIssues) return processedRows;
		return processedRows.filter(
			(r) => r.hasError || (r as any).warning || r.dobError,
		);
	}, [processedRows, showOnlyIssues]);

	const displayData = filteredRows.slice(
		(importPage - 1) * importLimit,
		importPage * importLimit,
	);
	const maxPage = Math.ceil(filteredRows.length / importLimit) || 1;

	// Reset page khi chuyển toggle filter
	useEffect(() => {
		setImportPage(1);
	}, [showOnlyIssues]);

	// Khóa cuộn trang nền khi modal đang mở
	useEffect(() => {
		if (!isOpen) return;
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = originalOverflow;
		};
	}, [isOpen]);

	// Keyboard Navigation & Focus Trap (WCAG 2.1 AA)
	useEffect(() => {
		if (!isOpen) return;

		const timer = setTimeout(() => {
			if (modalRef.current) {
				const firstButton = modalRef.current.querySelector<HTMLElement>(
					"button:not([disabled])",
				);
				firstButton?.focus();
			}
		}, 50);

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !importing) {
				handleClose();
				return;
			}

			if (e.key === "Tab") {
				if (!modalRef.current) return;
				const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
					'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
				);
				const focusable = Array.from(focusableElements).filter(
					(el) =>
						!el.hasAttribute("disabled") &&
						el.getAttribute("aria-hidden") !== "true" &&
						el.offsetParent !== null,
				);

				if (focusable.length === 0) return;

				const firstElement = focusable[0];
				const lastElement = focusable[focusable.length - 1];

				if (e.shiftKey) {
					if (document.activeElement === firstElement) {
						e.preventDefault();
						lastElement?.focus();
					}
				} else {
					if (document.activeElement === lastElement) {
						e.preventDefault();
						firstElement?.focus();
					}
				}
			}
		};

		const handleMouseDown = (e: MouseEvent) => {
			if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
				if (!activeFile && !importing) {
					handleClose();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		document.addEventListener("mousedown", handleMouseDown);
		return () => {
			clearTimeout(timer);
			window.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handleMouseDown);
		};
	}, [isOpen, activeFile, importing]);

	if (!isOpen || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[rgba(15,23,42,0.45)] dark:bg-[rgba(0,0,0,0.6)] animate-in fade-in duration-150 select-none"
			aria-hidden="false"
			onClick={(e) => {
				if (e.target === e.currentTarget && !activeFile && !importing) {
					handleClose();
				}
			}}
		>
			<div
				ref={modalRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				onClick={(e) => e.stopPropagation()}
				className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 transition-[max-width,width] duration-150 motion-reduce:transition-none select-text ${
					activeFile
						? "max-w-[1240px] w-[92vw]"
						: "max-w-[670px] w-full"
				}`}
			>
				{/* 1. Tiêu đề cố định */}
				<div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
							<UploadCloud className="w-5 h-5" strokeWidth={1.5} />
						</div>
						<div className="min-w-0">
							<h2
								id={titleId}
								className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate"
							>
								{activeFile
									? "Xem trước dữ liệu"
									: "Nhập dữ liệu Excel — Hộ gia đình"}
							</h2>
							<p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
								{activeFile
									? `Tệp: ${activeFile.name} • ${formatVietnameseNumber(processedRows.length)} nhân khẩu`
									: "Chọn tệp Excel để bắt đầu đối soát dữ liệu"}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0 ml-3">
						{activeFile && (
							<button
								type="button"
								onClick={() => {
									setInternalFile(null);
									setInternalParsedRows([]);
									setDropError(null);
									setShowOnlyIssues(false);
								}}
								className="min-h-[44px] px-3.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
								title="Quay lại bước chọn tệp khác"
							>
								<RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
								<span>Đổi tệp khác</span>
							</button>
						)}
						<button
							type="button"
							onClick={handleClose}
							aria-label="Đóng modal"
							title="Đóng (Escape)"
							className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
						>
							<X className="w-5 h-5" strokeWidth={1.5} />
						</button>
					</div>
				</div>

				{/* 2. Thanh bước thống nhất (Stepper) */}
				<div className="px-6 py-2.5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 sm:gap-6 text-xs shrink-0 select-none">
					{[
						{ num: 1, label: "Chọn tệp" },
						{ num: 2, label: "Xem trước" },
					].map((st, idx, arr) => {
						const currentStepNum = activeFile ? 2 : 1;
						const isCompleted = currentStepNum > st.num;
						const isActive = currentStepNum === st.num;
						return (
							<div key={st.num} className="flex items-center gap-2 sm:gap-4">
								<button
									type="button"
									onClick={() => {
										if (st.num === 1 && activeFile) {
											setInternalFile(null);
											setInternalParsedRows([]);
											setDropError(null);
											setShowOnlyIssues(false);
										}
									}}
									disabled={st.num === 2 && !activeFile}
									className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
										isActive
											? "bg-emerald-600 text-white shadow-xs"
											: isCompleted
												? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 cursor-pointer"
												: "text-slate-700 dark:text-slate-200 bg-slate-200/90 dark:bg-slate-800 font-semibold cursor-not-allowed"
									}`}
								>
									{isCompleted ? (
										<Check className="w-3.5 h-3.5" strokeWidth={2.5} />
									) : (
										<span className="w-4 text-center">{st.num}</span>
									)}
									<span>{st.label}</span>
								</button>
								{idx < arr.length - 1 && (
									<ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
								)}
							</div>
						);
					})}
				</div>

				{/* 3. Nội dung thân modal */}
				<div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
					{!activeFile ? (
						<div className="p-6 sm:p-10 flex flex-col items-center justify-center flex-1 space-y-4">
							<input
								ref={fileInputRef}
								type="file"
								accept=".xlsx,.xls,.csv"
								className="hidden"
								onChange={handleFileInputChange}
							/>

							{dropError && (
								<div className="w-full max-w-xl p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
									<AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
									<span>{dropError}</span>
								</div>
							)}

							<div
								onDragOver={(e) => {
									e.preventDefault();
									setIsDragging(true);
								}}
								onDragLeave={() => setIsDragging(false)}
								onDrop={(e) => {
									e.preventDefault();
									setIsDragging(false);
									const f = e.dataTransfer.files?.[0];
									if (f) handleProcessFile(f);
								}}
								onClick={() => fileInputRef.current?.click()}
								className={`w-full max-w-xl p-8 sm:p-10 border-2 border-dashed rounded-3xl transition-all cursor-pointer text-center flex flex-col items-center justify-center space-y-4 ${
									isDragging
										? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20"
										: "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-slate-800/40"
								}`}
							>
								<div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
									<UploadCloud className="w-7 h-7" strokeWidth={1.5} />
								</div>

								<div>
									<h3 className="text-base font-bold text-slate-900 dark:text-white">
										Kéo thả tệp Excel vào đây hoặc bấm để chọn
									</h3>
									<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
										Định dạng hỗ trợ:{" "}
										<strong className="text-emerald-600 dark:text-emerald-400">
											.xlsx, .xls, .csv
										</strong>{" "}
										(tối đa 10 MB)
									</p>
								</div>

								<div
									className="flex items-center gap-3 pt-2"
									onClick={(e) => e.stopPropagation()}
								>
									<button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										className="min-h-[44px] px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
									>
										<FolderOpen className="w-4 h-4" strokeWidth={1.5} />
										<span>Chọn tệp Excel</span>
									</button>

									<button
										type="button"
										onClick={handleDownloadTemplate}
										className="min-h-[44px] px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
									>
										<FileDown
											className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
											strokeWidth={1.5}
										/>
										<span>Tải biểu mẫu chuẩn (.xlsx)</span>
									</button>
								</div>
							</div>
						</div>
					) : (
				<>
					{/* Dải trạng thái: 3 Chip + Toggle lọc dòng lỗi/cảnh báo */}
					<div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 shrink-0">
						<div className="flex items-center gap-2.5 flex-wrap">
							{/* Chip Hợp Lệ (luôn hiện) */}
							<div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
								<CheckCircle2
									className="w-4 h-4 text-emerald-600"
									strokeWidth={1.5}
								/>
								<span>Hợp lệ: {validRowsCount} nhân khẩu</span>
							</div>

							{/* Chip Cảnh Báo (chỉ hiện khi > 0) */}
							{warningRowsCount > 0 && (
								<div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5">
									<AlertCircle
										className="w-4 h-4 text-amber-600"
										strokeWidth={1.5}
									/>
									<span>{warningRowsCount} cảnh báo</span>
								</div>
							)}

							{/* Chip Lỗi (chỉ hiện khi > 0) */}
							{errorRowsCount > 0 && (
								<div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5">
									<AlertTriangle
										className="w-4 h-4 text-rose-600"
										strokeWidth={1.5}
									/>
									<span>
										Phát hiện {errorRowsCount} dòng có lỗi ngày sinh
									</span>
								</div>
							)}
						</div>

						{/* Toggle: Chỉ hiện dòng lỗi / cảnh báo */}
						{(errorRowsCount > 0 || warningRowsCount > 0) && (
							<button
								type="button"
								onClick={() => setShowOnlyIssues(!showOnlyIssues)}
								className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
									showOnlyIssues
										? "bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/80 dark:border-rose-700 dark:text-rose-300"
										: "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
								}`}
							>
								<Filter className="w-3.5 h-3.5" strokeWidth={1.5} />
								<span>
									{showOnlyIssues
										? "Đang lọc: Chỉ dòng có vấn đề"
										: "Chỉ hiện dòng lỗi/cảnh báo"}
								</span>
							</button>
						)}
					</div>

					{/* Bảng đối soát 11 cột chuẩn với 3 cột đầu cố định */}
					<div className="flex-1 min-h-0 flex flex-col overflow-hidden p-4 sm:p-5">
						<div className="overflow-x-auto overflow-y-auto flex-1 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
							<table className="w-full min-w-[1060px] text-left border-separate border-spacing-0 text-xs whitespace-nowrap">
								<thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold sticky top-0 z-30 shadow-xs">
									<tr>
										<th className="py-2 px-2.5 border-b border-r border-slate-200 dark:border-slate-800 text-center sticky left-0 z-40 bg-slate-100 dark:bg-slate-950 w-[48px] min-w-[48px] max-w-[48px]">
											1. STT
										</th>
										<th className="py-2 px-2.5 border-b border-r border-slate-200 dark:border-slate-800 sticky left-[48px] z-40 bg-slate-100 dark:bg-slate-950 w-[100px] min-w-[100px] max-w-[100px]">
											2. Hộ Gia Đình
										</th>
										<th className="py-2 px-2.5 border-b border-r border-slate-200 dark:border-slate-800 sticky left-[148px] z-40 bg-slate-100 dark:bg-slate-950 w-[160px] min-w-[160px] max-w-[160px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
											3. Họ và Tên
										</th>
										<th className="py-2 px-2.5 border-b border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 min-w-[90px]">
											4. Quan Hệ
										</th>
										<th className="py-2 px-2.5 border-b border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-center font-mono min-w-[140px]">
											5. Ngày Sinh (DD/MM/YYYY)
										</th>
										<th className="py-2 px-2.5 border-b border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-center min-w-[70px]">
											6. Giới Tính
										</th>
										<th className="py-2 px-2.5 border-b border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 min-w-[90px]">
											7. Dân Tộc
										</th>
										<th className="py-2 px-2.5 border-b border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 min-w-[90px]">
											8. Tôn Giáo
										</th>
										<th className="py-2 px-2.5 border-b border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 font-mono min-w-[110px]">
											9. CCCD
										</th>
										<th className="py-2 px-2.5 border-b border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 min-w-[140px]">
											10. Địa Chỉ
										</th>
										<th className="py-2 px-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 min-w-[120px]">
											11. Ghi Chú
										</th>
									</tr>
								</thead>
								<tbody>
									{displayData.map((row) => {
										const relStr = String(row.relationship || "")
											.trim()
											.toLowerCase();
										const isHead = Boolean(
											relStr.includes("chủ hộ") ||
												relStr === "ch" ||
												relStr === "chu ho" ||
												relStr.startsWith("chủ hộ"),
										);
										const headBorderClass = isHead
											? "border-t-2 border-emerald-500/30 dark:border-emerald-500/50"
											: "";
										const stickyBg = row.hasError
											? "bg-rose-50 dark:bg-rose-950/80 group-hover:bg-rose-100/90 dark:group-hover:bg-rose-900/90"
											: "bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/70";

										return (
											<tr
												key={row.index}
												className={`group transition-colors ${headBorderClass} ${
													row.hasError
														? "bg-rose-50/90 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-medium"
														: "hover:bg-slate-50 dark:hover:bg-slate-800/60"
												}`}
											>
												{/* Cột 1: STT (Sticky 1) */}
												<td
													className={`py-1.5 px-2.5 text-center font-mono border-b border-r border-slate-100 dark:border-slate-800 sticky left-0 z-10 w-[48px] min-w-[48px] max-w-[48px] ${stickyBg} ${headBorderClass}`}
												>
													{row.stt}
												</td>

												{/* Cột 2: Hộ Gia Đình (Sticky 2) */}
												<td
													className={`py-1.5 px-2.5 border-b border-r border-slate-100 dark:border-slate-800 sticky left-[48px] z-10 w-[100px] min-w-[100px] max-w-[100px] ${stickyBg} ${headBorderClass}`}
												>
													{isHead ? (
														<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
															[Chủ Hộ]
														</span>
													) : (
														<span className="text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1.5 pl-1">
															<span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
															Thành viên
														</span>
													)}
												</td>

												{/* Cột 3: Họ và Tên (Sticky 3) */}
												<td
													className={`py-1.5 px-2.5 font-bold border-b border-r border-slate-100 dark:border-slate-800 sticky left-[148px] z-10 w-[160px] min-w-[160px] max-w-[160px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] ${stickyBg} ${headBorderClass}`}
												>
													{row.fullName}
												</td>

												{/* Cột 4: Quan Hệ */}
												<td
													className={`py-1.5 px-2.5 border-b border-r border-slate-100 dark:border-slate-800 ${headBorderClass}`}
												>
													<span
														className={
															isHead
																? "font-bold text-emerald-700 dark:text-emerald-400"
																: ""
														}
													>
														{row.relationship}
													</span>
												</td>

												{/* Cột 5: Ngày Sinh */}
												<td
													className={`py-1.5 px-2.5 text-center font-mono border-b border-r border-slate-100 dark:border-slate-800 ${headBorderClass} ${
														row.dobError
															? "bg-rose-100/90 text-rose-950 dark:bg-rose-900/60 dark:text-rose-100 font-bold"
															: ""
													}`}
													title={row.dobError ? `LỖI: ${row.dobError}` : ""}
												>
													<div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
														{row.dobError && (
															<AlertTriangle
																className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0"
																strokeWidth={2}
															/>
														)}
														<span>{row.dobRaw || "—"}</span>
														{row.dobError && (
															<span className="px-1.5 py-0.5 rounded bg-rose-200/90 dark:bg-rose-950 text-[10px] text-rose-800 dark:text-rose-300 font-semibold">
																{row.dobError.includes("Tháng")
																	? row.dobError.match(
																			/Tháng \d+ không hợp lệ/,
																		)?.[0] || "Tháng sai"
																	: "Lỗi ngày sinh"}
															</span>
														)}
													</div>
												</td>

												{/* Cột 6: Giới Tính */}
												<td
													className={`py-1.5 px-2.5 text-center border-b border-r border-slate-100 dark:border-slate-800 ${headBorderClass}`}
												>
													<span
														className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
															row.gender === "Nam"
																? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
																: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
														}`}
													>
														{row.gender}
													</span>
												</td>

												{/* Cột 7: Dân Tộc */}
												<td
													className={`py-1.5 px-2.5 border-b border-r border-slate-100 dark:border-slate-800 ${headBorderClass}`}
												>
													{row.ethnicity}
												</td>

												{/* Cột 8: Tôn Giáo */}
												<td
													className={`py-1.5 px-2.5 border-b border-r border-slate-100 dark:border-slate-800 ${headBorderClass}`}
												>
													{row.religion}
												</td>

												{/* Cột 9: CCCD - Nếu không có, hiển thị — trung tính xám nhạt */}
												<td
													className={`py-1.5 px-2.5 font-mono border-b border-r border-slate-100 dark:border-slate-800 ${headBorderClass}`}
												>
													{row.cccd ? (
														<span>••••••••{row.cccd.slice(-4)}</span>
													) : (
														<span className="text-slate-400 dark:text-slate-500 font-normal">
															—
														</span>
													)}
												</td>

												{/* Cột 10: Địa Chỉ */}
												<td
													className={`py-1.5 px-2.5 border-b border-r border-slate-100 dark:border-slate-800 ${headBorderClass}`}
												>
													{row.address}
												</td>

												{/* Cột 11: Ghi Chú */}
												<td
													className={`py-1.5 px-2.5 text-slate-500 truncate max-w-[140px] border-b border-slate-100 dark:border-slate-800 ${headBorderClass}`}
												>
													{row.notes}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}
		</div>

		{/* 4. Chân modal cố định (chỉ hiện ở bước 2 xem trước) */}
		{activeFile && (
			<div className="p-4 sm:p-5 border-t border-slate-200/90 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-950/60 shrink-0 flex items-center justify-between gap-4 w-full whitespace-nowrap overflow-x-auto">
				{/* Cụm trái: Số lượng hiển thị */}
				<div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 shrink-0">
					<span>Hiển thị</span>
					<CustomSelect<number>
						value={importLimit}
						onChange={(val) => {
							setImportLimit(Number(val));
							setImportPage(1);
						}}
						options={[
							{ value: 10, label: "10" },
							{ value: 20, label: "20" },
							{ value: 50, label: "50" },
							{ value: 100, label: "100" },
						]}
						size="sm"
						containerClassName="w-20"
					/>
					<span>/ {filteredRows.length} bản ghi</span>
				</div>

				{/* Cụm giữa: Phân trang */}
				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						disabled={importPage === 1}
						onClick={() => setImportPage((p) => Math.max(1, p - 1))}
						className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer transition-colors"
					>
						Trước
					</button>
					<span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
						{importPage} / {maxPage}
					</span>
					<button
						type="button"
						disabled={importPage >= maxPage}
						onClick={() => setImportPage((p) => p + 1)}
						className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer transition-colors"
					>
						Sau
					</button>
				</div>

				{/* Cụm phải: Hành động */}
				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={handleClose}
						aria-label="Hủy Bỏ"
						className="h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer active:scale-95"
					>
						Hủy
					</button>
					<button
						type="button"
						onClick={() =>
							onConfirm &&
							onConfirm(processedRows.filter((r) => !r.hasError))
						}
						disabled={importing || validRowsCount === 0}
						className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
					>
						{importing
							? "Đang nhập..."
							: `Xác Nhận Nhập (${validRowsCount} Hợp Lệ)`}
					</button>
				</div>
			</div>
		)}
	</div>
</div>,
document.body,
);
};
