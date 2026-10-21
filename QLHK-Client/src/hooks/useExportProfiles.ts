import { useCallback, useRef, useState } from "react";
import { htxhApi } from "../api/htxh";
import { profilesApi } from "../api/profiles";
import { useModal } from "./useModal";
import { exportExcelClient } from "../utils/excelExporter";
import type { TabType } from "../types";
import type { ImportExportFilters } from "./useImportExportTypes";

export function useExportProfiles(
	villageId: string | undefined,
	activeTab: TabType,
	isGlobal?: boolean,
	villages?: { id: number; name: string }[],
	filters?: ImportExportFilters,
) {
	const [isExportModalOpen, setIsExportModalOpen] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const { showAlert } = useModal();
	const isMounted = useRef(true);

	const executeExport = useCallback(
		async (modalOptions?: {
			selectedVillages: number[];
			exportSelectedOnly: boolean;
			selectedIds: Set<number>;
		}) => {
			if (isExporting) return;

			setIsExporting(true);

			try {
				const params: any = {
					limit: 10000,
					sortKey: filters?.sortKey || "name",
					sortDirection: filters?.sortDirection || "asc",
				};
				if (!isGlobal && villageId) params.villageId = villageId;
				if (filters?.search) params.search = filters.search;
				if (filters?.statusFilter && filters.statusFilter !== "all")
					params.status = filters.statusFilter;
				if (filters?.ageFilters && filters.ageFilters.length > 0)
					params.ageGroup = filters.ageFilters[0];

				let targetProfiles: any[] = [];

				if (activeTab === "chuctho") {
					const apiRes = await profilesApi.getProfiles(params);
					targetProfiles = apiRes.data || [];
				} else {
					const apiRes = await htxhApi.getProfiles(params);
					targetProfiles = apiRes.data || [];
				}

				if (
					isGlobal &&
					modalOptions?.selectedVillages &&
					modalOptions.selectedVillages.length > 0
				) {
					const villageSet = new Set(modalOptions.selectedVillages.map(String));
					targetProfiles = targetProfiles.filter((p: any) =>
						villageSet.has(String(p.village_id || p.villageId)),
					);
				}

				if (
					modalOptions?.exportSelectedOnly &&
					modalOptions.selectedIds.size > 0
				) {
					const idSet = new Set(
						Array.from(modalOptions.selectedIds).map(String),
					);
					targetProfiles = targetProfiles.filter((p: any) =>
						idSet.has(String(p.id)),
					);
				}

				const exportRes = await exportExcelClient({
					filteredProfiles: targetProfiles,
					activeTab,
					isGlobal,
					villages,
				});

				if (exportRes.success) {
					setIsExportModalOpen(false);
					showAlert({
						title: "Xuất file thành công",
						message: `File đã được tải xuống:\n${exportRes.fileName}`,
						type: "success",
					});
				} else {
					showAlert({
						title: "Lỗi xuất file",
						message: exportRes.error || "Không thể xuất file",
						type: "error",
					});
				}
			} catch (err: any) {
				console.error("Export error:", err);
				showAlert({
					title: "Lỗi hệ thống",
					message: `Lỗi hệ thống khi xuất file: ${err.message}`,
					type: "error",
				});
			} finally {
				if (isMounted.current) {
					setIsExporting(false);
				}
			}
		},
		[activeTab, isExporting, isGlobal, villages, villageId, filters, showAlert],
	);

	return {
		isExportModalOpen,
		setIsExportModalOpen,
		isExporting,
		setIsExporting,
		executeExport,
	};
}
