# DANH SÁCH CÁC LUỒNG NGƯỜI DÙNG KIỂM THỬ TRÊN TRÌNH DUYỆT (BROWSER QA FLOWS)

Dự án: **QLHK - Quản Lý Hộ Khẩu & Nhân Khẩu Xã Đăk Hà**  
Môi trường kiểm thử: **Local Web Preview (http://localhost:5175) + Backend Express (http://localhost:5002)**  
CSDL kiểm thử: **SQLite dev.db (Dữ liệu cục bộ)**  
Tài khoản kiểm thử:  
- Admin cấp xã: `admin` / `admin123`  
- Cán bộ cơ sở Thôn 1: `thon1` / `thon1@123`  

---

## 1. FLOW-01: Xác thực & Đăng nhập (Auth & Session Flow)
- **Mục đích**: Xác thực quy trình đăng nhập tài khoản hợp lệ, chặn nhập sai mật khẩu, hiển thị thông báo lỗi thân thiện, bảo mật phiên làm việc và đăng xuất an toàn.
- **Các bước thực hiện**:
  1. Điều hướng trình duyệt tới `http://localhost:5175`.
  2. Thử nghiệm validation: Để trống Tên đăng nhập và Mật khẩu, bấm nút `ĐĂNG NHẬP`.
  3. Thử nghiệm lỗi xác thực: Nhập `admin` và mật khẩu sai `wrongpassword`, bấm nút `ĐĂNG NHẬP`.
  4. Đăng nhập thành công: Nhập `admin` / `admin123`, bấm `ĐĂNG NHẬP`.
  5. Đăng xuất: Bấm nút Đăng xuất trên Header hoặc trong Cài đặt, xác nhận quay về màn hình Login.
- **Kết quả mong đợi**:
  - Không ném lỗi Unhandled Exception ra Console.
  - Hiển thị thông báo validation/lỗi đỏ rõ ràng khi nhập sai.
  - Đăng nhập thành công chuyển ngay vào giao diện chính (`VillagesPage` hoặc `HouseholdsPage`), lưu token vào bộ nhớ an toàn (không lộ token thô trong DOM).
  - Đăng xuất xóa sạch phiên làm việc, không lưu vết trạng thái người dùng cũ.

---

## 2. FLOW-02: Tổng quan Địa bàn & Điều hướng Thôn (Villages Overview Flow)
- **Mục đích**: Kiểm tra trang danh mục Thôn, các thẻ KPI thống kê, tính năng tìm kiếm thôn và khả năng chuyển đổi thôn làm việc.
- **Các bước thực hiện**:
  1. Đăng nhập với quyền `admin`.
  2. Quan sát Banner Gradient Emerald và 4 Thẻ KPI: Địa bàn quản lý, Tổng hộ gia đình, Tổng nhân khẩu, Tỷ lệ DTTS.
  3. Sử dụng ô tìm kiếm thôn: Nhập từ khóa tiếng Việt không dấu (ví dụ "thon 1", "kon dao").
  4. Bấm vào một Thẻ Thôn (ví dụ `Thôn 1`) để truy cập vào danh sách hộ của thôn đó.
  5. Dùng nút `Đổi thôn` trên Header để chuyển sang thôn khác hoặc quay lại danh sách toàn xã.
- **Kết quả mong đợi**:
  - Số liệu 4 thẻ KPI khớp với dữ liệu thực tế trong CSDL.
  - Ô tìm kiếm lọc danh sách thôn tức thì mà không giật màn hình.
  - Khi chọn thôn, ứng dụng điều hướng mượt mà sang `HouseholdsPage` với tiêu đề thôn tương ứng.

---

## 3. FLOW-03: Quản lý Hộ Gia Đình & Accordion Nhân Khẩu (Households & Accordion Flow)
- **Mục đích**: Kiểm tra hiển thị bảng danh sách hộ gia đình, tiền tố định danh "Hộ ông/bà: [Tên Chủ Hộ]", mở rộng xem chi tiết nhân khẩu, và ẩn/hiện mã hóa CCCD.
- **Các bước thực hiện**:
  1. Tại màn hình `HouseholdsPage`, quan sát cột Hộ Gia Đình.
  2. Bấm vào một dòng hộ gia đình để bung mở Accordion danh sách nhân khẩu.
  3. Quan sát các thành viên: kiểm tra badge `Chủ hộ (CH)`, quan hệ gia đình, ngày tháng năm sinh, tuổi.
  4. Bấm vào số CCCD bị che `••••••••` để giải mã xem đủ 12 số CCCD, bấm lại để ẩn.
  5. Bấm đóng Accordion của hộ đó và mở Accordion của hộ khác.
- **Kết quả mong đợi**:
  - Bảng hiển thị chuẩn xác tiền tố `Hộ ông/bà:`, không hiển thị cột mã sổ HK cũ.
  - Accordion bung mở êm ái, hiển thị đầy đủ thông tin nhân khẩu.
  - CCCD được mã hóa an toàn ở trạng thái mặc định; chỉ giải mã khi người dùng click xem.

---

## 4. FLOW-04: Bộ Lọc Đa Chiều & Năm Tính Toán (Multi-Filter & YearSelector Flow)
- **Mục đích**: Kiểm tra hoạt động đồng bộ của thanh công cụ lọc: ô tìm kiếm, bộ chọn năm tính toán, popover mốc tuổi, và 3 dropdown (giới tính, dân tộc, cư trú).
- **Các bước thực hiện**:
  1. Nhập từ khóa tìm kiếm trong ô Search (theo tên chủ hộ, tên nhân khẩu hoặc CCCD). Bấm nút `X` để xóa tìm kiếm.
  2. Mở Popover `Năm {year}` (YearSelector): Dùng nút Stepper `[-]` / `[+]`, hoặc nhập năm tương lai (ví dụ 2028), bấm `Áp dụng`. Quan sát cột tuổi cập nhật theo năm mới.
  3. Mở Popover `Lọc Độ Tuổi`: Chọn preset `18 - 27 tuổi` (Độ tuổi NVQS).
  4. Chọn Dropdown Giới tính: Chọn `Nam`.
  5. Chọn Dropdown Dân tộc: Chọn `dtts` (Dân tộc thiểu số).
  6. Chọn Dropdown Cư trú: Chọn `Thường trú`.
  7. Bấm nút `Xóa lọc` để xóa sạch toàn bộ điều kiện và đưa danh sách về mặc định.
- **Kết quả mong đợi**:
  - Danh sách lọc phản hồi chính xác với điều kiện kết hợp.
  - Không có cảnh báo console về re-render loop hay key warning.
  - Cột tuổi trên bảng hiển thị chính xác theo năm tính toán đã chọn.

---

## 5. FLOW-05: Biểu mẫu Thêm/Sửa Hộ & Nhân Khẩu (Form Drawer & Modal Flow)
- **Mục đích**: Kiểm tra tính toàn vẹn của Drawer thêm/sửa hộ gia đình và Sub-modal thêm nhân khẩu (chống lỗi co giật layout 24px, focus trap, validation).
- **Các bước thực hiện**:
  1. Bấm nút `Thêm Hộ Mới` để mở Drawer bên phải.
  2. Kiểm tra các trường: Thôn, Địa chỉ, Số sổ (nếu có), Trạng thái cư trú, Ghi chú.
  3. Trong Drawer, bấm nút `Thêm Nhân Khẩu` để mở Sub-modal nổi ở giữa màn hình.
  4. Xác nhận Sub-modal nổi lên trên Drawer với backdrop-blur phủ đều, không gây co giật thanh cuộn 24px.
  5. Thử nghiệm nhập dữ liệu nhân khẩu: Họ và tên, Ngày sinh (`DD/MM/YYYY`), Giới tính, Dân tộc, CCCD.
  6. Đóng Sub-modal bằng nút `Hủy` hoặc phím `Escape`. Đóng Drawer.
- **Kết quả mong đợi**:
  - Không có hiện tượng co giật layout ngang 24px.
  - Phím Escape đóng đúng tầng popup đang active (Sub-modal trước, Drawer sau).
  - Đóng form mà chưa lưu thì dữ liệu tạm được dọn dẹp sạch sẽ, không gây memory leak.

---

## 6. FLOW-06: Thùng Rác & Khôi Phục Dữ Liệu (Recycle Bin & Soft Delete Flow)
- **Mục đích**: Kiểm tra cơ chế xóa mềm an toàn, danh sách rác và khả năng khôi phục hộ gia đình.
- **Các bước thực hiện**:
  1. Chuyển sang tab `Thùng Rác` (`RecycleBinPage`).
  2. Quan sát danh sách các hộ đã bị xóa mềm (thời gian xóa, người xóa, lý do).
  3. Bấm xem chi tiết hộ trong thùng rác.
  4. Thử nghiệm nút `Khôi phục` trên một hộ gia đình thử nghiệm.
  5. Quay lại trang `HouseholdsPage` xác nhận hộ đã được phục hồi nguyên trạng.
- **Kết quả mong đợi**:
  - Dữ liệu bị xóa không mất vĩnh viễn trong CSDL mà gắn cờ `is_deleted = true`.
  - Khôi phục thành công đưa hộ và nhân khẩu trở lại danh sách hoạt động.
  - Audit log ghi nhận đầy đủ hành động khôi phục.

---

## 7. FLOW-07: Báo Cáo Thống Kê & Xuất Excel (Analytics & Export Flow)
- **Mục đích**: Kiểm tra màn hình thống kê toàn xã, cơ cấu 14 dân tộc, tỷ lệ giới tính và tính năng xuất dữ liệu Excel đã được khử độc an toàn.
- **Các bước thực hiện**:
  1. Chuyển sang tab `Báo Cáo Thống Kê` (`AnalyticsPage`).
  2. Quan sát biểu đồ cơ cấu giới tính, cơ cấu 14 dân tộc, bảng đối soát giữa các thôn.
  3. Đổi bộ lọc thôn hoặc đổi năm trên trang Analytics, kiểm tra số liệu cập nhật.
  4. Bấm nút `Xuất Báo Cáo Excel`.
- **Kết quả mong đợi**:
  - Biểu đồ và card số liệu render mượt mà, không bị lỗi NaN hoặc undefined.
  - File Excel xuất ra được khử độc Formula Injection an toàn (tiền tố `'`).

---

## 8. FLOW-08: Quản Lý Cài Đặt 4 Tabs & Dark Mode (Settings & Unit Info Flow)
- **Mục đích**: Kiểm tra giao diện Cài Đặt chuẩn 4 tabs (Tài khoản, Quản lý cán bộ, Sao lưu CSDL, Thông tin đơn vị) và tính năng chuyển đổi Light/Dark mode.
- **Các bước thực hiện**:
  1. Chuyển sang tab `Cài Đặt` (`SettingsPage`).
  2. Duyệt qua 4 tabs: `Tài Khoản Của Tôi`, `Quản Lý Cán Bộ Thôn`, `Sao Lưu CSDL`, `Thông Tin Đơn Vị & Hệ Thống`.
  3. Trong tab Thông Tin Đơn Vị: Kiểm tra thông tin UBND Xã Đăk Hà và thẻ phần mềm QLHK.
  4. Bấm nút chuyển đổi giao diện Sáng / Tối (Dark Mode Toggle) trên Header.
  5. Kiểm tra độ tương phản, chữ hiển thị rõ ràng, không bị chìm nền trên cả 2 theme.
- **Kết quả mong đợi**:
  - Chuyển tab tức thì, không giật lag.
  - Dark mode áp dụng đồng nhất cho toàn bộ background, text, borders, tables, và popups.
  - Không có lỗi CSS unstyled content hay icon lệch vị trí.
