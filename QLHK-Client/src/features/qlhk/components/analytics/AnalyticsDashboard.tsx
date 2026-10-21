import {
	ArrowLeft,
	BarChart3,
	Building2,
	Download,
	PieChart,
	Shield,
	Users,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadXlsx } from "@/utils/fileExport";
import { useApp } from "@/AppContext";
import {
	type AnalyticsOverviewData,
	analyticsApi,
	type VillageAnalyticsRow,
} from "@/api/analyticsApi";
import { useHouseholds } from "@/context/HouseholdContext";
import { ETHNIC_GROUPS } from "@/data/constants";
import { getCache, setCache } from "@/db/indexedDB";
import { sanitizeExcelRow } from "@/utils/excelParser";
import { parseAndValidateDob } from "@/utils/date";
import {
	DEFAULT_STAT_ACCENT,
	STAT_CATEGORY_COLORS,
} from "@/components/common/statStyles";
import {
	TABLE_HEADER_CLASSES,
	VILLAGE_BADGE_CLASS,
	calculatePercentagesWithLargestRemainder,
	formatVietnameseNumber,
} from "@/components/common/tableStyles";
import { DistributionCard } from "@/components/analytics/DistributionCard";
import type { Segment } from "@/components/analytics/DonutChart";
import { KpiRow } from "./KpiRow";
import { WelfareCard } from "./WelfareCard";

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

	const [isUsingCachedData, setIsUsingCachedData] = useState(false);
	const [apiOverview, setApiOverview] = useState<AnalyticsOverviewData | null>(
		null,
	);
	const [apiVillageBreakdown, setApiVillageBreakdown] = useState<
		VillageAnalyticsRow[] | null
	>(null);

	const computedVillageBreakdown = useMemo(() => {
		type VillageBreakdownAcc = {
			household_count: number;
			citizen_count: number;
			male_count: number;
			female_count: number;
			dtts_count: number;
		};

		const villageStatsMap = new Map<string, VillageBreakdownAcc>();
		for (const v of villages) {
			villageStatsMap.set(v.id, {
				household_count: 0,
				citizen_count: 0,
				male_count: 0,
				female_count: 0,
				dtts_count: 0,
			});
		}

		for (const h of activeHouseholds) {
			const acc = villageStatsMap.get(h.village_id);
			if (acc) {
				acc.household_count++;
				for (const m of (h.members || [])) {
					acc.citizen_count++;
					if (m.gender === "Nam") acc.male_count++;
					if (m.gender === "Nữ") acc.female_count++;
					if (m.ethnicity !== "Kinh") acc.dtts_count++;
				}
			}
		}

		return villages.map((v) => {
			const acc = villageStatsMap.get(v.id) || {
				household_count: 0,
				citizen_count: 0,
				male_count: 0,
				female_count: 0,
				dtts_count: 0,
			};

			const minPct =
				acc.citizen_count > 0
					? Math.round((acc.dtts_count / acc.citizen_count) * 1000) / 10
					: 0;

			return {
				village_id: v.id,
				village_name: v.name,
				village_code: v.short_code,
				household_count: acc.household_count,
				citizen_count: acc.citizen_count,
				male_count: acc.male_count,
				female_count: acc.female_count,
				dtts_count: acc.dtts_count,
				dtts_percentage: minPct,
				top_ethnicity: "Kinh",
				top_religion: "Không",
			};
		});
	}, [activeHouseholds, villages]);

	const localCalculated = useMemo(() => {
		const filtered = selectedVillageId
			? activeHouseholds.filter((h) => h.village_id === selectedVillageId)
			: activeHouseholds;

		const totalHouseholds = filtered.length;
		let totalMembers = 0;
		let maleCount = 0;
		let femaleCount = 0;
		let minorityCount = 0;

		let under16Count = 0;
		let youthCount = 0;
		let adultCount = 0;
		let over60Count = 0;
		let unknownAgeCount = 0;
		let legalWorkforceCount = 0;
		const currentYear = new Date().getFullYear();

		const ethnicMap: Record<string, number> = {};
		const religionMap: Record<string, number> = {};
		const militaryMap: Record<string, number> = {};
		const educationMap: Record<string, number> = {};
		const occupationMap: Record<string, number> = {};

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

				if (m.military_status?.trim()) {
					const mil = m.military_status.trim();
					militaryMap[mil] = (militaryMap[mil] || 0) + 1;
				}

				if (m.education?.trim()) {
					const edu = m.education.trim();
					educationMap[edu] = (educationMap[edu] || 0) + 1;
				}

				if (m.occupation?.trim()) {
					const occ = m.occupation.trim();
					occupationMap[occ] = (occupationMap[occ] || 0) + 1;
				}

				let age: number | undefined =
					typeof m.birth_year === "number" && m.birth_year > 1900
						? currentYear - m.birth_year
						: typeof m.age === "number" && m.age > 0
							? m.age
							: undefined;

				if (age === undefined) {
					const dobVal = m.dob_formatted || m.dob_raw || m.dob || "";
					const parsed = parseAndValidateDob(dobVal);
					if (parsed.isValid && parsed.birthYear) {
						age = currentYear - parsed.birthYear;
					} else {
						const match = dobVal.match(/(?:^|\D)(\d{4})(?:\D|$)/);
						if (match) {
							age = currentYear - parseInt(match[1], 10);
						}
					}
				}
				if (typeof age === "number" && !isNaN(age)) {
					if (age < 16) {
						under16Count++;
					} else if (age <= 27) {
						youthCount++;
					} else if (age <= 60) {
						adultCount++;
					} else {
						over60Count++;
					}

					if (age >= 18 && age <= 60) {
						legalWorkforceCount++;
					}
				} else {
					unknownAgeCount++;
				}
			});
		});

		const genderDistribution = calculatePercentagesWithLargestRemainder(
			[
				{ id: "male", count: maleCount },
				{ id: "female", count: femaleCount },
			],
			totalMembers,
		);
		const malePct =
			genderDistribution.find((g) => g.id === "male")?.percentage || 0;
		const femalePct =
			genderDistribution.find((g) => g.id === "female")?.percentage || 0;
		const minorityPct =
			totalMembers > 0
				? Math.round((minorityCount / totalMembers) * 1000) / 10
				: 0;

		const rawAgeList = [
			{ id: "under16", label: "Thiếu nhi (< 16 tuổi)", count: under16Count },
			{
				id: "youth",
				label: "Thanh niên & NVQS (16 - 27 tuổi)",
				count: youthCount,
			},
			{ id: "adult", label: "Lao động chính (28 - 60 tuổi)", count: adultCount },
			{ id: "over60", label: "Người cao tuổi (> 60 tuổi)", count: over60Count },
		];
		if (unknownAgeCount > 0) {
			rawAgeList.push({
				id: "unknownAge",
				label: "Chưa rõ năm sinh",
				count: unknownAgeCount,
			});
		}

		const ageDistribution = calculatePercentagesWithLargestRemainder(
			rawAgeList,
			totalMembers,
		);
		const agePctMap = Object.fromEntries(
			ageDistribution.map((a) => [a.id, a.percentage]),
		);
		const legalWorkforcePct =
			totalMembers > 0
				? Number(((legalWorkforceCount / totalMembers) * 100).toFixed(1))
				: 0;

		const ageStats = {
			under16: {
				count: under16Count,
				percentage: agePctMap.under16 || 0,
			},
			youth: {
				count: youthCount,
				percentage: agePctMap.youth || 0,
			},
			militaryAge: {
				count: youthCount,
				percentage: agePctMap.youth || 0,
			},
			adult: {
				count: adultCount,
				percentage: agePctMap.adult || 0,
			},
			workingAge: {
				count: adultCount,
				percentage: agePctMap.adult || 0,
			},
			over60: {
				count: over60Count,
				percentage: agePctMap.over60 || 0,
			},
			unknownAge: {
				count: unknownAgeCount,
				percentage: agePctMap.unknownAge || 0,
			},
			legalWorkforce: {
				count: legalWorkforceCount,
				percentage: legalWorkforcePct,
			},
		};

		const rawMilitary = Object.entries(militaryMap)
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count);
		const totalMilitary = rawMilitary.reduce((s, g) => s + g.count, 0);
		const militaryList = calculatePercentagesWithLargestRemainder(
			rawMilitary,
			totalMilitary,
		);

		const rawEducation = Object.entries(educationMap)
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count);
		const totalEducation = rawEducation.reduce((s, g) => s + g.count, 0);
		const educationList = calculatePercentagesWithLargestRemainder(
			rawEducation,
			totalEducation,
		);

		const rawOccupation = Object.entries(occupationMap)
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count);
		const totalOccupation = rawOccupation.reduce((s, g) => s + g.count, 0);
		const occupationList = calculatePercentagesWithLargestRemainder(
			rawOccupation,
			totalOccupation,
		);

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
				ageStats,
				militaryList,
				educationList,
				occupationList,
			},
			villageBreakdown: computedVillageBreakdown,
		};
	}, [activeHouseholds, selectedVillageId, computedVillageBreakdown]);

	const fetchAnalytics = useCallback(async () => {
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
		}
	}, [selectedVillageId, isBackendHealthy]);

	useEffect(() => {
		fetchAnalytics();
	}, [fetchAnalytics]);

	useEffect(() => {
		const handleReconnected = () => {
			fetchAnalytics();
		};
		window.addEventListener("server:reconnected", handleReconnected);
		return () =>
			window.removeEventListener("server:reconnected", handleReconnected);
	}, [fetchAnalytics]);

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

			let minorityCount = 0;
			(apiOverview.ethnicities || []).forEach((e) => {
				if (e.name !== "Kinh") minorityCount += e.count;
			});
			const minorityPct =
				totalMembers > 0
					? Math.round((minorityCount / totalMembers) * 1000) / 10
					: 0;

			const ageStats = {
				under16:
					apiOverview.ageGroups?.under16 ||
					(apiOverview.ageGroups as any)?.under6 ||
					localCalculated.stats.ageStats.under16,
				youth:
					apiOverview.ageGroups?.youth ||
					apiOverview.ageGroups?.militaryAge ||
					localCalculated.stats.ageStats.youth,
				militaryAge:
					apiOverview.ageGroups?.militaryAge ||
					(apiOverview.ageGroups as any)?.from6to17 ||
					apiOverview.ageGroups?.youth ||
					localCalculated.stats.ageStats.militaryAge,
				adult:
					apiOverview.ageGroups?.adult ||
					apiOverview.ageGroups?.workingAge ||
					localCalculated.stats.ageStats.adult,
				workingAge:
					apiOverview.ageGroups?.workingAge ||
					(apiOverview.ageGroups as any)?.from18to60 ||
					apiOverview.ageGroups?.adult ||
					localCalculated.stats.ageStats.workingAge,
				over60:
					apiOverview.ageGroups?.over60 ||
					localCalculated.stats.ageStats.over60,
				unknownAge:
					apiOverview.ageGroups?.unknownAge ||
					localCalculated.stats.ageStats.unknownAge,
				legalWorkforce:
					apiOverview.ageGroups?.legalWorkforce ||
					localCalculated.stats.ageStats.legalWorkforce,
			};

			const militaryList =
				apiOverview.military && apiOverview.military.length > 0
					? apiOverview.military
					: localCalculated.stats.militaryList;

			const educationList =
				apiOverview.educations && apiOverview.educations.length > 0
					? apiOverview.educations
					: localCalculated.stats.educationList;

			const occupationList =
				apiOverview.occupations && apiOverview.occupations.length > 0
					? apiOverview.occupations
					: localCalculated.stats.occupationList;

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
				ageStats,
				militaryList,
				educationList,
				occupationList,
			};
		}
		return localCalculated.stats;
	}, [apiOverview, localCalculated.stats]);

	const villageBreakdown = useMemo(() => {
		if (apiVillageBreakdown && apiVillageBreakdown.length > 0) {
			return apiVillageBreakdown;
		}
		return computedVillageBreakdown;
	}, [apiVillageBreakdown, computedVillageBreakdown]);

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

	const ethnicSegments: Segment[] = useMemo(() => {
		const colors = [
			"#14b8a6",
			"#38bdf8",
			"#f59e0b",
			"#a855f7",
			"#ec4899",
			"#06b6d4",
			"#10b981",
			"#84cc16",
			"#eab308",
			"#f97316",
			"#ef4444",
			"#6366f1",
			"#8b5cf6",
			"#d946ef",
		];

		if (apiOverview?.ethnicities && apiOverview.ethnicities.length > 0) {
			const active = apiOverview.ethnicities.filter((e) => e.count > 0);
			const source = active.length > 0 ? active : apiOverview.ethnicities;
			const withPcts = calculatePercentagesWithLargestRemainder(
				source,
				stats.totalMembers,
			);
			return withPcts.map((e, idx) => ({
				id: e.name,
				label: e.name.startsWith("Dân tộc") ? e.name : `Dân tộc ${e.name}`,
				count: e.count,
				pct: e.percentage,
				color: colors[idx % colors.length],
			}));
		}

		const rawEthnicList = ETHNIC_GROUPS.map((eth) => ({
			name: eth,
			count: stats.ethnicMap[eth] || 0,
		})).filter((e) => e.count > 0);

		const withPcts = calculatePercentagesWithLargestRemainder(
			rawEthnicList.length > 0
				? rawEthnicList
				: ETHNIC_GROUPS.map((eth) => ({ name: eth, count: 0 })),
			stats.totalMembers,
		);

		return withPcts.map((eth, idx) => ({
			id: eth.name,
			label: `Dân tộc ${eth.name}`,
			count: eth.count,
			pct: eth.percentage,
			color: colors[idx % colors.length],
		}));
	}, [apiOverview?.ethnicities, stats.totalMembers, stats.ethnicMap]);

	const religionSegments: Segment[] = useMemo(() => {
		const rawItems = religionDetails.list
			.filter((it) => it.value > 0)
			.map((it) => ({
				id: it.label,
				label: it.label,
				count: it.value,
				color: it.color,
			}));

		const targetList =
			rawItems.length > 0
				? rawItems
				: religionDetails.list.map((it) => ({
						id: it.label,
						label: it.label,
						count: it.value,
						color: it.color,
					}));

		const withPcts = calculatePercentagesWithLargestRemainder(
			targetList,
			stats.totalMembers,
		);

		return withPcts.map((it) => ({
			id: it.id,
			label: it.label,
			count: it.count,
			pct: it.percentage,
			color: it.color,
		}));
	}, [religionDetails.list, stats.totalMembers]);

	const ageSegments: Segment[] = useMemo(() => {
		const segments: Segment[] = [
			{
				id: "under16",
				label: "Thiếu nhi (< 16 tuổi)",
				count: stats.ageStats.under16?.count || 0,
				pct: stats.ageStats.under16?.percentage || 0,
				color: STAT_CATEGORY_COLORS.cat1,
			},
			{
				id: "militaryAge",
				label: "Thanh niên & NVQS (16 - 27 tuổi)",
				count: stats.ageStats.militaryAge?.count || 0,
				pct: stats.ageStats.militaryAge?.percentage || 0,
				color: STAT_CATEGORY_COLORS.cat2,
			},
			{
				id: "workingAge",
				label: "Lao động chính (28 - 60 tuổi)",
				count: stats.ageStats.workingAge?.count || 0,
				pct: stats.ageStats.workingAge?.percentage || 0,
				color: STAT_CATEGORY_COLORS.cat3,
			},
			{
				id: "over60",
				label: "Người cao tuổi (> 60 tuổi)",
				count: stats.ageStats.over60?.count || 0,
				pct: stats.ageStats.over60?.percentage || 0,
				color: STAT_CATEGORY_COLORS.cat4,
			},
		];

		if (stats.ageStats.unknownAge && stats.ageStats.unknownAge.count > 0) {
			segments.push({
				id: "unknownAge",
				label: "Chưa rõ năm sinh",
				count: stats.ageStats.unknownAge.count,
				pct: stats.ageStats.unknownAge.percentage,
				color: "#64748b",
			});
		}

		return segments;
	}, [stats.ageStats]);

	const handleExportStatsExcel = async () => {
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
			const sanitizedAoaData = aoaData.map(sanitizeExcelRow);
			const XLSX = await loadXlsx();
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
			className="space-y-3.5 sm:space-y-4 animate-in fade-in"
			style={{ "--stat-accent": DEFAULT_STAT_ACCENT } as React.CSSProperties}
		>
			<div className="bg-white dark:bg-slate-900 px-4 py-3 sm:py-3.5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors duration-150">
				<div>
					<div className="flex items-center gap-2.5 flex-wrap">
						<span className={VILLAGE_BADGE_CLASS}>
							{selectedVillageName || "Toàn xã Đăk Hà"}
						</span>

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
				</div>
			</div>

			<KpiRow
				totalHouseholds={stats.totalHouseholds}
				totalMembers={stats.totalMembers}
				maleCount={stats.maleCount}
				femaleCount={stats.femaleCount}
				malePct={stats.malePct}
				femalePct={stats.femalePct}
				minorityCount={stats.minorityCount}
				minorityPct={stats.minorityPct}
			/>

			<div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
				<DistributionCard
					icon={<PieChart className="size-4" />}
					title="Phân Bổ Dân Tộc Địa Bàn Đăk Hà"
					badge={`${ETHNIC_GROUPS.length} dân tộc`}
					segments={ethnicSegments}
					centerValue={`${formatVietnameseNumber(stats.minorityPct)}%`}
					centerLabel="Dân tộc thiểu số"
				/>

				<DistributionCard
					icon={<Shield className="size-4" />}
					title="Cơ Cấu Tín Ngưỡng & Tôn Giáo"
					badge="5 nhóm"
					segments={religionSegments}
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
					centerLabel="Người có tôn giáo"
				/>

				<DistributionCard
					icon={<Users className="size-4" />}
					title="Tháp Tuổi & Cơ Cấu Thế Hệ"
					badge={`${ageSegments.length} nhóm tuổi`}
					segments={ageSegments}
					centerValue={`${formatVietnameseNumber(stats.ageStats.legalWorkforce?.percentage ?? stats.ageStats.workingAge?.percentage ?? 0)}%`}
					centerLabel="Độ tuổi lao động (18 - 60)"
					digits={1}
				/>

				<WelfareCard
					militaryList={stats.militaryList}
					educationList={stats.educationList}
					occupationList={stats.occupationList}
					totalMembers={stats.totalMembers}
				/>
			</div>

			<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors duration-150">
				<div className="p-3 sm:px-4 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs">
					<div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-bold">
						<Building2
							className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
							strokeWidth={1.75}
						/>
						<span>Bảng Thống Kê So Sánh Giữa Các Thôn</span>
					</div>
					<span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
						{villages.length} thôn đơn vị hành chính
					</span>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead className={TABLE_HEADER_CLASSES.thead}>
							<tr className={TABLE_HEADER_CLASSES.row}>
								<th className={`${TABLE_HEADER_CLASSES.thCenter} w-14`}>
									STT
								</th>
								<th className={`${TABLE_HEADER_CLASSES.th} min-w-[180px]`}>
									Tên Thôn
								</th>
								<th className={TABLE_HEADER_CLASSES.thRight}>
									Số Hộ
								</th>
								<th className={TABLE_HEADER_CLASSES.thRight}>
									Tổng Nhân Khẩu
								</th>
								<th className={TABLE_HEADER_CLASSES.thRight}>
									Nam
								</th>
								<th className={TABLE_HEADER_CLASSES.thRight}>
									Nữ
								</th>
								<th className={TABLE_HEADER_CLASSES.thRight}>
									Đồng Bào DTTS
								</th>
								<th className={TABLE_HEADER_CLASSES.thRight}>
									Tỷ Lệ DTTS
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
							{villageBreakdown.map((row, idx) => (
								<tr
									key={row.village_id}
									className="h-[52px] bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors text-[14px]"
								>
									<td className="py-3.5 px-3 text-center text-slate-500 dark:text-slate-400 tabular-nums font-medium text-[14px]">
										{idx + 1}
									</td>
									<td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 text-[14px] whitespace-nowrap">
										{row.village_name}
									</td>
									<td className="py-3.5 px-3 text-right tabular-nums font-medium text-slate-900 dark:text-slate-100 text-[14px]">
										{formatVietnameseNumber(row.household_count)}
									</td>
									<td className="py-3.5 px-3 text-right tabular-nums font-medium text-slate-900 dark:text-slate-100 text-[14px]">
										{formatVietnameseNumber(row.citizen_count)}
									</td>
									<td className="py-3.5 px-3 text-right tabular-nums font-medium text-slate-600 dark:text-slate-300 text-[14px]">
										{formatVietnameseNumber(row.male_count)}
									</td>
									<td className="py-3.5 px-3 text-right tabular-nums font-medium text-slate-600 dark:text-slate-300 text-[14px]">
										{formatVietnameseNumber(row.female_count)}
									</td>
									<td className="py-3.5 px-3 text-right tabular-nums font-medium text-slate-900 dark:text-slate-100 text-[14px]">
										{formatVietnameseNumber(row.dtts_count)}
									</td>
									<td className="py-3.5 px-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400 text-[14px]">
										{formatVietnameseNumber(row.dtts_percentage)}%
									</td>
								</tr>
							))}
						</tbody>
						<tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-700 text-[14px]">
							<tr className="h-[52px]">
								<td
									colSpan={2}
									className="py-3.5 px-4 text-center font-bold uppercase tracking-wider text-[13px] text-slate-700 dark:text-slate-200"
								>
									TỔNG CỘNG TOÀN XÃ
								</td>
								<td className="py-3.5 px-3 text-right font-bold tabular-nums text-[14px]">
									{formatVietnameseNumber(villageTotals.totalHh)}
								</td>
								<td className="py-3.5 px-3 text-right font-bold tabular-nums text-[14px]">
									{formatVietnameseNumber(villageTotals.totalCit)}
								</td>
								<td className="py-3.5 px-3 text-right font-bold tabular-nums text-[14px]">
									{formatVietnameseNumber(villageTotals.totalMale)}
								</td>
								<td className="py-3.5 px-3 text-right font-bold tabular-nums text-[14px]">
									{formatVietnameseNumber(villageTotals.totalFemale)}
								</td>
								<td className="py-3.5 px-3 text-right font-bold tabular-nums text-[14px]">
									{formatVietnameseNumber(villageTotals.totalDtts)}
								</td>
								<td className="py-3.5 px-3 text-right font-bold tabular-nums text-[14px] text-emerald-600 dark:text-emerald-400">
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
