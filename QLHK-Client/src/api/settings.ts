import { apiClient } from "./client";

export interface SystemTimeResponse {
	isoTime: string;
	timestamp: number;
	source: "internet" | "database" | "machine";
	sourceLabel: string;
	calculationYear: number;
	lastSyncedAt: string;
	offsetMs?: number;
}

export const settingsApi = {
	async getSettings(): Promise<Record<string, string>> {
		try {
			const res = await apiClient.get("/settings");
			return res.data?.data || res.data || {};
		} catch {
			return {};
		}
	},

	async updateSettings(settings: Record<string, string>): Promise<void> {
		await apiClient.put("/settings", settings);
	},

	async getSystemTime(): Promise<SystemTimeResponse> {
		const res = await apiClient.get<SystemTimeResponse>("/settings/time");
		return res.data;
	},

	async syncSystemTime(): Promise<SystemTimeResponse> {
		const res = await apiClient.post<SystemTimeResponse>("/settings/time/sync");
		return res.data;
	},
};

export default settingsApi;
