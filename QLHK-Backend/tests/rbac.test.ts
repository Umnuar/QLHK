import { describe, it, expect, vi } from 'vitest';
import { authorizeVillageScope, requireAdmin, AuthRequest } from '../src/middlewares/auth.middleware';
import { Response } from 'express';

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

describe('Phân quyền phạm vi Thôn/Xã (authorizeVillageScope RBAC Middleware)', () => {
  it('phải từ chối 401 nếu chưa xác thực người dùng', () => {
    const req = { query: {}, body: {} } as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();

    authorizeVillageScope(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('phải cho phép Quản trị viên cấp xã (Admin) truy cập bất kỳ thôn nào', () => {
    const req = {
      user: { id: 'admin-1', username: 'admin', role: 'admin', village_id: null },
      query: { villageId: 'any-village-id' },
      body: {},
      method: 'GET',
    } as unknown as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();

    authorizeVillageScope(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('phải cho phép Trưởng thôn truy cập dữ liệu của chính thôn mình', () => {
    const req = {
      user: { id: 'user-1', username: 'thon1', role: 'user', village_id: 'village-1' },
      query: { villageId: 'village-1' },
      body: {},
      method: 'GET',
    } as unknown as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();

    authorizeVillageScope(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('phải chặn HTTP 403 khi Trưởng thôn cố tình truy vấn dữ liệu thôn khác qua query params', () => {
    const req = {
      user: { id: 'user-1', username: 'thon1', role: 'user', village_id: 'village-1' },
      query: { villageId: 'village-2' },
      body: {},
      method: 'GET',
    } as unknown as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();

    authorizeVillageScope(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('phải chặn HTTP 403 khi Trưởng thôn gửi body chứa village_id của thôn khác', () => {
    const req = {
      user: { id: 'user-1', username: 'thon1', role: 'user', village_id: 'village-1' },
      query: {},
      body: { village_id: 'village-2', book_number: 'HK-9999' },
      method: 'POST',
    } as unknown as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();

    authorizeVillageScope(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('phải tự động gán village_id của Trưởng thôn nếu không chỉ định trong GET query', () => {
    const req = {
      user: { id: 'user-1', username: 'thon1', role: 'user', village_id: 'village-1' },
      query: {},
      body: {},
      method: 'GET',
    } as unknown as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();

    authorizeVillageScope(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.query.villageId).toBe('village-1');
  });

  it('phải tự động ép village_id trong body khi Trưởng thôn tạo hoặc sửa dữ liệu', () => {
    const req = {
      user: { id: 'user-1', username: 'thon1', role: 'user', village_id: 'village-1' },
      query: {},
      body: { book_number: 'HK-0001' },
      method: 'POST',
    } as unknown as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();

    authorizeVillageScope(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body.village_id).toBe('village-1');
  });
});

describe('Kiểm tra quyền Quản trị viên (requireAdmin Middleware)', () => {
  it('phải chặn 403 nếu người dùng là Trưởng thôn (role: user)', () => {
    const req = {
      user: { id: 'user-1', username: 'thon1', role: 'user', village_id: 'village-1' },
    } as unknown as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('phải cho qua nếu người dùng là Admin xã (role: admin)', () => {
    const req = {
      user: { id: 'admin-1', username: 'admin', role: 'admin', village_id: null },
    } as unknown as AuthRequest;
    const res = createMockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
