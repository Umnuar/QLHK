import { ArrowLeft, RotateCcw, ShieldAlert, Trash2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "../AppContext";
import { householdApi } from "../api/householdApi";
import { RecycleBinTable } from "../components/households/RecycleBinTable";
import { useModal } from "../hooks/useModal";
import type { Household } from "../types";

export const RecycleBinPage: React.FC = () => {
	const { setActiveTab } = useApp();
	const { showModal } = useModal();

	const [deletedHouseholds, setDeletedHouseholds] = useState<Household[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);

	const fetchDeleted = useCallback(async () => {
		setLoading(true);
		try {
			const res = await householdApi.getRecycleBin({ page, limit });
			setDeletedHouseholds(res.data);
			setTotal(res.pagination.total);
			setTotalPages(res.pagination.totalPages);
		} catch (err) {
			console.warn("Lỗi nạp thùng rác từ server, dùng bộ nhớ cục bộ:", err);
		} finally {
			setLoading(false);
		}
	}, [page, limit]);

	useEffect(() => {
		fetchDeleted();
	}, [fetchDeleted]);

	const handleToggleSelect = (id: string) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
		);
	};

	const handleToggleSelectAll = () => {
		if (selectedIds.length === deletedHouseholds.length) {
			setSelectedIds([]);
		} else {
			setSelectedIds(deletedHouseholds.map((h) => h.id));
		}
	};

	const handleRestore = (hh: Household) => {
		showModal({
			title: "Khôi phục hộ gia đình",
			message: `Khôi phục Hộ ông/bà: "${hh.head_name}" về danh sách quản lý?`,
			type: "info",
			confirmText: "Khôi Phục",
			cancelText: "Hủy",
			onConfirm: async () => {
				try {
					await householdApi.restore(hh.id);
					showModal({
						title: "Đã khôi phục",
						message: "Hộ gia đình đã được khôi phục thành công.",
						type: "success",
					});
					await fetchDeleted();
				} catch (err) {
					console.error("Lỗi khôi phục hộ:", err);
					showModal({
						title: "Lỗi",
						message: "Không thể khôi phục hộ gia đình từ máy chủ.",
						type: "danger",
					});
				}
			},
		});
	};

	const handleHardDelete = (hh: Household) => {
		showModal({
			title: "Xóa vĩnh viễn hộ gia đình",
			message: `CẢNH BÁO: Bạn sắp xóa vĩnh viễn Hộ ông/bà: "${hh.head_name}".\nDữ liệu sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu và không thể lấy lại!`,
			type: "danger",
			confirmText: "Xóa Vĩnh Viễn",
			cancelText: "Hủy",
			onConfirm: async () => {
				try {
					await householdApi.hardDelete(hh.id);
					showModal({
						title: "Đã xóa vĩnh viễn",
						message: "Dữ liệu hộ gia đình đã được loại bỏ hoàn toàn.",
						type: "info",
					});
					await fetchDeleted();
				} catch (err) {
					console.error("Lỗi xóa vĩnh viễn:", err);
					showModal({
						title: "Lỗi",
						message: "Không thể xóa vĩnh viễn hộ gia đình từ máy chủ.",
						type: "danger",
					});
				}
			},
		});
	};

	const handleBatchRestore = () => {
		if (selectedIds.length === 0) return;
		showModal({
			title: "Khôi phục hàng loạt",
			message: `Bạn có chắc muốn khôi phục ${selectedIds.length} Hộ gia đình đã chọn?`,
			type: "info",
			confirmText: "Khôi Phục Tất Cả",
			cancelText: "Hủy",
			onConfirm: async () => {
				try {
					await Promise.all(selectedIds.map((id) => householdApi.restore(id)));
					setSelectedIds([]);
					showModal({
						title: "Thành công",
						message: `Đã khôi phục ${selectedIds.length} hộ gia đình.`,
						type: "success",
					});
					await fetchDeleted();
				} catch (err) {
					console.error("Lỗi khôi phục hàng loạt:", err);
					showModal({
						title: "Lỗi",
						message: "Có lỗi khi khôi phục một số hộ gia đình.",
						type: "danger",
					});
					await fetchDeleted();
				}
			},
		});
	};

	const handleBatchHardDelete = () => {
		if (selectedIds.length === 0) return;
		showModal({
			title: "Xóa vĩnh viễn hàng loạt",
			message: `NGUY HIỂM: Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedIds.length} Hộ gia đình đã chọn khỏi CSDL? Thao tác này không thể hoàn tác!`,
			type: "danger",
			confirmText: "Xác Nhận Xóa Vĩnh Viễn",
			cancelText: "Hủy",
			onConfirm: async () => {
				try {
					await Promise.all(selectedIds.map((id) => householdApi.hardDelete(id)));
					setSelectedIds([]);
					showModal({
						title: "Thành công",
						message: `Đã xóa vĩnh viễn ${selectedIds.length} hộ gia đình.`,
						type: "info",
					});
					await fetchDeleted();
				} catch (err) {
					console.error("Lỗi xóa vĩnh viễn hàng loạt:", err);
					showModal({
						title: "Lỗi",
						message: "Có lỗi khi xóa một số hộ gia đình khỏi cơ sở dữ liệu.",
						type: "danger",
					});
					await fetchDeleted();
				}
			},
		});
	};

	return (
		<div className="space-y-6 animate-in fade-in pb-10">
			{/* Top Banner */}
			<div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-150">
				<div>
					<div className="flex items-center gap-2.5">
						<span className="px-3 py-1 rounded-xl text-xs font-black bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 uppercase tracking-wider">
							Thùng Rác ({total})
						</span>
						<h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
							<Trash2
								className="w-6 h-6 text-rose-600 dark:text-rose-400"
								strokeWidth={1.5}
							/>
							<span>Thùng Rác Hộ Gia Đình</span>
						</h2>
					</div>
					<p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
						Quản lý các hộ dân đã xóa tạm, hỗ trợ khôi phục nguyên trạng hoặc
						xóa vĩnh viễn
					</p>
				</div>

				<div className="flex items-center gap-2.5 flex-wrap">
					<button
						type="button"
						onClick={() => setActiveTab("households")}
						className="h-10 flex items-center justify-center gap-1.5 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
					>
						<ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
						<span>Về danh sách Hộ Gia Đình</span>
					</button>

					{selectedIds.length > 0 && (
						<>
							<button
								type="button"
								onClick={handleBatchRestore}
								className="h-10 flex items-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer animate-in fade-in"
							>
								<RotateCcw className="w-4 h-4" strokeWidth={1.5} />
								<span>Khôi Phục ({selectedIds.length})</span>
							</button>

							<button
								type="button"
								onClick={handleBatchHardDelete}
								className="h-10 flex items-center gap-1.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer animate-in fade-in"
							>
								<ShieldAlert className="w-4 h-4" strokeWidth={1.5} />
								<span>Xóa Vĩnh Viễn ({selectedIds.length})</span>
							</button>
						</>
					)}
				</div>
			</div>

			{/* Bảng Thùng Rác */}
			<RecycleBinTable
				households={deletedHouseholds}
				loading={loading}
				total={total}
				page={page}
				limit={limit}
				totalPages={totalPages}
				selectedIds={selectedIds}
				onToggleSelect={handleToggleSelect}
				onToggleSelectAll={handleToggleSelectAll}
				onPageChange={setPage}
				onLimitChange={setLimit}
				onRestore={handleRestore}
				onHardDelete={handleHardDelete}
			/>
		</div>
	);
};
