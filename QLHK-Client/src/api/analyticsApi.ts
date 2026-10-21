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

export interface AgeGroupStats {
	under16: GenderStat;
	youth?: GenderStat;
	militaryAge: GenderStat;
	adult?: GenderStat;
	workingAge: GenderStat;
	over60: GenderStat;
	unknownAge?: GenderStat;
	legalWorkforce?: GenderStat;
}

export interface AnalyticsOverviewData {
	totalHouseholds?: number;
	totalCitizens?: number;
	averageHouseholdSize?: number;
	gender?: {
		male: GenderStat | any;
		female: GenderStat | any;
	};
	ethnicities?: DistributionStat[];
	religions?: DistributionStat[];
	ageGroups?: AgeGroupStats;
	military?: DistributionStat[];
	educations?: DistributionStat[];
	occupations?: DistributionStat[];
	success?: boolean;
	chuctho?: {
		total: number;
		received: number;
		unreceived: number;
		completionRate: number;
		ageStructure: {
			age60: number; age65: number; age70: number; age75: number; age80: number;
			age85: number; age90: number; age95: number; age100: number; age_over_100: number;
		};
	};
	htxh?: {
		total: number;
		received: number;
		unreceived: number;
		completionRate: number;
		categories: {
			age75plus: number; age70to74poor: number; bao_tro: number;
			huu_tri: number; huu_tuat_bao_hiem: number; nguoi_co_cong: number;
		};
	};
	demographics?: {
		gender: { male: number; female: number };
		ethnicity: { kinh: number; other: number };
	};
}

export interface VillageAnalyticsRow {
	village_id: string; village_name: string; village_code?: string;
	household_count?: number; citizen_count?: number; male_count?: number;
	female_count?: number; dtts_count?: number; dtts_percentage?: number;
	top_ethnicity?: string; top_religion?: string;
	chuctho?: { total: number; received: number; unreceived: number; completionRate: number; };
	htxh?: { total: number; received: number; unreceived: number; completionRate: number; };
}

export interface AnalyticsByVillageResponse {
	success: boolean;
	data: VillageAnalyticsRow[];
	summary: {
		chucthoTotal: number; chucthoReceived: number; chucthoUnreceived: number; chucthoCompletionRate: number;
		htxhTotal: number; htxhReceived: number; htxhUnreceived: number; htxhCompletionRate: number;
	};
}

export const analyticsApi = {
	async getOverview(param?: string | { villageId?: string; calculationYear?: number }): Promise<AnalyticsOverviewData> {
		const villageId = typeof param === "string" ? param : param?.villageId;
		const calculationYear = typeof param === "object" ? param?.calculationYear : undefined;

		let demoData: any = {};
		try {
			const res = await apiClient.get("/analytics/overview", {
				params: villageId ? { villageId } : undefined,
			});
			demoData = res.data?.data || res.data || {};
		} catch {}

		let policyData: any = {};
		try {
			const res = await apiClient.get("/policies/analytics", {
				params: { villageId, calculationYear },
			});
			policyData = res.data?.data || res.data || {};
		} catch {}

		const chuctho = policyData.chuctho || {};
		const htxh = policyData.htxh || {};
		const ms = chuctho.milestones || {};
		const cats = htxh.categories || {};

		return {
			...demoData,
			success: true,
			chuctho: {
				total: chuctho.total || 0,
				received: chuctho.received || 0,
				unreceived: chuctho.unreceived || 0,
				completionRate: chuctho.completionRate || 0,
				ageStructure: {
					age60: ms["60"] || ms.age60 || 0, age65: ms["65"] || ms.age65 || 0,
					age70: ms["70"] || ms.age70 || 0, age75: ms["75"] || ms.age75 || 0,
					age80: ms["80"] || ms.age80 || 0, age85: ms["85"] || ms.age85 || 0,
					age90: ms["90"] || ms.age90 || 0, age95: ms["95"] || ms.age95 || 0,
					age100: ms["100"] || ms.age100 || 0, age_over_100: ms[">100"] || ms.age_over_100 || 0,
				},
			},
			htxh: {
				total: htxh.total || 0,
				received: htxh.received || 0,
				unreceived: htxh.unreceived || 0,
				completionRate: htxh.completionRate || 0,
				categories: {
					age75plus: cats.age75plus || 0, age70to74poor: cats.age70to74poor || 0,
					bao_tro: cats.baoTro || cats.bao_tro || 0, huu_tri: cats.huuTri || cats.huu_tri || 0,
					huu_tuat_bao_hiem: cats.huuTuatBaoHiem || cats.huu_tuat_bao_hiem || 0,
					nguoi_co_cong: cats.nguoiCoCong || cats.nguoi_co_cong || 0,
				},
			},
			demographics: policyData.demographics || {
				gender: {
					male: typeof demoData.gender?.male === "object" ? demoData.gender.male.count : demoData.gender?.male || 0,
					female: typeof demoData.gender?.female === "object" ? demoData.gender.female.count : demoData.gender?.female || 0,
				},
				ethnicity: {
					kinh: demoData.ethnicities?.find((e: any) => e.name === "Kinh")?.count || 0,
					other: demoData.ethnicities?.filter((e: any) => e.name !== "Kinh").reduce((s: number, e: any) => s + e.count, 0) || 0,
				},
			},
		};
	},

	async getByVillage(params?: { calculationYear?: number }): Promise<any> {
		let demoRows: any[] = [];
		try {
			const res = await apiClient.get("/analytics/by-village");
			demoRows = res.data?.data || res.data || [];
		} catch {}

		let policyBreakdown: any[] = [];
		let cTot = 0;
		let cRec = 0;
		let hTot = 0;
		let hRec = 0;
		try {
			const res = await apiClient.get("/policies/analytics", { params });
			const d = res.data?.data || res.data || {};
			policyBreakdown = d.villageBreakdown || [];
			cTot = d.chuctho?.total || 0;
			cRec = d.chuctho?.received || 0;
			hTot = d.htxh?.total || 0;
			hRec = d.htxh?.received || 0;
		} catch {}

		const mergedRows: any = (demoRows.length > 0 ? demoRows : policyBreakdown).map((row: any) => {
			const p = policyBreakdown.find((item: any) => item.village_id === row.village_id) || {};
			const cT = p.chuctho_total || 0;
			const cR = p.chuctho_received || 0;
			const hT = p.htxh_total || 0;
			const hR = p.htxh_received || 0;
			return {
				...row,
				chuctho: {
					total: cT,
					received: cR,
					unreceived: cT - cR,
					completionRate: cT ? Math.round((cR / cT) * 100) : 0,
				},
				htxh: {
					total: hT,
					received: hR,
					unreceived: hT - hR,
					completionRate: hT ? Math.round((hR / hT) * 100) : 0,
				},
			};
		});

		mergedRows.success = true;
		mergedRows.data = mergedRows;
		mergedRows.summary = {
			chucthoTotal: cTot,
			chucthoReceived: cRec,
			chucthoUnreceived: cTot - cRec,
			chucthoCompletionRate: cTot ? Math.round((cRec / cTot) * 100) : 0,
			htxhTotal: hTot,
			htxhReceived: hRec,
			htxhUnreceived: hTot - hRec,
			htxhCompletionRate: hTot ? Math.round((hRec / hTot) * 100) : 0,
		};

		return mergedRows;
	},
};
