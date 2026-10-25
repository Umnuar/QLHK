import { apiClient } from "./client";
import { excelApi } from "./excelApi";

export interface ProfileQueryParams {
	search?: string;
	villageId?: string;
	status?: string;
	ageGroup?: string;
	gender?: string;
	ethnicity?: string;
	residence?: string;
	sortKey?: string;
	sortDirection?: string;
	cursor?: string;
	page?: number;
	limit?: number;
	calculationYear?: number;
	dob?: string;
	exact_date?: string;
	exactDate?: string;
}

export interface ProfilesPaginationResponse<T = any> {
	data: T[];
	pagination: {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};
}

export const profilesApi = {
	async getProfiles(params: ProfileQueryParams): Promise<ProfilesPaginationResponse> {
		const cleanParams: any = {
			page: params.page ?? 1,
			limit: params.limit ?? 20,
			search: params.search?.trim() || undefined,
			dob: params.dob?.trim() || undefined,
			exact_date: params.dob?.trim() || undefined,
			status: params.status !== "all" ? params.status : undefined,
			ageGroup: params.ageGroup || undefined,
			milestone: params.ageGroup || undefined,
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
		}
		if (cleanParams.status === "received" || cleanParams.status === 1 || cleanParams.status === true) {
			cleanParams.received = true;
		} else if (cleanParams.status === "unreceived" || cleanParams.status === 0 || cleanParams.status === false) {
			cleanParams.received = false;
		}
		const res = await apiClient.get("/policies/chuctho", { params: cleanParams });
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

	async getProfileStats(villageId?: string, calculationYear?: number) {
		const params: any = {};
		if (villageId && villageId !== "all") {
			params.villageId = villageId;
			params.village_id = villageId;
		}
		if (calculationYear) {
			params.calculationYear = calculationYear;
			params.calculation_year = calculationYear;
		}
		const res = await apiClient.get("/policies/analytics", { params });
		const d = res.data?.data || res.data;
		const ct = d?.chuctho || d;
		if (ct && ct.total !== undefined) {
			const total = ct.total || 0;
			const received = ct.received || 0;
			const unreceived = ct.pending ?? ct.unreceived ?? (total - received);
			const rate = total > 0 ? ((received / total) * 100).toFixed(1) : "0.0";
			return { total, received, unreceived, rate, byMilestone: ct.byMilestone || ct.milestones };
		}
		return ct;
	},

	async getDeletedProfiles() {
		return [];
	},

	async createProfile(data: any) {
		const res = await apiClient.post("/policies/chuctho", data);
		return res.data?.data || res.data;
	},

	async updateProfile(id: string, data: any) {
		const res = await apiClient.put(`/policies/chuctho/${id}`, data);
		return res.data?.data || res.data;
	},

	async updateProfileStatus(id: string, received: boolean) {
		const res = await apiClient.patch(`/policies/chuctho/${id}/received`, { received });
		return res.data?.data || res.data;
	},

	async deleteProfile(id: string) {
		const res = await apiClient.delete(`/policies/chuctho/${id}`);
		return res.data?.data || res.data;
	},

	async restoreProfile(id: string) {
		return { id };
	},

	async hardDeleteProfile(id: string) {
		const res = await apiClient.delete(`/policies/chuctho/${id}`);
		return res.data;
	},

	async bulkUpdateStatus(ids: string[], received: boolean) {
		await Promise.all(ids.map((id) => apiClient.patch(`/policies/chuctho/${id}/received`, { received })));
		return { success: true };
	},

	async bulkDelete(ids: string[]) {
		await Promise.all(ids.map((id) => apiClient.delete(`/policies/chuctho/${id}`)));
		return { success: true };
	},

	async bulkAddProfiles(profiles: any[], options?: { villageId?: string; calculationYear?: number }) {
		return excelApi.importProfiles({
			type: "chuctho",
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

	async getAuditLog(_id: string) {
		return [];
	},
};
