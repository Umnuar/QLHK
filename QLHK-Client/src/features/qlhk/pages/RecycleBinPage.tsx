import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/AppContext";
import { householdApi } from "@/api/householdApi";
import { ModernRecycleBinTable } from "../components/households/ModernRecycleBinTable";
import { useModal } from "@/hooks/useModal";
import type { Household } from "@/types";

export const RecycleBinPage: React.FC = () => {
	const { setActiveTab, villages } = useApp();
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
			<ModernRecycleBinTable
				households={deletedHouseholds}
				villages={villages}
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
				onBatchRestore={handleBatchRestore}
				onBatchHardDelete={handleBatchHardDelete}
				onRefresh={fetchDeleted}
				onBack={() => setActiveTab("households")}
			/>
		</div>
	);
};
