import type { TabType } from "../types";
import { useExportProfiles } from "./useExportProfiles";
import type { ImportExportFilters } from "./useImportExportTypes";

export * from "./useImportExportTypes";

export function useImportExport(
	villageId: string | undefined,
	activeTab: TabType,
	_user: any,
	_loadProfiles?: () => Promise<void>,
	isGlobal?: boolean,
	villages?: { id: number; name: string }[],
	filters?: ImportExportFilters,
	_globalCalculationYear?: number,
) {
	return useExportProfiles(
		villageId,
		activeTab,
		isGlobal,
		villages,
		filters,
	);
}
