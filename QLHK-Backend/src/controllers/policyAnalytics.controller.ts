import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

const analyticsCache = new Map<string, { data: unknown; expiresAt: number }>();
export const clearPolicyAnalyticsCache = (): void => { analyticsCache.clear(); };

const MILESTONES = ["age60", "age65", "age70", "age75", "age80", "age85", "age90", "age95", "age100", "age_over_100"] as const;
const CATEGORIES = ["age75plus", "age70to74poor", "bao_tro", "huu_tri", "huu_tuat_bao_hiem", "nguoi_co_cong"] as const;

export const getPolicyAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawVillageId = (req.query.village_id || req.query.villageId) as string;
    const villageId = req.user?.role === "admin" ? rawVillageId : req.user?.village_id;
    const rawCalcYear = req.query.calculation_year || req.query.calculationYear;
    const calcYear = rawCalcYear ? parseInt(rawCalcYear as string, 10) : new Date().getFullYear();
    const cacheKey = `${villageId || "all"}-${calcYear}`;
    const cached = analyticsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json({ success: true, data: cached.data, cached: true });
      return;
    }

    const where: Record<string, unknown> = { is_deleted: false, calculation_year: calcYear };
    if (villageId) where.village_id = villageId;

    const [chucthoList, htxhList, villages] = await Promise.all([
      prisma.chuctho_profiles.findMany({ where, select: { received: true, village_id: true, age60: true, age65: true, age70: true, age75: true, age80: true, age85: true, age90: true, age95: true, age100: true, age_over_100: true } }),
      prisma.htxh_profiles.findMany({ where, select: { received: true, village_id: true, age75plus: true, age70to74poor: true, bao_tro: true, huu_tri: true, huu_tuat_bao_hiem: true, nguoi_co_cong: true } }),
      prisma.villages.findMany({ select: { id: true, name: true } }),
    ]);

    const chucthoReceived = chucthoList.filter((c) => c.received).length;
    const chucthoUnreceived = chucthoList.filter((c) => !c.received).length;
    const chuctho = {
      total: chucthoList.length,
      received: chucthoReceived,
      unreceived: chucthoUnreceived,
      pending: chucthoUnreceived,
      rate: chucthoList.length > 0 ? ((chucthoReceived / chucthoList.length) * 100).toFixed(1) : "0.0",
      byMilestone: Object.fromEntries(MILESTONES.map((m) => [m, chucthoList.filter((c) => c[m] === "x").length])),
    };

    const htxhReceived = htxhList.filter((h) => h.received).length;
    const htxhUnreceived = htxhList.filter((h) => !h.received).length;
    const htxh = {
      total: htxhList.length,
      received: htxhReceived,
      unreceived: htxhUnreceived,
      pending: htxhUnreceived,
      rate: htxhList.length > 0 ? ((htxhReceived / htxhList.length) * 100).toFixed(1) : "0.0",
      byCategory: Object.fromEntries(CATEGORIES.map((k) => [k, htxhList.filter((h) => h[k] === "x").length])),
    };

    const byVillage = villages.map((v) => ({
      village_id: v.id, village_name: v.name,
      chucthoCount: chucthoList.filter((c) => c.village_id === v.id).length,
      htxhCount: htxhList.filter((h) => h.village_id === v.id).length,
    }));

    const result = { chuctho, htxh, byVillage };
    analyticsCache.set(cacheKey, { data: result, expiresAt: Date.now() + 10000 });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: "Lỗi tổng hợp thống kê chính sách" });
  }
};
