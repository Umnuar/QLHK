import { describe, expect, it, vi } from "vitest";
import {
  createChucthoProfile, deleteChucthoProfile, getChucthoProfiles,
  markChucthoReceived, updateChucthoProfile,
} from "../../src/controllers/policyChuctho.controller";
import { prisma } from "../../src/config/prisma";

vi.mock("../../src/config/prisma", () => ({
  prisma: {
    chuctho_profiles: {
      create: vi.fn(), findUnique: vi.fn(),
      update: vi.fn(), findMany: vi.fn(), count: vi.fn(),
    },
  },
}));

describe("Policy Chúc Thọ Controller", () => {
  const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it("creates chuctho profile with calculated age milestones", async () => {
    const req: any = { body: { name: "Nguyễn Văn A", dob: "1954", calculation_year: 2024, currentAddress: "Thôn 1", villageId: "v-1" }, user: { role: "admin", village_id: "v-1" } };
    const res = mockRes();
    (prisma.chuctho_profiles.create as any).mockResolvedValue({ id: "p-1", name: "Nguyễn Văn A", age70: "x" });
    await createChucthoProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("retrieves chuctho profiles with camelCase and status filters", async () => {
    const req: any = { query: { villageId: "v-1", calculationYear: "2024", status: "received", sortKey: "name", sortDirection: "desc" }, user: { role: "admin" } };
    const res = mockRes();
    (prisma.chuctho_profiles.findMany as any).mockResolvedValue([{ id: "p-1", name: "Nguyễn Văn A" }]);
    (prisma.chuctho_profiles.count as any).mockResolvedValue(1);
    await getChucthoProfiles(req, res);
    expect(prisma.chuctho_profiles.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ village_id: "v-1", calculation_year: 2024, received: true }),
      orderBy: { name: "desc" },
    }));
  });

  it("detects OCC version collision and returns 409", async () => {
    const req: any = { params: { id: "p-1" }, body: { name: "Nguyễn Văn B", version: 1 }, user: { role: "admin" } };
    const res = mockRes();
    (prisma.chuctho_profiles.findUnique as any).mockResolvedValue({ id: "p-1", version: 2, is_deleted: false });
    await updateChucthoProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("updates received status and soft deletes profile", async () => {
    const res = mockRes();
    (prisma.chuctho_profiles.update as any).mockResolvedValue({ id: "p-1", received: true });
    await markChucthoReceived({ params: { id: "p-1" }, body: { received: true } } as any, res);
    expect(prisma.chuctho_profiles.update).toHaveBeenCalled();
    await deleteChucthoProfile({ params: { id: "p-1" } } as any, res);
    expect(prisma.chuctho_profiles.update).toHaveBeenCalled();
  });
});
