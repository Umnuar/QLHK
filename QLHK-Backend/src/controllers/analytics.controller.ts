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
		]);

		// 1. Tỷ lệ Nam / Nữ
		let maleCount = 0;
		let femaleCount = 0;
		genderGroups.forEach((g) => {
			if (g.gender === "Nữ") {
				femaleCount += g._count._all;
			} else {
				maleCount += g._count._all;
			}
		});

		const genderStats = {
			male: {
				count: maleCount,
				percentage:
					totalCitizens > 0
						? Number(((maleCount / totalCitizens) * 100).toFixed(1))
						: 0,
			},
			female: {
				count: femaleCount,
				percentage:
					totalCitizens > 0
						? Number(((femaleCount / totalCitizens) * 100).toFixed(1))
						: 0,
			},
		};

		// 2. Cơ cấu theo dân tộc (bao gồm 14 dân tộc)
		const ethnicityCounts: Record<string, number> = {};
		DAKHA_ETHNICITIES.forEach((eth) => {
			ethnicityCounts[eth] = 0;
		});
		ethnicityGroups.forEach((g) => {
			const eth = g.ethnicity?.trim() || "Kinh";
			ethnicityCounts[eth] = (ethnicityCounts[eth] || 0) + g._count._all;
		});

		const ethnicityDistribution = Object.entries(ethnicityCounts)
			.map(([name, count]) => ({
				name,
				count,
				percentage:
					totalCitizens > 0
						? Number(((count / totalCitizens) * 100).toFixed(1))
						: 0,
			}))
			.sort((a, b) => b.count - a.count);

		// 3. Cơ cấu tôn giáo
		const religionCounts: Record<string, number> = {};
		religionGroups.forEach((g) => {
			const rel = g.religion?.trim() || "Không";
			religionCounts[rel] = (religionCounts[rel] || 0) + g._count._all;
		});

		const religionDistribution = Object.entries(religionCounts)
			.map(([name, count]) => ({
				name,
				count,
				percentage:
					totalCitizens > 0
						? Number(((count / totalCitizens) * 100).toFixed(1))
						: 0,
			}))
			.sort((a, b) => b.count - a.count);

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
