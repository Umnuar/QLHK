import type { AnalyticsOverviewData } from "@/api/analyticsApi";

export type Segment = {
	id: string;
	label: string;
	pct: number;
	count: number;
	color: string;
	note?: string;
};

export type VillagePolicyProfile = {
	id: string;
	name: string;
	totalBeneficiaries: number;
	receivedCount: number;
	unreceivedCount: number;
	receivedPct: number;
	chucThoCount: number;
	htxhCount: number;
	dttsPct: number;
	disbursedAmount: number;
};

export const COLORS = {
	emerald: "#059669",
	blue: "#2563eb",
	teal: "#0d9488",
	sky: "#0284c7",
	amber: "#d97706",
	purple: "#7c3aed",
	rose: "#e11d48",
	orange: "#ea580c",
	indigo: "#4f46e5",
	slate: "#64748b",
} as const;

export const DEFAULT_VILLAGE_ID = "all";

export const VILLAGE_POLICY_PROFILES: VillagePolicyProfile[] = [
	{
		id: "all",
		name: "Toàn xã Đăk Hà (Toàn bộ 11 thôn)",
		totalBeneficiaries: 1458,
		receivedCount: 1382,
		unreceivedCount: 76,
		receivedPct: 94.8,
		chucThoCount: 428,
		htxhCount: 1030,
		dttsPct: 46.5,
		disbursedAmount: 215000000,
	},
	{
		id: "thon-1",
		name: "Thôn 1",
		totalBeneficiaries: 142,
		receivedCount: 136,
		unreceivedCount: 6,
		receivedPct: 95.8,
		chucThoCount: 42,
		htxhCount: 100,
		dttsPct: 32.4,
		disbursedAmount: 21000000,
	},
	{
		id: "thon-2",
		name: "Thôn 2",
		totalBeneficiaries: 138,
		receivedCount: 131,
		unreceivedCount: 7,
		receivedPct: 94.9,
		chucThoCount: 40,
		htxhCount: 98,
		dttsPct: 35.5,
		disbursedAmount: 20000000,
	},
	{
		id: "thon-3",
		name: "Thôn 3",
		totalBeneficiaries: 125,
		receivedCount: 120,
		unreceivedCount: 5,
		receivedPct: 96.0,
		chucThoCount: 38,
		htxhCount: 87,
		dttsPct: 38.0,
		disbursedAmount: 19000000,
	},
	{
		id: "thon-4",
		name: "Thôn 4",
		totalBeneficiaries: 130,
		receivedCount: 123,
		unreceivedCount: 7,
		receivedPct: 94.6,
		chucThoCount: 39,
		htxhCount: 91,
		dttsPct: 40.2,
		disbursedAmount: 19500000,
	},
	{
		id: "thon-5",
		name: "Thôn 5",
		totalBeneficiaries: 118,
		receivedCount: 111,
		unreceivedCount: 7,
		receivedPct: 94.1,
		chucThoCount: 35,
		htxhCount: 83,
		dttsPct: 42.1,
		disbursedAmount: 17500000,
	},
	{
		id: "kon-hring",
		name: "Thôn Kon Hring",
		totalBeneficiaries: 165,
		receivedCount: 156,
		unreceivedCount: 9,
		receivedPct: 94.5,
		chucThoCount: 48,
		htxhCount: 117,
		dttsPct: 78.5,
		disbursedAmount: 24000000,
	},
	{
		id: "kon-du",
		name: "Thôn Kon Du",
		totalBeneficiaries: 140,
		receivedCount: 132,
		unreceivedCount: 8,
		receivedPct: 94.3,
		chucThoCount: 41,
		htxhCount: 99,
		dttsPct: 72.8,
		disbursedAmount: 20500000,
	},
	{
		id: "dak-xe",
		name: "Thôn Đăk Xé",
		totalBeneficiaries: 135,
		receivedCount: 128,
		unreceivedCount: 7,
		receivedPct: 94.8,
		chucThoCount: 39,
		htxhCount: 96,
		dttsPct: 65.4,
		disbursedAmount: 19500000,
	},
	{
		id: "kon-dao-yop",
		name: "Thôn Kon Đao Yôp",
		totalBeneficiaries: 122,
		receivedCount: 116,
		unreceivedCount: 6,
		receivedPct: 95.1,
		chucThoCount: 36,
		htxhCount: 86,
		dttsPct: 84.2,
		disbursedAmount: 18000000,
	},
	{
		id: "kon-trang-long-loi",
		name: "Thôn Kon Trang Long Loi",
		totalBeneficiaries: 120,
		receivedCount: 114,
		unreceivedCount: 6,
		receivedPct: 95.0,
		chucThoCount: 35,
		htxhCount: 85,
		dttsPct: 69.5,
		disbursedAmount: 17500000,
	},
	{
		id: "kon-hnong-bach",
		name: "Làng Kon Hnông Bách",
		totalBeneficiaries: 123,
		receivedCount: 115,
		unreceivedCount: 8,
		receivedPct: 93.5,
		chucThoCount: 35,
		htxhCount: 88,
		dttsPct: 88.0,
		disbursedAmount: 18500000,
	},
];

export type GenderRatio = {
	maleCount: number;
	malePct: number;
	femaleCount: number;
	femalePct: number;
};

export type PolicyExecutionData = {
	chucTho: {
		total: number;
		hoiNghi: number;
		taiNha: number;
		chuaNhan: number;
		received: number;
		receivedPct: number;
		budget: number;
	};
	htxh: {
		total: number;
		received: number;
		receivedPct: number;
		unreceived: number;
		unreceivedPct: number;
		budget: number;
	};
	summary: {
		total: number;
		received: number;
		unreceived: number;
		receivedPct: number;
	};
};

export type PolicyDashboardData = {
	village: VillagePolicyProfile;
	year: number;
	chucThoSegments: Segment[];
	chucThoTotal: number;
	daiThoCount: number;
	htxhSegments: Segment[];
	htxhTotal: number;
	ethnicSegments: Segment[];
	genderRatio: GenderRatio;
	policyExecution: PolicyExecutionData;
	giftDelivery: {
		directDelivered: number;
		pendingHomeDelivery: number;
		disbursedAmount: number;
	};
	emergencyWelfare: {
		tetGiftCoverPct: number;
		disadvantagedChildren: number;
		bhytCoveragePct: number;
	};
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function hareNiemeyerRound<
	T extends { id: string; label: string; count: number; color: string; note?: string },
>(
	items: T[],
	_forcedTotal?: number,
): (T & { pct: number })[] {
	if (!items || items.length === 0) {
		return [];
	}

	const sumCounts = items.reduce(
		(sum, item) => sum + (Math.max(0, Number(item.count)) || 0),
		0,
	);
	if (sumCounts <= 0) {
		return items.map((item) => ({ ...item, pct: 0 }));
	}

	const tenths = 1000;
	const quotas = items.map((item, idx) => {
		const count = Math.max(0, Number(item.count)) || 0;
		const exact = (count / sumCounts) * tenths;
		const floor = Math.floor(exact);
		const remainder = exact - floor;
		return { idx, floor, remainder };
	});

	const allocated = quotas.reduce((sum, q) => sum + q.floor, 0);
	let surplus = Math.max(0, tenths - allocated);

	quotas.sort((a, b) => b.remainder - a.remainder || a.idx - b.idx);
	for (let i = 0; i < quotas.length && surplus > 0; i++) {
		quotas[i].floor += 1;
		surplus -= 1;
	}

	quotas.sort((a, b) => a.idx - b.idx);

	return items.map((item, idx) => ({
		...item,
		pct: Number((quotas[idx].floor / 10).toFixed(1)),
	}));
}

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
			{ id: "age60", label: "60 tuổi", count: ageMap.age60 || 0, color: COLORS.emerald },
			{ id: "age65", label: "65 tuổi", count: ageMap.age65 || 0, color: COLORS.blue },
			{ id: "age70", label: "70 tuổi", count: ageMap.age70 || 0, color: COLORS.teal },
			{ id: "age75", label: "75 tuổi", count: ageMap.age75 || 0, color: COLORS.sky },
			{ id: "age80", label: "80 tuổi", count: ageMap.age80 || 0, color: COLORS.amber },
			{ id: "age85", label: "85 tuổi", count: ageMap.age85 || 0, color: COLORS.purple },
			{ id: "age90", label: "90 tuổi", count: ageMap.age90 || 0, color: COLORS.rose },
			{ id: "age95", label: "95 tuổi", count: ageMap.age95 || 0, color: COLORS.orange },
			{ id: "age100", label: "100 tuổi", count: ageMap.age100 || 0, color: COLORS.indigo },
			{ id: "age_over_100", label: "Trên 100 tuổi", count: ageMap.age_over_100 || 0, color: COLORS.slate },
		];
	} else {
		const scale = totalCt / 428;
		rawCt = [
			{ id: "age60", label: "60 tuổi", count: Math.round(90 * scale), color: COLORS.emerald },
			{ id: "age65", label: "65 tuổi", count: Math.round(85 * scale), color: COLORS.blue },
			{ id: "age70", label: "70 tuổi", count: Math.round(75 * scale), color: COLORS.teal },
			{ id: "age75", label: "75 tuổi", count: Math.round(65 * scale), color: COLORS.sky },
			{ id: "age80", label: "80 tuổi", count: Math.round(45 * scale), color: COLORS.amber },
			{ id: "age85", label: "85 tuổi", count: Math.round(35 * scale), color: COLORS.purple },
			{ id: "age90", label: "90 tuổi", count: Math.round(18 * scale), color: COLORS.rose },
			{ id: "age95", label: "95 tuổi", count: Math.round(10 * scale), color: COLORS.orange },
			{ id: "age100", label: "100 tuổi", count: Math.max(1, Math.round(3 * scale)), color: COLORS.indigo },
			{ id: "age_over_100", label: "Trên 100 tuổi", count: Math.max(1, Math.round(2 * scale)), color: COLORS.slate },
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

export const formatNumber = (n: number) => n.toLocaleString("vi-VN");

export const formatPct = (n: number, digits = 1) =>
	digits === 0 ? `${Math.round(n)}` : n.toFixed(digits).replace(".", ",");

export const formatCurrency = (n: number) =>
	`${n.toLocaleString("vi-VN")} VNĐ`;
