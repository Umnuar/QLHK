# KẾ HOẠCH QUY HOẠCH & SÁP NHẬP PHÂN HỆ QUẢN LÝ CHÍNH SÁCH (QLCS) VÀO QLHK

> **Tài liệu:** Bản thiết kế kiến trúc sáp nhập (Architecture Merge Blueprint)  
> **Hệ thống tiếp nhận:** Quản lý Hộ khẩu & Nhân khẩu (QLHK) – Xã Đăk Hà  
> **Phân hệ sáp nhập:** Quản lý Chính sách (QLCS: Chúc thọ & Hỗ trợ xã hội)  
> **Trạng thái:** Dự thảo quy hoạch – Đóng băng chờ lệnh thực thi  
> **Branch chuẩn bị:** `feat/qlhk-merge-qlcs`  

---

## 1. TỔNG QUAN & MỤC TIÊU SÁP NHẬP

### 1.1. Bối cảnh
- **QLHK hiện tại:** Hệ thống lõi quản lý sổ hộ khẩu, nhân khẩu, biến động cư trú, dữ liệu định danh CCCD (mã hóa AES-256-GCM + SHA-256 hash), phân bổ dân cư 14 dân tộc trực thuộc UBND Xã Đăk Hà. Ứng dụng Desktop Thin-Client xây dựng trên nền tảng **Tauri v2 + React 18 + Vite + TypeScript**, Backend chạy **Express + Prisma ORM + PostgreSQL**.
- **QLCS hiện tại:** Hệ thống độc lập chuyên quản lý hồ sơ Chúc thọ người cao tuổi (các mốc tuổi tròn từ 60 đến >100) và diện Hỗ trợ xã hội (HTXH: 6 diện trợ cấp chính sách).
- **Mục tiêu sáp nhập:** Hợp nhất phân hệ QLCS vào QLHK để xây dựng **Siêu ứng dụng Quản lý Dân cư & Chính sách Xã hội toàn diện**. Toàn bộ dữ liệu được gom về một CSDL tập trung duy nhất, một backend xử lý duy nhất và một ứng dụng Desktop Tauri siêu nhẹ (~10MB) duy nhất cho cán bộ xã và trưởng thôn.

---

## 2. NỘI DUNG SÁP NHẬP CHI TIẾT (WHAT GETS MERGED)

### 2.1. Lược Đồ Dữ Liệu (Prisma Database Schema)
Nạp các model từ `QLCS/QLCS-Backend/prisma/schema.prisma` vào `QLHK/QLHK-Backend/prisma/schema.prisma`:

| Model Nguồn (QLCS) | Model Đích (QLHK) | Phương Án Xử Lý | Quan Hệ Khóa Ngoại |
| :--- | :--- | :--- | :--- |
| `villages` | `villages` | **Dùng chung** model hiện hữu của QLHK, không tạo mới. | Bảng master địa bàn |
| `users` | `users` | **Dùng chung** tài khoản cán bộ của QLHK, không duplicate. | Bảng master người dùng |
| `refresh_tokens` | `refresh_tokens` | **Dùng chung** cơ chế refresh token hiện hữu của QLHK. | FK `user_id` -> `users.id` |
| `profiles` | `chuctho_profiles` | **Chuyển giao & Đổi tên**: Tránh xung đột tên gọi chung "profile". Lưu danh sách chúc thọ theo độ tuổi (`age60`..`age_over_100`), trạng thái `received`, năm tính `calculation_year`. | FK `village_id` -> `villages.id`<br>*Tùy chọn*: FK `citizen_id` -> `citizens.id` |
| `htxh_profiles` | `htxh_profiles` | **Chuyển giao nguyên vẹn**: Quản lý 6 diện trợ cấp xã hội (`age75plus`, `age70to74poor`, `bao_tro`, `huu_tri`, `huu_tuat_bao_hiem`, `nguoi_co_cong`). | FK `village_id` -> `villages.id`<br>*Tùy chọn*: FK `citizen_id` -> `citizens.id` |
| `profile_audit_log` | `profile_audit_log` | **Chuyển giao nguyên vẹn**: Lưu vết JSON diff chi tiết từng trường thay đổi của hồ sơ chính sách. | FK `user_id` -> `users.id` |
| `stats_cache` | *Loại bỏ hoặc gom* | **Tối ưu hóa**: Thay thế bằng cơ chế In-Memory Caching có sẵn của backend QLHK để giảm tải DB. | Không phụ thuộc bảng vật lý |
| `settings` | `settings` | **Đồng hóa cấu hình**: Dùng bảng `settings` của QLHK để lưu các tham số hệ thống QLCS. | Key-Value format |

### 2.2. Tuyến Đường & Dịch Vụ Phía Backend
Cô lập toàn bộ nghiệp vụ chính sách dưới namespace chuyên biệt `/policies` (hoặc `/chinh-sach`):

- **`/api/policies/chuctho`**:
  - `GET /`: Danh sách hồ sơ chúc thọ (phân trang, lọc theo mốc tuổi, trạng thái nhận quà, năm tính).
  - `GET /stream`: Streaming NDJSON xuất/tải danh sách quy mô lớn.
  - `POST /`: Thêm mới hồ sơ chúc thọ.
  - `PUT /:id`: Cập nhật thông tin hồ sơ (OCC version locking).
  - `PATCH /:id/received`: Đánh dấu trạng thái đã trao nhận quà mừng thọ.
  - `DELETE /:id`: Xóa mềm (`is_deleted = true`).
- **`/api/policies/htxh`**:
  - `GET /`: Danh sách hồ sơ bảo trợ xã hội (lọc 6 diện trợ cấp, năm tính, tình trạng nhận).
  - `GET /stream`: Streaming NDJSON đối tượng HTXH.
  - `POST /`, `PUT /:id`, `PATCH /:id/received`, `DELETE /:id`.
- **`/api/policies/analytics`**:
  - Thống kê tổng hợp số lượng đối tượng chúc thọ theo từng mốc tuổi và kinh phí dự kiến.
  - Thống kê đối tượng hỗ trợ xã hội theo từng diện và từng thôn.
- **`/api/policies/excel`**:
  - Nhập dữ liệu danh sách chúc thọ/HTXH từ biểu mẫu Excel (thuật toán Smart-Upsert & Candidate Lookup).
  - Xuất danh sách báo cáo chuẩn phòng LĐ-TB&XH.
- **`/api/policies/audit`**:
  - Truy vấn nhật ký thay đổi hồ sơ chính sách theo thời gian thực.

### 2.3. Giao Diện & Trải Nghiệm Người Dùng (Client Desktop App)
Tích hợp giao diện vào ứng dụng Thin-Client Tauri v2 của QLHK:

1. **Thanh Điều Hướng ([Sidebar.tsx](file:///c:/Users/umnuar/Documents/Projects/QLHK/QLHK-Client/src/components/Layout/Sidebar.tsx))**:
   - Thêm nhóm mục riêng: **"CHÍNH SÁCH XÃ HỘI"**.
   - Tab **Chúc Thọ** (`id: "chuctho"`, Icon: `Award` / `Gift`).
   - Tab **Hỗ Trợ Xã Hội** (`id: "htxh"`, Icon: `HeartHandshake`).
   - Tab **Thống Kê Chính Sách** (`id: "policy-analytics"`, Icon: `BarChart2`).
2. **Khung Điều Khiển Trung Tâm ([App.tsx](file:///c:/Users/umnuar/Documents/Projects/QLHK/QLHK-Client/src/App.tsx))**:
   - Sử dụng `React.lazy()` nạp động `ChucThoPage`, `HtxhPage`, `PolicyAnalyticsPage`.
   - Giữ nguyên trạng thái tải mượt mà không làm chậm thời gian khởi động ban đầu.
3. **Modal & Component Chuẩn Hóa**:
   - Kế thừa thiết kế Centered Modal nổi trung tâm của QLCS, thống nhất hệ màu Emerald/Slate hiện hành của QLHK.
   - Thống nhất các dialog xác nhận xóa mềm, khôi phục và xuất nhập Excel.
4. **Cấu Hình Ứng Dụng ([tauri.conf.json](file:///c:/Users/umnuar/Documents/Projects/QLHK/QLHK-Client/src-tauri/tauri.conf.json))**:
   - Cập nhật tiêu đề cửa sổ: `Quản Lý Hộ Khẩu & Chính Sách Xã Hội - Xã Đăk Hà`.

---

## 3. NHỮNG ĐIỂM THAY ĐỔI KIẾN TRÚC & HẠ TẦNG (KEY ARCHITECTURAL CHANGES)

| Hạng Mục | Hiện Trạng Phân Tán (Cũ) | Trạng Thái Sáp Nhập (Mới) | Lợi Ích Mang Lại |
| :--- | :--- | :--- | :--- |
| **Cơ Sở Dữ Liệu** | 2 CSDL Supabase PostgreSQL riêng biệt (`dakha_qlhk` & `dakha_qlcs`) | 1 CSDL duy nhất (`dakha_qlhk`) chứa toàn bộ bảng | Giảm 50% chi phí kết nối, giải quyết triệt để rào cản chia sẻ dữ liệu liên phân hệ. |
| **Ứng Dụng Máy Trạm** | Cán bộ phải cài 2 phần mềm: QLHK (Tauri v2) và QLCS (Electron) | 1 phần mềm Desktop Tauri v2 duy nhất | Dung lượng cài đặt cực nhẹ (~10MB thay vì ~180MB), khởi động tức thì, tối ưu RAM trên máy tính cán bộ xã. |
| **Tài Khoản & Phiên Làm Việc** | Đăng nhập 2 lần trên 2 phần mềm với 2 cặp token khác nhau | Đăng nhập 1 lần (Single Sign-On cục bộ), 1 phiên làm việc duy nhất | Cán bộ xã và Trưởng thôn chuyển đổi giữa Hộ khẩu và Chính sách chỉ bằng 1 cú click chuột. |
| **Liên Kết Dữ Liệu Công Dân** | Dữ liệu người cao tuổi nhập rời rạc, có thể lệch họ tên, ngày sinh, CCCD với sổ hộ khẩu | Đối soát trực tiếp hồ sơ chính sách với bảng `citizens` (nhân khẩu gốc) | Phát hiện ngay đối tượng không có hộ khẩu, trùng lặp hồ sơ hoặc sai lệch thông tin định danh. |
| **Cổng Kết Nối Mạng** | Sử dụng đồng thời 2 cổng backend (QLCS: 5000, QLHK: 5002) | Tập trung toàn bộ API vào cổng duy nhất: `5002` | Tinh gọn cấu hình mạng, proxy Cloudflare Tunnel, đơn giản hóa quản trị hạ tầng. |

---

## 4. NGUY CƠ XUNG ĐỘT & GIẢI PHÁP PHÒNG NGỪA (CONFLICT RISKS & MITIGATIONS)

### 🔴 Nguy cơ 1: Xung Đột Tên Thực Thể & Model CSDL
- **Rủi ro:** Bảng `profiles` trong QLCS mang tên quá chung chung, dễ nhầm lẫn với thông tin cá nhân của người dùng (`users profile`) trong các thư viện mở rộng hoặc kiến trúc tương lai.
- **Giải pháp:** 
  - Trong Prisma schema của QLHK, khai báo tên model tường minh: `chuctho_profiles`.
  - Giữ lại mapping CSDL `@@map("chuctho_profiles")` (hoặc `@@map("profiles")` nếu giữ nguyên bảng hiện hữu trên PostgreSQL) để đảm bảo không bị gãy truy vấn SQL.

### 🔴 Nguy cơ 2: Lệch Cấu Trúc Khóa Chính Bảng `settings`
- **Rủi ro:** 
  - QLHK: `settings` dùng UUID `id @id @default(...)`, cột `key @unique`, kèm mô tả `description`.
  - QLCS: `settings` dùng `key @id` (chuỗi làm khóa chính), không có cột `id`.
  - Nếu gộp thô bạo sẽ gây lỗi xung đột schema DDL của Prisma.
- **Giải pháp:**
  - Bảo tồn nguyên vẹn cấu trúc bảng `settings` của QLHK.
  - Khi chuyển cấu hình QLCS sang, chèn các tham số QLCS dưới dạng các bản ghi key-value theo đúng chuẩn của QLHK.

### 🔴 Nguy cơ 3: Bất Đồng Bộ UUID Của Danh Mục Thôn Làng (`villages`)
- **Rủi ro:** 
  - Thôn 1 ở database QLHK có UUID `AAA`, nhưng ở database QLCS lại có UUID `BBB`.
  - Khi chuyển dữ liệu `profiles` và `htxh_profiles` từ QLCS sang QLHK, toàn bộ khóa ngoại `village_id` sẽ vi phạm ràng buộc Foreign Key (`FK violation`) hoặc trỏ sai thôn.
- **Giải pháp:**
  - Viết script ETL migration chuyên dụng: Đọc bảng `villages` của QLHK làm căn cứ chuẩn.
  - Map lại toàn bộ `village_id` của hồ sơ QLCS dựa trên **Tên thôn** (`name`) hoặc **Mã thôn** (`code`) trước khi insert vào CSDL QLHK.

### 🔴 Nguy cơ 4: Xung Đột Khóa Bí Mật Mã Hóa CCCD (`ENCRYPTION_KEY`)
- **Rủi ro:** 
  - Cả 2 hệ thống đều mã hóa CCCD bằng thuật toán `AES-256-GCM` lưu chuỗi dạng `iv:authTag:encryptedHex`.
  - Nếu file `.env` của QLCS dùng khóa `ENCRYPTION_KEY_CS` khác với `ENCRYPTION_KEY_HK` của QLHK, sau khi gộp dữ liệu, backend QLHK sẽ **không thể giải mã** CCCD của các hồ sơ chính sách cũ (ném lỗi `bad decrypt` hoặc `auth tag mismatch`).
- **Giải pháp:**
  - Trong kịch bản migration: Sử dụng khóa cũ của QLCS để giải mã toàn bộ CCCD sang dạng tạm thời trong bộ nhớ, sau đó dùng khóa bí mật của QLHK để mã hóa lại trước khi ghi vào database chung.
  - Tạo lại trường băm tra cứu `cccd_hash` (HMAC/SHA-256) đồng bộ theo secret key của QLHK.

### 🔴 Nguy cơ 5: Xung Đột Phân Quyền Cấp Thôn (Village Scoping RBAC)
- **Rủi ro:** 
  - Trưởng thôn đăng nhập tài khoản QLHK (`role: "user"`, gắn với `village_id`) nếu backend không kiểm soát chặt chẽ ở các route mới của QLCS thì có thể xem hoặc chỉnh sửa nhầm hồ sơ chính sách của thôn khác.
- **Giải pháp:**
  - Áp dụng triệt để middleware phân quyền của QLHK: `authenticateToken` và `authorizeVillage` cho 100% endpoint của `/api/policies/*`.
  - Cưỡng chế quy tắc: Trưởng thôn chỉ được đọc/ghi dữ liệu có `village_id === req.user.village_id`. Cán bộ Xã (`admin`) mới được phép truy vấn toàn xã hoặc lọc theo thôn bất kỳ.

### 🔴 Nguy cơ 6: Nghẽn Connection Pool Khi Gộp Tải Dịch Vụ
- **Rủi ro:** 
  - QLHK và QLCS đều có các tác vụ nặng: Nhập Excel hàng nghìn dòng, streaming NDJSON tải dữ liệu lớn, tính toán thống kê độ tuổi phức tạp. Khi gộp chung vào một instance PostgreSQL, nguy cơ cạn kiệt Connection Pool của Supabase là rất cao.
- **Giải pháp:**
  - Sử dụng PgBouncer (hoặc Supabase Transaction Pooler cổng 6543) kết hợp `directUrl` cho migration.
  - Giữ nguyên giới hạn xử lý theo từng lô (Batch Size 500-1000 bản ghi) và cơ chế giải phóng cursor streaming sau khi client ngắt kết nối (`req.destroyed`).
  - Áp dụng bộ nhớ đệm In-Memory TTL 10 giây cho các truy vấn thống kê chính sách.

### 🔴 Nguy cơ 7: Phình To Kích Thước Ứng Dụng Client Desktop
- **Rủi ro:** Nhập toàn bộ component của QLCS vào QLHK Client khiến bundle JavaScript ban đầu quá nặng, làm tăng thời gian mở ứng dụng trên các máy tính cấu hình thấp tại thôn.
- **Giải pháp:**
  - Cắt nhỏ mã nguồn bằng `React.lazy()` và dynamic imports cho các trang chính sách.
  - Tái sử dụng tối đa các thư viện giao diện sẵn có của QLHK (Lucide React, Tailwind CSS, custom hooks, generic components) thay vì copy trùng lặp.

---

## 5. LỘ TRÌNH THỰC THI CHUẨN BỊ (EXECUTION ROADMAP)
*(Chỉ kích hoạt khi có chỉ thị trực tiếp từ người dùng)*

```
[Phase 1] Chuẩn Bị & Khảo Sát (ĐÃ HOÀN THÀNH)
    └── Nạp ngữ cảnh, phân tích xung đột, ban hành tài liệu qlcs.md.
    
[Phase 2] Hợp Nhất Lược Đồ Dữ Liệu (Prisma Migration)
    ├── Bổ sung chuctho_profiles, htxh_profiles, profile_audit_log vào schema.prisma của QLHK.
    ├── Kiểm tra quan hệ khóa ngoại với bảng villages và users.
    └── Sinh Prisma Client mới và chạy migration an toàn.

[Phase 3] Kịch Bản Chuyển Dịch Dữ Liệu (ETL & Re-encryption Script)
    ├── Viết script map UUID Thôn từ CSDL QLCS sang CSDL QLHK.
    ├── Giải mã và tái mã hóa CCCD theo khóa bảo mật của QLHK.
    └── Di chuyển an toàn toàn bộ dữ liệu lịch sử và nhật ký thay đổi.

[Phase 4] Chuyển Giao Dịch Vụ Backend (Controllers & Routes)
    ├── Sao chép và chuẩn hóa controllers sang QLHK-Backend (chuctho, htxh, analytics, excel).
    ├── Gắn route vào namespace /api/policies/*.
    └── Bảo đảm 100% middleware xác thực & phân quyền thôn hoạt động chuẩn xác.

[Phase 5] Tích Hợp Giao Diện Client Desktop (Tauri Thin-Client)
    ├── Bổ sung các trang ChucThoPage, HtxhPage vào QLHK-Client với React.lazy().
    ├── Cập nhật menu điều hướng Sidebar.tsx và định tuyến App.tsx.
    ├── Tạo policyStore quản lý trạng thái hồ sơ chính sách.
    └── Cập nhật tiêu đề cửa sổ trong tauri.conf.json.

[Phase 6] Kiểm Thử Hồi Quy & Nghiệm Thu Toàn Diện
    ├── Chạy toàn bộ test suites hiện hữu của QLHK (bảo đảm 0 regression).
    ├── Bổ sung test suites kiểm tra API phân hệ chính sách mới.
    └── Kiểm thử luồng xuất/nhập Excel và phân quyền cán bộ thôn trên ứng dụng Desktop.
```

---

## 6. XÁC NHẬN TRẠNG THÁI
- Tài liệu này đóng vai trò là **Hợp đồng Kỹ thuật Bất biến (Architectural Contract)** cho toàn bộ quá trình sáp nhập.
- Mọi thao tác lập trình, di chuyển file hay can thiệp CSDL được **đóng băng** cho đến khi có lệnh rõ ràng từ người dùng.
