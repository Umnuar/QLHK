import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';

describe('QLHK Backend End-to-End API Integration', () => {
  let adminToken: string;
  let thon1Token: string;
  let thon1VillageId: string;

  beforeAll(async () => {
    // Đảm bảo dữ liệu ban đầu
    let thon1User = await prisma.users.findUnique({
      where: { username: 'thon1' },
      include: { village: true },
    });
    if (!thon1User || !thon1User.village_id) {
      const { seedDatabase } = await import('../prisma/seed');
      await seedDatabase(prisma);
      thon1User = await prisma.users.findUnique({
        where: { username: 'thon1' },
        include: { village: true },
      });
    }
    thon1VillageId = thon1User?.village_id || '';
  });

  describe('1. Health Check Endpoint (GET /api/health) & Ultra-low Ping (/api/ping)', () => {
    it('phải trả về đúng chuẩn Hệ sinh thái Đăk Hà cho GET /api/health', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.app).toBe('qlhk-backend');
      expect(res.body.version).toBe('1.0.0');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.timestamp).toBeDefined();
    });

    it('hỗ trợ phương thức HEAD cho /api/health (200 OK không kèm body)', async () => {
      const res = await request(app).head('/api/health');

      expect(res.status).toBe(200);
      expect(res.text).toBeFalsy();
    });

    it('hỗ trợ endpoint Ping siêu nhẹ ALL /api/ping (204 No Content, no-store/no-cache headers)', async () => {
      const resGet = await request(app).get('/api/ping');
      expect(resGet.status).toBe(204);
      expect(resGet.text).toBe('');
      expect(resGet.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(resGet.headers['pragma']).toBe('no-cache');
      expect(resGet.headers['expires']).toBe('0');

      const resHead = await request(app).head('/api/ping');
      expect(resHead.status).toBe(204);

      const resPost = await request(app).post('/api/ping');
      expect(resPost.status).toBe(204);
    });

    it('kích hoạt middleware nén dữ liệu compression và gắn header Vary: Accept-Encoding', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Accept-Encoding', 'gzip');

      expect(res.status).toBe(200);
      expect(res.headers['vary']).toBeDefined();
      expect(res.headers['vary']).toContain('Accept-Encoding');
    });
  });

  describe('2. Xác thực (Auth: Login, Refresh, Me, Logout)', () => {
    let refreshToken: string;

    it('Đăng nhập Quản trị viên (admin / admin123) thành công', async () => {
      const res = await request(app).post('/api/auth/login').send({
        username: 'admin',
        password: 'admin123',
      });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.role).toBe('admin');
      expect(res.body.user.village_id).toBeNull();

      adminToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('2 lần đăng nhập liên tiếp sinh ra 2 refresh token khác nhau và không bị lỗi P2002', async () => {
      const login1 = await request(app).post('/api/auth/login').send({
        username: 'admin',
        password: 'admin123',
      });
      const login2 = await request(app).post('/api/auth/login').send({
        username: 'admin',
        password: 'admin123',
      });

      expect(login1.status).toBe(200);
      expect(login2.status).toBe(200);
      expect(login1.body.refreshToken).toBeDefined();
      expect(login2.body.refreshToken).toBeDefined();
      expect(login1.body.refreshToken).not.toBe(login2.body.refreshToken);

      // Cập nhật lại adminToken và refreshToken mới nhất
      adminToken = login2.body.accessToken;
      refreshToken = login2.body.refreshToken;

      // Cả 2 token đều tồn tại hợp lệ và khác nhau trong CSDL (không bị conflict P2002)
      const token1InDb = await prisma.refresh_tokens.findUnique({
        where: { token: login1.body.refreshToken },
      });
      expect(token1InDb).not.toBeNull();
    });

    it('Dọn dẹp các refresh token đã hết hạn khi đăng nhập', async () => {
      const adminUser = await prisma.users.findUnique({ where: { username: 'admin' } });
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      const expiredRecord = await prisma.refresh_tokens.create({
        data: {
          user_id: adminUser!.id,
          token: 'expired-test-token-' + Date.now(),
          expires_at: expiredDate,
        },
      });

      await request(app).post('/api/auth/login').send({
        username: 'admin',
        password: 'admin123',
      });

      const checkExpired = await prisma.refresh_tokens.findUnique({
        where: { id: expiredRecord.id },
      });
      expect(checkExpired).toBeNull();
    });

    it('Đăng nhập Trưởng Thôn 1 (thon1 / thon123) thành công', async () => {
      const res = await request(app).post('/api/auth/login').send({
        username: 'thon1',
        password: 'thon123',
      });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.role).toBe('user');
      expect(res.body.user.village_id).toBe(thon1VillageId);

      thon1Token = res.body.accessToken;
    });

    it('Lấy thông tin tài khoản hiện tại (GET /api/auth/me)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('admin');
    });

    it('Làm mới token (POST /api/auth/refresh) thành công', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();

      // Cập nhật refresh token mới sau rotation
      refreshToken = res.body.refreshToken;
    });

    it('Đăng xuất (POST /api/auth/logout) thu hồi refresh token', async () => {
      const res = await request(app).post('/api/auth/logout').send({
        refreshToken,
      });

      expect(res.status).toBe(200);

      // Thử dùng lại refresh token vừa logout phải bị từ chối
      const resReuse = await request(app).post('/api/auth/refresh').send({
        refreshToken,
      });
      expect(resReuse.status).toBe(401);
    });

    it('Đăng nhập đồng thời (5 requests song song) không bị lỗi Prisma P2002 và sinh refresh token khác nhau', async () => {
      const promises = Array.from({ length: 5 }).map(() =>
        request(app).post('/api/auth/login').send({
          username: 'admin',
          password: 'admin123',
        })
      );

      const responses = await Promise.all(promises);

      const refreshTokens = new Set<string>();
      responses.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();
        refreshTokens.add(res.body.refreshToken);
      });

      // Xác nhận cả 5 refresh token sinh ra đều hoàn toàn khác nhau (nhờ randomUUID jwtid)
      expect(refreshTokens.size).toBe(5);
    });
  });

  describe('3. Danh sách và Quản lý Thôn (CRUD /api/villages)', () => {
    let createdVillageId: string;

    it('phải trả về danh mục thôn của Xã Đăk Hà kèm Cache-Control header tối ưu', async () => {
      const res = await request(app)
        .get('/api/villages')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('public, max-age=120, stale-while-revalidate=300');
      expect(res.body.data.length).toBeGreaterThanOrEqual(7);

      const villageNames = res.body.data.map((v: any) => v.name);
      expect(villageNames).toContain('Thôn 1');
      expect(villageNames).toContain('Thôn 2');
      expect(villageNames).toContain('Thôn 3');
      expect(villageNames).toContain('Thôn 4');
      expect(villageNames).toContain('Thôn 5');
      expect(villageNames).toContain('Thôn Kon Đao Yôp');
      expect(villageNames).toContain('Làng Kon Hnông Bách');
    });

    it('Trưởng thôn không có quyền thêm thôn mới (403)', async () => {
      const res = await request(app)
        .post('/api/villages')
        .set('Authorization', `Bearer ${thon1Token}`)
        .send({ name: 'Thôn Trái Phép', code: 'TTP' });

      expect(res.status).toBe(403);
    });

    it('Quản trị viên tạo thôn mới thành công (POST /api/villages)', async () => {
      const res = await request(app)
        .post('/api/villages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Thôn 6 Thử Nghiệm', code: 'TH6_TEST' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Thôn 6 Thử Nghiệm');
      expect(res.body.data.code).toBe('TH6_TEST');
      createdVillageId = res.body.data.id;
    });

    it('Từ chối tạo thôn bị trùng tên (409)', async () => {
      const res = await request(app)
        .post('/api/villages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Thôn 6 Thử Nghiệm', code: 'TH6_NEW_CODE' });

      expect(res.status).toBe(409);
    });

    it('Quản trị viên cập nhật tên thôn (PUT /api/villages/:id)', async () => {
      const res = await request(app)
        .put(`/api/villages/${createdVillageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Thôn 6 Đã Đổi Tên' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Thôn 6 Đã Đổi Tên');
    });

    it('Quản trị viên xóa thôn vừa tạo (DELETE /api/villages/:id)', async () => {
      const res = await request(app)
        .delete(`/api/villages/${createdVillageId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Danh sách thôn sau khi xóa trở về số lượng ban đầu', async () => {
      const res = await request(app)
        .get('/api/villages')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(7);
      const names = res.body.data.map((v: any) => v.name);
      expect(names).not.toContain('Thôn 6 Đã Đổi Tên');
    });
  });

  describe('4. Smart Excel Engine (Preview & Import)', () => {
    it('POST /api/excel/preview: Xem trước dữ liệu file Nhân hộ khẩu.xls', async () => {
      const res = await request(app)
        .post('/api/excel/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total_households).toBe(4);
      expect(res.body.data.total_citizens).toBe(14);
      expect(Array.isArray(res.body.data.warnings)).toBe(true);
    });

    it('POST /api/excel/import: Thực thi Transaction lưu toàn bộ vào CSDL', async () => {
      const res = await request(app)
        .post('/api/excel/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          village_id: thon1VillageId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.insertedHouseholds).toBe(4);
      expect(res.body.data.insertedCitizens).toBe(14);
    });

    it('POST /api/excel/import: Hỗ trợ JSON payload với địa chỉ và trạng thái cư trú tùy chỉnh', async () => {
      const res = await request(app)
        .post('/api/excel/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          village_id: thon1VillageId,
          households: [
            {
              book_number: 'HK-CUSTOM-001',
              address: 'Thôn 1, Đăk Hà (Khu kinh tế mới)',
              status: 'Tạm trú',
              members: [
                {
                  stt: 1,
                  is_head: true,
                  relationship: 'Chủ hộ',
                  full_name: 'Đoàn Văn Custom',
                  dob: '15/05/1988',
                  gender: 'Nam',
                  cccd: '060088001122',
                  ethnicity: 'Kinh',
                  religion: 'Không',
                  notes: 'Nhập từ client batch',
                },
              ],
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.insertedHouseholds).toBe(1);
      expect(res.body.data.insertedCitizens).toBe(1);

      const savedHh = await prisma.households.findFirst({
        where: { book_number: 'HK-CUSTOM-001' },
      });
      expect(savedHh).toBeDefined();
      expect(savedHh?.address).toBe('Thôn 1, Đăk Hà (Khu kinh tế mới)');
      expect(savedHh?.status).toBe('Tạm trú');
    });
  });

  describe('5. Analytics APIs', () => {
    it('GET /api/analytics/overview: Thống kê tổng quan xã', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalHouseholds).toBeGreaterThanOrEqual(4);
      expect(res.body.data.totalCitizens).toBeGreaterThanOrEqual(14);
      expect(res.body.data.gender).toBeDefined();
      expect(res.body.data.gender.male.count).toBeGreaterThan(0);
      expect(res.body.data.gender.female.count).toBeGreaterThan(0);
      expect(res.body.data.ethnicities.length).toBeGreaterThanOrEqual(14);
      expect(res.body.data.religions.length).toBeGreaterThan(0);
    });

    it('GET /api/analytics/by-village: Bảng so sánh các thôn', async () => {
      const res = await request(app)
        .get('/api/analytics/by-village')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(7);

      const thon1Stat = res.body.data.find((v: any) => v.village_name === 'Thôn 1');
      expect(thon1Stat).toBeDefined();
      expect(thon1Stat.household_count).toBeGreaterThanOrEqual(4);
      expect(thon1Stat.citizen_count).toBeGreaterThanOrEqual(14);
    });
  });

  describe('6. Bảo mật CCCD (Mã hóa, Hash, Last4, Reveal)', () => {
    let testCitizenId: string;
    const secretCCCD = '064099008877';

    beforeAll(async () => {
      // Dọn dẹp dữ liệu test cũ nếu có
      await prisma.citizens.deleteMany({
        where: { full_name: 'Vũ Thị Bảo Mật' },
      });

      const hh = await prisma.households.findFirst({ where: { village_id: thon1VillageId } });
      const citizen = await prisma.citizens.create({
        data: {
          household_id: hh!.id,
          full_name: 'Vũ Thị Bảo Mật',
          gender: 'Nữ',
          version: 1,
        },
      });
      testCitizenId = citizen.id;
    });

    afterAll(async () => {
      await prisma.citizens.deleteMany({
        where: { full_name: 'Vũ Thị Bảo Mật' },
      });
    });

    it('Cập nhật nhân khẩu với số CCCD -> lưu dạng mã hóa, trả về cccd_last4', async () => {
      const res = await request(app)
        .put(`/api/citizens/${testCitizenId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cccd: secretCCCD,
          version: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.has_cccd).toBe(true);
      expect(res.body.data.cccd).toBeUndefined(); // Không trả về ciphertext

      // Kiểm tra trong DB: cccd phải lưu dạng iv:authTag:encryptedHex
      const inDb = await prisma.citizens.findUnique({ where: { id: testCitizenId } });
      expect(inDb!.cccd).toBeDefined();
      expect(inDb!.cccd!.split(':').length).toBe(3);
      expect(inDb!.cccd_last4).toBe('8877');
      expect(inDb!.cccd_hash).toBeDefined();
    });

    it('Tìm kiếm nhân khẩu qua cccd query param bằng SHA-256 hash', async () => {
      const res = await request(app)
        .get(`/api/citizens?cccd=${secretCCCD}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].full_name).toBe('Vũ Thị Bảo Mật');
    });

    it('Giải mã CCCD qua endpoint chuyên biệt (GET /api/citizens/:id/reveal-cccd)', async () => {
      const res = await request(app)
        .get(`/api/citizens/${testCitizenId}/reveal-cccd`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.cccd).toBe(secretCCCD);
    });

    it('Giải mã CCCD qua endpoint chuyên biệt (POST /api/citizens/:id/reveal-cccd)', async () => {
      const res = await request(app)
        .post(`/api/citizens/${testCitizenId}/reveal-cccd`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.cccd).toBe(secretCCCD);
    });
  });

  describe('7. Quản lý Người dùng (Users API: GET, POST, PUT password, DELETE)', () => {
    let newUserId: string;

    beforeAll(async () => {
      await prisma.users.deleteMany({
        where: { username: 'canbo_test_01' },
      });
    });

    it('GET /api/users: Lấy danh sách tài khoản (ẩn mật khẩu hash)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      // Đảm bảo không để lộ trường password_hash
      res.body.data.forEach((u: any) => {
        expect(u.password_hash).toBeUndefined();
        expect(u.username).toBeDefined();
        expect(u.role).toBeDefined();
      });
    });

    it('POST /api/users: Tạo mới tài khoản cán bộ', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'canbo_test_01',
          password: 'password123',
          role: 'user',
          village_id: thon1VillageId,
          full_name: 'Cán Bộ Kiểm Thử',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('canbo_test_01');
      expect(res.body.data.password_hash).toBeUndefined();
      expect(res.body.data.role).toBe('user');
      expect(res.body.data.village_id).toBe(thon1VillageId);

      newUserId = res.body.data.id;
    });

    it('POST /api/users: Từ chối tạo tài khoản trùng tên đăng nhập', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'canbo_test_01',
          password: 'password123',
          role: 'user',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('đã tồn tại');
    });

    it('PUT /api/users/:id/password: Đổi mật khẩu tài khoản thành công', async () => {
      const res = await request(app)
        .put(`/api/users/${newUserId}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'new_secret_password_123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Thử đăng nhập bằng mật khẩu mới
      const loginRes = await request(app).post('/api/auth/login').send({
        username: 'canbo_test_01',
        password: 'new_secret_password_123',
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.accessToken).toBeDefined();
    });

    it('PUT /api/users/:id: Cập nhật thông tin tài khoản và phân công thôn thành công', async () => {
      const villages = await prisma.villages.findMany();
      const targetVillage = villages.find((v) => v.id !== thon1VillageId) || villages[0];

      const res = await request(app)
        .put(`/api/users/${newUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: 'Cán Bộ Đã Đổi Tên',
          role: 'user',
          village_id: targetVillage?.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.full_name).toBe('Cán Bộ Đã Đổi Tên');
      expect(res.body.data.role).toBe('user');
      expect(res.body.data.village_id).toBe(targetVillage?.id);
      expect(res.body.data.village).toBeDefined();
      expect(res.body.data.village.id).toBe(targetVillage?.id);
    });


    it('DELETE /api/users/:id: Chặn xóa tài khoản admin mặc định', async () => {
      const adminUser = await prisma.users.findUnique({ where: { username: 'admin' } });
      const res = await request(app)
        .delete(`/api/users/${adminUser!.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('admin');
    });

    it('DELETE /api/users/:id: Xóa tài khoản thành công', async () => {
      const res = await request(app)
        .delete(`/api/users/${newUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Xác nhận trong DB đã xóa
      const checkDb = await prisma.users.findUnique({ where: { id: newUserId } });
      expect(checkDb).toBeNull();
    });
  });

  describe('8. Nhật ký Kiểm toán (Audit Logs API)', () => {
    it('GET /api/audit-logs: Từ chối 401 khi chưa cung cấp token', async () => {
      const res = await request(app).get('/api/audit-logs');
      expect(res.status).toBe(401);
    });

    it('GET /api/audit-logs: Quản trị viên lấy danh sách nhật ký và phân trang thành công', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(typeof res.body.pagination.total).toBe('number');
      expect(res.body.pagination.limit).toBe(50);
      expect(res.body.pagination.offset).toBe(0);
      expect(res.body.pagination.page).toBe(1);
    });

    it('GET /api/audit-logs: Lọc theo action hoặc entity_type', async () => {
      // Đảm bảo có ít nhất 1 audit log mẫu để kiểm tra lọc
      const sampleLog = await prisma.audit_logs.findFirst();
      const testAction = sampleLog?.action || 'IMPORT';
      const testEntityType = sampleLog?.entity_type || 'excel_import';

      const resAction = await request(app)
        .get(`/api/audit-logs?action=${testAction}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resAction.status).toBe(200);
      expect(resAction.body.success).toBe(true);
      resAction.body.data.forEach((log: any) => {
        expect(log.action).toBe(testAction);
      });

      const resEntity = await request(app)
        .get(`/api/audit-logs?entity_type=${testEntityType}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resEntity.status).toBe(200);
      expect(resEntity.body.success).toBe(true);
      resEntity.body.data.forEach((log: any) => {
        expect(log.entity_type).toBe(testEntityType);
      });
    });

    it('GET /api/audit: Hoạt động chính xác qua alias /api/audit', async () => {
      const res = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/audit-logs: Trưởng thôn không có quyền truy cập nhật ký hoạt động (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${thon1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });

    it('Tuân thủ nguyên tắc Bất biến: Không có API DELETE hay PUT/PATCH cho audit_logs', async () => {
      const resDelete = await request(app)
        .delete('/api/audit-logs/fake-log-id')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resDelete.status).toBe(404);

      const resPut = await request(app)
        .put('/api/audit-logs/fake-log-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'MALICIOUS_OVERWRITE' });
      expect(resPut.status).toBe(404);
    });
  });

  describe('9. Quản lý Hộ khẩu và Nhân khẩu (CRUD /api/households kèm members)', () => {
    let testHouseholdId: string;
    let headCitizenId: string;
    let filterTestHouseholdId: string;

    it('POST /api/households: Tạo sổ hộ khẩu kèm danh sách nhân khẩu thành công', async () => {
      const newHhPayload = {
        village_id: thon1VillageId,
        book_number: 'SHK-TEST-999',
        address: 'Thôn 1, Đăk Hà',
        status: 'active',
        members: [
          {
            stt: 1,
            is_head: true,
            relationship: 'Chủ hộ',
            full_name: 'Nguyễn Văn Chủ Hộ',
            gender: 'Nam',
            dob: '1980-01-01',
            cccd: '064080001122',
            ethnicity: 'Kinh',
            religion: 'Không',
            notes: 'Chủ hộ mẫu',
          },
          {
            stt: 2,
            is_head: false,
            relationship: 'Vợ',
            full_name: 'Trần Thị Vợ',
            gender: 'Nữ',
            dob: '1982-05-10',
            cccd: '064082003344',
            ethnicity: 'Kinh',
            religion: 'Không',
          },
        ],
      };

      const res = await request(app)
        .post('/api/households')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newHhPayload);

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.book_number).toBe('SHK-TEST-999');
      expect(res.body.data.citizens).toHaveLength(2);

      testHouseholdId = res.body.data.id;
      const head = res.body.data.citizens.find((c: any) => c.is_head);
      expect(head).toBeDefined();
      expect(head.full_name).toBe('Nguyễn Văn Chủ Hộ');
      expect(head.cccd_last4).toBe('1122');
      headCitizenId = head.id;

      // Kiểm tra trong CSDL SQLite: CCCD phải được mã hóa AES-256-GCM và có hash, last4
      const citizensInDb = await prisma.citizens.findMany({
        where: { household_id: testHouseholdId, is_deleted: false },
      });
      expect(citizensInDb).toHaveLength(2);
      expect(citizensInDb.some((c) => c.cccd_last4 === '1122')).toBe(true);
      expect(citizensInDb.some((c) => c.cccd_last4 === '3344')).toBe(true);

      const headInDb = citizensInDb.find((c) => c.is_head);
      expect(headInDb!.cccd).toBeDefined();
      expect(headInDb!.cccd!.split(':')).toHaveLength(3);
      expect(headInDb!.cccd_hash).toBeDefined();
    });

    it('POST /api/households: Tự động sinh book_number (HGD-...) khi book_number không được cung cấp', async () => {
      const payloadWithoutBookNumber = {
        village_id: thon1VillageId,
        address: 'Thôn 1, Đăk Hà tự động sinh mã',
        status: 'active',
        members: [
          {
            stt: 1,
            is_head: true,
            relationship: 'Chủ hộ',
            full_name: 'Lê Văn Tự Động',
            gender: 'Nam',
            dob: '1995-03-03',
          },
        ],
      };

      const res = await request(app)
        .post('/api/households')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payloadWithoutBookNumber);

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.book_number).toMatch(/^HGD-\d+-\d+$/);

      // Dọn dẹp bản ghi test
      await prisma.citizens.deleteMany({ where: { household_id: res.body.data.id } });
      await prisma.households.deleteMany({ where: { id: res.body.data.id } });
    });

    it('PUT /api/households/:id: Cập nhật thông tin hộ khẩu và thay đổi danh sách nhân khẩu', async () => {
      const updatePayload = {
        book_number: 'SHK-TEST-999-UPDATED',
        address: 'Thôn 1, Xã Đăk Hà mới',
        status: 'active',
        version: 1,
        members: [
          // Giữ và sửa chủ hộ
          {
            id: headCitizenId,
            stt: 1,
            is_head: true,
            relationship: 'Chủ hộ',
            full_name: 'Nguyễn Văn Chủ Hộ Đã Đổi Tên',
            gender: 'Nam',
            dob: '1980-01-01',
            cccd: '••••••••1122', // Masked cccd không bị ghi đè cipher rỗng
            ethnicity: 'Kinh',
            religion: 'Không',
            notes: 'Đã cập nhật',
          },
          // Thêm con đẻ mới (không có id)
          {
            stt: 2,
            is_head: false,
            relationship: 'Con đẻ',
            full_name: 'Nguyễn Văn Con',
            gender: 'Nam',
            dob: '2010-09-09',
            cccd: '064210005566',
            ethnicity: 'Kinh',
            religion: 'Không',
          },
          // Người vợ cũ không còn trong mảng -> sẽ bị soft delete
        ],
      };

      const res = await request(app)
        .put(`/api/households/${testHouseholdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.data.book_number).toBe('SHK-TEST-999-UPDATED');
      expect(res.body.data.version).toBe(2);
      expect(res.body.data.citizens).toHaveLength(2);

      const updatedHead = res.body.data.citizens.find((c: any) => c.id === headCitizenId);
      expect(updatedHead.full_name).toBe('Nguyễn Văn Chủ Hộ Đã Đổi Tên');
      expect(updatedHead.cccd_last4).toBe('1122');

      const newChild = res.body.data.citizens.find((c: any) => c.full_name === 'Nguyễn Văn Con');
      expect(newChild).toBeDefined();
      expect(newChild.cccd_last4).toBe('5566');

      const newChildInDb = await prisma.citizens.findFirst({
        where: { household_id: testHouseholdId, full_name: 'Nguyễn Văn Con', is_deleted: false },
      });
      expect(newChildInDb).toBeDefined();
      expect(newChildInDb!.cccd).toBeDefined();
      expect(newChildInDb!.cccd!.split(':')).toHaveLength(3);
      expect(newChildInDb!.cccd_hash).toBeDefined();

      // Kiểm tra CSDL: người vợ cũ đã bị soft delete (is_deleted: true)
      const deletedWife = await prisma.citizens.findFirst({
        where: { household_id: testHouseholdId, full_name: 'Trần Thị Vợ' },
      });
      expect(deletedWife).toBeDefined();
      expect(deletedWife!.is_deleted).toBe(true);
      expect(deletedWife!.deleted_at).toBeDefined();
    });

    it('GET /api/households?minAge=18&maxAge=60: Lọc danh sách hộ có nhân khẩu trong độ tuổi lao động', async () => {
      const res = await request(app)
        .get('/api/households?minAge=18&maxAge=60')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const currentYear = new Date().getFullYear();
      const minBirthYear = currentYear - 60;
      const maxBirthYear = currentYear - 18;

      for (const hh of res.body.data) {
        const hasMatchingCitizen = (hh.citizens || []).some((c: any) => {
          if (!c.dob) return false;
          const match = String(c.dob).match(/\b(19\d{2}|20\d{2})\b/);
          if (!match) return false;
          const birthYear = parseInt(match[1], 10);
          return birthYear >= minBirthYear && birthYear <= maxBirthYear;
        });
        expect(hasMatchingCitizen).toBe(true);
      }
    });

    it('GET /api/households?maxAge=5: Lọc danh sách hộ có trẻ em mầm non', async () => {
      const res = await request(app)
        .get('/api/households?maxAge=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/households?year=2027&minAge=18&maxAge=18: kiểm tra tính tuổi theo năm tương lai', async () => {
      const curYear = new Date().getFullYear();
      const testHh = await prisma.households.create({
        data: {
          village_id: thon1VillageId,
          book_number: 'SHK-FILTER-TEST-001',
          address: 'Thôn 1, Đăk Hà',
          status: 'active',
          citizens: {
            create: [
              {
                stt: 1,
                is_head: true,
                relationship: 'Chủ hộ',
                full_name: 'A Đột',
                gender: 'Nam',
                dob: '15/01/2009', // 18 tuổi vào năm tương lai 2027
                ethnicity: 'Ba Na',
                religion: 'Không',
              },
              {
                stt: 2,
                is_head: false,
                relationship: 'Con',
                full_name: 'A Xoang',
                gender: 'Nam',
                dob: `01/06/${curYear - 20}`, // 20 tuổi (độ tuổi NVQS 18-27)
                ethnicity: 'Xơ Đăng',
                religion: 'Không',
              },
            ],
          },
        },
      });
      filterTestHouseholdId = testHh.id;

      const res = await request(app)
        .get('/api/households?year=2027&minAge=18&maxAge=18')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      for (const hh of res.body.data) {
        const hasMatchingCitizen = (hh.citizens || []).some((c: any) => {
          if (!c.dob) return false;
          return c.dob.includes('2009');
        });
        expect(hasMatchingCitizen).toBe(true);
      }
    });

    it('GET /api/households?gender=Nam&minAge=18&maxAge=27: kiểm tra kết hợp giới tính và độ tuổi NVQS', async () => {
      const res = await request(app)
        .get('/api/households?gender=Nam&minAge=18&maxAge=27')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const currentYear = new Date().getFullYear();
      const minBirthYear = currentYear - 27;
      const maxBirthYear = currentYear - 18;

      for (const hh of res.body.data) {
        const hasMatchingCitizen = (hh.citizens || []).some((c: any) => {
          if (c.gender !== 'Nam' || !c.dob) return false;
          const match = String(c.dob).match(/\b(19\d{2}|20\d{2})\b/);
          if (!match) return false;
          const birthYear = parseInt(match[1], 10);
          return birthYear >= minBirthYear && birthYear <= maxBirthYear;
        });
        expect(hasMatchingCitizen).toBe(true);
      }
    });

    it('GET /api/households?ethnicity=dtts: kiểm tra lọc DTTS', async () => {
      const res = await request(app)
        .get('/api/households?ethnicity=dtts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      for (const hh of res.body.data) {
        const hasDttsCitizen = (hh.citizens || []).some((c: any) => {
          return c.ethnicity && c.ethnicity.trim().toLowerCase() !== 'kinh';
        });
        expect(hasDttsCitizen).toBe(true);
      }
    });

    it('TASK-003: GET /api/households không bao giờ để lộ CCCD dạng rõ (chỉ trả về cccd_masked và cccd_last4)', async () => {
      const res = await request(app)
        .get('/api/households')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      for (const hh of res.body.data) {
        for (const c of hh.citizens || []) {
          if (c.cccd && c.cccd !== 'Chưa có') {
            // Không được là số CCCD trần 12 chữ số
            expect(c.cccd).not.toMatch(/^\d{12}$/);
            // Phải chứa ký tự mask
            expect(c.cccd).toContain('••••••••');
          }
          if (c.cccd_masked && c.cccd_masked !== 'Chưa có') {
            expect(c.cccd_masked).not.toMatch(/^\d{12}$/);
          }
        }
      }
    });

    it('TASK-005: GET /api/households từ chối tham số độ tuổi và năm không hợp lệ với HTTP 400', async () => {
      const resNegAge = await request(app)
        .get('/api/households?minAge=-5')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resNegAge.status).toBe(400);
      expect(resNegAge.body.error).toContain('minAge');

      const resHighAge = await request(app)
        .get('/api/households?maxAge=999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resHighAge.status).toBe(400);
      expect(resHighAge.body.error).toContain('maxAge');

      const resInverted = await request(app)
        .get('/api/households?minAge=50&maxAge=20')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resInverted.status).toBe(400);

      const resInvalidYear = await request(app)
        .get('/api/households?year=1800')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resInvalidYear.status).toBe(400);
      expect(resInvalidYear.body.error).toContain('year');
    });

    it('TASK-010: GET /api/households?search=... tìm kiếm chính xác theo số CCCD', async () => {
      // Tìm theo 12 số CCCD của chủ hộ test: '064080001122'
      const res = await request(app)
        .get('/api/households?search=064080001122')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      const found = res.body.data.find((h: any) => h.id === testHouseholdId);
      expect(found).toBeDefined();

      // Tìm theo 4 số cuối CCCD: '1122'
      const resLast4 = await request(app)
        .get('/api/households?search=1122')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resLast4.status).toBe(200);
      expect(resLast4.body.data.some((h: any) => h.id === testHouseholdId)).toBe(true);
    });

    afterAll(async () => {
      if (testHouseholdId) {
        await prisma.citizens.deleteMany({ where: { household_id: testHouseholdId } });
        await prisma.households.deleteMany({ where: { id: testHouseholdId } });
      }
      if (filterTestHouseholdId) {
        await prisma.citizens.deleteMany({ where: { household_id: filterTestHouseholdId } });
        await prisma.households.deleteMany({ where: { id: filterTestHouseholdId } });
      }
    });
  });

  describe('11. Kiểm tra nâng cấp Nhật Ký Hoạt Động (Audit Log Scoping & Parsed JSON)', () => {
    let auditTestHouseholdId: string;
    let auditHeadCitizenId: string;

    it('Admin tạo hộ khẩu tại Thôn 1 -> GET /api/audit-logs?village_id=... trả về chính xác sự kiện, đúng village_id và JSON parse hợp lệ', async () => {
      // 1. Admin tạo hộ khẩu tại Thôn 1
      const createRes = await request(app)
        .post('/api/households')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          village_id: thon1VillageId,
          book_number: 'SHK-AUDIT-TEST-001',
          address: '123 Đường Test Audit',
          status: 'active',
          citizens: [
            {
              full_name: 'Trần Văn Audit',
              relationship: 'Chủ hộ',
              is_head: true,
              gender: 'Nam',
              dob: '1985-05-15',
              cccd: '064085009988',
              ethnicity: 'Kinh',
              religion: 'Không',
            },
          ],
        });

      expect(createRes.status).toBe(201);
      auditTestHouseholdId = createRes.body.data.id;
      auditHeadCitizenId = createRes.body.data.citizens[0].id;

      // 2. Admin gọi GET /api/audit-logs với village_id của Thôn 1
      const auditRes = await request(app)
        .get(`/api/audit-logs?village_id=${thon1VillageId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.success).toBe(true);
      expect(Array.isArray(auditRes.body.data)).toBe(true);
      expect(auditRes.body.data.length).toBeGreaterThan(0);

      // Tìm sự kiện CREATE vừa tạo
      const createLog = auditRes.body.data.find(
        (log: any) => log.entity_id === auditTestHouseholdId && log.action === 'CREATE'
      );
      expect(createLog).toBeDefined();
      expect(createLog.village_id).toBe(thon1VillageId);

      // Kiểm tra old_values và new_values là Object JSON, không phải chuỗi thô (raw String)
      expect(createLog.old_values).toBeNull();
      expect(typeof createLog.new_values).toBe('object');
      expect(createLog.new_values).not.toBeNull();
      expect(createLog.new_values.book_number).toBe('SHK-AUDIT-TEST-001');
      expect(createLog.new_values.head_name).toBe('Trần Văn Audit');
      expect(createLog.new_values.members_count).toBe(1);
    });

    it('Admin cập nhật hộ khẩu -> GET /api/audit-logs trả về diff chi tiết (old_values & new_values dạng JSON Object)', async () => {
      // 1. Cập nhật hộ khẩu vừa tạo (đổi địa chỉ và thêm thành viên con)
      const updateRes = await request(app)
        .put(`/api/households/${auditTestHouseholdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          book_number: 'SHK-AUDIT-TEST-001',
          address: '456 Đường Test Audit Mới',
          version: 1,
          citizens: [
            {
              id: auditHeadCitizenId,
              full_name: 'Trần Văn Audit Đổi Tên',
              relationship: 'Chủ hộ',
              is_head: true,
              gender: 'Nam',
              dob: '1985-05-15',
              cccd: '••••••••9988',
            },
            {
              full_name: 'Trần Thị Con',
              relationship: 'Con đẻ',
              is_head: false,
              gender: 'Nữ',
              dob: '2015-06-06',
              cccd: '064215001122',
            },
          ],
        });

      expect(updateRes.status).toBe(200);

      // 2. Tra cứu audit logs
      const auditRes = await request(app)
        .get(`/api/audit-logs?village_id=${thon1VillageId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      const updateLog = auditRes.body.data.find(
        (log: any) => log.entity_id === auditTestHouseholdId && log.action === 'UPDATE'
      );
      expect(updateLog).toBeDefined();
      expect(updateLog.village_id).toBe(thon1VillageId);

      // Kiểm tra old_values và new_values là Object JSON
      expect(typeof updateLog.old_values).toBe('object');
      expect(updateLog.old_values).not.toBeNull();
      expect(typeof updateLog.new_values).toBe('object');
      expect(updateLog.new_values).not.toBeNull();

      // Kiểm tra cấu trúc diff chi tiết
      expect(updateLog.old_values.address).toBe('123 Đường Test Audit');
      expect(updateLog.new_values.address).toBe('456 Đường Test Audit Mới');
      expect(Array.isArray(updateLog.new_values.added_members)).toBe(true);
      expect(updateLog.new_values.added_members.length).toBe(1);
      expect(updateLog.new_values.added_members[0].full_name).toBe('Trần Thị Con');
      expect(Array.isArray(updateLog.new_values.updated_members)).toBe(true);
      expect(updateLog.new_values.updated_members.length).toBe(1);
      expect(updateLog.new_values.updated_members[0].full_name).toBe('Trần Văn Audit Đổi Tên');
    });

    afterAll(async () => {
      if (auditTestHouseholdId) {
        await prisma.citizens.deleteMany({ where: { household_id: auditTestHouseholdId } });
        await prisma.households.deleteMany({ where: { id: auditTestHouseholdId } });
        await prisma.audit_logs.deleteMany({ where: { entity_id: auditTestHouseholdId } });
      }
    });
  });

  describe('12. Thùng Rác Hộ Khẩu (Recycle Bin API & Shadowing Prevention)', () => {
    let deletedHouseholdId: string;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/households')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          village_id: thon1VillageId,
          book_number: 'SHK-RECYCLE-TEST',
          address: 'Thùng rác test',
          status: 'active',
          citizens: [
            {
              full_name: 'Nguyễn Văn Rác',
              relationship: 'Chủ hộ',
              is_head: true,
              gender: 'Nam',
            },
          ],
        });
      deletedHouseholdId = createRes.body.data.id;
      await request(app)
        .delete(`/api/households/${deletedHouseholdId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });

    it('GET /api/households/recycle-bin: Trả về danh sách hộ đã xóa mềm, không bị route /:id shadowing nuốt', async () => {
      const res = await request(app)
        .get('/api/households/recycle-bin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((h: any) => h.id === deletedHouseholdId);
      expect(found).toBeDefined();
      expect(found.is_deleted).toBe(true);
    });

    it('POST /api/households/:id/restore: Khôi phục hộ thành công từ thùng rác', async () => {
      const res = await request(app)
        .post(`/api/households/${deletedHouseholdId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkRes = await request(app)
        .get('/api/households/recycle-bin')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(checkRes.body.data.some((h: any) => h.id === deletedHouseholdId)).toBe(false);
    });

    afterAll(async () => {
      if (deletedHouseholdId) {
        await prisma.citizens.deleteMany({ where: { household_id: deletedHouseholdId } });
        await prisma.households.deleteMany({ where: { id: deletedHouseholdId } });
      }
    });
  });

  describe('13. Cơ sở dữ liệu và Tác vụ Sao lưu (Backup API & Auto-Backup Cron)', () => {
    it('GET /api/backup/export: Từ chối truy cập khi không có token (401)', async () => {
      const res = await request(app).get('/api/backup/export');
      expect(res.status).toBe(401);
    });

    it('GET /api/backup/export: Từ chối cán bộ cơ sở (non-admin) (403)', async () => {
      const res = await request(app)
        .get('/api/backup/export')
        .set('Authorization', `Bearer ${thon1Token}`);
      expect(res.status).toBe(403);
    });

    it('GET /api/backup/export: Quản trị viên xuất toàn bộ 7 bảng CSDL (200 OK)', async () => {
      const res = await request(app)
        .get('/api/backup/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metadata).toBeDefined();
      expect(res.body.metadata.app).toBe('qlhk-backend');
      expect(res.body.metadata.schema).toBe('qlhk');
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.villages)).toBe(true);
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(Array.isArray(res.body.data.refresh_tokens)).toBe(true);
      expect(Array.isArray(res.body.data.households)).toBe(true);
      expect(Array.isArray(res.body.data.citizens)).toBe(true);
      expect(Array.isArray(res.body.data.audit_logs)).toBe(true);
      expect(Array.isArray(res.body.data.settings)).toBe(true);
    });

    it('runAutoBackup: Thực thi snapshot 7 bảng ra file backups/qlhk_backup_*.json', async () => {
      const { runAutoBackup } = await import('../src/controllers/backup.controller');
      const backupPath = await runAutoBackup();
      expect(backupPath).toBeTruthy();
      const fs = await import('fs');
      expect(fs.existsSync(backupPath!)).toBe(true);
      // Clean up file sau khi test
      if (backupPath && fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    });
  });
});
