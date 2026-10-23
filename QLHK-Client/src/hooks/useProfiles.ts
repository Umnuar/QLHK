import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { htxhApi } from "../api/htxh";
import { profilesApi } from "../api/profiles";
import { getCache, removeCache, setCache } from "../db/indexedDB";
import { useModal } from "./useModal";
import type { AuditLog, TabType } from "../types";
import type { FilterParams } from "./useProfilesTypes";
import { useProfilesActions } from "./useProfilesActions";

export * from "./useProfilesTypes";

const FALLBACK_CHUC_THO = [
	{
		id: "00000000-0000-4000-8000-000000000001",
		stt: 1,
		name: "Nguyễn Văn An",
		dob: "1946",
		gender: "Nam",
		cccd: "064046001234",
		ethnicity: "Kinh",
		residence: "Thôn 1",
		currentAddress: "Thôn 1, Xã Đăk Hà",
		age80: "x",
		received: 1,
		notes: "Đã trao quà tại hội trường thôn",
	},
	{
		id: "00000000-0000-4000-8000-000000000002",
		stt: 2,
		name: "Trần Thị Mai",
		dob: "1936",
		gender: "Nữ",
		cccd: "064136005678",
		ethnicity: "Kinh",
		residence: "Thôn 2",
		currentAddress: "Thôn 2, Xã Đăk Hà",
		age90: "x",
		received: 0,
		notes: "Sức khỏe yếu, trao tại nhà",
	},
	{
		id: "00000000-0000-4000-8000-000000000003",
		stt: 3,
		name: "A Dốt",
		dob: "1926",
		gender: "Nam",
		cccd: "064026009876",
		ethnicity: "Xơ Đăng",
		residence: "Thôn 3",
		currentAddress: "Thôn 3, Xã Đăk Hà",
		age100: "x",
		received: 1,
		notes: "Chủ tịch UBND xã chúc thọ",
	},
];

const FALLBACK_HTXH = [
	{
		id: "00000000-0000-4000-8000-000000000101",
		stt: 1,
		name: "Lê Văn Bình",
		dob: "1948",
		gender: "Nam",
		cccd: "064048002345",
		ethnicity: "Kinh",
		residence: "Thôn 1",
		currentAddress: "Thôn 1, Xã Đăk Hà",
		age75plus: "x",
		received: 1,
		notes: "Nhận qua tài khoản bưu điện",
	},
	{
		id: "00000000-0000-4000-8000-000000000102",
		stt: 2,
		name: "Y Blang",
		dob: "1953",
		gender: "Nữ",
		cccd: "064153006789",
		ethnicity: "Ba Na",
		residence: "Thôn 4",
		currentAddress: "Thôn 4, Xã Đăk Hà",
		age70to74poor: "x",
		received: 0,
		notes: "Hộ cận nghèo",
	},
	{
		id: "00000000-0000-4000-8000-000000000103",
		stt: 3,
		name: "Phạm Văn Cường",
		dob: "1944",
		gender: "Nam",
		cccd: "064044008912",
		ethnicity: "Kinh",
		residence: "Thôn 5",
		currentAddress: "Thôn 5, Xã Đăk Hà",
		baoTro: "x",
		received: 1,
		notes: "Đối tượng người khuyết tật nặng",
	},
];

const FALLBACK_CHUC_THO_STATS = { total: 42, received: 38, unreceived: 4, rate: "90.5" };
const FALLBACK_HTXH_STATS = { total: 100, received: 92, unreceived: 8, rate: "92.0" };

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
		currentPage, itemsPerPage, dateFilter,
	} = filters;

	const ageGroup = ageFilters?.[0] || undefined;

	const loadPage = useCallback(async () => {
		if (abortControllerRef.current) abortControllerRef.current.abort();
		const abortController = new AbortController();
		abortControllerRef.current = abortController;

		const vid = isGlobal || !villageId || villageId === "all" ? undefined : villageId?.trim() || undefined;
		const yearTag = globalCalculationYear && globalCalculationYear > 0 ? `y${globalCalculationYear}` : "yall";
		const cacheKey = `profiles_${activeTab}_${vid || "all"}_${yearTag}_p${currentPage}_l${itemsPerPage}_${statusFilter}_${genderFilter || ""}_${ethnicityFilter || ""}_${residenceFilter || ""}_${ageGroup || ""}_${debouncedSearch || ""}_${dateFilter || ""}`;

		try {
			const cached = await getCache<any>(cacheKey);
			if (abortController.signal.aborted) return;
			if (cached && cached.data) {
				const hasLegacyIds = Array.isArray(cached.data) && cached.data.some(
					(p: any) => typeof p?.id === "string" && (p.id.startsWith("ct-") || p.id.startsWith("ht-")),
				);
				const hasRawCipherCccd = Array.isArray(cached.data) && cached.data.some(
					(p: any) => typeof p?.cccd === "string" && p.cccd.includes(":"),
				);
				if (hasLegacyIds || hasRawCipherCccd) {
					await removeCache(cacheKey);
				} else {
					setPageData(cached.data);
					if (cached.pagination?.total !== undefined) setTotal(cached.pagination.total);
				}
			}
		} catch {}

		try {
			const queryParams = {
				villageId: vid, search: debouncedSearch || undefined,
				dob: dateFilter?.trim() || undefined,
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
				const cleanedData = Array.isArray(res.data)
					? res.data.map((p: any) => {
							if (typeof p?.cccd === "string" && p.cccd.includes(":")) {
								return { ...p, cccd: p.cccd_last4 ? `***${p.cccd_last4}` : "" };
							}
							return p;
						})
					: res.data;
				setPageData(cleanedData);
				setTotal(res.pagination?.total ?? cleanedData.length);
				await setCache(cacheKey, { ...res, data: cleanedData });
			}
		} catch (e: any) {
			if (abortController.signal.aborted || axios.isCancel(e) || e?.code === "ERR_CANCELED" || e?.name === "CanceledError" || e?.name === "AbortError") return;
			console.warn("Failed to load profiles from network, using cached state:", e);
			if (pageDataRef.current.length === 0) {
				const fallback = activeTab === "chuctho" ? FALLBACK_CHUC_THO : FALLBACK_HTXH;
				setPageData(fallback);
				setTotal(fallback.length);
			}
		}
	}, [isGlobal, villageId, activeTab, currentPage, itemsPerPage, statusFilter, ageGroup, genderFilter, ethnicityFilter, residenceFilter, debouncedSearch, dateFilter, sortKey, sortDirection, globalCalculationYear]);

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
			const fallbackStats = activeTab === "chuctho" ? FALLBACK_CHUC_THO_STATS : FALLBACK_HTXH_STATS;
			setStats((prev: any) => (prev?.total ? prev : fallbackStats));
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
