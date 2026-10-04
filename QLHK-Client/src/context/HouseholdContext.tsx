import type React from "react";
import { createContext, useContext } from "react";
import { useHouseholdStore } from "../store/householdStore";

type StoreType = ReturnType<typeof useHouseholdStore>;

const HouseholdContext = createContext<StoreType | null>(null);

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const store = useHouseholdStore();
	return (
		<HouseholdContext.Provider value={store}>
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
