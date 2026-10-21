import { apiClient } from "./apiClient";

export interface ImportPayload {
	type: "chuctho" | "htxh";
	villageId?: string;
	calculationYear?: number;
	profiles: any[];
	fileName?: string;
}

export interface ImportResponse {
	success: boolean;
	inserted: number;
	updated: number;
	failed?: number;
	errorDetails?: any[];
	message?: string;
}

export const excelApi = {
	async importProfiles(payload: ImportPayload): Promise<ImportResponse> {
		const res = await apiClient.post("/policies/excel/import", payload);
		return res.data;
	},

	async downloadTemplate(type: "chuctho" | "htxh"): Promise<Blob> {
		const res = await apiClient.get(`/policies/excel/template?type=${type}&format=file`, {
			responseType: "blob",
		});
		return res.data;
	},
};
