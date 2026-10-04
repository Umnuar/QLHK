import { apiClient } from "./client";

export interface GenderStat {
	count: number;
	percentage: number;
}

export interface DistributionStat {
	name: string;
	count: number;
	percentage: number;
}

export interface AnalyticsOverviewData {
	totalHouseholds: number;
	totalCitizens: number;
	averageHouseholdSize: number;
	gender: {
		male: GenderStat;
		female: GenderStat;
	};
	ethnicities: DistributionStat[];
	religions: DistributionStat[];
}

export interface VillageAnalyticsRow {
	village_id: string;
	village_name: string;
	village_code: string;
	household_count: number;
	citizen_count: number;
	male_count: number;
	female_count: number;
	dtts_count: number;
	dtts_percentage: number;
	top_ethnicity: string;
	top_religion: string;
}

export const analyticsApi = {
	/**
	 * Báo cáo thống kê tổng quan (toàn xã hoặc theo thôn)
	 */
	async getOverview(villageId?: string): Promise<AnalyticsOverviewData> {
		const res = await apiClient.get("/analytics/overview", {
			params: villageId ? { villageId } : undefined,
		});
		return res.data?.data || res.data;
	},

	/**
	 * Bảng thống kê so sánh giữa các thôn
	 */
	async getByVillage(): Promise<VillageAnalyticsRow[]> {
		const res = await apiClient.get("/analytics/by-village");
		return res.data?.data || res.data;
	},
};
