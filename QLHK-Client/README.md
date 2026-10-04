# QLHK-Client (Quản lý Hộ khẩu - Nhân khẩu Xã Đăk Hà)

Ứng dụng giao diện Desktop Client & Web Preview quản lý Sổ Hộ Khẩu và Nhân Khẩu trực thuộc **Hệ sinh thái Dữ liệu Đăk Hà**.

## 1. Công nghệ sử dụng
- **Frontend Core**: React 18 + Vite 5 + TypeScript + TailwindCSS 4
- **Biểu tượng & Giao diện**: Lucide Icons, Modern Clean UI
- **Điều hướng**: React Router DOM (HashRouter tương thích hoàn hảo cả Web Preview & Electron)
- **Truy xuất dữ liệu**: Axios + Local Storage & Seed Data Fallback (100% Offline-First)
- **Bóc tách Excel**: SheetJS (XLSX)
- **Desktop Runtime**: Electron 42 + Context Bridge IPC
- **Khung kiểm thử**: Vitest (100% PASS)

## 2. Các màn hình chức năng chính
1. **Màn hình 1: Dashboard Thống kê Toàn cảnh Nhân hộ khẩu**:
   - 4 thẻ KPI: Tổng số hộ, Tổng nhân khẩu, Tỷ lệ Nam/Nữ, Tỷ lệ Dân tộc thiểu số (DTTS).
   - Biểu đồ phân bổ cơ cấu 14 Dân tộc (Cor, Cơ Ho, Dao, Dìu, Ê Đê, Gia Rai, Xơ Đăng, Giẻ Triêng, Giơ Lâng, Ha Lăng, Hoa, Hrê, Khách Gia, Kinh).
   - Bảng số liệu chi tiết phân bổ theo các Thôn của Xã Đăk Hà.

2. **Màn hình 2: Quản lý Sổ Hộ Khẩu & Danh sách Nhân Khẩu**:
   - Bộ lọc theo Thôn, ô tìm kiếm tiếng Việt không dấu (tìm theo tên chủ hộ, tên nhân khẩu, số CCCD).
   - Danh sách Hộ dạng thẻ Accordion bung mở xem các thành viên.
   - Highlight nổi bật thành viên là **Chủ hộ (`CH`)**.
   - Thao tác: Thêm mới hộ, sửa hộ, xóa mềm hộ vào Thùng rác.

3. **Màn hình 3: Modal Chi tiết & Thêm/Sửa Nhân khẩu**:
   - Tự động tách/gộp họ lót và tên.
   - Nhập ngày tháng năm sinh linh hoạt: hỗ trợ `DD/MM/YYYY`, `MM/YYYY`, hoặc `YYYY`, tự động tính tuổi ngay khi nhập.
   - Dropdown chuẩn 14 Dân tộc và danh mục Tôn giáo.
   - Số CCCD: Ẩn chỉ hiện 4 số cuối ở danh sách, hỗ trợ chuyển đổi chế độ Admin để xem đầy đủ 12 số.

4. **Màn hình 4: Trình bóc tách & Import Excel (`Nhân hộ khẩu.xls`)**:
   - Khu vực kéo thả file `.xls` / `.xlsx`.
   - Xem trước đối soát dữ liệu (Preview) trước khi lưu.
   - Tự động phát hiện lỗi định dạng và gắn badge đỏ/cam: ngày sinh thiếu số (`11/01/976`), tháng sai (`15/17/1989`), ngày sai (`32/01/2000`).
   - Nút xác nhận lưu an toàn vào hệ thống.

5. **Màn hình 5: Thùng rác & Khôi phục (Trash & Restore)**:
   - Danh sách các hộ bị xóa mềm.
   - Khôi phục nguyên trạng (Restore) hoặc xóa vĩnh viễn (Admin).
   - Dọn sạch thùng rác.

## 3. Lệnh khởi chạy & Kiểm thử

```powershell
# Chạy Web Preview trên cổng 5175
npm run dev

# Kiểm thử Vitest
npm run test

# Biên dịch sản phẩm
npm run build:vite
```
