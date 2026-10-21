import { apiClient } from "./client";

export interface ProfileQueryParams {
	search?: string; villageId?: string; status?: string; ageGroup?: string;
	gender?: string; ethnicity?: string; residence?: string; sortKey?: string;
	sortDirection?: string; cursor?: string; page?: number; limit?: number;
	calculationYear?: number;
}

export interface ProfilesPaginationResponse<T = any> {
	data: T[];
	pagination: { total: number; page: number; limit: number; totalPages: number; };
}

export const profilesApi = {
	async getProfiles(params: ProfileQueryParams): Promise<ProfilesPaginationResponse> {
		const cleanParams: any = { ...params };
		if (!cleanParams.villageId || cleanParams.villageId === "all") delete cleanParams.villageId;
		if (!cleanParams.calculationYear || isNaN(cleanParams.calculationYear)) delete cleanParams.calculationYear;
		const res = await apiClient.get("/policies/chuctho", { params: cleanParams });
		const d = res.data;
		return {
			data: d?.data || d || [],
			pagination: {
				total: d?.total ?? d?.pagination?.total ?? (d?.data?.length || 0),
				page: d?.page ?? d?.pagination?.page ?? params.page ?? 1,
				limit: d?.limit ?? d?.pagination?.limit ?? params.limit ?? 20,
				totalPages: d?.totalPages ?? d?.pagination?.totalPages ?? Math.ceil((d?.total || 1) / (params.limit || 20)),
			},
		};
	},

	async getProfileStats(villageId?: string, calculationYear?: number) {
		const params: any = {};
		if (villageId && villageId !== "all") params.villageId = villageId;
		if (calculationYear) params.calculationYear = calculationYear;
		const res = await apiClient.get("/policies/analytics", { params });
		return res.data?.chuctho || res.data?.data?.chuctho || res.data;
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

	async bulkAddProfiles(profiles: any[]) {
		return profiles;
	},

	async bulkAdd(profiles: any[]) {
		return profiles;
	},

	async emptyTrash() {
		return { success: true };
	},

	async recalculate(year: number) {
		return this.getProfiles({ calculationYear: year });
	},

	async getAuditLog(_id: string) {
		return [];
	},
};
