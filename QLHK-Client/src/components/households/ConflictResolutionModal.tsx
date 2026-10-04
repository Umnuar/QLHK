import { AlertTriangle, ArrowRight, Check, Database, RefreshCw, X } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import type { Household } from "../../types";

export interface ConflictResolutionModalProps {
	isOpen: boolean;
	onClose: () => void;
	clientData: Partial<Household> | null;
	serverData: Household | null;
	onForceOverwrite: () => Promise<void> | void;
	onReloadServer: () => Promise<void> | void;
	loading?: boolean;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
	isOpen,
	onClose,
	clientData,
	serverData,
	onForceOverwrite,
	onReloadServer,
	loading = false,
}) => {
	if (!isOpen || typeof document === "undefined") return null;

	const clientHead =
		clientData?.members?.find((m) => m.is_head)?.full_name ||
		clientData?.head_name ||
		"Chưa xác định";
	const serverHead =
		serverData?.members?.find((m) => m.is_head)?.full_name ||
		serverData?.head_name ||
		"Chưa xác định";

	return createPortal(
		<div className="fixed inset-0 !m-0 z-[70] flex items-center justify-center p-4 bg-slate-950/45 dark:bg-black/60 select-none animate-in fade-in duration-150">
			<div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
				{/* Top Bar */}
				<div className="p-5 px-6 border-b border-slate-200 dark:border-slate-800 bg-amber-50/70 dark:bg-amber-950/30 flex items-center justify-between shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
							<AlertTriangle className="w-5 h-5" strokeWidth={2} />
						</div>
						<div>
							<h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
								<span>Xung Đột Phiên Bản Dữ Liệu (HTTP 409)</span>
							</h3>
							<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
								Hộ gia đình đã bị thay đổi bởi người dùng khác trong khi đồng chí đang chỉnh sửa.
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Đóng"
						className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body Đối Soát 2 Cột */}
				<div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
					<div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
						Để chống mất mát dữ liệu đồng thời, hệ thống giữ nguyên các nội dung đồng chí vừa nhập. Đồng chí có thể lựa chọn <strong>nạp lại dữ liệu máy chủ</strong> để cập nhật phiên bản mới nhất hoặc <strong>ghi đè dữ liệu của tôi</strong>.
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Cột 1: Dữ liệu hiện tại trên Máy Chủ */}
						<div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
							<div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase tracking-wider">
								<Database className="w-3.5 h-3.5" />
								<span>Dữ Liệu Máy Chủ (v{serverData?.version ?? "?"})</span>
							</div>

							<div className="space-y-2 text-xs">
								<div>
									<span className="text-slate-400 block text-[11px]">Chủ hộ:</span>
									<span className="font-bold text-slate-800 dark:text-slate-200">
										{serverHead}
									</span>
								</div>
								<div>
									<span className="text-slate-400 block text-[11px]">Địa chỉ:</span>
									<span className="font-medium text-slate-700 dark:text-slate-300">
										{serverData?.address || "Chưa có"}
									</span>
								</div>
								<div>
									<span className="text-slate-400 block text-[11px]">Trạng thái:</span>
									<span className="font-semibold text-slate-700 dark:text-slate-300">
										{serverData?.status || "Thường trú"}
									</span>
								</div>
								<div>
									<span className="text-slate-400 block text-[11px]">Nhân khẩu:</span>
									<span className="font-bold text-blue-600 dark:text-blue-400">
										{serverData?.members?.length ?? 0} thành viên
									</span>
								</div>
							</div>
						</div>

						{/* Cột 2: Dữ liệu vừa nhập của Client */}
						<div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
							<div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
								<Check className="w-3.5 h-3.5" />
								<span>Dữ Liệu Đồng Chí Vừa Nhập</span>
							</div>

							<div className="space-y-2 text-xs">
								<div>
									<span className="text-slate-400 block text-[11px]">Chủ hộ:</span>
									<span className="font-bold text-slate-800 dark:text-slate-200">
										{clientHead}
									</span>
								</div>
								<div>
									<span className="text-slate-400 block text-[11px]">Địa chỉ:</span>
									<span className="font-medium text-slate-700 dark:text-slate-300">
										{clientData?.address || "Chưa có"}
									</span>
								</div>
								<div>
									<span className="text-slate-400 block text-[11px]">Trạng thái:</span>
									<span className="font-semibold text-slate-700 dark:text-slate-300">
										{clientData?.status || "Thường trú"}
									</span>
								</div>
								<div>
									<span className="text-slate-400 block text-[11px]">Nhân khẩu:</span>
									<span className="font-bold text-emerald-600 dark:text-emerald-400">
										{clientData?.members?.length ?? 0} thành viên
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Bottom Bar Hành Động */}
				<div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
					<button
						type="button"
						onClick={onClose}
						disabled={loading}
						className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
					>
						Giữ Form Để Chỉnh Tiếp
					</button>

					<div className="w-full sm:w-auto flex items-center gap-2 justify-end">
						<button
							type="button"
							onClick={onReloadServer}
							disabled={loading}
							className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
						>
							<RefreshCw className="w-3.5 h-3.5" />
							<span>Nạp Dữ Liệu Máy Chủ</span>
						</button>

						<button
							type="button"
							onClick={onForceOverwrite}
							disabled={loading}
							className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-md active:scale-95 cursor-pointer"
						>
							<span>Ghi Đè Bằng Dữ Liệu Của Tôi</span>
							<ArrowRight className="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
};
