import {
	ArrowLeft,
	BarChart3,
	Building2,
	Download,
	HeartHandshake,
	PieChart,
	RefreshCw,
	Shield,
	Users,
	Users2,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useApp } from "../../AppContext";
import {
	type AnalyticsOverviewData,
	analyticsApi,
	type VillageAnalyticsRow,
} from "../../api/analyticsApi";
import { useHouseholds } from "../../context/HouseholdContext";
import { ETHNIC_GROUPS } from "../../data/constants";
import { getCache, setCache } from "../../db/indexedDB";
import { sanitizeExcelRow } from "../../utils/excelParser";
import {
	DEFAULT_STAT_ACCENT,
	STAT_CATEGORY_COLORS,
	STAT_KPI_GRID_CLASS,
	STAT_PANEL_GRID_CLASS,
	STAT_SCROLL_CONTAINER_CLASS,
	StatBarRow,
	StatChartPanel,
	StatDonut,
	StatKpiCard,
} from "../common/statStyles";
import {
	TABLE_HEADER_CLASSES,
	VILLAGE_BADGE_CLASS,
	formatVietnameseNumber,
} from "../common/tableStyles";

export const AnalyticsDashboard: React.FC = () => {
	const {
		user,
		selectedVillageId,
		selectedVillageName,
		setActiveTab,
		villages,
		isBackendHealthy,
	} = useApp();
	const { activeHouseholds } = useHouseholds();

	const [refreshing, setRefreshing] = useState(false);
	const [isUsingCachedData, setIsUsingCachedData] = useState(false);
	const [apiOverview, setApiOverview] = useState<AnalyticsOverviewData | null>(
		null,
	);
	const [apiVillageBreakdown, setApiVillageBreakdown] = useState<
		VillageAnalyticsRow[] | null
	>(null);

	// Tính toán fallback từ danh sách households cục bộ theo mảng villages động
	const localCalculated = useMemo(() => {
		const filtered = selectedVillageId
			? activeHouseholds.filter((h) => h.village_id === selectedVillageId)
			: activeHouseholds;

		const totalHouseholds = filtered.length;
		let totalMembers = 0;
		let maleCount = 0;
		let femaleCount = 0;
		let minorityCount = 0;

		const ethnicMap: Record<string, number> = {};
		const religionMap: Record<string, number> = {};

		filtered.forEach((h) => {
			(h.members || []).forEach((m) => {
				totalMembers++;
				if (m.gender === "Nam") maleCount++;
				if (m.gender === "Nữ") femaleCount++;
				if (m.ethnicity !== "Kinh") minorityCount++;

				const eth = m.ethnicity || "Kinh";
				ethnicMap[eth] = (ethnicMap[eth] || 0) + 1;

				const rel = m.religion || "Không";
				religionMap[rel] = (religionMap[rel] || 0) + 1;
			});
		});

		const malePct =
			totalMembers > 0 ? Math.round((maleCount / totalMembers) * 1000) / 10 : 0;
		const femalePct =
			totalMembers > 0
				? Math.round((femaleCount / totalMembers) * 1000) / 10
				: 0;
		const minorityPct =
			totalMembers > 0
				? Math.round((minorityCount / totalMembers) * 1000) / 10
				: 0;

		const villageBreakdown = villages.map((v) => {
			const hhList = activeHouseholds.filter((h) => h.village_id === v.id);
			let memCount = 0;
			let male = 0;
			let female = 0;
			let minCount = 0;

			hhList.forEach((h) => {
				(h.members || []).forEach((m) => {
					memCount++;
					if (m.gender === "Nam") male++;
					if (m.gender === "Nữ") female++;
					if (m.ethnicity !== "Kinh") minCount++;
				});
			});

			const minPct =
				memCount > 0 ? Math.round((minCount / memCount) * 1000) / 10 : 0;

			return {
				village_id: v.id,
				village_name: v.name,
				village_code: v.short_code,
				household_count: hhList.length,
				citizen_count: memCount,
				male_count: male,
				female_count: female,
				dtts_count: minCount,
				dtts_percentage: minPct,
				top_ethnicity: "Kinh",
				top_religion: "Không",
			};
		});

		return {
			stats: {
				totalHouseholds,
				totalMembers,
				maleCount,
				femaleCount,
				malePct,
				femalePct,
				minorityCount,
				minorityPct,
				ethnicMap,
				religionMap,
			},
			villageBreakdown,
		};
	}, [activeHouseholds, selectedVillageId, villages]);

	// Nạp dữ liệu từ backend API kèm Offline Cache
	const fetchAnalytics = useCallback(async () => {
		setRefreshing(true);
		const overviewCacheKey = `analytics_overview_${selectedVillageId || "all"}`;
		const villageCacheKey = "analytics_by_village";

		try {
			const [overviewData, byVillageData] = await Promise.all([
				analyticsApi.getOverview(selectedVillageId || undefined),
				analyticsApi.getByVillage(),
			]);

			setApiOverview(overviewData);
			setApiVillageBreakdown(byVillageData);
			setIsUsingCachedData(false);

			// Lưu kết quả vào Offline Cache
			await setCache(overviewCacheKey, overviewData);
			await setCache(villageCacheKey, byVillageData);
		} catch (err: any) {
			console.warn(
				"[Analytics] Lỗi tải API analytics, nạp từ Offline Cache:",
				err,
			);

			const isRealNetworkError =
				err?.code === "ERR_NETWORK" ||
				err?.code === "ECONNABORTED" ||
				(!err?.response && err?.message?.includes("Network Error"));

			const shouldMarkOffline = !isBackendHealthy || isRealNetworkError;
			setIsUsingCachedData(shouldMarkOffline);

			const [cachedOverview, cachedVillage] = await Promise.all([
				getCache<AnalyticsOverviewData>(overviewCacheKey),
				getCache<VillageAnalyticsRow[]>(villageCacheKey),
			]);

			if (cachedOverview || cachedVillage) {
				if (cachedOverview) setApiOverview(cachedOverview);
				if (cachedVillage) setApiVillageBreakdown(cachedVillage);
			}
		} finally {
			setRefreshing(false);
		}
	}, [selectedVillageId, isBackendHealthy]);

	useEffect(() => {
		fetchAnalytics();
	}, [fetchAnalytics]);

	// Tự động tải lại khi server kết nối lại
	useEffect(() => {
		const handleReconnected = () => {
			fetchAnalytics();
		};
		window.addEventListener("server:reconnected", handleReconnected);
		return () =>
			window.removeEventListener("server:reconnected", handleReconnected);
	}, [fetchAnalytics]);

	// Tổng hợp số liệu hiển thị (Ưu tiên API/Cache, fallback Local)
	const stats = useMemo(() => {
		if (apiOverview) {
			const ethnicMap: Record<string, number> = {};
			(apiOverview.ethnicities || []).forEach((e) => {
				ethnicMap[e.name] = e.count;
			});

			const religionMap: Record<string, number> = {};
			(apiOverview.religions || []).forEach((r) => {
				religionMap[r.name] = r.count;
			});

			const totalHouseholds = apiOverview.totalHouseholds || 0;
			const totalMembers = apiOverview.totalCitizens || 0;
			const maleCount = apiOverview.gender?.male?.count || 0;
			const femaleCount = apiOverview.gender?.female?.count || 0;
			const malePct = apiOverview.gender?.male?.percentage || 0;
			const femalePct = apiOverview.gender?.female?.percentage || 0;

			// Tính tổng DTTS (các dân tộc khác Kinh)
			let minorityCount = 0;
			(apiOverview.ethnicities || []).forEach((e) => {
				if (e.name !== "Kinh") minorityCount += e.count;
			});
			const minorityPct =
				totalMembers > 0
					? Math.round((minorityCount / totalMembers) * 1000) / 10
					: 0;

			return {
				totalHouseholds,
				totalMembers,
				maleCount,
				femaleCount,
				malePct,
				femalePct,
				minorityCount,
				minorityPct,
				ethnicMap,
				religionMap,
			};
		}
		return localCalculated.stats;
	}, [apiOverview, localCalculated.stats]);

	// Danh sách so sánh theo các thôn
	const villageBreakdown = useMemo(() => {
		if (apiVillageBreakdown && apiVillageBreakdown.length > 0) {
			return apiVillageBreakdown;
		}
		return localCalculated.villageBreakdown;
	}, [apiVillageBreakdown, localCalculated.villageBreakdown]);

	// Tổng cộng toàn xã cộng dồn
	const villageTotals = useMemo(() => {
		let totalHh = 0;
		let totalCit = 0;
		let totalMale = 0;
		let totalFemale = 0;
		let totalDtts = 0;

		villageBreakdown.forEach((r) => {
			totalHh += r.household_count || 0;
			totalCit += r.citizen_count || 0;
			totalMale += r.male_count || 0;
			totalFemale += r.female_count || 0;
			totalDtts += r.dtts_count || 0;
		});

		const dttsPct =
			totalCit > 0 ? Math.round((totalDtts / totalCit) * 1000) / 10 : 0;

		return {
			totalHh,
			totalCit,
			totalMale,
			totalFemale,
			totalDtts,
			dttsPct,
		};
	}, [villageBreakdown]);

	// Chi tiết cơ cấu tín ngưỡng & tôn giáo
	const religionDetails = useMemo(() => {
		const noReligion = stats.religionMap["Không"] || 0;
		const catholic =
			(stats.religionMap["Công giáo"] || 0) + (stats.religionMap["CG"] || 0);
		const protestant =
			(stats.religionMap["Tin lành"] || 0) + (stats.religionMap["TL"] || 0);
		const buddhist =
			(stats.religionMap["Phật giáo"] || 0) + (stats.religionMap["PG"] || 0);
		let other = stats.religionMap["Khác"] || 0;

		Object.keys(stats.religionMap).forEach((rel) => {
			if (
				![
					"Không",
					"Công giáo",
					"CG",
					"Tin lành",
					"TL",
					"Phật giáo",
					"PG",
					"Khác",
				].includes(rel)
			) {
				other += stats.religionMap[rel] || 0;
			}
		});

		const religiousCount = catholic + protestant + buddhist + other;

		return {
			noReligion,
			religiousCount,
			list: [
				{
					label: "Không tôn giáo",
					value: noReligion,
					color: STAT_CATEGORY_COLORS.other,
				},
				{
					label: "Công giáo",
					value: catholic,
					color: STAT_CATEGORY_COLORS.cat1,
				},
				{
					label: "Tin lành",
					value: protestant,
					color: STAT_CATEGORY_COLORS.cat2,
				},
				{
					label: "Phật giáo",
					value: buddhist,
					color: STAT_CATEGORY_COLORS.cat3,
				},
				{
					label: "Tôn giáo khác",
					value: other,
					color: STAT_CATEGORY_COLORS.cat4,
				},
			],
		};
	}, [stats.religionMap]);

	const handleExportStatsExcel = () => {
		try {
			const titleRow = [
				"UBND XÃ ĐĂK HÀ - BẢNG THỐNG KÊ SO SÁNH QUY MÔ NHÂN HỘ KHẨU CÁC THÔN",
			];
			const emptyRow: any[] = [];
			const headers = [
				"STT",
				"Tên Thôn",
				"Số Hộ",
				"Tổng Nhân Khẩu",
				"Nam",
				"Nữ",
				"Dân Tộc Thiểu Số",
				"Tỷ Lệ DTTS (%)",
			];

			const dataRows = villageBreakdown.map((row, idx) => [
				idx + 1,
				row.village_name,
				row.household_count,
				row.citizen_count,
				row.male_count,
				row.female_count,
				row.dtts_count,
				`${row.dtts_percentage}%`,
			]);

			const totalRow = [
				"",
				"TỔNG CỘNG TOÀN XÃ",
				villageTotals.totalHh,
				villageTotals.totalCit,
				villageTotals.totalMale,
				villageTotals.totalFemale,
				villageTotals.totalDtts,
				`${villageTotals.dttsPct}%`,
			];

			const aoaData = [titleRow, emptyRow, headers, ...dataRows, totalRow];
			// Chống tấn công Formula Injection (CWE-1236) khi xuất báo cáo thống kê
			const sanitizedAoaData = aoaData.map(sanitizeExcelRow);
			const ws = XLSX.utils.aoa_to_sheet(sanitizedAoaData);

			ws["!cols"] = [
				{ wch: 6 },
				{ wch: 25 },
				{ wch: 12 },
				{ wch: 16 },
				{ wch: 10 },
				{ wch: 10 },
				{ wch: 16 },
				{ wch: 12 },
			];

			ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, "ThongKeCacThon");
			const filename = `BaoCao_ThongKe_DanSo_DakHa_${new Date().toISOString().slice(0, 10)}.xlsx`;
			XLSX.writeFile(wb, filename);
		} catch (err) {
			console.error("Export error:", err);
			alert("Không thể xuất file Excel thống kê.");
		}
	};

	return (
		<div
			className="space-y-6 animate-in fade-in"
			style={{ "--stat-accent": DEFAULT_STAT_ACCENT } as React.CSSProperties}
		>
			{/* Top Banner & Scope */}
			<div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-150">
				<div>
					<div className="flex items-center gap-2.5 flex-wrap">
						<span className={VILLAGE_BADGE_CLASS}>
							{selectedVillageName || "Toàn xã Đăk Hà"}
						</span>

						{/* Badge Offline Cache nổi bật */}
						{isUsingCachedData && (
							<div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold shadow-xs animate-in fade-in">
								<span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block mr-1.5" />
								<span>Đang chạy trên dữ liệu ngoại tuyến (Offline Cache)</span>
							</div>
						)}

						<h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
							<BarChart3
								className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
								strokeWidth={1.5}
							/>
							<span>Thống Kê Dân Cư & Dân Tộc</span>
						</h2>
					</div>
					<p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
						Tổng hợp quy mô nhân khẩu, phân bổ các dân tộc và cơ cấu tôn giáo tại{" "}
						{villages.length} thôn Xã Đăk Hà
					</p>
				</div>

				<div className="flex items-center gap-3">
					{user?.role === "admin" && selectedVillageId && (
						<button
							type="button"
							onClick={() => setActiveTab("villages")}
							className="h-10 flex items-center justify-center gap-1.5 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all active:scale-[0.99] cursor-pointer border border-slate-200 dark:border-slate-700"
						>
							<ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
							<span>Quay lại danh sách thôn</span>
						</button>
					)}

					<button
						type="button"
						onClick={handleExportStatsExcel}
						className="h-10 flex items-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all active:scale-[0.99] shadow-xs cursor-pointer"
					>
						<Download className="w-4 h-4" strokeWidth={1.5} />
						<span>Xuất Báo Cáo Excel</span>
					</button>

					<button
						type="button"
						onClick={fetchAnalytics}
						aria-label="Làm mới số liệu"
						className="h-10 w-10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
					>
						<RefreshCw
							strokeWidth={1.5}
							className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`}
						/>
					</button>
				</div>
			</div>

			{/* 4 Thẻ KPI Đầu Trang */}
			<div className={STAT_KPI_GRID_CLASS}>
				{/* KPI 1: Tổng số Hộ */}
				<StatKpiCard
					label="Tổng Hộ Gia Đình"
					value={formatVietnameseNumber(stats.totalHouseholds)}
					unit="hộ"
					subText="Hộ gia đình quản lý"
					icon={Building2}
				/>

				{/* KPI 2: Tổng Nhân Khẩu */}
				<StatKpiCard
					label="Tổng Nhân Khẩu"
					value={formatVietnameseNumber(stats.totalMembers)}
					unit="người"
					subText="Công dân thường trú"
					icon={Users}
				/>

				{/* KPI 3: Cơ cấu Giới tính */}
				<StatKpiCard
					label="Cơ Cấu Giới Tính"
					value={
						<span className="flex items-center gap-2">
							<span className="flex items-center gap-1.5">
								<span className="w-2 h-2 rounded-full bg-blue-500 inline-block shrink-0" />
								<span>{formatVietnameseNumber(stats.malePct)}%</span>
							</span>
							<span className="text-slate-300 dark:text-slate-600 font-normal">
								/
							</span>
							<span className="flex items-center gap-1.5">
								<span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0" />
								<span>{formatVietnameseNumber(stats.femalePct)}%</span>
							</span>
						</span>
					}
					subText={`${formatVietnameseNumber(stats.maleCount)} Nam • ${formatVietnameseNumber(stats.femaleCount)} Nữ`}
					icon={Users2}
				/>

				{/* KPI 4: Tỷ lệ DTTS */}
				<StatKpiCard
					label="Tỷ Lệ DTTS"
					value={`${formatVietnameseNumber(stats.minorityPct)}%`}
					subText={`${formatVietnameseNumber(stats.minorityCount)} đồng bào DTTS`}
					icon={HeartHandshake}
				/>
			</div>

			{/* Hàng 2: Biểu Đồ Dân Tộc & Tôn Giáo */}
			<div className={STAT_PANEL_GRID_CLASS}>
				{/* Biểu đồ phân bổ 14 Dân tộc */}
				<StatChartPanel
					title="Phân Bổ Dân Tộc Địa Bàn Đăk Hà"
					description="Tỷ lệ đồng bào dân tộc thiểu số và phân bổ chi tiết các dân tộc"
					icon={PieChart}
					badge={
						<span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
							{ETHNIC_GROUPS.length} dân tộc
						</span>
					}
				>
					<div className="space-y-4">
						<StatDonut
							items={[
								{
									label: "Kinh",
									value: stats.totalMembers - stats.minorityCount,
									color: STAT_CATEGORY_COLORS.cat1,
									unit: "người",
								},
								{
									label: "DTTS",
									value: stats.minorityCount,
									color: STAT_CATEGORY_COLORS.cat2,
									unit: "người",
								},
							]}
							total={stats.totalMembers}
							centerValue={`${formatVietnameseNumber(stats.minorityPct)}%`}
							centerLabel="DTTS"
						/>

						<div className={STAT_SCROLL_CONTAINER_CLASS}>
							{ETHNIC_GROUPS.map((eth) => {
								const cnt = stats.ethnicMap[eth] || 0;
								return (
									<StatBarRow
										key={eth}
										label={`Dân tộc ${eth}`}
										value={cnt}
										total={stats.totalMembers}
										barColor={STAT_CATEGORY_COLORS.cat1}
										unit="người"
									/>
								);
							})}
						</div>
					</div>
				</StatChartPanel>

				{/* Biểu đồ phân bổ Tôn giáo */}
				<StatChartPanel
					title="Cơ Cấu Tín Ngưỡng & Tôn Giáo"
					description="Tỷ lệ có tín ngưỡng / tôn giáo và các tổ chức tôn giáo trên địa bàn"
					icon={Shield}
					badge={
						<span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
							5 nhóm
						</span>
					}
				>
					<div className="space-y-4">
						<StatDonut
							items={religionDetails.list.map((it) => ({
								label: it.label,
								value: it.value,
								color: it.color,
								unit: "người",
							}))}
							total={stats.totalMembers}
							centerValue={
								stats.totalMembers > 0
									? `${formatVietnameseNumber(
											Math.round(
												(religionDetails.religiousCount / stats.totalMembers) *
													1000,
											) / 10,
										)}%`
									: "0%"
							}
							centerLabel="Có đạo"
						/>

						<div className={STAT_SCROLL_CONTAINER_CLASS}>
							{religionDetails.list.map((item) => (
								<StatBarRow
									key={item.label}
									label={item.label}
									value={item.value}
									total={stats.totalMembers}
									barColor={item.color}
									unit="người"
								/>
							))}
						</div>
					</div>
				</StatChartPanel>
			</div>

			{/* Hàng 3: Bảng Thống Kê So Sánh Giữa Các Thôn Xã Đăk Hà */}
			<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors duration-150">
				<div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
					<div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
						<Building2
							className="w-4 h-4 text-slate-500 dark:text-slate-400"
							strokeWidth={1.5}
						/>
						<span>Bảng Thống Kê So Sánh Giữa Các Thôn</span>
					</div>
					<span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
						{villages.length} thôn đơn vị hành chính
					</span>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse text-xs">
						<thead className={TABLE_HEADER_CLASSES.thead}>
							<tr className={TABLE_HEADER_CLASSES.row}>
								<th
									className={
										TABLE_HEADER_CLASSES.thCenter +
										" w-12 border-r border-slate-200/80 dark:border-slate-800"
									}
								>
									STT
								</th>
								<th
									className={
										TABLE_HEADER_CLASSES.th +
										" border-r border-slate-200/80 dark:border-slate-800 min-w-[180px]"
									}
								>
									Tên Thôn
								</th>
								<th
									className={
										TABLE_HEADER_CLASSES.thRight +
										" border-r border-slate-200/80 dark:border-slate-800"
									}
								>
									Số Hộ
								</th>
								<th
									className={
										TABLE_HEADER_CLASSES.thRight +
										" border-r border-slate-200/80 dark:border-slate-800"
									}
								>
									Tổng Nhân Khẩu
								</th>
								<th
									className={
										TABLE_HEADER_CLASSES.thRight +
										" border-r border-slate-200/80 dark:border-slate-800"
									}
								>
									Nam
								</th>
								<th
									className={
										TABLE_HEADER_CLASSES.thRight +
										" border-r border-slate-200/80 dark:border-slate-800"
									}
								>
									Nữ
								</th>
								<th
									className={
										TABLE_HEADER_CLASSES.thRight +
										" border-r border-slate-200/80 dark:border-slate-800"
									}
								>
									Đồng Bào DTTS
								</th>
								<th className={TABLE_HEADER_CLASSES.thRight}>Tỷ Lệ DTTS</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
							{villageBreakdown.map((row, idx) => (
								<tr
									key={row.village_id}
									className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-[13px]"
								>
									<td className="py-3 px-3.5 text-center text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/60 tabular-nums">
										{idx + 1}
									</td>
									<td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800/60">
										{row.village_name}
									</td>
									<td className="py-3 px-3 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800/60">
										{formatVietnameseNumber(row.household_count)}
									</td>
									<td className="py-3 px-3 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800/60">
										{formatVietnameseNumber(row.citizen_count)}
									</td>
									<td className="py-3 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60">
										{formatVietnameseNumber(row.male_count)}
									</td>
									<td className="py-3 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60">
										{formatVietnameseNumber(row.female_count)}
									</td>
									<td className="py-3 px-3 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800/60">
										{formatVietnameseNumber(row.dtts_count)}
									</td>
									<td className="py-3 px-3 text-right tabular-nums font-bold text-slate-900 dark:text-white">
										{formatVietnameseNumber(row.dtts_percentage)}%
									</td>
								</tr>
							))}
						</tbody>
						<tfoot className="bg-slate-100/80 dark:bg-slate-800/80 font-black text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-700">
							<tr className="text-[13px]">
								<td
									colSpan={2}
									className="py-3.5 px-4 text-center font-black uppercase tracking-wider"
								>
									TỔNG CỘNG TOÀN XÃ
								</td>
								<td className="py-3.5 px-3 text-right font-black tabular-nums border-r border-slate-200 dark:border-slate-700">
									{formatVietnameseNumber(villageTotals.totalHh)}
								</td>
								<td className="py-3.5 px-3 text-right font-black tabular-nums border-r border-slate-200 dark:border-slate-700">
									{formatVietnameseNumber(villageTotals.totalCit)}
								</td>
								<td className="py-3.5 px-3 text-right font-black tabular-nums border-r border-slate-200 dark:border-slate-700">
									{formatVietnameseNumber(villageTotals.totalMale)}
								</td>
								<td className="py-3.5 px-3 text-right font-black tabular-nums border-r border-slate-200 dark:border-slate-700">
									{formatVietnameseNumber(villageTotals.totalFemale)}
								</td>
								<td className="py-3.5 px-3 text-right font-black tabular-nums border-r border-slate-200 dark:border-slate-700">
									{formatVietnameseNumber(villageTotals.totalDtts)}
								</td>
								<td className="py-3.5 px-3 text-right font-black tabular-nums">
									{formatVietnameseNumber(villageTotals.dttsPct)}%
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>
		</div>
	);
};
