import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, HeartHandshake, PieChart } from "lucide-react";
import { useApp } from "../AppContext";
import { policyApi } from "../api/policyApi";
import { STAT_ACCENTS } from "../components/analytics/AnalyticsWidgets";
import {
	buildPolicyDashboardData,
	formatNumber,
	formatPct,
} from "../components/analytics/policyAnalyticsData";
import { DistributionCard } from "../components/analytics/DistributionCard";
import { GenderRatioBar } from "../components/analytics/GenderRatioBar";
import { PolicyCompositeCard } from "../components/analytics/PolicyCompositeCard";
import { PolicyKpiRow } from "../components/analytics/PolicyKpiRow";
import { PolicyAnalyticsTable } from "../components/analytics/PolicyAnalyticsTable";
import { PolicyAnalyticsHeader } from "../components/analytics/PolicyAnalyticsHeader";

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
				const rate =
					total > 0 ? Number(((received / total) * 100).toFixed(1)) : 0;
				return {
					stt: idx + 1,
					id: vb.village_id,
					name: vb.village_name,
					total,
					chucTho: vb.chuctho_total ?? 0,
					htxh: vb.htxh_total ?? 0,
					received,
					unreceived,
					rate,
				};
			});
		}

		return [];
	}, [data]);

	const tableSummary = useMemo(() => {
		if (tableVillageRows.length > 0) {
			const total = tableVillageRows.reduce((sum: number, r: any) => sum + r.total, 0);
			const chucTho = tableVillageRows.reduce((sum: number, r: any) => sum + r.chucTho, 0);
			const htxh = tableVillageRows.reduce((sum: number, r: any) => sum + r.htxh, 0);
			const received = tableVillageRows.reduce((sum: number, r: any) => sum + r.received, 0);
			const unreceived = tableVillageRows.reduce((sum: number, r: any) => sum + r.unreceived, 0);
			const rate = total > 0 ? Number(((received / total) * 100).toFixed(1)) : 0;
			return { total, chucTho, htxh, received, unreceived, rate };
		}
		return { total: 0, chucTho: 0, htxh: 0, received: 0, unreceived: 0, rate: 0 };
	}, [tableVillageRows]);

	const currentVillageObj = villages.find((v) => v.id === selectedVillageId);
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

			<section
				aria-label="Phân tích dữ liệu chính sách và an sinh xã hội"
				className="grid grid-cols-1 gap-3 lg:grid-cols-2"
			>
				<DistributionCard
					icon={<Award className="size-4" />}
					title="Cơ Cấu Độ Tuổi Chúc Thọ"
					badge="8 mốc chúc thọ"
					segments={policyData.chucThoSegments}
					centerValue={`${formatNumber(policyData.chucThoTotal)} Cụ`}
					centerLabel="Tổng cụ chúc thọ"
					unit="cụ"
				/>

				<DistributionCard
					icon={<HeartHandshake className="size-4" />}
					title="Phân Nhóm Đối Tượng Hỗ Trợ Xã Hội"
					badge="5 nhóm diện chính sách"
					segments={policyData.htxhSegments}
					centerValue={`${formatNumber(policyData.htxhTotal)} Hồ sơ`}
					centerLabel="Hồ sơ hưởng trợ cấp"
					unit="người"
				/>

				<DistributionCard
					icon={<PieChart className="size-4" />}
					title="Cơ Cấu Dân Tộc & Giới Tính"
					badge={`Tỷ lệ DTTS ${formatPct(policyData.village.dttsPct)}%`}
					segments={policyData.ethnicSegments}
					centerValue={`${formatPct(policyData.village.dttsPct)}%`}
					centerLabel="Tỷ lệ DTTS"
					extraRightContent={
						<GenderRatioBar
							maleCount={policyData.genderRatio.maleCount}
							malePct={policyData.genderRatio.malePct}
							femaleCount={policyData.genderRatio.femaleCount}
							femalePct={policyData.genderRatio.femalePct}
						/>
					}
				/>

				<PolicyCompositeCard data={policyData} />
			</section>

			<PolicyAnalyticsTable
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
