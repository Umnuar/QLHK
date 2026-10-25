# NHẬT KÝ NÂNG CẤP & TIẾN BỘ ỨNG DỤNG (CHANGELOG)
## HỆ THỐNG QUẢN LÝ HỘ KHẨU - NHÂN KHẨU XÃ ĐĂK HÀ (BẢN PHÁT HÀNH ĐỒNG BỘ v1.5)

Bản cập nhật lớn toàn diện đưa toàn bộ hệ thống QLHK từ phiên bản thử nghiệm ban đầu lên chuẩn **v1.5**, đánh dấu bước tiến nhảy vọt về tốc độ, tính toàn vẹn dữ liệu và độ an toàn thông tin: chuyển đổi toàn diện sang nền tảng Thin-Client Tauri v2 (Rust) kết hợp Backend Rust Native hiệu năng cao (Axum + SQLx), chuẩn hóa CSDL PostgreSQL Native độc lập (schema `qlhk`), bảo mật CCCD đa tầng, hợp nhất dữ liệu chính sách dân cư và tối ưu hóa giao diện điều hành chuẩn Civic Tech.

---

## [v1.5.1] - 2026-10-23 (Hoàn thiện Động cơ Rust Backend 100%, Hợp nhất Dữ liệu Chính sách & Đột phá Công thái học Modal Nhân khẩu)

### 🚀 NEW (Tính năng mới)

- **Động cơ Backend Rust Native Hoàn thiện 100% (QLHK-Backend-Rust trên cổng 5012)**:
  - Triển khai toàn diện hệ thống backend hiệu năng cao bằng Rust (Axum 0.8, SQLx và Tokio runtime đa luồng) trên cổng `5012`, xóa bỏ 100% lỗi 404 khi kết nối Client.
  - **Xác thực & Quản lý Phiên bảo mật cao (Auth & Session Engine)**: Hỗ trợ xác thực đăng nhập kép với thuật toán băm bcrypt đa biến thể ($2a$, $2b$, $2y$) cùng cơ chế dự phòng SHA-256; cấp phát cặp mã xác thực chuẩn JWT (Access Token thời hạn ngắn và Refresh Token lưu trữ an toàn trong bảng `refresh_tokens`); áp dụng cơ chế luân chuyển khóa tự động (Refresh Token Rotation) chống giả mạo phiên; cung cấp trọn vẹn các endpoint `/api/auth/me`, `/api/auth/refresh`, `/api/auth/logout`, `/ping`, `/api/ping`.
  - **Quản lý Danh mục Thôn & Phân quyền Người dùng Toàn diện**: Nghiệp vụ quản lý danh mục thôn gắn liền với phép tính tổng hợp số hộ khẩu và số nhân khẩu tức thời; quản trị tài khoản người dùng với phân quyền vai trò (Role-Based Access Control) và giới hạn quyền hạn theo từng địa bàn thôn (Village Scope RBAC); đổi mật khẩu an toàn.
  - **Hệ thống Ghi vết Nhật ký Hoạt động (Audit Logging Engine)**: Phân trang linh hoạt và bộ lọc đa tiêu chí (theo thôn, tài khoản thực hiện, loại hành động, khoảng thời gian); hàm tiện ích bất đồng bộ `record_audit` ghi nhật ký trực tiếp vào bảng `qlhk.audit_logs`, đảm bảo mọi tác động thêm/sửa/xóa đều được lưu vết minh bạch.
  - **Động cơ Xử lý & Nhập/Xuất Excel Streaming Đa luồng**: Sử dụng thư viện `calamine` phân tích cú pháp tệp bảng tính siêu tốc; tự động nhận diện và mã hóa đối xứng AES-256-GCM số CCCD kèm tạo mã băm mù HMAC-SHA256 ngay trong luồng nhập liệu; xuất báo cáo nhân khẩu chuẩn thể thức hành chính Nhà nước (mẫu chuẩn 11 cột có đầy đủ quốc tịch, quê quán, học vấn, nghĩa vụ quân sự, nghề nghiệp), xuất danh sách người cao tuổi mừng thọ, cung cấp tệp biểu mẫu chuẩn `/api/excel/template`.
  - **Sao lưu Dữ liệu, Quản trị Cấu hình & Cập nhật Desktop**: Cung cấp công cụ xuất/nhập sao lưu toàn diện cơ sở dữ liệu dạng JSON dump (`/api/backup/download`, `/api/backup/restore`); quản trị cấu hình hệ thống dạng khóa-giá trị (`/api/settings`); endpoint `/api/updates/latest` cung cấp manifest cập nhật tự động dành riêng cho ứng dụng desktop Tauri.
  - **Kiểm định Shadow Parity Toàn diện Đạt 18/18 Tiêu chí (100% PASS)**: Bộ kiểm thử tương thích so khớp thời gian thực giữa backend Node.js (cổng 5002) và backend Rust mới (cổng 5012) đảm bảo tính toàn vẹn 100% của tất cả các trường dữ liệu JSON, mã trạng thái HTTP và định dạng file stream nhị phân.

- **Hợp nhất Dữ liệu Phân hệ Chính sách (Chúc thọ & Hưu trí Xã hội)**:
  - Xóa bỏ sự phân mảnh dữ liệu: Chuyển toàn bộ dữ liệu đối tượng chính sách về dùng chung trực tiếp với CSDL Quản lý Hộ khẩu - Nhân khẩu, xác lập QLHK làm nguồn dữ liệu chuẩn duy nhất (Single Source of Truth).
  - Tự động hóa hoàn toàn danh sách Mừng thọ (Chúc thọ): Tự động lọc toàn bộ công dân từ 60 tuổi trở lên theo các mốc tuổi quy định (70, 75, 80, 85, 90+ tuổi) và hỗ trợ lọc linh hoạt theo ngày/tháng/năm sinh.
  - Tự động hóa danh sách Hưu trí Xã hội: Tự động trích xuất các hồ sơ có trường nghề nghiệp ghi nhận thông tin liên quan đến "hưu", "nghỉ hưu", "hưu trí", không cần lập danh sách thủ công.

- **Tái thiết kế Toàn diện Modal Nhân khẩu (CitizenModal) chuẩn Civic Ergonomics**:
  - **Dock Sidebar Điều hướng Biểu tượng (`w-20`)**: Thay thế giao diện 1 cột cuộn dài dễ gây ngợp thông tin bằng thanh dock biểu tượng tối giản, tinh tế bên trái. Tích hợp avatar nhận diện thông minh với chữ cái viết tắt, đính kèm huy hiệu sao vàng `★` nổi bật cho Chủ hộ gia đình.
  - **Phân tách 2 Không gian Dữ liệu Chuyên biệt**:
    - **Tab 1: Thông tin cơ bản**: Tập trung vào nhân thân cốt lõi (Họ và tên, quan hệ gia đình, giới tính, ngày tháng năm sinh, số CCCD bảo mật, dân tộc, tôn giáo và quê quán) kèm chỉ báo hoàn tất thông tin bằng chấm tròn xanh thanh thoát.
    - **Tab 2: Nghề nghiệp & Nghĩa vụ**: Quản lý chuyên sâu về trình độ học vấn, việc làm chính, tình hình thực hiện nghĩa vụ quân sự và ghi chú nhân khẩu mở rộng (`textarea` 4 dòng rộng rãi) kèm huy hiệu đếm số trường dữ liệu đã điền.
  - **Khóa Cố định Chiều cao Khung nhìn (`h-[580px]`) - Zero Cumulative Layout Shift (Zero CLS)**:
    - Loại bỏ 100% hiện tượng co giãn, giật layout khi chuyển đổi giữa tab ngắn và tab dài; thanh công cụ hành động phía dưới (`Hủy`, `Lưu nhân khẩu`, `← Quay lại`, `Mục tiếp theo →`) luôn giữ nguyên tọa độ vật lý, loại bỏ hoàn toàn rủi ro bấm trượt nút.
  - **Chuẩn hóa Tối giản Trường Quan hệ**:
    - Rút gọn nhãn hiển thị thành `"Quan hệ *"`, dọn sạch toàn bộ các chip nút bấm gợi ý rườm rà dưới ô nhập; trang bị danh mục gợi ý gốc HTML5 `datalist` (`#rel-options`) hỗ trợ gõ nhanh hoặc chọn tự động.
    - Tự động nhận diện và hiển thị huy hiệu `Chủ hộ gia đình` nổi bật khi nhân khẩu mang vai trò chủ hộ.

- **Động cơ Công thái học Nhập liệu Siêu tốc cho Cán bộ (Rapid Data Entry Engine)**:
  - **Autofocus Thông minh**: Tự động đưa con trỏ vào ô "Họ và tên" ngay khi mở modal; tự động focus vào ô "Nghề nghiệp" khi cán bộ chuyển sang Tab 2, không cần chạm chuột.
  - **Hệ thống Phím tắt Liền mạch**: Phím `Enter` tự động chuyển vùng chọn tuần tự sang trường tiếp theo và tự động lưu khi ở trường cuối cùng; tổ hợp `Ctrl + Enter` lưu tức thì hồ sơ tại bất kỳ ô nhập liệu nào; phím `Esc` đóng an toàn modal.
  - **Cảnh báo Trùng lặp CCCD Thời gian thực (Real-time Duplicate CCCD Guard)**: Ngay khi nhập đủ 12 chữ số CCCD, hệ thống tự động quét và đối soát tức thì với toàn bộ nhân khẩu trong hộ; hiển thị huy hiệu nhấp nháy đỏ kèm tên nhân khẩu bị trùng, chặn đứng nguy cơ sai sót dữ liệu ngay từ bước nhập liệu.
  - **Tính toán Tuổi & Năm sinh Động (Live Age & Birth Year)**: Tính toán và hiển thị tuổi tức thời ngay cạnh ô ngày sinh và trên tooltip avatar thanh dock.

- **Chuyển hẳn sang Động cơ Backend Rust Native (Cổng 5012) & Cơ chế Dự phòng Tự động**:
  - Xác lập Backend Rust Axum trên cổng `5012` làm máy chủ chính thức duy nhất của toàn bộ hệ sinh thái Client; giữ lại Backend Node.js (cổng `5002`) làm cơ chế dự phòng tự động (Automated Failover) trong trường hợp dịch vụ Rust bảo trì.
  - Sau khi kiểm định Shadow Parity thành công 18/18 tiêu chí (100% PASS), gỡ bỏ hoàn toàn nút chuyển đổi backend thủ công khỏi giao diện (Header và Settings), đảm bảo cán bộ luôn vận hành trên động cơ Rust tốc độ cao.

---

### ⚡ UPDATE & PERFORMANCE (Cải tiến & Tối ưu hóa hiệu năng)

- **Chuyển đổi Cổng Mặc định Client sang Rust Backend**:
  - Cập nhật `QLHK-Client/src/api/client.ts` ưu tiên kết nối trực tiếp đến backend Rust trên cổng `5012`, tăng tốc độ tải dữ liệu ban đầu và phản hồi thao tác.
- **Tối ưu Hóa Tốc độ Đọc/Ghi Excel & Tiết kiệm Bộ nhớ**:
  - Thay thế hoàn toàn cách đọc toàn bộ file vào RAM bằng cơ chế đọc stream và giải mã zero-copy của `calamine` và `rust_xlsxwriter`, xử lý tệp dữ liệu hàng nghìn nhân khẩu mà không gây nghẽn tài nguyên.
- **Tối ưu Hóa Đóng gói Vite & Phản hồi Tức thời**:
  - Hoàn tất đóng gói ứng dụng toàn diện trong **5.35 giây**, bundle nạp nhanh, giao diện phản hồi dưới 16ms (chuẩn 60fps).
- **Hệ thống Kiểm định Tự động Đạt 100% (25/25 Test Files, 205/205 Tests PASS)**:
  - Cập nhật toàn diện bộ kiểm thử `CitizenModal.test.tsx` (14/14 tests) bao phủ toàn bộ luồng tương tác 2 tab, phím tắt, cảnh báo trùng CCCD và validation ngày sinh/CCCD.
  - Đảm bảo 205 bài kiểm thử unit, integration, và E2E trên toàn hệ thống chạy thành công tuyệt đối.
- **Bảo mật Dữ liệu CCCD Tuyệt đối**:
  - Đồng bộ chuẩn thuật toán mã hóa đối xứng AES-256-GCM (IV 12 bytes ngẫu nhiên, authentication tag 16 bytes) và băm HMAC-SHA256 kết hợp chuỗi secret pepper, đảm bảo tương thích 100% với dữ liệu đã lưu trữ.
- **Chuẩn hóa Mã nguồn P0 Zero Comments**:
  - Toàn bộ 100% mã nguồn Rust mới và sửa đổi tuân thủ nghiêm ngặt chuẩn Zero Comments, tự giải thích bằng kiến trúc và định danh tường minh.

---

### 🛠️ FIX (Sửa lỗi & Vá lỗi giao diện)

- **Khắc phục Triệt để Lỗi Dropdown Bị Giật từ Góc Màn hình**:
  - Tối ưu hóa component `CustomSelect.tsx` với cơ chế tính toán trước tọa độ và `useLayoutEffect`, triệt tiêu hoàn toàn hiện tượng menu nhảy giật từ góc trên bên trái `(0, 0)` khi bung mở.
- **Nâng cấp Bộ lọc Ngày sinh cho Phân hệ Chúc thọ**:
  - Bổ sung trường lọc theo ngày/tháng/năm sinh cụ thể trên thanh lọc `ProfileFilterBar.tsx` của phân hệ Chúc thọ, giúp lập danh sách mừng thọ cho các cụ cao tuổi nhanh chóng, chính xác.
- **Thanh lọc Giao diện Phân tích Chính sách & Dọn dẹp Thư mục Tạm**:
  - Tạm thời gỡ bỏ thẻ `PolicyCompositeCard` trong `PolicyAnalyticsPage.tsx` nhằm đơn giản hóa màn hình phân tích; gỡ bỏ hoàn toàn nút bấm xem thử test trên Header và xóa sạch thư mục thử nghiệm `src/test/`.
- **Sửa Lỗi Phân cấp & Neo Vị trí Dropdown Select trong Modal**:
  - Khắc phục triệt để lỗi menu thả xuống (dropdown select) bị nhảy lệch vị trí lên góc màn hình hoặc bị che khuất khi thao tác sửa thông tin nhân khẩu; chuẩn hóa thuộc tính z-index và cơ chế neo vị trí trong container modal.
- **Bảo vệ Tính Toàn vẹn Dữ liệu Chính sách**:
  - Khóa nút xóa hồ sơ và nút sửa thông tin bên phân hệ Chúc thọ và Hưu trí xã hội, ngăn chặn nguy cơ sai lệch hoặc mất mát thông tin so với sổ hộ khẩu gốc.
- **Sửa Lỗi Phân quyền & Ẩn Hiện Menu Sidebar**:
  - Thiết lập cơ chế ẩn/hiển thị thông minh cho các mục Chúc thọ, Hưu trí xã hội và Thống kê chính sách trên Sidebar, chỉ kích hoạt khi người dùng chọn xem một thôn cụ thể hoặc xem thống kê toàn xã.

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
