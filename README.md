# Quản Lý Hộ Khẩu & Nhân Khẩu Xã Đăk Hà (QLHK)

Hệ thống số hóa, quản lý và đối soát dữ liệu hộ gia đình, nhân khẩu, biến động dân cư và thành phần 14 dân tộc thiểu số phục vụ công tác chỉ đạo, điều hành tại Ủy ban nhân dân Xã Đăk Hà, Huyện Đăk Hà, Tỉnh Kon Tum.

![Phiên bản](https://img.shields.io/badge/Phi%C3%AAn_b%E1%BA%A3n-v2.2.0-emerald?style=flat-square)
![Nền tảng](https://img.shields.io/badge/N%E1%BB%81n_t%E1%BA%A3ng-Windows_Desktop_Tauri_v2-blue?style=flat-square)
![Bảo mật](https://img.shields.io/badge/B%E1%BA%A3o_m%E1%BA%ADt-AES--256--GCM-purple?style=flat-square)
![Bản quyền](https://img.shields.io/badge/B%E1%BA%A3n_quy%E1%BB%81n-UBND_X%C3%A3_%C4%90%C4%83k_H%C3%A0-slate?style=flat-square)

> [!IMPORTANT]
> **Bản quyền thuộc Ủy ban nhân dân Xã Đăk Hà, Huyện Đăk Hà, Tỉnh Kon Tum.**  
> Mọi quyền được bảo lưu. Kho lưu trữ này là kênh công bố tài liệu giới thiệu giải pháp và phân phối các gói phát hành cài đặt chính thức (Official Desktop Distribution). Chi tiết xem tại [LICENSE](LICENSE).

---

## 📥 Tải Bản Cài Đặt Chính Thức

Cán bộ tư pháp - hộ tịch, trưởng thôn và cán bộ quản lý tải gói cài đặt Windows Desktop mới nhất tại:

👉 **[Tải Bản Cài Đặt Tại Mục Releases (v2.2.0)](https://github.com/Umnuar/QLHK/releases)**

| Tệp Cài Đặt | Hệ Điều Hành | Kiến Trúc | Mô Tả |
| :--- | :--- | :--- | :--- |
| `Quan-Ly-Ho-Khau-Setup-x64.exe` | Windows 10 / 11 | 64-bit | Trình cài đặt tự động NSIS (hỗ trợ Auto-Updater) |
| `Quan-Ly-Ho-Khau-Portable-x64.zip` | Windows 10 / 11 | 64-bit | Bản nén chạy trực tiếp không cần quyền Quản trị viên |

---

## 🌟 Tính Năng Nổi Bật

### 1. Quản Lý Toàn Diện Hộ Gia Đình & Nhân Khẩu
- Quản lý danh sách hộ gia đình theo từng thôn trên toàn địa bàn Xã Đăk Hà.
- Giao diện dạng bảng lồng nhau (Accordion sub-table): mở rộng tức thì để xem toàn bộ thành viên trong hộ mà không cần chuyển trang.
- Đầy đủ thông tin pháp lý: Họ tên, quan hệ với chủ hộ, giới tính, ngày tháng năm sinh (hỗ trợ `DD/MM/YYYY`, `MM/YYYY`, `YYYY`), số CCCD, nghề nghiệp, nơi làm việc và ghi chú.

### 2. Chuẩn Hóa Cơ Cấu 14 Dân Tộc Thiểu Số
- Tích hợp sẵn danh mục 14 dân tộc sinh sống trên địa bàn Xã Đăk Hà:
  * `Kinh`, `Xơ Đăng`, `Gia Rai`, `Giẻ Triêng`, `Cor`, `Cơ Ho`, `Dao`, `Dìu`, `Ê Đê`, `Giơ Lâng`, `Ha Lăng`, `Hoa`, `Hrê`, `Khách Gia`.
- Tự động nhận diện và tính toán tỷ lệ đồng bào Dân tộc thiểu số (DTTS) theo từng thôn và toàn xã theo thời gian thực.

### 3. Bảo Vệ Tuyệt Đối Thông Tin Định Danh (PII Security)
- **Mã hóa đối xứng AES-256-GCM**: Dữ liệu số Căn cước công dân (CCCD) được mã hóa an toàn ở mức lưu trữ CSDL.
- **Băm một chiều SHA-256 (`cccd_hash`)**: Cho phép tìm kiếm, đối soát chính xác số CCCD mà không bao giờ giải mã thô trên đường truyền hoặc trong câu lệnh truy vấn.
- **Che mờ mặc định (Data Masking)**: Số CCCD chỉ hiển thị 4 số cuối dạng `••••••••1234` trên giao diện; chỉ cán bộ có thẩm quyền mới được cấp quyền mở khóa xem đầy đủ kèm lưu vết nhật ký kiểm toán.

### 4. Bóc Tách & Nhập Xuất Excel 11 Cột Chuẩn
- Bộ phân giải Excel thông minh tự động bóc tách từ file thực tế biểu mẫu Đăk Hà sang bảng chuẩn 11 cột phẳng.
- Hộp thoại xem trước (Import Preview Modal): kiểm tra tính hợp lệ của từng dòng, cảnh báo lỗi ngày sinh hoặc trùng lặp trước khi ghi vào hệ thống.
- Xuất báo cáo danh sách hộ gia đình và nhân khẩu theo mẫu quy định của cơ quan nhà nước.

### 5. Khóa Lạc Quan Chống Ghi Đè (OCC) & Bảo Vệ Đồng Thời
- Tích hợp kiểm soát phiên bản `version` trên từng bản ghi.
- Tự động phát hiện và cảnh báo xung đột khi hai cán bộ cùng chỉnh sửa một hộ khẩu hoặc nhân khẩu tại cùng một thời điểm.

### 6. Báo Cáo Thống Kê & Phân Tích Đa Chiều
- Dashboard trực quan tổng hợp 4 thẻ KPI: Tổng Hộ Dân, Tổng Nhân Khẩu, Tỷ Lệ Giới Tính, Tỷ Lệ DTTS.
- Biểu đồ phân bổ cơ cấu nhóm tuổi (< 6 tuổi, 6 - 17 tuổi, 18 - 27 tuổi NVQS, 18 - 60 tuổi, ≥ 60 tuổi NCT).
- Cơ cấu tín ngưỡng & tôn giáo; bảng đối soát quy mô dân cư giữa các thôn.

### 7. Tự Động Cập Nhật (Tauri v2 Auto-Updater)
- Ứng dụng Desktop tự động kiểm tra bản phát hành mới khi khởi động.
- Cập nhật ngầm một chạm, tự động xác thực chữ ký số Ed25519 và khởi động lại vào phiên bản mới nhất.

---

## 🏛️ Hệ Sinh Thái Số Hóa Dữ Liệu Công Vụ Xã Đăk Hà

| Hệ Thống | Ký Hiệu | Vai Trò & Nghiệp Vụ | Phân Hệ Liên Kết |
| :--- | :--- | :--- | :--- |
| **Quản Lý Hộ Khẩu** | **QLHK** | Dữ liệu dân cư, hộ khẩu, nhân khẩu, DTTS, bảo vệ CCCD | [Umnuar/QLHK](https://github.com/Umnuar/QLHK) |
| **Quản Lý Chính Sách** | **QLCS** | Chế độ người cao tuổi, trợ cấp xã hội, chúc thọ, mai táng phí | [Umnuar/QLCS](https://github.com/Umnuar/QLCS) |
| **Quản Lý Nông Nghiệp** | **QLNN** | Thống kê 18 chỉ tiêu nông nghiệp, cây trồng, vật nuôi, thủy sản | [Umnuar/QLNN](https://github.com/Umnuar/QLNN) |

---

## 💻 Yêu Cầu Hệ Thống

- **Hệ điều hành**: Windows 10 (bản 1809 trở lên) hoặc Windows 11 (64-bit).
- **Phần cứng tối thiểu**:
  * Bộ vi xử lý: Dual-core 1.6 GHz hoặc cao hơn.
  * Bộ nhớ RAM: Tối thiểu 2 GB (khuyến nghị 4 GB trở lên).
  * Dung lượng ổ đĩa trống: Tối thiểu 200 MB.
  * Màn hình: Độ phân giải tối thiểu 1280 x 720 (khuyến nghị 1920 x 1080).
- **WebView2 Runtime**: Đã tích hợp sẵn trên Windows 10/11.

---

## 📞 Đơn Vị Chủ Quản & Hỗ Trợ Kỹ Thuật

- **Cơ quan chủ quản**: Ủy Ban Nhân Dân Xã Đăk Hà, Huyện Đăk Hà, Tỉnh Kon Tum
- **Địa chỉ trụ sở**: Trung tâm Hành chính Xã Đăk Hà, Huyện Đăk Hà, Tỉnh Kon Tum
- **Kênh tiếp nhận hỗ trợ**: `admin@dulieudakha.vn`
- **Cổng thông tin dữ liệu**: [dulieudakha.vn](https://dulieudakha.vn)
