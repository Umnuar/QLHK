import clsx from "@/utils/clsx";
import { AlertCircle, FileDown, FolderOpen, Loader2, UploadCloud } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

export interface ExcelDropzoneProps {
	onFileSelect: (file: File) => void;

	onDownloadTemplate?: () => void;

	acceptedExtensions?: string[];

	errorMessage?: string | null;

	onClearError?: () => void;

	isReading?: boolean;

	primaryButtonLabel?: string;

	templateButtonLabel?: string;

	className?: string;

	disabled?: boolean;
}

const DEFAULT_EXTENSIONS = [".xlsx", ".xls", ".csv"];

export const ExcelDropzone: React.FC<ExcelDropzoneProps> = ({
	onFileSelect,
	onDownloadTemplate,
	acceptedExtensions = DEFAULT_EXTENSIONS,
	errorMessage,
	onClearError,
	isReading = false,
	primaryButtonLabel = "Chọn tệp Excel",
	templateButtonLabel = "Tải biểu mẫu chuẩn (.xlsx)",
	className,
	disabled = false,
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [localError, setLocalError] = useState<string | null>(null);
	const [isReadingInternal, setIsReadingInternal] = useState(false);

	const activeReading = isReading || isReadingInternal;
	const activeError = errorMessage || localError;

	useEffect(() => {
		if (typeof window !== "undefined") {
			(window as any).__TRIGGER_DROPZONE_READING__ = (val: boolean) => {
				setIsReadingInternal(val);
			};
		}
	}, []);

	const cleanExtensions = acceptedExtensions.map((ext) =>
		ext.startsWith(".") ? ext.slice(1).toLowerCase() : ext.toLowerCase(),
	);

	const validateAndProcessFile = (file: File) => {
		setLocalError(null);
		onClearError?.();

		const ext = file.name.split(".").pop()?.toLowerCase();
		if (!ext || !cleanExtensions.includes(ext)) {
			const errorText = `Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp ${acceptedExtensions.join(", ")}.`;
			setLocalError(errorText);
			return false;
		}

		if (file.size === 0) {
			const errorText = "Tệp được chọn rỗng (0 bytes). Vui lòng chọn tệp có dữ liệu.";
			setLocalError(errorText);
			return false;
		}

		onFileSelect(file);
		return true;
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		if (disabled || activeReading) return;
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);
		if (disabled || activeReading) return;

		const files = e.dataTransfer.files;
		if (files && files.length > 0) {
			validateAndProcessFile(files[0]);
		}
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			validateAndProcessFile(files[0]);
		}

		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleClickDropzone = () => {
		if (disabled || activeReading) return;
		fileInputRef.current?.click();
	};

	return (
		<div className={clsx("w-full flex flex-col items-center space-y-3.5", className)}>

			<div
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onClick={handleClickDropzone}
				className={clsx(
					"w-full p-8 sm:p-10 border-2 border-dashed rounded-3xl transition-all duration-150 cursor-pointer text-center flex flex-col items-center justify-center space-y-4 select-none",
					disabled && "opacity-50 cursor-not-allowed pointer-events-none",
					isDragging
						? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30"
						: "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-slate-800/40",
				)}
			>

				<input
					type="file"
					ref={fileInputRef}
					onChange={handleFileInputChange}
					accept={acceptedExtensions.join(",")}
					className="hidden"
					disabled={disabled || activeReading}
				/>

				{activeReading ? (
					<div className="flex flex-col items-center justify-center py-6 space-y-3">
						<div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
							<Loader2 className="w-6 h-6 animate-spin" strokeWidth={2} />
						</div>
						<div className="space-y-1 text-center">
							<p className="text-sm font-bold text-slate-800 dark:text-slate-200">
								Đang đọc dữ liệu tệp...
							</p>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Hệ thống đang đối soát các cột dữ liệu
							</p>
						</div>
					</div>
				) : (
					<>

						<div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-0.5">
							<UploadCloud className="w-7 h-7" strokeWidth={1.5} />
						</div>

						<div className="space-y-1">
							<h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
								Kéo thả tệp Excel vào đây hoặc bấm để chọn
							</h3>
							<p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
								Định dạng hỗ trợ:{" "}
								<strong className="text-emerald-600 dark:text-emerald-400 font-bold">
									{acceptedExtensions.join(", ")}
								</strong>
							</p>
						</div>

						{activeError && (
							<div
								onClick={(e) => e.stopPropagation()}
								className="w-full max-w-lg p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 text-left animate-in fade-in"
							>
								<AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
								<span className="flex-1">{activeError}</span>
							</div>
						)}

						<div
							className="flex flex-wrap items-center justify-center gap-3 pt-1"
							onClick={(e) => e.stopPropagation()}
						>
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								disabled={disabled}
								className="min-h-[44px] px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
							>
								<FolderOpen className="w-4 h-4" strokeWidth={1.5} />
								<span>{primaryButtonLabel}</span>
							</button>

							{onDownloadTemplate && (
								<button
									type="button"
									onClick={onDownloadTemplate}
									disabled={disabled}
									className="min-h-[44px] px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
								>
									<FileDown
										className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
										strokeWidth={1.5}
									/>
									<span>{templateButtonLabel}</span>
								</button>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
};
