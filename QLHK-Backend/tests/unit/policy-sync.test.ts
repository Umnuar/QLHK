import { describe, expect, it, vi } from "vitest";
import { calculateChucthoMilestonesForSync } from "../../src/services/policySync.service";
import { syncPolicyData } from "../../src/controllers/policySync.controller";
import * as syncService from "../../src/services/policySync.service";

describe("Policy Sync Service & Controller", () => {
  const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it("calculates correct milestone flags for 5-year brackets", () => {
    expect(calculateChucthoMilestonesForSync(60).age60).toBe("x");
    expect(calculateChucthoMilestonesForSync(64).age60).toBe("x");
    expect(calculateChucthoMilestonesForSync(65).age65).toBe("x");
    expect(calculateChucthoMilestonesForSync(69).age65).toBe("x");
    expect(calculateChucthoMilestonesForSync(70).age70).toBe("x");
    expect(calculateChucthoMilestonesForSync(74).age70).toBe("x");
    expect(calculateChucthoMilestonesForSync(75).age75).toBe("x");
    expect(calculateChucthoMilestonesForSync(79).age75).toBe("x");
    expect(calculateChucthoMilestonesForSync(80).age80).toBe("x");
    expect(calculateChucthoMilestonesForSync(84).age80).toBe("x");
    expect(calculateChucthoMilestonesForSync(85).age85).toBe("x");
    expect(calculateChucthoMilestonesForSync(89).age85).toBe("x");
    expect(calculateChucthoMilestonesForSync(90).age90).toBe("x");
    expect(calculateChucthoMilestonesForSync(94).age90).toBe("x");
    expect(calculateChucthoMilestonesForSync(95).age95).toBe("x");
    expect(calculateChucthoMilestonesForSync(99).age95).toBe("x");
    expect(calculateChucthoMilestonesForSync(100).age100).toBe("x");
    expect(calculateChucthoMilestonesForSync(101).age_over_100).toBe("x");
    expect(calculateChucthoMilestonesForSync(59).age60).toBe("");
  });

  it("invokes syncCitizensToPolicy and returns success response", async () => {
    const spy = vi.spyOn(syncService, "syncCitizensToPolicy").mockResolvedValue({
      chucthoCount: 81,
      htxhCount: 1,
    });
    const req: any = {
      body: { calculationYear: 2026, villageId: "00000000-0000-4000-8000-000000000001" },
      user: { role: "admin" },
    };
    const res = mockRes();
    await syncPolicyData(req, res);

    expect(spy).toHaveBeenCalledWith(2026, "00000000-0000-4000-8000-000000000001");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      chucthoCount: 81,
      htxhCount: 1,
    }));
    spy.mockRestore();
  });

  it("handles sync errors with status 500", async () => {
    const spy = vi.spyOn(syncService, "syncCitizensToPolicy").mockRejectedValue(new Error("Database sync error"));
    const req: any = { body: {}, user: { role: "admin" } };
    const res = mockRes();
    await syncPolicyData(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "Lỗi hệ thống khi đồng bộ chính sách",
    }));
    spy.mockRestore();
  });
});
