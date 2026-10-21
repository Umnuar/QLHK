import { apiClient } from "./client";
import type {
	PolicyAnalyticsSummary,
	PolicyPaginationResponse,
	PolicyProfile,
	PolicyQueryParams,
} from "../types/policy";

export const policyApi = {
	async getChuctho(
		params?: PolicyQueryParams,
	): Promise<PolicyPaginationResponse<PolicyProfile>> {
		const res = await apiClient.get("/policies/chuctho", { params });
		return res.data;
	},

	async getHtxh(
		params?: PolicyQueryParams,
	): Promise<PolicyPaginationResponse<PolicyProfile>> {
		const res = await apiClient.get("/policies/htxh", { params });
		return res.data;
	},

	async toggleReceived(
		type: "chuctho" | "htxh",
		id: string,
		received: boolean,
	): Promise<PolicyProfile> {
		const res = await apiClient.patch(`/policies/${type}/${id}/toggle`, {
			received,
		});
		return res.data;
	},

	async getAnalytics(
		villageId?: string,
		calculationYear?: number,
	): Promise<PolicyAnalyticsSummary> {
		const res = await apiClient.get("/policies/analytics", {
			params: { villageId, calculationYear },
		});
		return res.data;
	},

	async importExcel(
		type: "chuctho" | "htxh",
		formData: FormData,
	): Promise<{ success: boolean; count: number }> {
		const res = await apiClient.post(`/policies/${type}/import`, formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		return res.data;
	},

	async exportExcel(
		type: "chuctho" | "htxh",
		params?: PolicyQueryParams,
	): Promise<Blob> {
		const res = await apiClient.get(`/policies/${type}/export`, {
			params,
			responseType: "blob",
		});
		return res.data;
	},
};
