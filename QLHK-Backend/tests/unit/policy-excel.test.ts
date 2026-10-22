import { describe, expect, it, vi } from "vitest";
import { importPolicyExcel } from "../../src/controllers/policyExcel.controller";
import { prisma } from "../../src/config/prisma";

vi.mock("../../src/config/prisma", () => ({
  prisma: {
    chuctho_profiles: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    htxh_profiles: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("Policy Excel Controller", () => {
  const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.setHeader = vi.fn();
    res.end = vi.fn();
    return res;
  };

  it("imports chuctho profiles from JSON array", async () => {
    const req: any = {
      body: {
        profiles: [
          { name: "Cụ A", dob: "1944", village_id: "v-1" },
          { name: "Cụ B", dob: "1934", village_id: "v-1" },
        ],
        type: "chuctho",
        villageId: "v-1",
        calculationYear: 2024,
      },
      query: {},
      user: { role: "admin" },
    };
    const res = mockRes();
    (prisma.chuctho_profiles.create as any).mockResolvedValue({ id: "p-1" });
    await importPolicyExcel(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, inserted: 2, updated: 0, errorDetails: [] });
    expect(prisma.chuctho_profiles.create).toHaveBeenCalledTimes(2);
  });

  it("imports htxh profiles from JSON array", async () => {
    const req: any = {
      body: {
        profiles: [
          { name: "Bác C", dob: "1948", village_id: "v-1", bao_tro: "x" },
        ],
        type: "htxh",
        villageId: "v-1",
        calculationYear: 2024,
      },
      query: {},
      user: { role: "admin" },
    };
    const res = mockRes();
    (prisma.htxh_profiles.create as any).mockResolvedValue({ id: "h-1" });
    await importPolicyExcel(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, inserted: 1, updated: 0, errorDetails: [] });
  });

  it("returns 400 when neither file nor profiles array is present", async () => {
    const req: any = { body: {}, query: {}, user: { role: "admin" } };
    const res = mockRes();
    await importPolicyExcel(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
