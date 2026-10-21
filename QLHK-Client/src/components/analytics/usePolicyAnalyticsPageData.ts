import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../AppContext";
import { policyApi } from "../../api/policyApi";
import {
	analyticsApi,
	type AnalyticsByVillageResponse,
	type AnalyticsOverviewData,
} from "../../api/analyticsApi";
import { useAnalyticsFluctuation } from "../../hooks/useAnalyticsFluctuation";
import {
	buildPolicyDashboardData,
	VILLAGE_POLICY_PROFILES,
} from "./policyAnalyticsData";

export function usePolicyAnalyticsPageData() {
	const {
		villages = [],
		selectedVillageId,
		setSelectedVillageId,
		user,
	} = useApp();
	const isAdmin = user?.role === "admin";
	const currentYear = new Date().getFullYear();
	const [selectedYear, setSelectedYear] = useState<number>(() => {
		const saved = localStorage.getItem("globalCalculationYear");
		if (saved) {
			const parsed = parseInt(saved, 10);
			if (!isNaN(parsed) && parsed >= 1900 && parsed <= 2100) return parsed;
		}
		return currentYear;
	});

	const [selectedVillage, setSelectedVillage] = useState<string>(
		!isAdmin && user?.village_id ? user.village_id : selectedVillageId || "",
	);

	const [loading, setLoading] = useState(false);
	const [overview, setOverview] = useState<AnalyticsOverviewData | null>(null);
	const [breakdown, setBreakdown] = useState<AnalyticsByVillageResponse | null>(null);
	const [demographics, setDemographics] = useState<{
		gender: { male: number; female: number };
		ethnicity: { kinh: number; other: number };
	}>({
		gender: { male: 0, female: 0 },
		ethnicity: { kinh: 0, other: 0 },
	});

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			let ovData: AnalyticsOverviewData | null = null;
			let bvData: AnalyticsByVillageResponse | null = null;
			try {
				const pSummary = await policyApi.getAnalytics(
					selectedVillage || undefined,
					selectedYear,
				);
				if (pSummary) {
					ovData = {
						chuctho: {
							total: pSummary.chuctho.total,
							received: pSummary.chuctho.received,
							unreceived: pSummary.chuctho.unreceived,
							completionRate: pSummary.chuctho.completionRate,
							ageStructure: (pSummary as any).chuctho?.ageStructure ?? {
								age60: 0, age65: 0, age70: 0, age75: 0, age80: 0,
								age85: 0, age90: 0, age95: 0, age100: 0, age_over_100: 0,
							},
						},
						htxh: {
							total: pSummary.htxh.total,
							received: pSummary.htxh.received,
							unreceived: pSummary.htxh.unreceived,
							completionRate: pSummary.htxh.completionRate,
							categories: (pSummary as any).htxh?.categories ?? {
								age75plus: 0, age70to74poor: 0, bao_tro: 0,
								huu_tri: 0, huu_tuat_bao_hiem: 0, nguoi_co_cong: 0,
							},
						},
					};
					if (pSummary.villageBreakdown) {
						bvData = {
							success: true,
							data: pSummary.villageBreakdown.map((vb) => ({
								village_id: vb.village_id,
								village_name: vb.village_name,
								chuctho: {
									total: vb.chuctho_total,
									received: vb.chuctho_received,
									unreceived: vb.chuctho_total - vb.chuctho_received,
									completionRate:
										vb.chuctho_total > 0
											? (vb.chuctho_received / vb.chuctho_total) * 100
											: 0,
								},
								htxh: {
									total: vb.htxh_total,
									received: vb.htxh_received,
									unreceived: vb.htxh_total - vb.htxh_received,
									completionRate:
										vb.htxh_total > 0
											? (vb.htxh_received / vb.htxh_total) * 100
											: 0,
								},
							})),
							summary: {
								chucthoTotal: pSummary.chuctho.total,
								chucthoReceived: pSummary.chuctho.received,
								chucthoUnreceived: pSummary.chuctho.unreceived,
								chucthoCompletionRate: pSummary.chuctho.completionRate,
								htxhTotal: pSummary.htxh.total,
								htxhReceived: pSummary.htxh.received,
								htxhUnreceived: pSummary.htxh.unreceived,
								htxhCompletionRate: pSummary.htxh.completionRate,
							},
						};
					}
				}
			} catch {
				const [o, b] = await Promise.all([
					analyticsApi.getOverview({
						villageId: selectedVillage || undefined,
						calculationYear: selectedYear,
					}),
					analyticsApi.getByVillage({
						calculationYear: selectedYear,
					}),
				]);
				ovData = o;
				bvData = b;
			}

			setOverview(ovData);
			setBreakdown(bvData);

			if (ovData?.demographics) {
				setDemographics(ovData.demographics);
			} else {
				setDemographics({
					gender: { male: 0, female: 0 },
					ethnicity: { kinh: 0, other: 0 },
				});
			}
		} catch (err) {
			console.error("Analytics load error:", err);
		} finally {
			setLoading(false);
		}
	}, [selectedYear, selectedVillage]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const policyData = useMemo(
		() =>
			buildPolicyDashboardData(
				overview,
				selectedVillage || selectedVillageId,
				selectedYear,
			),
		[overview, selectedVillage, selectedVillageId, selectedYear],
	);

	const metricsMap = useMemo(() => {
		if (!overview) return null;
		const totalCt = overview?.chuctho?.total ?? 0;
		const ctReceived = overview?.chuctho?.received ?? 0;
		const ctUnreceived = overview?.chuctho?.unreceived ?? 0;
		const totalHtxh = overview?.htxh?.total ?? 0;
		const htxhReceived = overview?.htxh?.received ?? 0;
		const htxhUnreceived = overview?.htxh?.unreceived ?? 0;
		const totalAll = totalCt + totalHtxh;
		const totalReceived = ctReceived + htxhReceived;
		const totalUnreceived = ctUnreceived + htxhUnreceived;

		return {
			total_all: totalAll,
			total_received: totalReceived,
			total_unreceived: totalUnreceived,
			progress_count: totalReceived,
			gender_male: demographics.gender.male,
			gender_female: demographics.gender.female,
			ethnicity_kinh: demographics.ethnicity.kinh,
			ethnicity_other: demographics.ethnicity.other,
			ct_age60: overview.chuctho?.ageStructure?.age60 ?? 0,
			ct_age65: overview.chuctho?.ageStructure?.age65 ?? 0,
			ct_age70: overview.chuctho?.ageStructure?.age70 ?? 0,
			ct_age75: overview.chuctho?.ageStructure?.age75 ?? 0,
			ct_age80: overview.chuctho?.ageStructure?.age80 ?? 0,
			ct_age85: overview.chuctho?.ageStructure?.age85 ?? 0,
			ct_age90: overview.chuctho?.ageStructure?.age90 ?? 0,
			ct_age95: overview.chuctho?.ageStructure?.age95 ?? 0,
			ct_age100: overview.chuctho?.ageStructure?.age100 ?? 0,
			ct_age_over_100: overview.chuctho?.ageStructure?.age_over_100 ?? 0,
			htxh_age75plus: overview.htxh?.categories?.age75plus ?? 0,
			htxh_age70to74poor: overview.htxh?.categories?.age70to74poor ?? 0,
			htxh_bao_tro: overview.htxh?.categories?.bao_tro ?? 0,
			htxh_huu_tri: overview.htxh?.categories?.huu_tri ?? 0,
			htxh_huu_tuat_bao_hiem: overview.htxh?.categories?.huu_tuat_bao_hiem ?? 0,
			htxh_nguoi_co_cong: overview.htxh?.categories?.nguoi_co_cong ?? 0,
		};
	}, [overview, demographics]);

	const { clearTrends } = useAnalyticsFluctuation(
		selectedVillage,
		selectedYear,
		metricsMap,
		!loading && overview !== null,
	);

	const tableVillageRows = useMemo(() => {
		if (breakdown?.data && breakdown.data.length > 0) {
			return breakdown.data.map((row, idx) => {
				const total = (row.chuctho?.total ?? 0) + (row.htxh?.total ?? 0);
				const received = (row.chuctho?.received ?? 0) + (row.htxh?.received ?? 0);
				const unreceived = (row.chuctho?.unreceived ?? 0) + (row.htxh?.unreceived ?? 0);
				const rate =
					total > 0 ? Number(((received / total) * 100).toFixed(1)) : 0;
				return {
					stt: idx + 1,
					id: row.village_id,
					name: row.village_name,
					total,
					chucTho: row.chuctho?.total ?? 0,
					htxh: row.htxh?.total ?? 0,
					received,
					unreceived,
					rate,
				};
			});
		}

		return VILLAGE_POLICY_PROFILES.filter((v) => v.id !== "all").map(
			(v, idx) => ({
				stt: idx + 1,
				id: v.id,
				name: v.name,
				total: v.totalBeneficiaries,
				chucTho: v.chucThoCount,
				htxh: v.htxhCount,
				received: v.receivedCount,
				unreceived: v.unreceivedCount,
				rate: v.receivedPct,
			}),
		);
	}, [breakdown]);

	const tableSummary = useMemo(() => {
		if (breakdown?.summary) {
			const total =
				breakdown.summary.chucthoTotal + breakdown.summary.htxhTotal;
			const received =
				breakdown.summary.chucthoReceived + breakdown.summary.htxhReceived;
			const unreceived =
				breakdown.summary.chucthoUnreceived + breakdown.summary.htxhUnreceived;
			const rate =
				total > 0 ? Number(((received / total) * 100).toFixed(1)) : 94.8;
			return {
				total,
				chucTho: breakdown.summary.chucthoTotal,
				htxh: breakdown.summary.htxhTotal,
				received,
				unreceived,
				rate,
			};
		}
		const allProfile = VILLAGE_POLICY_PROFILES[0];
		return {
			total: allProfile.totalBeneficiaries,
			chucTho: allProfile.chucThoCount,
			htxh: allProfile.htxhCount,
			received: allProfile.receivedCount,
			unreceived: allProfile.unreceivedCount,
			rate: allProfile.receivedPct,
		};
	}, [breakdown]);

	const currentVillageObj = villages.find(
		(v) => v.id === (selectedVillage || selectedVillageId),
	);
	const userVillage = villages.find((v) => v.id === user?.village_id);
	const userVillageName = userVillage
		? userVillage.name
		: user?.village_id
			? "Thôn phụ trách"
			: "Toàn xã";

	const currentVillageLabel = currentVillageObj
		? currentVillageObj.name
		: !isAdmin && userVillageName
			? userVillageName
			: "Toàn xã Đăk Hà";

	return {
		isAdmin,
		villages,
		userVillageName,
		currentVillageLabel,
		selectedVillage,
		selectedYear,
		setSelectedYear,
		currentYear,
		loading,
		policyData,
		tableVillageRows,
		tableSummary,
		clearTrends,
		fetchData,
	};
}
