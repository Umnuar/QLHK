import type { Response } from "express";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middlewares/auth.middleware";

export const DAKHA_ETHNICITIES = [
	"Kinh",
	"Xơ Đăng",
	"Giẻ Triêng",
	"Ba Na",
	"Gia Rai",
	"Ê Đê",
	"Cor",
	"Cơ Ho",
	"Dao",
	"Dìu",
	"Giơ Lâng",
	"Ha Lăng",
	"Hoa",
	"Hrê",
	"Khách Gia",
];

export function calculatePercentagesWithLargestRemainder<T extends { count: number }>(
	items: T[],
	totalOverride?: number,
): (T & { percentage: number })[] {
	const len = items.length;
	if (len === 0) return [];
	let total = totalOverride !== undefined ? totalOverride : 0;
	if (totalOverride === undefined) {
		for (let i = 0; i < len; i++) {
			total += items[i].count;
		}
	}

	if (total <= 0) {
		const zeroResult: (T & { percentage: number })[] = new Array(len);
		for (let i = 0; i < len; i++) {
			zeroResult[i] = { ...items[i], percentage: 0 };
		}
		return zeroResult;
	}

	const TARGET_SUM = 1000;
	let currentSum = 0;
	const floorTenths = new Int32Array(len);
	const remainders = new Float64Array(len);
	const eligibleIndices: number[] = [];

	for (let i = 0; i < len; i++) {
		const count = items[i].count;
		if (count > 0) {
			const rawTenths = (count / total) * TARGET_SUM;
			const f = Math.floor(rawTenths);
			floorTenths[i] = f;
			remainders[i] = rawTenths - f;
			currentSum += f;
			eligibleIndices.push(i);
		}
	}

	const diff = TARGET_SUM - currentSum;
	if (diff > 0 && diff < len && eligibleIndices.length > 0) {
		eligibleIndices.sort((a, b) => remainders[b] - remainders[a]);
		const limit = Math.min(diff, eligibleIndices.length);
		for (let i = 0; i < limit; i++) {
			floorTenths[eligibleIndices[i]] += 1;
		}
	}

	const results: (T & { percentage: number })[] = new Array(len);
	for (let i = 0; i < len; i++) {
		results[i] = {
			...items[i],
			percentage: Number((floorTenths[i] / 10).toFixed(1)),
		};
	}
	return results;
}

export function extractBirthYear(dob: string | null | undefined): number | null {
	if (!dob) return null;
	const len = dob.length;
	let end = len - 1;
	while (end >= 0 && dob.charCodeAt(end) <= 32) {
		end--;
	}
	if (end < 3) return null;
	const c3 = dob.charCodeAt(end);
	const c2 = dob.charCodeAt(end - 1);
	const c1 = dob.charCodeAt(end - 2);
	const c0 = dob.charCodeAt(end - 3);
	if (
		c0 >= 48 && c0 <= 57 &&
		c1 >= 48 && c1 <= 57 &&
		c2 >= 48 && c2 <= 57 &&
		c3 >= 48 && c3 <= 57
	) {
		return (c0 - 48) * 1000 + (c1 - 48) * 100 + (c2 - 48) * 10 + (c3 - 48);
	}
	return null;
}

export const getOverview = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const { villageId } = req.query;
		const targetVillageId = req.user?.village_id || (villageId as string);

		const householdWhere: any = { is_deleted: false };
		const citizenWhere: any = {
			is_deleted: false,
			household: { is_deleted: false },
		};

		if (targetVillageId) {
			householdWhere.village_id = targetVillageId;
			citizenWhere.household = {
				village_id: targetVillageId,
				is_deleted: false,
			};
		}

		const [
			totalHouseholds,
			totalCitizens,
			genderGroups,
			ethnicityGroups,
			religionGroups,
			militaryGroups,
			educationGroups,
			occupationGroups,
			dobList,
		] = await Promise.all([
			prisma.households.count({ where: householdWhere }),
			prisma.citizens.count({ where: citizenWhere }),
			prisma.citizens.groupBy({
				by: ["gender"],
				where: citizenWhere,
				_count: { _all: true },
			}),
			prisma.citizens.groupBy({
				by: ["ethnicity"],
				where: citizenWhere,
				_count: { _all: true },
			}),
			prisma.citizens.groupBy({
				by: ["religion"],
				where: citizenWhere,
				_count: { _all: true },
			}),
			prisma.citizens.groupBy({
				by: ["military_status"],
				where: citizenWhere,
				_count: { _all: true },
			}),
			prisma.citizens.groupBy({
				by: ["education"],
				where: citizenWhere,
				_count: { _all: true },
			}),
			prisma.citizens.groupBy({
				by: ["occupation"],
				where: citizenWhere,
				_count: { _all: true },
			}),
			prisma.citizens.findMany({
				where: citizenWhere,
				select: { dob: true },
			}),
		]);

		let maleCount = 0;
		let femaleCount = 0;
		genderGroups.forEach((g) => {
			if (g.gender === "Nữ") {
				femaleCount += g._count._all;
			} else {
				maleCount += g._count._all;
			}
		});

		const genderDistribution = calculatePercentagesWithLargestRemainder(
			[
				{ id: "male", count: maleCount },
				{ id: "female", count: femaleCount },
			],
			totalCitizens,
		);

		const genderStats = {
			male: {
				count: maleCount,
				percentage:
					genderDistribution.find((g) => g.id === "male")?.percentage || 0,
			},
			female: {
				count: femaleCount,
				percentage:
					genderDistribution.find((g) => g.id === "female")?.percentage || 0,
			},
		};

		const ethnicityCounts: Record<string, number> = {};
		DAKHA_ETHNICITIES.forEach((eth) => {
			ethnicityCounts[eth] = 0;
		});
		ethnicityGroups.forEach((g) => {
			const eth = g.ethnicity?.trim() || "Kinh";
			ethnicityCounts[eth] = (ethnicityCounts[eth] || 0) + g._count._all;
		});

		const rawEthnicList = Object.entries(ethnicityCounts)
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count);

		const ethnicityDistribution = calculatePercentagesWithLargestRemainder(
			rawEthnicList,
			totalCitizens,
		);

		const religionCounts: Record<string, number> = {};
		religionGroups.forEach((g) => {
			const rel = g.religion?.trim() || "Không";
			religionCounts[rel] = (religionCounts[rel] || 0) + g._count._all;
		});

		const rawReligionList = Object.entries(religionCounts)
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count);

		const religionDistribution = calculatePercentagesWithLargestRemainder(
			rawReligionList,
			totalCitizens,
		);

		const currentYear = new Date().getFullYear();
		let under16Count = 0;
		let youthCount = 0;
		let adultCount = 0;
		let over60Count = 0;
		let unknownAgeCount = 0;
		let workingAgeCount = 0;

		dobList.forEach((c) => {
			const birthYear = extractBirthYear(c.dob);
			if (birthYear !== null) {
				const age = currentYear - birthYear;
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
					workingAgeCount++;
				}
			} else {
				unknownAgeCount++;
			}
		});

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

		const agePercentages = calculatePercentagesWithLargestRemainder(
			rawAgeList,
			totalCitizens,
		);

		const agePctMap = Object.fromEntries(
			agePercentages.map((a) => [a.id, a.percentage]),
		);

		const legalWorkforcePct =
			totalCitizens > 0
				? Number(((workingAgeCount / totalCitizens) * 100).toFixed(1))
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
				count: workingAgeCount,
				percentage: legalWorkforcePct,
			},
		};

		const rawMilitary = militaryGroups
			.filter((g) => g.military_status && g.military_status.trim())
			.map((g) => ({
				name: g.military_status!.trim(),
				count: g._count._all,
			}))
			.sort((a, b) => b.count - a.count);

		const totalMilitaryRecorded = rawMilitary.reduce(
			(sum, g) => sum + g.count,
			0,
		);
		const militaryDistribution = calculatePercentagesWithLargestRemainder(
			rawMilitary,
			totalMilitaryRecorded,
		);

		const rawEducation = educationGroups
			.filter((g) => g.education && g.education.trim())
			.map((g) => ({
				name: g.education!.trim(),
				count: g._count._all,
			}))
			.sort((a, b) => b.count - a.count);

		const totalEducationRecorded = rawEducation.reduce(
			(sum, g) => sum + g.count,
			0,
		);
		const educationDistribution = calculatePercentagesWithLargestRemainder(
			rawEducation,
			totalEducationRecorded,
		);

		const rawOccupation = occupationGroups
			.filter((g) => g.occupation && g.occupation.trim())
			.map((g) => ({
				name: g.occupation!.trim(),
				count: g._count._all,
			}))
			.sort((a, b) => b.count - a.count);

		const totalOccupationRecorded = rawOccupation.reduce(
			(sum, g) => sum + g.count,
			0,
		);
		const occupationDistribution = calculatePercentagesWithLargestRemainder(
			rawOccupation,
			totalOccupationRecorded,
		);

		res.json({
			success: true,
			data: {
				totalHouseholds,
				totalCitizens,
				averageHouseholdSize:
					totalHouseholds > 0
						? Number((totalCitizens / totalHouseholds).toFixed(2))
						: 0,
				gender: genderStats,
				ethnicities: ethnicityDistribution,
				religions: religionDistribution,
				ageGroups: ageStats,
				military: militaryDistribution,
				educations: educationDistribution,
				occupations: occupationDistribution,
			},
		});
	} catch (error) {
		console.error("Lỗi getOverview:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi tạo báo cáo tổng quan" });
	}
};

export interface VillageGroupRow {
	village_id: string;
	gender: string;
	ethnicity: string;
	religion: string;
	count: number;
}

export interface VillageSummaryItem {
	id: string;
	name: string;
	code: string | null;
	householdCount: number;
}

export function aggregateVillageStats(
	villages: VillageSummaryItem[],
	groupedRows: VillageGroupRow[],
) {
	const rowsByVillage: Record<string, VillageGroupRow[]> = {};
	for (const r of groupedRows) {
		(rowsByVillage[r.village_id] ??= []).push(r);
	}

	return villages.map((v) => {
		const rows = rowsByVillage[v.id] || [];
		let citizenCount = 0;
		let maleCount = 0;
		let femaleCount = 0;
		let dttsCount = 0;
		const ethnicityMap: Record<string, number> = {};
		const religionMap: Record<string, number> = {};

		for (const r of rows) {
			const count = Number(r.count);
			citizenCount += count;
			if (r.gender === "Nữ") femaleCount += count;
			else maleCount += count;

			const eth = r.ethnicity || "Kinh";
			if (eth !== "Kinh") dttsCount += count;
			ethnicityMap[eth] = (ethnicityMap[eth] || 0) + count;

			const rel = r.religion || "Không";
			religionMap[rel] = (religionMap[rel] || 0) + count;
		}

		const topEthnicity = Object.entries(ethnicityMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "Kinh";
		const topReligion = Object.entries(religionMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "Không";

		return {
			village_id: v.id,
			village_name: v.name,
			village_code: v.code,
			household_count: v.householdCount,
			citizen_count: citizenCount,
			male_count: maleCount,
			female_count: femaleCount,
			dtts_count: dttsCount,
			dtts_percentage: citizenCount > 0 ? Number(((dttsCount / citizenCount) * 100).toFixed(1)) : 0,
			top_ethnicity: topEthnicity,
			top_religion: topReligion,
		};
	});
}

export const getByVillage = async (
	req: AuthRequest,
	res: Response,
): Promise<void> => {
	try {
		const where: any = {};
		if (req.user?.role !== "admin" && req.user?.village_id) {
			where.id = req.user.village_id;
		}

		const villages = await prisma.villages.findMany({
			where,
			orderBy: { name: "asc" },
			select: {
				id: true,
				name: true,
				code: true,
				_count: { select: { households: { where: { is_deleted: false } } } },
			},
		});

		const villageIds = villages.map((v) => v.id);
		if (villageIds.length === 0) {
			res.json({ success: true, data: [] });
			return;
		}

		const groupedRows: VillageGroupRow[] = await prisma.$queryRaw`
			SELECT 
				h.village_id::text AS village_id,
				COALESCE(c.gender, 'Khác') AS gender,
				COALESCE(NULLIF(TRIM(c.ethnicity), ''), 'Kinh') AS ethnicity,
				COALESCE(NULLIF(TRIM(c.religion), ''), 'Không') AS religion,
				COUNT(*)::int AS count
			FROM citizens c
			JOIN households h ON c.household_id = h.id
			WHERE c.is_deleted = false AND h.is_deleted = false AND h.village_id = ANY(${villageIds}::uuid[])
			GROUP BY h.village_id, c.gender, ethnicity, religion
		`;

		res.json({
			success: true,
			data: aggregateVillageStats(
				villages.map((v) => ({ id: v.id, name: v.name, code: v.code, householdCount: v._count.households })),
				groupedRows,
			),
		});
	} catch (error) {
		console.error("Lỗi getByVillage:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi lấy thống kê theo thôn" });
	}
};
