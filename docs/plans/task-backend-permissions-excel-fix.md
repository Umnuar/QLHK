# NHIỆM VỤ BACKEND AGENT: FIX LƯU HỒ SƠ, PHÂN QUYỀN MODULE VÀ XUẤT EXCEL CHUẨN

## 1. MỤC TIÊU VÀ NGUYÊN TẮC P0
- Sửa lỗi HTTP 500 khi lưu cập nhật hồ sơ Chúc Thọ và HTXH (do Prisma nhận các trường quan hệ/hệ thống).
- Thêm trường phân quyền module (`module_access`: `"all" | "qlhk" | "qlcs"`) vào schema người dùng và các API auth/user.
- Xây dựng endpoint xuất Excel cho QLHK theo mẫu `data-templates/QLHK/Nhân hộ khẩu.xls` và ảnh `Screenshot 2026-10-23 170432.png` sử dụng thư viện `ExcelJS` đã có sẵn.
- **BẮT BUỘC P0: ZERO COMMENTS TRONG TOÀN BỘ CODE MỚI HOẶC SỬA ĐỔI**. Không thêm bất kỳ comment nào (`//`, `/* */`, `#`, JSDoc). Tự động xóa các comment cũ trong các khối code được chỉnh sửa.

---

## 2. CHI TIẾT CÁC ĐẦU VIỆC

### 2.1. Fix Lỗi Lưu Hồ Sơ HTXH và Chúc Thọ (HTTP 500)
- Tệp: `QLHK/QLHK-Backend/src/controllers/policyHtxh.controller.ts` và `QLHK/QLHK-Backend/src/controllers/policyChuctho.controller.ts`
- Nguyên nhân: Client gửi payload chứa `id`, `village` (object), `created_at`, `updated_at`, `is_deleted`, `deleted_at`, `cccd_hash`, `cccd_last4`, khiến `prisma.htxh_profiles.update` và `prisma.chuctho_profiles.update` ném ngoại lệ Prisma do gặp tham số không hợp lệ trong `data`.
- Giải pháp:
  Trong hàm `updateHtxhProfile` và `updateChucthoProfile`, trước khi gọi `prisma.*_profiles.update({ where: { id }, data })`, thực hiện xóa triệt để các trường cấm:
  ```ts
  delete data.id;
  delete data.village;
  delete data.created_at;
  delete data.updated_at;
  delete data.is_deleted;
  delete data.deleted_at;
  delete data.cccd_hash;
  delete data.cccd_last4;
  ```
  Đảm bảo `data` chỉ chứa các cột hợp lệ của model trong schema.

### 2.2. Phân Quyền Sử Dụng Module (Hộ Khẩu vs Chính Sách)
- Tệp Schema: `QLHK/QLHK-Backend/prisma/schema.prisma`
  Thêm trường `module_access` vào model `users`:
  ```prisma
  module_access     String?             @default("all") @db.VarChar(50)
  ```
  Chạy lệnh: `npx prisma db push` trong thư mục `QLHK/QLHK-Backend` để đồng bộ CSDL PostgreSQL.
- Tệp Controller Auth & Users:
  - `QLHK/QLHK-Backend/src/controllers/auth.controller.ts`:
    - Endpoint `/api/auth/me`, `/api/auth/login`, `/api/auth/refresh`: trả về thêm thuộc tính `module_access: user.module_access || "all"` trong đối tượng `user`.
  - `QLHK/QLHK-Backend/src/controllers/user.controller.ts`:
    - Hàm `getUsers`: trả về `module_access` trong danh sách user.
    - Hàm `createUser`: nhận `module_access` từ `req.body` (mặc định là `"all"` nếu không truyền; kiểm tra hợp lệ: chỉ nhận `"all"`, `"qlhk"`, `"qlcs"`), lưu vào `prisma.users.create`.
    - Hàm `updateUser`: cho phép cập nhật `module_access` khi admin chỉnh sửa tài khoản.

### 2.3. Endpoint Xuất Excel QLHK Chuẩn Mẫu (Nhân hộ khẩu.xls)
- Tệp: `QLHK/QLHK-Backend/src/controllers/household.controller.ts` (hoặc `policyExcel.controller.ts` / tạo hàm mới và gắn vào route `household.routes.ts`)
- Thêm route: `GET /api/households/export-excel` (hỗ trợ cả `POST /api/households/export-excel` nếu truyền danh sách `household_ids` lớn).
- Sử dụng `ExcelJS` để sinh file `.xlsx` định dạng chính xác 100% theo mẫu:
  1. Tên sheet: `"Dl Hộ"`.
  2. Bố cục tiêu đề:
     - Dòng 1: Merge A1:D1 "UBND TỈNH QUẢNG NGÃI\nUBND XÃ ĐĂK HÀ" (font Times New Roman, bold, center). Merge F1:J1 "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự Do - Hạnh Phúc" (font Times New Roman, bold, center).
     - Dòng 2: Merge A2:D2 "THÔN: " + (tên thôn || "....................") (font Times New Roman, bold, center). Merge F2:J2 "Đăk Hà, ngày      tháng      năm" (italic, center).
     - Dòng 3: Merge A3:K3 "DỮ LIỆU HỘ - NHÂN KHẨU" (font Times New Roman, size 14, bold, center).
     - Dòng 4: Dòng trống.
     - Dòng 5 & 6 (Header bảng, merge các ô tương ứng):
       - A5:A6: "STT"
       - B5:C5: "HỘ GIA ĐÌNH", B6: "Chủ hộ", C6: "Thành viên"
       - D5:E6: "HỌ VÀ TÊN"
       - F5:J5: "PHÂN TÍCH HỘ GIA ĐÌNH", F6: "Ngày, tháng, năm sinh ", G6: "Tuổi", H6: "Nữ", I6: "DTTS", J6: "Tôn giáo"
       - K5:K6: "Ghi chú"
     - Định dạng Header (Dòng 5 và 6):
       - Màu nền: Solid fill `#CCE5EE` (`{ type: "pattern", pattern: "solid", fgColor: { argb: "FFCCE5EE" } }`).
       - Chữ in đậm (bold), căn giữa ngang (center) và căn giữa dọc (middle).
       - Viền đen mỏng (border thin black) cho mọi ô từ A5 đến K6.
  3. Dữ liệu bảng (Từ dòng 7 trở đi):
     - Truy vấn danh sách hộ và nhân khẩu (`households` include `citizens`/`members` hoặc lấy từ DB theo các bộ lọc: `village_id`, `search`, `status`, `gender`, `ethnicity`, danh sách ID đã chọn).
     - Sắp xếp STT tăng dần từ 1 cho từng nhân khẩu.
     - Cột A (STT): số nguyên.
     - Cột B (Chủ hộ): "CH" nếu là chủ hộ, rỗng nếu là thành viên.
     - Cột C (Thành viên): STT thành viên trong hộ (1, 2, 3...).
     - Cột D (Họ và đệm): lấy họ và tên đệm, viết IN HOA toàn bộ (ví dụ: "NGUYỄN VĂN").
     - Cột E (Tên): lấy tên chính, viết IN HOA toàn bộ (ví dụ: "A").
     - Cột F (Ngày, tháng, năm sinh): ngày sinh (format D/M/YYYY hoặc DD/MM/YYYY).
     - Cột G (Tuổi): số tuổi tính theo năm tính toán.
     - Cột H (Nữ): "X" nếu giới tính Nữ, rỗng nếu Nam.
     - Cột I (DTTS): Tên dân tộc (ví dụ: Kinh, Cor, Xơ Đăng, Giẻ Triêng...).
     - Cột J (Tôn giáo): Mã hoặc tên tôn giáo (ví dụ: CG, TL, PG hoặc rỗng).
     - Cột K (Ghi chú): Ghi chú hoặc tên tôn giáo chi tiết (Công giáo, Tin lành...).
     - Định dạng dữ liệu:
       - Mọi ô dữ liệu có viền mỏng (border thin black).
       - Font: Times New Roman, size 11.
       - Căn chỉnh: Cột A, B, C, F, G, H, J căn giữa (center, middle); Cột D, E, I, K căn trái (left, middle).
  4. Response: Trả về binary stream với header:
     - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
     - `Content-Disposition: attachment; filename="NhanHoKhau_DakHa.xlsx"`

---

## 3. QUALITY GATES NGHIỆM THU
Sau khi hoàn thành, hãy chạy và kiểm tra các tiêu chuẩn sau:
1. `cd QLHK/QLHK-Backend; npx tsc --noEmit` -> 0 lỗi.
2. `cd QLHK/QLHK-Backend; npx vitest run tests/unit` -> Pass 100%. Cập nhật hoặc bổ sung unit test cho các thay đổi mới.
3. Không thực hiện lệnh git destructive.
4. Kiểm tra P0 Zero Comments trong toàn bộ file đã chạm vào.
