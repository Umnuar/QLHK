# NHẬT KÝ TIẾN BỘ & PHÁT TRIỂN ỨNG DỤNG (CHANGELOG)
## HỆ THỐNG QUẢN LÝ HỘ KHẨU - NHÂN KHẨU XÃ ĐĂK HÀ (PHIÊN BẢN v1.5)

> **Dành cho người mới tiếp cận ứng dụng**: 
> Phần mềm này được xây dựng nhằm tin học hóa và tối ưu hóa toàn diện công tác quản lý Sổ hộ khẩu, Nhân khẩu và các Chế độ chính sách dân cư (Chúc thọ, Hưu trí xã hội) tại cấp xã/thôn. Tài liệu này ghi lại toàn bộ hành trình tiến bộ của ứng dụng — từ những bất tiện, chậm chạp ban đầu đến phiên bản **v1.5** hiện đại, an toàn và mượt mà hôm nay.

---

## 📌 BẢNG TỔNG QUAN TIẾN BỘ (TRƯỚC ĐÂY VS. PHIÊN BẢN v1.5 HIỆN TẠI)

| Tiêu chí | Phiên bản cũ (Trước v1.5) | Phiên bản v1.5 Hiện tại | Lợi ích cho người dùng |
| :--- | :--- | :--- | :--- |
| **Tốc độ & Dung lượng** | Ứng dụng cồng kềnh, ngốn nhiều RAM (>150MB), khởi động chậm, dễ giật lag trên máy tính văn phòng cũ. | Ứng dụng Desktop siêu nhẹ (<40MB RAM), chuyển sang động cơ Rust Native tốc độ cao. | Mở phần mềm tức thì, chạy êm ái trên mọi máy tính văn phòng xã mà không lo treo đơ. |
| **Bảo mật Thông tin Công dân** | Số CCCD lưu trữ dạng thô, nguy cơ lộ lọt thông tin cá nhân của người dân khi bị can thiệp dữ liệu. | Mã hóa đối xứng AES-256 đa tầng cho số CCCD và lập chỉ mục tìm kiếm ẩn danh (Blind Indexing). | Thông tin cá nhân và số CCCD của công dân được bảo mật tuyệt đối theo tiêu chuẩn cao nhất. |
| **Đồng bộ Dữ liệu Chính sách** | Dữ liệu Chúc thọ, Hưu trí bị tách rời riêng biệt; phải nhập lại thủ công; dễ sai lệch so với hộ khẩu. | Dùng chung 1 nguồn dữ liệu gốc với Quản lý Hộ khẩu; tự động lọc đối tượng theo tuổi và nghề nghiệp. | Không bao giờ bị trùng lặp hay sai lệch số liệu giữa các bộ phận; giảm 80% công sức rà soát. |
| **Xử lý Tệp Excel Văn phòng** | Nhập/xuất file Excel lớn (>1000 người) bị đơ máy, format xuất ra không đúng biểu mẫu hành chính. | Động cơ đọc/ghi Excel tốc độ cao; xuất chuẩn biểu mẫu 11 cột của cơ quan Nhà nước. | Nhập danh sách cả thôn chỉ mất vài giây; xuất báo cáo in ra ký duyệt được ngay không cần chỉnh lại. |
| **Giao diện Thống kê** | Bảng biểu dài ngoằng phải cuộn chuột liên tục; thiếu các chỉ số phân tích chuyên sâu. | Bảng điều khiển thu gọn vừa khít một màn hình (FullHD Single Viewport), biểu đồ trực quan, hỗ trợ chế độ tối. | Nắm bắt toàn bộ bức tranh dân số, độ tuổi, học vấn, nghĩa vụ quân sự chỉ trong một cái nhìn. |
| **Cập nhật & Khôi phục** | Cần người cài đặt lại từ đầu khi có bản mới; xóa nhầm dữ liệu là mất vĩnh viễn. | Tự động kiểm tra và cập nhật phiên bản mới chỉ bằng 1 nút bấm; có Thùng rác để khôi phục khi cần. | Cập nhật nhanh chóng, an tâm làm việc mà không sợ mất mát dữ liệu do thao tác nhầm. |

---

## [v1.5.1] - 2026-10-23: Bước Nhảy Vọt Về Tốc Độ & Hợp Nhất Chính Sách Dân Cư

Bản nâng cấp giúp ứng dụng hoàn thiện 100% động cơ vận hành mới, giải quyết triệt để vấn đề phân mảnh dữ liệu giữa quản lý nhân khẩu và chi trả chế độ chính sách.

### 🌟 Những tiến bộ nổi bật:

1. **Thay thế toàn bộ động cơ xử lý máy chủ bằng công nghệ Rust Native**:
   - Tốc độ phản hồi các thao tác tìm kiếm, lọc, phân trang nhanh gấp nhiều lần, độ trễ gần như bằng không.
   - Triệt tiêu hoàn toàn các lỗi mất kết nối (lỗi 404) khi thao tác trên máy khách.
   - Vượt qua 18/18 bài kiểm tra tương thích dữ liệu thực tế so với phiên bản trước, đảm bảo hoạt động ổn định và chính xác tuyệt đối.

2. **Dữ liệu Chúc thọ & Hưu trí tự động liên thông với Hộ khẩu**:
   - Người dùng không cần tạo hồ sơ thủ công bên mục Chúc thọ hay Hưu trí: Hệ thống tự động quét danh sách nhân khẩu toàn xã và lọc ra người cao tuổi (từ 60 tuổi trở lên theo các mốc mừng thọ) và người có thông tin nghề nghiệp hưu trí.
   - Khóa các nút xóa hoặc sửa gây sai lệch bên phân hệ chính sách, bảo vệ tính toàn vẹn của dữ liệu gốc ở sổ hộ khẩu.
   - Cho phép lọc đối tượng mừng thọ theo từng thôn hoặc theo ngày cụ thể một cách tiện lợi.

3. **Cải tiến công thái học giao diện người dùng**:
   - Sửa dứt điểm lỗi menu chọn danh mục (dropdown select) bị nhảy lệch vị trí hoặc che khuất form nhập liệu trên màn hình nhỏ.
   - Tinh gọn thanh điều hướng bên trái (Sidebar): Tự động hiển thị các mục thống kê chính sách phù hợp khi người dùng bấm chọn một thôn cụ thể hoặc xem toàn xã.

4. **Xử lý tệp Excel siêu tốc**:
   - Nhập hàng nghìn nhân khẩu từ tệp Excel chỉ trong chớp mắt. Hệ thống tự động nhận diện và mã hóa số CCCD ngay khi nhập vào, người dùng không cần thao tác thêm.
   - Xuất danh sách nhân khẩu và danh sách chúc thọ đẹp mắt, đúng định dạng mẫu biểu quy chuẩn Nhà nước.

---

## [v1.5.0] - 2026-10-21: Cuộc Đại Tu Nền Tảng & Trải Nghiệm Thị Giác Hiện Đại

Bản nâng cấp mang tính bước ngoặt, đưa ứng dụng từ giai đoạn sơ khởi lên một tiêu chuẩn phần mềm chuyên nghiệp, phục vụ công tác điều hành tại xã Đăk Hà.

### 🌟 Những tiến bộ nổi bật:

1. **Chuyển đổi sang nền tảng Desktop siêu nhẹ**:
   - Giảm hơn 70% dung lượng chiếm dụng bộ nhớ RAM (từ hơn 150MB xuống dưới 40MB). 
   - Phần mềm khởi động ngay lập tức, không gây nặng máy, tương thích hoàn hảo với hệ điều hành Windows tại các văn phòng xã.

2. **Cơ sở dữ liệu tập trung & Bảo vệ số CCCD đa tầng**:
   - Chuyển sang hệ thống cơ sở dữ liệu chuyên nghiệp, hoạt động độc lập và bảo mật cao.
   - Ứng dụng cơ chế mã hóa hiện đại: Ngay cả khi dữ liệu bị sao chép trái phép, số CCCD của người dân vẫn được bảo vệ dưới dạng chuỗi mã hóa bảo mật, không thể đọc trộm.
   - Tích hợp cơ chế chống ghi đè khi nhiều người cùng mở một hồ sơ: Tránh tình trạng người này lưu đè mất thông tin người kia vừa nhập.

3. **Bảng điều khiển Thống kê Dân cư trực quan gói gọn trong một màn hình**:
   - Toàn bộ thông tin quan trọng (Tổng số hộ, Tổng nhân khẩu, Phân bổ giới tính, Độ tuổi theo từng nhóm, Tỷ lệ Nghĩa vụ quân sự, Trình độ học vấn & Việc làm) được sắp xếp khoa học, vừa vặn trên màn hình chuẩn FullHD (1080p) mà không cần cuộn trang.
   - Biểu đồ tròn tương tác mượt mà: Bấm vào từng nhóm tuổi để xem ngay tỷ lệ và số lượng chính xác đến 0,1%.
   - Hỗ trợ chế độ nền tối (Dark Mode) êm dịu cho mắt khi cán bộ phải làm việc vào ban đêm.

4. **Quản lý Thôn và Phân quyền chặt chẽ**:
   - Cán bộ phụ trách thôn nào chỉ cần tập trung vào dữ liệu của thôn đó, giúp giao diện gọn gàng và tránh nhầm lẫn số liệu giữa các thôn.
   - Bổ sung Thùng rác (Recycle Bin): Cho phép xem lại chi tiết nhân khẩu trong hộ đã xóa và khôi phục khi cần thiết, không lo bấm nhầm nút xóa.

5. **Cập nhật tự động thông minh**:
   - Tích hợp tính năng tự động kiểm tra bản cập nhật mới. Khi có tính năng mới hoặc bản vá, ứng dụng sẽ hiện thông báo và cập nhật an toàn chỉ với một lần bấm chuột.

---

## [v1.0.0] - Nền Tảng Khởi Tạo Ban Đầu

- Phiên bản đầu tiên đặt nền móng cho việc chuyển đổi sổ hộ khẩu và nhân khẩu bằng giấy tờ truyền thống sang dạng số hóa trên máy tính.
- Cung cấp các tính năng cơ bản: Tạo mới hộ gia đình, thêm thành viên, tìm kiếm theo tên và xuất danh sách đơn giản.
