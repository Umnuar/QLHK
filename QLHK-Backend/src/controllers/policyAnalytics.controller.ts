import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { computeChucthoMilestones, computeHtxhMilestones, parseDobValue } from "../utils/age";

const analyticsCache = new Map<string, { data: unknown; expiresAt: number }>();
export const clearPolicyAnalyticsCache = (): void => { analyticsCache.clear(); };

const MILESTONES = ["age60", "age65", "age70", "age75", "age80", "age85", "age90", "age95", "age100", "age_over_100"] as const;
const CATEGORIES = ["age75plus", "age70to74poor", "bao_tro", "huu_tri", "huu_tuat_bao_hiem", "nguoi_co_cong"] as const;

export const getPolicyAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawVillageId = (req.query.village_id || req.query.villageId) as string;
    const villageId = req.user?.role === "admin" ? rawVillageId : req.user?.village_id;
    const rawCalcYear = req.query.calculation_year || req.query.calculationYear || req.query.year;
    const calcYear = rawCalcYear ? parseInt(rawCalcYear as string, 10) : new Date().getFullYear();
    const cacheKey = `${villageId || "all"}-${calcYear}`;
    const cached = analyticsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json({ success: true, data: cached.data, cached: true });
      return;
    }

    const where: Record<string, unknown> = { is_deleted: false };
    if (villageId) where.village_id = villageId;

    const [chucthoList, htxhList, villages] = await Promise.all([
      prisma.chuctho_profiles.findMany({ where, select: { received: true, village_id: true, dob: true, age60: true, age65: true, age70: true, age75: true, age80: true, age85: true, age90: true, age95: true, age100: true, age_over_100: true } }),
      prisma.htxh_profiles.findMany({ where, select: { received: true, village_id: true, dob: true, age75plus: true, age70to74poor: true, bao_tro: true, huu_tri: true, huu_tuat_bao_hiem: true, nguoi_co_cong: true } }),
      prisma.villages.findMany({ select: { id: true, name: true } }),
    ]);

    const chucthoComputed = chucthoList.map((c) => {
      let ms: Record<string, string> = { age60: "", age65: "", age70: "", age75: "", age80: "", age85: "", age90: "", age95: "", age100: "", age_over_100: "" };
      if (c.dob) {
        const parsed = parseDobValue(c.dob);
        if (parsed) {
          const age = calcYear - parsed.year;
          if (age >= 60) ms = computeChucthoMilestones(age) as any;
        }
      }
      return { ...c, ...ms };
    });

    const htxhComputed = htxhList.map((h) => {
      let ms: Record<string, string> = { age75plus: "", age70to74poor: "", bao_tro: h.bao_tro || "", huu_tri: h.huu_tri || "", huu_tuat_bao_hiem: h.huu_tuat_bao_hiem || "", nguoi_co_cong: h.nguoi_co_cong || "" };
      if (h.dob) {
        const parsed = parseDobValue(h.dob);
        if (parsed) {
          ms = computeHtxhMilestones(parsed.year, calcYear, h) as any;
        }
      }
      return { ...h, ...ms };
    });

    const chucthoReceived = chucthoComputed.filter((c) => c.received).length;
    const chucthoUnreceived = chucthoComputed.filter((c) => !c.received).length;
    const chuctho = {
      total: chucthoComputed.length,
      received: chucthoReceived,
      unreceived: chucthoUnreceived,
      pending: chucthoUnreceived,
      rate: chucthoComputed.length > 0 ? ((chucthoReceived / chucthoComputed.length) * 100).toFixed(1) : "0.0",
      byMilestone: Object.fromEntries(MILESTONES.map((m) => [m, chucthoComputed.filter((c) => (c as any)[m] === "x").length])),
    };

    const htxhReceived = htxhComputed.filter((h) => h.received).length;
    const htxhUnreceived = htxhComputed.filter((h) => !h.received).length;
    const htxh = {
      total: htxhComputed.length,
      received: htxhReceived,
      unreceived: htxhUnreceived,
      pending: htxhUnreceived,
      rate: htxhComputed.length > 0 ? ((htxhReceived / htxhComputed.length) * 100).toFixed(1) : "0.0",
      byCategory: Object.fromEntries(CATEGORIES.map((k) => [k, htxhComputed.filter((h) => (h as any)[k] === "x").length])),
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
