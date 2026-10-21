import { describe, expect, it, vi } from "vitest";
import { authenticateToken, authorizeVillageScope, AuthRequest } from "../../src/middlewares/auth.middleware";
import { generateAccessToken } from "../../src/utils/jwt";
import { Response } from "express";

function createMockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.status = vi.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn().mockImplementation((data: any) => {
    res.jsonData = data;
    return res;
  });
  return res as Response & { statusCode: number; jsonData: any };
}

describe("Policy RBAC & Village Scoping Security", () => {
  const adminToken = generateAccessToken({ id: "admin-1", username: "admin", role: "admin", village_id: null });
  const userTokenVillageA = generateAccessToken({ id: "user-1", username: "userA", role: "user", village_id: "village-a" });

  it("blocks unauthenticated requests with 401 Unauthorized", () => {
    const req = { headers: {}, query: {}, body: {} } as unknown as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();
    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks user from accessing another village with 403 Forbidden", () => {
    const req = {
      user: { id: "user-1", username: "userA", role: "user", village_id: "village-a" },
      query: { village_id: "village-b" },
      body: {},
      method: "GET",
    } as unknown as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();
    authorizeVillageScope(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows user to query their own village", () => {
    const req = {
      user: { id: "user-1", username: "userA", role: "user", village_id: "village-a" },
      query: { village_id: "village-a" },
      body: {},
      method: "GET",
    } as unknown as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();
    authorizeVillageScope(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows admin to query any village", () => {
    const req = {
      user: { id: "admin-1", username: "admin", role: "admin", village_id: null },
      query: { village_id: "village-b" },
      body: {},
      method: "GET",
    } as unknown as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();
    authorizeVillageScope(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
