import React, { useEffect, useState } from "react";
import { Award, BarChart3, HeartHandshake, RefreshCw } from "lucide-react";
import { useApp } from "../AppContext";
import { policyApi } from "../api/policyApi";
import type { PolicyAnalyticsSummary } from "../types/policy";

export const PolicyAnalyticsPage: React.FC = () => {
	const { selectedVillageId } = useApp();
	const [data, setData] = useState<PolicyAnalyticsSummary | null>(null);
	const [loading, setLoading] = useState(false);

	const loadAnalytics = async () => {
		setLoading(true);
		try {
			const res = await policyApi.getAnalytics(selectedVillageId || undefined);
			setData(res);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadAnalytics();
	}, [selectedVillageId]);

	return (
		<div className="p-6 space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
					<BarChart3 className="w-5 h-5 text-emerald-600" /> Thống Kê Chính Sách Xã Hội
				</h1>
				<button onClick={loadAnalytics} disabled={loading} className="p-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
					<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border dark:border-slate-700 shadow-sm space-y-3">
					<div className="flex items-center gap-2 text-emerald-600 font-bold">
						<Award className="w-5 h-5" />
						<span>Chính Sách Chúc Thọ</span>
					</div>
					<div className="grid grid-cols-3 gap-2 text-center pt-2">
						<div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
							<div className="text-xs text-slate-500">Tổng số</div>
							<div className="text-lg font-black">{data?.chuctho?.total ?? 0}</div>
						</div>
						<div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl text-emerald-600">
							<div className="text-xs">Đã nhận</div>
							<div className="text-lg font-black">{data?.chuctho?.received ?? 0}</div>
						</div>
						<div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-xl text-blue-600">
							<div className="text-xs">Tỷ lệ</div>
							<div className="text-lg font-black">{data?.chuctho?.completionRate ?? 0}%</div>
						</div>
					</div>
				</div>

				<div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border dark:border-slate-700 shadow-sm space-y-3">
					<div className="flex items-center gap-2 text-rose-600 font-bold">
						<HeartHandshake className="w-5 h-5" />
						<span>Hỗ Trợ Xã Hội</span>
					</div>
					<div className="grid grid-cols-3 gap-2 text-center pt-2">
						<div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
							<div className="text-xs text-slate-500">Tổng số</div>
							<div className="text-lg font-black">{data?.htxh?.total ?? 0}</div>
						</div>
						<div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl text-rose-600">
							<div className="text-xs">Đã nhận</div>
							<div className="text-lg font-black">{data?.htxh?.received ?? 0}</div>
						</div>
						<div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-xl text-purple-600">
							<div className="text-xs">Tỷ lệ</div>
							<div className="text-lg font-black">{data?.htxh?.completionRate ?? 0}%</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PolicyAnalyticsPage;
