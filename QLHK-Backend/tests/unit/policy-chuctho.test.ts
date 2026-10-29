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

  const validUuid = "00000000-0000-4000-8000-000000000001";

  it("creates chuctho profile with calculated age milestones", async () => {
    const req: any = { body: { name: "Nguyễn Văn A", dob: "1954", calculation_year: 2024, currentAddress: "Thôn 1", villageId: "v-1" }, user: { role: "admin", village_id: "v-1" } };
    const res = mockRes();
    (prisma.chuctho_profiles.create as any).mockResolvedValue({ id: validUuid, name: "Nguyễn Văn A", age70: "x" });
    await createChucthoProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("retrieves chuctho profiles with camelCase and status filters", async () => {
    const req: any = { query: { villageId: "v-1", calculationYear: "2024", status: "received", sortKey: "name", sortDirection: "desc" }, user: { role: "admin" } };
    const res = mockRes();
    (prisma.chuctho_profiles.findMany as any).mockResolvedValue([{ id: validUuid, name: "Nguyễn Văn A" }]);
    (prisma.chuctho_profiles.count as any).mockResolvedValue(1);
    await getChucthoProfiles(req, res);
    expect(prisma.chuctho_profiles.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ village_id: "v-1", received: true }),
      orderBy: { name: "desc" },
    }));
  });

  it("filters chuctho profiles by day, month, and exact dob", async () => {
    const req: any = { query: { day: "15", month: "08", exactDate: "15/08/1954" }, user: { role: "admin" } };
    const res = mockRes();
    (prisma.chuctho_profiles.findMany as any).mockResolvedValue([{ id: validUuid, name: "Nguyễn Văn A" }]);
    (prisma.chuctho_profiles.count as any).mockResolvedValue(1);
    await getChucthoProfiles(req, res);
    expect(prisma.chuctho_profiles.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.any(Array),
      }),
    }));
  });

  it("rejects non-uuid id with 400 bad request", async () => {
    const req: any = { params: { id: "ct-2" }, body: {}, user: { role: "admin" } };
    const res1 = mockRes();
    await updateChucthoProfile(req, res1);
    expect(res1.status).toHaveBeenCalledWith(400);

    const res2 = mockRes();
    await markChucthoReceived(req, res2);
    expect(res2.status).toHaveBeenCalledWith(400);

    const res3 = mockRes();
    await deleteChucthoProfile(req, res3);
    expect(res3.status).toHaveBeenCalledWith(400);
  });

  it("detects OCC version collision and returns 409", async () => {
    const req: any = { params: { id: validUuid }, body: { name: "Nguyễn Văn B", version: 1 }, user: { role: "admin" } };
    const res = mockRes();
    (prisma.chuctho_profiles.findUnique as any).mockResolvedValue({ id: validUuid, version: 2, is_deleted: false });
    await updateChucthoProfile(req, res);
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
        name: "Cụ A Đã Sửa",
        notes: "Ghi chú mới",
      },
      user: { role: "admin" },
    };
    const res = mockRes();
    (prisma.chuctho_profiles.findUnique as any).mockResolvedValue({ id: validUuid, version: 1, is_deleted: false });
    (prisma.chuctho_profiles.update as any).mockResolvedValue({ id: validUuid, name: "Cụ A Đã Sửa" });
    await updateChucthoProfile(req, res);
    expect(prisma.chuctho_profiles.update).toHaveBeenCalledWith({
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

  it("updates received status and soft deletes profile with valid uuid", async () => {
    const res = mockRes();
    (prisma.chuctho_profiles.update as any).mockResolvedValue({ id: validUuid, received: true });
    await markChucthoReceived({ params: { id: validUuid }, body: { received: true } } as any, res);
    expect(prisma.chuctho_profiles.update).toHaveBeenCalled();
    await deleteChucthoProfile({ params: { id: validUuid } } as any, res);
    expect(prisma.chuctho_profiles.update).toHaveBeenCalled();
  });

  it("handles P2025 record not found error with 404", async () => {
    const p2025Error = new Error("Record not found");
    (p2025Error as any).code = "P2025";
    (prisma.chuctho_profiles.update as any).mockRejectedValue(p2025Error);

    const res = mockRes();
    await markChucthoReceived({ params: { id: validUuid }, body: { received: true } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
