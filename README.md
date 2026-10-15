# PHẦN MỀM QUẢN LÝ HỘ KHẨU & DỮ LIỆU DÂN CƯ (QLHK) - UBND XÃ ĐĂK HÀ

> **Phiên bản chính thức:** v1.5.0 (Bản phát hành Desktop ổn định)  
> **Nền tảng hỗ trợ:** Windows 10 / Windows 11 (64-bit)  
> **Đơn vị chủ quản:** Ủy ban Nhân dân Xã Đăk Hà, Huyện Tu Mơ Rông, Tỉnh Kon Tum  
> **Hạ tầng kết nối:** Mạng diện rộng an toàn qua Cloudflare Tunnel (qlhk.dulieudakha.vn)

---

## 1. GIỚI THIỆU TỔNG QUAN
- **Sứ mệnh chuyển đổi số**: Phân hệ Quản lý Hộ khẩu & Dữ liệu Dân cư (QLHK) là giải pháp công vụ số hóa chuyên dụng của UBND Xã Đăk Hà, phục vụ hiện đại hóa công tác quản lý cư trú, nhân hộ khẩu, cơ cấu dân tộc và độ tuổi trên địa bàn toàn xã.
- **Nghiệp vụ cốt lõi**: Quản lý chi tiết từng hộ gia đình và các thành viên nhân khẩu; theo dõi sát sao tình trạng cư trú (thường trú, tạm trú, tạm vắng); phân tích đa chiều cơ cấu dân tộc, độ tuổi và giới tính; hỗ trợ đối soát số liệu nhanh chóng, chính xác.
- **Đối tượng người dùng chính**:
  - Cán bộ Tư pháp - Hộ tịch Xã và Cán bộ chuyên trách dân số quản lý cơ sở dữ liệu dân cư tập trung của toàn xã.
  - Trưởng thôn, Ban Quản lý 8 thôn/làng bản rà soát thông tin biến động nhân khẩu, biến động nơi cư trú thực tế tại địa bàn.
  - Thường trực Đảng ủy, HĐND và UBND Xã theo dõi các chỉ số biến động nhân khẩu học phục vụ chỉ đạo điều hành kinh tế - xã hội và quốc phòng - an ninh.

## 2. TẢI VỀ BẢN PHÁT HÀNH CHÍNH THỨC (.EXE / .MSI)
Cán bộ và các đơn vị trực thuộc tải về bộ cài đặt chính thức tại liên kết sau:

| Loại tệp | Tên tệp phát hành | Dung lượng | Tải trực tiếp |
| :--- | :--- | :---: | :---: |
| **Bộ cài đặt tiêu chuẩn (Installer)** | `QLHK-Setup-v1.5.0.exe` | ~12 MB | [Tải về (.exe)](https://github.com/Umnuar/QLHK/releases/latest/download/QLHK-Setup-v1.5.0.exe) |
| **Gói triển khai hệ thống (MSI Package)** | `QLHK_1.5.0_x64_en-US.msi` | ~15 MB | [Tải về (.msi)](https://github.com/Umnuar/QLHK/releases/latest/download/QLHK_1.5.0_x64_en-US.msi) |

> [!NOTE]
> Tất cả các bản dựng đều được kiểm tra tính toàn vẹn và tích hợp cơ chế tự động nâng cấp phiên bản (Auto-Updater). Cán bộ có thể xem toàn bộ lịch sử các bản vá tại [GitHub Releases](https://github.com/Umnuar/QLHK/releases).

## 3. YÊU CẦU HỆ THỐNG MÁY TRẠM
Để đảm bảo phần mềm hoạt động mượt mà, máy tính cán bộ cần đáp ứng các tiêu chuẩn sau:
- **Hệ điều hành**: Microsoft Windows 10 (Build 19041 trở lên) hoặc Windows 11 (64-bit).
- **Phần cứng tối thiểu**:
  - Bộ vi xử lý (CPU): Intel Core i3 thế hệ 6 / AMD Ryzen 3 trở lên.
  - Dung lượng RAM: Tối thiểu 4GB (Khuyến nghị 8GB để xử lý bảng tính lớn).
  - Dung lượng ổ cứng: Trống tối thiểu 500MB (Khuyến nghị sử dụng ổ cứng SSD).
- **Màn hình hiển thị**: Độ phân giải tối ưu chuẩn 1920x1080 (FullHD Single-Viewport) hoặc tối thiểu 1366x768.
- **Kết nối mạng**: Cần có kết nối Internet để đồng bộ dữ liệu thời gian thực về máy chủ xã (Hệ thống có cơ chế Offline Cache tự động bảo toàn dữ liệu khi đường truyền gián đoạn).

## 4. HƯỚNG DẪN CÀI ĐẶT & NÂNG CẤP
- **Bước 1**: Tải tệp tin `QLHK-Setup-v1.5.0.exe` từ bảng tải về ở Mục 2.
- **Bước 2**: Nhấp đúp chuột vào tệp tin vừa tải về để tiến hành cài đặt tự động. Trình cài đặt được thiết kế chạy trực tiếp trong không gian người dùng, không yêu cầu cấp quyền Administrator phức tạp.
- **Lưu ý Windows SmartScreen**: Đối với lần khởi động đầu tiên, do phần mềm lưu hành nội bộ chính quyền số, Windows có thể hiển thị thông báo bảo vệ màu xanh:
  1. Nhấp chuột vào dòng chữ **"More info"** (hoặc *Thông tin khác*).
  2. Chọn nút **"Run anyway"** (hoặc *Vẫn chạy*) để tiếp tục khởi chạy ứng dụng.
- **Cơ chế cập nhật tự động (Auto-Update)**: Mỗi khi mở ứng dụng, phần mềm tự động kiểm tra phiên bản mới nhất từ máy chủ phát hành qua kênh mã hóa an toàn HTTPS. Khi có bản cập nhật mới, hệ thống tự động tải về ngầm và hiển thị thông báo, cán bộ chỉ cần nhấn 1 cú nhấp chuột để hoàn tất nâng cấp mà không bị mất dữ liệu đang làm việc.

## 5. CÁC TÍNH NĂNG NGHIỆP VỤ NỔI BẬT
1. **Số hóa sổ hộ khẩu & Quản lý nhân khẩu chi tiết**: Quản lý danh mục hộ gia đình theo từng thôn, theo dõi mối quan hệ với chủ hộ, phân loại tình trạng cư trú (thường trú, tạm trú, tạm vắng) với bảng dữ liệu có thể mở rộng xem thành viên trực quan.
2. **Bảo vệ tối mật số Căn cước công dân (CCCD)**: Ứng dụng thuật toán mã hóa mật mã học đối xứng AES-256-GCM bảo vệ số CCCD trên cơ sở dữ liệu, mặc định che mờ dạng `••••••••1234` trên giao diện và sử dụng mã băm một chiều SHA-256 (`cccd_hash`) để tìm kiếm đối soát không lộ dữ liệu gốc.
3. **Bộ lọc đa tiêu chí linh hoạt & Tra cứu nâng cao**: Tìm kiếm nhanh chóng theo họ tên, số CCCD; hỗ trợ bộ lọc kết hợp theo năm tính toán, mốc độ tuổi nghiệp vụ, giới tính, thành phần dân tộc và tình trạng cư trú.
4. **Nhập xuất Excel 11 cột chuẩn hóa**: Tự động nhận diện mẫu biểu nhân hộ khẩu thực tế tại địa phương và mẫu 11 cột phẳng tiêu chuẩn, cung cấp màn hình xem trước đối soát kiểm tra tính hợp lệ của ngày tháng năm sinh trước khi đồng bộ.
5. **Khóa lạc quan (OCC) & Thùng rác khôi phục an toàn**: Sử dụng trường phiên bản `version` để ngăn chặn triệt để tình trạng ghi đè dữ liệu đồng thời giữa các cán bộ; hỗ trợ xóa mềm bản ghi kèm khả năng khôi phục hộ gia đình và danh sách thành viên liên kết khi cần thiết.
6. **Báo cáo thống kê dân số & Cơ cấu dân tộc**: Tổng hợp tức thì 4 chỉ số KPI tổng quan toàn xã, trực quan hóa tháp dân số, cơ cấu giới tính, tỷ lệ các thành phần dân tộc (Xơ Đăng, Ba Na, Kinh...) và bảng đối soát quy mô dân cư giữa các thôn.

## 6. HƯỚNG DẪN ĐĂNG NHẬP & KẾT NỐI HỆ THỐNG
- **Khởi động ứng dụng**: Nhấp đúp vào biểu tượng lối tắt **"QLHK - UBND Xã Đăk Hà"** trên màn hình Desktop hoặc tìm kiếm trong menu Start của Windows.
- **Máy chủ kết nối**: Ứng dụng đã được tích hợp sẵn cấu hình định tuyến an toàn về trung tâm dữ liệu `qlhk.dulieudakha.vn` qua hệ thống mạng diện rộng Cloudflare Tunnel, cán bộ không cần thiết lập IP hay cổng kết nối thủ công.
- **Tài khoản truy cập**: Cán bộ sử dụng tên đăng nhập và mật khẩu chính thức do Tổ Quản trị Công nghệ thông tin / Văn phòng UBND Xã Đăk Hà cấp phát theo vị trí công tác.

## 7. AN TOÀN THÔNG TIN & BẢN QUYỀN SỞ HỮU
- **Bản quyền phần mềm**: Toàn bộ bản quyền phần mềm, cấu trúc dữ liệu và tài liệu kỹ thuật thuộc quyền sở hữu độc quyền của **Ủy ban Nhân dân Xã Đăk Hà, Huyện Tu Mơ Rông, Tỉnh Kon Tum**. Nghiêm cấm mọi hành vi sao chép, trích xuất mã nguồn, chỉnh sửa, phân phối lại hoặc can thiệp thương mại khi chưa có văn bản chấp thuận chính thức từ UBND Xã.
- **An toàn thông tin dữ liệu dân cư**:
  - Dữ liệu dân cư được bảo vệ nghiêm ngặt tuân thủ quy định bảo vệ dữ liệu cá nhân của Nhà nước.
  - Phân tách phạm vi truy cập dữ liệu đa người thuê (Multi-tenant) triệt để giữa các thôn, ngăn chặn việc truy cập dữ liệu trái thẩm quyền.
  - Lưu vết nhật ký hoạt động (Audit Log) theo thời gian thực ghi nhận đầy đủ người thực hiện, thời điểm và nội dung thay đổi.

## 8. ĐẦU MỐI HỖ TRỢ KỸ THUẬT & LIÊN HỆ
- **Đơn vị phụ trách**: Tổ Công nghệ số cộng đồng & Bộ phận Thống kê - Văn phòng UBND Xã Đăk Hà.
- **Thường trực hỗ trợ kỹ thuật**: `baotruongminh201@gmail.com`
- **Báo cáo sự cố hoặc đề xuất tính năng**: Tạo yêu cầu tại mục [Issues trên GitHub Repository chính thức](https://github.com/Umnuar/QLHK/issues).