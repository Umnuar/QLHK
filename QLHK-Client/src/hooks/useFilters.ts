import { useEffect, useState } from "react";
import { useDebounce } from "./useDebounce";
import type { SortDirection, SortKey, TabType } from "../types";

export function useFilters(activeTab: TabType) {
	const [ctSearch, setCtSearch] = useState("");
	const ctDebouncedSearch = useDebounce(ctSearch, 250);
	const [ctDateFilter, setCtDateFilter] = useState("");
	const ctDebouncedDateFilter = useDebounce(ctDateFilter, 300);
	const [ctAgeFilters, setCtAgeFilters] = useState<string[]>([]);
	const [ctVillageFilters, setCtVillageFilters] = useState<number[]>([]);
	const [ctStatusFilter, setCtStatusFilter] = useState("all");
	const [ctGenderFilter, setCtGenderFilter] = useState("");
	const [ctEthnicityFilter, setCtEthnicityFilter] = useState("");
	const [ctResidenceFilter, setCtResidenceFilter] = useState("");
	const [ctSortConfig, setCtSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
		key: "name",
		direction: "asc",
	});
	const [ctCurrentPage, setCtCurrentPage] = useState(1);
	const [ctSelectedIds, setCtSelectedIds] = useState<Set<string>>(new Set());

	const [hxSearch, setHxSearch] = useState("");
	const hxDebouncedSearch = useDebounce(hxSearch, 250);
	const [hxDateFilter, setHxDateFilter] = useState("");
	const hxDebouncedDateFilter = useDebounce(hxDateFilter, 300);
	const [hxAgeFilters, setHxAgeFilters] = useState<string[]>([]);
	const [hxVillageFilters, setHxVillageFilters] = useState<number[]>([]);
	const [hxStatusFilter, setHxStatusFilter] = useState("all");
	const [hxGenderFilter, setHxGenderFilter] = useState("");
	const [hxEthnicityFilter, setHxEthnicityFilter] = useState("");
	const [hxResidenceFilter, setHxResidenceFilter] = useState("");
	const [hxSortConfig, setHxSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
		key: "name",
		direction: "asc",
	});
	const [hxCurrentPage, setHxCurrentPage] = useState(1);
	const [hxSelectedIds, setHxSelectedIds] = useState<Set<string>>(new Set());

	const [itemsPerPage, setItemsPerPageState] = useState(10);

	const setItemsPerPage = (val: number | ((prev: number) => number)) => {
		setItemsPerPageState(val);
		setCtCurrentPage(1);
		setHxCurrentPage(1);
	};

	useEffect(() => {
		if (
			ctDebouncedSearch !== undefined ||
			ctDebouncedDateFilter !== undefined ||
			ctStatusFilter !== undefined ||
			ctAgeFilters.length >= 0 ||
			ctVillageFilters.length >= 0 ||
			ctGenderFilter !== undefined ||
			ctEthnicityFilter !== undefined ||
			ctResidenceFilter !== undefined
		) {
			setCtCurrentPage(1);
		}
	}, [ctDebouncedSearch, ctDebouncedDateFilter, ctStatusFilter, ctAgeFilters, ctVillageFilters, ctGenderFilter, ctEthnicityFilter, ctResidenceFilter]);

	useEffect(() => {
		if (
			hxDebouncedSearch !== undefined ||
			hxDebouncedDateFilter !== undefined ||
			hxStatusFilter !== undefined ||
			hxAgeFilters.length >= 0 ||
			hxVillageFilters.length >= 0 ||
			hxGenderFilter !== undefined ||
			hxEthnicityFilter !== undefined ||
			hxResidenceFilter !== undefined
		) {
			setHxCurrentPage(1);
		}
	}, [hxDebouncedSearch, hxDebouncedDateFilter, hxStatusFilter, hxAgeFilters, hxVillageFilters, hxGenderFilter, hxEthnicityFilter, hxResidenceFilter]);

	const isCt = activeTab === "chuctho";

	const search = isCt ? ctSearch : hxSearch;
	const setSearch = (val: string) => (isCt ? setCtSearch(val) : setHxSearch(val));

	const debouncedSearch = isCt ? ctDebouncedSearch : hxDebouncedSearch;

	const dateFilter = isCt ? ctDateFilter : hxDateFilter;
	const debouncedDateFilter = isCt ? ctDebouncedDateFilter : hxDebouncedDateFilter;
	const setDateFilter = (val: string) => (isCt ? setCtDateFilter(val) : setHxDateFilter(val));

	const ageFilters = isCt ? ctAgeFilters : hxAgeFilters;
	const setAgeFilters = (val: string[] | ((prev: string[]) => string[])) =>
		isCt ? setCtAgeFilters(val) : setHxAgeFilters(val);

	const villageFilters = isCt ? ctVillageFilters : hxVillageFilters;
	const setVillageFilters = (val: number[] | ((prev: number[]) => number[])) =>
		isCt ? setCtVillageFilters(val) : setHxVillageFilters(val);

	const statusFilter = isCt ? ctStatusFilter : hxStatusFilter;
	const setStatusFilter = (val: string) => (isCt ? setCtStatusFilter(val) : setHxStatusFilter(val));

	const genderFilter = isCt ? ctGenderFilter : hxGenderFilter;
	const setGenderFilter = (val: string) => (isCt ? setCtGenderFilter(val) : setHxGenderFilter(val));

	const ethnicityFilter = isCt ? ctEthnicityFilter : hxEthnicityFilter;
	const setEthnicityFilter = (val: string) =>
		isCt ? setCtEthnicityFilter(val) : setHxEthnicityFilter(val);

	const residenceFilter = isCt ? ctResidenceFilter : hxResidenceFilter;
	const setResidenceFilter = (val: string) =>
		isCt ? setCtResidenceFilter(val) : setHxResidenceFilter(val);

	const sortConfig = isCt ? ctSortConfig : hxSortConfig;
	const setSortConfig = (
		val:
			| { key: SortKey; direction: SortDirection }
			| ((prev: { key: SortKey; direction: SortDirection }) => {
				key: SortKey;
				direction: SortDirection;
			}),
	) => (isCt ? setCtSortConfig(val) : setHxSortConfig(val));

	const currentPage = isCt ? ctCurrentPage : hxCurrentPage;
	const setCurrentPage = (val: number | ((prev: number) => number)) =>
		isCt ? setCtCurrentPage(val) : setHxCurrentPage(val);

	const selectedIds = isCt ? ctSelectedIds : hxSelectedIds;
	const setSelectedIds = (val: Set<string> | ((prev: Set<string>) => Set<string>)) =>
		isCt ? setCtSelectedIds(val) : setHxSelectedIds(val);

	const resetFilters = () => {
		if (isCt) {
			setCtSearch("");
			setCtDateFilter("");
			setCtStatusFilter("all");
			setCtGenderFilter("");
			setCtEthnicityFilter("");
			setCtResidenceFilter("");
			setCtAgeFilters([]);
			setCtVillageFilters([]);
			setCtCurrentPage(1);
		} else {
			setHxSearch("");
			setHxDateFilter("");
			setHxStatusFilter("all");
			setHxGenderFilter("");
			setHxEthnicityFilter("");
			setHxResidenceFilter("");
			setHxAgeFilters([]);
			setHxVillageFilters([]);
			setHxCurrentPage(1);
		}
	};

	const handleSort = (key: SortKey) => {
		let direction: SortDirection = "asc";
		const currentSort = isCt ? ctSortConfig : hxSortConfig;
		if (currentSort.key === key && currentSort.direction === "asc") direction = "desc";
		if (isCt) {
			setCtSortConfig({ key, direction });
		} else {
			setHxSortConfig({ key, direction });
		}
	};

	return {
		search,
		setSearch,
		debouncedSearch,
		dateFilter,
		debouncedDateFilter,
		setDateFilter,
		ageFilters,
		setAgeFilters,
		villageFilters,
		setVillageFilters,
		statusFilter,
		setStatusFilter,
		genderFilter,
		setGenderFilter,
		ethnicityFilter,
		setEthnicityFilter,
		residenceFilter,
		setResidenceFilter,
		resetFilters,
		sortConfig,
		setSortConfig,
		handleSort,
		currentPage,
		setCurrentPage,
		itemsPerPage,
		setItemsPerPage,
		selectedIds,
		setSelectedIds,
	};
}
