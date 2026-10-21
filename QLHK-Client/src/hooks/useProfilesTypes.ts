export interface FilterParams {
	debouncedSearch: string;
	statusFilter: string;
	ageFilters: string[];
	villageFilters: (number | string)[];
	sortKey: string | null;
	sortDirection: string | null;
	currentPage: number;
	itemsPerPage: number;
	genderFilter?: string;
	ethnicityFilter?: string;
	residenceFilter?: string;
	setCurrentPage?: (page: number) => void;
	setItemsPerPage?: (limit: number) => void;
	setPage?: (page: number) => void;
}
