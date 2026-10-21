import { describe, expect, it, vi } from "vitest";
import {
  createHtxhProfile, deleteHtxhProfile,
  markHtxhReceived, updateHtxhProfile,
} from "../../src/controllers/policyHtxh.controller";
import { prisma } from "../../src/config/prisma";

vi.mock("../../src/config/prisma", () => ({
  prisma: {
    htxh_profiles: {
      create: vi.fn(), findUnique: vi.fn(),
      update: vi.fn(), findMany: vi.fn(), count: vi.fn(),
    },
  },
}));

describe("Policy HTXH Controller", () => {
  const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it("creates htxh profile with computed categories", async () => {
    const req: any = { body: { name: "Trần Thị B", dob: "1940", village_id: "v-1", bao_tro: "x" }, user: { role: "admin" } };
    const res = mockRes();
    (prisma.htxh_profiles.create as any).mockResolvedValue({ id: "h-1", name: "Trần Thị B", age75plus: "x", bao_tro: "x" });
    await createHtxhProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("detects OCC conflict in htxh profile update", async () => {
    const req: any = { params: { id: "h-1" }, body: { version: 1 }, user: { role: "admin" } };
    const res = mockRes();
    (prisma.htxh_profiles.findUnique as any).mockResolvedValue({ id: "h-1", version: 2, is_deleted: false });
    await updateHtxhProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("updates received and soft deletes htxh profile", async () => {
    const res = mockRes();
    (prisma.htxh_profiles.update as any).mockResolvedValue({ id: "h-1", received: true });
    await markHtxhReceived({ params: { id: "h-1" }, body: { received: true } } as any, res);
    expect(prisma.htxh_profiles.update).toHaveBeenCalled();
    await deleteHtxhProfile({ params: { id: "h-1" } } as any, res);
    expect(prisma.htxh_profiles.update).toHaveBeenCalled();
  });
});
