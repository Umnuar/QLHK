# Chính sách an toàn thông tin

Tài liệu này quy định quy trình tiếp nhận và xử lý báo cáo lỗ hổng an ninh thông tin cho hệ thống Quản lý Hộ khẩu & Nhân khẩu Xã Đăk Hà (QLHK).

---

## 1. Phiên bản được hỗ trợ

Chỉ các phiên bản chính thức được liệt kê dưới đây mới nhận được các bản cập nhật an toàn thông tin:

| Phiên bản | Tình trạng hỗ trợ | Ghi chú |
| :---: | :---: | :--- |
| **1.0.x** | Đang được hỗ trợ | Phiên bản đang triển khai phục vụ công tác địa phương |
| **< 1.0.0** | Không hỗ trợ | Các bản dựng thử nghiệm ban đầu |

---

## 2. Cách báo cáo lỗ hổng

Nếu phát hiện vấn đề an ninh hoặc lỗ hổng tiềm ẩn trong ứng dụng, vui lòng thông báo theo các kênh sau:

- **Qua GitHub**: Sử dụng tính năng "Report a vulnerability" tại mục [Security](../../security/advisories) của kho lưu trữ (nếu đã kích hoạt).
- **Qua thư điện tử**: Gửi báo cáo trực tiếp đến địa chỉ email an ninh duy nhất: `admin@dulieudakha.vn`.
- **Tiêu đề thư mẫu**: `[BÁO CÁO AN NINH QLHK] - Tóm tắt ngắn gọn vấn đề`.

Vui lòng không công khai thông tin lỗ hổng trên GitHub Issues, Pull Requests hoặc các kênh truyền thông trước khi sự cố được khắc phục và kiểm nghiệm ổn định.

---

## 3. Thông tin cần cung cấp trong báo cáo

Để hỗ trợ đội ngũ kỹ thuật xác minh và xử lý kịp thời, báo cáo nên bao gồm:

1. **Mô tả vấn đề**: Bản chất và loại lỗ hổng được phát hiện.
2. **Vị trí ảnh hưởng**: Điểm cuối API Backend, kênh IPC Electron hoặc thành phần giao diện Client có liên quan.
3. **Các bước tái hiện tối thiểu**: Hướng dẫn chi tiết từng bước tái hiện lỗi trên môi trường cục bộ (`localhost`).
4. **Đánh giá mức độ ảnh hưởng**: Rủi ro đối với tính bảo mật, tính toàn vẹn hoặc tính sẵn sàng của dữ liệu nhân hộ khẩu.
5. **Gợi ý khắc phục**: Phương án xử lý hoặc giảm thiểu rủi ro (nếu có).

---

## 4. Mục tiêu phản hồi

Đội ngũ kỹ thuật đặt ra các mốc thời gian phản hồi sau:

- **Xác nhận tiếp nhận**: Mục tiêu trong vòng 1 đến 2 ngày làm việc kể từ thời điểm nhận được thư.
- **Đánh giá và phân loại sơ bộ**: Mục tiêu trong vòng 3 đến 5 ngày làm việc.
- **Xử lý và phát hành bản vá**: Đội ngũ kỹ thuật nỗ lực tối đa để phát hành bản khắc phục trong thời gian sớm nhất, ưu tiên xử lý trước các vấn đề nghiêm trọng ảnh hưởng đến rò rỉ thông tin cá nhân và kiểm soát quyền truy cập.

---

## 5. Chính sách công bố thông tin

- Áp dụng nguyên tắc phối hợp công bố có trách nhiệm (Coordinated Disclosure).
- Thông tin về vấn đề an ninh chỉ được công bố sau khi bản khắc phục đã được kiểm nghiệm và triển khai ổn định.
- Chúng tôi ghi nhận đóng góp của người phát hiện trong tài liệu phát hành (nếu người báo cáo đồng ý).

---

## 6. Phạm vi áp dụng

### Được phép kiểm thử
- Mã nguồn ứng dụng và các dịch vụ thực thi trên môi trường máy trạm cục bộ (`localhost:5002`, `localhost:5175`).
- Cơ chế xác thực, phân quyền theo thôn, mã hóa CCCD và kiểm tra tính toàn vẹn khi nhập tệp bảng tính trên môi trường cục bộ.

### Nghiêm cấm
- Tấn công vào các hệ thống máy chủ hoặc dịch vụ đang hoạt động thực tế của địa phương.
- Thực hiện các cuộc tấn công từ chối dịch vụ (DoS / DDoS).
- Thử mật khẩu vét cạn (brute force) nhắm vào tài khoản của cán bộ xã hoặc cán bộ thôn.
- Truy cập, sửa đổi, làm lộ hoặc sao chép dữ liệu thật của các hộ dân.
- Sử dụng các hình thức lừa đảo xã hội (Phishing hoặc Social Engineering).

---

## 7. Tổng quan thiết kế bảo mật

- Xác thực người dùng thông qua mã thông báo JWT có kiểm tra phiên hợp lệ.
- Phân quyền truy cập theo địa bàn thôn được cưỡng chế trực tiếp tại các bộ điều khiển máy chủ.
- Mã hóa đối xứng AES-256-GCM cho số Căn cước công dân (CCCD) ở tầng lưu trữ cơ sở dữ liệu.
- Băm một chiều SHA-256 (`cccd_hash`) phục vụ tra cứu và kiểm tra trùng lặp CCCD mà không để lộ dữ liệu thô.
- Che mờ dữ liệu định danh trên giao diện hiển thị mặc định.
- Kiểm soát xung đột dữ liệu đồng thời thông qua trường phiên bản (khóa lạc quan OCC).
- Cơ chế xóa mềm dữ liệu ngăn ngừa thất thoát dữ liệu ngoài ý muốn.
- Nhật ký hoạt động ghi nhận các thao tác thêm, cập nhật, xóa và nạp bảng tính để phục vụ đối soát.

---

## 8. Khuyến nghị cho đơn vị triển khai

- Thay đổi toàn bộ mật khẩu quản trị và tài khoản mặc định trước khi đưa hệ thống vào sử dụng.
- Bảo mật tệp cấu hình biến môi trường, không chia sẻ hoặc lưu trữ trên các kênh công cộng.
- Sử dụng giao thức HTTPS và cấu hình tường lửa thích hợp cho máy chủ dịch vụ.
- Thực hiện sao lưu cơ sở dữ liệu định kỳ và lưu trữ bản sao lưu tại phân vùng độc lập.
- Định kỳ cập nhật các gói phụ thuộc và áp dụng các bản vá bảo mật mới nhất.

---

## 9. Dữ liệu cá nhân

Hệ thống được thiết kế hướng tới phù hợp Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân; cần xác minh chi tiết với người có chuyên môn pháp lý khi triển khai thực tế.

---

## 10. Bản quyền và giấy phép

Chi tiết về quyền sở hữu trí tuệ và giấy phép sử dụng xem tại [README.md](README.md#giay-phep-va-ban-quyen).
