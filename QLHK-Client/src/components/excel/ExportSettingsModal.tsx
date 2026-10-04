import { DownloadCloud, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface ExportSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	onExport: (scope: "all" | "selected") => void;
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
	const [exportScope, setExportScope] = useState<"all" | "selected">("all");

	const modalRef = useFocusTrap<HTMLDivElement>({
		isActive: isOpen,
		onEscape: onClose,
	});

	if (!isOpen || typeof document === "undefined") return null;

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
				className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
				onClick={(e) => e.stopPropagation()}
			>
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
								Xuất biểu mẫu 11 cột chuẩn Xã Đăk Hà
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-5 space-y-4">
					<div className="space-y-2">
						<label className="text-sm font-bold text-slate-700 dark:text-slate-300">
							Phạm vi xuất
						</label>
						<p className="text-xs text-slate-500">
							Đang xuất dữ liệu của:{" "}
							<strong className="text-emerald-600 dark:text-emerald-400">
								{villageName || "Toàn xã Đăk Hà"}
							</strong>
						</p>
					</div>

					<div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
						<label className="flex items-start gap-3 cursor-pointer group">
							<div className="relative flex items-start">
								<input
									type="radio"
									name="exportScope"
									checked={exportScope === "all"}
									onChange={() => setExportScope("all")}
									className="peer w-5 h-5 appearance-none border-2 border-slate-300 dark:border-slate-600 rounded-full checked:border-emerald-500 checked:border-[6px] transition-all cursor-pointer"
								/>
							</div>
							<div>
								<p className="text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">
									Toàn bộ Sổ Hộ Khẩu trong phạm vi
								</p>
								<p className="text-xs text-slate-500">
									Xuất toàn bộ sổ hộ khẩu và nhân khẩu theo phạm vi đang chọn.
								</p>
							</div>
						</label>
						<label
							className={`flex items-start gap-3 ${selectedCount === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer group"}`}
						>
							<div className="relative flex items-start">
								<input
									type="radio"
									name="exportScope"
									disabled={selectedCount === 0}
									checked={exportScope === "selected"}
									onChange={() => setExportScope("selected")}
									className="peer w-5 h-5 appearance-none border-2 border-slate-300 dark:border-slate-600 rounded-full checked:border-emerald-500 checked:border-[6px] transition-all disabled:cursor-not-allowed cursor-pointer"
								/>
							</div>
							<div>
								<p className="text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">
									Chỉ xuất {selectedCount} Sổ Hộ Khẩu đã chọn
								</p>
								<p className="text-xs text-slate-500">
									Chỉ xuất các hộ đã được đánh dấu tích chọn trong danh sách.
								</p>
							</div>
						</label>
					</div>
				</div>

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
						onClick={() => onExport(exportScope)}
						disabled={exporting}
						className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
					>
						{exporting ? "Đang tạo..." : "Xuất tệp Excel"}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
};
