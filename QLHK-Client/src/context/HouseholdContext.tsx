import type React from "react";
import { createContext, useContext, useMemo } from "react";
import { useHouseholdStore } from "../store/householdStore";

type StoreType = ReturnType<typeof useHouseholdStore>;

const HouseholdContext = createContext<StoreType | null>(null);

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const store = useHouseholdStore();
	const memoizedStore = useMemo(
		() => store,
		[
			store.households,
			store.activeHouseholds,
			store.trashHouseholds,
			store.kpiStats,
			store.ethnicStats,
			store.villageStats,
			store.isAdmin,
			store.isBackendOnline,
			store.isCheckingBackend,
			store.checkBackend,
			store.addHousehold,
			store.updateHousehold,
			store.softDeleteHousehold,
			store.deleteHousehold,
			store.batchDeleteHouseholds,
			store.restoreHousehold,
			store.hardDeleteHousehold,
			store.emptyTrash,
			store.saveMember,
			store.deleteMember,
			store.importHouseholdsFromExcel,
			store.resetToInitialData,
			store.search,
			store.setSearch,
			store.page,
			store.setPage,
			store.limit,
			store.setLimit,
			store.loading,
			store.total,
			store.totalPages,
			store.paginatedHouseholds,
		],
	);

	return (
		<HouseholdContext.Provider value={memoizedStore}>
			{children}
		</HouseholdContext.Provider>
	);
};

export function useHouseholds(): StoreType {
	const context = useContext(HouseholdContext);
	if (!context) {
		throw new Error("useHouseholds must be used within a HouseholdProvider");
	}
	return context;
}
