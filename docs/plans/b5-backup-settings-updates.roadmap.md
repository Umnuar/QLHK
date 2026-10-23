# Subagent B5 Roadmap: Backup, Settings & Desktop Updates

## Mục tiêu
Hoàn thiện các tính năng sao lưu, phục hồi dữ liệu, quản lý tham số cấu hình hệ thống và endpoint cấp bản cập nhật cho ứng dụng Desktop Tauri.

## Bất biến P0
- Zero comments in code: 0 dòng comment trong bất kỳ file code nào.
- Dữ liệu sao lưu phải bảo vệ an toàn các chuỗi mã hóa CCCD.

## Chi tiết Endpoints
1. `GET /api/settings`:
   - Lấy toàn bộ danh sách thiết lập cấu hình từ bảng `settings`.
   - Trả về JSON:
     ```json
     {
       "success": true,
       "data": [
         {
           "key": "system_name",
           "value": "Hệ thống Quản lý Hộ khẩu Đăk Hà",
           "description": "Tên đơn vị quản lý"
         }
       ]
     }
     ```
2. `PUT /api/settings`:
   - Body: `{ key, value, description }` hoặc mảng `[ { key, value } ]`.
   - Cập nhật hoặc thêm mới vào bảng `settings`.
3. `POST /api/backup`:
   - Tạo bản sao lưu dữ liệu toàn diện (hộ khẩu, nhân khẩu, thôn, chính sách, cấu hình) dưới dạng JSON nén hoặc file `.sql` trong thư mục `backups/`.
   - Trả về thông tin tên file và kích thước.
4. `GET /api/backup/list`:
   - Trả về danh sách các tệp sao lưu hiện có kèm dung lượng và thời gian tạo.
5. `POST /api/backup/restore`:
   - Body: `{ filename }` hoặc file upload.
   - Khôi phục dữ liệu từ bản sao lưu.
6. `GET /api/updates/latest`:
   - Endpoint phục vụ Tauri Desktop Updater (`tauri-plugin-updater`).
   - Query: `target`, `arch`, `current_version`.
   - Trả về JSON:
     ```json
     {
       "version": "1.5.1",
       "notes": "Bản nâng cấp tối ưu hóa động cơ Rust và công thái học",
       "pub_date": "2026-10-23T12:00:00Z",
       "platforms": {}
     }
     ```

## Kế hoạch kiểm thử
- `cargo check`: Exit code 0.
