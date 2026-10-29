import { apiClient } from "./client";
import { excelApi } from "./excelApi";
import type { ProfileQueryParams, ProfilesPaginationResponse } from "./profiles";

export const htxhApi = {
	async getProfiles(params: ProfileQueryParams): Promise<ProfilesPaginationResponse> {
		const cleanParams: any = {
			page: params.page ?? 1,
			limit: params.limit ?? 20,
			search: params.search?.trim() || undefined,
			dob: params.dob?.trim() || undefined,
			status: params.status !== "all" ? params.status : undefined,
			ageGroup: params.ageGroup && params.ageGroup !== "all" ? params.ageGroup : undefined,
			category: params.ageGroup && params.ageGroup !== "all" ? params.ageGroup : undefined,
			gender: params.gender || undefined,
			ethnicity: params.ethnicity || undefined,
			residence: params.residence || undefined,
			sortKey: params.sortKey || undefined,
			sortDirection: params.sortDirection || undefined,
		};
		if (params.villageId && params.villageId !== "all") {
			cleanParams.villageId = params.villageId;
			cleanParams.village_id = params.villageId;
		}
		if (params.calculationYear && !isNaN(params.calculationYear)) {
			cleanParams.calculationYear = params.calculationYear;
			cleanParams.calculation_year = params.calculationYear;
			cleanParams.year = params.calculationYear;
		}
		if (cleanParams.status === "received" || cleanParams.status === 1 || cleanParams.status === true) {
			cleanParams.received = true;
		} else if (cleanParams.status === "unreceived" || cleanParams.status === 0 || cleanParams.status === false) {
			cleanParams.received = false;
		}
		const res = await apiClient.get("/policies/htxh", { params: cleanParams });
		const d = res.data;
		const list = d?.data || d || [];
		return {
			data: Array.isArray(list) ? list : [],
			pagination: {
				total: d?.pagination?.total ?? d?.total ?? (Array.isArray(list) ? list.length : 0),
				page: d?.pagination?.page ?? d?.page ?? cleanParams.page ?? 1,
				limit: d?.pagination?.limit ?? d?.limit ?? cleanParams.limit ?? 20,
				totalPages: d?.pagination?.totalPages ?? d?.totalPages ?? Math.ceil((d?.pagination?.total ?? (Array.isArray(list) ? list.length : 0)) / (cleanParams.limit ?? 20)),
			},
		};
	},

	async getHtxhProfiles(params: ProfileQueryParams): Promise<ProfilesPaginationResponse> {
		return this.getProfiles(params);
	},

	async getProfileStats(villageId?: string, calculationYear?: number) {
		const params: any = {};
		if (villageId && villageId !== "all") {
			params.villageId = villageId;
			params.village_id = villageId;
		}
		if (calculationYear) {
			params.calculationYear = calculationYear;
			params.calculation_year = calculationYear;
			params.year = calculationYear;
		}
		const res = await apiClient.get("/policies/analytics", { params });
		const d = res.data?.data || res.data;
		const ht = d?.htxh || d;
		if (ht && ht.total !== undefined) {
			const total = ht.total || 0;
			const received = ht.received || 0;
			const unreceived = ht.pending ?? ht.unreceived ?? (total - received);
			const rate = total > 0 ? ((received / total) * 100).toFixed(1) : "0.0";
			return { total, received, unreceived, rate, byCategory: ht.byCategory || ht.categories };
		}
		return ht;
	},

	async getDeletedProfiles() {
		return [];
	},

	async createProfile(data: any) {
		const res = await apiClient.post("/policies/htxh", data);
		return res.data?.data || res.data;
	},

	async updateProfile(id: string, data: any) {
		const res = await apiClient.put(`/policies/htxh/${id}`, data);
		return res.data?.data || res.data;
	},

	async updateProfileStatus(id: string, received: boolean) {
		const res = await apiClient.patch(`/policies/htxh/${id}/received`, { received });
		return res.data?.data || res.data;
	},

	async deleteProfile(id: string) {
		const res = await apiClient.delete(`/policies/htxh/${id}`);
		return res.data?.data || res.data;
	},

	async restoreProfile(id: string) {
		return { id };
	},

	async hardDeleteProfile(id: string) {
		const res = await apiClient.delete(`/policies/htxh/${id}`);
		return res.data;
	},

	async bulkUpdateStatus(ids: string[], received: boolean) {
		await Promise.all(ids.map((id) => apiClient.patch(`/policies/htxh/${id}/received`, { received })));
		return { success: true };
	},

	async bulkDelete(ids: string[]) {
		await Promise.all(ids.map((id) => apiClient.delete(`/policies/htxh/${id}`)));
		return { success: true };
	},

	async bulkAddProfiles(profiles: any[], options?: { villageId?: string; calculationYear?: number }) {
		return excelApi.importProfiles({
			type: "htxh",
			villageId: options?.villageId,
			calculationYear: options?.calculationYear,
			profiles,
		});
	},

	async bulkAdd(profiles: any[], options?: { villageId?: string; calculationYear?: number }) {
		return this.bulkAddProfiles(profiles, options);
	},

	async emptyTrash() {
		return { success: true };
	},

	async recalculate(year: number) {
		const res = await apiClient.post("/policies/recalculate", { year, calculation_year: year });
		return res.data;
	},

	async getAuditLog(id: string, options?: any) {
		const res = await apiClient.get(`/policies/htxh/${id}/audit-log`, options);
		return res.data?.data || [];
	},
};
