# BÁO CÁO BƯỚC 3: RÀ SOÁT MÃ NGUỒN CHUYÊN SÂU (SAST & MANUAL 11-LAYER REVIEW)
## Hệ Thống Quản Lý Hộ Khẩu & Nhân Khẩu Xã Đăk Hà (QLHK)

- **Mã tài liệu**: `QLHK-SEC-MR-03`
- **Phiên bản**: `1.0.0`
- **Ngày lập**: 02/10/2026
- **Phạm vi kiểm toán**: Toàn bộ mã nguồn `QLHK-Backend/src` và `QLHK-Client/src`
- **Chuẩn tham chiếu**: OWASP Top 10 (2021), OWASP ASVS v4.0.3 (Level 2), OWASP API Security Top 10 (2023), CWE Top 25 (2024).

---

## 1. PHƯƠNG PHÁP & DANH MỤC 11 LỚP KIỂM TOÁN

Quá trình kiểm toán kết hợp rà soát tĩnh tự động (Static Code Analysis) và kiểm toán thủ công chuyên sâu (Manual Security Code Review) từng luồng dữ liệu, đối soát trực tiếp với 11 lớp yêu cầu của OWASP ASVS L2:
1. **Xác thực & Quản lý Phiên (Authentication & Session Management)**
2. **Kiểm soát Truy cập & Phân quyền (Access Control, RBAC, IDOR/BOLA)**
3. **Xác thực Đầu vào & Vệ sinh Dữ liệu (Input Validation & Data Sanitization)**
4. **Mật mã học & Bảo vệ Dữ liệu Nhạy cảm (Cryptography & CCCD Protection)**
5. **Phòng chống Tiêm nhiễm (Injection Defense: SQLi, Formula Injection, XSS)**
6. **Xử lý Ngoại lệ & Rò rỉ Thông tin (Error Handling & Information Leakage)**
7. **Nhật ký Kiểm toán & Trách nhiệm Giải trình (Audit Logging & Accountability)**
8. **Khóa Lạc quan & Toàn vẹn Dữ liệu (Concurrency Control & OCC)**
9. **Xử lý Tệp tin Ngoại lai & Nhập Xuất Excel (File Handling & Parser Boundary)**
10. **Phòng vệ Tấn công Từ chối Dịch vụ (Denial of Service & Rate Limiting)**
11. **An ninh Phía Khách hàng (Client-Side Security & Token Storage)**

---

## 2. KẾT QUẢ ĐỐI SOÁT CHI TIẾT THEO 11 LỚP TIÊU CHUẨN ASVS

---

### LỚP 1: XÁC THỰC & QUẢN LÝ PHIÊN (AUTH & SESSION)
- **Thuật toán băm mật khẩu**: `bcryptjs` với salt rounds = 10 (`users.controller.ts#L83, L155`). Đạt chuẩn khuyến nghị OWASP (tối thiểu 10 vòng).
- **Vòng đời Token**:
  - Access Token: Ký HMAC-SHA256, thời gian sống ngắn **15 phút** (`jwt.ts#L14`).
  - Refresh Token: Ký HMAC-SHA256, gắn `jti: crypto.randomUUID()`, thời gian sống **7 ngày**, lưu trong CSDL (`jwt.ts#L17-L25`, `auth.controller.ts#L62-L68`).
- **Xoay vòng Refresh Token (Token Rotation)**:
  - Khi gọi `POST /api/auth/refresh`, token cũ bị xóa và token mới được tạo trong transaction nguyên tử (`auth.controller.ts#L139-L148`). Đạt chuẩn OWASP.
- **Điểm yếu phát hiện**:
  - 🟡 **`FINDING-ASVS-01` (P2 - Medium, CWE-307)**: **Thiếu cơ chế khóa tài khoản hoặc làm chậm khi đăng nhập thất bại liên tục**.
    - *Vị trí*: `QLHK-Backend/src/controllers/auth.controller.ts#L28-L41`.
    - *Bằng chứng*: Không có đếm số lần sai mật khẩu (`failed_attempts`), không có `lockout_until` hoặc độ trễ phản hồi. Kẻ tấn công có thể brute-force mật khẩu tài khoản cán bộ không giới hạn.
  - 🟡 **`FINDING-ASVS-02` (P2 - Medium, ASVS V3.8)**: **Thiếu phát hiện tái sử dụng Refresh Token (Refresh Token Reuse Detection)**.
    - *Vị trí*: `QLHK-Backend/src/controllers/auth.controller.ts#L109-L122`.
    - *Bằng chứng*: Khi client gửi một refresh token đã bị xóa (đã từng xoay vòng trước đó), server chỉ trả về lỗi 401 mà không phát hiện đây là dấu hiệu của hành vi trộm cắp token để tự động thu hồi toàn bộ token family của user đó.

---

### LỚP 2: KIỂM SOÁT TRUY CẬP & PHÂN QUYỀN (ACCESS CONTROL & RBAC)
- **Cơ chế Phân quyền Phạm vi Thôn (Village Scoping)**:
  - Middleware `authorizeVillageScope` tự động phân loại: Admin xã quản lý toàn bộ các thôn, Trưởng thôn bị giới hạn trong `user.village_id` (`auth.middleware.ts#L37-L147`).
- **Phòng chống BOLA / IDOR (Broken Object-Level Authorization)**:
  - Đã rà soát chi tiết toàn bộ các hàm controller:
    - `getHouseholdById`: Đã kiểm tra `household.village_id === req.user.village_id` (`households.controller.ts#L316-L321`).
    - `updateHousehold`: Đã kiểm tra `current.village_id === req.user.village_id` (`households.controller.ts#L468-L473`).
    - `deleteHousehold`: Đã kiểm tra `current.village_id === req.user.village_id` (`households.controller.ts#L780-L785`).
    - `restoreHousehold`: Đã kiểm tra `current.village_id === req.user.village_id` (`households.controller.ts#L845-L850`).
    - `batchDeleteHouseholds`: Đã kiểm tra 100% ID trong mảng phải thuộc thôn của user (`households.controller.ts#L914-L924`).
    - `getCitizenById`: Đã kiểm tra `citizen.household.village_id === req.user.village_id` (`citizens.controller.ts#L165-L173`).
    - `revealCitizenCCCD`: Đã kiểm tra `citizen.household.village_id === req.user.village_id` (`citizens.controller.ts#L206-L211`).
    - `createCitizen`: Đã kiểm tra hộ gia đình mục tiêu phải thuộc thôn của user (`citizens.controller.ts#L280-L285`).
    - `updateCitizen`: Đã kiểm tra `current.household.village_id === req.user.village_id` (`citizens.controller.ts#L385-L393`).
    - `deleteCitizen`: Đã kiểm tra `current.household.village_id === req.user.village_id` (`citizens.controller.ts#L531-L539`).
  - **Đánh giá IDOR**: **10/10 endpoints đã được bọc rào chắn RBAC đầy đủ**. Không phát hiện lỗ hổng IDOR trực tiếp.
- **Điểm yếu phát hiện**:
  - 🟡 **`FINDING-ASVS-03` (P2 - Medium, CWE-620, ASVS V2.1.10)**: **Đổi mật khẩu không yêu cầu xác nhận mật khẩu cũ**.
    - *Vị trí*: `QLHK-Backend/src/controllers/users.controller.ts#L130-L153`.
    - *Bằng chứng*: Hàm `updatePassword` chỉ nhận `newPassword`. Nếu chính chủ (`req.user.id === id`) thực hiện đổi mật khẩu, hệ thống không bắt buộc nhập `oldPassword` để xác minh lại danh tính. Kẻ chiếm được phiên đăng nhập có thể đổi mật khẩu tài khoản ngay lập tức.

---

### LỚP 3: XÁC THỰC ĐẦU VÀO & VỆ SINH DỮ LIỆU (INPUT VALIDATION)
- **Điểm yếu phát hiện**:
  - 🟡 **`FINDING-ASVS-04` (P2 - Medium, CWE-20, ASVS V5.1)**: **Chưa áp dụng Schema Validation (Zod) cho Request Body**.
    - *Vị trí*: Toàn bộ các controller `households.controller.ts`, `citizens.controller.ts`, `users.controller.ts`, `villages.controller.ts`.
    - *Bằng chứng*: Thư viện `zod` đã được cài đặt nhưng không có route nào định nghĩa middleware schema validation. Các tham số như `full_name`, `dob`, `gender`, `cccd`, `book_number` chỉ được kiểm tra sơ sài bằng `if (!val)` hoặc ép kiểu. Thiếu kiểm tra:
      - Độ dài tối đa (Max length) cho các trường chuỗi (`full_name` tối đa 100 ký tự, `address` tối đa 255 ký tự).
      - Ràng buộc định dạng ngày sinh `dob` (Định dạng hợp lệ hoặc năm 4 chữ số).
      - Ràng buộc định dạng số CCCD (Nếu có thì phải đúng 12 chữ số).
      - Ràng buộc giá trị hợp lệ cho `gender` (`Nam` hoặc `Nữ`).

---

### LỚP 4: MẬT MÃ HỌC & BẢO VỆ DỮ LIỆU NHẠY CẢM (CRYPTOGRAPHY)
- **Chuẩn mã hóa**: AES-256-GCM (`crypto.ts#L27`).
  - Sử dụng IV ngẫu nhiên 12 bytes sinh mới độc lập cho mỗi bản ghi (`crypto.randomBytes(12)`).
  - Có Authentication Tag 16 bytes chống sửa đổi dữ liệu bản mã (`cipher.getAuthTag()`).
  - Định dạng lưu trữ chuẩn xác: `ivHex:authTagHex:encryptedHex`.
- **Hàm băm tra cứu**: HMAC-SHA256 với `CCCD_HASH_PEPPER` bí mật hệ thống chống tấn công duyệt trước (Rainbow Tables).
- **Mặt cắt CCCD**: Hiển thị dạng che mặt nạ `••••••••1234` hoặc `••••••••` trên toàn bộ danh sách, chỉ giải mã khi có lệnh `revealCCCD` rõ ràng và được ghi log.
- **Điểm yếu phát hiện**:
  - Đã ghi nhận ở Bước 1: Sự tồn tại của các chuỗi fallback tĩnh trong `env.ts`.

---

### LỚP 5: PHÒNG CHỐNG TIÊM NHIỄM (INJECTION DEFENSE)
- **SQL Injection**: **PASS**. 100% truy vấn CSDL đều sử dụng Prisma ORM với truy vấn tham số hóa tự động (Parameterized Queries). Không có `$queryRaw` hay chuỗi SQL ghép nối.
- **XSS (Cross-Site Scripting)**: **PASS**. Không sử dụng `dangerouslySetInnerHTML` trong toàn bộ mã nguồn React Client.
- **Điểm yếu phát hiện**:
  - 🔴 **`FINDING-ASVS-05` (P1 - High, CWE-1236)**: **Formula Injection (CSV/Excel Macro Injection) khi Xuất File Excel**.
    - *Vị trí*: `QLHK-Client/src/pages/HouseholdsPage.tsx#L577-L589` và `AnalyticsDashboard.tsx#L455`.
    - *Bằng chứng*: Khi xuất danh sách nhân khẩu ra bảng tính Excel bằng `XLSX.utils.aoa_to_sheet(rows)`, các giá trị `hoDemVal`, `tenVal`, `ghiChuVal`, `address` được ghi thẳng vào cell mà không kiểm tra ký tự đầu tiên.
    - *Kịch bản khai thác*: Kẻ tấn công cố tình nhập họ tên hoặc ghi chú chứa ký tự thực thi công thức (ví dụ `=CMD|' /C calc'!A0` hoặc `=HYPERLINK(...)`). Khi cán bộ huyện/tỉnh mở file xuất ra trên Microsoft Excel, Excel sẽ kích hoạt thực thi lệnh công thức độc hại.
    - *Khắc phục*: Thêm tiền tố dấu nháy đơn `'` trước bất kỳ chuỗi nào bắt đầu bằng `=`, `+`, `-`, `@`, `\t`, `\r`.

---

### LỚP 6: XỬ LÝ NGOẠI LỆ & RÒ RỈ THÔNG TIN (ERROR HANDLING)
- **Điểm yếu phát hiện**:
  - 🟡 **`FINDING-ASVS-06` (P2 - Medium, CWE-209, ASVS V7.4)**: **Trả trực tiếp nội dung `err.message` về cho Client trong Middleware lỗi toàn cục**.
    - *Vị trí*: `QLHK-Backend/src/middlewares/error.middleware.ts#L51-L54`.
    - *Bằng chứng*:
      ```typescript
      const statusCode = err.status || err.statusCode || 500;
      res.status(statusCode).json({
          error: err.message || "Lỗi hệ thống nội bộ",
      });
      ```
      Nếu xảy ra lỗi CSDL (ví dụ Prisma driver crash, SQLite disk I/O, lỗi đường dẫn file), `err.message` sẽ chứa thông tin kỹ thuật nội bộ (đường dẫn ổ đĩa `C:\...`, tên bảng, cấu trúc câu lệnh) và gửi về cho người dùng.
    - *Khắc phục*: Trong môi trường `production`, khi `statusCode >= 500`, chỉ trả về thông báo chung: `"Đã xảy ra lỗi hệ thống nội bộ. Vui lòng thử lại sau."`.

---

### LỚP 7: NHẬT KÝ KIỂM TOÁN (AUDIT LOGGING)
- **Trách nhiệm giải trình**: Bảng `audit_logs` ghi nhận đầy đủ các hành vi `CREATE`, `UPDATE`, `DELETE`, `RESTORE`, `IMPORT`, `HARD_DELETE`, và `REVEAL_CCCD` kèm `user_id`, `village_id`, `ip_address` và `created_at`.
- **Bảo vệ PII trong log**: CCCD trong `old_values` và `new_values` được tự động che thành `"***"` (`citizens.controller.ts#L336, L484`).
- **Điểm yếu phát hiện**:
  - 🟡 **`FINDING-ASVS-07` (P2 - Medium, ASVS V7.1)**: **Các thao tác quản lý tài khoản người dùng chưa được ghi nhật ký kiểm toán**.
    - *Vị trí*: `QLHK-Backend/src/controllers/users.controller.ts` (các hàm `createUser`, `updateUser`, `updatePassword`, `deleteUser`).
    - *Bằng chứng*: Không có bất kỳ lệnh gọi `logAudit` nào trong `users.controller.ts`. Việc Admin thêm cán bộ mới, đổi mật khẩu cán bộ hay xóa tài khoản không để lại dấu vết trong bảng `audit_logs`.

---

### LỚP 8: KHÓA LẠC QUAN & TOÀN VẸN DỮ LIỆU (CONCURRENCY & OCC)
- **Đánh giá**: **PASS (RẤT TỐT)**.
- Cả hai bảng `households` và `citizens` đều có cột `version Int @default(1)`.
- Khi cập nhật dữ liệu (`updateHousehold`, `updateCitizen`), hệ thống kiểm tra `expectedVersion` và thực hiện `updateMany({ where: { id, version: expectedVersion }, data: { ... version: { increment: 1 } } })` trong transaction.
- Nếu `count === 0`, server ném lỗi `OCC_CONFLICT` và trả về HTTP 409 kèm số phiên bản mới nhất cho client xử lý xung đột. Đã có 4 test cases kiểm thử tự động xác nhận cơ chế này hoạt động hoàn hảo (`tests/occ.test.ts`).

---

### LỚP 9: KIỂM SOÁT TẢI LÊN & BÓC TÁCH EXCEL (FILE HANDLING)
- **Giới hạn dung lượng**: Đã cấu hình Multer giới hạn tối đa 10MB (`excel.routes.ts#L11`).
- **Điểm yếu phát hiện**:
  - 🟡 **`FINDING-ASVS-08` (P2 - Medium, CWE-434, ASVS V12.1)**: **Thiếu kiểm tra MIME Type và Magic Bytes tệp tải lên**.
    - *Vị trí*: `QLHK-Backend/src/routes/excel.routes.ts#L9-L12`.
    - *Bằng chứng*: Middleware `upload` chỉ kiểm tra kích thước `fileSize: 10 * 1024 * 1024` mà không cấu hình `fileFilter` để chặn các file không phải bảng tính (ví dụ file `.exe`, `.bat`, `.js`, `.zip`).
    - *Khắc phục*: Bổ sung `fileFilter` chỉ chấp nhận các tệp có phần mở rộng `.xlsx`, `.xls` và MIME type tương ứng của bảng tính.

---

### LỚP 10: TẤN CÔNG TỪ CHỐI DỊCH VỤ & TẦN SUẤT YÊU CẦU (RATE LIMITING)
- **Điểm yếu phát hiện**:
  - 🔴 **`FINDING-ASVS-09` (P1 - High, CWE-799 / CWE-307, ASVS V13.1)**: **Hoàn toàn không có Rate Limiting trên toàn bộ API Gateway**.
    - *Vị trí*: `QLHK-Backend/src/app.ts#L45-L98`.
    - *Bằng chứng*: Không có middleware giới hạn tần suất request.
    - *Rủi ro khai thác*:
      1. Tấn công vét cạn mật khẩu vào `/api/auth/login`.
      2. Tấn công vét sạch dữ liệu CCCD bằng cách gửi hàng nghìn request giải mã vào `/api/citizens/:id/reveal-cccd`.
      3. Gửi liên tục request import Excel lớn làm nghẽn CPU và RAM máy chủ.
    - *Khắc phục*: Triển khai bộ lọc rate limiting theo IP và User token (ví dụ: tối đa 5 lần thử login sai / phút; tối đa 30 lần reveal CCCD / phút; tối đa 100 requests tổng / phút).

---

### LỚP 11: AN NINH PHÍA KHÁCH HÀNG (CLIENT-SIDE SECURITY)
- **Lưu trữ Token an toàn**:
  - Trong môi trường Electron: Sử dụng Windows DPAPI `safeStorage` qua IPC `preload.ts` (`secureStorage.ts#L13`). Token được mã hóa ở mức hệ điều hành, an toàn trước các cuộc tấn công đánh cắp file.
  - Trong môi trường trình duyệt: Fallback sang `localStorage` khi chạy ngoài Electron.
- **Điểm yếu phát hiện**:
  - 🟡 **`FINDING-ASVS-10` (P2 - Medium, CWE-1021)**: **Chính sách CSP còn cho phép `'unsafe-inline'`**.
    - *Vị trí*: `QLHK-Client/index.html#L7`.
    - *Bằng chứng*: Directive `script-src 'self' 'unsafe-inline'` và `style-src 'self' 'unsafe-inline'`. Cần thắt chặt ở Bước 4.

---

## 3. BẢNG TỔNG HỢP CÁC PHÁT HIỆN MÃ NGUỒN (SAST FINDINGS MATRIX)

| Mã Phát Hiện | Mức Độ | Phân Lớp ASVS | CWE | Tóm Tắt Lỗ Hổng / Điểm Yếu | File & Dòng Code |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`FINDING-ASVS-05`** | **P1 (High)** | Lớp 5: Injection | CWE-1236 | Formula Injection khi xuất danh sách nhân khẩu ra Excel | `QLHK-Client/src/pages/HouseholdsPage.tsx#L577-L589` |
| **`FINDING-ASVS-09`** | **P1 (High)** | Lớp 10: DoS | CWE-799 | Hoàn toàn không có Rate Limiting trên API nhạy cảm | `QLHK-Backend/src/app.ts#L45-L98` |
| **`FINDING-ASVS-01`** | **P2 (Med)** | Lớp 1: Auth | CWE-307 | Thiếu khóa tài khoản / độ trễ khi sai mật khẩu liên tục | `QLHK-Backend/src/controllers/auth.controller.ts#L28-L41` |
| **`FINDING-ASVS-02`** | **P2 (Med)** | Lớp 1: Auth | ASVS V3.8 | Thiếu phát hiện tái sử dụng Refresh Token đã thu hồi | `QLHK-Backend/src/controllers/auth.controller.ts#L109-L122` |
| **`FINDING-ASVS-03`** | **P2 (Med)** | Lớp 2: RBAC | CWE-620 | Đổi mật khẩu cá nhân không yêu cầu xác minh mật khẩu cũ | `QLHK-Backend/src/controllers/users.controller.ts#L130-L153` |
| **`FINDING-ASVS-04`** | **P2 (Med)** | Lớp 3: Validation| CWE-20 | Chưa kích hoạt Zod Schema Validation cho Request Bodies | `QLHK-Backend/src/controllers/*.controller.ts` |
| **`FINDING-ASVS-06`** | **P2 (Med)** | Lớp 6: Error | CWE-209 | Để lộ `err.message` chi tiết ra ngoài client khi gặp lỗi 500 | `QLHK-Backend/src/middlewares/error.middleware.ts#L51-L54` |
| **`FINDING-ASVS-07`** | **P2 (Med)** | Lớp 7: Audit | ASVS V7.1 | Thao tác CRUD tài khoản người dùng chưa được ghi Audit Log | `QLHK-Backend/src/controllers/users.controller.ts#L80-L200` |
| **`FINDING-ASVS-08`** | **P2 (Med)** | Lớp 9: Upload | CWE-434 | Thiếu kiểm tra định dạng MIME type trong Multer upload | `QLHK-Backend/src/routes/excel.routes.ts#L9-L12` |
| **`FINDING-ASVS-10`** | **P2 (Med)** | Lớp 11: Client | CWE-1021 | CSP trong `index.html` còn chứa `'unsafe-inline'` | `QLHK-Client/index.html#L7` |

---

## 4. KẾT LUẬN NGHIỆM THU GATE 3

- **Trạng thái Gate 3**: **PASS (ĐẠT 100%)**
- **Bằng chứng**:
  - Đã hoàn tất đối soát thực tế toàn bộ 11 lớp tiêu chuẩn bảo mật ASVS L2 trên toàn bộ các file mã nguồn của Backend và Client.
  - Đã xác nhận hệ thống có nền tảng phòng thủ rất vững chắc ở các khâu trọng yếu: Mã hóa AES-256-GCM với IV ngẫu nhiên độc lập, kiểm soát RBAC Thôn/Xã chặt chẽ trên 10/10 endpoints, ngăn chặn hoàn toàn SQLi nhờ Prisma ORM và kiểm soát xung đột dữ liệu đồng thời hoàn hảo nhờ cơ chế OCC.
  - Đã phát hiện và lập bảng ma trận chi tiết cho **10 điểm yếu cụ thể** (2 P1, 8 P2, 0 P0), có đầy đủ vị trí `file:dòng`, mã CWE và kịch bản khai thác.
  - Toàn bộ 10 phát hiện này đã có kế hoạch xử lý phẫu thuật tận gốc ở Bước 7 theo đúng tiến trình.
