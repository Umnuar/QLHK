import {
	AlertTriangle,
	Database,
	Download,
	ShieldCheck,
	UploadCloud,
} from "lucide-react";
import type React from "react";
import { useRef } from "react";
import { useHouseholds } from "../../context/HouseholdContext";
import { useModal } from "../../hooks/useModal";

export const BackupRestoreTab: React.FC = () => {
	const { showModal } = useModal();
	const { households, setHouseholds } = useHouseholds();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleExport = () => {
		try {
			const backupData = {
				app: "QLHK-Client",
				version: "1.0.0",
				commune: "Xã Đăk Hà",
				exportDate: new Date().toISOString(),
				totalHouseholds: households.length,
				households,
			};

			const jsonStr = JSON.stringify(backupData, null, 2);
			const blob = new Blob([jsonStr], { type: "application/json" });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `SaoLuu_QLHK_DakHa_${new Date().toISOString().split("T")[0]}.json`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			showModal({
				title: "Sao lưu thành công",
				message: `Đã tải về tệp sao lưu gồm ${households.length} hộ gia đình.`,
				type: "success",
			});
		} catch (err) {
			console.error(err);
			showModal({
				title: "Lỗi sao lưu",
				message: "Không thể xuất tệp sao lưu dữ liệu.",
				type: "danger",
			});
		}
	};

	const handleRestoreClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		showModal({
			title: "Cảnh báo khôi phục dữ liệu",
			message:
				"Bạn có chắc chắn muốn khôi phục? Toàn bộ dữ liệu hiện tại sẽ được thay thế bằng dữ liệu từ tệp sao lưu.",
			type: "danger",
			confirmText: "Xác Nhận Khôi Phục",
			cancelText: "Hủy Bỏ",
			onConfirm: async () => {
				try {
					const text = await file.text();
					const parsed = JSON.parse(text);

					if (parsed && Array.isArray(parsed.households)) {
						setHouseholds(parsed.households);
						showModal({
							title: "Khôi phục thành công",
							message: `Đã phục hồi thành công ${parsed.households.length} hộ gia đình từ bản sao lưu.`,
							type: "success",
						});
					} else if (Array.isArray(parsed)) {
						setHouseholds(parsed);
						showModal({
							title: "Khôi phục thành công",
							message: `Đã phục hồi thành công ${parsed.length} hộ gia đình từ bản sao lưu.`,
							type: "success",
						});
					} else {
						throw new Error("Định dạng tệp sao lưu JSON không đúng.");
					}
				} catch (err: any) {
					console.error(err);
					showModal({
						title: "Lỗi khôi phục",
						message: `Không thể đọc dữ liệu sao lưu: ${err.message}`,
						type: "danger",
					});
				}
			},
		});

		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	return (
		<div className="space-y-6">
			<div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-3xl space-y-6">
				{/* Header Title */}
				<div className="flex items-center gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
					<div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
						<Database className="w-5 h-5" />
					</div>
					<div>
						<h3 className="font-bold text-base text-slate-900 dark:text-white">
							Sao Lưu & Phục Hồi Dữ Liệu
						</h3>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Xuất tệp dự phòng và khôi phục cơ sở dữ liệu khi cần
						</p>
					</div>
				</div>

				{/* Action 1: Xuất sao lưu */}
				<div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
							Xuất Bản Sao Lưu (Export Backup)
						</h4>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
							Tạo tệp dự phòng định dạng JSON chứa toàn bộ hộ gia đình, nhân
							khẩu và cấu hình hiện tại của Xã Đăk Hà.
						</p>
					</div>
					<button
						onClick={handleExport}
						className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
					>
						<Download className="w-4 h-4" />
						<span>Tải Bản Sao Lưu</span>
					</button>
				</div>

				{/* Action 2: Phục hồi sao lưu */}
				<div className="p-5 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
							<AlertTriangle className="w-4 h-4" />
							<span>Phục Hồi Dữ Liệu (Restore Database)</span>
						</div>
						<p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
							Chọn tệp sao lưu (.json) từ máy tính để ghi đè phục hồi lại hệ
							thống dữ liệu hộ khẩu.
						</p>
					</div>
					<div>
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleFileChange}
							accept=".json"
							className="hidden"
						/>
						<button
							onClick={handleRestoreClick}
							className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
						>
							<UploadCloud className="w-4 h-4" />
							<span>Chọn Tệp Khôi Phục</span>
						</button>
					</div>
				</div>

				<div className="pt-2 text-xs text-slate-400 flex items-center gap-1.5">
					<ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
					<span>
						Khuyến nghị sao lưu định kỳ hàng tuần trước khi thực hiện nhập khẩu
						dữ liệu lớn.
					</span>
				</div>
			</div>
		</div>
	);
};
