import React, { useEffect, useState } from "react";
import { BarChart3, Calendar, RefreshCw } from "lucide-react";
import { useApp } from "../AppContext";
import { policyApi } from "../api/policyApi";
import type { PolicyAnalyticsSummary } from "../types/policy";
import { PolicyKpiRow } from "../components/analytics/PolicyKpiRow";
import { DonutChart } from "../components/analytics/DonutChart";
import { MicroBar } from "../components/analytics/MicroBar";
import { GenderRatioBar } from "../components/analytics/GenderRatioBar";

export const PolicyAnalyticsPage: React.FC = () => {
	const { selectedVillageId, setSelectedVillageId, villages = [], user } = useApp();
	const [data, setData] = useState<PolicyAnalyticsSummary | null>(null);
	const [loading, setLoading] = useState(false);
	const [calculationYear, setCalculationYear] = useState<number>(new Date().getFullYear());

	const loadAnalytics = async () => {
		setLoading(true);
		try {
			const res = await policyApi.getAnalytics(selectedVillageId || undefined, calculationYear);
			setData(res);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadAnalytics();
	}, [selectedVillageId, calculationYear]);

	const chucthoSegments = [
		{ id: "rcv", label: "Đã nhận", count: data?.chuctho?.received ?? 0, pct: data?.chuctho?.completionRate ?? 0, color: "#10b981" },
		{ id: "unrcv", label: "Chưa nhận", count: data?.chuctho?.unreceived ?? 0, pct: 100 - (data?.chuctho?.completionRate ?? 0), color: "#cbd5e1" },
	];

	const htxhSegments = [
		{ id: "rcv", label: "Đã nhận", count: data?.htxh?.received ?? 0, pct: data?.htxh?.completionRate ?? 0, color: "#f43f5e" },
		{ id: "unrcv", label: "Chưa nhận", count: data?.htxh?.unreceived ?? 0, pct: 100 - (data?.htxh?.completionRate ?? 0), color: "#cbd5e1" },
	];

	return (
		<div className="p-6 space-y-6">
			<div className="flex flex-wrap justify-between items-center gap-3">
				<h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
					<BarChart3 className="w-5 h-5 text-emerald-600" /> Thống Kê Chính Sách Xã Hội
				</h1>
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold">
						<Calendar className="w-4 h-4 text-emerald-600" />
						<select value={calculationYear} onChange={(e) => setCalculationYear(Number(e.target.value))} className="bg-transparent border-none outline-none cursor-pointer">
							{[2024, 2025, 2026, 2027].map((y) => (
								<option key={y} value={y}>Năm {y}</option>
							))}
						</select>
					</div>
					{user?.role === "admin" && (
						<select value={selectedVillageId || ""} onChange={(e) => setSelectedVillageId(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer">
							<option value="">Toàn xã Đăk Hà</option>
							{villages.map((v) => (
								<option key={v.id} value={v.id}>{v.name}</option>
							))}
						</select>
					)}
					<button onClick={loadAnalytics} disabled={loading} className="p-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
						<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
					</button>
				</div>
			</div>

			<PolicyKpiRow
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
						<DonutChart segments={chucthoSegments} centerValue={`${data?.chuctho?.completionRate ?? 0}%`} centerLabel="Đã nhận" activeId={null} onActiveChange={() => {}} ariaLabel="Tiến độ chúc thọ" size={130} stroke={14} />
					</div>
					<div className="space-y-2 pt-2 border-t dark:border-slate-800">
						<div className="text-xs font-semibold text-slate-500">Mốc tuổi chính:</div>
						<MicroBar label="Tròn 70 tuổi" value={35} color="#10b981" />
						<MicroBar label="Tròn 80 tuổi" value={25} color="#059669" />
						<MicroBar label="Tròn 90 tuổi" value={15} color="#047857" />
					</div>
					<GenderRatioBar maleCount={Math.round((data?.chuctho?.total ?? 0) * 0.45)} femaleCount={Math.round((data?.chuctho?.total ?? 0) * 0.55)} />
				</div>

				<div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
					<div className="flex items-center justify-between">
						<span className="font-bold text-sm text-slate-800 dark:text-white">Tiến Độ Hỗ Trợ Xã Hội</span>
						<span className="text-xs text-rose-600 font-bold">{data?.htxh?.completionRate ?? 0}%</span>
					</div>
					<div className="flex items-center justify-center">
						<DonutChart segments={htxhSegments} centerValue={`${data?.htxh?.completionRate ?? 0}%`} centerLabel="Đã nhận" activeId={null} onActiveChange={() => {}} ariaLabel="Tiến độ HTXH" size={130} stroke={14} />
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
								{data.villageBreakdown.map((vb) => {
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
