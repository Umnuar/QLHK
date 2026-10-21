import type { TabType } from "../types";
import { useImportProfiles } from "./useImportProfiles";
import { useExportProfiles } from "./useExportProfiles";
import type { ImportExportFilters } from "./useImportExportTypes";

export * from "./useImportExportTypes";

export function useImportExport(
	villageId: string | undefined,
	activeTab: TabType,
	_user: any,
	loadProfiles: () => Promise<void>,
	isGlobal?: boolean,
	villages?: { id: number; name: string }[],
	filters?: ImportExportFilters,
	globalCalculationYear?: number,
) {
	const importState = useImportProfiles(
		villageId,
		activeTab,
		loadProfiles,
		globalCalculationYear,
	);

	const exportState = useExportProfiles(
		villageId,
		activeTab,
		isGlobal,
		villages,
		filters,
	);

	return {
		...importState,
		...exportState,
		confirmMapping: importState.applyMapping,
		queueInfo: null,
	};
}
