# NHẬT KÝ PHÁT HÀNH & NÂNG CẤP TOÀN DIỆN (CHANGELOG)
## HỆ THỐNG QUẢN LÝ HỘ KHẨU - NHÂN KHẨU XÃ ĐĂK HÀ (BẢN PHÁT HÀNH ĐỒNG BỘ v1.5.0)

Bản cập nhật lớn toàn diện đưa toàn bộ phân hệ QLHK từ phiên bản v1.0 ban đầu lên chuẩn **v1.5.0**, thống nhất kiến trúc, chuyển đổi công nghệ sang Thin-Client Tauri v2 (Rust), độc lập hóa cơ sở dữ liệu PostgreSQL Native nội bộ (schema `qlhk`), tối ưu hóa hiệu năng chuyên sâu, vá toàn bộ lỗi kiểm toán an ninh và loại bỏ sạch 100% comment trong mã nguồn theo chuẩn Civic Tech Blueprint.

---

## [v1.5.0] - 2026-10-21 (Đại tu Phân hệ Toàn diện)

### 🚀 NEW (Tính năng mới)

- **Chuyển đổi Thin-Client Tauri v2 (Rust) & Tự động Cập nhật**:
  - Chuyển đổi chính thức toàn bộ ứng dụng desktop từ Electron sang nền tảng Thin-Client Tauri v2 (Rust), cắt giảm hơn 70% dung lượng bộ nhớ RAM (chiếm dụng < 40MB).
  - Tích hợp hệ thống cập nhật tự động delta update với `@tauri-apps/plugin-updater` và `@tauri-apps/plugin-process`.
  - Thiết lập endpoint phân phối gói cập nhật backend `GET /api/updates/latest` trả về JSON manifest, chữ ký điện tử và gói cài đặt tự động.
  - Bổ sung giao diện thông báo cập nhật `AppUpdateModal.tsx` trên Client với thanh tiến trình tải và cơ chế cài đặt an toàn.
- **Cơ sở Dữ liệu PostgreSQL Native & Bảo mật Cấp cao**:
  - Di chuyển toàn bộ CSDL sang PostgreSQL schema độc lập `qlhk`, thay thế hoàn toàn SQLite cục bộ.
  - Triển khai cơ chế bảo mật kép: mã hóa đối xứng AES-256-GCM số CCCD và lập chỉ mục tìm kiếm băm mù HMAC-SHA256 Blind Indexing (`CCCD_HASH_PEPPER`).
  - Khóa lạc quan (Optimistic Concurrency Control - OCC) qua cột `version` chống ghi đè dữ liệu đồng thời.
  - Phân quyền theo địa bàn thôn (Village Scoping RBAC), tài khoản quản trị tối cao độc lập (`seed-admin`) và Thùng rác (Recycle Bin) kèm accordion xem chi tiết nhân khẩu.
- **Tái cấu trúc Giao diện Thống kê Hiện đại (High-Density UI & Flat Minimalist)**:
  - Tối ưu hóa kích thước Analytics Dashboard đạt chuẩn FullHD 1080p Single Viewport (tổng chiều cao ~700px, 4 card phân tích cố định `lg:h-[276px]`), triệt tiêu hoàn toàn thanh cuộn dọc ngoài ý muốn.
  - Biểu đồ Donut 176px với cơ chế tương tác hai chiều (Bidirectional Active Interaction) và vòng bấm trong suốt Hit-Target (`MIN_HIT_LENGTH = 16`, stroke 30px) bắt chuẩn thao tác trên lát cắt nhỏ (<2%).
  - Thẻ phân tích kép 2 cột `WelfareCard` hợp nhất theo dõi chỉ số Quốc phòng & Nghĩa vụ quân sự song song với Trình độ học vấn & Việc làm.
  - Hỗ trợ chế độ hiển thị kép hoàn chỉnh (Dual Light & Dark Mode) với nút `ThemeToggle` trên Header, thuật toán làm tròn Hare-Niemeyer chuẩn xác 100,0% và nhóm tuổi MECE.
- **Tách gói Nạp động (Dynamic Code-Splitting)**:
  - Tách riêng khối thư viện `xlsx` thành chunk `vendor-excel` trong `fileExport.ts` và `ImportPreviewModal.tsx`, loại bỏ hoàn toàn **429.03 kB** khỏi `dist/index.html` lúc khởi động.
- **Trình bóc tách AST Lexer Scanner**:
  - Xây dựng giải pháp quét và loại bỏ comment đa tầng thông qua TypeScript Scanner API ở cấp độ từ vựng, bảo vệ 100% tính toàn vẹn của chuỗi ký tự, URL và biểu thức chính quy.
- **Kiểm thử Tự động Toàn diện**:
  - Thiết lập bộ kiểm thử API tích hợp backend toàn diện (`tests/api.test.ts`) bao phủ toàn bộ các endpoint nghiệp vụ.
- **Quy tắc P0 1.8 Zero Comments in Code**:
  - Thiết lập quy tắc cốt lõi: nghiêm cấm 100% comment trong toàn bộ mã nguồn hệ sinh thái, bắt buộc mã nguồn tự giải thích qua định danh rõ ràng.

---

### ⚡ UPDATE & PERFORMANCE (Cải tiến & Tối ưu hóa hiệu năng)

- **Tối ưu hóa Hiệu năng Backend (OPT-001 đến OPT-005)**:
  - `OPT-001`: Cache Buffer khóa mã hóa AES trong `crypto.ts`, loại bỏ chi phí cấp phát Buffer lặp lại mỗi lượt gọi mã hóa hoặc giải mã CCCD.
  - `OPT-002`: Tối ưu thuật toán Largest Remainder Method (Hare-Niemeyer) trong `analytics.controller.ts` thành mảng phẳng duyệt đơn luồng, khử hoàn toàn các lần lặp mảng lồng nhau (`.map().filter().sort()`).
  - `OPT-003`: Trích xuất năm sinh zero-allocation `extractBirthYear`, phân tích năm sinh 4 chữ số trực tiếp từ cuối chuỗi mà không tạo mảng cắt chuỗi trung gian (`.split('/')`).
  - `OPT-004`: Biên dịch trước toàn bộ biểu thức chính quy khử dấu tiếng Việt trong `removeAccents` ở cấp độ module, triệt tiêu chi phí re-compilation khi duyệt danh sách lớn.
  - `OPT-005`: Gom nhóm aggregate tính toán thôn trực tiếp tại CSDL PostgreSQL thông qua Prisma Group By trong `getByVillage()`, chuyển đổi dữ liệu bằng transformer thuần túy O(V) thay vì nạp toàn bộ danh sách hộ về RAM máy chủ.
- **Tối ưu hóa Hiệu năng Client (OPT-001 đến OPT-004)**:
  - `OPT-001`: Tách gói nạp động `vendor-excel`, loại bỏ 429.03 kB khỏi gói bundle ban đầu, tăng tốc nạp trang đầu tiên lên hơn 40%.
  - `OPT-002`: Tối ưu hot-path tìm kiếm và lọc độ tuổi trong `HouseholdsPage.tsx` bằng so sánh trực tiếp trường năm sinh số nguyên `birth_year` và cơ chế đánh giá ngắn mạch.
  - `OPT-003`: Tách biệt và memo hóa độc lập khối dữ liệu đối soát thôn trong `AnalyticsDashboard.tsx`, ngăn chặn re-render dây chuyền khi người dùng thao tác chuyển đổi thôn.
  - `OPT-004`: Tái cấu trúc hàm tính toán thống kê dân cư trong `householdStore.ts` thành một vòng lặp đơn O(N) duy nhất, gom nhóm đồng thời toàn bộ chỉ tiêu dân số.
- **Chuẩn hóa Giao diện & Hạ tầng Toàn diện**:
  - Chuẩn hóa phiên bản toàn bộ phân hệ đồng bộ về định danh `v1.5.0`.
  - Thiết lập định tuyến domain Cloudflare Tunnel chính thức: `qlhk.dulieudakha.vn`.
  - Đồng bộ hiệu ứng làm mờ hậu cảnh (`backdrop-blur`) cho toàn bộ các modal (hộ gia đình, nhân khẩu, nhập liệu Excel và cấu hình).
  - Chuẩn hóa hệ thống bo góc (Border Radius) toàn Dashboard về `rounded-3xl` (24px) cho khung đảo chính và `rounded-2xl` (16px) cho các khối con bên trong.
  - Chuẩn hóa typography, font weights và hiển thị số liệu `tabular-nums` trên toàn bộ các thẻ phân tích `DistributionCard`, `KpiRow`, `WelfareCard`.
  - Đồng bộ và phát hành tài liệu `README.md` công khai chuẩn Civic Tech Blueprint v1.5.0 lên nhánh `main`.

---

### 🛠️ FIX (Sửa lỗi & Vá lỗ hổng bảo mật)

- **Vá lỗi Kiểm toán Backend (BUG-001 đến BUG-003)**:
  - `BUG-001` & `BUG-002`: Khắc phục lỗi rò rỉ dữ liệu nhân khẩu và chuẩn hóa lưu trữ 5 trường thông tin nhân khẩu mới (quê quán, học vấn, tình trạng NVQS, nghề nghiệp, ghi chú) khi nhập Excel và truy vấn qua Prisma.
  - `BUG-003`: Mở rộng hỗ trợ tra cứu đối soát nhân khẩu theo mã băm bảo mật HMAC-SHA256 (`cccd_hash`) trên toàn bộ các endpoint tra cứu.
- **Vá lỗi Kiểm toán Client (BUG-001 đến BUG-007)**:
  - `BUG-001`: Chuẩn hóa mã số hộ khẩu và giải quyết triệt để xung đột mã hộ khi nhập tệp Excel biểu mẫu chuẩn 11 cột; bổ sung cơ chế dự phòng ánh xạ bí danh nhân khẩu tiếng Việt trong `normalizeHousehold` và `CitizenModal`.
  - `BUG-002`: Thiết lập rào chắn thu hồi Bearer Auth Token Header trong chế độ ngoại tuyến, ngăn chặn rò rỉ token.
  - `BUG-003`: Tích hợp năm tính toán động (Dynamic Calculation Year) vào các trình xử lý nhập liệu Excel và chuẩn hóa thứ tự ưu tiên hiển thị chỉ số phân tích.
  - `BUG-004`: Bảo toàn tính toàn vẹn của trạng thái Chủ hộ khi xóa hoặc tách thành viên trong sổ hộ khẩu; chuẩn hóa bộ phân tích chuỗi ngày ISO đa định dạng triệt tiêu lỗi `NaN`.
  - `BUG-005`: Chuẩn hóa thứ tự ưu tiên hiển thị các chỉ số phân tích trên Dashboard.
  - `BUG-006`: Tự động xóa sạch toàn bộ Secure Storage khi người dùng đăng xuất.
  - `BUG-007`: Nâng cấp cơ chế xác thực mật khẩu đăng nhập ngoại tuyến an toàn qua mã băm.
- **Sửa lỗi Hạ tầng, Môi trường & Runtime**:
  - Sửa lỗi sập container Docker backend (mã thoát 127) bằng cách chuẩn hóa ký tự xuống dòng của `docker-entrypoint.sh` từ Windows CRLF sang Linux LF.
  - Bổ sung script `docker-entrypoint.sh` tự động chạy `npx prisma generate` giải quyết lỗi lệch schema Prisma Client.
  - Khóa múi giờ logging backend và container runtime về `Asia/Ho_Chi_Minh` (UTC+7).
  - Chuẩn hóa danh sách trắng CORS trên Express backend đối với ứng dụng desktop Tauri (`tauri://localhost`).
  - Ép buộc Client kết nối trực tiếp qua Cloudflare `qlhk.dulieudakha.vn`, loại bỏ fallback ngầm về cổng local.

---

### 🧹 CLEAN (Dọn dẹp mã nguồn & Tối giản)

- **Bóc tách 100% Comment trong Toàn bộ Dự án**:
  - Quét và loại bỏ sạch 100% comment trong toàn bộ 147 file mã nguồn QLHK (TS, JS, JSX, CSS, HTML, Prisma) bằng bộ phân tích cú pháp TypeScript Scanner AST Lexer, đảm bảo mã nguồn tự tường minh và biên dịch 0 lỗi.
- **Đào thải Mã nguồn & Dependencies Lỗi thời**:
  - Đào thải hoàn toàn toàn bộ dependencies và mã nguồn Electron cũ sau khi chuyển sang Thin-Client Tauri v2 (Rust).
  - Gỡ bỏ triệt để gói thư viện không sử dụng `react-router-dom` khỏi `QLHK-Client/package.json` (`EXC-001`).
  - Loại bỏ component mồ côi `HouseholdModal` và chuẩn hóa hợp đồng kiểm thử component (`EXC-003`).
  - Dọn sạch các import React thừa, icon không sử dụng, biến trạng thái mồ côi trên các trang Dashboard, AuditLog, Settings, Households, RecycleBin (`CLN-001` đến `CLN-007`).
  - Thanh lọc toàn bộ file cấu hình AI/vibe-coding, thư mục rác và logs khỏi repository.
  - Loại bỏ hoàn toàn Tab Thời gian riêng biệt, tích hợp component `TimeCard.tsx` (Read-only từ Backend) vào Tab Cấu hình Hệ thống.
  - Đơn giản hóa bộ lọc độ tuổi nhân khẩu thành danh sách nút chọn nhanh (Age Presets) dạng compact.
  - Lược bỏ trường nhập mã viết tắt của thôn trong form thêm thôn mới, tự động sinh mã chuẩn hóa.
- **Hợp nhất Nhánh & Kiểm định Chất lượng 100%**:
  - Hợp nhất và dọn sạch toàn bộ 34 nhánh phụ về độc nhất nhánh `main`; working tree sạch hoàn toàn.
  - `QLHK-Client`: 17/17 test files, 169/169 unit & integration tests PASS (100%), `npx tsc --noEmit` đạt 0 lỗi.
  - `QLHK-Backend`: 5/5 test files, 52/52 unit & security tests PASS (100%), `npx tsc --noEmit` đạt 0 lỗi.
