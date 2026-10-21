import type { AnalyticsOverviewData } from "../../api/analyticsApi";
import {
	type GenderRatio,
	type PolicyDashboardData,
	type PolicyExecutionData,
	type Segment,
	type VillagePolicyProfile,
	hareNiemeyerRound,
} from "./policyAnalyticsTypes";
import { DEFAULT_VILLAGE_ID, VILLAGE_POLICY_PROFILES } from "./policyAnalyticsProfiles";

export * from "./policyAnalyticsTypes";
export * from "./policyAnalyticsProfiles";

export const COLORS = {
	teal: "#0d9488",
	sky: "#0284c7",
	amber: "#d97706",
	purple: "#7c3aed",
	rose: "#e11d48",
	emerald: "#059669",
	indigo: "#4f46e5",
	slate: "#64748b",
} as const;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildPolicyDashboardData(
	apiOverview: AnalyticsOverviewData | null | undefined,
	villageId: string = DEFAULT_VILLAGE_ID,
	year: number = new Date().getFullYear(),
): PolicyDashboardData {
	const defaultProfile =
		VILLAGE_POLICY_PROFILES.find((v) => v.id === villageId) ||
		VILLAGE_POLICY_PROFILES.find((v) => v.name.toLowerCase().includes(villageId.toLowerCase())) ||
		VILLAGE_POLICY_PROFILES[0];

	const totalCt = apiOverview?.chuctho?.total || defaultProfile.chucThoCount;
	const ctReceived = apiOverview?.chuctho?.received ?? (villageId === "all" ? 410 : defaultProfile.receivedCount);
	const totalHtxh = apiOverview?.htxh?.total || defaultProfile.htxhCount;
	const htxhReceived = apiOverview?.htxh?.received ?? (villageId === "all" ? 972 : (defaultProfile.receivedCount - ctReceived));

	const totalBeneficiaries = apiOverview ? totalCt + totalHtxh : defaultProfile.totalBeneficiaries;
	const receivedCount = apiOverview ? ctReceived + htxhReceived : defaultProfile.receivedCount;
	const unreceivedCount = Math.max(0, totalBeneficiaries - receivedCount);
	const receivedPct = totalBeneficiaries > 0 ? round1((receivedCount / totalBeneficiaries) * 100) : defaultProfile.receivedPct;

	const village: VillagePolicyProfile = {
		...defaultProfile,
		totalBeneficiaries,
		receivedCount,
		unreceivedCount,
		receivedPct,
		chucThoCount: totalCt,
		htxhCount: totalHtxh,
	};

	const ageMap = apiOverview?.chuctho?.ageStructure;
	const hasAgeData = ageMap && Object.values(ageMap).some((v) => v > 0);

	let rawCt: { id: string; label: string; count: number; color: string }[];
	if (hasAgeData && ageMap) {
		rawCt = [
			{ id: "age70", label: "70 tuổi", count: ageMap.age70 || 0, color: COLORS.teal },
			{ id: "age75", label: "75 tuổi", count: ageMap.age75 || 0, color: COLORS.sky },
			{ id: "age80", label: "80 tuổi", count: ageMap.age80 || 0, color: COLORS.amber },
			{ id: "age85", label: "85 tuổi", count: ageMap.age85 || 0, color: COLORS.purple },
			{ id: "age90", label: "90 tuổi", count: ageMap.age90 || 0, color: COLORS.rose },
			{ id: "age95", label: "95 tuổi", count: ageMap.age95 || 0, color: COLORS.emerald },
			{ id: "age100", label: "100 tuổi", count: ageMap.age100 || 0, color: COLORS.indigo },
			{ id: "age_over_100", label: "Trên 100 tuổi", count: ageMap.age_over_100 || 0, color: COLORS.slate },
		];
	} else {
		const scale = totalCt / 428;
		rawCt = [
			{ id: "age70", label: "70 tuổi", count: Math.round(142 * scale), color: COLORS.teal },
			{ id: "age75", label: "75 tuổi", count: Math.round(110 * scale), color: COLORS.sky },
			{ id: "age80", label: "80 tuổi", count: Math.round(78 * scale), color: COLORS.amber },
			{ id: "age85", label: "85 tuổi", count: Math.round(60 * scale), color: COLORS.purple },
			{ id: "age90", label: "90 tuổi", count: Math.round(24 * scale), color: COLORS.rose },
			{ id: "age95", label: "95 tuổi", count: Math.round(10 * scale), color: COLORS.emerald },
			{ id: "age100", label: "100 tuổi", count: Math.max(1, Math.round(3 * scale)), color: COLORS.indigo },
			{ id: "age_over_100", label: "Trên 100 tuổi", count: Math.max(1, Math.round(1 * scale)), color: COLORS.slate },
		];
	}

	const chucThoSegments = hareNiemeyerRound(rawCt, totalCt);
	const daiThoCount = chucThoSegments
		.filter((s) => ["age90", "age95", "age100", "age_over_100"].includes(s.id))
		.reduce((sum, s) => sum + s.count, 0);

	const catMap = apiOverview?.htxh?.categories;
	const hasCatData = catMap && Object.values(catMap).some((v) => v > 0);

	let rawHtxh: { id: string; label: string; count: number; color: string }[];
	if (hasCatData && catMap) {
		rawHtxh = [
			{ id: "age75plus", label: "Đủ 75 tuổi trở lên không lương hưu", count: catMap.age75plus || 0, color: COLORS.teal },
			{ id: "bao_tro", label: "Người khuyết tật & Bảo trợ xã hội", count: catMap.bao_tro || 0, color: COLORS.sky },
			{ id: "nguoi_co_cong", label: "Người có công cách mạng", count: catMap.nguoi_co_cong || 0, color: COLORS.amber },
			{ id: "age70to74poor", label: "Hộ nghèo/cận nghèo 70 - 74 tuổi", count: catMap.age70to74poor || 0, color: COLORS.purple },
			{ id: "huu_tri", label: "Hưu trí / Tuất BHXH", count: (catMap.huu_tri || 0) + (catMap.huu_tuat_bao_hiem || 0), color: COLORS.rose },
		];
	} else {
		const scale = totalHtxh / 1030;
		rawHtxh = [
			{ id: "age75plus", label: "Đủ 75 tuổi trở lên không lương hưu", count: Math.round(420 * scale), color: COLORS.teal },
			{ id: "bao_tro", label: "Người khuyết tật & Bảo trợ xã hội", count: Math.round(280 * scale), color: COLORS.sky },
			{ id: "nguoi_co_cong", label: "Người có công cách mạng", count: Math.round(150 * scale), color: COLORS.amber },
			{ id: "age70to74poor", label: "Hộ nghèo/cận nghèo 70 - 74 tuổi", count: Math.round(110 * scale), color: COLORS.purple },
			{ id: "huu_tri", label: "Hưu trí / Tuất BHXH", count: Math.round(70 * scale), color: COLORS.rose },
		];
	}

	const htxhSegments = hareNiemeyerRound(rawHtxh, totalHtxh);

	const scalePop = totalBeneficiaries / 1458;
	const rawEthnic = [
		{ id: "kinh", label: "Kinh", count: Math.round(780 * scalePop), color: COLORS.sky },
		{ id: "ba-na", label: "Ba Na", count: Math.round(340 * scalePop), color: COLORS.amber },
		{ id: "xo-dang", label: "Xơ Đăng", count: Math.round(220 * scalePop), color: COLORS.teal },
		{ id: "gie-trieng", label: "Giẻ Triêng / Khác", count: Math.round(118 * scalePop), color: COLORS.purple },
	];
	const ethnicSegments = hareNiemeyerRound(rawEthnic, totalBeneficiaries);

	const maleCount = Math.round(620 * scalePop);
	const femaleCount = totalBeneficiaries - maleCount;
	const genderRatio: GenderRatio = {
		maleCount,
		malePct: totalBeneficiaries > 0 ? round1((maleCount / totalBeneficiaries) * 100) : 42.5,
		femaleCount,
		femalePct: totalBeneficiaries > 0 ? round1((femaleCount / totalBeneficiaries) * 100) : 57.5,
	};

	const ctHoiNghi = Math.round(390 * (totalCt / 428));
	const ctTaiNha = Math.round(20 * (totalCt / 428));
	const ctDelivered = ctHoiNghi + ctTaiNha;
	const ctPending = Math.max(0, totalCt - ctDelivered);
	const ctBudget = defaultProfile.disbursedAmount || 215000000;

	const htxhDelivered = Math.round(972 * (totalHtxh / 1030));
	const htxhPending = Math.max(0, totalHtxh - htxhDelivered);
	const htxhBudget = Math.round(576800000 * (totalHtxh / 1030));

	const totalDelivered = ctDelivered + htxhDelivered;
	const totalPending = ctPending + htxhPending;
	const overallDeliveryPct = totalBeneficiaries > 0 ? round1((totalDelivered / totalBeneficiaries) * 100) : 94.8;

	const policyExecution: PolicyExecutionData = {
		chucTho: {
			total: totalCt,
			hoiNghi: ctHoiNghi,
			taiNha: ctTaiNha,
			chuaNhan: ctPending,
			received: ctDelivered,
			receivedPct: totalCt > 0 ? round1((ctDelivered / totalCt) * 100) : 95.8,
			budget: ctBudget,
		},
		htxh: {
			total: totalHtxh,
			received: htxhDelivered,
			receivedPct: totalHtxh > 0 ? round1((htxhDelivered / totalHtxh) * 100) : 94.4,
			unreceived: htxhPending,
			unreceivedPct: totalHtxh > 0 ? round1((htxhPending / totalHtxh) * 100) : 5.6,
			budget: htxhBudget,
		},
		summary: {
			total: totalBeneficiaries,
			received: totalDelivered,
			unreceived: totalPending,
			receivedPct: overallDeliveryPct,
		},
	};

	return {
		village,
		year,
		chucThoSegments,
		chucThoTotal: totalCt,
		daiThoCount,
		htxhSegments,
		htxhTotal: totalHtxh,
		ethnicSegments,
		genderRatio,
		policyExecution,
		giftDelivery: {
			directDelivered: ctDelivered,
			pendingHomeDelivery: ctPending,
			disbursedAmount: ctBudget,
		},
		emergencyWelfare: {
			tetGiftCoverPct: 100,
			disadvantagedChildren: 45,
			bhytCoveragePct: 100,
		},
	};
}
