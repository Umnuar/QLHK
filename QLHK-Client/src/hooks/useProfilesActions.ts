import type React from "react";

export function useProfilesActions(
	api: any,
	showAlert: any,
	loadPage: () => Promise<void>,
	loadStats: () => Promise<void>,
	pageDataRef: React.MutableRefObject<any[]>,
	setPageData: React.Dispatch<React.SetStateAction<any[]>>,
	setIsSaving: (v: boolean) => void,
	setIsDeleting: (v: string | number | null) => void,
	setIsStatusUpdating: (v: string | number | null) => void,
	setIsBulkUpdating: (v: boolean) => void,
) {
	const handleSave = async (profileData: any, editId: string | number | null) => {
		setIsSaving(true);
		try {
			if (editId) {
				await api.updateProfile(String(editId), profileData);
			} else {
				await api.createProfile(profileData);
			}
			await loadPage();
			await loadStats();
			return true;
		} catch (err: any) {
			const msg = err.response?.data?.message || err.response?.data?.error || "Lỗi khi lưu dữ liệu";
			if (err.response?.status === 409) {
				showAlert({
					title: "Xung Đột Dữ Liệu (409)",
					message: "Hồ sơ này đã được cập nhật bởi một thao tác khác. Danh sách dữ liệu đang được đồng bộ lại, vui lòng kiểm tra và thực hiện lại.",
					type: "warning",
				});
				await loadPage();
			} else {
				showAlert({ title: "Lỗi", message: msg, type: "error" });
			}
			return false;
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async (id: string | number) => {
		setIsDeleting(id);
		try {
			await api.deleteProfile(String(id));
			await loadPage();
			await loadStats();
			return true;
		} catch (err: any) {
			const msg = err.response?.data?.error || "Lỗi khi xóa";
			showAlert({ title: "Lỗi", message: msg, type: "error" });
			return false;
		} finally {
			setIsDeleting(null);
		}
	};

	const handleStatusToggle = async (profileOrId: any, maybeStatus?: boolean): Promise<boolean> => {
		const targetId = typeof profileOrId === "object" && profileOrId !== null ? profileOrId.id : profileOrId;
		setIsStatusUpdating(targetId);

		let newStatus: boolean;
		if (typeof maybeStatus === "boolean") {
			newStatus = maybeStatus;
		} else if (typeof profileOrId === "object" && profileOrId !== null) {
			newStatus = !profileOrId.received;
		} else {
			const current = pageDataRef.current.find((p) => String(p.id) === String(targetId));
			newStatus = current ? !current.received : true;
		}

		const previousList = [...pageDataRef.current];
		setPageData((prev) =>
			prev.map((p) =>
				String(p.id) === String(targetId)
					? {
							...p,
							received: newStatus,
							received_at: newStatus ? new Date().toISOString() : null,
							receivedDate: newStatus ? new Date().toLocaleDateString("vi-VN") : null,
						}
					: p,
			),
		);

		try {
			await api.updateProfileStatus(String(targetId), newStatus);
			await loadStats();
			return true;
		} catch (err: any) {
			setPageData(previousList);
			const msg = err.response?.data?.error || err.response?.data?.message || "Lỗi khi cập nhật trạng thái quà";
			showAlert({ title: "Lỗi", message: msg, type: "error" });
			return false;
		} finally {
			setIsStatusUpdating(null);
		}
	};

	const handleBulkStatus = async (status: boolean | number, selectedIds?: any, setSelectedIds?: any): Promise<boolean> => {
		let ids: (string | number)[] = [];
		if (selectedIds instanceof Set) {
			ids = Array.from(selectedIds);
		} else if (Array.isArray(selectedIds)) {
			ids = selectedIds;
		}
		if (ids.length === 0) return false;
		setIsBulkUpdating(true);

		const isReceived = Boolean(status);
		const previousList = [...pageDataRef.current];
		const idSet = new Set(ids.map(String));

		setPageData((prev) =>
			prev.map((p) =>
				idSet.has(String(p.id))
					? {
							...p,
							received: isReceived,
							received_at: isReceived ? new Date().toISOString() : null,
							receivedDate: isReceived ? new Date().toLocaleDateString("vi-VN") : null,
						}
					: p,
			),
		);

		try {
			await api.bulkUpdateStatus(ids.map(String), isReceived);
			if (setSelectedIds) setSelectedIds(new Set());
			await loadStats();
			return true;
		} catch (err: any) {
			setPageData(previousList);
			const msg = err.response?.data?.error || err.response?.data?.message || "Lỗi khi cập nhật hàng loạt";
			showAlert({ title: "Lỗi", message: msg, type: "error" });
			return false;
		} finally {
			setIsBulkUpdating(false);
		}
	};

	const handleBulkDelete = async (selectedIds?: any, setSelectedIds?: any) => {
		let ids: (string | number)[] = [];
		if (selectedIds instanceof Set) {
			ids = Array.from(selectedIds);
		} else if (Array.isArray(selectedIds)) {
			ids = selectedIds;
		}
		if (ids.length === 0) return;
		setIsBulkUpdating(true);
		try {
			await api.bulkDelete(ids.map(String));
			if (setSelectedIds) setSelectedIds(new Set());
			await loadPage();
			await loadStats();
		} catch (err: any) {
			const msg = err.response?.data?.error || "Lỗi khi xóa hàng loạt";
			showAlert({ title: "Lỗi", message: msg, type: "error" });
		} finally {
			setIsBulkUpdating(false);
		}
	};

	return {
		handleSave,
		handleDelete,
		handleStatusToggle,
		handleBulkStatus,
		handleBulkDelete,
	};
}
