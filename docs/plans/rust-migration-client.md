# KẾ HOẠCH TỐI ƯU HÓA CLIENT VÀ TAURI RUST ENGINE

## 1. MỤC TIÊU VÀ PHẠM VI
- Nâng cấp ứng dụng Client (`QLHK/QLHK-Client`) tận dụng tối đa sức mạnh của Rust trong `src-tauri`.
- Giảm tải 100% các tác vụ nặng (xử lý Excel, mã hóa cục bộ, tìm kiếm offline) sang Rust Background Thread.
- Tối ưu trải nghiệm công thái học (Ergonomics) cho cán bộ xã nhập liệu siêu tốc.

## 2. BẤT BIẾN KỸ THUẬT (P0 INVARIANTS)
- **Zero Comments in Code**: Tuyệt đối không viết comment trong toàn bộ code Rust hoặc TypeScript mới và sửa đổi (`//`, `/* */`).
- **Hiệu quả thực tế > Tối ưu máy móc**: Thiết kế form nhập liệu thuận tiện tối đa cho cán bộ, nhịp thở thị giác thoáng đãng, phân nhóm quan hệ gia đình rõ ràng, phím tắt mượt mà.
- **Tương thích Chuyển đổi**: Cho phép Client chuyển đổi linh hoạt giữa Node.js backend (cổng 5002) và Rust backend (cổng 5012) phục vụ kiểm thử song song (shadow testing).

## 3. PHÂN CHIA SUBAGENT CLIENT (C1 - C3)
Client Agent chủ động sinh hoặc điều phối các Subagent sau:

### Subagent C1: Tauri Excel Population Engine (`src-tauri`)
- Crate: `calamine = "0.26"`, `rust_xlsxwriter = "0.78"`, `rayon = "1.10"`.
- Lệnh Tauri (`#[tauri::command]`):
  - `export_households_excel`: Xuất file Excel hộ khẩu - nhân khẩu chuẩn định dạng biểu mẫu hành chính:
    - Tiêu ngữ, Quốc hiệu, Font Times New Roman 11pt.
    - Màu sắc header cyan trang nhã, kẻ khung viền mỏng toàn bộ bảng.
    - Xử lý trực tiếp trong bộ nhớ bằng Rust rồi lưu file qua hộp thoại native dialog, không làm đơ UI.
  - `parse_excel_population`: Đọc và phân tích file Excel hàng chục nghìn dòng siêu tốc qua đa luồng `rayon`, trả về danh sách đã chuẩn hóa và cảnh báo lỗi dữ liệu tức thì.

### Subagent C2: Citizen / Household Modal Ergonomics (`UI Polish`)
- Tối ưu hóa Form nhập liệu Nhân khẩu (`CitizenModal.tsx`) và Hộ khẩu (`HouseholdDrawer.tsx` / `HouseholdModal`):
  - Hỗ trợ phím tắt siêu tốc: Nhấn `Enter` để lưu hoặc chuyển trường tiếp theo, `Tab` điều hướng mượt mà không bị kẹt.
  - Tự động `focus` vào trường Họ và tên ngay khi mở modal.
  - Cảnh báo trùng CCCD tức thì khi nhập đủ 12 số (hiển thị thông tin người bị trùng: họ tên, số sổ hộ).
  - Phân cấp thị giác rõ ràng cho Chủ hộ: Badge nổi bật, nhóm quan hệ gia đình tự động gợi ý theo vị trí chủ hộ.
  - Khoảng cách và độ tương phản cao, phông chữ và nhãn rõ ràng theo tiêu chuẩn công thái học.

### Subagent C3: Offline Search & Dual Backend Switcher
- Cung cấp cơ chế chuyển đổi cổng Backend trong cài đặt hoặc biến môi trường:
  - Cho phép người dùng chuyển nhanh giữa cổng 5002 (Node.js) và cổng 5012 (Rust Backend).
  - Tìm kiếm mờ không dấu offline: Sử dụng crate `deunicode` trên Rust hoặc worker để lọc hàng chục nghìn nhân khẩu phản hồi dưới 1ms.

## 4. CẤU HÌNH CRATE TAURI (src-tauri/Cargo.toml)
Bổ sung các crate xử lý thuật toán:
```toml
[dependencies]
calamine = "0.26"
rust_xlsxwriter = "0.78"
rayon = "1.10"
deunicode = "1.6"
aes-gcm = "0.10"
sha2 = "0.10"
hmac = "0.12"
hex = "0.4"
```
