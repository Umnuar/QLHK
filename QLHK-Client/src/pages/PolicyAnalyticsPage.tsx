import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../AppContext";
import { policyApi } from "../api/policyApi";
import { STAT_ACCENTS } from "../components/analytics/AnalyticsWidgets";
import {
	buildPolicyDashboardData,
	formatNumber,
	formatPct,
	VILLAGE_POLICY_PROFILES,
} from "../components/analytics/policyAnalyticsData";
import { DonutChart } from "../components/analytics/DonutChart";
import { MicroBar } from "../components/analytics/MicroBar";
import { GenderRatioBar } from "../components/analytics/GenderRatioBar";
import { PolicyKpiRow } from "../components/analytics/PolicyKpiRow";
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

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
					<div className="flex items-center justify-between">
						<span className="font-bold text-sm text-slate-800 dark:text-white">Tiến Độ Chúc Thọ</span>
						<span className="text-xs text-emerald-600 font-bold">{data?.chuctho?.completionRate ?? 0}%</span>
					</div>
					<div className="flex items-center justify-center">
						<DonutChart segments={policyData.chucThoSegments} centerValue={`${data?.chuctho?.completionRate ?? 0}%`} centerLabel="Đã nhận" activeId={null} onActiveChange={() => {}} ariaLabel="Tiến độ chúc thọ" size={130} stroke={14} />
					</div>
					<div className="space-y-2 pt-2 border-t dark:border-slate-800">
						<div className="text-xs font-semibold text-slate-500">Mốc tuổi chính:</div>
						<MicroBar label="Tròn 70 tuổi" value={35} color="#10b981" />
						<MicroBar label="Tròn 80 tuổi" value={25} color="#059669" />
						<MicroBar label="Tròn 90 tuổi" value={15} color="#047857" />
					</div>
					<GenderRatioBar maleCount={policyData.genderRatio.maleCount} femaleCount={policyData.genderRatio.femaleCount} />
				</div>

				<div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
					<div className="flex items-center justify-between">
						<span className="font-bold text-sm text-slate-800 dark:text-white">Tiến Độ Hỗ Trợ Xã Hội</span>
						<span className="text-xs text-rose-600 font-bold">{data?.htxh?.completionRate ?? 0}%</span>
					</div>
					<div className="flex items-center justify-center">
						<DonutChart segments={policyData.htxhSegments} centerValue={`${data?.htxh?.completionRate ?? 0}%`} centerLabel="Đã nhận" activeId={null} onActiveChange={() => {}} ariaLabel="Tiến độ HTXH" size={130} stroke={14} />
					</div>
					<div className="space-y-2 pt-2 border-t dark:border-slate-800">
						<div className="text-xs font-semibold text-slate-500">Diện trợ cấp tiêu biểu:</div>
						<MicroBar label="Đủ 75 tuổi trở lên" value={40} color="#f43f5e" />
						<MicroBar label="Bảo trợ xã hội" value={30} color="#e11d48" />
						<MicroBar label="Người có công" value={20} color="#be123c" />
					</div>
					<GenderRatioBar maleCount={Math.round((data?.htxh?.total ?? 0) * 0.4)} femaleCount={Math.round((data?.htxh?.total ?? 0) * 0.6)} />
				</div>
			</div>

			{data?.villageBreakdown && data.villageBreakdown.length > 0 && (
				<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
					<div className="p-4 border-b dark:border-slate-800 font-bold text-sm text-slate-800 dark:text-white">
						Đối Soát Số Liệu Chính Sách Theo Thôn
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-xs text-left">
							<thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase">
								<tr>
									<th className="p-3">Thôn</th>
									<th className="p-3">Chúc Thọ</th>
									<th className="p-3">Hỗ Trợ Xã Hội</th>
									<th className="p-3">Tiến Độ Quà</th>
								</tr>
							</thead>
							<tbody>
								{data.villageBreakdown.map((vb: any) => {
									const total = vb.chuctho_total + vb.htxh_total;
									const received = vb.chuctho_received + vb.htxh_received;
									const pct = total > 0 ? Math.round((received / total) * 100) : 0;
									return (
										<tr key={vb.village_id} className="border-t dark:border-slate-800">
											<td className="p-3 font-semibold">{vb.village_name}</td>
											<td className="p-3">{vb.chuctho_received}/{vb.chuctho_total}</td>
											<td className="p-3">{vb.htxh_received}/{vb.htxh_total}</td>
											<td className="p-3 w-40">
												<div className="flex items-center gap-2">
													<div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
														<div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
													</div>
													<span className="font-mono text-[11px] font-bold">{pct}%</span>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
};

export default PolicyAnalyticsPage;
