import {
	Award,
	BarChart3,
	Calendar,
	Download,
	HeartHandshake,
	PieChart,
	RefreshCw,
	RotateCcw,
	TrendingUp,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/AppContext";
import {
	type AnalyticsByVillageResponse,
	type AnalyticsOverviewData,
	analyticsApi,
} from "@/api/analyticsApi";
import { useAnalyticsFluctuation } from "@/hooks/useAnalyticsFluctuation";
import { STAT_ACCENTS } from "../components/analytics/AnalyticsWidgets";
import { TABLE_STYLES } from "@/components/common/tableStyles";
import { YearSelector } from "../components/dashboard/YearSelector";
import {
	VILLAGE_POLICY_PROFILES,
	buildPolicyDashboardData,
	formatNumber,
	formatPct,
} from "../components/analytics/policyAnalyticsData";
import { DistributionCard } from "../components/analytics/DistributionCard";
import { GenderRatioBar } from "../components/analytics/GenderRatioBar";
import { PolicyKpiRow } from "../components/analytics/PolicyKpiRow";

export const PolicyAnalyticsPage: React.FC = () => {
	const {
		villages,
		selectedVillageId,
		setSelectedVillageId,
		user,
	} = useApp();
	const isAdmin = user?.role === "admin";
	const currentYear = new Date().getFullYear();
	const [selectedYear, setSelectedYear] = useState<number>(currentYear);
	const userVillage = villages.find((v) => v.id === user?.village_id);
	const userVillageName = userVillage
		? userVillage.name
		: user?.village_id
			? "Thôn phụ trách"
			: "Toàn xã";

	const [selectedVillage, setSelectedVillage] = useState<string>(
		!isAdmin && user?.village_id ? user.village_id : selectedVillageId || "",
	);

	useEffect(() => {
		if (!isAdmin && user?.village_id) {
			setSelectedVillage(user.village_id);
			setSelectedVillageId(user.village_id);
		} else {
			setSelectedVillage(selectedVillageId || "");
		}
	}, [selectedVillageId, isAdmin, user?.village_id, setSelectedVillageId]);

	const [loading, setLoading] = useState(false);
	const [isExporting, setIsExporting] = useState(false);

	const [overview, setOverview] = useState<AnalyticsOverviewData | null>(null);
	const [breakdown, setBreakdown] = useState<AnalyticsByVillageResponse | null>(
		null,
	);
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
			const [ovData, bvData] = await Promise.all([
				analyticsApi.getOverview({
					villageId: selectedVillage || undefined,
					calculationYear: selectedYear,
				}),
				analyticsApi.getByVillage({
					calculationYear: selectedYear,
				}),
			]);

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

	const totalCt = overview?.chuctho?.total ?? 0;
	const ctReceived = overview?.chuctho?.received ?? 0;
	const ctUnreceived = overview?.chuctho?.unreceived ?? 0;

	const totalHtxh = overview?.htxh?.total ?? 0;
	const htxhReceived = overview?.htxh?.received ?? 0;
	const htxhUnreceived = overview?.htxh?.unreceived ?? 0;

	const totalAll = totalCt + totalHtxh;
	const totalReceived = ctReceived + htxhReceived;
	const totalUnreceived = ctUnreceived + htxhUnreceived;

	const metricsMap = useMemo(() => {
		if (!overview) return null;
		return {
			total_all: totalAll,
			total_received: totalReceived,
			total_unreceived: totalUnreceived,
			progress_count: totalReceived,
			gender_male: demographics.gender.male,
			gender_female: demographics.gender.female,
			ethnicity_kinh: demographics.ethnicity.kinh,
			ethnicity_other: demographics.ethnicity.other,
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
	}, [overview, demographics, totalAll, totalReceived, totalUnreceived]);

	const policyData = useMemo(
		() =>
			buildPolicyDashboardData(
				overview,
				selectedVillage || selectedVillageId,
				selectedYear,
			),
		[overview, selectedVillage, selectedVillageId, selectedYear],
	);

	const tableVillageRows = useMemo(() => {
		if (breakdown?.data && breakdown.data.length > 0) {
			return breakdown.data.map((row: any, idx: number) => {
				const cTotal = row.chuctho?.total || 0;
				const hTotal = row.htxh?.total || 0;
				const cRec = row.chuctho?.received || 0;
				const hRec = row.htxh?.received || 0;
				const cUnrec = row.chuctho?.unreceived || 0;
				const hUnrec = row.htxh?.unreceived || 0;
				const total = cTotal + hTotal;
				const received = cRec + hRec;
				const unreceived = cUnrec + hUnrec;
				const rate =
					total > 0 ? Number(((received / total) * 100).toFixed(1)) : 0;
				return {
					stt: idx + 1,
					id: row.village_id,
					name: row.village_name,
					total,
					chucTho: cTotal,
					htxh: hTotal,
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
				total > 0 ? Number(((received / total) * 100).toFixed(1)) : 0;
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

	const { clearTrends } = useAnalyticsFluctuation(
		selectedVillage,
		selectedYear,
		metricsMap,
		!loading && overview !== null,
	);

	const currentVillageObj = villages.find(
		(v) => v.id === (selectedVillage || selectedVillageId),
	);
	const currentVillageLabel = currentVillageObj
		? currentVillageObj.name
		: !isAdmin && userVillageName
			? userVillageName
			: "Toàn xã Đăk Hà";

	const handleExportExcel = async () => {
		setIsExporting(true);
		try {
			const mod = await import("xlsx");
			const XLSX = (mod as any).default || mod;

			const wb = XLSX.utils.book_new();

			const titleRow = [
				`UBND XÃ ĐĂK HÀ - BẢNG THỐNG KÊ BÁO CÁO ĐỐI SOÁT CHÍNH SÁCH NĂM ${selectedYear}`,
			];
			const subTitleRow = [
				`Địa bàn: ${currentVillageLabel} • Thời điểm lập báo cáo: ${new Date().toLocaleDateString("vi-VN")}`,
			];
			const emptyRow: any[] = [];
			const headers = [
				"STT",
				"Địa Bàn Thôn",
				"Tổng Đối Tượng",
				"Số Cụ Chúc Thọ",
				"Hồ Sơ HTXH",
				"Đã Nhận Quà / Trợ Cấp",
				"Chưa Nhận",
				"Tỷ Lệ Hoàn Thành (%)",
			];

			const dataRows = tableVillageRows.map((row) => [
				row.stt,
				row.name,
				row.total,
				row.chucTho,
				row.htxh,
				row.received,
				row.unreceived,
				`${formatPct(row.rate)}%`,
			]);

			const totalRow = [
				"",
				"TỔNG CỘNG TOÀN XÃ",
				tableSummary.total,
				tableSummary.chucTho,
				tableSummary.htxh,
				tableSummary.received,
				tableSummary.unreceived,
				`${formatPct(tableSummary.rate)}%`,
			];

			const aoaData = [
				titleRow,
				subTitleRow,
				emptyRow,
				headers,
				...dataRows,
				totalRow,
			];
			const ws1 = XLSX.utils.aoa_to_sheet(aoaData);
			ws1["!cols"] = [
				{ wch: 6 },
				{ wch: 24 },
				{ wch: 18 },
				{ wch: 18 },
				{ wch: 16 },
				{ wch: 22 },
				{ wch: 14 },
				{ wch: 20 },
			];
			ws1["!merges"] = [
				{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
				{ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
			];
			XLSX.utils.book_append_sheet(wb, ws1, "ThongKeDoiSoat");

			const ctTitle = [
				`CƠ CẤU ĐỘ TUỔI CHÚC THỌ (CÁC MỐC 60, 65, 70, 75, 80, 85, 90, 95, 100, TRÊN 100 TUỔI) - NĂM ${selectedYear}`,
			];
			const ctHeaders = [
				"STT",
				"Mốc Chúc Thọ",
				"Số Cụ",
				"Tỷ Lệ (%)",
			];
			const ctRows = policyData.chucThoSegments.map((seg, idx) => [
				idx + 1,
				seg.label,
				seg.count,
				`${formatPct(seg.pct)}%`,
			]);
			const ctTotalRow = [
				"",
				"TỔNG CỘNG CỤ CHÚC THỌ",
				policyData.chucThoTotal,
				"100.0%",
			];

			const htxhTitle = [
				`PHÂN NHÓM ĐỐI TƯỢNG HƯỞNG HỖ TRỢ XÃ HỘI & BẢO TRỢ - NĂM ${selectedYear}`,
			];
			const htxhHeaders = [
				"STT",
				"Diện Chính Sách / Trợ Cấp",
				"Số Lượng Đối Tượng",
				"Tỷ Lệ (%)",
			];
			const htxhRows = policyData.htxhSegments.map((seg, idx) => [
				idx + 1,
				seg.label,
				seg.count,
				`${formatPct(seg.pct)}%`,
			]);
			const htxhTotalRow = [
				"",
				"TỔNG HỒ SƠ HƯỞNG TRỢ CẤP",
				policyData.htxhTotal,
				"100.0%",
			];

			const demoTitle = [
				`CƠ CẤU DÂN TỘC & GIỚI TÍNH - NĂM ${selectedYear}`,
			];
			const demoHeaders = [
				"Chỉ Tiêu Thống Kê",
				"Số Lượng",
				"Tỷ Lệ (%)",
			];
			const demoRows = [
				["Nam", policyData.genderRatio.maleCount, `${formatPct(policyData.genderRatio.malePct)}%`],
				["Nữ", policyData.genderRatio.femaleCount, `${formatPct(policyData.genderRatio.femalePct)}%`],
				["Dân tộc Kinh", Math.round(policyData.village.totalBeneficiaries * ((100 - policyData.village.dttsPct) / 100)), `${formatPct(100 - policyData.village.dttsPct)}%`],
				["Dân tộc thiểu số (DTTS)", Math.round(policyData.village.totalBeneficiaries * (policyData.village.dttsPct / 100)), `${formatPct(policyData.village.dttsPct)}%`],
			];

			const aoaDetail = [
				ctTitle,
				emptyRow,
				ctHeaders,
				...ctRows,
				ctTotalRow,
				emptyRow,
				htxhTitle,
				emptyRow,
				htxhHeaders,
				...htxhRows,
				htxhTotalRow,
				emptyRow,
				demoTitle,
				emptyRow,
				demoHeaders,
				...demoRows,
			];
			const ws2 = XLSX.utils.aoa_to_sheet(aoaDetail);
			ws2["!cols"] = [
				{ wch: 6 },
				{ wch: 38 },
				{ wch: 22 },
				{ wch: 16 },
			];
			ws2["!merges"] = [
				{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
				{ s: { r: ctRows.length + 5, c: 0 }, e: { r: ctRows.length + 5, c: 3 } },
				{ s: { r: ctRows.length + htxhRows.length + 10, c: 0 }, e: { r: ctRows.length + htxhRows.length + 10, c: 2 } },
			];
			XLSX.utils.book_append_sheet(wb, ws2, "CoCauChucTho_HTXH");

			const filename = `BaoCao_ThongKe_DoiSoat_ChinhSach_DakHa_${selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`;
			XLSX.writeFile(wb, filename);
		} catch (err) {
			console.error("Export error:", err);
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<div
			className="space-y-6 animate-in fade-in pb-12 select-none"
			style={{ ["--stat-accent" as any]: STAT_ACCENTS.cs }}
		>
			<div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-150">
				<div>
					<div className="flex items-center gap-2.5 flex-wrap">
						<span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
							{currentVillageLabel}
						</span>

						<h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
							<BarChart3
								className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
								strokeWidth={1.5}
							/>
							<span>Thống Kê Báo Cáo & Đối Soát Chính Sách</span>
						</h2>
					</div>
					<p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
						Phân tích số liệu đối tượng Chúc Thọ và Hưu Trí Xã Hội trên địa bàn{" "}
						{isAdmin ? (selectedVillage ? currentVillageLabel : "Xã Đăk Hà") : userVillageName} (Năm {selectedYear})
					</p>
				</div>

				<div className="flex items-center gap-2.5 flex-wrap">
					<button
						type="button"
						onClick={handleExportExcel}
						disabled={isExporting}
						className="h-10 flex items-center justify-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs active:scale-[0.99] cursor-pointer disabled:opacity-50"
					>
						<Download className="w-4 h-4" strokeWidth={1.5} />
						<span>{isExporting ? "Đang xuất..." : "Xuất Báo Cáo Excel"}</span>
					</button>

					<button
						type="button"
						onClick={clearTrends}
						className="h-10 flex items-center justify-center gap-1.5 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 active:scale-95"
						title="Đặt lại lịch sử biến động cho địa bàn và năm này"
					>
						<RotateCcw className="w-4 h-4 text-slate-500 dark:text-slate-400" strokeWidth={1.5} />
						<span className="hidden sm:inline">Đặt lại biến động</span>
					</button>

					<button
						type="button"
						onClick={fetchData}
						disabled={loading}
						className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl transition-all cursor-pointer active:scale-95 disabled:opacity-50 border border-slate-200 dark:border-slate-700"
						title="Làm mới dữ liệu"
					>
						<RefreshCw
							className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`}
							strokeWidth={1.5}
						/>
					</button>
				</div>
			</div>

			<div className="relative z-20 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-150">
				<div className="flex items-center gap-2.5 flex-wrap">
					<div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 pl-1">
						<Calendar
							className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
							strokeWidth={1.5}
						/>
						<span>Năm tính toán:</span>
					</div>

					<div className="shrink-0">
						<YearSelector
							year={selectedYear}
							onYearChange={(y) => setSelectedYear(y)}
						/>
					</div>

					{selectedYear !== currentYear && (
						<button
							type="button"
							onClick={() => setSelectedYear(currentYear)}
							className="h-8 sm:h-9 px-2.5 py-1 text-xs rounded-xl flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200/70 dark:border-slate-700/70"
							title="Về năm hiện tại"
						>
							<RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
							<span>Về năm {currentYear}</span>
						</button>
					)}
				</div>

				<div className="text-xs text-slate-400 dark:text-slate-500 font-medium hidden sm:flex items-center gap-2 pr-1">
					<span>
						Đối soát số liệu và mốc tuổi chính sách theo năm{" "}
						<strong className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
							{selectedYear}
						</strong>
					</span>
				</div>
			</div>

			<PolicyKpiRow data={policyData} />

			<section
				aria-label="Phân tích dữ liệu chính sách và an sinh xã hội"
				className="grid grid-cols-1 gap-3 lg:grid-cols-2"
			>
				<DistributionCard
					icon={<Award className="size-4" />}
					title="Cơ Cấu Độ Tuổi Chúc Thọ"
					badge="10 mốc chúc thọ (mẫu xã)"
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
					centerValue={formatNumber(policyData.htxhTotal)}
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
			</section>

			<div className={TABLE_STYLES.card}>
				<div className={TABLE_STYLES.headerBar}>
					<div className="flex items-center gap-2">
						<TrendingUp
							className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
							strokeWidth={1.5}
						/>
						<h3 className={TABLE_STYLES.headerTitle}>
							Bảng Đối Soát Số Liệu Thực Hiện{" "}
							{isAdmin
								? villages.length
									? `${villages.length} Thôn`
									: "Các Thôn"
								: userVillageName}{" "}
							(Năm {selectedYear})
						</h3>
					</div>
					<div className={TABLE_STYLES.headerTip}>
						<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1" />
						Số liệu đối soát tự động theo năm tính toán {selectedYear}
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full min-w-[960px] text-xs text-left border-collapse whitespace-nowrap">
						<thead className="bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_0_rgba(0,0,0,0.3)]">
							<tr className="border-b border-slate-200/90 dark:border-slate-700/80">
								<th className="px-4 py-3 text-center w-12 border-b border-slate-200/90 dark:border-slate-700/80">
									STT
								</th>
								<th className="px-4 py-3 border-b border-slate-200/90 dark:border-slate-700/80">
									Địa Bàn Thôn
								</th>
								<th className="px-3 py-3 text-right border-b border-slate-200/90 dark:border-slate-700/80">
									Tổng Đối Tượng
								</th>
								<th className="px-3 py-3 text-right border-b border-slate-200/90 dark:border-slate-700/80">
									Số Cụ Chúc Thọ
								</th>
								<th className="px-3 py-3 text-right border-b border-slate-200/90 dark:border-slate-700/80">
									Hồ Sơ HTXH
								</th>
								<th className="px-3 py-3 text-right border-b border-slate-200/90 dark:border-slate-700/80">
									Đã Nhận Quà / Trợ Cấp
								</th>
								<th className="px-3 py-3 text-right border-b border-slate-200/90 dark:border-slate-700/80">
									Chưa Nhận
								</th>
								<th className="px-3 py-3 text-right border-b border-slate-200/90 dark:border-slate-700/80">
									Tỷ Lệ Hoàn Thành (%)
								</th>
							</tr>
						</thead>
						<tbody className="font-medium">
							{tableVillageRows.length > 0 ? (
								tableVillageRows.map((row) => (
									<tr
										key={row.id || row.stt}
										className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/80 min-h-[48px]"
									>
										<td className="px-4 py-3 text-center text-xs text-slate-400 dark:text-slate-500 tabular-nums">
											{row.stt}
										</td>
										<td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200">
												{row.name}
											</span>
										</td>
										<td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
											{formatNumber(row.total)}
										</td>
										<td className="px-3 py-3 text-right font-bold text-amber-600 dark:text-amber-400 tabular-nums">
											{formatNumber(row.chucTho)}
										</td>
										<td className="px-3 py-3 text-right font-bold text-sky-600 dark:text-sky-400 tabular-nums">
											{formatNumber(row.htxh)}
										</td>
										<td className="px-3 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
											{formatNumber(row.received)}
										</td>
										<td
											className={`px-3 py-3 text-right font-bold tabular-nums ${
												row.unreceived > 0
													? "text-rose-600 dark:text-rose-400"
													: "text-slate-400 dark:text-slate-500"
											}`}
										>
											{formatNumber(row.unreceived)}
										</td>
										<td className="px-3 py-3 text-right font-bold text-slate-800 dark:text-slate-200 tabular-nums">
											{formatPct(row.rate)}%
										</td>
									</tr>
								))
							) : (
								<tr>
									<td
										colSpan={8}
										className="py-8 text-center text-slate-400 italic"
									>
										Chưa có số liệu đối soát cho năm {selectedYear}.
									</td>
								</tr>
							)}
						</tbody>

						<tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700">
							<tr>
								<td
									className="px-4 py-3 text-center font-bold uppercase text-emerald-700 dark:text-emerald-300"
									colSpan={2}
								>
									TỔNG CỘNG TOÀN XÃ
								</td>
								<td className="px-3 py-3 text-right font-mono font-black text-slate-900 dark:text-white tabular-nums">
									{formatNumber(tableSummary.total)}
								</td>
								<td className="px-3 py-3 text-right font-mono font-black text-amber-600 dark:text-amber-400 tabular-nums">
									{formatNumber(tableSummary.chucTho)}
								</td>
								<td className="px-3 py-3 text-right font-mono font-black text-sky-600 dark:text-sky-400 tabular-nums">
									{formatNumber(tableSummary.htxh)}
								</td>
								<td className="px-3 py-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
									{formatNumber(tableSummary.received)}
								</td>
								<td
									className={`px-3 py-3 text-right font-mono font-black tabular-nums ${
										tableSummary.unreceived > 0
											? "text-rose-600 dark:text-rose-400"
											: "text-slate-400 dark:text-slate-500"
									}`}
								>
									{formatNumber(tableSummary.unreceived)}
								</td>
								<td className="px-3 py-3 text-right font-mono font-black text-slate-900 dark:text-white tabular-nums">
									{formatPct(tableSummary.rate)}%
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>
		</div>
	);
};

export default PolicyAnalyticsPage;
