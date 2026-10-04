# QLHK-Backend (Quản lý Hộ khẩu - Nhân khẩu Xã Đăk Hà)

Phân hệ Backend chuyên biệt phục vụ công tác quản lý hộ khẩu, nhân khẩu, biến động dân cư và đồng bộ dữ liệu Excel cho các thôn/làng trực thuộc Ủy ban Nhân dân Xã Đăk Hà.

---

## 1. Tổng quan & Tiêu chuẩn Hệ sinh thái Đăk Hà

- **Cổng dịch vụ (Port):** `5002` (Hệ sinh thái: QLCS port 5000, QLNN port 5001, QLHK port 5002)
- **Health Check Endpoint:** `GET /api/health`
  ```json
  {
    "status": "ok",
    "app": "qlhk-backend",
    "version": "1.0.0",
    "timestamp": "2026-09-03T11:01:14.484Z",
    "uptime": 26
  }
  ```
- **Xác thực độc lập (Independent Auth):** Sử dụng JWT Token Rotation độc lập (`JWT_SECRET`, `JWT_REFRESH_SECRET`).
- **Phân quyền phạm vi Thôn/Xã (Village Scoping RBAC Middleware):**
  - **Admin cấp xã (`role: 'admin'`, `village_id: null`):** Quản lý và xem toàn bộ các thôn.
  - **Trưởng thôn (`role: 'user'`, `village_id: '<villageId>'`):** Chỉ được phép truy cập và sửa đổi dữ liệu thuộc thôn của mình. Tự động chặn 403 nếu cố truy xuất thôn khác.
- **Khóa lạc quan (Optimistic Concurrency Control - OCC):** Kiểm tra cột `version: Int` khi cập nhật Hộ khẩu và Nhân khẩu; trả về HTTP `409 Conflict` nếu dữ liệu đã bị sửa đổi bởi người khác.
- **Xóa mềm (Soft Delete):** Kiểm soát qua `is_deleted: Boolean` và `deleted_at: DateTime?`.
- **Bảo mật CCCD:**
  - Mã hóa đối xứng AES-256-GCM lưu dưới dạng `iv:authTag:encryptedHex`.
  - Sinh mã băm tìm kiếm `cccd_hash` (SHA-256) phục vụ tra cứu chính xác.
  - Cắt `cccd_last4` (4 số cuối) phục vụ hiển thị nhanh an toàn.

---

## 2. Cấu trúc CSDL (Prisma Schema)

CSDL tương thích SQLite (phục vụ kiểm thử/phát triển cục bộ) và PostgreSQL (Supabase production) với 7 bảng:

1. `villages`: Danh mục thôn/làng của Xã Đăk Hà (`Thôn 1`, `Thôn 2`, `Thôn 3`, `Thôn 4`, `Thôn 5`, `Thôn Kon Đao Yôp`, `Làng Kon Hnông Bách`).
2. `users`: Tài khoản cán bộ xã & trưởng thôn, mật khẩu băm bcrypt.
3. `refresh_tokens`: Quản lý luân chuyển JWT Token Rotation.
4. `households`: Danh sách hộ khẩu gia đình (`id`, `village_id`, `book_number`, `address`, `status`, `version`, `is_deleted`, `deleted_at`).
5. `citizens`: Danh sách nhân khẩu (`id`, `household_id`, `stt`, `is_head`, `relationship`, `full_name`, `name_unaccented`, `dob`, `gender`, `cccd`, `cccd_hash`, `cccd_last4`, `ethnicity`, `religion`, `notes`, `version`, `is_deleted`, `deleted_at`).
6. `audit_logs`: Nhật ký kiểm toán biến động nhân hộ khẩu.
7. `settings`: Cấu hình hệ thống key-value.

---

## 3. Bộ bóc tách Excel thông minh (`Nhân hộ khẩu.xls`)

- Tự động nhận diện Chủ hộ qua ký hiệu `CH` (Cột 1) và gom nhóm toàn bộ thành viên tiếp theo vào cùng hộ gia đình cho đến khi gặp chủ hộ kế tiếp.
- Ghép Họ lót + Tên thành Họ và tên đầy đủ, sinh chuỗi không dấu phục vụ tra cứu.
- Chuẩn hóa ngày sinh:
  - Chuyển đổi số serial Excel (ví dụ `37121`) thành `DD/MM/YYYY` (`18/08/2001`).
  - Tự động nhận diện và sửa năm 3 chữ số (ví dụ `11/01/976` -> `11/01/1976`).
  - Phát hiện ngày/tháng không hợp lệ (ví dụ tháng 17 trong `15/17/1989`) và gán cờ cảnh báo `warning`.
- Hỗ trợ 2 API:
  - `POST /api/excel/preview`: Trả về dữ liệu bóc tách xem trước kèm mảng warnings.
  - `POST /api/excel/import`: Chạy Prisma Transaction lưu an toàn toàn bộ dữ liệu vào DB.

---

## 4. Danh sách API Chính

| Method | Endpoint | Mô tả | Quyền truy cập |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Kiểm tra trạng thái hệ thống | Public |
| `POST` | `/api/auth/login` | Đăng nhập tài khoản xã / thôn | Public |
| `POST` | `/api/auth/refresh` | Làm mới JWT token (Rotation) | Public |
| `POST` | `/api/auth/logout` | Đăng xuất, hủy refresh token | Public |
| `GET` | `/api/auth/me` | Lấy thông tin tài khoản hiện tại | Đã đăng nhập |
| `GET` | `/api/villages` | Danh sách các thôn và số lượng hộ | Đã đăng nhập |
| `GET` | `/api/households` | Danh sách hộ khẩu (phân trang, lọc theo thôn, tìm kiếm) | Village Scoped |
| `GET` | `/api/households/:id` | Chi tiết hộ khẩu và thành viên | Village Scoped |
| `POST` | `/api/households` | Tạo hộ khẩu mới | Village Scoped |
| `PUT` | `/api/households/:id` | Cập nhật hộ khẩu (Kiểm tra OCC `version`) | Village Scoped |
| `DELETE` | `/api/households/:id` | Xóa mềm hộ khẩu và nhân khẩu thuộc hộ | Village Scoped |
| `GET` | `/api/citizens` | Danh sách nhân khẩu (tìm kiếm theo tên không dấu, CCCD hash) | Village Scoped |
| `GET` | `/api/citizens/:id` | Chi tiết nhân khẩu (ẩn mã hóa CCCD) | Village Scoped |
| `GET` | `/api/citizens/:id/reveal-cccd` | Giải mã hiển thị CCCD gốc | Village Scoped |
| `POST` | `/api/citizens` | Thêm nhân khẩu vào hộ (Mã hóa AES-256-GCM) | Village Scoped |
| `PUT` | `/api/citizens/:id` | Cập nhật nhân khẩu (Kiểm tra OCC `version`) | Village Scoped |
| `DELETE` | `/api/citizens/:id` | Xóa mềm nhân khẩu | Village Scoped |
| `POST` | `/api/excel/preview` | Xem trước kết quả bóc tách file Excel mẫu | Village Scoped |
| `POST` | `/api/excel/import` | Nhập toàn bộ dữ liệu Excel vào CSDL (Transaction) | Village Scoped |
| `GET` | `/api/analytics/overview` | Thống kê tổng quan xã: cơ cấu giới tính, 14 dân tộc, tôn giáo | Village Scoped |
| `GET` | `/api/analytics/by-village` | Bảng so sánh chỉ số giữa các thôn | Village Scoped |

---

## 5. Hướng dẫn Khởi chạy & Kiểm thử

```bash
# 1. Cài đặt dependencies
npm install

# 2. Sinh Prisma Client & Đồng bộ CSDL
npx prisma generate
npx prisma db push

# 3. Nạp dữ liệu mẫu các thôn & tài khoản quản trị
npx tsx prisma/seed.ts

# 4. Chạy bộ kiểm thử toàn diện (Vitest)
npm test

# 5. Chạy máy chủ ở chế độ phát triển (Port 5002)
npm run dev

# 6. Build dự án sang thư mục dist
npm run build
npm start
```

---

## 6. Tài khoản Thử nghiệm Mặc định

- **Quản trị viên Cấp Xã (Admin):**
  - Username: `admin`
  - Password: `admin123`
  - Quyền hạn: Quản lý toàn bộ các thôn, xem và điều chỉnh dữ liệu toàn xã.
- **Trưởng Thôn (Ví dụ Thôn 1):**
  - Username: `thon1`
  - Password: `thon1@123`
  - Quyền hạn: Chỉ truy cập và điều chỉnh dữ liệu thuộc Thôn 1.
- **Các trưởng thôn khác:** `thon2` (`thon2@123`), `thon3` (`thon3@123`), `thon4` (`thon4@123`), `thon5` (`thon5@123`), `thonkdy` (`thonkdy@123`), `langkhb` (`langkhb@123`).
