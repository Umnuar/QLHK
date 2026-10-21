import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { htxhApi } from "../api/htxh";
import { profilesApi } from "../api/profiles";
import { getCache, setCache } from "../db/indexedDB";
import { useModal } from "./useModal";
import type { AuditLog, TabType } from "../types";
import type { FilterParams } from "./useProfilesTypes";
import { useProfilesActions } from "./useProfilesActions";

export * from "./useProfilesTypes";

export function useProfiles(
	villageId: string | undefined,
	isGlobal: boolean | undefined,
	_user: any,
	activeTab: TabType,
	filters: FilterParams,
	globalCalculationYear?: number,
) {
	const [page, setPage] = useState<number>(filters.currentPage || 1);
	const [pageData, setPageData] = useState<any[]>([]);
	const [total, setTotal] = useState(0);
	const [stats, setStats] = useState<any>({ total: 0, received: 0, unreceived: 0, rate: "0.0" });
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState<string | number | null>(null);
	const [isStatusUpdating, setIsStatusUpdating] = useState<string | number | null>(null);
	const [isBulkUpdating, setIsBulkUpdating] = useState(false);
	const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
	const [isLoadingLogs, setIsLoadingLogs] = useState(false);
	const deleteDataRef = useRef<any>(null);
	const pageDataRef = useRef<any[]>([]);
	const abortControllerRef = useRef<AbortController | null>(null);
	const auditLogAbortControllerRef = useRef<AbortController | null>(null);
	const activeAuditLogIdRef = useRef<string | null>(null);
	const prevLimitRef = useRef(filters.itemsPerPage);

	useEffect(() => {
		return () => {
			if (auditLogAbortControllerRef.current) auditLogAbortControllerRef.current.abort();
		};
	}, []);

	useEffect(() => {
		if (filters.currentPage !== undefined) setPage(filters.currentPage);
	}, [filters.currentPage]);

	const handlePageSizeChange = useCallback(
		(newSize: number) => {
			setPage(1);
			if (filters.setCurrentPage) filters.setCurrentPage(1);
			if (filters.setPage) filters.setPage(1);
			if (filters.setItemsPerPage) filters.setItemsPerPage(newSize);
		},
		[filters],
	);

	useEffect(() => {
		if (prevLimitRef.current !== filters.itemsPerPage) {
			prevLimitRef.current = filters.itemsPerPage;
			setPage(1);
			if (filters.setCurrentPage) filters.setCurrentPage(1);
			if (filters.setPage) filters.setPage(1);
		}
	}, [filters.itemsPerPage]);

	useEffect(() => {
		pageDataRef.current = pageData;
	}, [pageData]);

	useEffect(() => {
		if (isDeleting !== null && isDeleting !== -1) {
			deleteDataRef.current = pageDataRef.current.find((p: any) => p.id === isDeleting);
		}
	}, [isDeleting]);

	const { showAlert } = useModal();
	const api = activeTab === "chuctho" ? profilesApi : htxhApi;

	const {
		debouncedSearch, statusFilter, ageFilters, genderFilter,
		ethnicityFilter, residenceFilter, sortKey, sortDirection,
		currentPage, itemsPerPage,
	} = filters;

	const ageGroup = ageFilters?.[0] || undefined;

	const loadPage = useCallback(async () => {
		if (abortControllerRef.current) abortControllerRef.current.abort();
		const abortController = new AbortController();
		abortControllerRef.current = abortController;

		const vid = isGlobal || !villageId || villageId === "all" ? undefined : villageId?.trim() || undefined;
		const yearTag = globalCalculationYear && globalCalculationYear > 0 ? `y${globalCalculationYear}` : "yall";
		const cacheKey = `profiles_${activeTab}_${vid || "all"}_${yearTag}_p${currentPage}_l${itemsPerPage}_${statusFilter}_${genderFilter || ""}_${ethnicityFilter || ""}_${residenceFilter || ""}_${ageGroup || ""}_${debouncedSearch || ""}`;

		try {
			const cached = await getCache<any>(cacheKey);
			if (abortController.signal.aborted) return;
			if (cached && cached.data) {
				setPageData(cached.data);
				if (cached.pagination?.total !== undefined) setTotal(cached.pagination.total);
			}
		} catch {}

		try {
			const queryParams = {
				villageId: vid, search: debouncedSearch || undefined,
				status: statusFilter !== "all" ? statusFilter : undefined, ageGroup,
				gender: genderFilter || undefined, ethnicity: ethnicityFilter || undefined,
				residence: residenceFilter || undefined, sortKey: sortKey || undefined,
				sortDirection: sortDirection || undefined, page: currentPage || 1, limit: itemsPerPage || 50,
				calculationYear: globalCalculationYear && globalCalculationYear > 0 ? globalCalculationYear : undefined,
			};

			const fetchFn = activeTab === "chuctho"
				? (params: any, options?: any) => (profilesApi.getProfiles as any)(params, options)
				: (params: any, options?: any) => ((htxhApi.getHtxhProfiles || htxhApi.getProfiles) as any).call(htxhApi, params, options);

			const res = await fetchFn(queryParams, { signal: abortController.signal });
			if (abortController.signal.aborted) return;

			if (res && res.data) {
				setPageData(res.data);
				setTotal(res.pagination?.total ?? res.data.length);
				await setCache(cacheKey, res);
			}
		} catch (e: any) {
			if (abortController.signal.aborted || axios.isCancel(e) || e?.code === "ERR_CANCELED" || e?.name === "CanceledError" || e?.name === "AbortError") return;
			console.warn("Failed to load profiles from network, using cached state:", e);
		}
	}, [isGlobal, villageId, activeTab, currentPage, itemsPerPage, statusFilter, ageGroup, genderFilter, ethnicityFilter, residenceFilter, debouncedSearch, sortKey, sortDirection, globalCalculationYear]);

	const loadStats = useCallback(async () => {
		try {
			const vid = isGlobal || !villageId || villageId === "all" ? undefined : villageId?.trim() || undefined;
			const res = await api.getProfileStats(vid, globalCalculationYear && globalCalculationYear > 0 ? globalCalculationYear : undefined);
			if (res) {
				setStats((prev: any) => {
					if (prev && prev.total === res.total && prev.received === res.received && prev.unreceived === res.unreceived && prev.rate === res.rate) return prev;
					return res;
				});
			}
		} catch (e) {
			console.error("Failed to load stats:", e);
		}
	}, [isGlobal, villageId, api, globalCalculationYear]);

	useEffect(() => {
		loadPage();
		return () => {
			if (abortControllerRef.current) abortControllerRef.current.abort();
		};
	}, [loadPage]);

	useEffect(() => {
		loadStats();
	}, [loadStats]);

	const actions = useProfilesActions(api, showAlert, loadPage, loadStats, pageDataRef, setPageData, setIsSaving, setIsDeleting, setIsStatusUpdating, setIsBulkUpdating);

	const fetchAuditLogs = useCallback(
		async (profileId: string | number) => {
			const idStr = String(profileId);
			if (!idStr) return;
			if (auditLogAbortControllerRef.current) auditLogAbortControllerRef.current.abort();
			const controller = new AbortController();
			auditLogAbortControllerRef.current = controller;
			activeAuditLogIdRef.current = idStr;

			setIsLoadingLogs(true);
			try {
				const logs = await api.getAuditLog(idStr, { signal: controller.signal });
				if (controller.signal.aborted) return;
				setAuditLogs(logs || []);
			} catch (err: any) {
				if (controller.signal.aborted || axios.isCancel(err) || err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError") return;
				console.error("Failed to load audit logs:", err);
				setAuditLogs([]);
			} finally {
				if (!controller.signal.aborted) setIsLoadingLogs(false);
			}
		},
		[api],
	);

	return {
		page, setPage, handlePageSizeChange, pageData, total, stats,
		isSaving, setIsSaving, isDeleting, setIsDeleting, isStatusUpdating, isBulkUpdating,
		auditLogs, setAuditLogs, isLoadingLogs, loadAuditLogs: fetchAuditLogs,
		undoCount: 0, undoLastAction: async () => {}, handleUndo: async () => {},
		handleSave: actions.handleSave, handleDelete: actions.handleDelete, executeDelete: actions.handleDelete,
		handleStatusToggle: actions.handleStatusToggle, handleToggleReceived: actions.handleStatusToggle,
		handleBulkStatus: actions.handleBulkStatus, handleBulkToggleReceived: actions.handleBulkStatus,
		handleBulkDelete: actions.handleBulkDelete,
		fetchAuditLogs, loadProfiles: loadPage, fetchProfiles: loadPage, loadPage, loadStats,
	};
}
