import { describe, expect, it, vi } from "vitest";
import { clearPolicyAnalyticsCache, getPolicyAnalytics } from "../../src/controllers/policyAnalytics.controller";
import { prisma } from "../../src/config/prisma";

vi.mock("../../src/config/prisma", () => ({
  prisma: {
    chuctho_profiles: { findMany: vi.fn() },
    htxh_profiles: { findMany: vi.fn() },
    villages: { findMany: vi.fn() },
  },
}));

describe("Policy Analytics Controller", () => {
  const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it("aggregates policy statistics and serves from in-memory cache", async () => {
    clearPolicyAnalyticsCache();
    (prisma.chuctho_profiles.findMany as any).mockResolvedValue([{ received: true, village_id: "v-1", age70: "x" }, { received: false, village_id: "v-1", age80: "x" }]);
    (prisma.htxh_profiles.findMany as any).mockResolvedValue([{ received: true, village_id: "v-1", age75plus: "x" }]);
    (prisma.villages.findMany as any).mockResolvedValue([{ id: "v-1", name: "Thôn 1" }]);

    const req: any = { query: { calculation_year: "2024" }, user: { role: "admin" } };
    const res1 = mockRes();
    await getPolicyAnalytics(req, res1);
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ chuctho: expect.objectContaining({ total: 2 }), htxh: expect.objectContaining({ total: 1 }) }) }));

    const res2 = mockRes();
    await getPolicyAnalytics(req, res2);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ cached: true }));
  });
});
