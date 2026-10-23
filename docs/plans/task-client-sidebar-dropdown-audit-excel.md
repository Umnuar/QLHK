# NHIỆM VỤ CLIENT AGENT: SIDEBAR NGỮ CẢNH, PORTAL DROPDOWN, KHÓA SỬA/XÓA HỒ SƠ, AUDIT LOG & XUẤT EXCEL CHUẨN

## 1. MỤC TIÊU VÀ NGUYÊN TẮC P0
- Ẩn/hiện 3 mục chính sách trên Sidebar theo ngữ cảnh chọn Thôn và phân quyền module.
- Khóa sửa/xóa hồ sơ Chúc Thọ và HTXH (QLHK làm gốc dữ liệu).
- Khắc phục triệt để lỗi Dropdown `CustomSelect` bị đè/che khuất trong Modal bằng React Portal.
- Chuẩn hóa màn hình Nhật ký hoạt động (Audit Log) theo mẫu giao diện của QLNN (loại bỏ trường nông nghiệp, thêm trường QLHK + QLCS, có TablePagination).
- Bổ sung chọn phân quyền module trong Quản lý người dùng (`SettingsPage.tsx`).
- Tích hợp xuất Excel QLHK chuẩn giao diện theo mẫu `Nhân hộ khẩu.xls` và `Screenshot 2026-10-23 170432.png`.
- **BẮT BUỘC P0: ZERO COMMENTS TRONG TOÀN BỘ CODE MỚI HOẶC SỬA ĐỔI**. Tuyệt đối không viết comment (`//`, `/* */`, `#`, JSDoc). Xóa mọi comment cũ trong các khối mã được chạm vào.

---

## 2. CHI TIẾT CÁC ĐẦU VIỆC

### 2.1. Sidebar Ẩn/Hiện Theo Ngữ Cảnh & Phân Quyền Module
- Tệp: `QLHK/QLHK-Client/src/components/layout/Sidebar.tsx`
- Yêu cầu người dùng:
  "cho ba mục trong sidebar : chúc thọ htxh , tk chính sách dạng ẩn chỉ có bấm vào thôn mới sử dụng được (hoặc bấm vào thống kê toàn xã)"
- Xử lý logic hiển thị:
  1. Với 3 mục chính sách: `chuctho` ("Chúc Thọ"), `htxh` ("Hỗ Trợ Xã Hội"), `policy-analytics` ("TK Chính Sách"):
     - **Bình thường ẩn đi** khi `!selectedVillageId` (khi chưa bấm vào một thôn cụ thể và chưa bấm "Thống kê toàn xã").
     - **Chỉ hiển thị khi `selectedVillageId` có giá trị** (tức là đã bấm vào một thôn hoặc bấm vào nút thống kê toàn xã).
  2. Kiểm tra quyền `user.module_access`:
     - Nếu `module_access === "qlcs"`: Ẩn các mục Quản lý Thôn, Hộ Gia Đình, Thống Kê hộ khẩu, Thùng rác. Chỉ hiển thị các mục Chính Sách (theo điều kiện thôn) và Nhật ký/Cài đặt.
     - Nếu `module_access === "qlhk"`: Ẩn hoàn toàn 3 mục Chính Sách (Chúc Thọ, HTXH, TK Chính Sách).
     - Nếu `module_access === "all"` hoặc là admin: Áp dụng đầy đủ điều kiện ngữ cảnh `selectedVillageId`.

### 2.2. Khóa Sửa/Xóa Hồ Sơ & QLHK Làm Gốc Dùng Chung
- Yêu cầu:
  "các dữ liệu của qlhk và qlcs là dùng chung nên là hồ sơ chúc thọ chung thông tin với qlhk lấy qlhk làm chính bỏ nút chỉnh sửa thông tin và nút xóa hồ sơ , còn bên hưu trí xóa nút xóa hồ sơ , khóa chỉnh sửa thông tin, sửa thông tin xong k thể lưu lại đc"
- Tệp:
  - `QLHK/QLHK-Client/src/features/qlcs/components/dashboard/ProfileRow.tsx`:
    - Khi `activeTab === "chuctho"`:
      - Ẩn hoàn toàn nút Sửa (`Edit3`) và nút Xóa (`Trash2`) trên từng dòng.
      - Sự kiện click vào dòng `<tr onClick=...>` không mở modal sửa (hoặc chỉ mở modal xem chi tiết không có nút sửa/xóa).
    - Khi `activeTab === "htxh"`:
      - Ẩn hoàn toàn nút Xóa (`Trash2`) trên từng dòng.
      - Nút Sửa vẫn giữ để mở modal cập nhật chế độ HTXH.
  - `QLHK/QLHK-Client/src/features/qlcs/components/dashboard/ProfileFilterBar.tsx`:
    - Ẩn nút "Xóa đã chọn" (Batch delete) đối với cả tab `chuctho` và `htxh` để tránh xóa nhầm dữ liệu nhân khẩu gốc.
  - `QLHK/QLHK-Client/src/features/qlcs/components/dashboard/ProfileModal.tsx`:
    - Khi `activeTab === "htxh"` và `!isNew`:
      - **Khóa read-only / disabled** toàn bộ các trường thông tin nhân khẩu: Họ và Tên, Năm sinh / Ngày sinh, Giới tính, Số CCCD, Dân tộc, Thuộc Thôn.
      - **Chỉ cho phép người dùng chỉnh sửa**: Các checkbox phân loại chế độ HTXH (`age75plus`, `age70to74poor`, `bao_tro`, `huu_tri`, `huu_tuat_bao_hiem`, `nguoi_co_cong`), Nơi ở hiện nay (`current_address`), và Ghi chú (`notes`).
      - Khi gửi payload lưu thay đổi: Chỉ gửi các trường được phép sửa (`age75plus`, `age70to74poor`, `bao_tro`, `huu_tri`, `huu_tuat_bao_hiem`, `nguoi_co_cong`, `current_address`, `notes`, `received`, `calculation_year`), loại bỏ các trường quan hệ hoặc read-only như `village`, `id`, `created_at` để bảo đảm lưu thành công 100%.

### 2.3. Sửa Dropdown CustomSelect Bị Đè/Che (Portal Fix)
- Tệp: `QLHK/QLHK-Client/src/components/common/CustomSelect.tsx`
- Thực trạng: Trong `Screenshot 2026-10-23 165848.png`, dropdown danh sách dân tộc mở bên trong container modal có `overflow-y: auto`, khiến danh sách tùy chọn bị container cắt cụt và bị footer modal đè lên.
- Giải pháp triệt để:
  - Khi `isOpen === true`, tính toán vị trí của `containerRef.current.getBoundingClientRect()`:
    - `top`, `left`, `width`, `height`.
    - Kiểm tra khoảng trống bên dưới: nếu không đủ 240px thì mở ngược lên trên (`openUpward`).
  - Render menu `role="listbox"` thông qua `createPortal(..., document.body)` với:
    ```tsx
    style={{
      position: "fixed",
      top: openUpward ? rect.top - menuHeight - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    }}
    ```
  - Lắng nghe sự kiện scroll trên window/document và resize để tự động đóng dropdown hoặc cập nhật vị trí, đảm bảo dropdown luôn nổi lên trên cùng (ưu tiên nằm lên đầu), không bao giờ bị che khuất bởi bất kỳ container hay modal nào.

### 2.4. Nhật Ký Hoạt Động (Audit Log) Chuẩn Mẫu QLNN
- Tệp: `QLHK/QLHK-Client/src/components/audit/AuditLogView.tsx`
- Sao chép cấu trúc giao diện từ `QLNN/QLNN-Client/src/components/audit/AuditLogView.tsx`:
  - Timeline trực quan với dot màu và badge action (`Plus`, `RefreshCw`, `Trash2`, `RotateCcw`, `FileSpreadsheet`, v.v.).
  - Card hiển thị diff trực quan `renderFriendlyDiff` (so sánh giá trị cũ và mới, hiển thị tên trường thân thiện tiếng Việt).
  - Tích hợp component `TablePagination` ở cuối trang khi có dữ liệu.
- Chỉnh sửa từ điển `FIELD_LABELS`:
  - **Loại bỏ 100% các trường nông nghiệp** của QLNN (cà phê, cao su, cây ăn quả, lúa, trâu, bò, ao hồ...).
  - **Bổ sung đầy đủ nhãn tiếng Việt** cho phân hệ Hộ khẩu (QLHK) và Chính sách (QLCS):
    - Hộ khẩu & Nhân khẩu: `book_number` ("Mã định danh hộ"), `code` ("Mã định danh"), `head_name` ("Chủ hộ"), `head_cccd` ("CCCD chủ hộ"), `full_name` ("Họ và tên"), `relationship` ("Quan hệ với chủ hộ"), `dob` / `dob_formatted` ("Ngày sinh"), `gender` ("Giới tính"), `cccd` ("Số CCCD"), `ethnicity` ("Dân tộc"), `religion` ("Tôn giáo"), `address` ("Địa chỉ thường trú"), `status` ("Trạng thái cư trú"), `notes` ("Ghi chú"), `military_status` ("Nghĩa vụ quân sự"), `education` ("Học vấn"), `occupation` ("Nghề nghiệp").
    - Chính sách (Chúc thọ & HTXH): `received` ("Trạng thái nhận quà"), `calculation_year` ("Năm tính toán"), `age60` .. `age100` ("Mốc tuổi chúc thọ"), `age75plus` ("Đủ 75 tuổi trở lên"), `age70to74poor` ("70-74 tuổi hộ nghèo/cận nghèo"), `bao_tro` ("Bảo trợ xã hội"), `huu_tri` ("Hưu trí"), `huu_tuat_bao_hiem` ("Hưu tuất BHXH"), `nguoi_co_cong` ("Người có công"), `current_address` ("Nơi ở hiện nay").

### 2.5. Phân Quyền Module Trong Cài Đặt Người Dùng
- Tệp: `QLHK/QLHK-Client/src/pages/SettingsPage.tsx`
- Trong tab Người dùng:
  - Khi thêm tài khoản mới hoặc sửa tài khoản: Bổ sung trường chọn "Phân quyền Module":
    - "Toàn bộ hệ thống (Hộ khẩu & Chính sách)" (`"all"`)
    - "Chỉ Quản lý Hộ khẩu" (`"qlhk"`)
    - "Chỉ Quản lý Chính sách" (`"qlcs"`)
  - Gửi trường `module_access` lên API `authApi.createUser` / `updateUser`.
  - Hiển thị badge quyền module tương ứng tại cột thông tin người dùng trong bảng.

### 2.6. Xuất Excel QLHK Theo Mẫu Chuẩn (Screenshot 170432 & Nhân hộ khẩu.xls)
- Tệp: `QLHK/QLHK-Client/src/features/qlhk/pages/HouseholdsPage.tsx`
- Trong hàm `handleExportConfirm`:
  - Khi người dùng xuất file Excel dữ liệu Hộ - Nhân khẩu (tab truyền thống):
    - Gọi API Backend `GET /api/households/export-excel` (kèm các query params hiện tại: `village_id`, `search`, `year`, `gender`, `ethnicity`, `status`, `household_ids` nếu chọn xuất hộ đã chọn) để nhận file blob `.xlsx` đã được Backend định dạng đẹp 100% bằng `ExcelJS` (header cyan `#CCE5EE`, viền đen mỏng, tách họ đệm và tên in hoa, đúng tiêu ngữ 2 bên).
    - Lưu file thông qua `exportExcelWithDialog` (hỗ trợ cả Tauri desktop và Web).
    - Hiển thị thông báo hoàn tất xuất file thành công.

---

## 3. QUALITY GATES NGHIỆM THU
1. `cd QLHK/QLHK-Client; npx tsc --noEmit` -> 0 lỗi.
2. `cd QLHK/QLHK-Client; npm test -- --run` -> Pass 100%.
3. `cd QLHK/QLHK-Client; npm run build` -> Build thành công không có lỗi.
4. Kiểm tra P0 Zero Comments trong toàn bộ file đã chạm vào.
