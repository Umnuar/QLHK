# Subagent B4 Roadmap: Excel Streaming Engine

## Mục tiêu
Cung cấp động cơ nhập/xuất tệp Excel chuyên dụng phục vụ công tác quản lý hộ khẩu, nhân khẩu và danh sách chúc thọ với tốc độ cao, định dạng chuẩn hành chính và tự động mã hóa CCCD.

## Bất biến P0
- Zero comments in code: 0 dòng comment trong bất kỳ file code nào.
- Toàn bộ CCCD đọc từ Excel phải được mã hóa qua `src/crypto::encrypt_cccd` và băm bằng `src/crypto::hash_cccd`.
- Toàn bộ CCCD xuất ra Excel phải được giải mã qua `src/crypto::decrypt_cccd`.

## Chi tiết Endpoints
1. `POST /api/excel/import`:
   - Multipart upload file `.xlsx`.
   - Đọc dữ liệu qua `calamine::open_workbook_from_rs` từ byte stream in-memory.
   - Nhận diện các cột: STT, Số sổ hộ khẩu, Họ và tên, Quan hệ với chủ hộ, Ngày sinh, Giới tính, Dân tộc, Tôn giáo, Số CCCD, Nghề nghiệp, Nơi làm việc, Quê quán, Địa chỉ thường trú.
   - Mã hóa CCCD, upsert hộ khẩu và nhân khẩu vào database theo transaction.
   - Trả về JSON:
     ```json
     {
       "success": true,
       "imported_count": 45,
       "errors": []
     }
     ```
2. `GET /api/excel/export`:
   - Query: `village_id` (optional).
   - Truy vấn toàn bộ nhân khẩu và hộ khẩu thuộc thôn/toàn xã.
   - Dùng `rust_xlsxwriter` tạo workbook:
     - Font: Times New Roman.
     - Header: Màu cyan `#E0F2FE`, chữ in hoa đậm, căn giữa.
     - Viền ô mỏng.
     - Đầy đủ 16 cột hành chính.
   - Trả về Header:
     - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
     - `Content-Disposition: attachment; filename="Danh_sach_nhan_ho_khau.xlsx"`
3. `GET /api/excel/template`:
   - Tạo file `.xlsx` mẫu chứa dòng tiêu đề chuẩn và 1 dòng hướng dẫn nhập liệu mẫu.
4. `GET /api/excel/export/chuctho`:
   - Query: `village_id`, `year`.
   - Xuất danh sách mừng thọ (người cao tuổi từ 60 trở lên, nhóm theo các mốc 60, 65, 70, 75, 80, 85, 90+).

## Kế hoạch kiểm thử
- `cargo check`: Exit code 0.
