import { describe, expect, it, vi } from "vitest";
import {
  createHtxhProfile, deleteHtxhProfile, getHtxhProfiles,
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

  const validUuid = "00000000-0000-4000-8000-000000000002";

  it("creates htxh profile with computed categories", async () => {
    const req: any = { body: { name: "Trần Thị B", dob: "1940", villageId: "v-1", bao_tro: "x" }, user: { role: "admin" } };
    const res = mockRes();
    (prisma.htxh_profiles.create as any).mockResolvedValue({ id: validUuid, name: "Trần Thị B", age75plus: "x", bao_tro: "x" });
    await createHtxhProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("retrieves htxh profiles with camelCase and category filters", async () => {
    const req: any = { query: { villageId: "v-1", calculationYear: "2024", status: "unreceived", category: "bao_tro", sortKey: "dob", sortDirection: "asc" }, user: { role: "admin" } };
    const res = mockRes();
    (prisma.htxh_profiles.findMany as any).mockResolvedValue([{ id: validUuid, name: "Trần Thị B" }]);
    (prisma.htxh_profiles.count as any).mockResolvedValue(1);
    await getHtxhProfiles(req, res);
    expect(prisma.htxh_profiles.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ village_id: "v-1", calculation_year: 2024, received: false, bao_tro: "x" }),
      orderBy: { dob: "asc" },
    }));
  });

  it("rejects non-uuid id with 400 bad request", async () => {
    const req: any = { params: { id: "ht-1" }, body: {}, user: { role: "admin" } };
    const res1 = mockRes();
    await updateHtxhProfile(req, res1);
    expect(res1.status).toHaveBeenCalledWith(400);

    const res2 = mockRes();
    await markHtxhReceived(req, res2);
    expect(res2.status).toHaveBeenCalledWith(400);

    const res3 = mockRes();
    await deleteHtxhProfile(req, res3);
    expect(res3.status).toHaveBeenCalledWith(400);
  });

  it("detects OCC conflict in htxh profile update", async () => {
    const req: any = { params: { id: validUuid }, body: { version: 1 }, user: { role: "admin" } };
    const res = mockRes();
    (prisma.htxh_profiles.findUnique as any).mockResolvedValue({ id: validUuid, version: 2, is_deleted: false });
    await updateHtxhProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("strips system and relation fields before updating", async () => {
    const req: any = {
      params: { id: validUuid },
      body: {
        id: validUuid,
        village: { id: "v-1", name: "Thôn 1" },
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
        deleted_at: null,
        cccd_hash: "old_hash",
        cccd_last4: "1234",
        name: "Bác B Đã Sửa",
        notes: "Ghi chú mới",
      },
      user: { role: "admin" },
    };
    const res = mockRes();
    (prisma.htxh_profiles.findUnique as any).mockResolvedValue({ id: validUuid, version: 1, is_deleted: false });
    (prisma.htxh_profiles.update as any).mockResolvedValue({ id: validUuid, name: "Bác B Đã Sửa" });
    await updateHtxhProfile(req, res);
    expect(prisma.htxh_profiles.update).toHaveBeenCalledWith({
      where: { id: validUuid },
      data: expect.not.objectContaining({
        village: expect.anything(),
        created_at: expect.anything(),
        updated_at: expect.anything(),
        deleted_at: expect.anything(),
      }),
    });
    expect(res.json).toHaveBeenCalled();
  });

  it("updates received and soft deletes htxh profile with valid uuid", async () => {
    const res = mockRes();
    (prisma.htxh_profiles.update as any).mockResolvedValue({ id: validUuid, received: true });
    await markHtxhReceived({ params: { id: validUuid }, body: { received: true } } as any, res);
    expect(prisma.htxh_profiles.update).toHaveBeenCalled();
    await deleteHtxhProfile({ params: { id: validUuid } } as any, res);
    expect(prisma.htxh_profiles.update).toHaveBeenCalled();
  });

  it("handles P2025 record not found error with 404", async () => {
    const p2025Error = new Error("Record not found");
    (p2025Error as any).code = "P2025";
    (prisma.htxh_profiles.update as any).mockRejectedValue(p2025Error);

    const res = mockRes();
    await markHtxhReceived({ params: { id: validUuid }, body: { received: true } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
