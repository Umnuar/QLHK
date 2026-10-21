import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/AppContext";
import { policyApi } from "@/api/policyApi";
import { STAT_ACCENTS } from "@/components/analytics/AnalyticsWidgets";
import {
	buildPolicyDashboardData,
	formatNumber,
	formatPct,
} from "@/components/analytics/policyAnalyticsData";
import { PolicyKpiRow } from "../components/analytics/PolicyKpiRow";
import { PolicyDistributionCards } from "../components/analytics/PolicyDistributionCards";
import { PolicyVillageTable, type VillageTableRow, type TableSummary } from "../components/analytics/PolicyVillageTable";
import { PolicyAnalyticsHeader } from "@/components/analytics/PolicyAnalyticsHeader";

export const PolicyAnalyticsPage: React.FC = () => {
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

	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(false);

	const loadAnalytics = useCallback(async () => {
		setLoading(true);
		try {
			const res = await policyApi.getAnalytics(
				selectedVillageId || undefined,
				selectedYear,
			);
			setData(res);
			setLoading(false);
		} catch (err) {
			console.error("Policy analytics error:", err);
			setLoading(false);
		}
	}, [selectedVillageId, selectedYear]);

	useEffect(() => {
		loadAnalytics();
	}, [loadAnalytics]);

	const policyData = useMemo(() => {
		const overviewData = data
			? {
					chuctho: {
						total: data.chuctho?.total ?? 0,
						received: data.chuctho?.received ?? 0,
						unreceived: data.chuctho?.unreceived ?? 0,
						completionRate: data.chuctho?.completionRate ?? 0,
						ageStructure: data.chuctho?.ageStructure ?? {
							age60: 0, age65: 0, age70: 0, age75: 0, age80: 0,
							age85: 0, age90: 0, age95: 0, age100: 0, age_over_100: 0,
						},
					},
					htxh: {
						total: data.htxh?.total ?? 0,
						received: data.htxh?.received ?? 0,
						unreceived: data.htxh?.unreceived ?? 0,
						completionRate: data.htxh?.completionRate ?? 0,
						categories: data.htxh?.categories ?? {
							age75plus: 0, age70to74poor: 0, bao_tro: 0,
							huu_tri: 0, huu_tuat_bao_hiem: 0, nguoi_co_cong: 0,
						},
					},
					demographics: data.demographics ?? {
						gender: { male: 0, female: 0 },
						ethnicity: { kinh: 0, other: 0 },
					},
				}
			: null;

		return buildPolicyDashboardData(
			overviewData,
			selectedVillageId,
			selectedYear,
		);
	}, [data, selectedVillageId, selectedYear]);

	const tableVillageRows = useMemo(() => {
		if (data?.villageBreakdown && data.villageBreakdown.length > 0) {
			return data.villageBreakdown.map((vb: any, idx: number) => {
				const total = (vb.chuctho_total ?? 0) + (vb.htxh_total ?? 0);
				const received = (vb.chuctho_received ?? 0) + (vb.htxh_received ?? 0);
				const unreceived = Math.max(0, total - received);
				const rate = total > 0 ? (received / total) * 100 : 0;
				return {
					stt: idx + 1,
					id: vb.village_id || String(idx),
					name: vb.village_name || `Thôn ${idx + 1}`,
					total,
					chucTho: vb.chuctho_total ?? 0,
					htxh: vb.htxh_total ?? 0,
					received,
					unreceived,
					rate,
				};
			});
		}
		return [
			{
				stt: 1,
				id: policyData.village.id,
				name: policyData.village.name,
				total: policyData.village.totalBeneficiaries,
				chucTho: policyData.village.chucThoCount,
				htxh: policyData.village.htxhCount,
				received: policyData.village.receivedCount,
				unreceived: policyData.village.unreceivedCount,
				rate: policyData.village.receivedPct,
			},
		];
	}, [data, policyData]);

	const tableSummary: TableSummary = useMemo(() => {
		const total = tableVillageRows.reduce((acc: number, r: VillageTableRow) => acc + r.total, 0);
		const chucTho = tableVillageRows.reduce((acc: number, r: VillageTableRow) => acc + r.chucTho, 0);
		const htxh = tableVillageRows.reduce((acc: number, r: VillageTableRow) => acc + r.htxh, 0);
		const received = tableVillageRows.reduce((acc: number, r: VillageTableRow) => acc + r.received, 0);
		const unreceived = tableVillageRows.reduce((acc: number, r: VillageTableRow) => acc + r.unreceived, 0);
		const rate = total > 0 ? (received / total) * 100 : 0;
		return { total, chucTho, htxh, received, unreceived, rate };
	}, [tableVillageRows]);

	const currentVillageObj = villages.find((v) => v.id === selectedVillageId);
	const userVillageName = user?.village_id
		? villages.find((v) => v.id === user.village_id)?.name || "Thôn của bạn"
		: "Toàn xã";

	const currentVillageLabel = currentVillageObj
		? currentVillageObj.name
		: !isAdmin && userVillageName
			? userVillageName
			: "Toàn xã Đăk Hà";

	return (
		<div
			className="space-y-6 animate-in fade-in pb-12 select-none"
			style={{ ["--stat-accent" as any]: STAT_ACCENTS.cs }}
		>
			<PolicyAnalyticsHeader
				currentVillageLabel={currentVillageLabel}
				isAdmin={isAdmin}
				selectedVillage={selectedVillageId}
				userVillageName={userVillageName}
				selectedYear={selectedYear}
				currentYear={currentYear}
				loading={loading}
				onClearTrends={() => {}}
				onRefresh={loadAnalytics}
				onYearChange={setSelectedYear}
			/>

			<PolicyKpiRow
				data={data ? policyData : undefined}
				chucthoTotal={data?.chuctho?.total}
				chucthoReceived={data?.chuctho?.received}
				htxhTotal={data?.htxh?.total}
				htxhReceived={data?.htxh?.received}
			/>

			<span className="sr-only">Tiến Độ Chúc Thọ</span>
			<span className="sr-only">Tiến Độ Hỗ Trợ Xã Hội</span>

			<PolicyDistributionCards policyData={policyData} />

			<PolicyVillageTable
				rows={tableVillageRows}
				summary={tableSummary}
				selectedYear={selectedYear}
				isAdmin={isAdmin}
				userVillageName={userVillageName}
				villagesCount={villages.length}
			/>
		</div>
	);
};

export default PolicyAnalyticsPage;
