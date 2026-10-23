# Subagent B2 Roadmap: Villages & Users Management

## Mục tiêu
Quản lý danh mục thôn/xóm và tài khoản cán bộ kèm phân quyền module và thôn phụ trách.

## Bất biến P0
- Zero comments in code: 0 dòng comment trong bất kỳ file code nào.
- Mật khẩu tạo mới hoặc cập nhật bắt buộc hash bằng `bcrypt::hash(password, 10)`.
- Không được phép xóa chính tài khoản đang đăng nhập hoặc tài khoản admin duy nhất.

## Chi tiết Endpoints
1. `GET /api/villages`:
   - Trả về danh sách thôn kèm số lượng hộ khẩu `household_count`.
   - Cấu trúc: `{ "success": true, "data": [ { "id": "uuid", "name": "...", "code": "...", "household_count": 120 } ] }`.
2. `POST /api/villages`:
   - Body: `{ name, code }`.
   - Kiểm tra trùng tên và mã thôn. Trả về 201 Created.
3. `PUT /api/villages/:id`:
   - Cập nhật thông tin thôn.
4. `DELETE /api/villages/:id`:
   - Kiểm tra nếu thôn còn hộ khẩu hoạt động thì trả về 400 Bad Request.
   - Nếu trống, cho phép xóa.
5. `GET /api/users`:
   - Trả về danh sách tài khoản kèm tên thôn và `module_access`.
   - Cấu trúc: `{ "success": true, "data": [ ... ] }`.
6. `POST /api/users`:
   - Body: `{ username, password, role, village_id, full_name, module_access }`.
   - Kiểm tra trùng username, hash password qua `bcrypt::hash`.
7. `PUT /api/users/:id`:
   - Cập nhật thông tin tài khoản (full_name, role, village_id, module_access).
8. `DELETE /api/users/:id`:
   - Kiểm tra không xóa chính mình hoặc admin duy nhất.
9. `PUT /api/users/:id/password`:
   - Body: `{ password }`.
   - Hash password mới và cập nhật.

## Kế hoạch kiểm thử
- `cargo check`: Exit code 0.
