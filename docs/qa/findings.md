# BÁO CÁO PHÁT HIỆN LỖI KIỂM THỬ TRÌNH DUYỆT (BROWSER QA FINDINGS)

**Dự án**: QLHK - Quản Lý Hộ Khẩu & Nhân Khẩu Xã Đăk Hà  
**Pha**: PHA 1 — Kiểm chứng trực tiếp trên trình duyệt thật (Read-Only)  
**Ngày thực hiện**: 02/10/2026  
**Môi trường kiểm thử**:  
- Trình duyệt: Chromium 140.0.7339.16 (DevTools Protocol CDP trên cổng 9222)  
- Web Preview: `http://localhost:5175/` (Vite 5 dev server)  
- Backend API: `http://localhost:5002/` (Express + Prisma 6 + SQLite `dev.db`)  
- Nhánh Git: `fix/browser-qa` (Tag: `pre-browser-qa`)  

---

## MA TRẬN PHÁT HIỆN (FINDINGS MATRIX)

| ID | Loại | Tiêu đề | Mức độ | Độ tin cậy | Nhãn |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **BUG-QA-001** | Mạng / Cấu hình | Biến `VITE_API_URL` trỏ cứng Cloudflare remote gây lỗi 530 và mất kết nối Local Backend | P1 | Cao (≥2 lần) | **CỔNG DUYỆT** |
| **BUG-QA-002** | UI / Nghiệp vụ | Chuỗi văn bản cố định "7 Thôn" xuất hiện trên VillagesPage, KPI Cards và ProfileCard | P2 | Cao (≥2 lần) | **TỰ SỬA** |
| **BUG-QA-003** | Chức năng / Route | Bấm thẻ thôn trên VillagesPage điều hướng nhầm sang tab Thống kê thay vì Hộ gia đình | P2 | Cao (≥2 lần) | **TỰ SỬA** |
| **BUG-QA-004** | UI / Responsive | Vỡ bố cục trên mobile 360px: Sidebar không tự co/ẩn, ép nát nội dung thành cột dọc | P2 | Cao (≥2 lần) | **TỰ SỬA** |
| **BUG-QA-005** | UI / Tràn nội dung | Thanh 4 Tab trong trang Cài Đặt (SettingsPage) tràn lề và cắt cụt tab thứ 4 ở 768px | P2 | Cao (≥2 lần) | **TỰ SỬA** |
| **BUG-QA-006** | UI / Trực quan | Xung đột chỉ báo trạng thái: Header hiển thị pill xanh "Online" kèm banner đỏ "Offline" | P3 | Cao (≥2 lần) | **TỰ SỬA** |

---

## CHI TIẾT TỪNG PHÁT HIỆN

### 1. BUG-QA-001: Biến `VITE_API_URL` trỏ cứng Cloudflare remote domain gây lỗi 530
- **Loại**: Mạng / Cấu hình / Chức năng
- **Mức độ**: P1 (Nghiêm trọng - Chặn toàn bộ luồng kết nối API trong môi trường phát triển cục bộ)
- **Độ tin cậy**: Cao (Tái hiện ổn định 100%)
- **Nhãn**: **CỔNG DUYỆT** (Cần phê duyệt cập nhật file cấu hình môi trường `.env` và `client.ts`)
- **Vị trí trong mã nguồn**:
  - [`QLHK-Client/.env:1`](file:///c:/Projects/QLHK/QLHK-Client/.env#L1): `VITE_API_URL=https://qlhk.dulieudakha.vn/api`
  - [`QLHK-Client/.env.development:1`](file:///c:/Projects/QLHK/QLHK-Client/.env.development#L1): `VITE_API_URL=https://qlhk.dulieudakha.vn/api`
  - [`QLHK-Client/src/api/client.ts:4-6`](file:///c:/Projects/QLHK/QLHK-Client/src/api/client.ts#L4-L6):
    ```typescript
    export const API_BASE_URL =
      import.meta.env.VITE_API_URL ||
      (import.meta.env.DEV ? "/api" : "https://qlhk.dulieudakha.vn/api");
    ```
- **Các bước tái hiện**:
  1. Khởi động app `npm run dev` tại `QLHK-Client` trên cổng 5175.
  2. Mở trình duyệt truy cập `http://localhost:5175/`.
  3. Nhập tài khoản `admin` / `admin123` và bấm nút `ĐĂNG NHẬP`.
- **Kết quả thực tế**:
  - Trình duyệt gửi request POST tới `https://qlhk.dulieudakha.vn/api/auth/login`.
  - Cloudflare trả về HTTP 530 / `net::ERR_FAILED`.
  - Giao diện báo lỗi: *"Không thể kết nối máy chủ xác thực và không tìm thấy phiên làm việc ngoại tuyến hợp lệ."*
  - Toàn bộ dữ liệu thôn, hộ và nhân khẩu không tải được từ backend local.
- **Kết quả mong đợi**:
  - Trong môi trường local development (`import.meta.env.DEV === true`), ứng dụng phải ưu tiên sử dụng proxy nội bộ `/api` trỏ về backend Express local (`http://localhost:5002`) để chạy thử nghiệm và kiểm thử độc lập.
- **Bằng chứng**:
  - File ảnh chụp màn hình: [`qa_flow01_04_login_success.png`](file:///C:/Users/umnuar/.gemini/antigravity/brain/f236575e-f793-4311-a142-418095f3c8e0/qa_flow01_04_login_success.png)
  - Log mạng CDP:
    ```text
    - [POST] https://qlhk.dulieudakha.vn/api/auth/login -> Status: FAILED: net::ERR_FAILED
    - [OPTIONS] https://qlhk.dulieudakha.vn/api/auth/login -> Status: 530
    ```

---

### 2. BUG-QA-002: Chuỗi văn bản cố định "7 Thôn" xuất hiện trên VillagesPage, KPI Cards và ProfileCard
- **Loại**: UI / Tính Nhất Quán / Nghiệp vụ
- **Mức độ**: P2 (Trung bình - Vi phạm quy tắc chuẩn hóa số động theo chỉ thị của người dùng)
- **Độ tin cậy**: Cao (Tái hiện 100%)
- **Nhãn**: **TỰ SỬA** (Phạm vi nhỏ, không thay đổi logic nghiệp vụ backend)
- **Vị trí trong mã nguồn**:
  - [`QLHK-Client/src/pages/VillagesPage.tsx:288`](file:///c:/Projects/QLHK/QLHK-Client/src/pages/VillagesPage.tsx#L288): `<span className="...">Địa Bàn 7 Thôn</span>`
  - [`QLHK-Client/src/pages/VillagesPage.tsx:320`](file:///c:/Projects/QLHK/QLHK-Client/src/pages/VillagesPage.tsx#L320): `<div className="...">7 Thôn</div>`
  - [`QLHK-Client/src/pages/VillagesPage.tsx:422`](file:///c:/Projects/QLHK/QLHK-Client/src/pages/VillagesPage.tsx#L422): `<span>Danh Sách 7 Thôn</span>`
  - [`QLHK-Client/src/pages/Settings/ProfileCard.tsx:110`](file:///c:/Projects/QLHK/QLHK-Client/src/pages/Settings/ProfileCard.tsx#L110): `'Quản trị viên toàn xã (Toàn quyền quản lý dữ liệu 7 thôn)'`
- **Các bước tái hiện**:
  1. Điều hướng vào trang Quản lý Thôn (`VillagesPage`).
  2. Quan sát Banner Gradient Emerald, Thẻ KPI 1, và tiêu đề danh sách thôn.
  3. Mở trang Cài Đặt -> Tab Tài khoản của tôi.
- **Kết quả thực tế**: Các nhãn ghi cứng số 7 ("Địa Bàn 7 Thôn", "7 Thôn", "Danh Sách 7 Thôn", "quản lý dữ liệu 7 thôn").
- **Kết quả mong đợi**: Thay thế bằng số động `Địa Bàn ${villages.length} Thôn`, `${villages.length} Thôn`, `Danh Sách Thôn Xã Đăk Hà`, hoặc `Quản trị viên toàn xã (Toàn quyền quản lý dữ liệu các thôn)`.
- **Bằng chứng**:
  - File ảnh chụp màn hình: [`qa_flow02_villages_overview.png`](file:///C:/Users/umnuar/.gemini/antigravity/brain/f236575e-f793-4311-a142-418095f3c8e0/qa_flow02_villages_overview.png) và [`qa_flow08_settings_tab1_profile.png`](file:///C:/Users/umnuar/.gemini/antigravity/brain/f236575e-f793-4311-a142-418095f3c8e0/qa_flow08_settings_tab1_profile.png).

---

### 3. BUG-QA-003: Bấm thẻ thôn điều hướng nhầm sang tab Thống kê thay vì Hộ gia đình
- **Loại**: Chức năng / Điều hướng (Route)
- **Mức độ**: P2 (Trung bình - Ảnh hưởng trực tiếp đến trải nghiệm điều hướng chính)
- **Độ tin cậy**: Cao (Tái hiện 100%)
- **Nhãn**: **TỰ SỬA**
- **Vị trí trong mã nguồn**:
  - [`QLHK-Client/src/pages/VillagesPage.tsx:167-170`](file:///c:/Projects/QLHK/QLHK-Client/src/pages/VillagesPage.tsx#L167-L170):
    ```typescript
    const handleVillageClick = (id: string) => {
      setSelectedVillageId(id);
      setActiveTab("analytics"); // <-- SAI: Điều hướng sang analytics thay vì households
    };
    ```
- **Các bước tái hiện**:
  1. Tại trang `VillagesPage`, người dùng bấm vào một thẻ thôn (ví dụ `Thôn 1`).
- **Kết quả thực tế**: Người dùng bị chuyển sang màn hình Biểu đồ phân tích dân số (`AnalyticsPage`), trong khi chú thích trên thẻ thôn ghi rõ: *"Bấm vào thẻ thôn để chuyển nhanh đến màn hình làm việc của thôn đó"*.
- **Kết quả mong đợi**: Bấm vào thẻ thôn phải thiết lập `setSelectedVillageId(id)` và chuyển sang `setActiveTab("households")` để xem bảng hộ gia đình & nhân khẩu của thôn tương ứng.
- **Bằng chứng**:
  - File ảnh chụp màn hình: [`qa_flow02_village_selected.png`](file:///C:/Users/umnuar/.gemini/antigravity/brain/f236575e-f793-4311-a142-418095f3c8e0/qa_flow02_village_selected.png).

---

### 4. BUG-QA-004: Vỡ bố cục trên mobile 360px: Sidebar không tự co/ẩn
- **Loại**: Giao diện (UI) / Trợ năng & Responsive
- **Mức độ**: P2 (Trung bình - Ứng dụng không sử dụng được trên màn hình hẹp)
- **Độ tin cậy**: Cao (Tái hiện 100%)
- **Nhãn**: **TỰ SỬA**
- **Vị trí trong mã nguồn**:
  - [`QLHK-Client/src/components/layout/AppLayout.tsx`](file:///c:/Projects/QLHK/QLHK-Client/src/components/layout/AppLayout.tsx)
  - [`QLHK-Client/src/components/layout/Sidebar.tsx:98-102`](file:///c:/Projects/QLHK/QLHK-Client/src/components/layout/Sidebar.tsx#L98-L102)
- **Các bước tái hiện**:
  1. Đổi kích thước cửa sổ trình duyệt sang `360 x 800px` (chuẩn mobile màn hình hẹp).
  2. Quan sát bố cục trang.
- **Kết quả thực tế**:
  - Sidebar chiều rộng cố định `w-64` (256px) chiếm tới 71% toàn màn hình.
  - Vùng nội dung chính bên phải chỉ còn lại ~104px, làm cho tiêu đề bị bóp nát, chữ xếp dọc từng ký tự một (`S \n a \n o ...`).
  - Thanh header bị tràn ngang (horizontal overflow).
- **Kết quả mong đợi**:
  - Khi màn hình nhỏ (`md:hidden` hoặc `< 768px`), Sidebar phải tự động ở trạng thái đóng (`isSidebarCollapsed = true` / `w-16`) hoặc chuyển sang dạng mobile off-canvas drawer có lớp backdrop mờ.
  - Vùng nội dung chính co giãn linh hoạt và chiếm trọn không gian hiển thị.
- **Bằng chứng**:
  - File ảnh chụp màn hình: [`qa_responsive_360px.png`](file:///C:/Users/umnuar/.gemini/antigravity/brain/f236575e-f793-4311-a142-418095f3c8e0/qa_responsive_360px.png).

---

### 5. BUG-QA-005: Thanh 4 Tab trong trang Cài Đặt (SettingsPage) tràn lề và cắt cụt tab thứ 4 ở 768px
- **Loại**: Giao diện (UI) / Tràn nội dung
- **Mức độ**: P2 (Trung bình)
- **Độ tin cậy**: Cao (Tái hiện 100%)
- **Nhãn**: **TỰ SỬA**
- **Vị trí trong mã nguồn**:
  - [`QLHK-Client/src/pages/SettingsPage.tsx:280-320`](file:///c:/Projects/QLHK/QLHK-Client/src/pages/SettingsPage.tsx#L280-L320)
- **Các bước tái hiện**:
  1. Mở trang Cài Đặt (`SettingsPage`).
  2. Đặt viewport trình duyệt ở chiều rộng `768px` (chuẩn iPad/Tablet dọc).
- **Kết quả thực tế**:
  - Tab 4 (`Thông Tin Đơn Vị & Hệ Thống`) bị tràn qua mép phải container và bị cắt cụt hoàn toàn, người dùng không thể nhìn thấy hoặc click chọn tab này.
- **Kết quả mong đợi**:
  - Container chứa thanh tab phải có `overflow-x-auto scrollbar-none` kết hợp `shrink-0` trên từng nút tab để cho phép cuộn ngang mượt mà khi màn hình không đủ chỗ hiển thị cả 4 tab.
- **Bằng chứng**:
  - File ảnh chụp màn hình: [`qa_responsive_768px.png`](file:///C:/Users/umnuar/.gemini/antigravity/brain/f236575e-f793-4311-a142-418095f3c8e0/qa_responsive_768px.png).

---

### 6. BUG-QA-006: Xung đột chỉ báo trạng thái: Header hiển thị pill xanh "Online" kèm banner đỏ "Offline"
- **Loại**: Giao diện (UI) / Trực quan & Độ tin cậy
- **Mức độ**: P3 (Nhỏ - Gây bối rối trực quan nhưng không làm crash hệ thống)
- **Độ tin cậy**: Cao (Tái hiện 100%)
- **Nhãn**: **TỰ SỬA**
- **Vị trí trong mã nguồn**:
  - [`QLHK-Client/src/components/layout/Header.tsx`](file:///c:/Projects/QLHK/QLHK-Client/src/components/layout/Header.tsx)
  - [`QLHK-Client/src/AppContext.tsx:210-240`](file:///c:/Projects/QLHK/QLHK-Client/src/AppContext.tsx#L210-L240)
- **Các bước tái hiện**:
  1. Mở app khi máy tính có kết nối Internet nhưng backend API cục bộ/từ xa bị gián đoạn.
  2. Quan sát khu vực Header trên cùng.
- **Kết quả thực tế**:
  - Huy hiệu pill xanh lá hiển thị `"Online"` (do chỉ kiểm tra `navigator.onLine`).
  - Ngay bên dưới xuất hiện thanh màu đỏ thẫm báo: `"Mất kết nối tới máy chủ - Đang hoạt động ở chế độ ngoại tuyến (Offline)"`.
  - Hai thông báo mâu thuẫn hiển thị cùng một lúc trên một màn hình.
- **Kết quả mong đợi**:
  - Huy hiệu trạng thái trên Header phải phản ánh đúng trạng thái kết nối thực sự tới API Server (`isServerOnline`): Nếu mất kết nối server thì pill phải chuyển sang màu hổ phách/đỏ với nhãn `"Ngoại tuyến"`.
- **Bằng chứng**:
  - File ảnh chụp màn hình: [`qa_flow02_villages_overview.png`](file:///C:/Users/umnuar/.gemini/antigravity/brain/f236575e-f793-4311-a142-418095f3c8e0/qa_flow02_villages_overview.png).

---

## MỤC CHƯA TÁI HIỆN ĐƯỢC
- Không có lỗi crash JavaScript runtime hay React hydration mismatch unhandled nào xảy ra.
- Toàn bộ 131 unit tests và bản build Vite production đều giữ nguyên độ ổn định hoàn hảo.
