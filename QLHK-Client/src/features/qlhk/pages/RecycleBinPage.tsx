import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/AppContext";
import { householdApi } from "@/api/householdApi";
import { ModernRecycleBinTable } from "../components/households/ModernRecycleBinTable";
import { removeCache } from "@/db/indexedDB";
import { useModal } from "@/hooks/useModal";
import type { Household } from "@/types";

export const RecycleBinPage: React.FC = () => {
	const { villages, user, selectedVillageId } = useApp();
	const { showModal } = useModal();
	const isAdmin = user?.role === "admin";
	const activeVillageId = isAdmin
		? (selectedVillageId || undefined)
		: (user?.village_id || "__NO_VILLAGE__");

	const visibleVillages = isAdmin
		? villages
		: villages.filter((v) => v.id === user?.village_id);

	const [deletedHouseholds, setDeletedHouseholds] = useState<Household[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);

	const fetchDeleted = useCallback(async () => {
		if (!isAdmin && !user?.village_id) {
			setDeletedHouseholds([]);
			setTotal(0);
			setTotalPages(1);
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const res = await householdApi.getRecycleBin({
				page,
				limit,
				village_id: activeVillageId,
			});
			setDeletedHouseholds(res.data);
			setTotal(res.pagination.total);
			setTotalPages(res.pagination.totalPages);
		} catch (err) {
			console.warn("Lỗi nạp thùng rác từ server, dùng bộ nhớ cục bộ:", err);
		} finally {
			setLoading(false);
		}
	}, [page, limit, activeVillageId, isAdmin, user?.village_id]);

	useEffect(() => {
		setPage(1);
	}, [activeVillageId]);

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
					setSelectedIds((prev) => prev.filter((i) => i !== hh.id));
					await removeCache("households_latest_all").catch(() => {});
					await removeCache("households_overview").catch(() => {});
					window.dispatchEvent(new CustomEvent("household:restored", { detail: { id: hh.id } }));
					window.dispatchEvent(new CustomEvent("households:refresh"));
					showModal({
						title: "Đã khôi phục",
						message: "Hộ gia đình đã được khôi phục thành công.",
						type: "success",
					});
					if (page > 1 && deletedHouseholds.length === 1) {
						setPage((prev) => Math.max(1, prev - 1));
					} else {
						await fetchDeleted();
					}
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
					setSelectedIds((prev) => prev.filter((i) => i !== hh.id));
					showModal({
						title: "Đã xóa vĩnh viễn",
						message: "Dữ liệu hộ gia đình đã được loại bỏ hoàn toàn.",
						type: "info",
					});
					if (page > 1 && deletedHouseholds.length === 1) {
						setPage((prev) => Math.max(1, prev - 1));
					} else {
						await fetchDeleted();
					}
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
		const targetIds = [...selectedIds];
		showModal({
			title: "Khôi phục hàng loạt",
			message: `Bạn có chắc muốn khôi phục ${targetIds.length} Hộ gia đình đã chọn?`,
			type: "info",
			confirmText: "Khôi Phục Tất Cả",
			cancelText: "Hủy",
			onConfirm: async () => {
				try {
					await Promise.all(targetIds.map((id) => householdApi.restore(id)));
					setSelectedIds([]);
					await removeCache("households_latest_all").catch(() => {});
					await removeCache("households_overview").catch(() => {});
					window.dispatchEvent(new CustomEvent("households:refresh"));
					showModal({
						title: "Thành công",
						message: `Đã khôi phục ${targetIds.length} hộ gia đình.`,
						type: "success",
					});
					if (page > 1 && targetIds.length >= deletedHouseholds.length) {
						setPage(1);
					} else {
						await fetchDeleted();
					}
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
		const targetIds = [...selectedIds];
		showModal({
			title: "Xóa vĩnh viễn hàng loạt",
			message: `NGUY HIỂM: Bạn có chắc chắn muốn xóa vĩnh viễn ${targetIds.length} Hộ gia đình đã chọn khỏi CSDL? Thao tác này không thể hoàn tác!`,
			type: "danger",
			confirmText: "Xác Nhận Xóa Vĩnh Viễn",
			cancelText: "Hủy",
			onConfirm: async () => {
				try {
					await Promise.all(targetIds.map((id) => householdApi.hardDelete(id)));
					setSelectedIds([]);
					showModal({
						title: "Thành công",
						message: `Đã xóa vĩnh viễn ${targetIds.length} hộ gia đình.`,
						type: "info",
					});
					if (page > 1 && targetIds.length >= deletedHouseholds.length) {
						setPage(1);
					} else {
						await fetchDeleted();
					}
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
				villages={visibleVillages}
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
			/>
		</div>
	);
};
