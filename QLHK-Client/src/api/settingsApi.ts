import { apiClient } from "./client";

export interface SystemTimeResponse {
	isoTime: string;
	timestamp: number;
	source: "internet" | "database" | "machine";
	sourceLabel: string;
	calculationYear: number;
	lastSyncedAt: string;
}

export const settingsApi = {
	getSystemTime: async (): Promise<SystemTimeResponse> => {
		const res = await apiClient.get<SystemTimeResponse>("/settings/time");
		return res.data;
	},
	syncSystemTime: async (): Promise<SystemTimeResponse> => {
		const res = await apiClient.post<SystemTimeResponse>("/settings/time/sync");
		return res.data;
	},
};
