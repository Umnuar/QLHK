import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { generateAccessToken } from '../src/utils/jwt';

describe('Khóa lạc quan (Optimistic Concurrency Control - OCC)', () => {
  let adminToken: string;
  let testVillageId: string;
  let testHouseholdId: string;
  let testCitizenId: string;

  beforeAll(async () => {
    // Lấy thôn đầu tiên
    const village = await prisma.villages.findFirst();
    testVillageId = village!.id;

    // Sinh admin token
    adminToken = generateAccessToken({
      id: 'admin-test-id',
      username: 'admin',
      role: 'admin',
      village_id: null,
    });

    // Tạo hộ khẩu mẫu
    const hh = await prisma.households.create({
      data: {
        village_id: testVillageId,
        book_number: 'HK-OCC-01',
        address: 'Thôn 1, Xã Đăk Hà',
        version: 1,
      },
    });
    testHouseholdId = hh.id;

    // Tạo nhân khẩu mẫu
    const ct = await prisma.citizens.create({
      data: {
        household_id: testHouseholdId,
        full_name: 'Trần Văn OCC',
        dob: '01/01/1990',
        gender: 'Nam',
        version: 1,
      },
    });
    testCitizenId = ct.id;
  });

  afterAll(async () => {
    await prisma.citizens.deleteMany({ where: { household_id: testHouseholdId } });
    await prisma.households.deleteMany({ where: { id: testHouseholdId } });
  });

  it('Hộ khẩu: Cập nhật với đúng version phải thành công và tăng version lên 2', async () => {
    const res = await request(app)
      .put(`/api/households/${testHouseholdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        address: 'Địa chỉ cập nhật mới',
        version: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(2);
    expect(res.body.data.address).toBe('Địa chỉ cập nhật mới');
  });

  it('Hộ khẩu: Cập nhật với version cũ (stale version = 1) phải trả về HTTP 409 Conflict', async () => {
    const res = await request(app)
      .put(`/api/households/${testHouseholdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        address: 'Cố tình gửi version cũ',
        version: 1, // Lúc này DB đã là version 2
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('thay đổi bởi người dùng khác');
    expect(res.body.currentVersion).toBe(2);
  });

  it('Nhân khẩu: Cập nhật với đúng version phải thành công và tăng version lên 2', async () => {
    const res = await request(app)
      .put(`/api/citizens/${testCitizenId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        full_name: 'Trần Văn OCC Cập Nhật',
        version: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(2);
  });

  it('Nhân khẩu: Cập nhật với version cũ (stale version = 1) phải trả về HTTP 409 Conflict', async () => {
    const res = await request(app)
      .put(`/api/citizens/${testCitizenId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        full_name: 'Trần Văn OCC Sai Version',
        version: 1, // DB đã là version 2
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('thay đổi bởi người dùng khác');
    expect(res.body.currentVersion).toBe(2);
  });
});
