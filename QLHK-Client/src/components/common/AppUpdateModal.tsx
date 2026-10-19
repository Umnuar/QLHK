import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
	Download,
	Sparkles,
	CheckCircle2,
	AlertCircle,
	X,
	RefreshCw,
	ArrowRight,
} from "lucide-react";

interface UpdateInfo {
	currentVersion: string;
	version: string;
	body?: string;
	date?: string;
}

export const checkAppUpdateManually = () => {
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("app:check-update", { detail: { manual: true } }),
		);
	}
};

export const AppUpdateModal: React.FC = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [status, setStatus] = useState<
		"idle" | "checking" | "available" | "downloading" | "ready" | "up_to_date" | "error"
	>("idle");
	const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
	const [progress, setProgress] = useState(0);
	const [downloadedStr, setDownloadedStr] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const updateRef = useRef<any>(null);

	const isTauri =
		typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

	const checkForUpdates = useCallback(
		async (manual = false) => {
			if (!isTauri) {
				if (manual) {
					alert(
						"Tính năng tự động cập nhật chỉ khả dụng khi chạy trên ứng dụng Desktop Tauri.",
					);
				}
				return;
			}

			try {
				if (manual) {
					setStatus("checking");
					setIsOpen(true);
				}

				const { check } = await import("@tauri-apps/plugin-updater");
				const update = await check();

				if (update) {
					updateRef.current = update;
					setUpdateInfo({
						currentVersion: update.currentVersion,
						version: update.version,
						body: update.body,
						date: update.date,
					});
					setStatus("available");
					setIsOpen(true);
				} else {
					updateRef.current = null;
					if (manual) {
						setStatus("up_to_date");
						setIsOpen(true);
					} else {
						setStatus("idle");
						setIsOpen(false);
					}
				}
			} catch (err: any) {
				console.warn("[Auto-Updater] Lỗi kiểm tra bản cập nhật:", err);
				if (manual) {
					setErrorMessage(
						err?.message ||
							"Không thể kết nối máy chủ cập nhật. Vui lòng thử lại sau.",
					);
					setStatus("error");
					setIsOpen(true);
				} else {
					setStatus("idle");
				}
			}
		},
		[isTauri],
	);

	useEffect(() => {
		const timer = setTimeout(() => {
			checkForUpdates(false);
		}, 2000);

		const handleManualTrigger = (e: any) => {
			checkForUpdates(e.detail?.manual ?? true);
		};

		window.addEventListener("app:check-update", handleManualTrigger);
		return () => {
			clearTimeout(timer);
			window.removeEventListener("app:check-update", handleManualTrigger);
		};
	}, [checkForUpdates]);

	const handleDownloadAndInstall = async () => {
		if (!updateRef.current) return;

		try {
			setStatus("downloading");
			setProgress(0);
			setDownloadedStr("0 MB");

			let downloadedBytes = 0;
			let totalBytes = 0;

			await updateRef.current.downloadAndInstall((event: any) => {
				if (event.event === "Started") {
					totalBytes = event.data?.contentLength ?? 0;
				} else if (event.event === "Progress") {
					downloadedBytes += event.data?.chunkLength ?? 0;
					const mbDownloaded = (downloadedBytes / (1024 * 1024)).toFixed(1);
					const mbTotal =
						totalBytes > 0
							? (totalBytes / (1024 * 1024)).toFixed(1) + " MB"
							: "...";
					setDownloadedStr(`${mbDownloaded} MB / ${mbTotal}`);

					if (totalBytes > 0) {
						const pct = Math.min(
							100,
							Math.round((downloadedBytes / totalBytes) * 100),
						);
						setProgress(pct);
					}
				} else if (event.event === "Finished") {
					setProgress(100);
				}
			});

			setStatus("ready");

			// Relaunch app sau khi cài đặt
			const { relaunch } = await import("@tauri-apps/plugin-process");
			setTimeout(async () => {
				await relaunch();
			}, 1200);
		} catch (err: any) {
			console.error("[Auto-Updater] Lỗi tải/cài đặt cập nhật:", err);
			setErrorMessage(
				err?.message || "Tải bản cập nhật thất bại. Vui lòng thử lại sau.",
			);
			setStatus("error");
		}
	};

	const handleClose = async () => {
		if (status === "downloading") return; // Chặn đóng khi đang tải gói

		if (updateRef.current) {
			try {
				await updateRef.current.close();
			} catch {
				// ignore
			}
			updateRef.current = null;
		}

		setIsOpen(false);
		setStatus("idle");
	};

	if (!isOpen || typeof document === "undefined") return null;

	return createPortal(
		<div
			className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm select-none animate-in fade-in duration-150"
			onClick={(e) => {
				if (e.target === e.currentTarget && status !== "downloading") {
					handleClose();
				}
			}}
			role="dialog"
			aria-modal="true"
		>
			<div
				className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150 relative"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Top Header Bar */}
				<div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
					<div className="flex items-center gap-2.5">
						<div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shrink-0">
							<Sparkles className="w-5 h-5" strokeWidth={1.5} />
						</div>
						<div>
							<h3 className="text-sm font-black text-slate-900 dark:text-white">
								{status === "available" && "Đã Có Bản Cập Nhật Mới!"}
								{status === "checking" && "Đang Kiểm Tra Bản Cập Nhật..."}
								{status === "downloading" && "Đang Tải Gói Cập Nhật..."}
								{status === "ready" && "Cập Nhật Thành Công!"}
								{status === "up_to_date" && "Hệ Thống Đã Mới Nhất"}
								{status === "error" && "Không Thể Cập Nhật"}
							</h3>
							<p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
								Hệ thống Quản lý Hộ khẩu Xã Đăk Hà
							</p>
						</div>
					</div>

					{status !== "downloading" && (
						<button
							type="button"
							onClick={handleClose}
							className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
							aria-label="Đóng"
						>
							<X className="w-4 h-4" strokeWidth={1.5} />
						</button>
					)}
				</div>

				{/* Body Content */}
				<div className="p-6 space-y-5">
					{/* State: Checking */}
					{status === "checking" && (
						<div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
							<RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
							<span className="text-xs font-bold text-slate-600 dark:text-slate-300">
								Đang kết nối tới máy chủ phát hành để kiểm tra bản mới...
							</span>
						</div>
					)}

					{/* State: Up to date */}
					{status === "up_to_date" && (
						<div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
							<div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
								<CheckCircle2 className="w-6 h-6" strokeWidth={1.5} />
							</div>
							<div>
								<div className="text-sm font-bold text-slate-900 dark:text-white">
									Bạn đang sử dụng phiên bản mới nhất!
								</div>
								<div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
									Phiên bản hiện tại:{" "}
									<strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
										v1.5.0
									</strong>
								</div>
							</div>
						</div>
					)}

					{/* State: Available */}
					{status === "available" && updateInfo && (
						<div className="space-y-4">
							{/* Version Badge Transition */}
							<div className="flex items-center justify-between p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl">
								<div>
									<span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
										Phiên bản hiện tại
									</span>
									<div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
										v{updateInfo.currentVersion}
									</div>
								</div>
								<ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
								<div className="text-right">
									<span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
										Bản nâng cấp mới
									</span>
									<div className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-300">
										v{updateInfo.version}
									</div>
								</div>
							</div>

							{/* Release Notes */}
							<div>
								<span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
									Nội Dung Cập Nhật:
								</span>
								<div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line max-h-48 overflow-y-auto font-medium leading-relaxed">
									{updateInfo.body ||
										"- Cải tiến hiệu năng và độ ổn định hệ thống\n- Sửa các lỗi phát sinh"}
								</div>
							</div>
						</div>
					)}

					{/* State: Downloading */}
					{status === "downloading" && (
						<div className="space-y-4 py-2">
							<div className="flex items-center justify-between text-xs font-bold">
								<span className="text-slate-700 dark:text-slate-300">
									Tiến trình tải gói cập nhật:
								</span>
								<span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
									{progress}%
								</span>
							</div>

							{/* Progress Bar */}
							<div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-700/60 p-0.5">
								<div
									className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-200"
									style={{ width: `${progress}%` }}
								/>
							</div>

							<div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
								<span>Dung lượng đã nạp: {downloadedStr}</span>
								<span>Vui lòng không tắt ứng dụng</span>
							</div>
						</div>
					)}

					{/* State: Ready */}
					{status === "ready" && (
						<div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
							<div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 animate-bounce">
								<CheckCircle2 className="w-6 h-6" strokeWidth={1.5} />
							</div>
							<div>
								<div className="text-sm font-bold text-slate-900 dark:text-white">
									Đã cài đặt bản cập nhật thành công!
								</div>
								<div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
									Đang tự động khởi động lại ứng dụng để áp dụng phiên bản mới...
								</div>
							</div>
						</div>
					)}

					{/* State: Error */}
					{status === "error" && (
						<div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-start gap-3">
							<AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
							<div>
								<div className="text-xs font-bold text-rose-700 dark:text-rose-300">
									Gặp lỗi trong quá trình cập nhật
								</div>
								<div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 leading-normal">
									{errorMessage}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer Actions */}
				<div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
					{status === "available" && (
						<>
							<button
								type="button"
								onClick={handleClose}
								className="px-4 py-2 bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors active:scale-95"
							>
								Nhắc Tôi Sau
							</button>
							<button
								type="button"
								onClick={handleDownloadAndInstall}
								className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
							>
								<Download className="w-4 h-4" strokeWidth={1.5} />
								<span>Cập Nhật Ngay</span>
							</button>
						</>
					)}

					{(status === "up_to_date" || status === "error") && (
						<button
							type="button"
							onClick={handleClose}
							className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
						>
							Đã Hiểu
						</button>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
};

export default AppUpdateModal;
