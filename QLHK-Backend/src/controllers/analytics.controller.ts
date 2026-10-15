import type { Response } from "express";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middlewares/auth.middleware";

/**
 * 14 dân tộc đặc thù theo danh mục hệ sinh thái Xã Đăk Hà
 */
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

/**
 * Thuật toán Hare-Niemeyer (Largest Remainder Method)
 * Đảm bảo tổng các phần trăm luôn bằng chính xác 100.0% (với 1 chữ số thập phân)
 */
export function calculatePercentagesWithLargestRemainder<T extends { count: number }>(
	items: T[],
	totalOverride?: number,
): (T & { percentage: number })[] {
	const total =
		totalOverride !== undefined
			? totalOverride
			: items.reduce((sum, item) => sum + item.count, 0);

	if (total <= 0 || items.length === 0) {
		return items.map((item) => ({ ...item, percentage: 0 }));
	}

	const TARGET_SUM = 1000;
	let currentSum = 0;

	const calculations = items.map((item, idx) => {
		if (item.count <= 0) {
			return { idx, floorTenths: 0, remainder: 0, original: item };
		}
		const rawTenths = (item.count / total) * TARGET_SUM;
		const floorTenths = Math.floor(rawTenths);
		const remainder = rawTenths - floorTenths;
		currentSum += floorTenths;
		return { idx, floorTenths, remainder, original: item };
	});

	const diff = TARGET_SUM - currentSum;
	if (diff > 0 && diff < items.length) {
		const eligible = calculations
			.filter((c) => c.original.count > 0)
			.sort((a, b) => b.remainder - a.remainder);

		for (let i = 0; i < diff && i < eligible.length; i++) {
			eligible[i].floorTenths += 1;
		}
	}

	calculations.sort((a, b) => a.idx - b.idx);
	return calculations.map((c) => ({
		...c.original,
		percentage: Number((c.floorTenths / 10).toFixed(1)),
	}));
}

/**
 * GET /api/analytics/overview
 * Tổng số hộ, tổng nhân khẩu, tỷ lệ nam/nữ, cơ cấu theo 14 dân tộc, cơ cấu tôn giáo
 */
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

		// 1. Tỷ lệ Nam / Nữ (Chuẩn 100.0%)
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

		// 2. Cơ cấu theo dân tộc (bao gồm 14 dân tộc chuẩn 100.0%)
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

		// 3. Cơ cấu tôn giáo (Chuẩn 100.0%)
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

		// 4. Thống kê theo Dải tuổi (Tháp tuổi MECE chuẩn 100.0%)
		const currentYear = new Date().getFullYear();
		let under16Count = 0; // < 16 tuổi (Thiếu nhi)
		let youthCount = 0; // 16 - 27 tuổi (Thanh niên & NVQS)
		let adultCount = 0; // 28 - 60 tuổi (Lao động chính)
		let over60Count = 0; // > 60 tuổi (Người cao tuổi)
		let unknownAgeCount = 0; // Chưa rõ năm sinh
		let workingAgeCount = 0; // 18 - 60 tuổi (Độ tuổi LĐ theo luật, hiển thị ở tâm Donut)

		dobList.forEach((c) => {
			if (!c.dob) {
				unknownAgeCount++;
				return;
			}
			const trimmed = c.dob.trim();
			const match = trimmed.match(/(\d{4})$/);
			if (match) {
				const birthYear = parseInt(match[1], 10);
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

		// 5. Thống kê Tình hình NVQS (Chuẩn 100.0% trên số người có khai báo)
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

		// 6. Thống kê Trình độ học vấn (Chuẩn 100.0% trên số người có khai báo)
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

		// 7. Thống kê Cơ cấu Nghề nghiệp (Chuẩn 100.0% trên số người có khai báo)
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

/**
 * GET /api/analytics/by-village
 * Bảng thống kê so sánh giữa các thôn
 */
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
			include: {
				households: {
					where: { is_deleted: false },
					include: {
						citizens: {
							where: { is_deleted: false },
							select: { gender: true, ethnicity: true, religion: true },
						},
					},
				},
			},
		});

		const villageStats = villages.map((v) => {
			const households = v.households;
			const householdCount = households.length;

			let citizenCount = 0;
			let maleCount = 0;
			let femaleCount = 0;
			let dttsCount = 0;
			const ethnicityMap: Record<string, number> = {};
			const religionMap: Record<string, number> = {};

			households.forEach((h) => {
				h.citizens.forEach((c) => {
					citizenCount++;
					if (c.gender === "Nữ") femaleCount++;
					else maleCount++;

					const eth = c.ethnicity?.trim() || "Kinh";
					if (eth !== "Kinh") dttsCount++;
					ethnicityMap[eth] = (ethnicityMap[eth] || 0) + 1;

					const rel = c.religion?.trim() || "Không";
					religionMap[rel] = (religionMap[rel] || 0) + 1;
				});
			});

			// Tìm dân tộc chiếm tỷ lệ cao nhất
			const topEthnicity =
				Object.entries(ethnicityMap).sort((a, b) => b[1] - a[1])[0]?.[0] ||
				"Kinh";
			const topReligion =
				Object.entries(religionMap).sort((a, b) => b[1] - a[1])[0]?.[0] ||
				"Không";

			return {
				village_id: v.id,
				village_name: v.name,
				village_code: v.code,
				household_count: householdCount,
				citizen_count: citizenCount,
				male_count: maleCount,
				female_count: femaleCount,
				dtts_count: dttsCount,
				dtts_percentage:
					citizenCount > 0
						? Number(((dttsCount / citizenCount) * 100).toFixed(1))
						: 0,
				top_ethnicity: topEthnicity,
				top_religion: topReligion,
			};
		});

		res.json({
			success: true,
			data: villageStats,
		});
	} catch (error) {
		console.error("Lỗi getByVillage:", error);
		res.status(500).json({ error: "Lỗi máy chủ khi lấy thống kê theo thôn" });
	}
};
