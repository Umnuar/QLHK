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
		receivedPct: number;
		unreceived: number;
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

export const formatNumber = (n: number) => n.toLocaleString("vi-VN");

export const formatPct = (n: number, digits = 1) =>
	digits === 0 ? `${Math.round(n)}` : n.toFixed(digits).replace(".", ",");

export const formatCurrency = (n: number) =>
	`${n.toLocaleString("vi-VN")} VNĐ`;

export function hareNiemeyerRound<
	T extends { id: string; label: string; count: number; color: string; note?: string },
>(items: T[], _forcedTotal?: number): (T & { pct: number })[] {
	if (!items || items.length === 0) return [];
	const sumCount = items.reduce((acc, it) => acc + (it.count || 0), 0);
	if (sumCount === 0) {
		const eq = 100 / items.length;
		return items.map((it) => ({ ...it, pct: Math.round(eq * 10) / 10 }));
	}

	const rawPcts = items.map((it) => ((it.count || 0) / sumCount) * 100);
	const floors = rawPcts.map((p) => Math.floor(p * 10) / 10);
	const remainders = rawPcts.map((p, idx) => ({ idx, rem: p - floors[idx] }));
	const floorSum = floors.reduce((acc, v) => acc + v, 0);
	let missingTenths = Math.round((100 - floorSum) * 10);

	remainders.sort((a, b) => b.rem - a.rem);
	const allocated = [...floors];
	let i = 0;
	while (missingTenths > 0 && i < allocated.length) {
		allocated[remainders[i].idx] = Math.round((allocated[remainders[i].idx] + 0.1) * 10) / 10;
		missingTenths--;
		i++;
	}

	return items.map((it, idx) => ({ ...it, pct: allocated[idx] }));
}
